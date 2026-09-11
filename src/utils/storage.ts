import { Tache, Projet, AppDataExport } from '../types';

const STORAGE_KEYS = {
  TASKS: 'todolist_tasks_v1',
  PROJECTS: 'todolist_projects_v1',
};

// Helper pour formater la date du jour YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Données d'initialisation par défaut
export const DEFAULT_PROJECTS: Projet[] = [
  {
    id: 'proj-1',
    nom: 'Plateforme Web',
    couleur: '#3b82f6', // blue
    dateCreation: '2026-09-01T09:00:00.000Z',
  },
  {
    id: 'proj-2',
    nom: 'Marketing & Lancement',
    couleur: '#10b981', // emerald
    dateCreation: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'proj-3',
    nom: 'Sécurité & Infra',
    couleur: '#8b5cf6', // purple
    dateCreation: '2026-09-03T11:00:00.000Z',
  },
];

export function getDefaultTasks(): Tache[] {
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();

  // Date hier
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Date passée (en retard)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);
  const pastDateStr = pastDate.toISOString().split('T')[0];

  // Date future
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  return [
    {
      id: 'task-1',
      titre: 'Audit de sécurité des endpoints API',
      description: 'Vérifier la conformité des autorisations JWT et le rate limiting.',
      projetId: 'proj-3',
      statut: 'In Progress',
      dateEcheance: futureDateStr,
      dateRealisation: null,
      ordre: 1,
      commentaires: [
        {
          id: 'comm-1',
          texte: 'Démarrage de la revue de code sur le module auth.',
          date: new Date(Date.now() - 3600000 * 3).toISOString(),
        },
      ],
    },
    {
      id: 'task-2',
      titre: 'Rédiger la documentation de démarrage',
      description: 'Préparer le guide utilisateur et les FAQ pour les nouveaux arrivants.',
      projetId: 'proj-2',
      statut: 'Open',
      dateEcheance: pastDateStr, // En retard intentionnellement
      dateRealisation: null,
      ordre: 2,
      commentaires: [],
    },
    {
      id: 'task-3',
      titre: 'Intégration du système de notifications par e-mail',
      description: 'Configuration du service SMTP et des modèles transactionnels.',
      projetId: 'proj-1',
      statut: 'Blocked',
      dateEcheance: yesterdayStr,
      dateRealisation: null,
      ordre: 3,
      commentaires: [
        {
          id: 'comm-2',
          texte: 'Bloqué : En attente de validation des accès DNS et SPF/DKIM par l’équipe réseau.',
          date: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ],
    },
    {
      id: 'task-4',
      titre: 'Mise en page responsive du tableau de bord',
      description: 'Optimisation de la grille sur écrans mobiles et tablettes.',
      projetId: 'proj-1',
      statut: 'Done',
      dateEcheance: today,
      dateRealisation: nowIso,
      ordre: 4,
      commentaires: [
        {
          id: 'comm-3',
          texte: 'Validation QA réussie sur Chrome, Firefox et Safari.',
          date: new Date(Date.now() - 3600000 * 1).toISOString(),
        },
      ],
    },
    {
      id: 'task-5',
      titre: 'Préparer la campagne de communication réseaux sociaux',
      description: 'Créer les visuels et le calendrier de diffusion de rentrée.',
      projetId: 'proj-2',
      statut: 'Open',
      dateEcheance: futureDateStr,
      dateRealisation: null,
      ordre: 5,
      commentaires: [],
    },
  ];
}

// Chargement depuis localStorage
export function loadTasksFromStorage(): Tache[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      const defaults = getDefaultTasks();
      saveTasksToStorage(defaults);
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Erreur chargement tâches localStorage:', err);
  }
  return getDefaultTasks();
}

export function saveTasksToStorage(tasks: Tache[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Erreur sauvegarde tâches localStorage:', err);
  }
}

export function loadProjectsFromStorage(): Projet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) {
      saveProjectsToStorage(DEFAULT_PROJECTS);
      return DEFAULT_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Erreur chargement projets localStorage:', err);
  }
  return DEFAULT_PROJECTS;
}

export function saveProjectsToStorage(projects: Projet[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (err) {
    console.error('Erreur sauvegarde projets localStorage:', err);
  }
}

// Export JSON
export function exportDataAsJson(tasks: Tache[], projects: Projet[]): void {
  const exportPayload: AppDataExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projets: projects,
    taches: tasks,
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(exportPayload, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  const dateStr = getTodayDateString();
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `gestionnaire-taches-export-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Validation de l'import JSON
export function validateImportData(data: unknown): { valid: boolean; taches?: Tache[]; projets?: Projet[]; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Format de fichier JSON invalide.' };
  }

  const payload = data as Partial<AppDataExport>;
  if (!Array.isArray(payload.taches) || !Array.isArray(payload.projets)) {
    return { valid: false, error: 'Le fichier importé doit contenir les tableaux "taches" et "projets".' };
  }

  // Vérification basique des tâches
  for (const t of payload.taches) {
    if (!t.id || typeof t.titre !== 'string' || !t.statut) {
      return { valid: false, error: 'Une ou plusieurs tâches ont une structure corrompue.' };
    }
  }

  return {
    valid: true,
    taches: payload.taches,
    projets: payload.projets,
  };
}

// Vérifie si une tâche est en retard
export function isTaskOverdue(task: Tache): boolean {
  if (task.statut === 'Done') return false;
  if (!task.dateEcheance) return false;

  const today = getTodayDateString();
  return task.dateEcheance < today;
}
