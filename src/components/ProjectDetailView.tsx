import React, { useState, useMemo } from 'react';
import { 
  X, 
  Folder, 
  Calendar, 
  Layers, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  ChevronRight, 
  KanbanSquare,
  ArrowLeft
} from 'lucide-react';
import { Projet, Tache, ProjectDeliverable, TeamMember, MonthlyAllocation, RaidItem } from '../types';
import { ProjectDeliverablesSection } from './ProjectDeliverablesSection';
import { ProjectMonthlyCapacity } from './ProjectMonthlyCapacity';
import { ProjectRaidLogSection } from './ProjectRaidLogSection';
import { ProjectHealthCheckBadge } from './ProjectHealthCheckBadge';

interface ProjectDetailViewProps {
  isOpen: boolean;
  project: Projet | null;
  tasks: Tache[];
  onClose: () => void;
  onUpdateProject: (
    id: string, 
    nom: string, 
    couleur: string, 
    jiraKey?: string, 
    deliverables?: ProjectDeliverable[],
    teamMembers?: TeamMember[],
    allocations?: MonthlyAllocation[],
    raidLog?: RaidItem[],
    hasCapacityPlanning?: boolean,
    requiresTimesheet?: boolean
  ) => void;
}

type TabType = 'overview' | 'deliverables' | 'capacity' | 'raid';

const STATUS_LABELS: Record<string, string> = {
  Backlog: 'Backlog',
  Open: 'À ouvrir',
  'In Progress': 'En cours',
  Blocked: 'Bloqué',
  Done: 'Terminé',
};

