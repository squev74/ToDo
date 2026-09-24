import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  ChevronDown,
  Check,
  X,
  Folder,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  CircleDot,
  ListFilter,
  Inbox,
} from 'lucide-react';
import { Tache, Projet, StatutTache } from '../types';

export const ALL_STATUSES: StatutTache[] = ['Open', 'In Progress', 'Blocked', 'Done', 'Cancelled'];

export const STATUS_CONFIG: Record<
  StatutTache,
  {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    dotClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Backlog: {
    label: 'Backlog',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700 font-semibold',
    borderClass: 'border-purple-300',
    dotClass: 'bg-purple-500',
    icon: Inbox,
  },
  backlog: {
    label: 'Backlog',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700 font-semibold',
    borderClass: 'border-purple-300',
    dotClass: 'bg-purple-500',
    icon: Inbox,
  },
  Open: {
    label: 'À faire',
    bgClass: 'bg-sky-500',
    textClass: 'text-white font-medium',
    borderClass: 'border-sky-600',
    dotClass: 'bg-white',
    icon: CircleDot,
  },
  'In Progress': {
    label: 'En cours',
    bgClass: 'bg-amber-400',
    textClass: 'text-amber-950 font-semibold',
    borderClass: 'border-amber-500',
    dotClass: 'bg-amber-950',
    icon: Clock,
  },
  Blocked: {
    label: 'Bloqué',
    bgClass: 'bg-red-500',
    textClass: 'text-white font-bold',
    borderClass: 'border-red-600',
    dotClass: 'bg-white',
    icon: AlertTriangle,
  },
  Done: {
    label: 'Terminé',
    bgClass: 'bg-emerald-500',
    textClass: 'text-white font-medium',
    borderClass: 'border-emerald-600',
    dotClass: 'bg-white',
    icon: CheckCircle2,
  },
  Cancelled: {
    label: 'Annulé',
    bgClass: 'bg-rose-500',
    textClass: 'text-white font-medium',
    borderClass: 'border-rose-600',
    dotClass: 'bg-white',
    icon: AlertCircle,
  },
};

