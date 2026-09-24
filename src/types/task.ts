export type StatutTache = 'Backlog' | 'Open' | 'In Progress' | 'Blocked' | 'Done' | 'Cancelled' | 'backlog';

export interface Commentaire {
  id: string;
  texte: string;
  date: string; // Horodatage ISO (ex: "2026-09-11T14:30:00.000Z")
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

// Alias Task conforme aux conventions TypeScript
export type Task = Tache;

export interface Projet {
  id: string;
  userId?: string;
  spaceId: string;
  nom: string;
  couleur: string;
  dateCreation: string;
}
