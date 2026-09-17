import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, CornerDownLeft, Sparkles, Folder } from 'lucide-react';
import { Projet } from '../types';

export interface AddTaskProps {
  onQuickAdd?: (title: string, projectId?: string) => Promise<void> | void;
  onOpenModal?: () => void;
  projects?: Projet[];
  defaultProjectId?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Composant d'ajout de tâche au style Zen Japandi
 *
 * - Fond vert sauge (#6B8E78) ou fond blanc surface avec bordure ultra-subtile (#F0EFEB)
 * - Transitions calmes (300ms ease-out)
 * - Typographie soignée en Deep Charcoal (#1A1D1A) et Soft Slate (#737873)
 */
export const AddTask: React.FC<AddTaskProps> = ({
  onQuickAdd,
  onOpenModal,
  projects = [],
  defaultProjectId,
  placeholder = 'Ajouter une intention ou une tâche...',
  className = '',
}) => {
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isInputOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    if (onQuickAdd) {
      setIsSubmitting(true);
      try {
        await onQuickAdd(cleanTitle, selectedProjectId || undefined);
        setTitle('');
        // Reste ouvert pour enchaîner sereinement les saisies
        inputRef.current?.focus();
      } finally {
        setIsSubmitting(false);
      }
    } else if (onOpenModal) {
      onOpenModal();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsInputOpen(false);
      setTitle('');
    }
  };

  // Si on a un onQuickAdd, on propose le formulaire zen inline, sinon un bouton d'ouverture calme
  if (!onQuickAdd && onOpenModal) {
    return (
      <button
        id="zen-add-task-btn"
        type="button"
        onClick={onOpenModal}
        className={`group inline-flex items-center gap-2.5 rounded-xl bg-[#6B8E78] px-4 py-2.5 text-xs font-medium text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-[#5d7c68] active:scale-[0.99] transition-all duration-300 ease-out cursor-pointer ${className}`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:rotate-90">
          <Plus className="h-3.5 w-3.5" />
        </span>
        <span className="tracking-wide">Nouvelle tâche</span>
      </button>
    );
  }

  return (
    <div
      id="zen-add-task-container"
      className={`relative w-full rounded-2xl bg-white border border-[#F0EFEB] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out overflow-hidden ${
        isInputOpen ? 'ring-1 ring-[#6B8E78]/30' : 'hover:border-[#E2DFD8]'
      } ${className}`}
    >
      {!isInputOpen ? (
        <div className="flex items-center justify-between p-3 sm:p-4">
          <button
            id="zen-quick-add-trigger"
            type="button"
            onClick={() => setIsInputOpen(true)}
            className="flex-1 flex items-center gap-3 text-left text-sm text-[#737873] hover:text-[#1A1D1A] transition-colors duration-300 cursor-pointer"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0EFEB] text-[#6B8E78] transition-all duration-300 hover:bg-[#6B8E78] hover:text-white">
              <Plus className="h-4 w-4" />
            </span>
            <span className="font-light tracking-wide">{placeholder}</span>
          </button>

          {onOpenModal && (
            <button
              id="zen-full-form-trigger"
              type="button"
              onClick={onOpenModal}
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-all duration-300 shrink-0"
              title="Ouvrir le formulaire complet"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#6B8E78]" />
              <span className="hidden sm:inline font-normal">Détails</span>
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-3 zen-fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6B8E78]/10 text-[#6B8E78]">
              <Plus className="h-4 w-4" />
            </span>
            <input
              ref={inputRef}
              id="zen-quick-add-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isSubmitting}
              className="w-full bg-transparent text-sm font-normal text-[#1A1D1A] placeholder-[#737873]/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#F0EFEB] text-xs">
            {/* Sélection de projet discrète */}
            <div className="flex items-center gap-2">
              {projects.length > 0 && (
                <div className="flex items-center gap-1.5 text-[#737873]">
                  <Folder className="h-3.5 w-3.5 text-[#5B7083]" />
                  <select
                    id="zen-add-project-select"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="bg-transparent text-xs text-[#1A1D1A] border-none focus:outline-none cursor-pointer py-1"
                  >
                    <option value="">Général / Aucun projet</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Actions : Annuler et Enregistrer */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsInputOpen(false);
                  setTitle('');
                }}
                className="rounded-lg px-2.5 py-1 text-xs text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors duration-300"
              >
                Annuler
              </button>

              <button
                id="zen-save-task-btn"
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#6B8E78] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#5d7c68] disabled:opacity-40 disabled:hover:bg-[#6B8E78] transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              >
                <span>Ajouter</span>
                <CornerDownLeft className="h-3 w-3 opacity-70" />
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddTask;
