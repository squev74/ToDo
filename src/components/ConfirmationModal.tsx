import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="confirmation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 p-4 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        id="confirmation-modal-container"
        className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-start gap-4">
          <div
            id="confirmation-modal-icon-badge"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isDanger ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-[#C89B7B]/15 text-[#966847] border border-[#C89B7B]/30'
            }`}
          >
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 id="modal-title" className="text-base font-normal tracking-wide text-[#1A1D1A]">
              {title}
            </h3>
            <p className="mt-2 text-xs text-[#737873] leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            id="confirmation-modal-cancel-button"
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#F0EFEB] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="confirmation-modal-confirm-button"
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4.5 py-2 text-xs font-medium text-white transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#6B8E78] hover:bg-[#5d7c68]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
