import React from 'react';
import {
  Briefcase,
  Home,
  Heart,
  Folder,
  Star,
  Sparkles,
  Target,
  BookOpen,
  Coffee,
  Laptop,
  Code,
  Palette,
  Rocket,
  Layers,
  LucideIcon,
} from 'lucide-react';

export interface WorkspaceIconOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const WORKSPACE_ICONS: WorkspaceIconOption[] = [
  { id: 'briefcase', label: 'Travail / Pro', icon: Briefcase },
  { id: 'home', label: 'Maison / Perso', icon: Home },
  { id: 'heart', label: 'Hobbies / Passion', icon: Heart },
  { id: 'folder', label: 'Dossier', icon: Folder },
  { id: 'star', label: 'Favori', icon: Star },
  { id: 'sparkles', label: 'Créatif', icon: Sparkles },
  { id: 'target', label: 'Objectifs', icon: Target },
  { id: 'book-open', label: 'Études / Lecture', icon: BookOpen },
  { id: 'coffee', label: 'Quotidien', icon: Coffee },
  { id: 'laptop', label: 'Tech / Bureau', icon: Laptop },
  { id: 'code', label: 'Dev / Projets', icon: Code },
  { id: 'palette', label: 'Design / Art', icon: Palette },
  { id: 'rocket', label: 'Startup / Launch', icon: Rocket },
  { id: 'layers', label: 'Organisation', icon: Layers },
];

export const WORKSPACE_PRESET_COLORS = [
  '#6B8E78', // Vert Sauge (Sage Mist)
  '#5B7083', // Bleu Ardoise (Slate Blue)
  '#C89B7B', // Terracotta doux (Warm Ochre)
  '#A3B19B', // Olive douce (Faded Olive)
  '#B86B53', // Terracotta / Brique douce
  '#7E6B8E', // Prune feutrée
  '#52796F', // Mousse profonde
  '#4A5568', // Anthracite doux
  '#9C6644', // Argile chaude
  '#486581', // Indigo délavé
];

export function getWorkspaceIconComponent(iconName?: string): LucideIcon {
  const match = WORKSPACE_ICONS.find((item) => item.id === iconName);
  return match ? match.icon : Briefcase;
}
