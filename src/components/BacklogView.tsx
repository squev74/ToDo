import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Plus,
  Search,
  Folder,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Tache, Projet, Espace, StatutTache } from '../types';
import { TaskCard } from './TaskCard';

export interface BacklogViewProps {
  tasks: Tache[];
  projects: Projet[];
  activeSpace?: Espace;
  onStatusChange: (task: Tache, newStatus: StatutTache) => void;
  onEditTask: (task: Tache) => void;
  onDeleteTask: (task: Tache) => void;
  onAddComment: (taskId: string, commentText: string) => void;
  onQuickAddTask: (titre: string, projetId?: string | null) => void;
  onOpenCreateModal: () => void;
  onReorderTasks?: (reorderedTasks: Tache[]) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  tasks,
  projects,
  activeSpace,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onAddComment,
  onQuickAddTask,
  onOpenCreateModal,
  onReorderTasks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickProjectId, setQuickProjectId] = useState<string>('');

  // Drag & drop state for backlog items
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Projets map
  const projectsMap = useMemo(() => {
    const map = new Map<string, Projet>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filtrage strict : tâches de l'espace actif avec statut 'Backlog' ou 'backlog'
  const backlogTasks = useMemo(() => {
    return tasks
      .filter((t) => (t.statut as string)?.toLowerCase() === 'backlog')
      .sort((a, b) => a.ordre - b.ordre);
  }, [tasks]);

  // Filtrage par recherche et projet au sein du Backlog
  const filteredBacklogTasks = useMemo(() => {
    return backlogTasks.filter((t) => {
      // Filtre projet
      if (selectedProjectFilter === 'none' && t.projetId) return false;
      if (
        selectedProjectFilter !== 'all' &&
        selectedProjectFilter !== 'none' &&
        t.projetId !== selectedProjectFilter
      ) {
        return false;
      }

      // Filtre texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.titre.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const proj = t.projetId ? projectsMap.get(t.projetId) : undefined;
        const matchesProj = proj?.nom.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesProj) return false;
      }

      return true;
    });
  }, [backlogTasks, selectedProjectFilter, searchQuery, projectsMap]);

  // Soumission de l'ajout rapide
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAddTask(quickTitle.trim(), quickProjectId || null);
    setQuickTitle('');
  };

  // Gestion du Drag & Drop pour réordonner le backlog
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedTaskId || !onReorderTasks) {
      setDraggedTaskId(null);
      setDragOverIndex(null);
      return;
    }

    const currentItems = [...filteredBacklogTasks];
    const sourceIndex = currentItems.findIndex((item) => item.id === draggedTaskId);
    if (sourceIndex === -1 || sourceIndex === dropIndex) {
      setDraggedTaskId(null);
      setDragOverIndex(null);
      return;
    }

    const [movedItem] = currentItems.splice(sourceIndex, 1);
    currentItems.splice(dropIndex, 0, movedItem);

    // Mettre à jour l'ordre de toutes les tâches
    const reordered = currentItems.map((item, idx) => ({
      ...item,
      ordre: idx + 1,
    }));

    onReorderTasks(reordered);
    setDraggedTaskId(null);
    setDragOverIndex(null);
  };

  return (
    <div id="backlog-view-container" className="space-y-5">
      {/* En-tête informatif du Backlog */}
      <div
        id="backlog-header-banner"
        className="rounded-2xl border border-[#F0EFEB] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B7083]/10 text-[#5B7083]">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-normal tracking-wide text-[#1A1D1A]">
                    Backlog des tâches
                  </h2>
                  <span className="inline-flex items-center rounded-lg bg-[#5B7083]/10 px-2.5 py-0.5 text-xs font-medium text-[#5B7083] border border-[#5B7083]/20">
                    {backlogTasks.length} en attente
                  </span>
                </div>
                {activeSpace && (
                  <p className="text-xs text-[#737873]">
                    Espace actif : <strong className="text-[#1A1D1A] font-medium">{activeSpace.nom}</strong>
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-[#737873] max-w-2xl leading-relaxed pt-1 font-light">
              Ce réservoir conserve vos idées, fonctionnalités et tâches en attente de cadrage sans encombrer votre tableau opérationnel. Dès qu&apos;une tâche est prête, passez-la à l&apos;état actif pour l&apos;intégrer au flux.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="backlog-open-create-modal-btn"
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-medium text-white hover:bg-[#5d7c68] active:scale-[0.99] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Créer une tâche détaillée</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barre d'ajout rapide au Backlog */}
      <div
        id="backlog-quick-add-bar"
        className="rounded-2xl border border-[#F0EFEB] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      >
        <form onSubmit={handleQuickAddSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              id="backlog-quick-title-input"
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Ajouter une idée ou tâche en attente dans le Backlog..."
              className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3.5 py-2 text-xs text-[#1A1D1A] placeholder:text-[#737873]/50 focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
            />
          </div>

          <div className="sm:w-52">
            <select
              id="backlog-quick-project-select"
              value={quickProjectId}
              onChange={(e) => setQuickProjectId(e.target.value)}
              className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
            >
              <option value="">Sans projet assigné</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
          </div>

          <button
            id="backlog-quick-add-submit-btn"
            type="submit"
            disabled={!quickTitle.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A1D1A] px-4 py-2 text-xs font-medium text-white hover:bg-[#2c302c] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-all shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter au Backlog</span>
          </button>
        </form>
      </div>

      {/* Barre de filtres interne au Backlog */}
      <div
        id="backlog-filters-bar"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-[#F0EFEB] bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      >
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 items-center">
          {/* Recherche */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#737873]" />
            <input
              id="backlog-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans le Backlog..."
              className="w-full rounded-xl border border-[#F0EFEB] bg-white py-1.5 pl-8 pr-3 text-xs text-[#1A1D1A] placeholder:text-[#737873]/50 focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
            />
          </div>

          {/* Filtre Projet */}
          <div className="w-full sm:w-56">
            <select
              id="backlog-project-filter"
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
            >
              <option value="all">Tous les projets ({backlogTasks.length})</option>
              <option value="none">Sans projet assigné</option>
              {projects.map((proj) => {
                const count = backlogTasks.filter((t) => t.projetId === proj.id).length;
                return (
                  <option key={proj.id} value={proj.id}>
                    {proj.nom} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {(searchQuery || selectedProjectFilter !== 'all') && (
            <button
              id="backlog-reset-filters-btn"
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedProjectFilter('all');
              }}
              className="inline-flex items-center gap-1 text-xs text-[#737873] hover:text-[#1A1D1A] font-medium self-start sm:self-center transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>

        <div className="text-xs text-[#737873] shrink-0 font-medium">
          {filteredBacklogTasks.length} tâche{filteredBacklogTasks.length > 1 ? 's' : ''} affichée{filteredBacklogTasks.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Liste des tâches du Backlog */}
      {filteredBacklogTasks.length === 0 ? (
        <div
          id="backlog-empty-state"
          className="rounded-2xl border border-dashed border-[#F0EFEB] bg-white p-12 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9F8F6] text-[#5B7083] border border-[#F0EFEB] mb-3">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-normal text-[#1A1D1A]">
            {backlogTasks.length === 0
              ? 'Aucune tâche dans le Backlog'
              : 'Aucune tâche correspondant aux filtres'}
          </h3>
          <p className="mt-1 text-xs text-[#737873] max-w-md mx-auto font-light">
            {backlogTasks.length === 0
              ? 'Toutes vos tâches actuelles sont dans le flux de production. Utilisez le champ ci-dessus pour stocker des idées futures.'
              : 'Modifiez votre recherche ou réinitialisez les filtres pour afficher l’ensemble des tâches du Backlog.'}
          </p>
          {backlogTasks.length === 0 && (
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('backlog-quick-title-input');
                if (input) input.focus();
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#5d7c68] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter une première idée</span>
            </button>
          )}
        </div>
      ) : (
        <div id="backlog-tasks-list" className="space-y-1.5 sm:space-y-2">
          {filteredBacklogTasks.map((task, index) => {
            const project = task.projetId ? projectsMap.get(task.projetId) : undefined;
            const isDragOver = dragOverIndex === index;

            return (
              <TaskCard
                key={task.id}
                task={task}
                project={project}
                index={index}
                onStatusChange={onStatusChange}
                onEditTask={onEditTask}
                onEdit={onEditTask}
                onRequestDelete={onDeleteTask}
                onDelete={onDeleteTask}
                onAddComment={onAddComment}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                isDragOver={isDragOver}
                onPromote={(t) => onStatusChange(t, 'Open')}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
