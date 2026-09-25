import React, { useState } from 'react';
import { BrainCircuit, X, Loader2, AlertCircle, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { Tache, Projet } from '../types';
import { prioritizeBacklog } from '../services/geminiService';

interface AiBacklogPrioritizerProps {
  tasks: Tache[];
  projects: Projet[];
  spaceId: string;
}

export const AiBacklogPrioritizer: React.FC<AiBacklogPrioritizerProps> = ({ tasks, projects, spaceId }) => {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePrioritize = async () => {
    setLoading(true);
    setError(null);
    setResultText(null);
    setIsOpen(true);

    try {
      const result = await prioritizeBacklog(tasks, projects, spaceId);
      if (result.success && result.rawText) {
        setResultText(result.rawText);
      } else {
        setError(result.error || 'Une erreur inconnue est survenue.');
      }
    } catch (err) {
      setError('Impossible de se connecter à l’assistant de priorisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton de déclenchement dans l'en-tête */}
      <button
        type="button"
        disabled={loading}
        onClick={handlePrioritize}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3.5 py-2 text-xs font-medium text-[#737873] hover:border-[#6B8E78]/30 hover:bg-[#6B8E78]/5 hover:text-[#5d7c68] active:scale-[0.99] transition-all disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#6B8E78]" />
            <span>Analyse en cours...</span>
          </>
        ) : (
          <>
            <BrainCircuit className="h-4 w-4 text-[#6B8E78]" />
            <span>🧠 Prioriser le Backlog</span>
          </>
        )}
      </button>

      {/* Tiroir Latéral (Slide-over / Panel) Japandi de Recommandation */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-[#1A1D1A]/15 backdrop-blur-xs transition-opacity" onClick={() => setIsOpen(false)} />

          <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md bg-[#F9F8F6] border-l border-[#F0EFEB] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              
              {/* En-tête du volet */}
              <div className="p-6 border-b border-[#F0EFEB] bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6B8E78]/10 text-[#6B8E78]">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1A1D1A]">Prochaines Actions Recommandées</h3>
                    <p className="text-[10px] text-[#737873] font-light">Analyse intelligente de votre Backlog par l&apos;IA</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-[#737873] hover:bg-slate-100 hover:text-[#1A1D1A] transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Contenu principal */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Chargement */}
                {loading && (
                  <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#6B8E78]" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#1A1D1A]">Évaluation des priorités...</p>
                      <p className="text-[11px] text-[#737873] font-light">Gemini trie et étudie vos tâches en attente</p>
                    </div>
                  </div>
                )}

                {/* Gestion d'erreur (HTTP 429 Quota ou autre) */}
                {error && (
                  <div className="rounded-2xl border border-rose-200/60 bg-rose-50/50 p-5 text-xs text-rose-800 leading-relaxed space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                      <span className="font-bold">Limite de requêtes atteinte</span>
                    </div>
                    <p className="font-light">
                      {error}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handlePrioritize}
                        className="inline-flex items-center gap-1 bg-white border border-rose-200 text-rose-800 rounded-lg px-3 py-1.5 font-medium hover:bg-white active:scale-95 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Réessayer</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Résultat de l'analyse */}
                {resultText && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="rounded-xl border border-[#6B8E78]/15 bg-[#6B8E78]/5 p-4 flex items-start gap-2.5">
                      <Sparkles className="h-4 w-4 text-[#6B8E78] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#5d7c68] font-light leading-relaxed">
                        Cette priorisation tient compte des échéances les plus critiques et des dépendances de projet de votre espace courant.
                      </p>
                    </div>

                    {/* Rendu Markdown épuré */}
                    <div className="prose prose-sm text-xs text-[#1A1D1A] leading-relaxed font-light space-y-4 whitespace-pre-line bg-white p-5 rounded-2xl border border-[#F0EFEB] shadow-[0_1px_6px_rgba(0,0,0,0.01)]">
                      {resultText}
                    </div>

                    {/* Actions de clôture */}
                    <div className="pt-4 border-t border-[#F0EFEB] flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="rounded-xl bg-[#1A1D1A] hover:bg-[#2c302c] text-white px-4 py-2 text-xs font-medium transition-colors"
                      >
                        Fermer l&apos;analyse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
