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
  KanbanSquare 
} from 'lucide-react';
import { Projet, Tache, ProjectDeliverable } from '../types';
import { ProjectDeliverablesSection } from './ProjectDeliverablesSection';

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
    deliverables?: ProjectDeliverable[]
  ) => void;
}

type TabType = 'overview' | 'deliverables';

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
      updatedDeliverables
    );
  };

  const formattedDate = new Date(project.dateCreation).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      id="project-detail-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-end bg-[#1A1D1A]/20 backdrop-blur-xs transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="project-detail-sidebar"
        className="h-full w-full max-w-xl bg-white shadow-[[-10px_0_30px_rgba(0,0,0,0.03)]] border-l border-[#F0EFEB] flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* EN-TÊTE DE LA FICHE */}
        <div className="p-6 border-b border-[#F0EFEB] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="h-4.5 w-4.5 rounded-full"
                style={{ backgroundColor: project.couleur }}
              />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#737873]">
                Fiche détaillée du projet
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F9F8F6] hover:text-[#1A1D1A] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-normal tracking-tight text-[#1A1D1A] flex items-center gap-2 flex-wrap">
              <span>{project.nom}</span>
              {project.jiraKey && (
                <span className="rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-mono">
                  {project.jiraKey}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#737873] font-light">
              Créé le {formattedDate}
            </p>
          </div>

          {/* SÉLECTEUR D'ONGLETS JAPANDI */}
          <div className="flex border-b border-[#F0EFEB] pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-1 text-xs font-medium border-b-2 transition-all relative ${
                activeTab === 'overview'
                  ? 'border-[#6B8E78] text-[#5D7C68] font-semibold'
                  : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
              }`}
            >
              Vue d'ensemble & Tâches
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deliverables')}
              className={`ml-6 pb-2.5 px-1 text-xs font-medium border-b-2 transition-all relative ${
                activeTab === 'deliverables'
                  ? 'border-[#6B8E78] text-[#5D7C68] font-semibold'
                  : 'border-transparent text-[#737873] hover:text-[#1A1D1A]'
              }`}
            >
              Livrables & Liens utiles
              {project.deliverables && project.deliverables.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#6B8E78]/10 text-[#5D7C68] text-[9px] font-bold">
                  {project.deliverables.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* CONTENU DE L'ONGLET */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' ? (
            <div className="space-y-6">
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
          ) : (
            <ProjectDeliverablesSection 
              project={project} 
              onUpdateDeliverables={handleUpdateDeliverables} 
            />
          )}
        </div>

        {/* PIED DE PAGE */}
        <div className="p-6 border-t border-[#F0EFEB] bg-[#FAF9F6]/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#EAE8E2] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] transition-colors"
          >
            Fermer la fiche
          </button>
        </div>
      </div>
    </div>
  );
};
