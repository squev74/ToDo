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
  ChevronUp,
  AlertTriangle,
  Folder,
  Send,
} from 'lucide-react';
import { Tache, Projet, StatutTache } from '../types';
import { isTaskOverdue } from '../utils/storage';

interface TaskItemProps {
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
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragOver: boolean;
  isDragged?: boolean;
}

const STATUS_CONFIG: Record<
  StatutTache,
  { label: string; bg: string; text: string; border: string }
> = {
  Open: {
    label: 'À faire',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
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
  isDragOver,
  isDragged,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // Résolution sécurisée des handlers pour supporter onStatusChangeRequest et onStatusChange
  const handleStatusChange = onStatusChangeRequest || onStatusChange || (() => {});
  const handleEdit = onEditTask || onEdit || (() => {});
  const handleDelete = onRequestDelete || onDelete || (() => {});

  const isDone = task.statut === 'Done';
  const isOverdue = isTaskOverdue(task);
  const statusCfg = STATUS_CONFIG[task.statut];

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
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={`group relative rounded-xl border transition-all duration-150 ${
        isDragOver
          ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-200 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
      } ${isDone ? 'opacity-70 bg-slate-50/80' : ''}`}
    >
      {/* Contenu principal de la carte */}
      <div className="flex items-start gap-3 p-4">
        {/* Poignée de drag & drop */}
        <div
          id={`task-drag-handle-${task.id}`}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 transition-colors shrink-0"
          title="Glisser pour réordonner"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Bouton bascule Rapide Fait/Non Fait */}
        <button
          id={`task-toggle-done-${task.id}`}
          type="button"
          onClick={handleQuickDoneToggle}
          className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors focus:outline-hidden"
          title={isDone ? 'Marquer comme non terminé' : 'Marquer comme terminé'}
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100" />
          ) : (
            <Circle className="h-5 w-5 hover:stroke-slate-600" />
          )}
        </button>

        {/* Bloc central: Titre, badges, description */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Titre */}
            <h4
              id={`task-title-${task.id}`}
              className={`text-sm font-semibold text-slate-900 break-words ${
                isDone ? 'line-through text-slate-500' : ''
              }`}
            >
              {task.titre}
            </h4>

            {/* Badge Projet */}
            {project && (
              <span
                id={`task-project-badge-${task.id}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border"
                style={{
                  backgroundColor: `${project.couleur}15`,
                  color: project.couleur,
                  borderColor: `${project.couleur}30`,
                }}
              >
                <Folder className="h-3 w-3" />
                {project.nom}
              </span>
            )}

            {/* Badge En Retard */}
            {isOverdue && (
              <span
                id={`task-overdue-badge-${task.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200"
              >
                <AlertTriangle className="h-3 w-3" />
                En retard
              </span>
            )}
          </div>

          {/* Description courte si présente */}
          {task.description && (
            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Métadonnées : Échéance, Date réalisation, Commentaires */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {/* Statut sélecteur interactif */}
            <div className="flex items-center gap-1">
              <label htmlFor={`task-status-select-${task.id}`} className="sr-only">
                Statut
              </label>
              <select
                id={`task-status-select-${task.id}`}
                value={task.statut}
                onChange={(e) =>
                  handleStatusChange(task, e.target.value as StatutTache)
                }
                className={`rounded-md border px-2 py-0.5 text-xs font-semibold cursor-pointer transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-300 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
              >
                <option value="Open">À faire</option>
                <option value="In Progress">En cours</option>
                <option value="Blocked">Bloqué</option>
                <option value="Done">Terminé</option>
              </select>
            </div>

            {/* Date d'échéance */}
            {task.dateEcheance && (
              <div
                className={`flex items-center gap-1 ${
                  isOverdue ? 'text-rose-600 font-medium' : 'text-slate-500'
                }`}
                title={`Date d'échéance : ${task.dateEcheance}`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Échéance : {formatDateOnly(task.dateEcheance)}</span>
              </div>
            )}

            {/* Date de réalisation (si Done) */}
            {task.dateRealisation && (
              <div
                className="flex items-center gap-1 text-emerald-700 font-medium"
                title={`Clôturé le : ${task.dateRealisation}`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Terminé le {formatDateTime(task.dateRealisation)}</span>
              </div>
            )}

            {/* Bouton dépliant des commentaires */}
            <button
              id={`task-comments-toggle-${task.id}`}
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 hover:text-indigo-600 transition-colors font-medium ml-auto sm:ml-0"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{task.commentaires?.length || 0}</span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* Actions : Modifier et Supprimer */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            id={`task-edit-button-${task.id}`}
            type="button"
            onClick={() => handleEdit(task)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Modifier la tâche"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            id={`task-delete-button-${task.id}`}
            type="button"
            onClick={() => handleDelete(task)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Supprimer la tâche"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Accordéon dépliable : Historique immuable des commentaires + ajout */}
      {isExpanded && (
        <div
          id={`task-comments-section-${task.id}`}
          className="border-t border-slate-100 bg-slate-50/70 p-4 rounded-b-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Historique des commentaires ({task.commentaires?.length || 0})
            </h5>
            <span className="text-[11px] text-slate-400">Horodatage certifié</span>
          </div>

          {/* Liste immuable */}
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
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
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

          {/* Formulaire ajout commentaire */}
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
      )}
    </div>
  );
};
