import { Task, Projet, TimeEntry, MonthlyAllocation } from '../types';

export interface CfdDayMetric {
  date: string;
  todo: number;
  in_progress: number;
  done_cancelled: number;
}

export interface CapacityVsTimesheetMetric {
  projectId: string;
  projectName: string;
  projectColor: string;
  actualHours: number;
  allocatedHours: number;
  percentage: number;
}

export interface VelocityMetric {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g., "Janv", "Févr"
  created: number;
  closed: number;
}

const MONTH_NAMES = [
  'Janv', 'Févr', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
];

/**
 * Génère le tableau des 100 dernières dates (format YYYY-MM-DD), finissant par aujourd'hui.
 */
export function get100DaysRange(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 99; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

/**
 * Normalise le statut pour l'aggrégation
 */
function getNormalizedStatusCategory(status: string): 'todo' | 'in_progress' | 'done_cancelled' {
  const s = (status || '').toLowerCase().trim();
  if (s === 'done' || s === 'cancelled') {
    return 'done_cancelled';
  }
  if (s === 'in progress' || s === 'in_progress' || s === 'blocked') {
    return 'in_progress';
  }
  return 'todo'; // 'open', 'backlog' ou autre
}

/**
 * Calcule l'évolution cumulative quotidienne du CFD pour les 100 derniers jours.
 * Traque le volume de chaque statut jour par jour de manière exacte.
 */
export function buildCfdMetrics(tasks: Task[], spaceId: string): CfdDayMetric[] {
  const spaceTasks = tasks.filter((t) => t.spaceId === spaceId);
  const dateRange = get100DaysRange();
  
  return dateRange.map((dayStr) => {
    let todo = 0;
    let in_progress = 0;
    let done_cancelled = 0;

    const dayTime = new Date(dayStr + 'T23:59:59').getTime();

    spaceTasks.forEach((task) => {
      // Date de création de la tâche
      const createdDateStr = task.createdAt ? task.createdAt.substring(0, 10) : '';
      if (!createdDateStr) return; // Si pas de date de création, on l'ignore pour le CFD

      const createdTime = new Date(createdDateStr + 'T00:00:00').getTime();
      if (createdTime > dayTime) {
        // La tâche n'existait pas encore à cette date
        return;
      }

      // Est-elle fermée à ce jour ?
      let isClosedAtDay = false;
      if (task.dateRealisation) {
        const closedDateStr = task.dateRealisation.substring(0, 10);
        const closedTime = new Date(closedDateStr + 'T00:00:00').getTime();
        if (closedTime <= dayTime) {
          isClosedAtDay = true;
        }
      }

      if (isClosedAtDay) {
        done_cancelled++;
      } else {
        // Déterminer le statut à cette date
        const cat = getNormalizedStatusCategory(task.statut);
        if (cat === 'in_progress') {
          in_progress++;
        } else {
          todo++;
        }
      }
    });

    return {
      date: dayStr,
      todo,
      in_progress,
      done_cancelled,
    };
  });
}

/**
 * Calcule pour chaque jour du mois le nombre de jours appartenant à l'intervalle des 100 derniers jours.
 * Permet d'obtenir la fraction exacte de capacité allouée.
 */
function getMonthOverlapFraction(year: number, month: number, dateRange: string[]): number {
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  let daysInRange = 0;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dateRange.includes(dayStr)) {
      daysInRange++;
    }
  }

  return daysInRange / totalDaysInMonth;
}

/**
 * Aggrège le total d'heures réelles saisies (Timesheet) vs allouées (Plan Capacitaire)
 * pour un intervenant spécifique sur la fenêtre des 100 derniers jours.
 */
