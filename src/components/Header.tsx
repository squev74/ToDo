import React from 'react';
import {
  ListTodo,
  Inbox,
  CalendarCheck,
  Shield,
  FolderPlus,
  CalendarClock,
  Download,
  Upload,
  Plus,
  LogOut,
  Zap,
  Cloud,
} from 'lucide-react';
import { Espace, Tache, Projet, ADMIN_EMAIL, ADMIN_UID } from '../types';
import { WorkspaceSelector } from './WorkspaceSelector';
import { useAuth } from '../context/AuthContext';

export interface HeaderProps {
  currentView: 'tasks' | 'backlog' | 'report' | 'admin';
  onViewChange: (view: 'tasks' | 'backlog' | 'report' | 'admin') => void;
  spaces: Espace[];
  activeSpaceId: string;
  tasks: Tache[];
  projects: Projet[];
  recurringCount?: number;
  onSelectSpace: (spaceId: string) => void;
  onOpenWorkspaceModal: (mode: 'list' | 'create') => void;
  onOpenProjectModal: () => void;
  onOpenRecurringModal?: () => void;
  onOpenTaskModal: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  spaces,
  activeSpaceId,
  tasks,
  projects,
  recurringCount,
  onSelectSpace,
  onOpenWorkspaceModal,
  onOpenProjectModal,
  onOpenRecurringModal,
  onOpenTaskModal,
  onExportJson,
  onImportJson,
  onLogout,
}) => {
  const { user, userProfile, isAdmin } = useAuth();

  // Filtrer les éléments de l'espace actif pour les statistiques d'en-tête
  const currentSpaceTasks = tasks.filter((t) => t.spaceId === activeSpaceId);
  const activeTasksCount = currentSpaceTasks.filter(
    (t) => (t.statut as string)?.toLowerCase() !== 'backlog'
  ).length;
  const backlogTasksCount = currentSpaceTasks.filter(
    (t) => (t.statut as string)?.toLowerCase() === 'backlog'
  ).length;
  const currentSpaceProjects = projects.filter((p) => p.spaceId === activeSpaceId);

  // Visibilité exclusive de l'administration pour 'squeva11@gmail.com' (UID: G1Dm03dHRvPelWT8c2ydqXLC1Y93) ou role === 'admin'
  const isSuperAdmin = Boolean(
    isAdmin ||
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    user?.uid === ADMIN_UID ||
    userProfile?.role === 'admin' ||
    userProfile?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
    userProfile?.uid === ADMIN_UID
  );

  return (
    <header
      id="main-header"
      className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Titre, Logo & Sélecteur d'Espace de travail */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              id="header-logo"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 cursor-pointer"
              onClick={() => onViewChange('tasks')}
              title="Aller aux tâches"
            >
              <ListTodo className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Gestionnaire de Tâches
                </h1>
                {isSuperAdmin && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Shield className="w-3 h-3" />
                    <span>Admin</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>
                  {currentSpaceTasks.length} tâche{currentSpaceTasks.length > 1 ? 's' : ''} •{' '}
                  {currentSpaceProjects.length} projet{currentSpaceProjects.length > 1 ? 's' : ''}
                </span>
                <span className="text-slate-300">•</span>
                {user?.isLocalFallback ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>Local</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <Cloud className="h-3 w-3" />
                    <span>Cloud</span>
                  </span>
                )}
              </div>
            </div>

            {/* Sélecteur d'espace de travail */}
            <div className="ml-0 sm:ml-2 pl-0 sm:pl-3 sm:border-l sm:border-slate-200 flex items-center gap-1.5">
              <WorkspaceSelector
                spaces={spaces}
                activeSpaceId={activeSpaceId}
                tasks={tasks}
                onSelectSpace={onSelectSpace}
                onOpenManageModal={() => onOpenWorkspaceModal('list')}
                onOpenCreateModal={() => onOpenWorkspaceModal('create')}
              />
            </div>
          </div>

          {/* Barre d'actions supérieures */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bouton Projets de l'espace actif */}
            <button
              id="open-projects-manager-btn"
              type="button"
              onClick={onOpenProjectModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
              title="Gérer les projets de l'espace"
            >
              <FolderPlus className="h-4 w-4 text-indigo-600" />
              <span className="hidden sm:inline">Projets</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[11px] font-bold text-slate-600">
                {currentSpaceProjects.length}
              </span>
            </button>

            {/* Bouton Tâches planifiées et récurrentes (inspiration Outlook) */}
            {onOpenRecurringModal && (
              <button
                id="open-recurring-modal-btn"
                type="button"
                onClick={onOpenRecurringModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-900 hover:border-indigo-200 transition-colors shadow-2xs"
                title="Gérer les tâches récurrentes planifiées (inspiration Outlook)"
              >
                <CalendarClock className="h-4 w-4 text-indigo-600" />
                <span className="hidden sm:inline">Récurrences</span>
                {recurringCount !== undefined && recurringCount > 0 && (
                  <span className="rounded-full bg-indigo-50 px-1.5 py-0.2 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                    {recurringCount}
                  </span>
                )}
              </button>
            )}

            {/* Boutons Exporter / Importer JSON */}
            <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
              <button
                id="export-json-button"
                type="button"
                onClick={onExportJson}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Exporter toutes les données (espaces, projets, tâches) au format JSON"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Exporter</span>
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <button
                id="import-json-button"
                type="button"
                onClick={onImportJson}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Importer un fichier JSON"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Importer</span>
              </button>
            </div>

            {/* Bouton Nouvelle Tâche */}
            <button
              id="create-task-primary-btn"
              type="button"
              onClick={onOpenTaskModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nouvelle tâche</span>
            </button>

            {/* Compte Utilisateur & Déconnexion */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
              <div className="hidden lg:flex flex-col text-right">
                <span
                  className="text-[11px] font-semibold text-slate-700 truncate max-w-[140px]"
                  title={user?.email || ''}
                >
                  {user?.email}
                </span>
                <span className="text-[10px] text-slate-400">
                  {user?.isLocalFallback ? 'Session Démo' : isSuperAdmin ? 'Administrateur' : 'Utilisateur'}
                </span>
              </div>

              <button
                id="logout-btn"
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors shadow-2xs"
                title="Se déconnecter"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>

        {/* Menu de navigation principal par Onglets */}
        <div id="main-navigation-tabs" className="mt-3 flex items-center border-t border-slate-100 pt-2.5">
          <nav className="flex items-center gap-2">
            {/* Onglet : Liste des tâches actives */}
            <button
              id="tab-view-tasks"
              type="button"
              onClick={() => onViewChange('tasks')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentView === 'tasks'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              <span>Tâches actives</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  currentView === 'tasks'
                    ? 'bg-indigo-200/80 text-indigo-900'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {activeTasksCount}
              </span>
            </button>

            {/* Onglet : Backlog dédié */}
            <button
              id="tab-view-backlog"
              type="button"
              onClick={() => onViewChange('backlog')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentView === 'backlog'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Backlog</span>
              {backlogTasksCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    currentView === 'backlog'
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {backlogTasksCount}
                </span>
              )}
            </button>

            {/* Onglet : Rapport d'Activité & Suivi */}
            <button
              id="tab-view-report"
              type="button"
              onClick={() => onViewChange('report')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentView === 'report'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Rapport d'Activité & Suivi</span>
            </button>

            {/* Onglet : Administration - Visible UNIQUEMENT pour 'squeva11@gmail.com' ou role === 'admin' */}
            {isSuperAdmin && (
              <button
                id="tab-view-admin"
                type="button"
                onClick={() => onViewChange('admin')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  currentView === 'admin'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/60'
                }`}
                title="Panneau d'administration des utilisateurs"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Administration</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
