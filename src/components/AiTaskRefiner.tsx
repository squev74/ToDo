import React, { useState } from 'react';
import { Sparkles, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { clarifyTaskTitle } from '../services/geminiService';

interface AiTaskRefinerProps {
  currentValue: string;
  onApplyRefinement: (newValue: string) => void;
}

export const AiTaskRefiner: React.FC<AiTaskRefinerProps> = ({ currentValue, onApplyRefinement }) => {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClarify = async () => {
    if (!currentValue.trim()) {
      setError('Veuillez saisir une ébauche de titre avant de clarifier.');
      return;
    }

    setLoading(true);
    setError(null);
    setProposal(null);

    try {
      const result = await clarifyTaskTitle(currentValue);
      if (result.success && result.refinedText) {
        setProposal(result.refinedText);
      } else {
        setError(result.error || 'Une erreur inconnue est survenue.');
      }
    } catch (err) {
      setError('Impossible de se connecter à l’assistant IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (proposal) {
      onApplyRefinement(proposal);
      setProposal(null);
    }
  };

  const handleCancel = () => {
    setProposal(null);
  };

  return (
    <div className="mt-1.5 space-y-2">
      {/* Bouton de déclenchement */}
      {!proposal && (
        <button
          type="button"
          disabled={loading}
          onClick={handleClarify}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0EFEB] bg-[#F9F8F6] px-2.5 py-1 text-[11px] font-medium text-[#737873] hover:border-[#6B8E78]/30 hover:bg-[#6B8E78]/5 hover:text-[#5d7c68] active:scale-98 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-[#6B8E78]" />
              <span>Optimisation en cours...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 text-[#6B8E78]" />
              <span>✨ Clarifier avec l&apos;IA</span>
            </>
          )}
        </button>
      )}

      {/* Proposition de reformulation */}
      {proposal && (
        <div className="rounded-xl border border-[#6B8E78]/20 bg-[#6B8E78]/5 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[10px] font-bold text-[#4e634a] uppercase tracking-wider mb-1">
            Suggestion de l&apos;assistant PMO
          </p>
          <p className="text-xs text-[#1A1D1A] italic font-medium leading-relaxed bg-white/70 px-2 py-1.5 rounded-lg border border-[#F0EFEB]">
            "{proposal}"
          </p>
          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Annuler</span>
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="inline-flex items-center gap-1 rounded-md bg-[#6B8E78] text-white px-2 py-1 text-[10px] font-medium hover:bg-[#5d7c68] transition-colors"
            >
              <Check className="h-3 w-3" />
              <span>Appliquer</span>
            </button>
          </div>
        </div>
      )}

      {/* Message d'erreur élégant (Japandi) */}
      {error && (
        <div className="flex items-start gap-1.5 rounded-xl border border-rose-200/50 bg-rose-50/50 p-2.5 text-[11px] text-rose-800 leading-normal animate-in fade-in duration-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Note d&apos;assistant PMO</p>
            <p className="font-light opacity-90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
