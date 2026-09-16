export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'workdays';

export interface RecurringTaskTemplate {
  id: string;
  userId?: string;
  spaceId: string;
  projectId?: string | null;
  title: string;
  description?: string;
  recurrenceType: RecurrenceType;
  dayOfWeek?: number; // 0 = Dimanche, 1 = Lundi, 2 = Mardi, ..., 6 = Samedi
  dayOfMonth?: number; // 1 à 31
  nextRunDate: string; // Format YYYY-MM-DD
  isActive: boolean;
  createdAt?: string;
  lastGeneratedDate?: string | null;
}

export interface RecurrenceConfigOption {
  type: RecurrenceType;
  label: string;
  description: string;
  badgeColor: string;
}

export const RECURRENCE_OPTIONS: RecurrenceConfigOption[] = [
  {
    type: 'daily',
    label: 'Tous les jours',
    description: 'Se répète chaque jour calendaire sans interruption',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    type: 'workdays',
    label: 'Jours ouvrés',
    description: 'Du lundi au vendredi uniquement (saute le week-end)',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    type: 'weekly',
    label: 'Hebdomadaire',
    description: 'Un jour précis chaque semaine (ex: chaque lundi)',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    type: 'monthly',
    label: 'Mensuel',
    description: 'Un jour fixe du mois (ex: chaque 1er ou 15 du mois)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
];

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi', short: 'Lun' },
  { value: 2, label: 'Mardi', short: 'Mar' },
  { value: 3, label: 'Mercredi', short: 'Mer' },
  { value: 4, label: 'Jeudi', short: 'Jeu' },
  { value: 5, label: 'Vendredi', short: 'Ven' },
  { value: 6, label: 'Samedi', short: 'Sam' },
  { value: 0, label: 'Dimanche', short: 'Dim' },
];
