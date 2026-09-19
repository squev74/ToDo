export type RaidType = 'risk' | 'assumption' | 'dependency' | 'issue';
export type ImpactLevel = 1 | 2 | 3; // 1 = Faible, 2 = Moyen, 3 = Élevé
export type ProbabilityLevel = 1 | 2 | 3; // 1 = Faible, 2 = Moyenne, 3 = Élevée
export type RoamStatus = 'resolved' | 'owned' | 'accepted' | 'mitigated';

export interface RaidItem {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: RaidType;
  impact: ImpactLevel;
  probability: ProbabilityLevel;
  criticalityScore: number; // calculé : impact * probability (1 à 9)
  roamStatus: RoamStatus;
  owner?: string; // Nom du responsable si status = 'owned'
  mitigationPlan?: string; // Plan d'action / de contournement
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}
