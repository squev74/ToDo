import React, { useState, useEffect } from 'react';
import { X, Calendar, Folder, Tag, AlertCircle } from 'lucide-react';
import { Tache, Projet, StatutTache } from '../types';

interface TaskFormModalProps {
  isOpen: boolean;
  initialTask?: Tache | null;
  defaultStatus?: StatutTache;
  projects: Projet[];
  onSave: (taskData: {
    titre: string;
    description: string;
    projetId: string | null;
    statut: StatutTache;
    dateEcheance?: string | null;
    blockedReason?: string;
  }) => void;
  onClose: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  initialTask,
  defaultStatus,
  projects,
  onSave,
  onClose,
}) => {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [projetId, setProjetId] = useState<string | null>(null);
  const [statut, setStatut] = useState<StatutTache>(defaultStatus || 'Open');
  const [dateEcheance, setDateEcheance] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitre(initialTask.titre);
      setDescription(initialTask.description || '');
      setProjetId(initialTask.projetId || null);
      setStatut(initialTask.statut);
      setDateEcheance(initialTask.dateEcheance || '');
      setBlockedReason('');
    } else {
      setTitre('');
      setDescription('');
      setProjetId(projects.length > 0 ? projects[0].id : null);
      setStatut(defaultStatus || 'Open');
      setDateEcheance('');
      setBlockedReason('');
    }
    setError('');
  }, [initialTask, isOpen, projects, defaultStatus]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) {
      setError('Le titre de la tâche est obligatoire.');
      return;
    }

    if (statut === 'Blocked' && initialTask?.statut !== 'Blocked' && !blockedReason.trim()) {
      setError('Un motif explicatif est obligatoire pour définir le statut sur Bloqué.');
      return;
    }

    onSave({
      titre: titre.trim(),
      description: description.trim(),
      projetId: projetId || null,
      statut,
      dateEcheance: dateEcheance.trim() ? dateEcheance.trim() : null,
      blockedReason: statut === 'Blocked' ? blockedReason.trim() : undefined,
    });
    onClose();
  };

  return (
    <div
      id="task-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 p-4 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-form-title"
    >
      <div
        id="task-form-container"
        className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EFEB]">
          <h3 id="task-form-title" className="text-base font-normal tracking-wide text-[#1A1D1A]">
            {initialTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h3>
          <button
            id="task-form-close-button"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div
            id="task-form-error-alert"
            className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50/70 border border-rose-200/60 p-3 text-xs text-rose-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-medium text-[#737873] mb-1.5"
            >
              Intention / Titre <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title-input"
              type="text"
              value={titre}
              onChange={(e) => {
                setTitre(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex. Finaliser la validation du cahier des charges"
              className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3.5 py-2 text-sm text-[#1A1D1A] placeholder:text-[#737873]/60 focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="task-description-input"
              className="block text-xs font-medium text-[#737873] mb-1.5"
            >
              Description détaillée
            </label>
            <textarea
              id="task-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails, consignes ou contexte supplémentaire..."
              className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] p-3 text-sm text-[#1A1D1A] placeholder:text-[#737873]/60 focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-project-select"
                className="flex items-center gap-1.5 text-xs font-medium text-[#737873] mb-1.5"
              >
                <Folder className="h-3.5 w-3.5 text-[#5B7083]" />
                Projet associé
              </label>
              <select
                id="task-project-select"
                value={projetId || ''}
                onChange={(e) => setProjetId(e.target.value ? e.target.value : null)}
                className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
              >
                <option value="">(Aucun projet)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-status-select"
                className="flex items-center gap-1.5 text-xs font-medium text-[#737873] mb-1.5"
              >
                <Tag className="h-3.5 w-3.5 text-[#6B8E78]" />
                Statut
              </label>
              <select
                id="task-status-select"
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutTache)}
                className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
              >
                <option value="Open">À faire (Open)</option>
                <option value="In Progress">En cours (In Progress)</option>
                <option value="Blocked">Bloqué (Blocked)</option>
                <option value="Done">Terminé (Done)</option>
                <option value="Backlog">Backlog (En attente)</option>
              </select>
            </div>
          </div>

          {statut === 'Blocked' && initialTask?.statut !== 'Blocked' && (
            <div className="rounded-xl bg-[#C89B7B]/10 border border-[#C89B7B]/30 p-3">
              <label
                htmlFor="task-blocked-reason-input"
                className="block text-xs font-medium text-[#966847] mb-1"
              >
                Motif explicatif obligatoire <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="task-blocked-reason-input"
                rows={2}
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Raison du blocage de la tâche..."
                className="w-full rounded-xl border border-[#C89B7B]/30 bg-white p-2 text-xs text-[#1A1D1A] focus:border-[#C89B7B] focus:outline-hidden focus:ring-2 focus:ring-[#C89B7B]/10 transition-colors resize-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="task-due-date-input"
              className="flex items-center gap-1.5 text-xs font-medium text-[#737873] mb-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-[#5B7083]" />
              Date d&apos;échéance (optionnelle)
            </label>
            <input
              id="task-due-date-input"
              type="date"
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
              className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-[#F0EFEB]">
            <button
              id="task-form-cancel-btn"
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#F0EFEB] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
            >
              Annuler
            </button>
            <button
              id="task-form-submit-btn"
              type="submit"
              className="rounded-xl bg-[#6B8E78] px-5 py-2 text-xs font-medium text-white hover:bg-[#5d7c68] active:scale-[0.99] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300"
            >
              {initialTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
