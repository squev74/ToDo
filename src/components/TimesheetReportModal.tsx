import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  FileText,
  Mail,
  Send,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getGeminiApiKey, formatFrenchDateDisplay } from '../services/geminiReportService';
import { TimeEntry } from '../types/timesheet';

interface TimesheetReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  spaceId: string;
  spaceName?: string;
  year: number;
  month: number;
  entries: TimeEntry[];
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const TimesheetReportModal: React.FC<TimesheetReportModalProps> = ({
  isOpen,
  onClose,
  userId,
  spaceId,
  spaceName = 'Principal',
  year,
  month,
  entries,
}) => {
  const [reportText, setReportText] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // État local pour configurer la clé API directement si elle n'est pas dans l'environnement
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('VITE_GEMINI_API_KEY') || '';
    }
    return '';
  });

  // Fonction pour alléger et compresser les entrées de temps avant l'envoi
  const compressAndLightenTimeEntries = (timeEntries: TimeEntry[]) => {
    // Regrouper par projet pour limiter la taille du JSON et optimiser les coûts
    const projectSummary: Record<string, {
      projectName: string;
      jiraKey: string;
      totalHours: number;
      uniqueComments: Set<string>;
    }> = {};

    timeEntries.forEach((entry) => {
      if (!projectSummary[entry.jiraKey]) {
        projectSummary[entry.jiraKey] = {
          projectName: entry.projectName,
          jiraKey: entry.jiraKey,
          totalHours: 0,
          uniqueComments: new Set<string>(),
        };
      }
      
      projectSummary[entry.jiraKey].totalHours += entry.hours;
      if (entry.comment && entry.comment.trim()) {
        // Tronquer à 80 caractères maximum par commentaire pour la compression
        const commentClean = entry.comment.trim();
        const shortComment = commentClean.length > 80 
          ? commentClean.substring(0, 77) + '...' 
          : commentClean;
        projectSummary[entry.jiraKey].uniqueComments.add(shortComment);
      }
    });

    // Convertir en tableau d'objets allégés
    return Object.values(projectSummary).map((p) => ({
      jira: p.jiraKey,
      proj: p.projectName,
      hours: p.totalHours,
      notes: Array.from(p.uniqueComments).slice(0, 8), // Max 8 notes clés par projet
    }));
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);
    setReportText('');

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setError(
        'Clé d’API Gemini manquante. Veuillez configurer la clé VITE_GEMINI_API_KEY dans votre environnement.'
      );
      setGenerating(false);
      return;
    }

    if (entries.length === 0) {
      setError(
        'Aucune imputation enregistrée pour ce mois. Veuillez d’abord saisir des heures dans la grille de suivi.'
      );
      setGenerating(false);
      return;
    }

    const compressedData = compressAndLightenTimeEntries(entries);
    const monthName = MONTHS_FR[month - 1];

    // Calculer le total général
    const grandTotal = entries.reduce((sum, e) => sum + e.hours, 0);

    // Construction du rôle et des consignes strictes (Cible N+1)
    const systemInstruction = `Tu es un chef de projet expert. Rédige un rapport mensuel de suivi du temps et d'activités destiné au responsable direct (N+1) de l'utilisateur.
Période : ${monthName} ${year}
Espace de travail : ${spaceName}
Heures totales imputées : ${grandTotal} heures

STRUCTURE DU RAPPORT :
1. INTRODUCTION : Un e-mail d'introduction formel, poli et valorisant (N+1).
2. SYNTHÈSE DES PROJETS ET HEURES : Un tableau de synthèse listant : Projet (JIRA) | Heures loggées | % d'Imputation.
3. SYNTHÈSE DES ACTIVITÉS : Pour chaque projet, utilise les commentaires fournis pour faire un résumé rédigé, fluide et synthétique des réalisations accomplies durant le mois. Évite de faire des listes brutes répétitives, reformule pour faire pro.
4. CONCLUSIONS / PROCHAINES ÉTAPES : 2-3 phrases sur les objectifs opérationnels du mois prochain.

RÈGLES DE RÉDACTION STRICTES :
- Ton professionnel, fluide, engagé et constructif.
- Ne mentionne aucune donnée brute de code ou jargon technique JSON.
- Ne mentionne JAMAIS que ce document a été généré par une IA.
- Utilise une superbe mise en page Markdown (tableaux, gras, listes à puces).`;

    const userPrompt = `Voici les données compressées des imputations de temps :
${JSON.stringify(compressedData, null, 2)}

Rédige le rapport d'activité mensuel N+1 soigné maintenant.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    let lastErrorMsg = '';

    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${systemInstruction}\n\n---\n\n${userPrompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.35,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 3000,
              // Optimisation des coûts : Désactivation explicite des jetons de réflexion (thinkingBudget: 0)
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData?.error?.message || `Erreur HTTP ${response.status}`;
          lastErrorMsg = message;

          // Si le modèle est interdit (403), de paiement requis (402), introuvable (404), quota dépassé (429) ou erreur crédit/prépaiement, on passe au suivant
          if (
            response.status === 402 ||
            response.status === 403 || 
            response.status === 404 || 
            response.status === 429 || 
            message.toLowerCase().includes('exhausted') || 
            message.toLowerCase().includes('quota') ||
            message.toLowerCase().includes('credit') ||
            message.toLowerCase().includes('prepayment') ||
            message.toLowerCase().includes('billing') ||
            message.toLowerCase().includes('payment')
          ) {
            continue;
          }
          throw new Error(message);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          throw new Error('La réponse de l’API Gemini est vide.');
        }

        setReportText(text.trim());
        setGenerating(false);
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        lastErrorMsg = msg;
        // Si l'erreur mentionne un refus d'accès, un quota épuisé, un modèle absent ou un problème de crédit/paiement, on continue
        if (
          msg.includes('402') ||
          msg.includes('403') || 
          msg.includes('404') || 
          msg.includes('429') || 
          msg.toLowerCase().includes('exhausted') || 
          msg.toLowerCase().includes('quota') || 
          msg.includes('permission') || 
          msg.includes('not found') ||
          msg.toLowerCase().includes('credit') ||
          msg.toLowerCase().includes('prepayment') ||
          msg.toLowerCase().includes('billing') ||
          msg.toLowerCase().includes('payment')
        ) {
          continue;
        }
        break;
      }
    }

    setError(lastErrorMsg || 'Impossible de générer le rapport avec l’API Gemini.');
    setGenerating(false);
  };

  useEffect(() => {
    if (isOpen && entries.length > 0) {
      handleGenerateReport();
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!reportText) return;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="timesheet-report-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/35 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="timesheet-report-container"
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 p-6 sm:p-8 flex flex-col max-h-[90vh] animate-in zoom-in-95"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Génération de Synthèse Mensuelle IA (N+1)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rapport d&apos;imputation pour {MONTHS_FR[month - 1]} {year} • Modèle Gemini Flash optimisé
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONFIGURATION DE LA CLÉ GEMINI (SURCHARGE) */}
        <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-500" />
            <div>
              <p className="font-semibold text-slate-700">Clé d&apos;API Gemini</p>
              <p className="text-[10px] text-slate-500">
                {customApiKey 
                  ? "Surchargée localement (clé personnelle active)." 
                  : "Utilise la clé du système. Vous pouvez la surcharger :"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="password"
              placeholder="Collez votre clé (AIzaSy...)"
              value={customApiKey}
              onChange={(e) => {
                const val = e.target.value.trim();
                setCustomApiKey(val);
                if (val) {
                  window.localStorage.setItem('VITE_GEMINI_API_KEY', val);
                } else {
                  window.localStorage.removeItem('VITE_GEMINI_API_KEY');
                }
              }}
              className="w-full sm:w-52 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-400"
            />
            {customApiKey && (
              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem('VITE_GEMINI_API_KEY');
                  setCustomApiKey('');
                }}
                className="text-[10px] text-red-600 hover:underline font-medium shrink-0 cursor-pointer"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* CONTENU CENTRAL SCROLLABLE */}
        <div className="flex-1 overflow-y-auto my-5 pr-1 text-slate-800">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">Analyse de vos {entries.length} imputations de temps...</p>
                <p className="text-xs text-slate-400 mt-1">Compression et allègement des JSON en cours (Flash Model)</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <AlertTriangle className="h-10 w-10 text-rose-500" />
              <div className="text-center">
                <p className="text-sm font-semibold text-rose-800">Échec de la génération</p>
                <p className="text-xs text-slate-500 mt-2 max-w-md">{error}</p>
              </div>
              <button
                onClick={handleGenerateReport}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Réessayer la génération
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-indigo-50/50 border border-indigo-100/60 p-4 text-xs text-indigo-800">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-indigo-500" />
                  <span>
                    Ce rapport a été rédigé automatiquement d&apos;après vos activités du mois. Copiez le texte ci-dessous pour l&apos;envoyer à votre responsable (N+1).
                  </span>
                </div>
              </div>

              {/* RENDER DU TEXTE GENERÉ */}
              <div className="markdown-body prose max-w-none text-xs leading-relaxed bg-slate-50 border border-slate-200 p-5 rounded-xl whitespace-pre-wrap font-sans">
                <ReactMarkdown>{reportText}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-mono">
            Mode : gemini-3.5-flash | Thinking: Off
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Fermer
            </button>
            
            <button
              disabled={generating || !!error || !reportText}
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copier le rapport</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
