import { Tache, Projet, Espace, AppDataExport, UserProfile } from '../types';

export const DEFAULT_SPACE_ID = 'space-default';

// Helper pour formater la date du jour YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Espaces de travail par défaut
export function getDefaultSpaces(userId?: string): Espace[] {
  return [
    {
      id: DEFAULT_SPACE_ID,
      userId,
      nom: 'Mon espace',
      couleur: '#6366f1',
      icone: 'briefcase',
      description: 'Espace principal par défaut',
      dateCreation: '2026-09-01T00:00:00.000Z',
    },
  ];
}

// Projets par défaut pour un espace donné
export function getDefaultProjects(
  userId?: string,
  spaceId: string = DEFAULT_SPACE_ID
): Projet[] {
  const effectiveSpaceId = spaceId || DEFAULT_SPACE_ID;
  return [
    {
      id: 'proj-1',
      userId,
      spaceId: effectiveSpaceId,
      nom: 'Plateforme Web',
      couleur: '#3b82f6', // blue
      dateCreation: '2026-09-01T09:00:00.000Z',
    },
    {
      id: 'proj-2',
      userId,
      spaceId: effectiveSpaceId,
      nom: 'Marketing & Lancement',
      couleur: '#10b981', // emerald
      dateCreation: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 'proj-3',
      userId,
      spaceId: effectiveSpaceId,
      nom: 'Sécurité & Infra',
      couleur: '#8b5cf6', // purple
      dateCreation: '2026-09-03T11:00:00.000Z',
    },
  ];
}

export const DEFAULT_PROJECTS = getDefaultProjects();

// Tâches de démarrage avec assignation stricte à l'utilisateur et à l'espace
export function getDefaultTasks(
  userId?: string,
  spaceId: string = DEFAULT_SPACE_ID
): Tache[] {
  const effectiveSpaceId = spaceId || DEFAULT_SPACE_ID;
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();

  // Date hier
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

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
      spaceId: effectiveSpaceId,
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
      spaceId: effectiveSpaceId,
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
      spaceId: effectiveSpaceId,
      titre: 'Intégration du système de notifications par e-mail',
      description: 'Configuration du service SMTP et des modèles transactionnels.',
      projetId: 'proj-1',
      statut: 'Done',
      dateEcheance: today,
      dateRealisation: new Date(Date.now() - 3600000 * 4).toISOString(),
      dateModification: new Date(Date.now() - 3600000 * 4).toISOString(),
      ordre: 3,
      commentaires: [
        {
          id: 'comm-2',
          texte: 'Templates validés par le design.',
          date: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
      ],
    },
    {
      id: 'task-4',
      userId,
      spaceId: effectiveSpaceId,
      titre: 'Mise à niveau de la base de données vers v16',
      description: 'Migration du schéma et tests de non-régression sur le cluster de staging.',
      projetId: 'proj-3',
      statut: 'Blocked',
      dateEcheance: futureDateStr,
      dateRealisation: null,
      dateModification: nowIso,
      ordre: 4,
      commentaires: [
        {
          id: 'comm-3',
          texte: 'Bloqué : En attente de la fenêtre de maintenance approuvée par le DevOps.',
          date: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ],
    },
    {
      id: 'task-5',
      userId,
      spaceId: effectiveSpaceId,
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
function getUserStorageKey(userId: string, resource: 'tasks' | 'projects' | 'spaces' | 'activeSpace'): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `todolist_${resource}_user_${safeId}`;
}

// Chargement des espaces de travail isolés de l'utilisateur
export function loadUserSpacesFromStorage(userId: string): Espace[] {
  if (!userId) return getDefaultSpaces();
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'spaces'));
    if (!raw) return getDefaultSpaces(userId);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((s) => ({
        ...s,
        userId,
      }));
    }
  } catch (err) {
    console.error('Erreur chargement espaces locaux:', err);
  }
  return getDefaultSpaces(userId);
}

// Sauvegarde des espaces de travail isolés de l'utilisateur
export function saveUserSpacesToStorage(userId: string, spaces: Espace[]): void {
  if (!userId) return;
  try {
    const scopedSpaces = spaces.map((s) => ({ ...s, userId }));
    localStorage.setItem(getUserStorageKey(userId, 'spaces'), JSON.stringify(scopedSpaces));
  } catch (err) {
    console.error('Erreur sauvegarde espaces locaux:', err);
  }
}

// Mémorisation de l'espace actif
export function loadActiveSpaceId(userId: string): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(getUserStorageKey(userId, 'activeSpace'));
  } catch {
    return null;
  }
}

