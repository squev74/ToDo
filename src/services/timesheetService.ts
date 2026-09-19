import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TimeEntry, TimesheetConfig } from '../types/timesheet';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Timesheet Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Récupère toutes les saisies de temps pour un espace de travail et un mois donné.
 * @param userId ID de l'utilisateur
 * @param spaceId ID de l'espace de travail
 * @param year Année (ex: 2026)
 * @param month Mois (1-12)
 */
export async function fetchMonthTimeEntries(
  userId: string,
  spaceId: string,
  year: number,
  month: number
): Promise<TimeEntry[]> {
  const path = `users/${userId}/timeEntries`;
  try {
    const collRef = collection(db, 'users', userId, 'timeEntries');
    
    // Pour des raisons de flexibilité et éviter les index composites trop lourds, 
    // nous filtrons localement par mois et espace.
    const snapshot = await getDocs(collRef);
    const entries: TimeEntry[] = [];
    
    // Préparer le préfixe de date YYYY-MM
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.spaceId === spaceId && (data.date as string).startsWith(datePrefix)) {
        entries.push({
          id: doc.id,
          userId: data.userId,
          spaceId: data.spaceId,
          taskId: data.taskId,
          jiraKey: data.jiraKey,
          projectName: data.projectName,
          date: data.date,
          hours: Number(data.hours),
          comment: data.comment || '',
        });
      }
    });

    return entries;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path, userId);
    return [];
  }
}

/**
 * Génère un identifiant de document sûr pour Firestore, en évitant les slashs
 * qui créent des segments de chemin invalides.
 */
export function getSafeDocId(date: string, jiraKey: string): string {
  const safeJiraKey = jiraKey.replace(/\//g, '__');
  return `${date}_${safeJiraKey}`;
}

/**
 * Enregistre ou met à jour une saisie de temps dans Firestore.
 * Clé unique : YYYY-MM-DD_jiraKey (ex: 2026-09-18_EVOLIT-24)
 */
export async function saveTimeEntry(
  userId: string,
  spaceId: string,
  entry: {
    jiraKey: string;
    projectName: string;
    date: string;
    hours: number;
    comment?: string;
    taskId?: string;
  }
): Promise<void> {
  const docId = getSafeDocId(entry.date, entry.jiraKey);
  const path = `users/${userId}/timeEntries/${docId}`;
  
  try {
    const docRef = doc(db, 'users', userId, 'timeEntries', docId);

    // Si les heures sont de 0, on supprime l'entrée pour libérer de l'espace
    if (entry.hours <= 0) {
      await deleteDoc(docRef);
      return;
    }

    const payload: TimeEntry = {
      id: docId,
      userId,
      spaceId,
      jiraKey: entry.jiraKey,
      projectName: entry.projectName,
      date: entry.date,
      hours: entry.hours,
      comment: entry.comment || '',
      taskId: entry.taskId || '',
    };

    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, userId);
  }
}

/**
 * Enregistre par lot plusieurs saisies de temps (ex: sauvegarde complète de la grille)
 */
export async function saveMultipleTimeEntries(
  userId: string,
  spaceId: string,
  entries: {
    jiraKey: string;
    projectName: string;
    date: string;
    hours: number;
    comment?: string;
    taskId?: string;
  }[]
): Promise<void> {
  const path = `users/${userId}/timeEntries [BATCH]`;
  try {
    const batch = writeBatch(db);
    
    for (const entry of entries) {
      const docId = getSafeDocId(entry.date, entry.jiraKey);
      const docRef = doc(db, 'users', userId, 'timeEntries', docId);
      
      if (entry.hours <= 0) {
        batch.delete(docRef);
      } else {
        const payload: TimeEntry = {
          id: docId,
          userId,
          spaceId,
          jiraKey: entry.jiraKey,
          projectName: entry.projectName,
          date: entry.date,
          hours: entry.hours,
          comment: entry.comment || '',
          taskId: entry.taskId || '',
        };
        batch.set(docRef, payload);
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, userId);
  }
}

/**
 * Récupère la configuration des projets actifs/masqués pour un mois donné
 */
export async function fetchTimesheetConfig(
  userId: string,
  spaceId: string,
  year: number,
  month: number
): Promise<TimesheetConfig | null> {
  const docId = `${spaceId}_${year}_${month}`;
  const path = `users/${userId}/timesheetConfigs/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, 'timesheetConfigs', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: docId,
        spaceId: data.spaceId,
        year: Number(data.year),
        month: Number(data.month),
        activeProjectIds: data.activeProjectIds || [],
        hiddenProjectIds: data.hiddenProjectIds || [],
        customProjects: data.customProjects || [],
      };
    }
    return null;
  } catch (error) {
    console.warn('Erreur récupération TimesheetConfig Firestore, retour nul:', error);
    return null;
  }
}

/**
 * Enregistre la configuration des projets actifs/masqués pour un mois donné
 */
export async function saveTimesheetConfig(
  userId: string,
  spaceId: string,
  year: number,
  month: number,
  config: Omit<TimesheetConfig, 'id'>
): Promise<void> {
  const docId = `${spaceId}_${year}_${month}`;
  const path = `users/${userId}/timesheetConfigs/${docId}`;
  try {
    const docRef = doc(db, 'users', userId, 'timesheetConfigs', docId);
    await setDoc(docRef, {
      spaceId,
      year,
      month,
      activeProjectIds: config.activeProjectIds,
      hiddenProjectIds: config.hiddenProjectIds,
      customProjects: config.customProjects || [],
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path, userId);
  }
}

