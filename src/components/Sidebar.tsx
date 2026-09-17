import React from 'react';
import {
  ListTodo,
  Inbox,
  CalendarCheck,
  Shield,
  FolderPlus,
  Plus,
  Zap,
  Cloud,
} from 'lucide-react';
import { Espace, Tache, Projet, ADMIN_EMAIL, ADMIN_UID } from '../types';
import { useAuth } from '../context/AuthContext';

export interface SidebarProps {
  currentView: 'tasks' | 'backlog' | 'report' | 'admin';
  onViewChange: (view: 'tasks' | 'backlog' | 'report' | 'admin') => void;
  activeSpace?: Espace;
  tasks: Tache[];
  projects: Projet[];
  onOpenTaskModal: () => void;
  onOpenProjectModal: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  activeSpace,
  tasks,
  projects,
  onOpenTaskModal,
  onOpenProjectModal,
}) => {
  const { user, userProfile, isAdmin } = useAuth();

  const isSuperAdmin = Boolean(
    isAdmin ||
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    user?.uid === ADMIN_UID ||
    userProfile?.role === 'admin' ||
    userProfile?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    userProfile?.uid === ADMIN_UID
  );

  // Filtrer pour l'espace actif
  const currentSpaceTasks = tasks.filter((t) => t.spaceId === activeSpace?.id);
  // Tâches actives de la vue principale (hors Backlog)
  const activeTasksCount = currentSpaceTasks.filter(
    (t) => (t.statut as string)?.toLowerCase() !== 'backlog'
  ).length;
  // Tâches en attente dans le Backlog
  const backlogTasksCount = currentSpaceTasks.filter(
    (t) => (t.statut as string)?.toLowerCase() === 'backlog'
  ).length;
  const currentSpaceProjectsCount = projects.filter((p) => p.spaceId === activeSpace?.id).length;

  return (
    <aside
      id="app-sidebar-nav"
      aria-label="Navigation latérale"
      className="hidden md:flex flex-col w-64 shrink-0 rounded-2xl border border-[#F0EFEB] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5"
    >
      {/* Espace actif info */}
      <div className="rounded-xl bg-[#F9F8F6] p-3 border border-[#F0EFEB]">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: activeSpace?.couleur || '#6B8E78' }}
          />
          <span className="text-xs font-medium text-[#1A1D1A] truncate">
            {activeSpace?.nom || 'Espace de travail'}
          </span>
        </div>
        <p className="text-[11px] text-[#737873]">
          {activeTasksCount} active{activeTasksCount > 1 ? 's' : ''} • {backlogTasksCount} backlog
        </p>
      </div>

      {/* Navigation principale */}
      <div className="space-y-1">
        <p className="px-2 text-[10px] font-medium text-[#737873]">
          Vues de l&apos;espace
        </p>

        {/* 1. Tableau des tâches actives */}
        <button
          id="sidebar-link-tasks"
          type="button"
          onClick={() => onViewChange('tasks')}
          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
            currentView === 'tasks'
              ? 'bg-[#6B8E78] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
              : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ListTodo className="h-4 w-4" />
            <span>Tâches actives</span>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              currentView === 'tasks'
                ? 'bg-white/20 text-white'
                : 'bg-[#F0EFEB] text-[#737873]'
            }`}
          >
            {activeTasksCount}
          </span>
        </button>

        {/* 2. Vue dédiée Backlog */}
        <button
          id="sidebar-link-backlog"
          type="button"
          onClick={() => onViewChange('backlog')}
          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
            currentView === 'backlog'
              ? 'bg-[#5B7083] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
              : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Inbox className="h-4 w-4" />
            <span>Backlog</span>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              currentView === 'backlog'
                ? 'bg-white/20 text-white'
                : 'bg-[#F0EFEB] text-[#737873]'
            }`}
          >
            {backlogTasksCount}
          </span>
        </button>

        {/* 3. Rapport d'activité */}
        <button
          id="sidebar-link-report"
          type="button"
          onClick={() => onViewChange('report')}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
            currentView === 'report'
              ? 'bg-[#6B8E78] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
              : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Rapport & Suivi</span>
        </button>

        {/* 4. Administration si super-admin */}
        {isSuperAdmin && (
          <button
            id="sidebar-link-admin"
            type="button"
            onClick={() => onViewChange('admin')}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
              currentView === 'admin'
                ? 'bg-[#1A1D1A] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                : 'text-[#737873] bg-[#F0EFEB]/60 hover:bg-[#F0EFEB] border border-[#F0EFEB]'
            }`}
          >
            <Shield className="h-4 w-4 text-[#5B7083]" />
            <span>Administration</span>
          </button>
        )}
      </div>

      {/* Raccourcis rapides */}
      <div className="pt-2 border-t border-[#F0EFEB] space-y-2">
        <p className="px-2 text-[10px] font-medium text-[#737873]">
          Actions rapides
        </p>
        <button
          type="button"
          onClick={onOpenTaskModal}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#6B8E78]/10 text-[#6B8E78] border border-[#6B8E78]/20 px-3 py-2 text-xs font-medium hover:bg-[#6B8E78]/20 active:scale-[0.99] transition-all"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Nouvelle tâche</span>
        </button>
        <button
          type="button"
          onClick={onOpenProjectModal}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#F0EFEB] bg-white text-[#737873] px-3 py-2 text-xs font-medium hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
        >
          <FolderPlus className="h-3.5 w-3.5 text-[#5B7083]" />
          <span>Projets ({currentSpaceProjectsCount})</span>
        </button>
      </div>
    </aside>
  );
};
