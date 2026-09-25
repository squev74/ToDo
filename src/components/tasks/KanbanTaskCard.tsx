import React, { useState } from 'react';
import { GripVertical, Calendar, Sparkles, Edit3, Trash2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { Tache, Projet } from '../../types';
import { isTaskOverdue } from '../../utils/storage';
import { getTaskInactivityState } from '../../services/taskService';
import { AiTaskRefiner } from '../AiTaskRefiner';

interface KanbanTaskCardProps {
  task: Tache;
  project?: Projet;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onEdit: (task: Tache) => void;
  onDelete: (task: Tache) => void;
  onUpdateTitle: (taskId: string, newTitle: string) => void;
}

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({
  task,
  project,
  onDragStart,
  onEdit,
  onDelete,
  onUpdateTitle,
}) => {
  const [showRefiner, setShowRefiner] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);

  const overdue = isTaskOverdue(task);
  const inactivityState = getTaskInactivityState(task);

  // Formater l'affichage de la date d'échéance
  const formattedDueDate = task.dateEcheance ? (() => {
    const parts = task.dateEcheance.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return task.dateEcheance;
  })() : null;

  const handleApplyRefinement = (refinedTitle: string) => {
    onUpdateTitle(task.id, refinedTitle);
    setShowRefiner(false);
  };

  // Séparer intelligemment les clics du Drag & Drop par détection de mouvement minimal (< 5 pixels)
  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseDownPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseDownPos) return;
    const dx = Math.abs(e.clientX - mouseDownPos.x);
    const dy = Math.abs(e.clientY - mouseDownPos.y);
    setMouseDownPos(null);

    if (dx < 5 && dy < 5) {
      const target = e.target as HTMLElement;
      // Ne pas ouvrir la modale si l'utilisateur clique sur un bouton d'action rapide ou un formulaire d'édition
      if (target.closest('button') || target.closest('input') || target.closest('.ai-refiner-container')) {
        return;
      }
      onEdit(task);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="group relative rounded-xl border border-[#F0EFEB] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-[#6B8E78]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-2.5 animate-in fade-in duration-200"
    >
      {/* Barre de drag supérieure & Actions rapides */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[#D3CFC8] group-hover:text-[#737873] transition-colors shrink-0">
            <GripVertical className="h-4 w-4" />
          </span>
          {project ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium border transition-all"
              style={{
                backgroundColor: `${project.couleur}12`,
                borderColor: `${project.couleur}25`,
                color: project.couleur,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.couleur }} />
              <span className="truncate max-w-[100px]">{project.nom}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#F9F8F6] border border-[#F0EFEB] px-2 py-0.5 text-[10px] font-medium text-[#737873]">
              Général
            </span>
          )}
        </div>

        {/* Boutons d'action carte (discrets, n'interfèrent pas avec le clic grâce à stopPropagation) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowRefiner(!showRefiner);
            }}
            className="rounded-md p-1 text-[#737873] hover:bg-[#6B8E78]/10 hover:text-[#4e634a] transition-all"
            title="Clarifier le titre avec l'IA"
          >
            <Sparkles className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="rounded-md p-1 text-[#737873] hover:bg-[#F9F8F6] hover:text-[#1A1D1A] transition-all"
            title="Modifier la tâche"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
            className="rounded-md p-1 text-[#737873] hover:bg-rose-50 hover:text-rose-600 transition-all"
            title="Supprimer la tâche"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Titre & Éventuel module de reformulation IA */}
      <div className="space-y-1.5">
        {!showRefiner ? (
          <h4 className="text-xs font-medium text-[#1A1D1A] leading-relaxed break-words">
            {task.titre}
          </h4>
        ) : (
          <div className="ai-refiner-container space-y-1 bg-[#F9F8F6] p-2.5 rounded-lg border border-[#F0EFEB]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-semibold text-[#6B8E78] uppercase tracking-wider">Polissage IA</span>
              <button onClick={() => setShowRefiner(false)} className="text-[#737873] hover:text-[#1A1D1A]">
                <X className="h-3 w-3" />
              </button>
            </div>
            <AiTaskRefiner currentValue={task.titre} onApplyRefinement={handleApplyRefinement} />
          </div>
        )}

        {/* Rendu des badges d'alertes & raisons sur la carte */}
        <div className="flex flex-wrap gap-1.5">
          {/* Alerte de Blocage */}
          {task.statut === 'Blocked' && (
            <div 
              className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-100 px-1.5 py-0.5 text-[9px] text-rose-700 font-medium cursor-help"
              title={task.commentaires?.find(c => c.texte.startsWith('Bloqué'))?.texte || 'Tâche bloquée sans motif'}
            >
              <AlertCircle className="h-2.5 w-2.5 text-rose-500" />
              <span>Sujet Bloqué</span>
            </div>
          )}

          {/* Alerte de non-activité */}
          {inactivityState.isApplicable && inactivityState.tier !== 'recent' && (
            <div className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium ${inactivityState.colorClass} ${inactivityState.badgeBgClass} ${inactivityState.badgeBorderClass}`}>
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Stagnant</span>
            </div>
          )}

          {/* Raison d'annulation au survol */}
          {task.statut === 'Cancelled' && task.cancellationReason && (
            <div 
              className="inline-flex items-center gap-1 rounded bg-[#C89B7B]/10 border border-[#C89B7B]/20 px-1.5 py-0.5 text-[9px] text-[#966847] font-medium cursor-help"
              title={`Raison de l'annulation : ${task.cancellationReason}`}
            >
              <span>Annulé : Raison au survol</span>
            </div>
          )}
        </div>
      </div>

      {/* Date d'échéance inférieure */}
      {formattedDueDate && (
        <div className="mt-1 pt-2.5 border-t border-[#F0EFEB]/50 flex items-center justify-between text-[10px] text-[#737873] font-light">
          <div className="flex items-center gap-1">
            <Calendar className={`h-3 w-3 ${overdue ? 'text-rose-500' : 'text-[#737873]'}`} />
            <span className={overdue ? 'text-rose-600 font-medium' : ''}>
              Échéance : {formattedDueDate}
            </span>
          </div>
          {overdue && (
            <span className="rounded bg-rose-50 px-1 py-0.5 text-[8px] font-semibold text-rose-700 uppercase tracking-wider">
              En retard
            </span>
          )}
        </div>
      )}
    </div>
  );
};
