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
  phaseId?: string | null; // Phase de projet associée (Optionnelle)
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
  activationDate?: string; // Date d'activation planifiée (format YYYY-MM-DD), applicable uniquement au statut 'Backlog'
}

export interface ProjectPhase {
  id: string;
  spaceId: string;
  projectId: string;
  name: string;             // Ex: "Phase 1 - Cadrage & Architecture"
  startDate: string;        // YYYY-MM-DD
  endDate: string;          // YYYY-MM-DD
  color?: string;           // Couleur pastel (Japandi)
  jiraEpicKey?: string;     // Ex: "PMO-102" (Optionnel)
  jiraEpicUrl?: string;     // Ex: "https://jira.company.com/browse/PMO-102"
}

import { ProjectDeliverable, Project, TeamMember, MonthlyAllocation } from './types/project';
import { RaidItem, RaidType, ImpactLevel, ProbabilityLevel, RoamStatus } from './types/raid';
import { KnowledgeDoc, KnowledgeCategory, SopArticle } from './types/knowledge';
export type { ProjectDeliverable, Project, TeamMember, MonthlyAllocation, RaidItem, RaidType, ImpactLevel, ProbabilityLevel, RoamStatus, KnowledgeDoc, KnowledgeCategory, SopArticle };

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
  startDate?: string; // Date de début (YYYY-MM-DD)
  endDate?: string;   // Date de fin (YYYY-MM-DD)
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

export interface ActivityLog {
  id: string;
  spaceId: string;
  taskId: string;
  taskTitle: string;
  projectId?: string | null;
  projectName?: string | null;
  type: 'CREATED' | 'STATUS_CHANGED' | 'COMMENT_ADDED' | 'UPDATED';
  details: string; // Ex: "Statut modifié : En cours ➔ Bloqué"
  timestamp: string; // ISO string
}

export interface Milestone {
  id: string;
  spaceId: string;
  projectId: string;
  title: string;
  date: string; // ISO String (YYYY-MM-DD)
  description?: string;
  completed?: boolean;
  isBoundary?: 'start' | 'end' | null; // Flag pour identifier les jalons de bornage automatique
}


