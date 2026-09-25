export type StatutTache = 'Backlog' | 'Open' | 'In Progress' | 'Blocked' | 'Done' | 'Cancelled' | 'backlog';

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
  auteur?: string;
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
  jiraKey?: string; // Clé JIRA associée (ex: 'EVOLIT-24')
  statut: StatutTache;
  dateEcheance?: string | null; // Format YYYY-MM-DD
  dateRealisation: string | null; // Horodatage ISO automatique quand statut passe à 'Done' ou 'Cancelled'
  cancellationReason?: string; // Motif optionnel d'annulation
  dateModification?: string; // Horodatage ISO quand la tâche ou son statut est modifié
  createdAt?: string; // Horodatage ISO de création
  updatedAt?: string; // Horodatage ISO de dernière mise à jour
  lastActivityAt?: string; // Horodatage ISO de dernière activité (édition, statut, commentaire)
  ordre: number; // Nombre entier pour le tri
  commentaires: Commentaire[];
}

import { ProjectDeliverable, Project, TeamMember, MonthlyAllocation } from './types/project';
import { RaidItem, RaidType, ImpactLevel, ProbabilityLevel, RoamStatus } from './types/raid';
import { KnowledgeDoc, KnowledgeCategory } from './types/knowledge';
export type { ProjectDeliverable, Project, TeamMember, MonthlyAllocation, RaidItem, RaidType, ImpactLevel, ProbabilityLevel, RoamStatus, KnowledgeDoc, KnowledgeCategory };

export type Task = Tache;

export interface Projet {
  id: string;
  userId?: string; // Identifiant unique du propriétaire
  spaceId: string; // Identifiant de l'espace de travail (Workspace)
  nom: string;
  couleur: string; // Code couleur hex ou classe Tailwind
  dateCreation: string;
  jiraKey?: string; // Clé JIRA ou code unique du projet (ex: EVOLIT-24)
  deliverables?: ProjectDeliverable[];
  teamMembers?: TeamMember[];
  allocations?: MonthlyAllocation[];
  raidLog?: RaidItem[];
  hasCapacityPlanning?: boolean;
  requiresTimesheet?: boolean;
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
export * from './types/capacity';
import { TimeEntry, TimesheetConfig } from './types/timesheet';
export type { TimeEntry, TimesheetConfig };

