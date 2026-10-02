import { Projet, Tache, Milestone } from '../types';

export interface ProjectMetrics {
  timeProgressPercent: number; // 0 to 100
  tasksProgressPercent: number; // 0 to 100
  isOverdue: boolean;
}

export function calculateProjectMetrics(
  project: Projet,
  projectTasks: Tache[]
): ProjectMetrics {
  const { startDate, endDate } = project;
  
  let timeProgressPercent = 0;
  let isOverdue = false;

  if (startDate && endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const totalDuration = end.getTime() - start.getTime();
    if (totalDuration > 0) {
      if (today.getTime() < start.getTime()) {
        timeProgressPercent = 0;
      } else if (today.getTime() > end.getTime()) {
        timeProgressPercent = 100;
        isOverdue = true;
      } else {
        const elapsed = today.getTime() - start.getTime();
        timeProgressPercent = Math.round((elapsed / totalDuration) * 100);
      }
    } else {
      if (today.getTime() > end.getTime()) {
        timeProgressPercent = 100;
        isOverdue = true;
      } else {
        timeProgressPercent = 0;
      }
    }
  }

  let tasksProgressPercent = 0;
  if (projectTasks.length > 0) {
    const doneTasks = projectTasks.filter((t) => t.statut === 'Done');
    tasksProgressPercent = Math.round((doneTasks.length / projectTasks.length) * 100);
  }

  return {
    timeProgressPercent,
    tasksProgressPercent,
    isOverdue,
  };
}

/**
 * Synchronise les jalons de bornage automatique ("Début de projet" et "Fin de projet")
 * pour un projet donné.
 */
export function syncBoundaryMilestones(
  project: Projet,
  currentMilestones: Milestone[],
  onSave: (m: Milestone) => void,
  onDelete: (id: string) => void
) {
  const projectMilestones = currentMilestones.filter(m => m.projectId === project.id);

  // 1. Jalon de début
  const startMilestone = projectMilestones.find(m => m.isBoundary === 'start');
  if (project.startDate) {
    if (startMilestone) {
      if (startMilestone.date !== project.startDate) {
        onSave({
          ...startMilestone,
          date: project.startDate,
        });
      }
    } else {
      onSave({
        id: `milestone-start-${project.id}-${Date.now()}`,
        spaceId: project.spaceId,
        projectId: project.id,
        title: 'Début de projet',
        date: project.startDate,
        description: 'Généré automatiquement au début du projet',
        completed: false,
        isBoundary: 'start',
      });
    }
  } else if (startMilestone) {
    onDelete(startMilestone.id);
  }

  // 2. Jalon de fin
  const endMilestone = projectMilestones.find(m => m.isBoundary === 'end');
  if (project.endDate) {
    if (endMilestone) {
      if (endMilestone.date !== project.endDate) {
        onSave({
          ...endMilestone,
          date: project.endDate,
        });
      }
    } else {
      onSave({
        id: `milestone-end-${project.id}-${Date.now()}`,
        spaceId: project.spaceId,
        projectId: project.id,
        title: 'Fin de projet',
        date: project.endDate,
        description: 'Généré automatiquement à la fin du projet',
        completed: false,
        isBoundary: 'end',
      });
    }
  } else if (endMilestone) {
    onDelete(endMilestone.id);
  }
}
