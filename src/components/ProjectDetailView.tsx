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
  ArrowLeft,
  Flag,
  Map,
  Plus,
  Trash2,
  CheckCircle2,
  Check,
  Pencil
} from 'lucide-react';
import { Projet, Tache, ProjectDeliverable, TeamMember, MonthlyAllocation, RaidItem, Milestone, ProjectPhase } from '../types';
import { calculateProjectMetrics } from '../utils/projectMetrics';
import { ProjectDeliverablesSection } from './ProjectDeliverablesSection';
import { ProjectMonthlyCapacity } from './ProjectMonthlyCapacity';
import { ProjectRaidLogSection } from './ProjectRaidLogSection';
import { ProjectHealthCheckBadge } from './ProjectHealthCheckBadge';

interface ProjectDetailViewProps {
  isOpen: boolean;
  project: Projet | null;
  tasks: Tache[];
  milestones?: Milestone[];
  phases?: ProjectPhase[];
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
    requiresTimesheet?: boolean,
    startDate?: string,
    endDate?: string
  ) => void;
  onSaveMilestone: (milestone: Milestone) => void;
  onDeleteMilestone: (milestoneId: string) => void;
  onSavePhase: (phase: ProjectPhase) => void;
  onDeletePhase: (phaseId: string) => void;
  onUpdateTask?: (task: Tache) => void;
}

