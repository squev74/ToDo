import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Tache } from '../types';

interface CancellationReasonModalProps {
  isOpen: boolean;
  task: Tache | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const CancellationReasonModal: React.FC<CancellationReasonModalProps> = ({
  isOpen,
  task,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim());
    setReason('');
  };

  const handleSkip = () => {
    onConfirm('');
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  return (
    <div
      id="cancellation-reason-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 p-4 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancellation-modal-title"
    >
      <div
        id="cancellation-reason-modal-container"
        className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div
              id="cancellation-reason-icon"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100"
            >
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="cancellation-modal-title" className="text-base font-normal tracking-wide text-[#1A1D1A]">
                Motif de l&apos;annulation
              </h3>
              <p className="mt-1 text-xs text-[#737873]">
                Tâche : <span className="font-medium text-[#1A1D1A]">{task.titre}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg p-1 text-[#737873] hover:bg-[#F9F8F6] hover:text-[#1A1D1A] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="cancellation-reason-textarea"
              className="block text-xs font-medium text-[#737873] mb-1.5"
            >
              Indiquez la raison de l&apos;annulation (Optionnel)
            </label>
            <textarea
              id="cancellation-reason-textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. Changement de priorité client, livrable obsolète, projet suspendu..."
              className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] p-3 text-xs text-[#1A1D1A] transition-colors focus:outline-hidden focus:ring-2 focus:border-rose-400 focus:bg-white focus:ring-rose-100 resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between border-t border-[#F0EFEB] pt-4 gap-2">
            <button
              id="cancellation-reason-cancel-btn"
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-[#F0EFEB] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
            >
              Retour
            </button>
            <div className="flex items-center gap-2">
              <button
                id="cancellation-reason-skip-btn"
                type="button"
                onClick={handleSkip}
                className="rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
              >
                Passer
              </button>
              <button
                id="cancellation-reason-submit-btn"
                type="submit"
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4.5 py-2 text-xs font-medium transition-all duration-300 shadow-[0_2px_10px_rgba(225,29,72,0.15)]"
              >
                Valider l&apos;annulation
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