const STATUS_COLOR_CLASSES: Record<string, string> = {
  Backlog: 'text-slate-500 bg-slate-100 border-slate-200',
  Open: 'text-[#5B7083] bg-[#5B7083]/10 border-[#5B7083]/20',
  'In Progress': 'text-amber-700 bg-amber-50 border-amber-200',
  Blocked: 'text-rose-700 bg-rose-50 border-rose-200',
  Done: 'text-[#5D7C68] bg-[#6B8E78]/15 border-[#6B8E78]/30',
};

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  isOpen,
  project,
  tasks,
  onClose,
  onUpdateProject,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Filtrer les tâches liées à ce projet
  const projectTasks = useMemo(() => {
    if (!project) return [];
    return tasks.filter((t) => t.projetId === project.id);
  }, [tasks, project?.id]);

  // Statistiques des tâches
  const taskStats = useMemo(() => {
    const total = projectTasks.length;
    const completed = projectTasks.filter((t) => t.statut === 'Done').length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const blocked = projectTasks.filter((t) => t.statut === 'Blocked').length;
    const active = total - completed - blocked;

    return { total, completed, progressPercent, blocked, active };
  }, [projectTasks]);

  // Grouper les tâches par statut pour l'onglet Vue d'ensemble
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Tache[]> = {
      'In Progress': [],
      Blocked: [],
      Open: [],
      Backlog: [],
      Done: [],
    };
    projectTasks.forEach((t) => {
      const statusKey = t.statut === 'backlog' ? 'Backlog' : t.statut;
      if (groups[statusKey]) {
        groups[statusKey].push(t);
      } else {
        groups[statusKey] = [t];
      }
    });
    return groups;
  }, [projectTasks]);

  if (!isOpen || !project) return null;

  const handleUpdateDeliverables = (updatedDeliverables: ProjectDeliverable[]) => {
    onUpdateProject(
      project.id,
      project.nom,
      project.couleur,
      project.jiraKey,
      updatedDeliverables,
      project.teamMembers,
      project.allocations,
      project.raidLog,
      project.hasCapacityPlanning,
      project.requiresTimesheet
    );
  };

  const handleUpdateCapacity = (updatedMembers: TeamMember[], updatedAllocations: MonthlyAllocation[]) => {
    onUpdateProject(
      project.id,
      project.nom,
      project.couleur,
      project.jiraKey,
      project.deliverables,
      updatedMembers,
      updatedAllocations,
      project.raidLog,
      project.hasCapacityPlanning,
      project.requiresTimesheet
    );
  };

  const handleUpdateRaid = (updatedRaidLog: RaidItem[]) => {
    onUpdateProject(
      project.id,
      project.nom,
      project.couleur,
      project.jiraKey,
      project.deliverables,
      project.teamMembers,
      project.allocations,
      updatedRaidLog,
      project.hasCapacityPlanning,
      project.requiresTimesheet
    );
  };

  const formattedDate = new Date(project.dateCreation).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      id="project-detail-fullscreen-overlay"
      className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-200"
    >
      {/* 1. EN-TÊTE SUPÉRIEURE (BREADCRUMB & TITRE RAPIDE) */}
      <div className="bg-white border-b border-[#F0EFEB] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs md:text-sm flex-wrap">
          <button
            id="btn-back-to-projects"
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 font-semibold text-[#737873] hover:text-[#1A1D1A] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour aux projets</span>
          </button>
          
          <span className="text-[#E2DFD8] font-light">/</span>
          
          <div className="flex items-center gap-2 flex-wrap">
            {project.jiraKey && (
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                {project.jiraKey}
              </span>
            )}
            {project.jiraKey && <span className="text-[#E2DFD8]">-</span>}
            <span className="font-bold text-[#1A1D1A]">{project.nom}</span>
            
            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              En cours
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F9F8F6] hover:text-[#1A1D1A] transition-colors shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 2. BARRE DES ONGLETS (CONFORME À LA MAQUETTE DEMANDÉE) */}
      <div className="bg-white border-b border-[#F0EFEB] px-6 shrink-0">
        <div className="flex pt-3 max-w-7xl mx-auto w-full">
          <button
            id="tab-btn-tasks"
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-[#6B8E78] text-[#5D7C68]'
                : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
            }`}
          >
            <span>📋 Tâches</span>
          </button>
          
          <button
            id="tab-btn-deliverables"
            type="button"
            onClick={() => setActiveTab('deliverables')}
            className={`ml-8 pb-3 px-2 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5 ${
              activeTab === 'deliverables'
                ? 'border-[#6B8E78] text-[#5D7C68]'
                : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
            }`}
          >
            <span>🔗 Livrables</span>
            {project.deliverables && project.deliverables.length > 0 && (
              <span className="inline-flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-[#6B8E78]/10 text-[#5D7C68] text-[9px] font-bold">
                {project.deliverables.length}
              </span>
            )}
          </button>
          
          <button
            id="tab-btn-capacity"
            type="button"
            onClick={() => setActiveTab('capacity')}
            className={`ml-8 pb-3 px-2 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5 ${
              activeTab === 'capacity'
                ? 'border-[#6B8E78] text-[#5D7C68]'
                : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
            }`}
          >
            <span>📊 Capacitaire</span>
            {project.teamMembers && project.teamMembers.length > 0 && (
              <span className="inline-flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-[#6B8E78]/10 text-[#5D7C68] text-[9px] font-bold">
                {project.teamMembers.length}
              </span>
            )}
          </button>
          
          <button
            id="tab-btn-raid"
            type="button"
            onClick={() => setActiveTab('raid')}
            className={`ml-8 pb-3 px-2 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5 ${
              activeTab === 'raid'
                ? 'border-[#6B8E78] text-[#5D7C68]'
                : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
            }`}
          >
            <span>⚠️ RAID</span>
            {project.raidLog && project.raidLog.filter(item => item.status === 'open').length > 0 && (
              <span className="inline-flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-bold">
                {project.raidLog.filter(item => item.status === 'open').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 3. CONTENU ENTIÈREMENT DÉPLOYÉ SUR LA LARGEUR DE L'ÉCRAN */}
      <div className="flex-1 overflow-y-auto bg-[#FAF9F6] w-full">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Météo et Santé PMO */}
              <ProjectHealthCheckBadge
                projectId={project.id}
                projects={[project]}
                tasks={tasks}
              />

              {/* Options de gouvernance PMO */}
              <div className="rounded-2xl border border-[#F0EFEB] bg-white p-4 space-y-4 shadow-xs">
                <div className="flex items-center gap-1.5 pb-2 border-b border-[#F0EFEB]">
                  <Folder className="h-4 w-4 text-[#5D7C68]" />
                  <h3 className="text-xs font-bold text-[#1A1D1A]">Options de gouvernance PMO</h3>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={project.hasCapacityPlanning !== false}
                      onChange={(e) => {
                        onUpdateProject(
                          project.id,
                          project.nom,
                          project.couleur,
                          project.jiraKey,
                          project.deliverables,
                          project.teamMembers,
                          project.allocations,
                          project.raidLog,
                          e.target.checked,
                          project.requiresTimesheet !== false
                        );
                      }}
                      className="mt-0.5 rounded border-[#EAE8E2] text-[#6B8E78] focus:ring-[#6B8E78] h-4 w-4 accent-[#6B8E78]"
                    />
                    <div>
                      <span className="block text-xs font-semibold text-[#1A1D1A] group-hover:text-[#5D7C68] transition-colors">
                        Activer le suivi du plan capacitaire pour ce projet
                      </span>
                      <span className="block text-[10.5px] text-[#737873] font-light mt-0.5 leading-relaxed">
                        Si désactivé, ce projet ne fera l'objet d'aucune alerte capacitaire vide ou incomplète pour le mois en cours ou à venir.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={project.requiresTimesheet !== false}
                      onChange={(e) => {
                        onUpdateProject(
                          project.id,
                          project.nom,
                          project.couleur,
                          project.jiraKey,
                          project.deliverables,
                          project.teamMembers,
                          project.allocations,
                          project.raidLog,
                          project.hasCapacityPlanning !== false,
                          e.target.checked
                        );
                      }}
                      className="mt-0.5 rounded border-[#EAE8E2] text-[#6B8E78] focus:ring-[#6B8E78] h-4 w-4 accent-[#6B8E78]"
                    />
                    <div>
                      <span className="block text-xs font-semibold text-[#1A1D1A] group-hover:text-[#5D7C68] transition-colors">
                        Exiger la saisie des feuilles de temps (Timesheet) pour ce projet
                      </span>
                      <span className="block text-[10.5px] text-[#737873] font-light mt-0.5 leading-relaxed">
                        Si désactivé, aucune alerte de temps manquant ne sera levée si ce projet est le seul actif dans l'espace de travail.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Carte de Progression */}
              <div className="rounded-2xl border border-[#F0EFEB] bg-white p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#1A1D1A] flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-[#5D7C68]" />
                    Progression des tâches
                  </h3>
                  <span className="text-xs font-bold text-[#5D7C68]">{taskStats.progressPercent}%</span>
                </div>
                
                {/* Barre de progression Japandi */}
                <div className="h-2 w-full rounded-full bg-[#FAF9F6] border border-[#F0EFEB] overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[#6B8E78] transition-all duration-500" 
                    style={{ width: `${taskStats.progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                  <div>
                    <span className="block text-[10px] text-[#737873]">Total</span>
                    <span className="text-xs font-medium text-[#1A1D1A]">{taskStats.total}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#737873]">Actives</span>
                    <span className="text-xs font-medium text-blue-600">{taskStats.active}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#737873]">Bloquées</span>
                    <span className="text-xs font-medium text-rose-600">{taskStats.blocked}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#737873]">Terminées</span>
                    <span className="text-xs font-medium text-[#5D7C68]">{taskStats.completed}</span>
                  </div>
                </div>
              </div>

              {/* Liste des Tâches par statut */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-[#1A1D1A] flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#737873]" />
                  Répartition des tâches ({projectTasks.length})
                </h3>

                {projectTasks.length === 0 ? (
                  <div className="text-center py-8 rounded-2xl border border-dashed border-[#F0EFEB] bg-[#FAF9F6]/50">
                    <KanbanSquare className="mx-auto h-8 w-8 text-[#737873]/40 stroke-[1.5] mb-1.5" />
                    <p className="text-xs text-[#737873]">Aucune tâche associée à ce projet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(tasksByStatus).map(([status, items]) => {
                      if (items.length === 0) return null;
                      return (
                        <div key={status} className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#737873]">
                              {STATUS_LABELS[status]}
                            </span>
                            <span className="text-[10px] font-bold text-[#737873] bg-[#F9F8F6] px-1.5 py-0.5 rounded-full border border-[#F0EFEB]">
                              {items.length}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {items.map((task) => (
                              <div 
                                key={task.id}
                                className="flex items-center justify-between rounded-xl border border-[#F0EFEB] bg-white p-3 hover:border-[#E2DFD8] transition-colors group"
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <p className="text-xs font-medium text-[#1A1D1A] truncate group-hover:text-[#5D7C68] transition-colors">
                                    {task.titre}
                                  </p>
                                  {task.dateEcheance && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-[#737873] mt-0.5">
                                      <Clock className="h-3 w-3" />
                                      Échéance : {new Date(task.dateEcheance).toLocaleDateString('fr-FR')}
                                    </span>
                                  )}
                                </div>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium shrink-0 ${STATUS_COLOR_CLASSES[status]}`}>
                                  {STATUS_LABELS[status]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'deliverables' && (
            <ProjectDeliverablesSection 
              project={project} 
              onUpdateDeliverables={handleUpdateDeliverables} 
            />
          )}

          {activeTab === 'capacity' && (
            <ProjectMonthlyCapacity 
              project={project}
              onUpdateProjectCapacity={handleUpdateCapacity}
            />
          )}

          {activeTab === 'raid' && (
            <ProjectRaidLogSection 
              project={project}
              onUpdateRaidLog={handleUpdateRaid}
            />
          )}
        </div>
      </div>

      {/* PIED DE PAGE */}
      <div className="p-4 border-t border-[#F0EFEB] bg-white flex justify-end shrink-0">
        <button
          id="btn-close-project-detail"
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[#EAE8E2] bg-white px-4 py-2 text-xs font-semibold text-[#737873] hover:text-[#1A1D1A] transition-colors"
        >
          Fermer la fiche
        </button>
      </div>
    </div>
  );
};
