import { Task } from '../types';

export interface ArchiveFilters {
  projectId: string;
  startDate: string;
  endDate: string;
  searchQuery: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Filtre les tâches actives :
 * - Toutes les tâches non terminées.
 * - Les tâches terminées dont la date de clôture remonte à 30 jours ou moins.
 */
export function getActiveTasks(tasks: Task[]): Task[] {
  const now = Date.now();
  return tasks.filter((task) => {
    if (task.statut !== 'Done') {
      return true;
    }
    if (!task.dateRealisation) {
      return true;
    }
    const completionTime = new Date(task.dateRealisation).getTime();
    if (isNaN(completionTime)) {
      return true;
    }
    return (now - completionTime) <= THIRTY_DAYS_MS;
  });
}

/**
 * Filtre les tâches archivées (terminées de plus de 30 jours) et applique les filtres combinés.
 */
export function getArchivedTasks(tasks: Task[], filters: ArchiveFilters): Task[] {
  const now = Date.now();

  const baseArchived = tasks.filter((task) => {
    if (task.statut !== 'Done') {
      return false;
    }
    if (!task.dateRealisation) {
      return false;
    }
    const completionTime = new Date(task.dateRealisation).getTime();
    if (isNaN(completionTime)) {
      return false;
    }
    return (now - completionTime) > THIRTY_DAYS_MS;
  });

  return baseArchived.filter((task) => {
    // Filtre par projet
    if (filters.projectId && filters.projectId !== 'all') {
      if (task.projetId !== filters.projectId) {
        return false;
      }
    }

    // Filtre par plage de dates
    if (task.dateRealisation) {
      const dateStr = task.dateRealisation.substring(0, 10); // YYYY-MM-DD
      if (filters.startDate && dateStr < filters.startDate) {
        return false;
      }
      if (filters.endDate && dateStr > filters.endDate) {
        return false;
      }
    } else {
      if (filters.startDate || filters.endDate) {
        return false;
      }
    }

    // Recherche textuelle multi-champs
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      const titleMatch = task.titre?.toLowerCase().includes(q);
      const descMatch = task.description?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) {
        return false;
      }
    }

    return true;
  });
}
