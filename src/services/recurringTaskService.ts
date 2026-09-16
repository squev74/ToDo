import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  RecurringTaskTemplate,
  RecurrenceType,
  DAYS_OF_WEEK,
} from '../types/recurringTask';
import { Tache } from '../types';
import {
  getTodayDateString,
  getTomorrowDateString,
  getNextWorkdayDateString,
  formatDateToLocalYMD,
} from '../utils/storage';

const RECURRING_CACHE_KEY_PREFIX = 'todolist_recurring_templates_';

/**
 * Nettoie un modèle pour Firestore afin d'éliminer toute valeur `undefined`
 */
function sanitizeTemplateForFirestore(
  template: RecurringTaskTemplate,
  userId?: string
): Record<string, any> {
  return {
    id: template.id,
    userId: userId || template.userId || null,
    spaceId: template.spaceId,
    projectId: template.projectId || null,
    title: template.title.trim(),
    description: template.description?.trim() || '',
    recurrenceType: template.recurrenceType,
    dayOfWeek: template.dayOfWeek !== undefined ? template.dayOfWeek : null,
    dayOfMonth: template.dayOfMonth !== undefined ? template.dayOfMonth : null,
    nextRunDate: template.nextRunDate,
    isActive: Boolean(template.isActive),
    createdAt: template.createdAt || new Date().toISOString(),
    lastGeneratedDate: template.lastGeneratedDate || null,
  };
}

/**
 * Sauvegarde locale de secours
 */
export function getCachedRecurringTemplates(userId?: string): RecurringTaskTemplate[] {
  try {
    const key = RECURRING_CACHE_KEY_PREFIX + (userId || 'local');
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCachedRecurringTemplates(
  userId: string | undefined,
  templates: RecurringTaskTemplate[]
): void {
  try {
    const key = RECURRING_CACHE_KEY_PREFIX + (userId || 'local');
    localStorage.setItem(key, JSON.stringify(templates));
  } catch {
    // Ignorer si localStorage plein
  }
}

/**
 * Propose la première date d'exécution recommandée selon le type de récurrence (par défaut Demain/Prochain cycle)
 */
export function getRecommendedFirstRunDate(
  recurrenceType: RecurrenceType,
  options?: { dayOfWeek?: number; dayOfMonth?: number }
): string {
  const todayStr = getTodayDateString();
  const [year, month, day] = todayStr.split('-').map(Number);
  const now = new Date(year, month - 1, day, 12, 0, 0);

  switch (recurrenceType) {
    case 'workdays':
      return getNextWorkdayDateString(now);

    case 'daily':
      return getTomorrowDateString();

    case 'weekly': {
      const targetDay = options?.dayOfWeek ?? 1; // Lundi par défaut
      const d = new Date(now.getTime());
      d.setDate(d.getDate() + 1); // Commencer à chercher dès demain
      while (d.getDay() !== targetDay) {
        d.setDate(d.getDate() + 1);
      }
      return formatDateToLocalYMD(d);
    }

    case 'monthly': {
      const targetDayOfMonth = options?.dayOfMonth ?? 1;
      const d = new Date(now.getTime());
      // Si le jour cible n'est pas encore passé ce mois-ci et est strictement demain ou plus tard
      if (d.getDate() < targetDayOfMonth) {
        const maxDaysThisMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const actualDay = Math.min(targetDayOfMonth, maxDaysThisMonth);
        d.setDate(actualDay);
        return formatDateToLocalYMD(d);
      }
      // Sinon le mois prochain
      d.setMonth(d.getMonth() + 1);
      const maxDaysNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(targetDayOfMonth, maxDaysNextMonth));
      return formatDateToLocalYMD(d);
    }
  }
}

/**
 * Calcule la prochaine date d'exécution selon la règle de récurrence (Outlook-like)
 * @param fromDateStr Date de référence (format YYYY-MM-DD)
 * @param recurrenceType 'daily' | 'weekly' | 'monthly' | 'workdays'
 * @param options dayOfWeek (0-6) ou dayOfMonth (1-31)
 */
export function calculateNextRunDate(
  fromDateStr: string,
  recurrenceType: RecurrenceType,
  options?: { dayOfWeek?: number; dayOfMonth?: number }
): string {
  const [year, month, day] = fromDateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);

  switch (recurrenceType) {
    case 'daily': {
      // +1 jour calendaire
      date.setDate(date.getDate() + 1);
      break;
    }

    case 'workdays': {
      // Jour ouvré suivant (du lundi au vendredi, saute samedi et dimanche)
      date.setDate(date.getDate() + 1);
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
      break;
    }

    case 'weekly': {
      // Même jour de la semaine la semaine suivante (+7 jours)
      // Ou recherche du jour choisi si options.dayOfWeek est spécifié
      date.setDate(date.getDate() + 7);
      if (options?.dayOfWeek !== undefined && date.getDay() !== options.dayOfWeek) {
        const diff = (options.dayOfWeek - date.getDay() + 7) % 7;
        date.setDate(date.getDate() + (diff === 0 ? 7 : diff));
      }
      break;
    }

    case 'monthly': {
      const targetDayOfMonth = options?.dayOfMonth ?? day;
      // Passer au mois suivant
      date.setDate(1); // Évite tout dépassement temporaire
      date.setMonth(date.getMonth() + 1);
      const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(targetDayOfMonth, maxDays));
      break;
    }
  }

  return formatDateToLocalYMD(date);
}