type TabType = 'overview' | 'deliverables' | 'capacity' | 'raid' | 'roadmap';

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
  milestones = [],
  phases = [],
  onClose,
  onUpdateProject,
  onSaveMilestone,
  onDeleteMilestone,
  onSavePhase,
  onDeletePhase,
  onUpdateTask,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [roadmapSubTab, setRoadmapSubTab] = useState<'milestones' | 'phases' | 'tasks'>('milestones');

  // Formulaire d'ajout de jalon (Milestone)
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mError, setMError] = useState('');

  // Formulaire d'ajout de phase de projet
  const [pName, setPName] = useState('');
  const [pStart, setPStart] = useState('');
  const [pEnd, setPEnd] = useState('');
  const [pColor, setPColor] = useState('#D9E4DD'); // Pastel Japandi par défaut
  const [pEpicKey, setPEpicKey] = useState('');
  const [pEpicUrl, setPEpicUrl] = useState('');
  const [pError, setPError] = useState('');

  // Edition de jalon (Milestone)
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMTitle, setEditMTitle] = useState('');
  const [editMDate, setEditMDate] = useState('');
  const [editMDesc, setEditMDesc] = useState('');

  // Edition de phase de projet
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editPName, setEditPName] = useState('');
  const [editPStart, setEditPStart] = useState('');
  const [editPEnd, setEditPEnd] = useState('');
  const [editPColor, setEditPColor] = useState('#D9E4DD');
  const [editPEpicKey, setEditPEpicKey] = useState('');
  const [editPEpicUrl, setEditPEpicUrl] = useState('');

  // Filtrer les tâches liées à ce projet
  const projectTasks = useMemo(() => {
    if (!project) return [];
    return tasks.filter((t) => t.projetId === project.id);
  }, [tasks, project?.id]);

  // Filtrer les jalons liés à ce projet
  const projectMilestones = useMemo(() => {
    if (!project) return [];
    return milestones.filter((m) => m.projectId === project.id);
  }, [milestones, project?.id]);

  // Filtrer les phases liées à ce projet
  const projectPhases = useMemo(() => {
    if (!project) return [];
    return phases.filter((p) => p.projectId === project.id);
  }, [phases, project?.id]);

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

          <button
            id="tab-btn-roadmap"
            type="button"
            onClick={() => setActiveTab('roadmap')}
            className={`ml-8 pb-3 px-2 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5 ${
              activeTab === 'roadmap'
                ? 'border-[#6B8E78] text-[#5D7C68]'
                : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
            }`}
          >
            <span>🗺️ Roadmap</span>
            {projectMilestones.length > 0 && (
              <span className="inline-flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-[#6B8E78]/10 text-[#5D7C68] border border-[#6B8E78]/20 text-[9px] font-bold">
                {projectMilestones.length}
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

              {/* Période de validité du projet */}
              <div className="rounded-2xl border border-[#F0EFEB] bg-white p-4 space-y-4 shadow-xs">
                <div className="flex items-center gap-1.5 pb-2 border-b border-[#F0EFEB]">
                  <Calendar className="h-4 w-4 text-[#5D7C68]" />
                  <h3 className="text-xs font-bold text-[#1A1D1A]">Dates de bornage du projet</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="project-start-date-input" className="block text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                      Date de début
                    </label>
                    <input
                      id="project-start-date-input"
                      type="date"
                      value={project.startDate || ''}
                      onChange={(e) => {
                        const val = e.target.value || undefined;
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
                          project.requiresTimesheet !== false,
                          val,
                          project.endDate
                        );
                      }}
                      className="w-full rounded-xl border border-[#F0EFEB] bg-[#FAF9F6] px-3.5 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="project-end-date-input" className="block text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                      Date de fin
                    </label>
                    <input
                      id="project-end-date-input"
                      type="date"
                      value={project.endDate || ''}
                      onChange={(e) => {
                        const val = e.target.value || undefined;
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
                          project.requiresTimesheet !== false,
                          project.startDate,
                          val
                        );
                      }}
                      className="w-full rounded-xl border border-[#F0EFEB] bg-[#FAF9F6] px-3.5 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-all"
                    />
                  </div>
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

          {activeTab === 'roadmap' && (() => {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            // Rassemblement des dates (y compris dates de phases)
            const dateTimes: number[] = [today.getTime()];
            projectTasks.forEach((t) => {
              const dStr = t.createdAt?.split('T')[0];
              if (dStr) dateTimes.push(new Date(dStr).getTime());
              if (t.dateEcheance) dateTimes.push(new Date(t.dateEcheance).getTime());
            });
            project.deliverables?.forEach((d) => {
              if (d.targetDate) dateTimes.push(new Date(d.targetDate).getTime());
            });
            projectMilestones.forEach((m) => {
              if (m.date) dateTimes.push(new Date(m.date).getTime());
            });
            projectPhases.forEach((p) => {
              if (p.startDate) dateTimes.push(new Date(p.startDate).getTime());
              if (p.endDate) dateTimes.push(new Date(p.endDate).getTime());
            });

            const minT = Math.min(...dateTimes) - 5 * 24 * 60 * 60 * 1000; // Marge 5 jours avant
            const maxT = Math.max(...dateTimes) + 10 * 24 * 60 * 60 * 1000; // Marge 10 jours après
            const span = maxT - minT;

            const getXCoordinate = (dateStr: string) => {
              if (!dateStr) return 180;
              const time = new Date(dateStr).getTime();
              if (isNaN(time)) return 180;
              const pct = (time - minT) / span;
              return 180 + pct * 740; // Largeur de 180px à 920px (largeur utile = 740px)
            };

            const todayX = getXCoordinate(todayStr);

            // Fusionner tâches et livrables pour l'affichage chronologique
            const timelineRows: { id: string; label: string; start: string; end: string; type: 'task' | 'deliverable'; color: string; hasAlert?: boolean; alertMsg?: string }[] = [];
            projectTasks.slice(0, 10).forEach((t) => {
              const start = t.createdAt?.split('T')[0] || todayStr;
              const end = t.dateEcheance || todayStr;
              
              let hasAlert = false;
              let alertMsg = "";
              if (t.phaseId) {
                const ph = projectPhases.find((p) => p.id === t.phaseId);
                if (ph) {
                  if (t.dateEcheance) {
                    if (t.dateEcheance < ph.startDate || t.dateEcheance > ph.endDate) {
                      hasAlert = true;
                      alertMsg = `Tâche hors phase « ${ph.name} »: Échéance ${t.dateEcheance} est hors limites [${ph.startDate} au ${ph.endDate}]`;
                    }
                  }
                }
              }

              timelineRows.push({
                id: t.id,
                label: t.titre,
                start,
                end,
                type: 'task',
                color: t.statut === 'Done' ? '#6B8E78' : t.statut === 'Blocked' ? '#F43F5E' : '#C89B7B',
                hasAlert,
                alertMsg,
              });
            });

            (project.deliverables || []).slice(0, 5).forEach((d) => {
              const date = d.targetDate || todayStr;
              timelineRows.push({
                id: d.id,
                label: `[Livrable] ${d.title}`,
                start: date,
                end: date,
                type: 'deliverable',
                color: d.status === 'delivered' ? '#10B981' : '#6366F1',
              });
            });

            const rowHeight = 32;
            const headerHeight = 65; // marge un peu plus grande pour les titres de phases
            const calculatedSvgHeight = headerHeight + (timelineRows.length * rowHeight) + 40;

            const handleAddMilestoneSubmit = (e: React.FormEvent) => {
              e.preventDefault();
              setMError('');
              if (!mTitle.trim()) {
                setMError('Le titre du jalon est requis.');
                return;
              }
              if (!mDate) {
                setMError('La date du jalon est requise.');
                return;
              }

              onSaveMilestone({
                id: `milestone-${Date.now()}`,
                spaceId: project.spaceId,
                projectId: project.id,
                title: mTitle.trim(),
                date: mDate,
                description: mDesc.trim() || undefined,
                completed: false,
              });

              setMTitle('');
              setMDate('');
              setMDesc('');
            };

            const toggleMilestoneCompletion = (m: Milestone) => {
              onSaveMilestone({
                ...m,
                completed: !m.completed,
              });
            };

            const metrics = project ? calculateProjectMetrics(project, projectTasks) : { timeProgressPercent: 0, tasksProgressPercent: 0, isOverdue: false };

            return (
              <div className="space-y-6">
                {/* 1. CHRONOGRAMME SVG AVEC JALONS OVERLAY */}
                <div className="rounded-2xl border border-[#F0EFEB] bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EFEB]">
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-[#6B8E78]" />
                      <h4 className="text-xs font-bold text-[#1A1D1A]">Roadmap & Chronogramme SVG</h4>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#737873]">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                        <span>Aujourd&apos;hui</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-[#C89B7B]" />
                        <span>En cours</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-[#6B8E78]" />
                        <span>Terminé / Jalon acquis</span>
                      </div>
                    </div>
                  </div>

                  {project && project.startDate && project.endDate && (
                    <div className="bg-[#FAF9F6] border border-[#F0EFEB] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                      <div className="space-y-1.5 flex-1 max-w-md">
                        <div className="flex items-center justify-between font-semibold text-[#1A1D1A]">
                          <span>Temps Écoulé</span>
                          <span>{metrics.timeProgressPercent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white border border-[#F0EFEB] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#6B8E78] transition-all duration-300"
                            style={{ width: `${metrics.timeProgressPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#F0EFEB] px-2.5 py-1 font-semibold text-[#5D7C68] shadow-2xs">
                          Temps : {metrics.timeProgressPercent}% | Tâches Réalisées : {metrics.tasksProgressPercent}%
                        </span>
                        {metrics.isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-100 border border-rose-200 px-2.5 py-1 font-bold text-rose-700 animate-pulse">
                            ⚠️ Échéance dépassée
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Zone de l'image SVG interactive */}
                  <div className="overflow-x-auto custom-scrollbar">
                    <svg
                      viewBox={`0 0 950 ${calculatedSvgHeight}`}
                      className="w-full min-w-[850px] h-auto overflow-visible select-none font-sans"
                    >
                      {/* Lignes de repères de temps vertical */}
                      <line x1={180} y1={headerHeight} x2={180} y2={calculatedSvgHeight - 20} stroke="#F0EFEB" />
                      <line x1={920} y1={headerHeight} x2={920} y2={calculatedSvgHeight - 20} stroke="#F0EFEB" />

                      {/* Bandes / Conteneurs visuels des Phases de Projet (Japandi) */}
                      {projectPhases.map((phase) => {
                        const pxStart = getXCoordinate(phase.startDate);
                        const pxEnd = getXCoordinate(phase.endDate);
                        const width = pxEnd - pxStart;
                        if (width <= 0) return null;
                        
                        const phaseColor = phase.color || '#D9E4DD';
                        return (
                          <g key={phase.id}>
                            <rect
                              x={pxStart}
                              y={headerHeight - 25}
                              width={width}
                              height={calculatedSvgHeight - headerHeight + 5}
                              fill={phaseColor}
                              fillOpacity={0.15}
                              stroke={phaseColor}
                              strokeWidth={1}
                              strokeDasharray="4 4"
                              rx={4}
                            />
                            {/* Onglet titre au sommet du container */}
                            <g transform={`translate(${pxStart + 4}, ${headerHeight - 20})`}>
                              <rect
                                x={0}
                                y={-10}
                                width={Math.min(width - 8, 170)}
                                height={14}
                                rx={3}
                                fill={phaseColor}
                              />
                              <text
                                x={4}
                                y={0}
                                fontSize="8"
                                fontWeight="bold"
                                fill="#1A1D1A"
                                className="truncate font-sans uppercase tracking-wider"
                              >
                                {phase.name.length > 22 ? `${phase.name.substring(0, 20)}...` : phase.name}
                              </text>
                            </g>

                            {/* JIRA Epic Key hyperlink */}
                            {phase.jiraEpicKey && (
                              <g transform={`translate(${pxStart + 6}, ${headerHeight - 4})`}>
                                <text
                                  x={0}
                                  y={0}
                                  fontSize="7.5"
                                  fontWeight="600"
                                  fill="#4F46E5"
                                  className="cursor-pointer underline font-mono"
                                  onClick={() => {
                                    if (phase.jiraEpicUrl) {
                                      window.open(phase.jiraEpicUrl, '_blank');
                                    } else {
                                      window.open(`https://jira.company.com/browse/${phase.jiraEpicKey}`, '_blank');
                                    }
                                  }}
                                >
                                  ⚡ {phase.jiraEpicKey}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Repère Aujourd'hui */}
                      {todayX >= 180 && todayX <= 920 && (
                        <g>
                          <line
                            x1={todayX}
                            y1={headerHeight - 25}
                            x2={todayX}
                            y2={calculatedSvgHeight - 25}
                            stroke="#3B82F6"
                            strokeWidth={1.5}
                            strokeDasharray="2 2"
                          />
                          <rect
                            x={todayX - 35}
                            y={15}
                            width={70}
                            height={16}
                            rx={4}
                            fill="#3B82F6"
                          />
                          <text
                            x={todayX}
                            y={26}
                            fill="white"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            AUJOURD&apos;HUI
                          </text>
                        </g>
                      )}

                      {/* Repères verticaux de Jalons (Milestones) */}
                      {projectMilestones.map((m) => {
                        const mx = getXCoordinate(m.date);
                        if (mx < 180 || mx > 920) return null;
                        const milestoneColor = m.completed ? '#6B8E78' : '#C89B7B';
                        return (
                          <g key={m.id}>
                            <line
                              x1={mx}
                              y1={headerHeight}
                              x2={mx}
                              y2={calculatedSvgHeight - 25}
                              stroke={milestoneColor}
                              strokeWidth={1.2}
                              strokeDasharray="4 4"
                            />
                            {/* Losange au sommet */}
                            <path
                              d={`M ${mx} ${headerHeight - 2} L ${mx + 6} ${headerHeight + 4} L ${mx} ${headerHeight + 10} L ${mx - 6} ${headerHeight + 4} Z`}
                              fill={milestoneColor}
                              stroke="white"
                              strokeWidth={1.5}
                            />
                            {/* Titre du jalon au sommet */}
                            <text
                              x={mx}
                              y={headerHeight - 8}
                              fill={milestoneColor}
                              fontSize="8"
                              fontWeight="bold"
                              textAnchor="middle"
                              className="uppercase tracking-wider"
                            >
                              🚩 {m.title}
                            </text>
                          </g>
                        );
                      })}

                      {/* Graduation temporelle en haut */}
                      <text x={185} y={headerHeight - 35} fontSize="9" fontWeight="bold" fill="#737873" textAnchor="start">
                        Début du suivi
                      </text>
                      <text x={915} y={headerHeight - 35} fontSize="9" fontWeight="bold" fill="#737873" textAnchor="end">
                        Fin de période
                      </text>

                      {/* Liste des éléments du chronogramme */}
                      {timelineRows.map((row, idx) => {
                        const y = headerHeight + 20 + (idx * rowHeight);
                        const sx = getXCoordinate(row.start);
                        const ex = Math.max(sx + 8, getXCoordinate(row.end)); // au moins 8px de large

                        return (
                          <g key={row.id}>
                            {/* Label à gauche */}
                            <text
                              x={10}
                              y={y + 12}
                              fontSize="10"
                              fontWeight="500"
                              fill="#1A1D1A"
                              textAnchor="start"
                              className="truncate"
                            >
                              {row.label.length > 22 ? `${row.label.substring(0, 20)}...` : row.label}
                            </text>

                            {/* Alerte si tâche dépasse sa phase */}
                            {row.hasAlert && (
                              <g transform={`translate(${165}, ${y + 2})`} className="cursor-pointer">
                                <title>{row.alertMsg}</title>
                                <path d="M 0,-4 L 4,4 L -4,4 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth={0.8} />
                                <text x={0} y={3.5} fontSize="6" fontWeight="bold" fill="white" textAnchor="middle">!</text>
                              </g>
                            )}

                            {/* Ligne pointillée de fond pour la ligne */}
                            <line
                              x1={180}
                              y1={y + 8}
                              x2={920}
                              y2={y + 8}
                              stroke="#F0EFEB"
                              strokeWidth={0.5}
                              strokeDasharray="2 2"
                            />

                            {/* Barre de chronogramme */}
                            {row.type === 'task' ? (
                              <rect
                                x={sx}
                                y={y}
                                width={Math.max(8, ex - sx)}
                                height={15}
                                rx={4}
                                fill={`${row.color}30`}
                                stroke={row.color}
                                strokeWidth={1}
                              />
                            ) : (
                              // Livrable sous forme de cercle distinct
                              <circle
                                cx={sx}
                                cy={y + 7}
                                r={6}
                                fill={row.color}
                                stroke="white"
                                strokeWidth={1}
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {timelineRows.length === 0 && (
                    <p className="text-center py-6 text-xs text-[#737873] font-light">
                      Aucune tâche ni livrable disponible pour tracer le chronogramme.
                    </p>
                  )}
                </div>

                {/* 2. BARRE DES SOUS-ONGLETS CONFIGURATION DE LA ROADMAP */}
                <div className="flex border-b border-[#F0EFEB] pb-1 gap-5">
                  <button
                    type="button"
                    onClick={() => setRoadmapSubTab('milestones')}
                    className={`pb-2 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5 ${
                      roadmapSubTab === 'milestones'
                        ? 'border-[#6B8E78] text-[#5D7C68]'
                        : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
                    }`}
                  >
                    <span>🚩 Jalons Macro ({projectMilestones.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoadmapSubTab('phases')}
                    className={`pb-2 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5 ${
                      roadmapSubTab === 'phases'
                        ? 'border-[#6B8E78] text-[#5D7C68]'
                        : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
                    }`}
                  >
                    <span>📦 Phases & Épics JIRA ({projectPhases.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoadmapSubTab('tasks')}
                    className={`pb-2 text-xs font-bold border-b-2 transition-all relative flex items-center gap-1.5 ${
                      roadmapSubTab === 'tasks'
                        ? 'border-[#6B8E78] text-[#5D7C68]'
                        : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
                    }`}
                  >
                    <span>📋 Assignation des Tâches ({projectTasks.length})</span>
                  </button>
                </div>

                {/* RENDU DES SOUS-ONGLETS */}
                {roadmapSubTab === 'milestones' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-150">
                    {/* Liste des Jalons */}
                    <div className="md:col-span-2 bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#F0EFEB]">
                        <Flag className="h-4 w-4 text-[#6B8E78]" />
                        <h4 className="text-xs font-bold text-[#1A1D1A]">Liste des Jalons du Projet</h4>
                      </div>

                      {projectMilestones.length === 0 ? (
                        <div className="text-center py-12 text-[#737873] border border-dashed border-[#F0EFEB] rounded-xl bg-[#FAF9F6]">
                          <Flag className="h-6 w-6 mx-auto mb-2 text-[#737873]/50" />
                          <p className="text-xs font-medium text-[#1A1D1A]">Aucun jalon défini</p>
                          <p className="text-[10px] text-[#737873] font-light mt-0.5 max-w-xs mx-auto">
                            Ajoutez un jalon à droite pour fixer des repères clés de votre projet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                          {projectMilestones.map((m) => {
                            const isEditing = editingMilestoneId === m.id;
                            if (isEditing) {
                              return (
                                <div
                                  key={m.id}
                                  className="rounded-xl border border-[#6B8E78] bg-white p-4 space-y-3"
                                >
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      className="w-full rounded-lg border border-[#F0EFEB] bg-white p-2 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78] font-bold"
                                      value={editMTitle}
                                      onChange={(e) => setEditMTitle(e.target.value)}
                                      placeholder="Titre du Jalon *"
                                    />
                                    <input
                                      type="date"
                                      className="w-full rounded-lg border border-[#F0EFEB] bg-white p-2 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                                      value={editMDate}
                                      onChange={(e) => setEditMDate(e.target.value)}
                                    />
                                    <textarea
                                      className="w-full rounded-lg border border-[#F0EFEB] bg-white p-2 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78] resize-none"
                                      value={editMDesc}
                                      onChange={(e) => setEditMDesc(e.target.value)}
                                      placeholder="Description / Objectif"
                                      rows={2}
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2 text-xs font-bold">
                                    <button
                                      type="button"
                                      onClick={() => setEditingMilestoneId(null)}
                                      className="px-3 py-1.5 rounded-lg border border-[#F0EFEB] text-[#737873] hover:bg-slate-50 hover:text-[#1A1D1A] transition-colors"
                                    >
                                      Annuler
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!editMTitle.trim() || !editMDate) return;
                                        onSaveMilestone({
                                          ...m,
                                          title: editMTitle.trim(),
                                          date: editMDate,
                                          description: editMDesc.trim() || undefined,
                                        });
                                        setEditingMilestoneId(null);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-[#6B8E78] text-white hover:bg-[#5D7C68] transition-colors"
                                    >
                                      Enregistrer
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={m.id}
                                className="rounded-xl border border-[#F0EFEB] bg-[#FAF9F6]/50 p-4 flex items-start justify-between gap-4 hover:border-[#E2DFD8] transition-colors"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleMilestoneCompletion(m)}
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                                      m.completed
                                        ? 'bg-[#6B8E78] border-[#6B8E78] text-white'
                                        : 'border-[#EAE8E2] bg-white hover:border-[#6B8E78]'
                                    }`}
                                  >
                                    {m.completed && <Check className="h-3 w-3 stroke-[3]" />}
                                  </button>

                                  <div className="min-w-0 space-y-1">
                                    <h5 className={`text-xs font-bold text-[#1A1D1A] ${m.completed ? 'line-through text-[#737873]' : ''}`}>
                                      {m.title}
                                    </h5>
                                    {m.description && (
                                      <p className="text-[11px] text-[#737873] font-light leading-relaxed">
                                        {m.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[10px] text-[#737873] font-medium pt-0.5">
                                      <Calendar className="h-3.5 w-3.5 text-[#737873]" />
                                      <span>{new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMilestoneId(m.id);
                                      setEditMTitle(m.title);
                                      setEditMDate(m.date);
                                      setEditMDesc(m.description || '');
                                    }}
                                    className="rounded-lg p-1.5 text-[#737873] hover:bg-slate-50 hover:text-[#1A1D1A] transition-colors"
                                    title="Modifier le jalon"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteMilestone(m.id)}
                                    className="rounded-lg p-1.5 text-[#737873] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                    title="Supprimer le jalon"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Formulaire d'Ajout */}
                    <div className="bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#F0EFEB]">
                        <Plus className="h-4 w-4 text-[#6B8E78]" />
                        <h4 className="text-xs font-bold text-[#1A1D1A]">Nouveau Jalon</h4>
                      </div>

                      <form onSubmit={handleAddMilestoneSubmit} className="space-y-4">
                        {mError && (
                          <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-[11px] text-rose-600 font-medium">
                            {mError}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                            Titre du Jalon *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Lancement Beta, Kick-off..."
                            value={mTitle}
                            onChange={(e) => setMTitle(e.target.value)}
                            className="w-full rounded-xl border border-[#F0EFEB] bg-white p-2.5 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                            Date d&apos;Échéance *
                          </label>
                          <input
                            type="date"
                            required
                            value={mDate}
                            onChange={(e) => setMDate(e.target.value)}
                            className="w-full rounded-xl border border-[#F0EFEB] bg-white p-2.5 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                            Description / Objectif
                          </label>
                          <textarea
                            placeholder="Ex: Atteindre 100 utilisateurs actifs..."
                            value={mDesc}
                            onChange={(e) => setMDesc(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-[#F0EFEB] bg-white p-2.5 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78] resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#6B8E78] py-2.5 text-xs font-bold text-white hover:bg-[#5D7C68] transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Ajouter le Jalon</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {roadmapSubTab === 'phases' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-150">
                    {/* Liste des Phases */}
                    <div className="md:col-span-2 bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#F0EFEB]">
                        <Layers className="h-4 w-4 text-[#6B8E78]" />
                        <h4 className="text-xs font-bold text-[#1A1D1A]">Phases Planifiées du Projet</h4>
                      </div>

                      {projectPhases.length === 0 ? (
                        <div className="text-center py-12 text-[#737873] border border-dashed border-[#F0EFEB] rounded-xl bg-[#FAF9F6]">
                          <Layers className="h-6 w-6 mx-auto mb-2 text-[#737873]/50" />
                          <p className="text-xs font-medium text-[#1A1D1A]">Aucune phase définie</p>
                          <p className="text-[10px] text-[#737873] font-light mt-0.5 max-w-xs mx-auto">
                            Ajoutez une phase de projet à droite pour structurer votre planning en conteneurs temporels.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                          {projectPhases.map((p) => {
                            const isEditing = editingPhaseId === p.id;
                            if (isEditing) {
                              return (
                                <div
                                  key={p.id}
                                  className="rounded-xl border border-[#6B8E78] bg-white p-4 space-y-3"
                                >
                                  <div className="space-y-2.5">
                                    <div className="space-y-1">
                                      <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                                        Nom de la Phase *
                                      </label>
                                      <input
                                        type="text"
                                        className="w-full rounded-lg border border-[#F0EFEB] bg-white p-2 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78] font-bold"
                                        value={editPName}
                                        onChange={(e) => setEditPName(e.target.value)}
                                        placeholder="Ex: Cadrage & Architecture"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                                          Date Début *
                                        </label>
                                        <input
                                          type="date"
                                          className="w-full rounded-lg border border-[#F0EFEB] bg-white p-2 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                                          value={editPStart}
                                          onChange={(e) => setEditPStart(e.target.value)}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                                          Date Fin *
                                        </label>
                                        <input
                                          type="date"
                                          className="w-full rounded-lg border border-[#F0EFEB] bg-white p-2 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                                          value={editPEnd}
                                          onChange={(e) => setEditPEnd(e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                                        Nuance Japandi
                                      </label>
                                      <div className="flex items-center gap-2">
                                        {[
                                          { label: 'Sauge', hex: '#D9E4DD' },
                                          { label: 'Sable', hex: '#EAE2D8' },
                                          { label: 'Argile', hex: '#F1E3D3' },
                                          { label: 'Lin', hex: '#E3D5CA' },
                                          { label: 'Ciel', hex: '#D0E1FD' },
                                        ].map((col) => (
                                          <button
                                            key={col.hex}
                                            type="button"
                                            onClick={() => setEditPColor(col.hex)}
                                            className={`h-6 w-6 rounded-full border flex items-center justify-center transition-all ${
                                              editPColor === col.hex
                                                ? 'border-[#1A1D1A] scale-110 shadow-xs'
                                                : 'border-transparent hover:scale-105'
                                            }`}
                                            style={{ backgroundColor: col.hex }}
                                            title={col.label}
                                          >
                                            {editPColor === col.hex && <Check className="h-3 w-3 text-black" />}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                                          Clé d&apos;Épic JIRA (Optionnel)
                                        </label>
                                        <input
                                          type="text"
                                          className="w-full rounded-lg border border-[#F0EFEB] bg-white p-2 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                                          value={editPEpicKey}
                                          onChange={(e) => setEditPEpicKey(e.target.value)}
                                          placeholder="PMO-102"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                                          URL de l&apos;Épic JIRA (Optionnel)
                                        </label>
                                        <input
                                          type="url"
                                          className="w-full rounded-lg border border-[#F0EFEB] bg-white p-2 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                                          value={editPEpicUrl}
                                          onChange={(e) => setEditPEpicUrl(e.target.value)}
                                          placeholder="https://..."
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 text-xs font-bold pt-2 border-t border-[#F0EFEB]">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPhaseId(null)}
                                      className="px-3 py-1.5 rounded-lg border border-[#F0EFEB] text-[#737873] hover:bg-slate-50 hover:text-[#1A1D1A] transition-colors"
                                    >
                                      Annuler
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!editPName.trim() || !editPStart || !editPEnd) return;
                                        if (editPStart > editPEnd) return;
                                        onSavePhase({
                                          ...p,
                                          name: editPName.trim(),
                                          startDate: editPStart,
                                          endDate: editPEnd,
                                          color: editPColor,
                                          jiraEpicKey: editPEpicKey.trim() || undefined,
                                          jiraEpicUrl: editPEpicUrl.trim() || undefined,
                                        });
                                        setEditingPhaseId(null);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-[#6B8E78] text-white hover:bg-[#5D7C68] transition-colors"
                                    >
                                      Enregistrer
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={p.id}
                                className="rounded-xl border border-[#F0EFEB] bg-[#FAF9F6]/50 p-4 flex items-start justify-between gap-4 hover:border-[#E2DFD8] transition-colors"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 mt-1"
                                    style={{ backgroundColor: p.color || '#D9E4DD' }}
                                  />
                                  <div className="min-w-0 space-y-1">
                                    <h5 className="text-xs font-bold text-[#1A1D1A]">
                                      {p.name}
                                    </h5>
                                    <div className="flex items-center gap-4 text-[10px] text-[#737873] font-medium">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>Du {new Date(p.startDate).toLocaleDateString('fr-FR')} au {new Date(p.endDate).toLocaleDateString('fr-FR')}</span>
                                      </div>
                                      {p.jiraEpicKey && (
                                        <span
                                          className="font-mono text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-100"
                                          onClick={() => {
                                            if (p.jiraEpicUrl) {
                                              window.open(p.jiraEpicUrl, '_blank');
                                            } else {
                                              window.open(`https://jira.company.com/browse/${p.jiraEpicKey}`, '_blank');
                                            }
                                          }}
                                        >
                                          ⚡ Epic JIRA : {p.jiraEpicKey}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPhaseId(p.id);
                                      setEditPName(p.name);
                                      setEditPStart(p.startDate);
                                      setEditPEnd(p.endDate);
                                      setEditPColor(p.color || '#D9E4DD');
                                      setEditPEpicKey(p.jiraEpicKey || '');
                                      setEditPEpicUrl(p.jiraEpicUrl || '');
                                    }}
                                    className="rounded-lg p-1.5 text-[#737873] hover:bg-slate-50 hover:text-[#1A1D1A] transition-colors"
                                    title="Modifier la phase"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeletePhase(p.id)}
                                    className="rounded-lg p-1.5 text-[#737873] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                    title="Supprimer la phase"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Formulaire de création de phase */}
                    <div className="bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#F0EFEB]">
                        <Plus className="h-4 w-4 text-[#6B8E78]" />
                        <h4 className="text-xs font-bold text-[#1A1D1A]">Nouvelle Phase</h4>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setPError('');
                          if (!pName.trim()) {
                            setPError('Le nom de la phase est requis.');
                            return;
                          }
                          if (!pStart || !pEnd) {
                            setPError('Les dates de début et de fin sont requises.');
                            return;
                          }
                          if (pStart > pEnd) {
                            setPError('La date de début doit précéder ou égaler la date de fin.');
                            return;
                          }

                          onSavePhase({
                            id: `phase-${Date.now()}`,
                            spaceId: project.spaceId,
                            projectId: project.id,
                            name: pName.trim(),
                            startDate: pStart,
                            endDate: pEnd,
                            color: pColor,
                            jiraEpicKey: pEpicKey.trim() || undefined,
                            jiraEpicUrl: pEpicUrl.trim() || undefined,
                          });

                          setPName('');
                          setPStart('');
                          setPEnd('');
                          setPColor('#D9E4DD');
                          setPEpicKey('');
                          setPEpicUrl('');
                        }}
                        className="space-y-4"
                      >
                        {pError && (
                          <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-[11px] text-rose-600 font-medium">
                            {pError}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                            Nom de la Phase *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Cadrage & Architecture"
                            value={pName}
                            onChange={(e) => setPName(e.target.value)}
                            className="w-full rounded-xl border border-[#F0EFEB] bg-white p-2.5 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                              Date Début *
                            </label>
                            <input
                              type="date"
                              required
                              value={pStart}
                              onChange={(e) => setPStart(e.target.value)}
                              className="w-full rounded-xl border border-[#F0EFEB] bg-white p-2.5 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                              Date Fin *
                            </label>
                            <input
                              type="date"
                              required
                              value={pEnd}
                              onChange={(e) => setPEnd(e.target.value)}
                              className="w-full rounded-xl border border-[#F0EFEB] bg-white p-2.5 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                            />
                          </div>
                        </div>

                        {/* Choix de la couleur pastel Japandi */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873] block">
                            Nuance Japandi
                          </label>
                          <div className="flex items-center gap-2">
                            {[
                              { label: 'Sauge', hex: '#D9E4DD' },
                              { label: 'Sable', hex: '#EAE2D8' },
                              { label: 'Argile', hex: '#F1E3D3' },
                              { label: 'Lin', hex: '#E3D5CA' },
                              { label: 'Ciel', hex: '#D0E1FD' },
                            ].map((col) => (
                              <button
                                key={col.hex}
                                type="button"
                                onClick={() => setPColor(col.hex)}
                                className={`h-6 w-6 rounded-full border flex items-center justify-center transition-all ${
                                  pColor === col.hex
                                    ? 'border-[#1A1D1A] scale-110 shadow-xs'
                                    : 'border-transparent hover:scale-105'
                                }`}
                                style={{ backgroundColor: col.hex }}
                                title={col.label}
                              >
                                {pColor === col.hex && <Check className="h-3 w-3 text-black" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-[#F0EFEB] pt-3 space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873] flex items-center justify-between">
                              <span>Clé d&apos;Épic JIRA (Optionnel)</span>
                              <span className="font-mono text-[9px] text-[#737873]">Ex: PMO-102</span>
                            </label>
                            <input
                              type="text"
                              placeholder="PMO-102"
                              value={pEpicKey}
                              onChange={(e) => setPEpicKey(e.target.value)}
                              className="w-full rounded-xl border border-[#F0EFEB] bg-white p-2.5 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-[#737873]">
                              URL de l&apos;Épic JIRA (Optionnel)
                            </label>
                            <input
                              type="url"
                              placeholder="https://jira.company.com/browse/PMO-102"
                              value={pEpicUrl}
                              onChange={(e) => setPEpicUrl(e.target.value)}
                              className="w-full rounded-xl border border-[#F0EFEB] bg-white p-2.5 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78]"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#6B8E78] py-2.5 text-xs font-bold text-white hover:bg-[#5D7C68] transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Ajouter la Phase</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {roadmapSubTab === 'tasks' && (
                  <div className="bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F0EFEB]">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-[#6B8E78]" />
                        <h4 className="text-xs font-bold text-[#1A1D1A]">Alignement des Tâches aux Phases & Alertes Temporelles</h4>
                      </div>
                      <span className="text-[10px] font-medium text-[#737873] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#F0EFEB]">
                        Gérez le cloisonnement temporel de vos livrables
                      </span>
                    </div>

                    {projectTasks.length === 0 ? (
                      <div className="text-center py-12 text-[#737873] border border-dashed border-[#F0EFEB] rounded-xl bg-[#FAF9F6]">
                        <CheckSquare className="h-6 w-6 mx-auto mb-2 text-[#737873]/50" />
                        <p className="text-xs font-medium text-[#1A1D1A]">Aucune tâche associée au projet</p>
                        <p className="text-[10px] text-[#737873] font-light mt-0.5">
                          Créez des tâches et associez-les à ce projet pour les aligner aux phases de planification.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {projectTasks.map((t) => {
                          const associatedPhase = t.phaseId ? projectPhases.find((p) => p.id === t.phaseId) : null;
                          
                          // Alerte de débordement
                          let exceedsPhase = false;
                          let alertDetails = '';
                          if (associatedPhase && t.dateEcheance) {
                            if (t.dateEcheance < associatedPhase.startDate || t.dateEcheance > associatedPhase.endDate) {
                              exceedsPhase = true;
                              alertDetails = `L'échéance de la tâche (${t.dateEcheance}) déborde de sa phase « ${associatedPhase.name} » [${associatedPhase.startDate} au ${associatedPhase.endDate}]`;
                            }
                          }

                          return (
                            <div
                              key={t.id}
                              className={`rounded-xl border p-4 transition-all space-y-2 flex flex-col ${
                                exceedsPhase
                                  ? 'border-rose-200 bg-rose-50/20'
                                  : 'border-[#F0EFEB] bg-white hover:border-[#E2DFD8]'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="text-xs font-bold text-[#1A1D1A] truncate">
                                      {t.titre}
                                    </h5>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                      t.statut === 'Done'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : t.statut === 'Blocked'
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {t.statut}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-[#737873]">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Échéance : {t.dateEcheance ? new Date(t.dateEcheance).toLocaleDateString('fr-FR') : 'Non définie'}</span>
                                  </div>
                                </div>

                                {/* Sélecteur de phase */}
                                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                                  <span className="text-[10px] font-bold text-[#737873]">Phase :</span>
                                  <select
                                    value={t.phaseId || ''}
                                    onChange={(e) => {
                                      if (onUpdateTask) {
                                        onUpdateTask({
                                          ...t,
                                          phaseId: e.target.value || null,
                                        });
                                      }
                                    }}
                                    className="rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-xs text-[#1A1D1A] outline-hidden focus:border-[#6B8E78] min-w-[150px]"
                                  >
                                    <option value="">-- Sans Phase --</option>
                                    {projectPhases.map((phase) => (
                                      <option key={phase.id} value={phase.id}>
                                        {phase.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Alerte explicite si débordement */}
                              {exceedsPhase && (
                                <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 flex items-center gap-2 text-[10px] text-rose-700 font-medium">
                                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                  <span>{alertDetails}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
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
