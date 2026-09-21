import { Tache, Projet } from '../types';
import { TimeEntry } from '../types/timesheet';

export interface PmoAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'timesheet' | 'delay' | 'stagnant' | 'capacity' | 'raid' | 'deliverable';
  projectId?: string;
  projectCode?: string;
  message: string;
  actionTab?: string; // Nom de l'onglet/vue vers lequel rediriger
}

/**
 * Helper pour obtenir la date du dernier jour ouvré au format YYYY-MM-DD.
 * Si aujourd'hui est samedi, dimanche ou lundi -> retourne le vendredi précédent.
 * Sinon, retourne la veille (hier).
 */
export function getLastWorkingDay(baseDate = new Date()): string {
  const d = new Date(baseDate.getTime());
  const day = d.getDay(); // 0 = Dimanche, 1 = Lundi, 2 = Mardi, ..., 6 = Samedi
  
  if (day === 1) {
    // Lundi -> vendredi précédent (-3 jours)
    d.setDate(d.getDate() - 3);
  } else if (day === 0) {
    // Dimanche -> vendredi précédent (-2 jours)
    d.setDate(d.getDate() - 2);
  } else if (day === 6) {
    // Samedi -> vendredi précédent (-1 jour)
    d.setDate(d.getDate() - 1);
  } else {
    // Autre jour de la semaine -> hier (-1 jour)
    d.setDate(d.getDate() - 1);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
}

/**
 * Calcule l'écart en jours entre deux dates.
 */
export function getDaysDiff(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Génère toutes les alertes du portefeuille (Multi-projets).
 */
export function generateGlobalAlerts(
  projects: Projet[],
  tasks: Tache[],
  timesheets: TimeEntry[],
  currentDateStr = new Date().toISOString().split('T')[0]
): PmoAlert[] {
  const alerts: PmoAlert[] = [];
  const now = new Date();

  // ----------------------------------------------------
  // 1. SAISIE DES TEMPS (Timesheet)
  // ----------------------------------------------------
  // On ne vérifie les feuilles de temps que s'il y a au moins un projet actif exigeant la saisie des temps.
  // Par défaut, si l'option n'est pas définie (undefined), on considère qu'elle est requise (true).
  const isTimesheetRequired = projects.some((p) => p.requiresTimesheet !== false);

  if (isTimesheetRequired) {
    const lastWorkingDay = getLastWorkingDay(now);
    const entriesForLastWorkingDay = timesheets.filter((t) => t.date === lastWorkingDay);
    const totalHoursOnLastWorkingDay = entriesForLastWorkingDay.reduce((sum, entry) => sum + entry.hours, 0);

    if (totalHoursOnLastWorkingDay === 0) {
      alerts.push({
        id: `timesheet-empty-${lastWorkingDay}`,
        severity: 'critical',
        category: 'timesheet',
        message: `La feuille de temps du dernier jour ouvré (${lastWorkingDay}) n'a pas été remplie.`,
        actionTab: 'timesheet',
      });
    } else if (totalHoursOnLastWorkingDay < 7) {
      alerts.push({
        id: `timesheet-incomplete-${lastWorkingDay}`,
        severity: 'warning',
        category: 'timesheet',
        message: `La feuille de temps du dernier jour ouvré (${lastWorkingDay}) est incomplète (${totalHoursOnLastWorkingDay}h saisies sur 8h attendues).`,
        actionTab: 'timesheet',
      });
    }
  }

  // ----------------------------------------------------
  // BOUCLE PAR PROJET POUR LES ALERTES SPÉCIFIQUES
  // ----------------------------------------------------
  projects.forEach((proj) => {
    const projTasks = tasks.filter((t) => t.projetId === proj.id);

    // 2. TÂCHES EN RETARD
    projTasks.forEach((task) => {
      if (task.statut !== 'Done' && task.statut !== 'backlog' && task.dateEcheance) {
        if (task.dateEcheance < currentDateStr) {
          const delayDays = getDaysDiff(currentDateStr, task.dateEcheance);
          alerts.push({
            id: `delay-task-${task.id}`,
            severity: 'critical',
            category: 'delay',
            projectId: proj.id,
            projectCode: proj.jiraKey || 'GEN',
            message: `[${proj.jiraKey || 'PROJET'}] Tâche en retard de ${delayDays} jour(s) : "${task.titre}" (Échéance : ${task.dateEcheance}).`,
            actionTab: 'tasks',
          });
        }
      }
    });

    // 3. TÂCHES STAGNANTES / INACTIVES (>= 7 jours)
    projTasks.forEach((task) => {
      if (task.statut !== 'Done' && task.statut !== 'backlog') {
        const lastActivity = task.lastActivityAt || task.updatedAt || task.dateModification || task.createdAt;
        if (lastActivity) {
          const inactiveDays = getDaysDiff(currentDateStr, lastActivity.split('T')[0]);
          if (inactiveDays >= 7) {
            alerts.push({
              id: `stagnant-task-${task.id}`,
              severity: 'warning',
              category: 'stagnant',
              projectId: proj.id,
              projectCode: proj.jiraKey || 'GEN',
              message: `[${proj.jiraKey || 'PROJET'}] La tâche "${task.titre}" n'a pas évolué depuis ${inactiveDays} jours (Statut : ${task.statut}).`,
              actionTab: 'tasks',
            });
          }
        }
      }
    });

    // 4. PLAN CAPACITAIRE VIDE / INCOMPLET
    if (proj.hasCapacityPlanning !== false) {
      // Vérification mois en cours
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

      const hasCurrentAlloc = (proj.allocations || []).some(
        (alloc) => alloc.year === currentYear && alloc.month === currentMonth && alloc.requestedDays > 0
      );
      const hasNextAlloc = (proj.allocations || []).some(
        (alloc) => alloc.year === nextYear && alloc.month === nextMonth && alloc.requestedDays > 0
      );

      if (!hasCurrentAlloc) {
        alerts.push({
          id: `capacity-empty-current-${proj.id}`,
          severity: 'critical',
          category: 'capacity',
          projectId: proj.id,
          projectCode: proj.jiraKey || 'GEN',
          message: `[${proj.nom}] Le plan capacitaire est vide pour le mois en cours (${currentMonth}/${currentYear}).`,
          actionTab: 'overview', // Redirige vers la fiche projet
        });
      }
      if (!hasNextAlloc) {
        alerts.push({
          id: `capacity-empty-next-${proj.id}`,
          severity: 'info',
          category: 'capacity',
          projectId: proj.id,
          projectCode: proj.jiraKey || 'GEN',
          message: `[${proj.nom}] Pensez à renseigner le plan capacitaire pour le mois prochain (${nextMonth}/${nextYear}).`,
          actionTab: 'overview',
        });
      }
    }

    // 5. REGISTRE RAID (Risques majeurs non gérés)
    if (proj.raidLog) {
      proj.raidLog.forEach((item) => {
        if (item.status === 'open') {
          const isCriticalRisk = item.type === 'risk' && item.criticalityScore >= 6;
          const isIssue = item.type === 'issue';

          if (isCriticalRisk || isIssue) {
            const hasOwner = item.owner && item.owner.trim().length > 0;
            const hasMitigation = item.mitigationPlan && item.mitigationPlan.trim().length > 0;

            if (!hasOwner || !hasMitigation) {
              const missingParts = [];
              if (!hasOwner) missingParts.push('responsable');
              if (!hasMitigation) missingParts.push("plan d'action");

              alerts.push({
                id: `raid-unmanaged-${item.id}`,
                severity: isCriticalRisk ? 'critical' : 'warning',
                category: 'raid',
                projectId: proj.id,
                projectCode: proj.jiraKey || 'GEN',
                message: `[${proj.jiraKey || 'RAID'}] ${item.type === 'risk' ? 'Risque critique' : 'Problème'} ouvert : "${item.title}" sans ${missingParts.join(' ni ')} renseigné.`,
                actionTab: 'overview',
              });
            }
          }
        }
      });
    }

    // 6. LIVRABLES À ÉCHÉANCE PROCHE (Dans les 7 jours)
    if (proj.deliverables) {
      proj.deliverables.forEach((item) => {
        if (item.status !== 'delivered' && item.targetDate) {
          const diffDays = getDaysDiff(item.targetDate, currentDateStr); // Positif si futur, négatif si passé

          if (diffDays < 0) {
            // Retard
            alerts.push({
              id: `deliverable-late-${item.id}`,
              severity: 'critical',
              category: 'deliverable',
              projectId: proj.id,
              projectCode: proj.jiraKey || 'GEN',
              message: `[${proj.jiraKey || 'PROJET'}] Livrable en retard de ${Math.abs(diffDays)} jour(s) : "${item.title}" (Échéance dépassée : ${item.targetDate}).`,
              actionTab: 'overview',
            });
          } else if (diffDays <= 7) {
            // Échéance proche (0 à 7 jours)
            alerts.push({
              id: `deliverable-soon-${item.id}`,
              severity: 'warning',
              category: 'deliverable',
              projectId: proj.id,
              projectCode: proj.jiraKey || 'GEN',
              message: `[${proj.jiraKey || 'PROJET'}] Livrable attendu sous ${diffDays} jour(s) : "${item.title}" (Échéance : ${item.targetDate}).`,
              actionTab: 'overview',
            });
          }
        }
      });
    }
  });

  return alerts;
}

/**
 * Génère uniquement les alertes spécifiques au projet sélectionné.
 */
export function generateProjectAlerts(
  projectId: string,
  projects: Projet[],
  tasks: Tache[],
  currentDateStr = new Date().toISOString().split('T')[0]
): PmoAlert[] {
  const targetProj = projects.find((p) => p.id === projectId);
  if (!targetProj) return [];

  // On peut réutiliser le générateur global et filtrer
  const global = generateGlobalAlerts([targetProj], tasks, [], currentDateStr);
  
  // On ne garde que celles liées à ce projet
  return global.filter((a) => a.projectId === projectId);
}
