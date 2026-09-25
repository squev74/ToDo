import React, { useState, useMemo } from 'react';
import { Tache, Projet, StatutTache } from '../../types';
import { KanbanTaskCard } from './KanbanTaskCard';
import { Inbox, Flame, AlertCircle, CheckCircle, Ban } from 'lucide-react';

interface TaskKanbanBoardProps {
  tasks: Tache[];
  projects: Projet[];
  onStatusChange: (task: Tache, newStatus: StatutTache) => void;
  onEdit: (task: Tache) => void;
  onDelete: (task: Tache) => void;
  onUpdateTitle: (taskId: string, newTitle: string) => void;
}

interface ColumnConfig {
  status: StatutTache;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  badgeBg: string;
  badgeText: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: 'Open',
    title: 'À Faire',
    icon: Inbox,
    colorClass: 'text-sky-600',
    borderClass: 'border-sky-100',
    bgClass: 'bg-sky-50/20',
    badgeBg: 'bg-sky-500',
    badgeText: 'text-white'
  },
  {
    status: 'In Progress',
    title: 'En Cours',
    icon: Flame,
    colorClass: 'text-amber-700',
    borderClass: 'border-amber-100',
    bgClass: 'bg-amber-50/10',
    badgeBg: 'bg-[#C89B7B]',
    badgeText: 'text-white'
  },
  {
    status: 'Blocked',
    title: 'Bloqué',
    icon: AlertCircle,
    colorClass: 'text-rose-700',
    borderClass: 'border-rose-100',
    bgClass: 'bg-rose-50/10',
    badgeBg: 'bg-rose-500',
    badgeText: 'text-white'
  },
  {
    status: 'Done',
    title: 'Terminé',
    icon: CheckCircle,
    colorClass: 'text-[#6B8E78]',
    borderClass: 'border-[#6B8E78]/10',
    bgClass: 'bg-[#6B8E78]/5',
    badgeBg: 'bg-[#6B8E78]',
    badgeText: 'text-white'
  },
  {
    status: 'Cancelled',
    title: 'Annulé',
    icon: Ban,
    colorClass: 'text-slate-600',
    borderClass: 'border-slate-100',
    bgClass: 'bg-slate-50/20',
    badgeBg: 'bg-slate-400',
    badgeText: 'text-white'
  }
];

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  projects,
  onStatusChange,
  onEdit,
  onDelete,
  onUpdateTitle,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<StatutTache | null>(null);

  const projectsMap = useMemo(() => {
    const map = new Map<string, Projet>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Regrouper les tâches par statut
  const tasksByColumn = useMemo(() => {
    const groups: Record<StatutTache, Tache[]> = {
      Backlog: [],
      backlog: [],
      Open: [],
      'In Progress': [],
      Blocked: [],
      Done: [],
      Cancelled: []
    };
    tasks.forEach((t) => {
      if (groups[t.statut]) {
        groups[t.statut].push(t);
      }
    });
    return groups;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: StatutTache) => {
    e.preventDefault();
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: StatutTache) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.statut !== targetStatus) {
      onStatusChange(task, targetStatus);
    }
    setDraggedId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch h-full pb-8">
      {COLUMNS.map((col) => {
        const columnTasks = tasksByColumn[col.status] || [];
        const isHovered = dragOverColumn === col.status;
        const ColIcon = col.icon;

        return (
          <div
            key={col.status}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
            className={`rounded-2xl border p-4 flex flex-col min-h-[500px] transition-all duration-300 ${
              isHovered
                ? 'border-[#6B8E78] bg-[#6B8E78]/5 ring-2 ring-[#6B8E78]/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
                : `border-[#F0EFEB] bg-white`
            }`}
          >
            {/* En-tête de la colonne */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EFEB]/80 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-slate-50 border border-[#F0EFEB] ${col.colorClass}`}>
                  <ColIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold text-[#1A1D1A] tracking-wide">
                  {col.title}
                </span>
              </div>
              <span className={`inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold ${col.badgeBg} ${col.badgeText} bg-opacity-95`}>
                {columnTasks.length}
              </span>
            </div>

            {/* Liste des cartes de tâches */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 custom-scrollbar">
              {columnTasks.length === 0 ? (
                <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#F0EFEB] rounded-xl bg-[#F9F8F6]/40">
                  <p className="text-[10px] font-light text-[#737873]">Déposez une tâche ici</p>
                </div>
              ) : (
                columnTasks.map((t) => {
                  const proj = t.projetId ? projectsMap.get(t.projetId) : undefined;
                  return (
                    <KanbanTaskCard
                      key={t.id}
                      task={t}
                      project={proj}
                      onDragStart={handleDragStart}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onUpdateTitle={onUpdateTitle}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