/**
 * Fait avancer la date d'exécution jusqu'à obtenir une date strictement future (> todayStr)
 */
export function getNextUpcomingRunDate(
  fromDateStr: string,
  recurrenceType: RecurrenceType,
  todayStr: string,
  options?: { dayOfWeek?: number; dayOfMonth?: number }
): string {
  let nextDate = calculateNextRunDate(fromDateStr, recurrenceType, options);
  let guard = 0;
  while (nextDate <= todayStr && guard < 500) {
    nextDate = calculateNextRunDate(nextDate, recurrenceType, options);
    guard++;
  }
  return nextDate;
}

/**
 * Formate un libellé clair et lisible de la fréquence
 */
export function formatRecurrenceLabel(
  recurrenceType: RecurrenceType,
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  switch (recurrenceType) {
    case 'daily':
      return 'Tous les jours';
    case 'workdays':
      return 'Jours ouvrés (Lun - Ven)';
    case 'weekly': {
      const dayObj = DAYS_OF_WEEK.find((d) => d.value === dayOfWeek);
      return `Chaque semaine le ${dayObj ? dayObj.label : 'jour prévu'}`;
    }
    case 'monthly':
      return `Chaque mois le ${dayOfMonth || 1}${dayOfMonth === 1 ? 'er' : ''}`;
  }
}

/**
 * Enregistre ou met à jour un modèle de tâche récurrente dans Firestore et le cache local
 */
export async function saveRecurringTemplate(
  userId: string | undefined,
  template: RecurringTaskTemplate
): Promise<void> {
  // Mise à jour du cache local immédiate
  const cached = getCachedRecurringTemplates(userId);
  const existingIdx = cached.findIndex((t) => t.id === template.id);
  let updatedList: RecurringTaskTemplate[];
  if (existingIdx >= 0) {
    updatedList = [...cached];
    updatedList[existingIdx] = template;
  } else {
    updatedList = [template, ...cached];
  }
  setCachedRecurringTemplates(userId, updatedList);

  // Sauvegarde Firestore si utilisateur connecté
  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'recurringTemplates', template.id);
      await setDoc(docRef, sanitizeTemplateForFirestore(template, userId), { merge: true });
    } catch (err: any) {
      console.warn('Sauvegarde modèle récurrent Firestore différée :', err?.message || err);
    }
  }
}

/**
 * Supprime un modèle de tâche récurrente
 */
export async function deleteRecurringTemplate(
  userId: string | undefined,
  templateId: string
): Promise<void> {
  const cached = getCachedRecurringTemplates(userId);
  setCachedRecurringTemplates(
    userId,
    cached.filter((t) => t.id !== templateId)
  );

  if (userId) {
    try {
      const docRef = doc(db, 'users', userId, 'recurringTemplates', templateId);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.warn('Suppression modèle récurrent Firestore différée :', err?.message || err);
    }
  }
}

/**
 * Écoute en temps réel les modèles de tâches récurrentes de l'utilisateur
 */
export function subscribeToRecurringTemplates(
  userId: string | undefined,
  onUpdate: (templates: RecurringTaskTemplate[]) => void
): () => void {
  // Chargement immédiat depuis le cache
  const initial = getCachedRecurringTemplates(userId);
  if (initial.length > 0) {
    onUpdate(initial);
  }

  if (!userId) {
    return () => {};
  }

  const collRef = collection(db, 'users', userId, 'recurringTemplates');
  return onSnapshot(
    collRef,
    (snapshot) => {
      const list: RecurringTaskTemplate[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as RecurringTaskTemplate;
        list.push({
          ...data,
          userId,
        });
      });
      list.sort((a, b) => (a.nextRunDate > b.nextRunDate ? 1 : -1));
      setCachedRecurringTemplates(userId, list);
      onUpdate(list);
    },
    (err) => {
      console.warn('Écoute modèles récurrents Firestore différée :', err.message);
      onUpdate(getCachedRecurringTemplates(userId));
    }
  );
}