export function buildCapacityVsTimesheetMetrics(
  projects: Projet[],
  timesheets: TimeEntry[],
  spaceId: string,
  tasks: Task[] = [],
  userName: string = 'Sylvain'
): CapacityVsTimesheetMetric[] {
  // 1. LOGS DE DIAGNOSTIC AUTOMATIQUES (Console)
  console.log('[Timesheet Debug] Total entries received:', timesheets.length);
  console.log('[Timesheet Debug] Sample entry:', timesheets[0]);

  const spaceProjects = projects.filter((p) => p.spaceId === spaceId);
  
  // Filtrage Espace (spaceId) : vérifier l'espace, mais ne pas rejeter si l'entrée n'a pas de spaceId explicite
  const spaceTimesheets = timesheets.filter((t) => {
    if (t.spaceId && t.spaceId !== spaceId) return false;
    return true;
  });

  const dateRange = get100DaysRange();

  // Déterminer les mois/années uniques présents dans les 100 jours
  const monthOverlaps = new Map<string, { year: number; month: number; fraction: number }>();
  dateRange.forEach((dayStr) => {
    const parts = dayStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const key = `${year}-${month}`;
    if (!monthOverlaps.has(key)) {
      const fraction = getMonthOverlapFraction(year, month, dateRange);
      monthOverlaps.set(key, { year, month, fraction });
    }
  });

  // Déterminer la date exacte d'il y a 100 jours
  const todayDate = new Date();

  return spaceProjects.map((project) => {
    // 1. Calculer le réel saisi dans le Timesheet sur les 100 derniers jours pour cet intervenant
    const rawProjectTimesheets = spaceTimesheets.filter((entry) => {
      // Filtrage Date (100 jours) : Parser la date de manière robuste et comparer le timestamp
      if (entry.date) {
        const entryDate = new Date(entry.date);
        const hundredDaysAgoTime = todayDate.getTime() - 100 * 24 * 60 * 60 * 1000;
        if (entryDate.getTime() < hundredDaysAgoTime) return false;
      } else {
        return false;
      }

      // Filtrage Nom (userName) : Nettoyer les chaînes, inclure par défaut si absent
      const entryUser = (entry.userName || '').trim().toLowerCase();
      const filterUser = (userName || '').trim().toLowerCase();

      if (filterUser !== '' && entryUser !== '') {
        const isExact = entryUser === filterUser;
        const isPartial = entryUser.includes(filterUser) || filterUser.includes(entryUser);

        if (!isExact && !isPartial) {
          return false;
        }
      }

      // Correspondance par clé JIRA ou nom du projet ou tâche associée (nettoyage et sensibilité à la casse)
      const projectJira = (project.jiraKey || '').toUpperCase().trim();
      const entryJira = (entry.jiraKey || '').toUpperCase().trim();
      const projectNameLower = (project.nom || '').toLowerCase().trim();
      const entryProjectNameLower = (entry.projectName || '').toLowerCase().trim();

      // Règle 1: Exclure les entrées de projets supprimés (non présents dans spaceProjects)
      if (entryJira !== '') {
        const isProjActive = spaceProjects.some((p) => {
          const pJira = (p.jiraKey || '').toUpperCase().trim();
          return entryJira === p.id || (pJira !== '' && entryJira === pJira);
        });
        if (!isProjActive) {
          // Projet supprimé / orphelin -> on l'ignore d'office
          return false;
        }
      }

      // Règle 2: Si l'entrée indique une clé de projet, elle doit correspondre à CE projet en cours de traitement
      if (entryJira !== '') {
        const isCurrentProject = entryJira === project.id || (projectJira !== '' && entryJira === projectJira);
        if (!isCurrentProject) {
          return false;
        }
      }

      // Associer les heures si entry.projectId === project.id OR entry.projectName === project.name (ou project.nom)
      const matchesProjectId = (entry as any).projectId && (entry as any).projectId === project.id;
      const matchesJira = projectJira !== '' && entryJira !== '' && projectJira === entryJira;
      const matchesName = projectNameLower !== '' && entryProjectNameLower !== '' && projectNameLower === entryProjectNameLower;
      
      let matchesTask = false;
      if (entry.taskId && tasks.length > 0) {
        const t = tasks.find((tk) => tk.id === entry.taskId);
        if (t && t.projetId === project.id) {
          matchesTask = true;
        }
      }

      return matchesProjectId || matchesJira || matchesName || matchesTask;
    });

    // Éliminer les doublons potentiels d'entrées d'après leur `id` unique
    const uniqueEntriesMap = new Map<string, typeof rawProjectTimesheets[0]>();
    rawProjectTimesheets.forEach((e) => {
      if (e.id) {
        uniqueEntriesMap.set(e.id, e);
      } else {
        const fallbackKey = `${e.date}_${e.jiraKey || ''}_${e.projectName || ''}_${e.hours}`;
        uniqueEntriesMap.set(fallbackKey, e);
      }
    });
    const projectTimesheets = Array.from(uniqueEntriesMap.values());

    // Traçabilité explicite spécifique pour le projet CLM
    const projectNomUpper = (project.nom || '').toUpperCase().trim();
    const projectJiraUpper = (project.jiraKey || '').toUpperCase().trim();
    const isCLM = projectNomUpper === 'CLM' || projectJiraUpper === 'CLM';

    if (isCLM) {
      projectTimesheets.forEach((entry) => {
        console.log('[CLM Entry Detected]', {
          date: entry.date,
          hours: entry.hours || (entry as any).duration || 0,
          project: entry.projectName,
          id: entry.id,
          spaceId: entry.spaceId,
          userName: entry.userName
        });
      });
    }

    // Sommer les heures réelles (heures ou duration)
    const actualHours = projectTimesheets.reduce((acc, curr) => acc + (curr.hours || (curr as any).duration || 0), 0);

    if (isCLM) {
      console.log('[CLM Total Calculated]', actualHours);
    }

    // 2. Identifier le collaborateur associé à l'utilisateur ciblé dans ce projet
    const filterUser = userName.trim().toLowerCase();
    const matchingMembers = project.teamMembers
      ? project.teamMembers.filter((m) => {
          const nameLower = (m.name || '').trim().toLowerCase();
          if (nameLower === '' || filterUser === '') return false;
          return nameLower === filterUser || nameLower.includes(filterUser) || filterUser.includes(nameLower);
        })
      : [];
    const memberIds = matchingMembers.map((m) => m.id);

    // 3. Calculer le Plan Capacitaire alloué UNIQUEMENT pour cet intervenant sur la même période
    let projectCapacityInDays = 0;
    if (project.allocations && project.allocations.length > 0 && memberIds.length > 0) {
      project.allocations.forEach((alloc: MonthlyAllocation) => {
        if (memberIds.includes(alloc.memberId)) {
          const key = `${alloc.year}-${alloc.month}`;
          // Si le mois fait partie de l'intervalle des 100 derniers jours (présent dans monthOverlaps)
          if (monthOverlaps.has(key)) {
            // Formule STRICTEMENT demandée : allocatedHours = jours * 8 heures
            projectCapacityInDays += (alloc.requestedDays || 0);
          }
        }
      });
    }
    const allocatedHours = projectCapacityInDays * 8;

    const percentage = allocatedHours > 0 ? Math.round((actualHours / allocatedHours) * 100) : 0;

    return {
      projectId: project.id,
      projectName: project.nom,
      projectColor: project.couleur || '#6B8E78',
      actualHours: parseFloat(actualHours.toFixed(1)),
      allocatedHours: parseFloat(allocatedHours.toFixed(1)),
      percentage,
    };
  });
}

