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
 * pour chaque projet de l'espace sur la fenêtre des 100 derniers jours.
 */
export function buildCapacityVsTimesheetMetrics(
  projects: Projet[],
  timesheets: TimeEntry[],
  spaceId: string,
  tasks: Task[] = []
): CapacityVsTimesheetMetric[] {
  const spaceProjects = projects.filter((p) => p.spaceId === spaceId);
  const spaceTimesheets = timesheets.filter((t) => t.spaceId === spaceId);
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

  return spaceProjects.map((project) => {
    // 1. Calculer le réel saisi dans le Timesheet sur les 100 derniers jours
    const projectTimesheets = spaceTimesheets.filter((entry) => {
      if (!dateRange.includes(entry.date)) return false;

      // Correspondance par clé JIRA ou nom du projet ou tâche associée
      const matchesJira = project.jiraKey && entry.jiraKey && project.jiraKey.toUpperCase().trim() === entry.jiraKey.toUpperCase().trim();
      const matchesName = project.nom.toLowerCase().trim() === entry.projectName.toLowerCase().trim();
      
      let matchesTask = false;
      if (entry.taskId && tasks.length > 0) {
        const t = tasks.find((tk) => tk.id === entry.taskId);
        if (t && t.projetId === project.id) {
          matchesTask = true;
        }
      }

      return matchesJira || matchesName || matchesTask;
    });

    const actualHours = projectTimesheets.reduce((acc, curr) => acc + curr.hours, 0);

    // 2. Calculer le Plan Capacitaire alloué sur la même période
    // En multipliant les allocations mensuelles par la fraction du mois couverte par les 100 derniers jours
    let allocatedHours = 0;
    if (project.allocations && project.allocations.length > 0) {
      project.allocations.forEach((alloc: MonthlyAllocation) => {
        const key = `${alloc.year}-${alloc.month}`;
        const overlap = monthOverlaps.get(key);
        if (overlap) {
          // allocatedHours = jours * fraction_du_mois_dans_les_100_jours * 8 heures par jour
          allocatedHours += alloc.requestedDays * overlap.fraction * 8;
        }
      });
    }

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
