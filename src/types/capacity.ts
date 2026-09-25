export interface MonthlyAllocation {
  memberId: string;
  year: number;
  month: number; // 1 à 12
  requestedDays: number;
  status: 'draft' | 'requested' | 'approved' | 'rejected';
}

export interface CapacityFilter {
  userName: string; // Nom du consultant à filtrer pour le plan capacitaire
}
