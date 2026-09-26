import React, { useState, useMemo } from 'react';
import {
  GripVertical,
  Check,
  Calendar,
  Clock,
  MessageSquare,
  Trash2,
  Edit3,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Send,
  ArrowRight,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { Tache, Projet, StatutTache } from '../types';
import { isTaskOverdue } from '../utils/storage';
import {
  getTaskInactivityState,
  getTaskEffectiveActivityDate,
  formatLastActivityDate,
} from '../services/taskService';

export interface TaskCardProps {
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
  onQuickLogTime?: (jiraKey: string, hours: number, comment: string) => void;
}

export type TaskItemProps = TaskCardProps;

// CONFIGURATION VIVANTE & FORTEMENT CONTRASTÉE DES STATUTS
export const VIBRANT_STATUS_CONFIG: Record<
  StatutTache,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  Backlog: {
    label: 'Backlog',
    bg: 'bg-purple-100',
    text: 'text-purple-700 font-semibold',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
  backlog: {
    label: 'Backlog',
    bg: 'bg-purple-100',
    text: 'text-purple-700 font-semibold',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
  Open: {
    label: 'À Faire',
    bg: 'bg-sky-500',
    text: 'text-white font-medium',
    border: 'border-sky-600',
    dot: 'bg-white',
  },
  'In Progress': {
    label: 'En Cours',
    bg: 'bg-amber-400',
    text: 'text-amber-950 font-semibold',
    border: 'border-amber-500',
    dot: 'bg-amber-950',
  },
  Blocked: {
    label: 'Bloqué',
    bg: 'bg-red-500',
    text: 'text-white font-bold',
    border: 'border-red-600',
    dot: 'bg-white',
  },
  Done: {
    label: 'Terminé',
    bg: 'bg-emerald-500',
    text: 'text-white font-medium',
    border: 'border-emerald-600',
    dot: 'bg-white',
  },
  Cancelled: {
    label: 'Annulé',
    bg: 'bg-rose-500',
    text: 'text-white font-medium',
    border: 'border-rose-600',
    dot: 'bg-white',
  },
};

// PALETTE DYNAMIQUE SATURÉE POUR LES PROJETS
export const VIBRANT_PROJECT_PALETTES = [
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', dot: '#4F46E5' },
  { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', dot: '#0D9488' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300', dot: '#E11D48' },
  { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-400', dot: '#65A30D' },
  { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300', dot: '#0891B2' },
  { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', dot: '#D97706' },
  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300', dot: '#7C3AED' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-300', dot: '#C026D3' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: '#059669' },
  { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300', dot: '#EA580C' },
];

export function getProjectVibrantStyle(projectId: string, projectName: string, customColor?: string) {
  let hash = 0;
  const seed = (projectId || projectName || 'default').toLowerCase();
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % VIBRANT_PROJECT_PALETTES.length;
  const palette = VIBRANT_PROJECT_PALETTES[idx];
  return {
    ...palette,
    dotColor: customColor || palette.dot,
  };
}

export const TaskCard: React.FC<TaskCardProps> = ({
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
  onQuickLogTime,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [loggedHours, setLoggedHours] = useState<number | null>(null);

  // Handlers sécurisés
  const handleStatusChange = onStatusChangeRequest || onStatusChange || (() => {});
  const handleEdit = onEditTask || onEdit || (() => {});
  const handleDelete = onRequestDelete || onDelete || (() => {});

  const isDone = task.statut === 'Done';
  const isCancelled = task.statut === 'Cancelled';
  const isBacklog = (task.statut as string)?.toLowerCase() === 'backlog';
  const isOverdue = !isDone && !isCancelled && isTaskOverdue(task);
  const statusCfg = VIBRANT_STATUS_CONFIG[task.statut] || VIBRANT_STATUS_CONFIG['Open'];

  // Style de pastille projet dynamique
  const projectStyle = project
    ? getProjectVibrantStyle(project.id, project.nom, project.couleur)
    : null;

  // Inactivité
  const inactivityState = useMemo(() => {
    return getTaskInactivityState(task);
  }, [task]);

  const effectiveActivityIso = useMemo(() => {
    return getTaskEffectiveActivityDate(task);
  }, [task]);

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
      className={`group relative rounded-xl sm:rounded-2xl border bg-white shadow-xs transition-all duration-200 ease-out ${
        isOverdue
          ? 'border-l-4 border-l-rose-500 border-rose-300 bg-white hover:border-rose-400 hover:shadow-md'
          : isDragOver
          ? 'border-sky-500 bg-sky-50/40 ring-1 ring-sky-300'
          : isExpanded
          ? 'border-slate-300 ring-1 ring-slate-200 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      } ${isDone || isCancelled ? 'opacity-65 bg-slate-50/70' : ''}`}
    >
      {/* LIGNE PRINCIPALE DE LA CARTE */}
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
        className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 cursor-pointer select-none"
      >
        {/* Poignée de réorganisation discrète */}
        <div
          id={`task-drag-handle-${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 transition-colors duration-200 shrink-0 -ml-1 p-0.5"
          title="Glisser pour réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* CHECKBOX CIRCULAIRE DE VALIDATION */}
        <button
          id={`task-toggle-done-${task.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleQuickDoneToggle();
          }}
          className={`relative shrink-0 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-200 ease-out focus:outline-none ${
            isDone
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
              : 'border-slate-300 bg-white hover:border-sky-500 hover:bg-sky-50 text-transparent'
          }`}
          title={
            isDone
              ? 'Marquer comme à faire'
              : isBacklog
              ? 'Tâche du Backlog (cliquer pour terminer)'
              : 'Marquer comme terminé'
          }
        >
          <Check
            className={`h-3 w-3 stroke-[2.5] transition-transform duration-200 ${
              isDone ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
          />
        </button>

        {/* CORPS DE LA CARTE : Titre et Badges Vifs */}
        <div className="flex-1 min-w-0 flex items-center flex-wrap sm:flex-nowrap gap-2">
          {/* Titre de la tâche */}
          <h4
            id={`task-title-${task.id}`}
            className={`text-sm font-medium tracking-tight transition-colors duration-200 truncate leading-snug ${
              isDone || isCancelled
                ? 'line-through text-slate-400'
                : 'text-slate-900 group-hover:text-black'
            }`}
            title={task.cancellationReason ? `${task.titre} (Motif : ${task.cancellationReason})` : task.titre}
          >
            {task.titre}
          </h4>

          {/* BADGE DE STATUT VIF ET COLORÉ (Backlog, À faire, En cours, Bloqué, Terminé) */}
          {!isBacklog && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <select
                id={`task-status-select-${task.id}`}
                value={task.statut}
                onChange={(e) => {
                  handleStatusChange(task, e.target.value as StatutTache);
                }}
                className={`rounded-lg border px-2.5 py-0.5 text-xs cursor-pointer transition-all duration-200 focus:outline-none shadow-2xs ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                title={task.cancellationReason ? `Motif d'annulation : ${task.cancellationReason}` : "Modifier le statut"}
              >
                <option value="Backlog" className="bg-white text-purple-700 font-semibold">Backlog</option>
                <option value="Open" className="bg-white text-sky-600 font-medium">À Faire</option>
                <option value="In Progress" className="bg-white text-amber-900 font-semibold">En Cours</option>
                <option value="Blocked" className="bg-white text-red-600 font-bold">Bloqué</option>
                <option value="Done" className="bg-white text-emerald-600 font-medium">Terminé</option>
                <option value="Cancelled" className="bg-white text-rose-600 font-medium">Annulé</option>
              </select>
            </div>
          )}

          {/* PASTILLE DE PROJET DYNAMIQUE & SATURÉE (Indigo, Teal, Rose, Lime, Cyan, etc.) */}
          {project && projectStyle && (
            <span
              id={`task-project-badge-${task.id}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border shrink-0 truncate max-w-[150px] shadow-2xs transition-transform hover:scale-[1.02] ${projectStyle.bg} ${projectStyle.text} ${projectStyle.border}`}
              title={`Projet : ${project.nom}`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0 ring-1 ring-white/60 shadow-2xs"
                style={{ backgroundColor: projectStyle.dotColor }}
              />
              <span className="truncate">{project.nom}</span>
            </span>
          )}

          {/* BADGE DE CLÉ JIRA SI PRÉSENT */}
          {task.jiraKey && (
            <span
              id={`task-jirakey-badge-${task.id}`}
              className="inline-flex items-center gap-1 bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold text-[10px] shadow-2xs shrink-0 tracking-wider transition-transform hover:scale-105"
              title={`Clé JIRA associée : ${task.jiraKey}. Cliquer pour déplier et imputer du temps rapidement.`}
            >
              <span>{task.jiraKey}</span>
            </span>
          )}

          {/* HIGHLIGHT ALERTE TÂCHE EN RETARD (Badge Rouge Vif Néon) */}
          {isOverdue && (
            <span
              id={`task-overdue-tag-${task.id}`}
              className="inline-flex items-center gap-1 bg-rose-600 text-white px-2 py-0.5 rounded-md font-bold text-xs shadow-xs animate-pulse shrink-0 tracking-wide"
              title="Alerte : Date d'échéance dépassée !"
            >
              <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>EN RETARD</span>
            </span>
          )}

          {/* Échéance bien visible & contrastée */}
          {task.dateEcheance && (
            <span
              id={`task-date-badge-${task.id}`}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs border shrink-0 ${
                isOverdue
                  ? 'border-rose-400 bg-rose-100 text-rose-800 font-bold shadow-2xs'
                  : 'border-slate-200 bg-slate-100 text-slate-700 font-medium'
              }`}
              title={`Échéance : ${task.dateEcheance}${isOverdue ? ' (En retard)' : ''}`}
            >
              {isOverdue ? (
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 stroke-[2.5]" />
              ) : (
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>{formatDateOnly(task.dateEcheance)}</span>
            </span>
          )}

          {/* Badge de réveil planifié pour le Backlog */}
          {isBacklog && task.activationDate && (
            <span
              id={`task-activation-badge-${task.id}`}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-800 px-2.5 py-0.5 text-xs font-semibold shrink-0"
              title={`Réveil programmé le : ${task.activationDate}`}
            >
              <Clock className="h-3.5 w-3.5 text-purple-600" />
              <span>Réveil : {formatDateOnly(task.activationDate)}</span>
            </span>
          )}

          {/* Tag inactivité prolongée (si >= 7j et non terminée) */}
          {!isOverdue && !isDone && inactivityState.isApplicable && inactivityState.days >= 7 && (
            <span
              id={`task-inactivity-alert-${task.id}`}
              className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2 py-0.5 text-xs font-bold shrink-0 shadow-2xs"
              title={`Tâche inactive depuis ${inactivityState.days} jours (${inactivityState.label})`}
            >
              <Clock className="h-3 w-3 stroke-[2.5]" />
              <span>{inactivityState.days}j inactif</span>
            </span>
          )}

          {/* Indicateur d'inactivité régulier (si < 7j) */}
          {inactivityState.isApplicable && (!isOverdue && inactivityState.days < 7) && (
            <div
              id={`task-inactivity-indicator-${task.id}`}
              className="relative group/inactivity inline-flex items-center shrink-0"
              title={inactivityState.label}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 cursor-help hover:bg-slate-100 transition-colors">
                <Clock className="h-3 w-3 text-slate-500" />
                <span className="font-medium">
                  {inactivityState.days === 0 ? '< 1j' : `${inactivityState.days}j`}
                </span>
              </div>

              {/* Bulle d'information */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/inactivity:flex flex-col items-center pointer-events-none z-30 whitespace-nowrap">
                <div className="bg-slate-900 text-white text-xs font-normal px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-emerald-400" />
                  <span>{inactivityState.label}</span>
                </div>
                <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
              </div>
            </div>
          )}

          {/* Commentaires */}
          {task.commentaires && task.commentaires.length > 0 && (
            <span
              className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium shrink-0 ml-0.5"
              title={`${task.commentaires.length} note(s) ou commentaire(s)`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              <span>{task.commentaires.length}</span>
            </span>
          )}
        </div>

        {/* ACTIONS SECONDAIRES À DROITE */}
        <div
          className="flex items-center gap-1 shrink-0 ml-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action rapide passer à faire si backlog */}
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
              className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-500 hover:text-white transition-all duration-200 shadow-2xs"
              title="Passer immédiatement à Faire"
            >
              <ArrowRight className="h-3 w-3" />
              <span className="hidden sm:inline">À faire</span>
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
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-200"
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
            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-200"
            title="Supprimer la tâche"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Chevron de déploiement animé */}
          <div
            className="p-1 text-slate-400 hover:text-slate-800 transition-transform duration-200 ease-out"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            title={isExpanded ? 'Replier les détails' : 'Déplier les détails'}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* ACCORDÉON DÉPLIÉ (Détails & Commentaires) */}
      {isExpanded && (
        <div
          id={`task-expanded-details-${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 rounded-b-xl sm:rounded-b-2xl space-y-4 animate-in fade-in duration-150"
        >
          {/* Description */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Description
            </h5>
            {task.description ? (
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-normal bg-white p-3 rounded-xl border border-slate-200">
                {task.description}
              </p>
            ) : (
              <p className="text-xs italic text-slate-400">
                Aucune description fournie.
              </p>
            )}
          </div>

          {/* Raison d'annulation (si renseignée) */}
          {task.cancellationReason && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                Raison de l&apos;annulation
              </h5>
              <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap font-normal bg-rose-50/50 p-3 rounded-xl border border-rose-200 shadow-2xs">
                {task.cancellationReason}
              </p>
            </div>
          )}

          {/* Horodatages d'activité */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-2 border-t border-slate-200">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Dernière activité : <strong className="text-slate-700 font-medium">{formatLastActivityDate(effectiveActivityIso)}</strong></span>
            </span>
            {task.dateRealisation && (() => {
              const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
              const elapsedMs = Date.now() - new Date(task.dateRealisation).getTime();
              const remainingDays = Math.ceil((THIRTY_DAYS_MS - elapsedMs) / (24 * 60 * 60 * 1000));
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3 stroke-[3]" />
                    Terminée le : {formatDateOnly(task.dateRealisation)}
                  </span>
                  {remainingDays > 0 && remainingDays <= 30 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Archivage automatique dans {remainingDays} jour{remainingDays > 1 ? 's' : ''}
                    </span>
                  ) : null}
                </div>
              );
            })()}
          </div>

          {/* SAISIE DU TEMPS RAPIDE JIRA */}
          {task.jiraKey && (
            <div
              id={`task-quick-time-tracker-${task.id}`}
              className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  Saisie de temps rapide (JIRA : {task.jiraKey})
                </h5>
                <span className="text-[10px] text-indigo-600/70">Aujourd&apos;hui</span>
              </div>

              {loggedHours !== null ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold animate-in fade-in duration-150">
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>+{loggedHours}h loggées avec succès sur {task.jiraKey} !</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600 mr-1 font-medium">Imputer :</span>
                  {[1, 2, 4].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => {
                        if (onQuickLogTime) {
                          onQuickLogTime(
                            task.jiraKey!,
                            hours,
                            `Imputation rapide depuis la tâche : ${task.titre}`
                          );
                          setLoggedHours(hours);
                          setTimeout(() => setLoggedHours(null), 2500);
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                      +{hours}h
                    </button>
                  ))}
                  <p className="text-[10px] text-slate-500 italic ml-auto shrink-0">
                    S&apos;ajoute à votre feuille de temps mensuelle
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Fil de commentaires */}
          <div className="pt-2 border-t border-slate-200 space-y-2.5">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Notes & Commentaires ({task.commentaires?.length || 0})
            </h5>

            {task.commentaires && task.commentaires.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {task.commentaires.map((comm) => (
                  <div
                    key={comm.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">{comm.auteur || 'Note'}</span>
                      <span>{formatDateTime(comm.date)}</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                      {comm.texte}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire d'ajout de note */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Ajouter une note ou un suivi..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all shadow-2xs"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 active:scale-95 disabled:opacity-40 transition-all shadow-xs"
              >
                <span>Envoyer</span>
                <Send className="h-3 w-3" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const TaskItem = TaskCard;
export default TaskCard;
