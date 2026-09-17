import { Tache, Task, StatutTache, Commentaire } from '../types';
import { saveTaskToFirestore } from './firestoreService';

/**
 * Service de gestion des tâches et de suivi d'inactivité ("Tâches stagnantes").
 * Conforme au cahier des charges :
 * - Gestion automatique de `lastActivityAt`
 * - Rétrocompatibilité avec `updatedAt` / `dateModification` / `createdAt`
 * - Calcul précis des jours d'inactivité
 * - Exclusion stricte des statuts 'backlog' et 'done'
 */

/**
 * Récupère la date de dernière activité effective d'une tâche.
 * Si `lastActivityAt` n'est pas encore défini (anciennes tâches),
 * utilise dans l'ordre de priorité : updatedAt -> dateModification -> createdAt -> Date courante.
 */
export function getTaskEffectiveActivityDate(task: Tache | Task): string {
  if (task.lastActivityAt && task.lastActivityAt.trim() !== '') {
    return task.lastActivityAt;
  }
  if (task.updatedAt && task.updatedAt.trim() !== '') {
    return task.updatedAt;
  }
  if (task.dateModification && task.dateModification.trim() !== '') {
    return task.dateModification;
  }
  if (task.createdAt && task.createdAt.trim() !== '') {
    return task.createdAt;
  }
  return new Date().toISOString();
}

/**
 * Formate la date de dernière activité pour l'affichage en clair dans la carte dépliée :
 * "Dernière activité le DD/MM/YYYY à HH:mm"
 */
