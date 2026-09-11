import React, { useState } from 'react';
import { AlertOctagon, Info } from 'lucide-react';
import { Tache } from '../types';

interface BlockedReasonModalProps {
  isOpen: boolean;
  task: Tache | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const BlockedReasonModal: React.FC<BlockedReasonModalProps> = ({
  isOpen,
  task,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  if (!isOpen || !task) return null;

  const isTextEmpty = reason.trim().length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTextEmpty) {
      setAttemptedSubmit(true);
      return;
    }
    onConfirm(reason.trim());
    setReason('');
    setAttemptedSubmit(false);
  };

  const handleCancel = () => {
    setReason('');
    setAttemptedSubmit(false);
    onCancel();
  };

  return (
    <div
      id="blocked-reason-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocked-modal-title"
    >
      <div
        id="blocked-reason-modal-container"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-amber-200"
      >
        <div className="flex items-start gap-3.5">
          <div
            id="blocked-reason-icon"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
          >
            <AlertOctagon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 id="blocked-modal-title" className="text-lg font-semibold text-slate-900">
              Justifier le passage en statut « Bloqué »
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Tâche concernée : <span className="font-medium text-slate-800">{task.titre}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200/80 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <p>
            Règle obligatoire : La validation ou fermeture de ce formulaire nécessite la saisie d&apos;un commentaire explicatif précisant la cause du blocage.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="blocked-reason-textarea"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Motif explicatif du blocage <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="blocked-reason-textarea"
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (attemptedSubmit && e.target.value.trim().length > 0) {
                  setAttemptedSubmit(false);
                }
              }}
              placeholder="Ex. En attente de validation des maquettes par le client, problème d'accès aux serveurs..."
              className={`w-full rounded-lg border p-3 text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                attemptedSubmit && isTextEmpty
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-amber-500 focus:ring-amber-200'
              }`}
              autoFocus
            />
            {attemptedSubmit && isTextEmpty && (
              <p id="blocked-reason-error" className="mt-1.5 text-xs font-medium text-rose-600">
                Le commentaire est strictement obligatoire pour pouvoir passer la tâche en statut Bloqué.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              id="blocked-reason-cancel-btn"
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Annuler (conserver le statut précédent)
            </button>
            <button
              id="blocked-reason-submit-btn"
              type="submit"
              disabled={isTextEmpty}
              title={isTextEmpty ? 'Veuillez saisir un commentaire pour débloquer la validation' : ''}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
                isTextEmpty
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-200'
              }`}
            >
              Confirmer le blocage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
