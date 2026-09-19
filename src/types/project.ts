import { RaidItem } from './raid';

export interface ProjectDeliverable {
  id: string;
  title: string;
  url: string;
  type: 'planning' | 'doc' | 'report' | 'design' | 'other';
  status: 'planned' | 'in_progress' | 'delivered';
  deliveredAt?: string; // Format ISO ou date string
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
}

export interface MonthlyAllocation {
  memberId: string;
  year: number;
  month: number; // 1 to 12
  requestedDays: number;
  status: 'draft' | 'requested' | 'approved' | 'rejected';
}

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
}

export type Project = Projet;
