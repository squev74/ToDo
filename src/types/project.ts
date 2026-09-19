export interface ProjectDeliverable {
  id: string;
  title: string;
  url: string;
  type: 'planning' | 'doc' | 'report' | 'design' | 'other';
  status: 'planned' | 'in_progress' | 'delivered';
  deliveredAt?: string; // Format ISO ou date string
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
}

export type Project = Projet;