/**
 * Construit les métriques mensuelles de vélocité (créées vs fermées) pour les 6 derniers mois.
 */
export function buildVelocityMetrics(tasks: Task[], spaceId: string): VelocityMetric[] {
  const spaceTasks = tasks.filter((t) => t.spaceId === spaceId);
  
  // Générer les 6 derniers mois clés
  const metrics: VelocityMetric[] = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const monthLabel = `${MONTH_NAMES[month - 1]} ${String(year).substring(2)}`;
    
    metrics.push({
      monthKey,
      monthLabel,
      created: 0,
      closed: 0,
    });
  }

  spaceTasks.forEach((task) => {
    // Tâches créées
    if (task.createdAt) {
      const createdMonthKey = task.createdAt.substring(0, 7); // YYYY-MM
      const m = metrics.find((metric) => metric.monthKey === createdMonthKey);
      if (m) {
        m.created++;
      }
    }

    // Tâches fermées
    if ((task.statut === 'Done' || task.statut === 'Cancelled') && task.dateRealisation) {
      const closedMonthKey = task.dateRealisation.substring(0, 7); // YYYY-MM
      const m = metrics.find((metric) => metric.monthKey === closedMonthKey);
      if (m) {
        m.closed++;
      }
    }
  });

  return metrics;
}

/**
 * Récupère le nombre de tâches stagnantes de l'espace de travail.
 * Tâches ouvertes sans modification depuis > 14 jours.
 */
export function getStagnantTasksCount(tasks: Task[], spaceId: string): number {
  const spaceTasks = tasks.filter((t) => t.spaceId === spaceId);
  const now = Date.now();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  return spaceTasks.filter((task) => {
    // Uniquement les tâches ouvertes (ni Done ni Cancelled)
    if (task.statut === 'Done' || task.statut === 'Cancelled') {
      return false;
    }

    // Déterminer la date de dernière mise à jour / activité
    let lastActivityTime = 0;
    if (task.lastActivityAt) {
      lastActivityTime = new Date(task.lastActivityAt).getTime();
    } else if (task.updatedAt) {
      lastActivityTime = new Date(task.updatedAt).getTime();
    } else if (task.dateModification) {
      lastActivityTime = new Date(task.dateModification).getTime();
    } else if (task.createdAt) {
      lastActivityTime = new Date(task.createdAt).getTime();
    }

    if (lastActivityTime === 0 || isNaN(lastActivityTime)) {
      return false; // Impossible à déterminer
    }

    return (now - lastActivityTime) > FOURTEEN_DAYS_MS;
  }).length;
}
