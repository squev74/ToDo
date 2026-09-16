export type StatutTache = 'Backlog' | 'Open' | 'In Progress' | 'Blocked' | 'Done' | 'backlog';

export const ADMIN_EMAIL = 'squeva11@gmail.com';
export const ADMIN_UID = 'G1Dm03dHRvPelWT8c2ydqXLC1Y93';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'disabled';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string | null;
  role: UserRole;
  status: UserStatus;
  dateCreation: string;
  derniereConnexion?: string;
}

export interface Commentaire {
  id: string;
  texte: string;
  date: string; // Horodatage ISO (ex: "2026-09-11T14:30:00.000Z")
}

export interface Espace {
  id: string;
  userId?: string; // Identifiant du propriétaire
  nom: string;
  couleur: string; // Code couleur hex (ex: #6366f1)
  icone?: string; // Nom de l'icône (ex: 'briefcase', 'home', 'heart', etc.)
  description?: string;
  dateCreation: string;
}

export interface Tache {
  id: string;
  userId?: string; // Identifiant unique du propriétaire
  spaceId: string; // Identifiant de l'espace de travail (Workspace)
  titre: string;
  description: string;
  projetId: string | null;
  statut: StatutTache;
  dateEcheance?: string | null; // Format YYYY-MM-DD
  dateRealisation: string | null; // Horodatage ISO automatique quand statut passe à 'Done'
  dateModification?: string; // Horodatage ISO quand la tâche ou son statut est modifié
  ordre: number; // Nombre entier pour le tri
  commentaires: Commentaire[];
}

export interface Projet {
  id: string;
  userId?: string; // Identifiant unique du propriétaire
  spaceId: string; // Identifiant de l'espace de travail (Workspace)
  nom: string;
  couleur: string; // Code couleur hex ou classe Tailwind
  dateCreation: string;
}

export interface AppDataExport {
  version: number;
  exportedAt: string;
  userId?: string;
  espaces?: Espace[];
  projets: Projet[];
  taches: Tache[];
}

export * from './types/recurringTask';

