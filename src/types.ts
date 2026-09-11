export type StatutTache = 'Open' | 'In Progress' | 'Blocked' | 'Done';

export interface Commentaire {
  id: string;
  texte: string;
  date: string; // Horodatage ISO (ex: "2026-09-11T14:30:00.000Z")
}

export interface Tache {
  id: string;
  titre: string;
  description: string;
  projetId: string | null;
  statut: StatutTache;
  dateEcheance?: string; // Format YYYY-MM-DD
  dateRealisation: string | null; // Horodatage ISO automatique quand statut passe à 'Done'
  ordre: number; // Nombre entier pour le tri
  commentaires: Commentaire[];
}

export interface Projet {
  id: string;
  nom: string;
  couleur: string; // Code couleur hex ou classe Tailwind
  dateCreation: string;
}

export interface AppDataExport {
  version: number;
  exportedAt: string;
  projets: Projet[];
  taches: Tache[];
}