/**
 * SERVICE DE GÉNÉRATION AUTOMATIQUE (Option A - Client-side)
 * Vérifie toutes les récurrences actives échues pour l'espace courant,
 * génère les tâches opérationnelles correspondantes au statut 'Open' (to_do),
 * puis met à jour `nextRunDate` dans la base de données.
 */
export async function processDueRecurringTasks(params: {
  userId?: string;
  spaceId: string;
  templates: RecurringTaskTemplate[];
  existingTasks?: Tache[];
  onTaskCreated: (newTask: Tache) => Promise<void> | void;
  onTemplateUpdated: (updatedTemplate: RecurringTaskTemplate) => Promise<void> | void;
}): Promise<{
  generatedCount: number;
  tasks: Tache[];
}> {
  const { userId, spaceId, templates, existingTasks = [], onTaskCreated, onTemplateUpdated } = params;
  const todayStr = getTodayDateString();

  // Filtrage strict par spaceId, userId et date d'échéance atteinte
  // Une tâche ne doit être générée QUE si sa nextRunDate est passée ou égale à aujourd'hui
  // ET qu'elle n'a pas déjà été générée aujourd'hui
  const dueTemplates = templates.filter((template) => {
    if (!template.isActive) return false;
    if (template.spaceId !== spaceId) return false;
    if (userId && template.userId && template.userId !== userId) return false;
    // Si la prochaine date d'exécution est dans le futur (ex: demain), NE PAS générer aujourd'hui !
    if (template.nextRunDate > todayStr) return false;
    // Ne jamais générer deux fois la même récurrence le même jour
    if (template.lastGeneratedDate === todayStr) return false;
    return true;
  });

  if (dueTemplates.length === 0) {
    return { generatedCount: 0, tasks: [] };
  }

  const generatedTasks: Tache[] = [];

  for (const template of dueTemplates) {
    const deterministicTaskId = `rec-${template.id}-${todayStr}`;

    // Vérifier si une tâche pour cette récurrence et cette date existe déjà dans existingTasks
    const alreadyExists = existingTasks.some(
      (t) =>
        t.id === deterministicTaskId ||
        (t.spaceId === template.spaceId &&
          t.titre.trim().toLowerCase() === template.title.trim().toLowerCase() &&
          t.dateEcheance === todayStr &&
          t.commentaires?.some((c) => c.texte.includes('Tâche récurrente planifiée')))
    );

    // Calculer immédiatement la prochaine date strictement future
    const newNextRunDate = getNextUpcomingRunDate(
      template.nextRunDate,
      template.recurrenceType,
      todayStr,
      {
        dayOfWeek: template.dayOfWeek,
        dayOfMonth: template.dayOfMonth,
      }
    );

    const updatedTemplate: RecurringTaskTemplate = {
      ...template,
      nextRunDate: newNextRunDate,
      lastGeneratedDate: todayStr,
    };

    // Mettre à jour et sauvegarder le modèle immédiatement
    await saveRecurringTemplate(userId, updatedTemplate);
    await onTemplateUpdated(updatedTemplate);

    if (alreadyExists) {
      // Déjà créée pour cette journée : ignorer la création de doublon
      continue;
    }

    const nowIso = new Date().toISOString();
    // 1. Génération de la tâche opérationnelle au statut 'Open' (to_do)
    const newTask: Tache = {
      id: deterministicTaskId,
      userId: userId || template.userId,
      spaceId: template.spaceId,
      projetId: template.projectId || null,
      titre: template.title,
      description: template.description || '',
      statut: 'Open', // 'to_do'
      dateEcheance: todayStr,
      dateRealisation: null,
      dateModification: nowIso,
      ordre: 0, // En tête de liste
      commentaires: [
        {
          id: `comm-rec-${Date.now()}`,
          texte: `⚡ Tâche récurrente planifiée générée automatiquement (Fréquence : ${formatRecurrenceLabel(
            template.recurrenceType,
            template.dayOfWeek,
            template.dayOfMonth
          )}).`,
          date: nowIso,
        },
      ],
    };

    // 2. Notifier la création de la tâche
    await onTaskCreated(newTask);
    generatedTasks.push(newTask);
  }

  return {
    generatedCount: generatedTasks.length,
    tasks: generatedTasks,
  };
}