export function formatLastActivityDate(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `Dernière activité le ${day}/${month}/${year} à ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Règle d'exclusion stricte :
 * Ne pas appliquer l'indicateur d'inactivité sur les statuts 'backlog' ou 'done'.
 */
export function isTaskExcludedFromInactivity(statut: StatutTache | string): boolean {
  if (!statut) return true;
  const s = statut.toLowerCase().trim();
  return s === 'backlog' || s === 'done';
}

/**
 * Calcule le nombre entier de jours d'inactivité :
 * joursInactivite = Math.floor((now - lastActivityAt) / (1000 * 60 * 60 * 24))
 */
export function calculateInactivityDays(
  task: Tache | Task,
  referenceTimestamp: number = Date.now()
): number {
  const effectiveIso = getTaskEffectiveActivityDate(task);
  try {
    const activityTime = new Date(effectiveIso).getTime();
    if (isNaN(activityTime)) return 0;
    const diffMs = referenceTimestamp - activityTime;
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export interface TaskInactivityState {
  isApplicable: boolean; // false si 'backlog' ou 'done'
  days: number;
  label: string; // "Inactive depuis X jours" ou "Inactive depuis moins d'un jour"
  colorClass: string; // text-slate-400 | text-amber-500 | text-rose-600 animate-pulse
  badgeBgClass: string;
  badgeBorderClass: string;
  effectiveDate: string;
  formattedDisplay: string;
  tier: 'recent' | 'stagnant' | 'critical' | 'excluded';
}

/**
 * Retourne l'état complet d'inactivité d'une tâche selon les seuils :
 * - < 3 jours : Gris / neutre (`text-slate-400`)
 * - 3 à 7 jours : Orange (`text-amber-500`)
 * - > 7 jours : Rouge intense (`text-rose-600 animate-pulse`)
 */
export function getTaskInactivityState(
  task: Tache | Task,
  referenceTimestamp: number = Date.now()
): TaskInactivityState {
  const effectiveDate = getTaskEffectiveActivityDate(task);
  const formattedDisplay = formatLastActivityDate(effectiveDate);

  if (isTaskExcludedFromInactivity(task.statut)) {
    return {
      isApplicable: false,
      days: 0,
      label: '',
      colorClass: 'text-slate-400',
      badgeBgClass: 'bg-slate-50',
      badgeBorderClass: 'border-slate-200',
      effectiveDate,
      formattedDisplay,
      tier: 'excluded',
    };
  }

  const days = calculateInactivityDays(task, referenceTimestamp);
  const label =
    days <= 0
      ? "Inactive depuis moins d'un jour"
      : days === 1
      ? 'Inactive depuis 1 jour'
      : `Inactive depuis ${days} jours`;

  if (days < 3) {
    return {
      isApplicable: true,
      days,
      label,
      colorClass: 'text-slate-400 hover:text-slate-600',
      badgeBgClass: 'bg-slate-50',
      badgeBorderClass: 'border-slate-200',
      effectiveDate,
      formattedDisplay,
      tier: 'recent',
    };
  } else if (days <= 7) {
    return {
      isApplicable: true,
      days,
      label,
      colorClass: 'text-amber-500 hover:text-amber-600',
      badgeBgClass: 'bg-amber-50/80',
      badgeBorderClass: 'border-amber-200/80',
      effectiveDate,
      formattedDisplay,
      tier: 'stagnant',
    };
  } else {
    return {
      isApplicable: true,
      days,
      label,
      colorClass: 'text-rose-600 animate-pulse hover:text-rose-700',
      badgeBgClass: 'bg-rose-50',
      badgeBorderClass: 'border-rose-200',
      effectiveDate,
      formattedDisplay,
      tier: 'critical',
    };
  }
}

/**
 * Crée ou actualise les métadonnées d'activité d'une tâche avec horodatage ISO courant.
 */
export function touchTaskActivity(task: Tache | Task, timestampIso: string = new Date().toISOString()): Tache {
  return {
    ...task,
    lastActivityAt: timestampIso,
    updatedAt: timestampIso,
    dateModification: timestampIso,
  };
}

/**
 * Mise à jour du titre, de la description, du projet ou de l'échéance d'une tâche.
 * Actualise automatiquement `lastActivityAt = new Date().toISOString()`.
 */
export function updateTaskDetails(
  task: Tache,
  data: {
    titre: string;
    description?: string;
    projetId?: string | null;
    dateEcheance?: string | null;
    statut?: StatutTache;
  }
): Tache {
  const nowIso = new Date().toISOString();
  const nextStatus = data.statut || task.statut;
  const isNowDone = nextStatus === 'Done';
  const dateRealisation = isNowDone
    ? task.dateRealisation || nowIso
    : null;

  return {
    ...task,
    titre: data.titre,
    description: data.description !== undefined ? data.description : task.description,
    projetId: data.projetId !== undefined ? data.projetId : task.projetId,
    dateEcheance: data.dateEcheance !== undefined ? data.dateEcheance : task.dateEcheance,
    statut: nextStatus,
    dateRealisation,
    lastActivityAt: nowIso,
    updatedAt: nowIso,
    dateModification: nowIso,
  };
}

/**
 * Mise à jour du statut d'une tâche.
 * Actualise automatiquement `lastActivityAt = new Date().toISOString()`.
 */
export function updateTaskStatus(
  task: Tache,
  newStatus: StatutTache,
  options?: {
    note?: string;
    newOrdre?: number;
  }
): Tache {
  const nowIso = new Date().toISOString();
  const isNowDone = newStatus === 'Done';
  const dateRealisation = isNowDone
    ? task.dateRealisation || nowIso
    : null;

  const comments = [...(task.commentaires || [])];
  if (options?.note && options.note.trim() !== '') {
    comments.push({
      id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      texte: options.note.trim(),
      date: nowIso,
    });
  }

  return {
    ...task,
    statut: newStatus,
    dateRealisation,
    ordre: options?.newOrdre !== undefined ? options.newOrdre : task.ordre,
    commentaires: comments,
    lastActivityAt: nowIso,
    updatedAt: nowIso,
    dateModification: nowIso,
  };
}

/**
 * Ajout d'un commentaire sur une tâche.
 * Actualise automatiquement `lastActivityAt = new Date().toISOString()`.
 */
export function addTaskComment(task: Tache, commentText: string): Tache {
  const nowIso = new Date().toISOString();
  const newComm: Commentaire = {
    id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    texte: commentText.trim(),
    date: nowIso,
  };

  return {
    ...task,
    commentaires: [...(task.commentaires || []), newComm],
    lastActivityAt: nowIso,
    updatedAt: nowIso,
    dateModification: nowIso,
  };
}

/**
 * Modification d'un commentaire existant sur une tâche.
 * Actualise automatiquement `lastActivityAt = new Date().toISOString()`.
 */
export function editTaskComment(task: Tache, commentId: string, newText: string): Tache {
  const nowIso = new Date().toISOString();
  const updatedComments = (task.commentaires || []).map((c) =>
    c.id === commentId ? { ...c, texte: newText.trim(), date: nowIso } : c
  );

  return {
    ...task,
    commentaires: updatedComments,
    lastActivityAt: nowIso,
    updatedAt: nowIso,
    dateModification: nowIso,
  };
}

/**
 * Crée un nouvel objet tâche avec tous les horodatages initialisés à now.
 */
export function createNewTask(params: {
  userId?: string;
  spaceId: string;
  titre: string;
  description?: string;
  projetId?: string | null;
  statut?: StatutTache;
  dateEcheance?: string | null;
  ordre?: number;
  initialComments?: Commentaire[];
}): Tache {
  const nowIso = new Date().toISOString();
  const statut = params.statut || 'Open';
  return {
    id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId: params.userId,
    spaceId: params.spaceId,
    titre: params.titre.trim(),
    description: params.description || '',
    projetId: params.projetId ?? null,
    statut,
    dateEcheance: params.dateEcheance || null,
    dateRealisation: statut === 'Done' ? nowIso : null,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastActivityAt: nowIso,
    dateModification: nowIso,
    ordre: typeof params.ordre === 'number' ? params.ordre : 0,
    commentaires: params.initialComments || [],
  };
}

/**
 * Sauvegarde la tâche dans Firestore si l'utilisateur est connecté et valide.
 */
export async function persistTask(userId: string | undefined, task: Tache): Promise<void> {
  if (!userId) return;
  await saveTaskToFirestore(userId, task);
}
