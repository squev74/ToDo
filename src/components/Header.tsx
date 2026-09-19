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
  Sparkles,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Espace, Tache, Projet, ADMIN_EMAIL, ADMIN_UID } from '../types';
import { WorkspaceSelector } from './WorkspaceSelector';
import { useAuth } from '../context/AuthContext';

export interface HeaderProps {
  currentView: 'tasks' | 'backlog' | 'report' | 'timesheet' | 'admin' | 'knowledge';
  onViewChange: (view: 'tasks' | 'backlog' | 'report' | 'timesheet' | 'admin' | 'knowledge') => void;
  spaces: Espace[];
  activeSpaceId: string;
  tasks: Tache[];
  projects: Projet[];
  recurringCount?: number;
  onSelectSpace: (spaceId: string) => void;
  onOpenWorkspaceModal: (mode: 'list' | 'create') => void;
  onOpenProjectModal: () => void;
  onOpenRecurringModal?: () => void;
  onOpenActivityReportModal?: () => void;
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
  onOpenActivityReportModal,
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
      className="sticky top-0 z-30 border-b border-[#F0EFEB] bg-white/95 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300"
    >
      <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Titre, Logo & Sélecteur d'Espace de travail */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              id="header-logo"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6B8E78] text-white shadow-none shrink-0 cursor-pointer hover:bg-[#5d7c68] transition-colors duration-300"
              onClick={() => onViewChange('tasks')}
              title="Aller aux tâches"
            >
              <ListTodo className="h-4 w-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-medium tracking-tight text-[#1A1D1A]">
                  Gestionnaire de Tâches
                </h1>
                {isSuperAdmin && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#6B8E78]/10 text-[#6B8E78] border border-[#6B8E78]/20">
                    <Shield className="w-3 h-3" />
                    <span>Admin</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#737873] mt-0.5 font-light">
                <span>
                  {currentSpaceTasks.length} tâche{currentSpaceTasks.length > 1 ? 's' : ''} •{' '}
                  {currentSpaceProjects.length} projet{currentSpaceProjects.length > 1 ? 's' : ''}
                </span>
                <span className="text-[#D3CFC8]">•</span>
                {user?.isLocalFallback ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#966847] bg-[#C89B7B]/15 px-1.5 py-0.5 rounded-md border border-[#C89B7B]/30">
                    <Zap className="h-3 w-3 text-[#966847]" />
                    <span>Local</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B8E78]">
                    <Cloud className="h-3 w-3" />
                    <span>Cloud</span>
                  </span>
                )}
              </div>
            </div>

            {/* Sélecteur d'espace de travail */}
            <div className="ml-0 sm:ml-2 pl-0 sm:pl-3 sm:border-l sm:border-[#F0EFEB] flex items-center gap-1.5">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-all duration-300"
              title="Gérer les projets de l'espace"
            >
              <FolderPlus className="h-3.5 w-3.5 text-[#6B8E78]" />
              <span className="hidden sm:inline">Projets</span>
              <span className="rounded-full bg-[#F0EFEB] px-1.5 py-0.2 text-[10px] font-medium text-[#737873]">
                {currentSpaceProjects.length}
              </span>
            </button>

            {/* Bouton Tâches planifiées et récurrentes */}
            {onOpenRecurringModal && (
              <button
                id="open-recurring-modal-btn"
                type="button"
                onClick={onOpenRecurringModal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-all duration-300"
                title="Gérer les tâches récurrentes planifiées"
              >
                <CalendarClock className="h-3.5 w-3.5 text-[#5B7083]" />
                <span className="hidden sm:inline">Récurrentes</span>
                {recurringCount !== undefined && recurringCount > 0 && (
                  <span className="rounded-full bg-[#5B7083]/15 px-1.5 py-0.2 text-[10px] font-medium text-[#5B7083]">
                    {recurringCount}
                  </span>
                )}
              </button>
            )}

            {/* Bouton Rapport IA Gemini */}
            {onOpenActivityReportModal && (
              <button
                id="open-ai-report-modal-btn"
                type="button"
                onClick={onOpenActivityReportModal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#6B8E78]/30 bg-[#6B8E78]/10 px-2.5 py-1.5 text-xs font-medium text-[#6B8E78] hover:bg-[#6B8E78] hover:text-white transition-all duration-300"
                title="Générer un compte-rendu d'activité avec Gemini"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Rapport IA</span>
              </button>
            )}

            {/* Boutons Exporter / Importer JSON */}
            <div className="flex items-center rounded-xl border border-[#F0EFEB] bg-white p-0.5">
              <button
                id="export-json-button"
                type="button"
                onClick={onExportJson}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors duration-300"
                title="Exporter toutes les données (espaces, projets, tâches) au format JSON"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Exporter</span>
              </button>
              <div className="h-3 w-px bg-[#F0EFEB]" />
              <button
                id="import-json-button"
                type="button"
                onClick={onImportJson}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors duration-300"
                title="Importer un fichier JSON"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Importer</span>
              </button>
            </div>

            {/* Bouton Nouvelle Tâche Sauge */}
            <button
              id="create-task-primary-btn"
              type="button"
              onClick={onOpenTaskModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#5d7c68] active:scale-[0.99] transition-all duration-300 ease-out shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Nouvelle tâche</span>
            </button>

            {/* Compte Utilisateur & Déconnexion */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[#F0EFEB]">
              <div className="hidden lg:flex flex-col text-right">
                <span
                  className="text-[11px] font-medium text-[#1A1D1A] truncate max-w-[130px]"
                  title={user?.email || ''}
                >
                  {user?.email}
                </span>
                <span className="text-[10px] text-[#737873]">
                  {user?.isLocalFallback ? 'Session Démo' : isSuperAdmin ? 'Admin' : 'Membre'}
                </span>
              </div>

              <button
                id="logout-btn"
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1 rounded-xl border border-[#F0EFEB] bg-white px-2 py-1.5 text-xs font-medium text-[#737873] hover:bg-rose-50/80 hover:text-rose-600 hover:border-rose-100 transition-colors duration-300"
                title="Se déconnecter"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Menu de navigation principal par Onglets */}
        <div id="main-navigation-tabs" className="mt-3 flex items-center border-t border-[#F0EFEB] pt-2.5">
          <nav className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Onglet : Liste des tâches actives */}
            <button
              id="tab-view-tasks"
              type="button"
              onClick={() => onViewChange('tasks')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                currentView === 'tasks'
                  ? 'bg-[#6B8E78] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                  : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
              }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              <span>Tâches actives</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-medium ${
                  currentView === 'tasks'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F0EFEB] text-[#737873]'
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
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                currentView === 'backlog'
                  ? 'bg-[#5B7083] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                  : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Backlog</span>
              {backlogTasksCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-medium ${
                    currentView === 'backlog'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F0EFEB] text-[#737873]'
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
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                currentView === 'report'
                  ? 'bg-[#6B8E78] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                  : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Rapport d&apos;Activité & Suivi</span>
            </button>

            {/* Onglet : Feuille de temps */}
            <button
              id="tab-view-timesheet"
              type="button"
              onClick={() => onViewChange('timesheet')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                currentView === 'timesheet'
                  ? 'bg-indigo-600 text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                  : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Feuille de Temps</span>
            </button>

            {/* Onglet : Base de Connaissances */}
            <button
              id="tab-view-knowledge"
              type="button"
              onClick={() => onViewChange('knowledge')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                currentView === 'knowledge'
                  ? 'bg-[#6B8E78] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                  : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Base de Connaissance</span>
            </button>

            {/* Onglet : Administration - Visible UNIQUEMENT pour 'squeva11@gmail.com' ou role === 'admin' */}
            {isSuperAdmin && (
              <button
                id="tab-view-admin"
                type="button"
                onClick={() => onViewChange('admin')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                  currentView === 'admin'
                    ? 'bg-[#1A1D1A] text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                    : 'text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A]'
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