interface TaskFilterBarProps {
  currentSpaceName: string;
  tasks: Tache[];
  projects: Projet[];
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedProjectIds: string[] | null; // null = tous les projets (aucun filtre actif), [] = aucun projet sélectionné
  onProjectSelectionChange: (selected: string[] | null) => void;
  selectedStatuses: StatutTache[] | null; // null = tous les statuts (aucun filtre actif), [] = aucun statut sélectionné
  onStatusSelectionChange: (selected: StatutTache[] | null) => void;
  onResetFilters: () => void;
  overdueCount?: number;
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  currentSpaceName,
  tasks,
  projects,
  searchQuery,
  onSearchChange,
  selectedProjectIds,
  onProjectSelectionChange,
  selectedStatuses,
  onStatusSelectionChange,
  onResetFilters,
  overdueCount = 0,
}) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Fermeture des menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProjectDropdownOpen(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Tous les identifiants possibles de projet (projets de l'espace + 'none')
  const allProjectOptionIds = useMemo(() => {
    return ['none', ...projects.map((p) => p.id)];
  }, [projects]);

  // Nombre de tâches par projet
  const taskCountByProject = useMemo(() => {
    const counts: Record<string, number> = { none: 0 };
    projects.forEach((p) => {
      counts[p.id] = 0;
    });

    tasks.forEach((t) => {
      if (!t.projetId || t.projetId.trim() === '') {
        counts.none = (counts.none || 0) + 1;
      } else {
        counts[t.projetId] = (counts[t.projetId] || 0) + 1;
      }
    });

    return counts;
  }, [tasks, projects]);

  // Nombre de tâches par statut
  const taskCountByStatus = useMemo(() => {
    const counts: Record<StatutTache, number> = {
      Backlog: 0,
      backlog: 0,
      Open: 0,
      'In Progress': 0,
      Blocked: 0,
      Done: 0,
      Cancelled: 0,
    };
    tasks.forEach((t) => {
      if (counts[t.statut] !== undefined) {
        counts[t.statut] += 1;
      }
    });
    return counts;
  }, [tasks]);

  // Vérifications d'état des projets (null = tous sélectionnés)
  const isAllProjectsSelected =
    selectedProjectIds === null ||
    selectedProjectIds.length === allProjectOptionIds.length;

  const isAllStatusesSelected =
    selectedStatuses === null ||
    selectedStatuses.length === ALL_STATUSES.length;

  // Calcul du nombre de filtres actifs pour le badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim().length > 0) count += 1;
    if (selectedProjectIds !== null && !isAllProjectsSelected) count += 1;
    if (selectedStatuses !== null && !isAllStatusesSelected) count += 1;
    return count;
  }, [searchQuery, isAllProjectsSelected, selectedProjectIds, isAllStatusesSelected, selectedStatuses]);

  const hasActiveFilters = activeFiltersCount > 0;

  // Handlers pour la sélection de Projets
  const toggleProject = (projectId: string) => {
    if (selectedProjectIds === null || isAllProjectsSelected) {
      // Si tout était sélectionné, un clic isole tous les autres SAUF celui décoché
      onProjectSelectionChange(allProjectOptionIds.filter((id) => id !== projectId));
      return;
    }

    if (selectedProjectIds.includes(projectId)) {
      const next = selectedProjectIds.filter((id) => id !== projectId);
      onProjectSelectionChange(next);
    } else {
      const next = [...selectedProjectIds, projectId];
      if (next.length === allProjectOptionIds.length) {
        onProjectSelectionChange(null);
      } else {
        onProjectSelectionChange(next);
      }
    }
  };

  const selectAllProjects = () => {
    onProjectSelectionChange(null);
  };

  const deselectAllProjects = () => {
    onProjectSelectionChange([]);
  };

  // Handlers pour la sélection de Statuts
  const toggleStatus = (status: StatutTache) => {
    if (selectedStatuses === null || isAllStatusesSelected) {
      onStatusSelectionChange(ALL_STATUSES.filter((s) => s !== status));
      return;
    }

    if (selectedStatuses.includes(status)) {
      const next = selectedStatuses.filter((s) => s !== status);
      onStatusSelectionChange(next);
    } else {
      const next = [...selectedStatuses, status];
      if (next.length === ALL_STATUSES.length) {
        onStatusSelectionChange(null);
      } else {
        onStatusSelectionChange(next);
      }
    }
  };

  const selectAllStatuses = () => {
    onStatusSelectionChange(null);
  };

  const deselectAllStatuses = () => {
    onStatusSelectionChange([]);
  };

  // Libellé résumé pour le bouton Projets
  const projectButtonLabel = useMemo(() => {
    if (selectedProjectIds === null || isAllProjectsSelected) {
      return `Tous les projets (${projects.length})`;
    }
    if (selectedProjectIds.length === 0) {
      return 'Aucun projet (0)';
    }
    if (selectedProjectIds.length === 1) {
      const singleId = selectedProjectIds[0];
      if (singleId === 'none') return 'Sans projet';
      const proj = projects.find((p) => p.id === singleId);
      return proj ? proj.nom : '1 projet';
    }
    return `${selectedProjectIds.length} projets`;
  }, [selectedProjectIds, isAllProjectsSelected, projects]);

  // Libellé résumé pour le bouton Statuts
  const statusButtonLabel = useMemo(() => {
    if (selectedStatuses === null || isAllStatusesSelected) {
      return 'Tous les statuts';
    }
    if (selectedStatuses.length === 0) {
      return 'Aucun statut (0)';
    }
    if (selectedStatuses.length === 1) {
      return STATUS_CONFIG[selectedStatuses[0]].label;
    }
    return `${selectedStatuses.length} statuts`;
  }, [selectedStatuses, isAllStatusesSelected]);

  return (
    <div
      id="tasks-filters-bar"
      className="rounded-2xl border border-[#F0EFEB] bg-white p-3.5 sm:p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300"
    >
      {/* LIGNE PRINCIPALE DE CONTRÔLES */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* 1. Recherche textuelle */}
        <div className="relative flex-1 min-w-[200px]">
          <label htmlFor="search-tasks-input" className="sr-only">
            Rechercher une tâche
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#737873]" />
          <input
            id="search-tasks-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Rechercher dans « ${currentSpaceName} »...`}
            className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] py-1.5 pl-8.5 pr-8 text-xs text-[#1A1D1A] placeholder:text-[#737873] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737873] hover:text-[#1A1D1A] p-0.5 rounded-full hover:bg-[#F0EFEB] transition-colors"
              title="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 2. Filtre Multi-Sélection Projets */}
        <div className="relative" ref={projectDropdownRef}>
          <button
            id="filter-projects-dropdown-btn"
            type="button"
            onClick={() => {
              setIsProjectDropdownOpen((prev) => !prev);
              setIsStatusDropdownOpen(false);
            }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
              !isAllProjectsSelected
                ? 'border-[#6B8E78]/30 bg-[#6B8E78]/10 text-[#6B8E78]'
                : 'border-[#F0EFEB] bg-[#F9F8F6] text-[#1A1D1A] hover:bg-[#F0EFEB]'
            }`}
          >
            <Folder className={`h-3.5 w-3.5 ${!isAllProjectsSelected ? 'text-[#6B8E78]' : 'text-[#737873]'}`} />
            <span className="truncate max-w-[140px]">{projectButtonLabel}</span>
            {!isAllProjectsSelected && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6B8E78] px-1 text-[10px] font-medium text-white">
                {selectedProjectIds?.length ?? 0}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-[#737873] transition-transform duration-300 ${
                isProjectDropdownOpen ? 'rotate-180 text-[#1A1D1A]' : ''
              }`}
            />
          </button>

          {/* Menu Déroulant Projets */}
          {isProjectDropdownOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 z-40 w-72 rounded-2xl border border-[#F0EFEB] bg-white p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-2 px-1 text-[11px] font-medium text-[#737873] uppercase tracking-wider">
                <span>Filtrer par projet</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllProjects}
                    className="text-xs text-[#6B8E78] hover:text-[#5d7c68] font-medium hover:underline capitalize"
                  >
                    Tout
                  </button>
                  <span className="text-[#D3CFC8]">•</span>
                  <button
                    type="button"
                    onClick={deselectAllProjects}
                    className="text-xs text-[#737873] hover:text-[#1A1D1A] font-medium hover:underline capitalize"
                  >
                    Aucun
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                {/* Option "Sans projet" */}
                <label className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[#F0EFEB] cursor-pointer text-xs group transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedProjectIds === null
                          ? true
                          : selectedProjectIds.includes('none')
                      }
                      onChange={() => toggleProject('none')}
                      className="h-3.5 w-3.5 rounded border-[#D3CFC8] text-[#6B8E78] focus:ring-[#6B8E78] accent-[#6B8E78]"
                    />
                    <span className="h-2 w-2 rounded-full bg-[#D3CFC8] shrink-0" />
                    <span className="text-[#1A1D1A]">
                      Sans projet assigné
                    </span>
                  </div>
                  <span className="rounded-full bg-[#F0EFEB] px-1.5 py-0.5 text-[10px] text-[#737873] font-medium">
                    {taskCountByProject.none || 0}
                  </span>
                </label>

                {/* Liste des projets réels */}
                {projects.length === 0 ? (
                  <p className="p-2 text-center text-xs text-[#737873]">
                    Aucun projet dans cet espace
                  </p>
                ) : (
                  projects.map((proj) => {
                    const isChecked =
                      selectedProjectIds === null
                        ? true
                        : selectedProjectIds.includes(proj.id);
                    const count = taskCountByProject[proj.id] || 0;

                    return (
                      <label
                        key={proj.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[#F0EFEB] cursor-pointer text-xs group transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProject(proj.id)}
                            className="h-3.5 w-3.5 rounded border-[#D3CFC8] text-[#6B8E78] focus:ring-[#6B8E78] accent-[#6B8E78] shrink-0"
                          />
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: proj.couleur || '#6B8E78' }}
                          />
                          <span className="text-[#1A1D1A] truncate">
                            {proj.nom}
                          </span>
                        </div>
                        <span className="rounded-full bg-[#F0EFEB] px-1.5 py-0.5 text-[10px] text-[#737873] font-medium shrink-0">
                          {count}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Filtre Multi-Sélection Statuts */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            id="filter-status-dropdown-btn"
            type="button"
            onClick={() => {
              setIsStatusDropdownOpen((prev) => !prev);
              setIsProjectDropdownOpen(false);
            }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
              !isAllStatusesSelected
                ? 'border-[#6B8E78]/30 bg-[#6B8E78]/10 text-[#6B8E78]'
                : 'border-[#F0EFEB] bg-[#F9F8F6] text-[#1A1D1A] hover:bg-[#F0EFEB]'
            }`}
          >
            <ListFilter className={`h-3.5 w-3.5 ${!isAllStatusesSelected ? 'text-[#6B8E78]' : 'text-[#737873]'}`} />
            <span className="truncate max-w-[130px]">{statusButtonLabel}</span>
            {!isAllStatusesSelected && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6B8E78] px-1 text-[10px] font-medium text-white">
                {selectedStatuses?.length ?? 0}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-[#737873] transition-transform duration-300 ${
                isStatusDropdownOpen ? 'rotate-180 text-[#1A1D1A]' : ''
              }`}
            />
          </button>

          {/* Menu Déroulant Statuts */}
          {isStatusDropdownOpen && (
            <div className="absolute right-0 mt-1.5 z-40 w-64 rounded-2xl border border-[#F0EFEB] bg-white p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#F0EFEB] pb-2 px-1 text-[11px] font-medium text-[#737873] uppercase tracking-wider">
                <span>Filtrer par statut</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllStatuses}
                    className="text-xs text-[#6B8E78] hover:text-[#5d7c68] font-medium hover:underline capitalize"
                  >
                    Tout
                  </button>
                  <span className="text-[#D3CFC8]">•</span>
                  <button
                    type="button"
                    onClick={deselectAllStatuses}
                    className="text-xs text-[#737873] hover:text-[#1A1D1A] font-medium hover:underline capitalize"
                  >
                    Aucun
                  </button>
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                {ALL_STATUSES.map((statusKey) => {
                  const cfg = STATUS_CONFIG[statusKey];
                  const Icon = cfg.icon;
                  const isChecked =
                    selectedStatuses === null
                      ? true
                      : selectedStatuses.includes(statusKey);
                  const count = taskCountByStatus[statusKey] || 0;

                  return (
                    <label
                      key={statusKey}
                      className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[#F0EFEB] cursor-pointer text-xs group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStatus(statusKey)}
                          className="h-3.5 w-3.5 rounded border-[#D3CFC8] text-[#6B8E78] focus:ring-[#6B8E78] accent-[#6B8E78]"
                        />
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{cfg.label}</span>
                        </span>
                      </div>
                      <span className="rounded-full bg-[#F0EFEB] px-1.5 py-0.5 text-[10px] text-[#737873] font-medium">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Bouton Réinitialiser / Indicateur de filtres actifs */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasActiveFilters ? (
            <button
              id="reset-filters-btn"
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#C89B7B]/25 bg-white hover:bg-[#F9F8F6] px-3 py-1.5 text-xs font-normal text-[#966847] hover:text-[#7f5434] transition-all duration-200 cursor-pointer shadow-xs hover:shadow-sm"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="h-3 w-3 text-[#966847]" />
              <span className="font-light">Réinitialiser les filtres</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C89B7B]/10 text-[10px] font-semibold text-[#966847] ml-0.5 font-mono">
                {activeFiltersCount}
              </span>
            </button>
          ) : (
            <div
              className="h-8 px-2 flex items-center gap-1 text-[#737873] text-xs font-light"
              title="Aucun filtre actif"
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden xl:inline text-[11px]">Tous visibles</span>
            </div>
          )}
        </div>
      </div>

      {/* RANGÉE DES BADGES ACTIFS (Si des filtres sont appliqués) */}
      {hasActiveFilters && (
        <div className="mt-2.5 pt-2.5 border-t border-[#F0EFEB] flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-[#737873] font-medium mr-1">
            Filtres actifs :
          </span>

          {/* Badge recherche */}
          {searchQuery.trim().length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#F0EFEB] px-2 py-0.5 text-[11px] font-medium text-[#1A1D1A] border border-[#E5E3DC]">
              <span>« {searchQuery} »</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-rose-600 rounded-full p-0.5 transition-colors"
                title="Supprimer la recherche"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Badges projets filtrés */}
          {!isAllProjectsSelected && selectedProjectIds !== null && selectedProjectIds.length === 0 && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#C89B7B]/15 px-2 py-0.5 text-[11px] font-medium text-[#966847] border border-[#C89B7B]/30">
              <span>Aucun projet sélectionné</span>
              <button
                type="button"
                onClick={selectAllProjects}
                className="hover:text-rose-600 rounded-full p-0.5 transition-colors"
                title="Afficher tous les projets"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {!isAllProjectsSelected &&
            selectedProjectIds !== null &&
            selectedProjectIds.map((pid) => {
              if (pid === 'none') {
                return (
                  <span
                    key="none"
                    className="inline-flex items-center gap-1 rounded-xl bg-[#F0EFEB] px-2 py-0.5 text-[11px] font-medium text-[#1A1D1A] border border-[#E5E3DC]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#737873]" />
                    <span>Sans projet</span>
                    <button
                      type="button"
                      onClick={() => toggleProject('none')}
                      className="hover:text-rose-600 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              }

              const proj = projects.find((p) => p.id === pid);
              if (!proj) return null;

              return (
                <span
                  key={proj.id}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#6B8E78]/10 px-2 py-0.5 text-[11px] font-medium text-[#6B8E78] border border-[#6B8E78]/25"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: proj.couleur || '#6B8E78' }}
                  />
                  <span className="truncate max-w-[120px]">{proj.nom}</span>
                  <button
                    type="button"
                    onClick={() => toggleProject(proj.id)}
                    className="hover:text-rose-600 rounded-full p-0.5 transition-colors"
                    title={`Retirer le filtre ${proj.nom}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

          {/* Badges statuts filtrés */}
          {!isAllStatusesSelected && selectedStatuses !== null && selectedStatuses.length === 0 && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#C89B7B]/15 px-2 py-0.5 text-[11px] font-medium text-[#966847] border border-[#C89B7B]/30">
              <span>Aucun statut sélectionné</span>
              <button
                type="button"
                onClick={selectAllStatuses}
                className="hover:text-rose-600 rounded-full p-0.5 transition-colors"
                title="Afficher tous les statuts"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {!isAllStatusesSelected &&
            selectedStatuses !== null &&
            selectedStatuses.map((st) => {
              const cfg = STATUS_CONFIG[st];
              return (
                <span
                  key={st}
                  className={`inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[11px] font-medium border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
                  <span>{cfg.label}</span>
                  <button
                    type="button"
                    onClick={() => toggleStatus(st)}
                    className="hover:text-rose-600 rounded-full p-0.5 transition-colors"
                    title={`Retirer le statut ${cfg.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

          {/* Bouton rapide d'effacement total dans les badges */}
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] text-[#737873] hover:text-[#1A1D1A] hover:underline ml-1"
          >
            Tout effacer
          </button>
        </div>
      )}

      {/* 5. Avertissement tâches en retard dans l'espace */}
      {overdueCount > 0 && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-rose-50/70 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200/50">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>
            Attention : {overdueCount} tâche{overdueCount > 1 ? 's ont' : ' a'}{' '}
            dépassé leur date d&apos;échéance dans cet espace.
          </span>
        </div>
      )}
    </div>
  );
};
