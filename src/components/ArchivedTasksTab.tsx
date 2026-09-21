import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, Calendar, Folder, RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Task, Projet } from '../types';
import { getArchivedTasks, ArchiveFilters } from '../utils/taskFilters';

interface ArchivedTasksTabProps {
  tasks: Task[];
  projects: Projet[];
  onReopenTask: (task: Task) => void;
}

export const ArchivedTasksTab: React.FC<ArchivedTasksTabProps> = ({
  tasks,
  projects,
  onReopenTask,
}) => {
  const [filters, setFilters] = useState<ArchiveFilters>({
    projectId: 'all',
    startDate: '',
    endDate: '',
    searchQuery: '',
  });

  // Mémoriser la map des projets pour un accès rapide (id -> Projet)
  const projectsMap = useMemo(() => {
    const map = new Map<string, Projet>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filtrer les tâches archivées de manière réactive
  const archivedTasks = useMemo(() => {
    return getArchivedTasks(tasks, filters);
  }, [tasks, filters]);

  const handleResetFilters = () => {
    setFilters({
      projectId: 'all',
      startDate: '',
      endDate: '',
      searchQuery: '',
    });
  };

  const handleFilterChange = (key: keyof ArchiveFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Formater joliment la date d'achèvement
  const formatCompletionDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 bg-[#FAF8F5] rounded-xl border border-[#EDEAE4] shadow-sm text-[#4A4742]"
    >
      {/* En-tête Japandi épuré */}
      <div className="border-b border-[#EDEAE4] pb-5">
        <h2 className="text-xl font-medium tracking-tight text-[#2A2824] font-serif">
          Archives Historiques
        </h2>
        <p className="text-xs text-[#8C877E] mt-1">
          Visualisez, recherchez et restaurez les tâches clôturées depuis plus de 30 jours.
        </p>
      </div>

      {/* Barre de Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-[#F5F2EC] p-4 rounded-lg border border-[#EDEAE4]">
        {/* Recherche libre */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#8C877E] block">
            Recherche libre
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C877E]" />
            <input
              type="text"
              placeholder="Titre, description..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="pl-9 pr-4 py-1.5 w-full bg-white border border-[#DDD9CE] rounded text-xs focus:ring-1 focus:ring-[#8C877E] focus:border-[#8C877E] outline-none transition-all placeholder:text-[#BFB9AD]"
            />
          </div>
        </div>

        {/* Projet */}
        <div className="md:col-span-3 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#8C877E] block">
            Projet
          </label>
          <select
            value={filters.projectId}
            onChange={(e) => handleFilterChange('projectId', e.target.value)}
            className="px-3 py-1.5 w-full bg-white border border-[#DDD9CE] rounded text-xs focus:ring-1 focus:ring-[#8C877E] focus:border-[#8C877E] outline-none transition-all text-[#4A4742]"
          >
            <option value="all">Tous les projets</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Date de début */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#8C877E] block">
            Clôture du
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="px-3 py-1.5 w-full bg-white border border-[#DDD9CE] rounded text-xs focus:ring-1 focus:ring-[#8C877E] focus:border-[#8C877E] outline-none transition-all text-[#4A4742]"
            />
          </div>
        </div>

        {/* Date de fin */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[#8C877E] block">
            Au
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="px-3 py-1.5 w-full bg-white border border-[#DDD9CE] rounded text-xs focus:ring-1 focus:ring-[#8C877E] focus:border-[#8C877E] outline-none transition-all text-[#4A4742]"
            />
          </div>
        </div>

        {/* Réinitialisation */}
        <div className="md:col-span-1">
          <button
            onClick={handleResetFilters}
            title="Réinitialiser les filtres"
            className="flex items-center justify-center p-2 bg-white border border-[#DDD9CE] hover:bg-[#FAF8F5] active:bg-[#EDEAE4] rounded w-full text-xs text-[#8C877E] hover:text-[#4A4742] transition-colors shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Message indicatif du total */}
      <div className="flex justify-between items-center text-xs text-[#8C877E]">
        <div>
          {archivedTasks.length === 0 ? (
            <span>Aucune tâche trouvée</span>
          ) : (
            <span>
              <strong>{archivedTasks.length}</strong> tâche{archivedTasks.length > 1 ? 's' : ''} archivée{archivedTasks.length > 1 ? 's' : ''} correspondant aux critères.
            </span>
          )}
        </div>
      </div>

      {/* Grille / Liste de tâches */}
      {archivedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-[#F9F8F6] rounded-lg border border-dashed border-[#DDD9CE]">
          <Inbox className="h-10 w-10 text-[#BFB9AD] stroke-[1.25]" />
          <h3 className="text-sm font-medium text-[#4A4742] mt-4 font-serif">Aucune tâche archivée</h3>
          <p className="text-xs text-[#8C877E] mt-1 max-w-md text-center px-4">
            Ajustez vos filtres ou effectuez une recherche pour retrouver des tâches historiques terminées de plus de 30 jours.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-[#EDEAE4] shadow-sm">
          <table className="min-w-full divide-y divide-[#EDEAE4] text-left text-xs text-[#4A4742]">
            <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-wider font-semibold text-[#8C877E]">
              <tr>
                <th scope="col" className="p-4 w-28">Clé JIRA / ID</th>
                <th scope="col" className="p-4">Titre</th>
                <th scope="col" className="p-4 w-44">Projet</th>
                <th scope="col" className="p-4 w-36">Terminée le</th>
                <th scope="col" className="p-4 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEAE4]">
              {archivedTasks.map((task) => {
                const project = task.projetId ? projectsMap.get(task.projetId) : undefined;
                return (
                  <tr key={task.id} className="hover:bg-[#FAF9F5] transition-colors">
                    {/* Clé JIRA / ID */}
                    <td className="p-4 font-mono font-bold text-[#8C877E] whitespace-nowrap">
                      {task.jiraKey || `#${task.id.slice(0, 6)}`}
                    </td>

                    {/* Titre & Description */}
                    <td className="p-4">
                      <div className="font-semibold text-[#2A2824]">{task.titre}</div>
                      {task.description && (
                        <p className="text-[#8C877E] text-[11px] mt-0.5 line-clamp-2 max-w-lg">
                          {task.description}
                        </p>
                      )}
                    </td>

                    {/* Projet */}
                    <td className="p-4 whitespace-nowrap">
                      {project ? (
                        <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                             style={{
                               backgroundColor: `${project.couleur}15`,
                               color: project.couleur
                             }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.couleur }} />
                          <span>{project.nom}</span>
                        </div>
                      ) : (
                        <span className="text-[#BFB9AD]">-</span>
                      )}
                    </td>

                    {/* Date d'achèvement */}
                    <td className="p-4 whitespace-nowrap text-[#8C877E]">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatCompletionDate(task.dateRealisation)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onReopenTask(task)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 hover:border-amber-300 transition-all cursor-pointer"
                        title="Réintégrer dans le flux actif"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Réouvrir</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};
