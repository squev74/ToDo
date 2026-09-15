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
import { Tache, Projet, Espace } from '../types';
import {
  DEFAULT_SPACE_ID,
  getDefaultSpaces,
  getDefaultProjects,
  getDefaultTasks,
} from '../utils/storage';

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
 * Prépare un espace de travail pour l'écriture dans Firestore.
 */
export function sanitizeSpaceForFirestore(space: Espace, userId: string): Record<string, any> {
  return cleanForFirestore({
    id: space.id,
    userId,
    nom: space.nom || 'Mon espace',
    couleur: space.couleur || '#6366f1',
    icone: space.icone || 'briefcase',
    description: space.description || '',
    dateCreation: space.dateCreation || new Date().toISOString(),
  });
}

/**
 * Prépare un projet pour l'écriture dans Firestore en garantissant qu'aucun champ n'est `undefined`.
 */
export function sanitizeProjectForFirestore(project: Projet, userId: string): Record<string, any> {
  return cleanForFirestore({
    id: project.id,
    userId,
    spaceId: project.spaceId || DEFAULT_SPACE_ID,
    nom: project.nom || '',
    couleur: project.couleur || '#6366f1',
    dateCreation: project.dateCreation || new Date().toISOString(),
  });
}

/**
 * Prépare une tâche pour l'écriture dans Firestore en garantissant qu'aucun champ n'est `undefined`.
 */
