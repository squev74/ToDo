import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { initializeApp as createFirebaseApp, deleteApp } from 'firebase/app';
import {
  getAuth as getSecondaryAuth,
  createUserWithEmailAndPassword,
  signOut as secondarySignOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth } from '../lib/firebase';
import {
  Tache,
  Projet,
  Espace,
  UserProfile,
  UserRole,
  UserStatus,
  ADMIN_EMAIL,
  ADMIN_UID,
} from '../types';
import {
  DEFAULT_SPACE_ID,
  getDefaultSpaces,
  getDefaultProjects,
  getDefaultTasks,
  getCachedUserProfile,
  setCachedUserProfile,
  getCachedUsersList,
  setCachedUsersList,
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
    jiraKey: project.jiraKey || null,
    deliverables: project.deliverables || [],
    teamMembers: project.teamMembers || [],
    allocations: project.allocations || [],
    raidLog: project.raidLog || [],
    hasCapacityPlanning: project.hasCapacityPlanning !== false,
    requiresTimesheet: project.requiresTimesheet !== false,
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
    createdAt: task.createdAt ?? null,
    updatedAt: task.updatedAt ?? null,
    lastActivityAt:
      task.lastActivityAt ||
      task.updatedAt ||
      task.dateModification ||
      task.createdAt ||
      new Date().toISOString(),
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

/**
 * Synchronise et récupère le profil utilisateur dans Firestore (/users/{userId}).
 * Applique la règle : squeva11@gmail.com = admin/approved d'office,
 * les autres utilisateurs = user/pending par défaut à l'inscription.
 */
export async function syncUserProfile(user: {
  uid: string;
  email: string | null;
  displayName?: string | null;
}): Promise<UserProfile> {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const isAdminEmail =
    cleanEmail === ADMIN_EMAIL.toLowerCase() || user.uid === ADMIN_UID;

  const userDocRef = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const existing = snap.data() as UserProfile;

      // Si l'utilisateur est squeva11@gmail.com, forcer le statut admin & approved
      if (isAdminEmail && (existing.role !== 'admin' || existing.status !== 'approved')) {
        const updated: UserProfile = {
          ...existing,
          role: 'admin',
          status: 'approved',
          derniereConnexion: new Date().toISOString(),
        };
        await setDoc(userDocRef, updated, { merge: true });
        setCachedUserProfile(updated);
        return updated;
      }

      // Mettre à jour l'horodatage de dernière connexion
      const updatedProfile: UserProfile = {
        ...existing,
        derniereConnexion: new Date().toISOString(),
      };
      setDoc(userDocRef, { derniereConnexion: updatedProfile.derniereConnexion }, { merge: true }).catch(
        () => {}
      );
      setCachedUserProfile(updatedProfile);
      return updatedProfile;
    } else {
      // Nouvel utilisateur : squeva11@gmail.com est admin/approved, les autres sont user/pending
      const newProfile: UserProfile = {
        uid: user.uid,
        email: cleanEmail || 'utilisateur@demo.local',
        displayName: user.displayName || cleanEmail.split('@')[0] || 'Utilisateur',
        role: isAdminEmail ? 'admin' : 'user',
        status: isAdminEmail ? 'approved' : 'pending',
        dateCreation: new Date().toISOString(),
        derniereConnexion: new Date().toISOString(),
      };

      await setDoc(userDocRef, newProfile, { merge: true });
      setCachedUserProfile(newProfile);
      return newProfile;
    }
  } catch (error: any) {
    console.warn('Erreur accès profil Firestore, utilisation du cache local :', error?.message || error);
    const cached = getCachedUserProfile(user.uid);
    if (cached) {
      if (isAdminEmail) {
        cached.role = 'admin';
        cached.status = 'approved';
      }
      return cached;
    }

    const fallbackProfile: UserProfile = {
      uid: user.uid,
      email: cleanEmail || 'utilisateur@demo.local',
      displayName: user.displayName || cleanEmail.split('@')[0] || 'Utilisateur',
      role: isAdminEmail ? 'admin' : 'user',
      status: isAdminEmail ? 'approved' : 'pending',
      dateCreation: new Date().toISOString(),
    };
    setCachedUserProfile(fallbackProfile);
    return fallbackProfile;
  }
}

/**
 * Écoute en temps réel les changements du profil de l'utilisateur connecté.
 */
