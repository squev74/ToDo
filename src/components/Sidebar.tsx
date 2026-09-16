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
      className="hidden md:flex flex-col w-64 shrink-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-5"
    >
      {/* Espace actif info */}
      <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: activeSpace?.couleur || '#6366f1' }}
          />
          <span className="text-xs font-bold text-slate-800 truncate">
            {activeSpace?.nom || 'Espace de travail'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          {activeTasksCount} active{activeTasksCount > 1 ? 's' : ''} • {backlogTasksCount} backlog
        </p>
      </div>

      {/* Navigation principale */}
      <div className="space-y-1">
        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Vues de l'espace
        </p>

        {/* 1. Tableau des tâches actives */}
        <button
          id="sidebar-link-tasks"
          type="button"
          onClick={() => onViewChange('tasks')}
          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
            currentView === 'tasks'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ListTodo className="h-4 w-4" />
            <span>Tâches actives</span>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              currentView === 'tasks'
                ? 'bg-indigo-700/80 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {activeTasksCount}
          </span>
        </button>

        {/* 2. Nouveau : Vue dédiée Backlog */}
        <button
          id="sidebar-link-backlog"
          type="button"
          onClick={() => onViewChange('backlog')}
          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
            currentView === 'backlog'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Inbox className="h-4 w-4" />
            <span>Backlog</span>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              currentView === 'backlog'
                ? 'bg-slate-800 text-slate-200'
                : 'bg-slate-100 text-slate-600'
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
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
            currentView === 'report'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
              currentView === 'admin'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/50'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Administration</span>
          </button>
        )}
      </div>

      {/* Raccourcis rapides */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Actions rapides
        </p>
        <button
          type="button"
          onClick={onOpenTaskModal}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-3 py-2 text-xs font-semibold hover:bg-indigo-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Nouvelle tâche</span>
        </button>
        <button
          type="button"
          onClick={onOpenProjectModal}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          <FolderPlus className="h-3.5 w-3.5 text-indigo-600" />
          <span>Projets ({currentSpaceProjectsCount})</span>
        </button>
      </div>
    </aside>
  );
};
