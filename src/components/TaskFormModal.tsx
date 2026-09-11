import React, { useState, useEffect } from 'react';
import { X, Calendar, Folder, Tag, AlertCircle } from 'lucide-react';
import { Tache, Projet, StatutTache } from '../types';

interface TaskFormModalProps {
  isOpen: boolean;
  initialTask?: Tache | null;
  projects: Projet[];
  onSave: (taskData: {
    titre: string;
    description: string;
    projetId: string | null;
    statut: StatutTache;
    dateEcheance?: string;
    blockedReason?: string;
  }) => void;
  onClose: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  initialTask,
  projects,
  onSave,
  onClose,
}) => {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [projetId, setProjetId] = useState<string | null>(null);
  const [statut, setStatut] = useState<StatutTache>('Open');
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
      setStatut('Open');
      setDateEcheance('');
      setBlockedReason('');
    }
    setError('');
  }, [initialTask, isOpen, projects]);

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
      dateEcheance: dateEcheance || undefined,
      blockedReason: statut === 'Blocked' ? blockedReason.trim() : undefined,
    });
    onClose();
  };

  return (
    <div
      id="task-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-form-title"
    >
      <div
        id="task-form-container"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 id="task-form-title" className="text-lg font-semibold text-slate-900">
            {initialTask ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}
          </h3>
          <button
            id="task-form-close-button"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div
            id="task-form-error-alert"
            className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Titre de la tâche <span className="text-rose-600">*</span>
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
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="task-description-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Description détaillée
            </label>
            <textarea
              id="task-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails, consignes ou contexte supplémentaire..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-project-select"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                <Folder className="h-3.5 w-3.5 text-slate-500" />
                Projet associé
              </label>
              <select
                id="task-project-select"
                value={projetId || ''}
                onChange={(e) => setProjetId(e.target.value ? e.target.value : null)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
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
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                <Tag className="h-3.5 w-3.5 text-slate-500" />
                Statut
              </label>
              <select
                id="task-status-select"
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutTache)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              >
                <option value="Open">À faire (Open)</option>
                <option value="In Progress">En cours (In Progress)</option>
                <option value="Blocked">Bloqué (Blocked)</option>
                <option value="Done">Terminé (Done)</option>
              </select>
            </div>
          </div>

          {statut === 'Blocked' && initialTask?.statut !== 'Blocked' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <label
                htmlFor="task-blocked-reason-input"
                className="block text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1"
              >
                Motif explicatif obligatoire <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="task-blocked-reason-input"
                rows={2}
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Raison du blocage de la tâche..."
                className="w-full rounded-md border border-amber-300 bg-white p-2 text-sm focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="task-due-date-input"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Date d&apos;échéance (optionnelle)
            </label>
            <input
              id="task-due-date-input"
              type="date"
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              id="task-form-cancel-btn"
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              id="task-form-submit-btn"
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              {initialTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
