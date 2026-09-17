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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 p-4 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocked-modal-title"
    >
      <div
        id="blocked-reason-modal-container"
        className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-start gap-3.5">
          <div
            id="blocked-reason-icon"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C89B7B]/15 text-[#966847] border border-[#C89B7B]/30"
          >
            <AlertOctagon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="blocked-modal-title" className="text-base font-normal tracking-wide text-[#1A1D1A]">
              Justifier le statut « Bloqué »
            </h3>
            <p className="mt-1 text-xs text-[#737873]">
              Tâche concernée : <span className="font-medium text-[#1A1D1A]">{task.titre}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-[#C89B7B]/10 border border-[#C89B7B]/25 p-3 flex items-start gap-2.5 text-xs text-[#966847]">
          <Info className="h-4 w-4 shrink-0 text-[#966847] mt-0.5" />
          <p>
            Règle : Pour assurer le suivi serein de l&apos;équipe, veuillez renseigner le motif explicatif du blocage.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="blocked-reason-textarea"
              className="block text-xs font-medium text-[#737873] mb-1.5"
            >
              Motif explicatif du blocage <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="blocked-reason-textarea"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (attemptedSubmit && e.target.value.trim().length > 0) {
                  setAttemptedSubmit(false);
                }
              }}
              placeholder="Ex. En attente de validation du client, besoin d'accès aux serveurs..."
              className={`w-full rounded-xl border p-3 text-xs text-[#1A1D1A] transition-colors focus:outline-hidden focus:ring-2 resize-none ${
                attemptedSubmit && isTextEmpty
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                  : 'border-[#F0EFEB] bg-[#F9F8F6] focus:border-[#C89B7B] focus:bg-white focus:ring-[#C89B7B]/10'
              }`}
              autoFocus
            />
            {attemptedSubmit && isTextEmpty && (
              <p id="blocked-reason-error" className="mt-1.5 text-xs font-normal text-rose-600">
                Le commentaire est obligatoire pour passer la tâche en statut Bloqué.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#F0EFEB] pt-4">
            <button
              id="blocked-reason-cancel-btn"
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-[#F0EFEB] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
            >
              Annuler
            </button>
            <button
              id="blocked-reason-submit-btn"
              type="submit"
              disabled={isTextEmpty}
              title={isTextEmpty ? 'Veuillez saisir un commentaire pour débloquer la validation' : ''}
              className={`rounded-xl px-4.5 py-2 text-xs font-medium transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${
                isTextEmpty
                  ? 'bg-[#F0EFEB] text-[#737873]/50 cursor-not-allowed'
                  : 'bg-[#C89B7B] hover:bg-[#b58765] text-white'
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
