import React, { useState } from 'react';
import {
  GripVertical,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  MessageSquare,
  Trash2,
  Edit3,
  ChevronDown,
  AlertTriangle,
  Send,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import { Tache, Projet, StatutTache } from '../types';
import { isTaskOverdue } from '../utils/storage';

export interface TaskItemProps {
  task: Tache;
  project?: Projet;
  index: number;
  onStatusChangeRequest?: (task: Tache, newStatus: StatutTache) => void;
  onStatusChange?: (task: Tache, newStatus: StatutTache) => void;
  onEditTask?: (task: Tache) => void;
  onEdit?: (task: Tache) => void;
  onRequestDelete?: (task: Tache) => void;
  onDelete?: (task: Tache) => void;
  onAddComment: (taskId: string, commentText: string) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  isDragOver?: boolean;
  isDragged?: boolean;
  onPromote?: (task: Tache) => void;
}

const STATUS_CONFIG: Record<
  StatutTache,
  { label: string; bg: string; text: string; border: string }
> = {
  Backlog: {
    label: 'Backlog',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
  backlog: {
    label: 'Backlog',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
  Open: {
    label: 'À faire',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  'In Progress': {
    label: 'En cours',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  Blocked: {
    label: 'Bloqué',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  Done: {
    label: 'Terminé',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
};

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  project,
  index,
  onStatusChangeRequest,
  onStatusChange,
  onEditTask,
  onEdit,
  onRequestDelete,
  onDelete,
  onAddComment,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragOver = false,
  onPromote,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // Résolution sécurisée des handlers
  const handleStatusChange = onStatusChangeRequest || onStatusChange || (() => {});
  const handleEdit = onEditTask || onEdit || (() => {});
  const handleDelete = onRequestDelete || onDelete || (() => {});

  const isDone = task.statut === 'Done';
  const isBacklog = (task.statut as string)?.toLowerCase() === 'backlog';
  const isOverdue = isTaskOverdue(task);
  const statusCfg = STATUS_CONFIG[task.statut] || STATUS_CONFIG['Open'];

  const handleQuickDoneToggle = () => {
    if (isDone) {
      handleStatusChange(task, 'Open');
    } else {
      handleStatusChange(task, 'Done');
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      id={`task-card-${task.id}`}
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragOver={(e) => onDragOver?.(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop?.(e, index)}
      className={`group rounded-lg sm:rounded-xl border transition-all duration-150 ${
        isDragOver
          ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200 shadow-md'
          : isExpanded
          ? 'border-indigo-300 bg-white shadow-xs ring-1 ring-indigo-100'
          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs'
      } ${isDone ? 'opacity-75 bg-slate-50/70' : ''}`}
    >
      {/* 1. LIGNE UNIQUE ULTRA-COMPACTE (Vue repliée par défaut, cliquable pour déplier) */}
      <div
        id={`task-card-header-${task.id}`}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="flex items-center gap-2 sm:gap-2.5 px-3 py-2 cursor-pointer select-none"
      >
        {/* Poignée de drag & drop */}
        <div
          id={`task-drag-handle-${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 transition-colors shrink-0 -ml-1 p-0.5"
          title="Glisser pour réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Bouton bascule Rapide Fait / Non Fait */}
        <button
          id={`task-toggle-done-${task.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleQuickDoneToggle();
          }}
          className="shrink-0 text-slate-400 hover:text-emerald-600 transition-colors focus:outline-hidden p-0.5"
          title={
            isDone
              ? 'Marquer comme non terminé'
              : isBacklog
              ? 'Tâche au Backlog (cliquer pour terminer)'
              : 'Marquer comme terminé'
          }
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-100" />
          ) : isBacklog ? (
            <Inbox className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
          ) : (
            <Circle className="h-4 w-4 hover:stroke-slate-600" />
          )}
        </button>

        {/* Contenu central en ligne : Titre + Badge statut + Projet + Date + Commentaires */}
        <div className="flex-1 min-w-0 flex items-center flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2">
          {/* Titre de la tâche */}
          <h4
            id={`task-title-${task.id}`}
            className={`text-xs sm:text-sm font-semibold text-slate-900 truncate leading-snug ${
              isDone ? 'line-through text-slate-400 font-normal' : ''
            }`}
            title={task.titre}
          >
            {task.titre}
          </h4>

          {/* Badge de statut compact & interactif juste à côté du titre */}
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <select
              id={`task-status-select-${task.id}`}
              value={task.statut}
              onChange={(e) => {
                handleStatusChange(task, e.target.value as StatutTache);
              }}
              className={`rounded-md border px-1.5 py-0.5 text-[11px] font-bold cursor-pointer transition-colors focus:outline-hidden focus:ring-1 focus:ring-indigo-300 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
              title="Modifier le statut"
            >
              <option value="Open">À faire</option>
              <option value="In Progress">En cours</option>
              <option value="Blocked">Bloqué</option>
              <option value="Done">Terminé</option>
              <option value="Backlog">Backlog</option>
            </select>
          </div>

          {/* Mini-badge Projet */}
          {project && (
            <span
              id={`task-project-badge-${task.id}`}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium border shrink-0 truncate max-w-[110px] sm:max-w-[150px]"
              style={{
                backgroundColor: `${project.couleur}12`,
                color: project.couleur,
                borderColor: `${project.couleur}25`,
              }}
              title={`Projet : ${project.nom}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: project.couleur }}
              />
              <span className="truncate">{project.nom}</span>
            </span>
          )}

          {/* Mini-badge Échéance / En retard */}
          {task.dateEcheance && (
            <span
              id={`task-date-badge-${task.id}`}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium border shrink-0 ${
                isOverdue
                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title={`Échéance : ${task.dateEcheance}${isOverdue ? ' (En retard)' : ''}`}
            >
              {isOverdue ? (
                <AlertTriangle className="h-3 w-3 text-rose-500" />
              ) : (
                <Calendar className="h-3 w-3 text-slate-400" />
              )}
              <span>{formatDateOnly(task.dateEcheance)}</span>
            </span>
          )}

          {/* Mini-badge Commentaires (si existants) */}
          {task.commentaires && task.commentaires.length > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium shrink-0 ml-0.5"
              title={`${task.commentaires.length} commentaire(s)`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>{task.commentaires.length}</span>
            </span>
          )}
        </div>

        {/* Actions rapides à droite : Promouvoir (si backlog) + Modifier + Supprimer + Chevron */}
        <div
          className="flex items-center gap-1 shrink-0 ml-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bouton rapide "Passer à faire" si au Backlog ou si handler passé */}
          {(onPromote || isBacklog) && (
            <button
              id={`task-promote-btn-${task.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onPromote) {
                  onPromote(task);
                } else {
                  handleStatusChange(task, 'Open');
                }
              }}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs"
              title="Transférer immédiatement vers À faire"
            >
              <ArrowRight className="h-3 w-3 stroke-[2.5]" />
              <span className="hidden sm:inline">Passer à faire</span>
            </button>
          )}

          {/* Bouton Modifier */}
          <button
            id={`task-edit-button-${task.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(task);
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Modifier la tâche"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>

          {/* Bouton Supprimer */}
          <button
            id={`task-delete-button-${task.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(task);
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Supprimer la tâche"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Chevron indicateur de dépliement avec animation rotation */}
          <div
            className="p-1 text-slate-400 hover:text-slate-700 transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            title={isExpanded ? 'Replier la tâche' : 'Déplier pour voir les détails'}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* 2. MODE ACCORDÉON DÉPLIÉ (Description complète + Commentaires + Activité) */}
      {isExpanded && (
        <div
          id={`task-expanded-details-${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4 rounded-b-lg sm:rounded-b-xl space-y-3 transition-all duration-200"
        >
          {/* Description complète */}
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Description détaillée
            </h5>
            {task.description ? (
              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                {task.description}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic bg-white/60 p-2.5 rounded-lg border border-dashed border-slate-200">
                Aucune description détaillée renseignée pour cette tâche.
              </p>
            )}
          </div>

          {/* Métadonnées détaillées */}
          {(task.dateRealisation || task.dateModification) && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              {task.dateRealisation && (
                <div className="flex items-center gap-1 text-emerald-700 font-medium">
                  <Clock className="h-3 w-3" />
                  <span>Terminé le {formatDateTime(task.dateRealisation)}</span>
                </div>
              )}
              {task.dateModification && (
                <span className="text-slate-400">
                  Mis à jour le {formatDateTime(task.dateModification)}
                </span>
              )}
            </div>
          )}

          {/* Historique des commentaires & ajout */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                <span>Notes d&apos;activité & commentaires ({task.commentaires?.length || 0})</span>
              </h5>
              <span className="text-[10px] text-slate-400">Horodatage certifié</span>
            </div>

            {/* Liste des commentaires */}
            {(!task.commentaires || task.commentaires.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-1">
                Aucun commentaire enregistré pour le moment.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {task.commentaires.map((comm) => (
                  <div
                    key={comm.id}
                    id={`comment-${comm.id}`}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-700">Note d&apos;activité</span>
                      <span>{formatDateTime(comm.date)}</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {comm.texte}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire ajout rapide de commentaire */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-1">
              <input
                id={`task-new-comment-input-${task.id}`}
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Ajouter une note ou un point d'avancement..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-200"
              />
              <button
                id={`task-add-comment-btn-${task.id}`}
                type="submit"
                disabled={!newCommentText.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3 w-3" />
                <span>Publier</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Export alias TaskCard pour compatibilité
export const TaskCard = TaskItem;
export type TaskCardProps = TaskItemProps;
