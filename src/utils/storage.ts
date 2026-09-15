import { Tache, Projet, AppDataExport } from '../types';

// Helper pour formater la date du jour YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Projets par défaut
export function getDefaultProjects(userId?: string): Projet[] {
  return [
    {
      id: 'proj-1',
      userId,
      nom: 'Plateforme Web',
      couleur: '#3b82f6', // blue
      dateCreation: '2026-09-01T09:00:00.000Z',
    },
    {
      id: 'proj-2',
      userId,
      nom: 'Marketing & Lancement',
      couleur: '#10b981', // emerald
      dateCreation: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 'proj-3',
      userId,
      nom: 'Sécurité & Infra',
      couleur: '#8b5cf6', // purple
      dateCreation: '2026-09-03T11:00:00.000Z',
    },
  ];
}

export const DEFAULT_PROJECTS = getDefaultProjects();

// Tâches de démarrage avec assignation stricte à l'utilisateur
export function getDefaultTasks(userId?: string): Tache[] {
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();

  // Date hier
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayIso = yesterday.toISOString();

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
      userId,
      titre: 'Audit de sécurité des endpoints API',
      description: 'Vérifier la conformité des autorisations JWT et le rate limiting.',
      projetId: 'proj-3',
      statut: 'In Progress',
      dateEcheance: futureDateStr,
      dateRealisation: null,
      dateModification: nowIso,
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
      userId,
      titre: 'Rédiger la documentation de démarrage',
      description: 'Préparer le guide utilisateur et les FAQ pour les nouveaux arrivants.',
      projetId: 'proj-2',
      statut: 'Open',
      dateEcheance: pastDateStr, // En retard intentionnellement
      dateRealisation: null,
      dateModification: nowIso,
      ordre: 2,
      commentaires: [],
    },
    {
      id: 'task-3',
      userId,
      titre: 'Intégration du système de notifications par e-mail',
      description: 'Configuration du service SMTP et des modèles transactionnels.',
      projetId: 'proj-1',
      statut: 'Blocked',
      dateEcheance: yesterdayStr,
      dateRealisation: null,
      dateModification: yesterdayIso,
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
      userId,
      titre: 'Mise en page responsive du tableau de bord',
      description: 'Optimisation de la grille sur écrans mobiles et tablettes.',
      projetId: 'proj-1',
      statut: 'Done',
      dateEcheance: today,
      dateRealisation: nowIso,
      dateModification: nowIso,
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
      userId,
      titre: 'Préparer la campagne de communication réseaux sociaux',
      description: 'Créer les visuels et le calendrier de diffusion de rentrée.',
      projetId: 'proj-2',
      statut: 'Open',
      dateEcheance: futureDateStr,
      dateRealisation: null,
      dateModification: nowIso,
      ordre: 5,
      commentaires: [],
    },
  ];
}

// Clés de stockage isolées par identifiant utilisateur (multi-tenant)
function getUserStorageKey(userId: string, resource: 'tasks' | 'projects'): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `todolist_${resource}_user_${safeId}`;
}

// Chargement des tâches isolées de l'utilisateur
export function loadUserTasksFromStorage(userId: string): Tache[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'tasks'));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filtrer strictement pour s'assurer qu'aucune tâche d'un autre utilisateur n'est retournée
      return parsed.filter((t) => !t.userId || t.userId === userId);
    }
  } catch (err) {
    console.error('Erreur chargement tâches locales:', err);
  }
  return [];
}

// Sauvegarde des tâches isolées de l'utilisateur
export function saveUserTasksToStorage(userId: string, tasks: Tache[]): void {
  if (!userId) return;
  try {
    const scopedTasks = tasks.map((t) => ({ ...t, userId }));
    localStorage.setItem(getUserStorageKey(userId, 'tasks'), JSON.stringify(scopedTasks));
  } catch (err) {
    console.error('Erreur sauvegarde tâches locales:', err);
  }
}

// Chargement des projets isolés de l'utilisateur
export function loadUserProjectsFromStorage(userId: string): Projet[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'projects'));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => !p.userId || p.userId === userId);
    }
  } catch (err) {
    console.error('Erreur chargement projets locaux:', err);
  }
  return [];
}

// Sauvegarde des projets isolés de l'utilisateur
export function saveUserProjectsToStorage(userId: string, projects: Projet[]): void {
  if (!userId) return;
  try {
    const scopedProjects = projects.map((p) => ({ ...p, userId }));
    localStorage.setItem(getUserStorageKey(userId, 'projects'), JSON.stringify(scopedProjects));
  } catch (err) {
    console.error('Erreur sauvegarde projets locaux:', err);
  }
}

// Nettoyage complet des données en cache pour un utilisateur
export function clearUserStorage(userId: string): void {
  if (!userId) return;
  try {
    localStorage.removeItem(getUserStorageKey(userId, 'tasks'));
    localStorage.removeItem(getUserStorageKey(userId, 'projects'));
  } catch (err) {
    console.error('Erreur nettoyage données locales:', err);
  }
}

// Rétrocompatibilité (pour imports sans userId explicite)
export function loadTasksFromStorage(): Tache[] {
  return [];
}

export function saveTasksToStorage(_tasks: Tache[]): void {
  // Ne fait rien pour éviter la pollution globale partagée
}

export function loadProjectsFromStorage(): Projet[] {
  return [];
}

export function saveProjectsToStorage(_projects: Projet[]): void {
  // Ne fait rien pour éviter la pollution globale partagée
}

// Export global JSON
export function exportDataAsJson(tasks: Tache[], projects: Projet[], userId?: string): void {
  const exportPayload: AppDataExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
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
export function validateImportData(
  data: unknown,
  currentUserId?: string
): { valid: boolean; taches?: Tache[]; projets?: Projet[]; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Format de fichier JSON invalide.' };
  }

  const payload = data as Partial<AppDataExport>;
  if (!Array.isArray(payload.taches) || !Array.isArray(payload.projets)) {
    return { valid: false, error: 'Le fichier importé doit contenir les tableaux "taches" et "projets".' };
  }

  // Vérification basique des tâches et attribution de l'userId
  for (const t of payload.taches) {
    if (!t.id || typeof t.titre !== 'string' || !t.statut) {
      return { valid: false, error: 'Une ou plusieurs tâches ont une structure corrompue.' };
    }
  }

  const sanitizedTasks = payload.taches.map((t) => ({
    ...t,
    userId: currentUserId || t.userId,
    description: t.description || '',
    projetId: t.projetId || null,
    dateEcheance: t.dateEcheance || null,
    dateRealisation: t.dateRealisation || null,
    commentaires: Array.isArray(t.commentaires) ? t.commentaires : [],
  }));

  const sanitizedProjects = payload.projets.map((p) => ({
    ...p,
    userId: currentUserId || p.userId,
  }));

  return {
    valid: true,
    taches: sanitizedTasks,
    projets: sanitizedProjects,
  };
}

// Vérifie si une tâche est en retard
export function isTaskOverdue(task: Tache): boolean {
  if (task.statut === 'Done') return false;
  if (!task.dateEcheance) return false;

  const today = getTodayDateString();
  return task.dateEcheance < today;
}
