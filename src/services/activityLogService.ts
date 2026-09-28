import {
  collection,
  doc,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityLog } from '../types';

/**
 * Récupère l'ensemble des journaux d'activité pour un utilisateur donné.
 */
export async function fetchActivityLogs(userId: string): Promise<ActivityLog[]> {
  try {
    const collRef = collection(db, 'users', userId, 'activityLogs');
    const snapshot = await getDocs(collRef);
    const logs: ActivityLog[] = [];

    snapshot.forEach((firestoreDoc) => {
      const data = firestoreDoc.data();
      logs.push({
        id: firestoreDoc.id,
        spaceId: data.spaceId || '',
        taskId: data.taskId || '',
        taskTitle: data.taskTitle || '',
        projectId: data.projectId || null,
        projectName: data.projectName || null,
        type: data.type || 'UPDATED',
        details: data.details || '',
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    // Trier par date décroissante
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  } catch (error) {
    console.error('Erreur de récupération des logs d\'activité depuis Firestore :', error);
    // Fallback localstorage
    const local = localStorage.getItem('pmo_activity_logs');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  }
}

/**
 * Enregistre un log d'activité dans Firestore et le synchronise localement.
 */
export async function saveActivityLog(userId: string, log: ActivityLog): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'activityLogs', log.id);
    const payload = {
      id: log.id,
      spaceId: log.spaceId,
      taskId: log.taskId,
      taskTitle: log.taskTitle,
      projectId: log.projectId || null,
      projectName: log.projectName || null,
      type: log.type,
      details: log.details,
      timestamp: log.timestamp,
    };
    await setDoc(docRef, payload);

    // Mettre à jour localstorage de secours
    const local = localStorage.getItem('pmo_activity_logs');
    let currentLogs: ActivityLog[] = [];
    if (local) {
      try {
        currentLogs = JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
    }
    // Éviter les doublons
    currentLogs = currentLogs.filter(l => l.id !== log.id);
    currentLogs.unshift(log);
    // Trier par date décroissante
    currentLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    localStorage.setItem('pmo_activity_logs', JSON.stringify(currentLogs));
  } catch (error) {
    console.error('Erreur de sauvegarde du log d\'activité sur Firestore :', error);
  }
}

/**
 * Helper de création et d'enregistrement rapide d'un log.
 */
export async function logActivity(
  userId: string,
  spaceId: string,
  taskId: string,
  taskTitle: string,
  type: 'CREATED' | 'STATUS_CHANGED' | 'COMMENT_ADDED' | 'UPDATED',
  details: string,
  projectId?: string | null,
  projectName?: string | null
): Promise<ActivityLog> {
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    spaceId,
    taskId,
    taskTitle,
    projectId: projectId || null,
    projectName: projectName || null,
    type,
    details,
    timestamp: new Date().toISOString(),
  };

  await saveActivityLog(userId, newLog);
  return newLog;
}
