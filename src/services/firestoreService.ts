import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Tache, Projet } from '../types';
import { getDefaultProjects, getDefaultTasks } from '../utils/storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Gestionnaire d'erreur standardisé conforme aux directives Firebase
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Nettoie récursivement un objet pour Firestore en convertissant les valeurs `undefined` en `null`
 * car Firestore lève une exception stricte lorsqu'une clé contient `undefined`.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value === undefined) {
        cleaned[key] = null;
      } else {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Prépare une tâche pour l'écriture dans Firestore en garantissant qu'aucun champ n'est `undefined`.
 */
export function sanitizeTaskForFirestore(task: Tache, userId: string): Record<string, any> {
  return cleanForFirestore({
    id: task.id,
    userId,
    titre: task.titre || '',
    description: task.description || '',
    projetId: task.projetId ?? null,
    statut: task.statut,
    dateEcheance: task.dateEcheance ?? null,
    dateRealisation: task.dateRealisation ?? null,
    dateModification: task.dateModification || new Date().toISOString(),
    ordre: typeof task.ordre === 'number' ? task.ordre : 0,
    commentaires: (task.commentaires || []).map((c) => ({
      id: c.id,
      texte: c.texte || '',
      date: c.date || new Date().toISOString(),
    })),
  });
}

/**
 * Prépare un projet pour l'écriture dans Firestore en garantissant qu'aucun champ n'est `undefined`.
 */
export function sanitizeProjectForFirestore(project: Projet, userId: string): Record<string, any> {
  return cleanForFirestore({
    id: project.id,
    userId,
    nom: project.nom || '',
    couleur: project.couleur || '#6366f1',
    dateCreation: project.dateCreation || new Date().toISOString(),
  });
}

/**
 * Écoute en temps réel les projets et les tâches d'un utilisateur spécifique (isolation stricte).
 */
export function subscribeToUserData(
  userId: string,
  onTasksChange: (tasks: Tache[]) => void,
  onProjectsChange: (projects: Projet[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    return () => {};
  }

  const projectsColl = collection(db, 'users', userId, 'projects');
  const tasksColl = collection(db, 'users', userId, 'tasks');

  const unsubscribeProjects = onSnapshot(
    projectsColl,
    (snapshot) => {
      const projects: Projet[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Projet;
        projects.push({ ...data, userId });
      });
      // Tri par date de création croissante
      projects.sort(
        (a, b) => new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime()
      );
      onProjectsChange(projects);
    },
    (err) => {
      console.error('Erreur synchronisation Firestore Projets:', err);
      if (onError) onError(err);
    }
  );

  const unsubscribeTasks = onSnapshot(
    tasksColl,
    (snapshot) => {
      const tasks: Tache[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Tache;
        tasks.push({ ...data, userId });
      });
      // Tri par ordre croissant
      tasks.sort((a, b) => a.ordre - b.ordre);
      onTasksChange(tasks);
    },
    (err) => {
      console.error('Erreur synchronisation Firestore Tâches:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubscribeProjects();
    unsubscribeTasks();
  };
}

/**
 * Initialise l'espace de données personnel si l'utilisateur est nouveau (sans aucune fuite inter-utilisateurs).
 */
export async function initializeUserInitialDataIfEmpty(userId: string): Promise<void> {
  if (!userId) return;

  const projectsColl = collection(db, 'users', userId, 'projects');
  const tasksColl = collection(db, 'users', userId, 'tasks');

  try {
    const [existingProjectsSnap, existingTasksSnap] = await Promise.all([
      getDocs(projectsColl),
      getDocs(tasksColl),
    ]);

    // Si l'utilisateur n'a encore ni projet ni tâche dans Firestore
    if (existingProjectsSnap.empty && existingTasksSnap.empty) {
      const batch = writeBatch(db);

      const initialProjects = getDefaultProjects(userId);
      const initialTasks = getDefaultTasks(userId);

      initialProjects.forEach((proj) => {
        const pDoc = doc(db, 'users', userId, 'projects', proj.id);
        batch.set(pDoc, sanitizeProjectForFirestore(proj, userId));
      });

      initialTasks.forEach((task) => {
        const tDoc = doc(db, 'users', userId, 'tasks', task.id);
        batch.set(tDoc, sanitizeTaskForFirestore(task, userId));
      });

      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Enregistre ou met à jour une tâche dans Firestore pour un utilisateur donné.
 */
export async function saveTaskToFirestore(userId: string, task: Tache): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}/tasks/${task.id}`;
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);
    const taskToSave = sanitizeTaskForFirestore(task, userId);
    await setDoc(taskRef, taskToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Supprime une tâche de Firestore.
 */
export async function deleteTaskFromFirestore(userId: string, taskId: string): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Supprime un lot de tâches (ex: suppression des tâches d'exemples).
 */
export async function deleteMultipleTasksFromFirestore(
  userId: string,
  taskIds: string[]
): Promise<void> {
  if (!userId || taskIds.length === 0) return;
  const path = `users/${userId}/tasks`;
  try {
    const batch = writeBatch(db);
    taskIds.forEach((id) => {
      const ref = doc(db, 'users', userId, 'tasks', id);
      batch.delete(ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Enregistre ou met à jour un projet dans Firestore pour un utilisateur donné.
 */
export async function saveProjectToFirestore(userId: string, project: Projet): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}/projects/${project.id}`;
  try {
    const projRef = doc(db, 'users', userId, 'projects', project.id);
    const projectToSave = sanitizeProjectForFirestore(project, userId);
    await setDoc(projRef, projectToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Supprime un projet de Firestore et détache les tâches associées de l'utilisateur.
 */
export async function deleteProjectFromFirestore(
  userId: string,
  projectId: string,
  allTasks: Tache[]
): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}/projects/${projectId}`;
  try {
    const batch = writeBatch(db);
    const projRef = doc(db, 'users', userId, 'projects', projectId);
    batch.delete(projRef);

    // Dissocier uniquement les tâches appartenant à l'utilisateur
    const affectedTasks = allTasks.filter((t) => t.projetId === projectId);
    affectedTasks.forEach((t) => {
      const tRef = doc(db, 'users', userId, 'tasks', t.id);
      batch.update(tRef, { projetId: null });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Met à jour un lot de tâches dans Firestore (ex: réordonnancement ou déplacement drag-and-drop).
 */
export async function batchUpdateTasksInFirestore(
  userId: string,
  tasksToUpdate: Tache[]
): Promise<void> {
  if (!userId || tasksToUpdate.length === 0) return;
  const path = `users/${userId}/tasks`;
  try {
    const batch = writeBatch(db);
    tasksToUpdate.forEach((task) => {
      const ref = doc(db, 'users', userId, 'tasks', task.id);
      batch.set(ref, sanitizeTaskForFirestore(task, userId), { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Importe un lot complet de projets et tâches dans Firestore pour un utilisateur donné.
 */
export async function importDataToFirestore(
  userId: string,
  newProjects: Projet[],
  newTasks: Tache[]
): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}`;
  try {
    const batch = writeBatch(db);
    newProjects.forEach((proj) => {
      const pDoc = doc(db, 'users', userId, 'projects', proj.id);
      batch.set(pDoc, sanitizeProjectForFirestore(proj, userId));
    });
    newTasks.forEach((task) => {
      const tDoc = doc(db, 'users', userId, 'tasks', task.id);
      batch.set(tDoc, sanitizeTaskForFirestore(task, userId));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
