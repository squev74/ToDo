import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  MessageSquare,
  Clock,
  Folder,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Tache, Projet } from '../types';
import { getTodayDateString } from '../utils/storage';

interface DailyReportPanelProps {
  tasks: Tache[];
  projects: Projet[];
}

export const DailyReportPanel: React.FC<DailyReportPanelProps> = ({ tasks, projects }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Projets map pour accès rapide
  const projectsMap = new Map<string, Projet>();
  projects.forEach((p) => projectsMap.set(p.id, p));

  // 1. Tâches clôturées à cette date exacte (comparaison dateRealisation YYYY-MM-DD)
  const completedTasksOnDate = tasks.filter((t) => {
    if (!t.dateRealisation) return false;
    // Format ISO "2026-09-11T14:30:00.000Z" -> "2026-09-11"
    const realisationDatePart = t.dateRealisation.split('T')[0];
    return realisationDatePart === selectedDate;
  });

  // 2. Ensemble des commentaires rédigés à cette date exacte sur toutes les tâches
  interface CommentReportItem {
    id: string;
    taskTitle: string;
    taskId: string;
    project?: Projet;
    texte: string;
    date: string;
  }

  const commentsOnDate: CommentReportItem[] = [];
  tasks.forEach((task) => {
    const proj = task.projetId ? projectsMap.get(task.projetId) : undefined;
    task.commentaires?.forEach((comm) => {
      const commDatePart = comm.date.split('T')[0];
      if (commDatePart === selectedDate) {
        commentsOnDate.push({
          id: comm.id,
          taskTitle: task.titre,
          taskId: task.id,
          project: proj,
          texte: comm.texte,
          date: comm.date,
        });
      }
    });
  });

  // Tri des commentaires du plus récent au plus ancien
  commentsOnDate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Raccourcis de date
  const setDateRelative = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const formatReadableDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeOnly = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const isToday = selectedDate === getTodayDateString();

  return (
    <div id="daily-report-section" className="space-y-6">
      {/* En-tête avec Sélecteur de date */}
      <div
        id="daily-report-header"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Calendar className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Rapport d&apos;Activité Journalier
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 capitalize">
              {formatReadableDate(selectedDate)} {isToday && '• (Aujourd’hui)'}
            </p>
          </div>

          {/* Contrôles de sélection de date */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 p-0.5">
              <button
                id="quick-date-yesterday"
                type="button"
                onClick={() => setDateRelative(-1)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:shadow-2xs transition-all"
              >
                Hier
              </button>
              <button
                id="quick-date-today"
                type="button"
                onClick={() => setDateRelative(0)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  isToday
                    ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                    : 'text-slate-700 hover:bg-white hover:shadow-2xs'
                }`}
              >
                Aujourd&apos;hui
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="daily-report-date-input" className="sr-only">
                Choisir une date
              </label>
              <input
                id="daily-report-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>

        {/* Métriques synthétiques */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            id="metric-completed-card"
            className="flex items-center gap-3.5 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-900">Tâches clôturées</p>
              <p className="text-xl font-bold text-emerald-700">
                {completedTasksOnDate.length}
              </p>
            </div>
          </div>

          <div
            id="metric-comments-card"
            className="flex items-center gap-3.5 rounded-lg border border-blue-100 bg-blue-50/50 p-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-900">Commentaires & notes saisis</p>
              <p className="text-xl font-bold text-blue-700">{commentsOnDate.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des 2 volets du rapport */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volet 1: Tâches clôturées à cette date */}
        <div
          id="report-completed-tasks-container"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Tâches clôturées ({completedTasksOnDate.length})
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Horodatage date de réalisation
            </span>
          </div>

          {completedTasksOnDate.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 my-auto">
              <Sparkles className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Aucune tâche clôturée à cette date</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Les tâches marquées &quot;Terminé&quot; le {selectedDate} s&apos;afficheront automatiquement ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-96 pr-1">
              {completedTasksOnDate.map((task) => {
                const project = task.projetId ? projectsMap.get(task.projetId) : undefined;
                return (
                  <div
                    key={task.id}
                    id={`report-task-${task.id}`}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-900 line-through decoration-emerald-500">
                        {task.titre}
                      </h4>
                      {task.dateRealisation && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatTimeOnly(task.dateRealisation)}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-2 text-xs">
                      {project && (
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium border"
                          style={{
                            backgroundColor: `${project.couleur}10`,
                            color: project.couleur,
                            borderColor: `${project.couleur}30`,
                          }}
                        >
                          <Folder className="h-2.5 w-2.5" />
                          {project.nom}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {task.commentaires?.length || 0} note(s)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Volet 2: Commentaires rédigés à cette date */}
        <div
          id="report-comments-container"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Commentaires rédigés ({commentsOnDate.length})
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Historique transverse
            </span>
          </div>

          {commentsOnDate.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 my-auto">
              <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Aucun commentaire rédigé à cette date</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Les notes et motifs de blocage créés le {selectedDate} apparaîtront automatiquement ici.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-96 pr-1">
              {commentsOnDate.map((item) => (
                <div
                  key={item.id}
                  id={`report-comment-${item.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate" title={item.taskTitle}>
                        {item.taskTitle}
                      </span>
                      {item.project && (
                        <span
                          className="hidden sm:inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-medium border shrink-0"
                          style={{
                            backgroundColor: `${item.project.couleur}10`,
                            color: item.project.couleur,
                            borderColor: `${item.project.couleur}30`,
                          }}
                        >
                          {item.project.nom}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 shrink-0">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {formatTimeOnly(item.date)}
                    </span>
                  </div>

                  <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100">
                    {item.texte}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
