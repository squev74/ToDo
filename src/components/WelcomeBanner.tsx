import React from 'react';
import { Sparkles, Plus, Trash2, X, CheckSquare } from 'lucide-react';

interface WelcomeBannerProps {
  onDismiss: () => void;
  onNewTaskClick: () => void;
  onClearExamplesClick?: () => void;
  hasExampleTasks?: boolean;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  onDismiss,
  onNewTaskClick,
  onClearExamplesClick,
  hasExampleTasks = true,
}) => {
  return (
    <div
      id="welcome-banner"
      className="relative rounded-xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 p-5 shadow-xs transition-all"
    >
      {/* Bouton fermeture */}
      <button
        id="welcome-banner-close-btn"
        type="button"
        onClick={onDismiss}
        className="absolute top-3.5 right-3.5 rounded-lg p-1.5 text-slate-400 hover:bg-indigo-100/60 hover:text-slate-700 transition-colors"
        title="Masquer ce message de bienvenue"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <div
          id="welcome-banner-icon"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs"
        >
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="flex-1 pr-6">
          <div className="flex items-center gap-2">
            <h3 id="welcome-banner-title" className="text-sm font-bold text-slate-900">
              Bienvenue sur votre To-Do List !
            </h3>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
              Nouveau
            </span>
          </div>

          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-3xl">
            Cette application est un gestionnaire de tâches (To-Do List) complet et autonome. Pour commencer à l&apos;utiliser :
          </p>

          <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <CheckSquare className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Ajoutez vos tâches :</strong> Cliquez sur le bouton <strong>« Nouvelle tâche »</strong> pour définir vos objectifs, échéances et projets.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckSquare className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Nettoyez les exemples :</strong> Supprimez ou adaptez les tâches d&apos;exemples pré-chargées pour faire place à votre propre organisation.
              </span>
            </li>
          </ul>

          {/* Boutons d'action rapide */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              id="welcome-create-task-btn"
              type="button"
              onClick={onNewTaskClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Ajouter une tâche</span>
            </button>

            {hasExampleTasks && onClearExamplesClick && (
              <button
                id="welcome-clear-examples-btn"
                type="button"
                onClick={onClearExamplesClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Enlever les tâches d&apos;exemples</span>
              </button>
            )}

            <button
              id="welcome-dismiss-btn"
              type="button"
              onClick={onDismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              J&apos;ai compris, masquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