export function saveActiveSpaceId(userId: string, spaceId: string): void {
  if (!userId || !spaceId) return;
  try {
    localStorage.setItem(getUserStorageKey(userId, 'activeSpace'), spaceId);
  } catch (err) {
    console.error('Erreur sauvegarde espace actif:', err);
  }
}

// Chargement des tâches isolées de l'utilisateur avec garantie de spaceId
export function loadUserTasksFromStorage(userId: string): Tache[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'tasks'));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filtrer strictement pour s'assurer qu'aucune tâche d'un autre utilisateur n'est retournée
      return parsed
        .filter((t) => !t.userId || t.userId === userId)
        .map((t) => ({
          ...t,
          spaceId: t.spaceId || DEFAULT_SPACE_ID, // Rétrocompatibilité / migration automatique
        }));
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
    const scopedTasks = tasks.map((t) => ({
      ...t,
      userId,
      spaceId: t.spaceId || DEFAULT_SPACE_ID,
    }));
    localStorage.setItem(getUserStorageKey(userId, 'tasks'), JSON.stringify(scopedTasks));
  } catch (err) {
    console.error('Erreur sauvegarde tâches locales:', err);
  }
}

// Chargement des projets isolés de l'utilisateur avec garantie de spaceId
export function loadUserProjectsFromStorage(userId: string): Projet[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, 'projects'));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((p) => !p.userId || p.userId === userId)
        .map((p) => ({
          ...p,
          spaceId: p.spaceId || DEFAULT_SPACE_ID, // Rétrocompatibilité / migration automatique
        }));
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
    const scopedProjects = projects.map((p) => ({
      ...p,
      userId,
      spaceId: p.spaceId || DEFAULT_SPACE_ID,
    }));
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
    localStorage.removeItem(getUserStorageKey(userId, 'spaces'));
    localStorage.removeItem(getUserStorageKey(userId, 'activeSpace'));
  } catch (err) {
    console.error('Erreur nettoyage données locales:', err);
  }
}

// Export global JSON (avec espaces de travail)
export function exportDataAsJson(
  tasks: Tache[],
  projects: Projet[],
  spaces?: Espace[],
  userId?: string
): void {
  const exportPayload: AppDataExport = {
    version: 2,
    exportedAt: new Date().toISOString(),
    userId,
    espaces: spaces && spaces.length > 0 ? spaces : getDefaultSpaces(userId),
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
): { valid: boolean; taches?: Tache[]; projets?: Projet[]; espaces?: Espace[]; error?: string } {
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

  // Espaces
  let sanitizedSpaces: Espace[] = [];
  if (Array.isArray(payload.espaces) && payload.espaces.length > 0) {
    sanitizedSpaces = payload.espaces.map((s) => ({
      ...s,
      userId: currentUserId || s.userId,
      nom: s.nom || 'Espace sans nom',
      couleur: s.couleur || '#6366f1',
      icone: s.icone || 'briefcase',
      dateCreation: s.dateCreation || new Date().toISOString(),
    }));
  } else {
    sanitizedSpaces = getDefaultSpaces(currentUserId);
  }

  const fallbackSpaceId = sanitizedSpaces[0]?.id || DEFAULT_SPACE_ID;

  const sanitizedTasks = payload.taches.map((t) => ({
    ...t,
    userId: currentUserId || t.userId,
    spaceId: t.spaceId || fallbackSpaceId,
    description: t.description || '',
    projetId: t.projetId || null,
    dateEcheance: t.dateEcheance || null,
    dateRealisation: t.dateRealisation || null,
    commentaires: Array.isArray(t.commentaires) ? t.commentaires : [],
  }));

  const sanitizedProjects = payload.projets.map((p) => ({
    ...p,
    userId: currentUserId || p.userId,
    spaceId: p.spaceId || fallbackSpaceId,
  }));

  return {
    valid: true,
    espaces: sanitizedSpaces,
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

const USERS_CACHE_KEY = 'todolist_cached_users_list';
const USER_PROFILE_KEY_PREFIX = 'todolist_user_profile_';

export function getCachedUserProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY_PREFIX + uid);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(USER_PROFILE_KEY_PREFIX + profile.uid, JSON.stringify(profile));
  } catch {
    // Ignorer
  }
}

export function getCachedUsersList(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCachedUsersList(users: UserProfile[]): void {
  try {
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
  } catch {
    // Ignorer
  }
}