export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile) => void,
  onError?: (err: any) => void
): () => void {
  const userDocRef = doc(db, 'users', uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        setCachedUserProfile(profile);
        onUpdate(profile);
      }
    },
    (err) => {
      console.warn('Écoute profil Firestore différée :', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Écoute la liste de tous les utilisateurs enregistrés pour le Panneau Admin.
 */
export function subscribeToAllUsers(
  onUsersChange: (users: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const usersColl = collection(db, 'users');
  return onSnapshot(
    usersColl,
    (snapshot) => {
      const userList: UserProfile[] = [];
      snapshot.forEach((d) => {
        const u = d.data() as UserProfile;
        userList.push(u);
      });

      // S'assurer que squeva11@gmail.com apparaît toujours
      const hasAdminInList = userList.some(
        (u) =>
          u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
          u.uid === ADMIN_UID
      );
      if (!hasAdminInList) {
        userList.unshift({
          uid: ADMIN_UID,
          email: ADMIN_EMAIL,
          displayName: 'Administrateur',
          role: 'admin',
          status: 'approved',
          dateCreation: '2026-09-01T00:00:00.000Z',
        });
      }

      userList.sort(
        (a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
      );
      setCachedUsersList(userList);
      onUsersChange(userList);
    },
    (err) => {
      console.warn('Accès à la collection users Firestore différé :', err.message);
      const cached = getCachedUsersList();
      if (cached.length > 0) {
        onUsersChange(cached);
      }
      if (onError) onError(err);
    }
  );
}

/**
 * Met à jour le statut d'un utilisateur ('pending' | 'approved' | 'disabled').
 */
export async function updateUserStatus(targetUid: string, newStatus: UserStatus): Promise<void> {
  const userDocRef = doc(db, 'users', targetUid);
  await setDoc(userDocRef, { status: newStatus }, { merge: true });

  // Mettre à jour le cache local
  const cached = getCachedUsersList();
  const updated = cached.map((u) => (u.uid === targetUid ? { ...u, status: newStatus } : u));
  setCachedUsersList(updated);

  const singleCached = getCachedUserProfile(targetUid);
  if (singleCached) {
    setCachedUserProfile({ ...singleCached, status: newStatus });
  }
}

/**
 * Met à jour le rôle d'un utilisateur ('admin' | 'user').
 */
export async function updateUserRole(targetUid: string, newRole: UserRole): Promise<void> {
  const userDocRef = doc(db, 'users', targetUid);
  await setDoc(userDocRef, { role: newRole }, { merge: true });

  const cached = getCachedUsersList();
  const updated = cached.map((u) => (u.uid === targetUid ? { ...u, role: newRole } : u));
  setCachedUsersList(updated);
}

/**
 * Supprime un utilisateur de Firestore ainsi que l'ensemble de ses données liées (espaces, projets, tâches).
 */
export async function deleteUserAndData(targetUid: string): Promise<void> {
  // 1. Supprimer les sous-collections espaces, projets, tâches
  try {
    const spacesColl = collection(db, 'users', targetUid, 'spaces');
    const projectsColl = collection(db, 'users', targetUid, 'projects');
    const tasksColl = collection(db, 'users', targetUid, 'tasks');

    const [spacesSnap, projectsSnap, tasksSnap] = await Promise.all([
      getDocs(spacesColl).catch(() => null),
      getDocs(projectsColl).catch(() => null),
      getDocs(tasksColl).catch(() => null),
    ]);

    const batch = writeBatch(db);
    spacesSnap?.forEach((d) => batch.delete(d.ref));
    projectsSnap?.forEach((d) => batch.delete(d.ref));
    tasksSnap?.forEach((d) => batch.delete(d.ref));

    // Supprimer le document utilisateur
    const userDocRef = doc(db, 'users', targetUid);
    batch.delete(userDocRef);

    await batch.commit();
  } catch (error) {
    // Si batch échoue, tenter la suppression directe du document utilisateur
    try {
      await deleteDoc(doc(db, 'users', targetUid));
    } catch (e) {
      console.error('Erreur suppression utilisateur :', e);
      throw e;
    }
  }

  // Nettoyer les caches locaux
  const cached = getCachedUsersList();
  setCachedUsersList(cached.filter((u) => u.uid !== targetUid));
}

/**
 * Création d'un utilisateur par l'administrateur avec statut directement 'approved'.
 * Utilise une instance Firebase secondaire pour ne pas déconnecter l'administrateur en cours.
 */
export async function adminCreateUser(
  email: string,
  pass: string,
  displayName?: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const isAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

  let uid = '';
  try {
    const secondaryApp = createFirebaseApp(firebaseConfig, `admin-create-${Date.now()}`);
    const secondaryAuth = getSecondaryAuth(secondaryApp);
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, pass);
    uid = userCred.user.uid;
    await secondarySignOut(secondaryAuth);
    await deleteApp(secondaryApp);
  } catch (authError: any) {
    if (authError.code === 'auth/email-already-in-use') {
      throw new Error('Un compte existe déjà avec cette adresse email.');
    }
    if (authError.code === 'auth/weak-password') {
      throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
    }
    uid = 'admin-created-' + btoa(cleanEmail).replace(/=/g, '').substring(0, 16);
  }

  const newProfile: UserProfile = {
    uid,
    email: cleanEmail,
    displayName: displayName?.trim() || cleanEmail.split('@')[0],
    role: isAdmin ? 'admin' : 'user',
    status: 'approved', // Validé d'office par l'admin
    dateCreation: new Date().toISOString(),
  };

  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, newProfile, { merge: true });

  // Initialiser l'espace par défaut et projets de démo pour cet utilisateur
  try {
    await initializeUserInitialDataIfEmpty(uid);
  } catch {
    // Ignorer si différé
  }

  // Mettre à jour le cache
  const cached = getCachedUsersList();
  setCachedUsersList([newProfile, ...cached.filter((u) => u.uid !== uid)]);

  return newProfile;
}
