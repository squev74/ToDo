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
      className="relative rounded-2xl border border-[#F0EFEB] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all"
    >
      {/* Bouton fermeture */}
      <button
        id="welcome-banner-close-btn"
        type="button"
        onClick={onDismiss}
        className="absolute top-4 right-4 rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
        title="Masquer ce message de bienvenue"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3.5">
        <div
          id="welcome-banner-icon"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6B8E78]/10 text-[#6B8E78]"
        >
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="flex-1 pr-6">
          <div className="flex items-center gap-2">
            <h3 id="welcome-banner-title" className="text-sm font-normal tracking-wide text-[#1A1D1A]">
              Bienvenue sur votre espace de sérénité & de productivité
            </h3>
            <span className="rounded-lg bg-[#6B8E78]/10 px-2 py-0.5 text-[10px] font-medium text-[#6B8E78] border border-[#6B8E78]/20">
              Guide
            </span>
          </div>

          <p className="mt-1.5 text-xs text-[#737873] leading-relaxed max-w-3xl font-light">
            Cette application est un gestionnaire de tâches ergonomique et épuré. Pour commencer :
          </p>

          <ul className="mt-2.5 space-y-1.5 text-xs text-[#737873] font-light">
            <li className="flex items-start gap-2">
              <CheckSquare className="h-3.5 w-3.5 text-[#6B8E78] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1A1D1A] font-medium">Ajoutez vos tâches :</strong> Cliquez sur <strong className="text-[#1A1D1A] font-medium">« Nouvelle tâche »</strong> pour définir vos objectifs, échéances et projets.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckSquare className="h-3.5 w-3.5 text-[#6B8E78] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1A1D1A] font-medium">Nettoyez les exemples :</strong> Retirez les tâches de démonstration pour laisser place à votre organisation personnelle.
              </span>
            </li>
          </ul>

          {/* Boutons d'action rapide */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              id="welcome-create-task-btn"
              type="button"
              onClick={onNewTaskClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#5d7c68] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Ajouter une tâche</span>
            </button>

            {hasExampleTasks && onClearExamplesClick && (
              <button
                id="welcome-clear-examples-btn"
                type="button"
                onClick={onClearExamplesClick}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0EFEB] bg-white px-3 py-1.5 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 text-[#C89B7B]" />
                <span>Enlever les tâches d&apos;exemples</span>
              </button>
            )}

            <button
              id="welcome-dismiss-btn"
              type="button"
              onClick={onDismiss}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
            >
              J&apos;ai compris, masquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
