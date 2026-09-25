export interface TimeEntry {
  id: string;
  userId: string;
  spaceId: string;
  taskId?: string; // Lien optionnel vers une tâche de l'application
  jiraKey: string; // ex: 'EVOLIT-24', 'EVOLIT-94', 'PMOIT-1845'
  projectName: string;
  date: string; // format YYYY-MM-DD
  hours: number; // ex: 0.5, 1, 2, 4, 8
  comment?: string;
  userName?: string; // Identifie précisément l'intervenant (ex: "Sylvain")
}

export interface PMOProject {
  code: string; // Clé JIRA ou code unique du projet (ex: EVOLIT-24)
  name: string; // Nom lisible du projet
  id?: string;  // ID optionnel s'il est lié à un projet existant de l'application
}

export interface TimesheetConfig {
  id: string; // ID unique au format: spaceId_year_month
  spaceId: string;
  year: number;
  month: number;
  activeProjectIds: string[]; // Liste des IDs de projets de l'application actifs ce mois-ci
  hiddenProjectIds: string[]; // Liste des IDs de projets de l'application masqués ce mois-ci
  customProjects?: PMOProject[]; // Projets spécifiques ou temporaires créés pour ce mois
}

// Projets par défaut pour initialiser s'il n'y a aucun projet dans l'application
export const DEFAULT_PMO_PROJECTS: PMOProject[] = [
  { code: 'EVOLIT-24', name: 'Évolution Produit V24' },
  { code: 'EVOLIT-94', name: 'R&D Performance' },
  { code: 'PMOIT-1845', name: 'Migration Cloud' },
  { code: 'PMO-GENERAL', name: 'Support & Management' }
];

export const ABSENCE_PROJECT: PMOProject = {
  code: 'Vacances/Maladie',
  name: 'Absences & Congés (Vacances/Maladie)'
};

