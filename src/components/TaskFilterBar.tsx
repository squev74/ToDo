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

export const ALL_STATUSES: StatutTache[] = ['Open', 'In Progress', 'Blocked', 'Done'];

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
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    dotClass: 'bg-slate-400',
    icon: Inbox,
  },
  backlog: {
    label: 'Backlog',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    dotClass: 'bg-slate-400',
    icon: Inbox,
  },
  Open: {
    label: 'À faire',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    dotClass: 'bg-slate-500',
    icon: CircleDot,
  },
  'In Progress': {
    label: 'En cours',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
    icon: Clock,
  },
  Blocked: {
    label: 'Bloqué',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-800',
    borderClass: 'border-rose-200',
    dotClass: 'bg-rose-500',
    icon: AlertTriangle,
  },
  Done: {
    label: 'Terminé',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-500',
    icon: CheckCircle2,
  },
};

interface TaskFilterBarProps {
  currentSpaceName: string;
  tasks: Tache[];
  projects: Projet[];
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedProjectIds: string[]; // Liste des IDs de projets sélectionnés ('none' pour les sans projet)
  onProjectSelectionChange: (selected: string[]) => void;
  selectedStatuses: StatutTache[]; // Liste des statuts sélectionnés
  onStatusSelectionChange: (selected: StatutTache[]) => void;
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
    };
    tasks.forEach((t) => {
      if (counts[t.statut] !== undefined) {
        counts[t.statut] += 1;
      }
    });
    return counts;
  }, [tasks]);

  // Vérifications d'état des projets
  const isAllProjectsSelected =
    selectedProjectIds.length === 0 ||
    selectedProjectIds.length === allProjectOptionIds.length;

  const isAllStatusesSelected =
    selectedStatuses.length === 0 ||
    selectedStatuses.length === ALL_STATUSES.length;

  // Calcul du nombre de filtres actifs pour le badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim().length > 0) count += 1;
    if (!isAllProjectsSelected && selectedProjectIds.length > 0) count += 1;
    if (!isAllStatusesSelected && selectedStatuses.length > 0) count += 1;
    return count;
  }, [searchQuery, isAllProjectsSelected, selectedProjectIds, isAllStatusesSelected, selectedStatuses]);

  const hasActiveFilters = activeFiltersCount > 0;

  // Handlers pour la sélection de Projets
  const toggleProject = (projectId: string) => {
    if (isAllProjectsSelected) {
      // Si tout était sélectionné, un clic isole tous les autres SAUF celui décoché
      onProjectSelectionChange(allProjectOptionIds.filter((id) => id !== projectId));
      return;
    }

    if (selectedProjectIds.includes(projectId)) {
      const next = selectedProjectIds.filter((id) => id !== projectId);
      // Si on décoche le dernier, on considère que rien n'est affiché ou on laisse vide
      onProjectSelectionChange(next);
    } else {
      const next = [...selectedProjectIds, projectId];
      // Si on vient de tous les cocher, on peut soit garder le tableau complet
      onProjectSelectionChange(next);
    }
  };

  const selectAllProjects = () => {
    onProjectSelectionChange([...allProjectOptionIds]);
  };

  const deselectAllProjects = () => {
    onProjectSelectionChange([]);
  };

  // Handlers pour la sélection de Statuts
  const toggleStatus = (status: StatutTache) => {
    if (isAllStatusesSelected) {
      onStatusSelectionChange(ALL_STATUSES.filter((s) => s !== status));
      return;
    }

    if (selectedStatuses.includes(status)) {
      const next = selectedStatuses.filter((s) => s !== status);
      onStatusSelectionChange(next);
    } else {
      const next = [...selectedStatuses, status];
      onStatusSelectionChange(next);
    }
  };

  const selectAllStatuses = () => {
    onStatusSelectionChange([...ALL_STATUSES]);
  };

  const deselectAllStatuses = () => {
    onStatusSelectionChange([]);
  };

  // Libellé résumé pour le bouton Projets
  const projectButtonLabel = useMemo(() => {
    if (isAllProjectsSelected) {
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
  }, [isAllProjectsSelected, selectedProjectIds, projects]);

  // Libellé résumé pour le bouton Statuts
  const statusButtonLabel = useMemo(() => {
    if (isAllStatusesSelected) {
      return 'Tous les statuts';
    }
    if (selectedStatuses.length === 0) {
      return 'Aucun statut (0)';
    }
    if (selectedStatuses.length === 1) {
      return STATUS_CONFIG[selectedStatuses[0]].label;
    }
    return `${selectedStatuses.length} statuts`;
  }, [isAllStatusesSelected, selectedStatuses]);

  return (
    <div
      id="tasks-filters-bar"
      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all"
    >
      {/* LIGNE PRINCIPALE DE CONTRÔLES */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* 1. Recherche textuelle */}
        <div className="relative flex-1 min-w-[200px]">
          <label htmlFor="search-tasks-input" className="sr-only">
            Rechercher une tâche
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="search-tasks-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Rechercher dans « ${currentSpaceName} »...`}
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-colors"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
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
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              !isAllProjectsSelected
                ? 'border-indigo-300 bg-indigo-50/70 text-indigo-900 shadow-xs'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Folder className={`h-3.5 w-3.5 ${!isAllProjectsSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="truncate max-w-[140px]">{projectButtonLabel}</span>
            {!isAllProjectsSelected && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {selectedProjectIds.length}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                isProjectDropdownOpen ? 'rotate-180 text-slate-600' : ''
              }`}
            />
          </button>

          {/* Menu Déroulant Projets */}
          {isProjectDropdownOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 z-40 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Filtrer par projet</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllProjects}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline capitalize"
                  >
                    Tout
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={deselectAllProjects}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:underline capitalize"
                  >
                    Aucun
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                {/* Option "Sans projet" */}
                <label className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs group transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        isAllProjectsSelected || selectedProjectIds.includes('none')
                      }
                      onChange={() => toggleProject('none')}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                    <span className="text-slate-700 group-hover:text-slate-900">
                      Sans projet assigné
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-medium">
                    {taskCountByProject.none || 0}
                  </span>
                </label>

                {/* Liste des projets réels */}
                {projects.length === 0 ? (
                  <p className="p-2 text-center text-xs text-slate-400">
                    Aucun projet dans cet espace
                  </p>
                ) : (
                  projects.map((proj) => {
                    const isChecked =
                      isAllProjectsSelected || selectedProjectIds.includes(proj.id);
                    const count = taskCountByProject[proj.id] || 0;

                    return (
                      <label
                        key={proj.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs group transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProject(proj.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                          />
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: proj.couleur || '#6366f1' }}
                          />
                          <span className="text-slate-700 group-hover:text-slate-900 truncate">
                            {proj.nom}
                          </span>
                        </div>
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-medium shrink-0">
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
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              !isAllStatusesSelected
                ? 'border-indigo-300 bg-indigo-50/70 text-indigo-900 shadow-xs'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ListFilter className={`h-3.5 w-3.5 ${!isAllStatusesSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="truncate max-w-[130px]">{statusButtonLabel}</span>
            {!isAllStatusesSelected && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {selectedStatuses.length}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                isStatusDropdownOpen ? 'rotate-180 text-slate-600' : ''
              }`}
            />
          </button>

          {/* Menu Déroulant Statuts */}
          {isStatusDropdownOpen && (
            <div className="absolute right-0 mt-1.5 z-40 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <span>Filtrer par statut</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllStatuses}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline capitalize"
                  >
                    Tout
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={deselectAllStatuses}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:underline capitalize"
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
                    isAllStatusesSelected || selectedStatuses.includes(statusKey);
                  const count = taskCountByStatus[statusKey] || 0;

                  return (
                    <label
                      key={statusKey}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStatus(statusKey)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{cfg.label}</span>
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-medium">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-colors shadow-2xs"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <span>Réinitialiser</span>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-900">
                {activeFiltersCount}
              </span>
            </button>
          ) : (
            <div
              className="h-8 px-2 flex items-center gap-1 text-slate-400 text-xs"
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
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-400 font-medium mr-1">
            Filtres actifs :
          </span>

          {/* Badge recherche */}
          {searchQuery.trim().length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
              <span>« {searchQuery} »</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-rose-600 rounded-full p-0.5"
                title="Supprimer la recherche"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Badges projets filtrés */}
          {!isAllProjectsSelected &&
            selectedProjectIds.map((pid) => {
              if (pid === 'none') {
                return (
                  <span
                    key="none"
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>Sans projet</span>
                    <button
                      type="button"
                      onClick={() => toggleProject('none')}
                      className="hover:text-rose-600 rounded-full p-0.5"
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
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-200"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: proj.couleur || '#6366f1' }}
                  />
                  <span className="truncate max-w-[120px]">{proj.nom}</span>
                  <button
                    type="button"
                    onClick={() => toggleProject(proj.id)}
                    className="hover:text-rose-600 rounded-full p-0.5"
                    title={`Retirer le filtre ${proj.nom}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

          {/* Badges statuts filtrés */}
          {!isAllStatusesSelected &&
            selectedStatuses.map((st) => {
              const cfg = STATUS_CONFIG[st];
              return (
                <span
                  key={st}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
                  <span>{cfg.label}</span>
                  <button
                    type="button"
                    onClick={() => toggleStatus(st)}
                    className="hover:text-rose-600 rounded-full p-0.5"
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
            className="text-[11px] text-slate-400 hover:text-slate-700 hover:underline ml-1"
          >
            Tout effacer
          </button>
        </div>
      )}

      {/* 5. Avertissement tâches en retard dans l'espace */}
      {overdueCount > 0 && (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-100">
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
