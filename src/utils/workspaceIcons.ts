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
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#84cc16', // lime
  '#f59e0b', // amber
  '#f97316', // orange
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#64748b', // slate
];

export function getWorkspaceIconComponent(iconName?: string): LucideIcon {
  const match = WORKSPACE_ICONS.find((item) => item.id === iconName);
  return match ? match.icon : Briefcase;
}