export function sanitizeTaskForFirestore(task: Tache, userId: string): Record<string, any> {
  return cleanForFirestore({
    id: task.id,
    userId,
    spaceId: task.spaceId || DEFAULT_SPACE_ID,
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
 * Écoute en temps réel les espaces, projets et tâches d'un utilisateur spécifique (isolation stricte).
 */
export function subscribeToUserData(
  userId: string,
  onTasksChange: (tasks: Tache[]) => void,
  onProjectsChange: (projects: Projet[]) => void,
  onSpacesChange?: (spaces: Espace[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    return () => {};
  }

  const spacesColl = collection(db, 'users', userId, 'spaces');
  const projectsColl = collection(db, 'users', userId, 'projects');
  const tasksColl = collection(db, 'users', userId, 'tasks');

  const unsubscribeSpaces = onSnapshot(
    spacesColl,
    (snapshot) => {
      const spaces: Espace[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Espace;
        spaces.push({ ...data, userId });
      });
      // Tri par date de création croissante
      spaces.sort(
        (a, b) => new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime()
      );
      if (onSpacesChange) {
        onSpacesChange(spaces);
      }
    },
    (err) => {
      // Si la collection spaces n'a pas encore de règles dans la console Firebase,
      // on ne coupe pas la synchronisation des projets et tâches.
      console.warn(
        'Synchronisation des espaces Firestore différée (règles de sécurité pour /spaces en attente dans la Console Firebase) :',
        err.message
      );
    }
  );

  const unsubscribeProjects = onSnapshot(
    projectsColl,
    (snapshot) => {
      const projects: Projet[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Projet;
        projects.push({
          ...data,
          userId,
          spaceId: data.spaceId || DEFAULT_SPACE_ID,
        });
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
        tasks.push({
          ...data,
          userId,
          spaceId: data.spaceId || DEFAULT_SPACE_ID,
        });
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
    unsubscribeSpaces();
    unsubscribeProjects();
    unsubscribeTasks();
  };
}

/**
 * Initialise l'espace de données personnel si l'utilisateur est nouveau (sans aucune fuite inter-utilisateurs).
 * Crée également automatiquement "Mon espace" s'il n'en a pas encore.
 */
export async function initializeUserInitialDataIfEmpty(userId: string): Promise<void> {
  if (!userId) return;

  const spacesColl = collection(db, 'users', userId, 'spaces');
  const projectsColl = collection(db, 'users', userId, 'projects');
  const tasksColl = collection(db, 'users', userId, 'tasks');

  try {
    const [existingSpacesSnap, existingProjectsSnap, existingTasksSnap] = await Promise.all([
      getDocs(spacesColl).catch((e) => {
        console.warn('Accès aux espaces Firestore différé :', e?.message || e);
        return null;
      }),
      getDocs(projectsColl).catch((e) => {
        console.warn('Accès aux projets Firestore différé :', e?.message || e);
        return null;
      }),
      getDocs(tasksColl).catch((e) => {
        console.warn('Accès aux tâches Firestore différé :', e?.message || e);
        return null;
      }),
    ]);

    const batch = writeBatch(db);
    let shouldCommit = false;

    // 1. Si aucun espace n'existe et que la lecture a réussi, on crée l'espace par défaut "Mon espace"
    if (existingSpacesSnap && existingSpacesSnap.empty) {
      const defaultSpaces = getDefaultSpaces(userId);
      defaultSpaces.forEach((sp) => {
        const sDoc = doc(db, 'users', userId, 'spaces', sp.id);
        batch.set(sDoc, sanitizeSpaceForFirestore(sp, userId));
      });
      shouldCommit = true;
    }

    // 2. Si l'utilisateur n'a encore ni projet ni tâche, on initialise les projets et tâches de démonstration
    if (
      existingProjectsSnap &&
      existingTasksSnap &&
      existingProjectsSnap.empty &&
      existingTasksSnap.empty
    ) {
      const initialProjects = getDefaultProjects(userId, DEFAULT_SPACE_ID);
      const initialTasks = getDefaultTasks(userId, DEFAULT_SPACE_ID);

      initialProjects.forEach((proj) => {
        const pDoc = doc(db, 'users', userId, 'projects', proj.id);
        batch.set(pDoc, sanitizeProjectForFirestore(proj, userId));
      });

      initialTasks.forEach((task) => {
        const tDoc = doc(db, 'users', userId, 'tasks', task.id);
        batch.set(tDoc, sanitizeTaskForFirestore(task, userId));
      });

      shouldCommit = true;
    }

    if (shouldCommit) {
      try {
        await batch.commit();
      } catch (commitErr: any) {
        console.warn('Initialisation partielle Firestore :', commitErr?.message || commitErr);
      }
    }
  } catch (error) {
    console.warn('Vérification des données initiales Firestore :', error);
  }
}

/**
 * Enregistre ou met à jour un espace de travail dans Firestore.
 */
export async function saveSpaceToFirestore(userId: string, space: Espace): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}/spaces/${space.id}`;
  try {
    const spaceRef = doc(db, 'users', userId, 'spaces', space.id);
    const spaceToSave = sanitizeSpaceForFirestore(space, userId);
    await setDoc(spaceRef, spaceToSave, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient')) {
      console.warn(`Sauvegarde espace Firestore (${path}) en attente des règles Cloud. L'espace reste actif localement.`);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Supprime un espace de travail de Firestore ainsi que TOUS ses projets et tâches associés (étanchéité stricte).
 */
export async function deleteSpaceFromFirestore(
  userId: string,
  spaceId: string,
  allTasks: Tache[],
  allProjects: Projet[]
): Promise<void> {
  if (!userId || !spaceId) return;
  const path = `users/${userId}/spaces/${spaceId}`;
  try {
    const batch = writeBatch(db);

    // Supprimer le document de l'espace
    const spaceRef = doc(db, 'users', userId, 'spaces', spaceId);
    batch.delete(spaceRef);

    // Supprimer tous les projets appartenant à cet espace
    const associatedProjects = allProjects.filter((p) => p.spaceId === spaceId);
    associatedProjects.forEach((p) => {
      const pRef = doc(db, 'users', userId, 'projects', p.id);
      batch.delete(pRef);
    });

    // Supprimer toutes les tâches appartenant à cet espace
    const associatedTasks = allTasks.filter((t) => t.spaceId === spaceId);
    associatedTasks.forEach((t) => {
      const tRef = doc(db, 'users', userId, 'tasks', t.id);
      batch.delete(tRef);
    });

    await batch.commit();
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient')) {
      console.warn(`Suppression espace Firestore (${path}) ignorée sur le Cloud.`);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
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
 * Supprime un projet de Firestore et détache les tâches associées de l'utilisateur au sein du même espace.
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

    // Dissocier les tâches associées à ce projet
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
 * Met à jour un lot de tâches dans Firestore (ex: réordonnancement ou déplacement).
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
 * Importe un lot complet d'espaces, projets et tâches dans Firestore pour un utilisateur donné.
 */
export async function importDataToFirestore(
  userId: string,
  newProjects: Projet[],
  newTasks: Tache[],
  newSpaces?: Espace[]
): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}`;
  try {
    const batch = writeBatch(db);

    if (newSpaces && newSpaces.length > 0) {
      newSpaces.forEach((sp) => {
        const sDoc = doc(db, 'users', userId, 'spaces', sp.id);
        batch.set(sDoc, sanitizeSpaceForFirestore(sp, userId));
      });
    }

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
