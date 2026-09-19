import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Plus, 
  ChevronRight, 
  Loader2, 
  BookOpen, 
  AlertTriangle, 
  Clock, 
  Lightbulb 
} from 'lucide-react';
import { Tache, Projet } from '../types';
import { buildCopilotContext } from '../utils/aiCopilotContext';
import { getGeminiApiKey } from '../services/geminiReportService';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  action?: {
    type: 'create_sop';
    title: string;
    summary: string;
    contentHtml: string;
  };
}

interface PmoCopilotWidgetProps {
  onViewChange: (view: 'tasks' | 'backlog' | 'report' | 'timesheet' | 'admin' | 'knowledge') => void;
  tasks: Tache[];
  projects: Projet[];
  activeSpaceId: string;
}

export const PmoCopilotWidget: React.FC<PmoCopilotWidgetProps> = ({
  onViewChange,
  tasks,
  projects,
  activeSpaceId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialiser la discussion avec un message de bienvenue chaleureux
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: "Bonjour ! Je suis votre Copilote PMO & Coach en Gestion de Projet. \n\nJe suis là pour vous aider à analyser vos risques critiques, identifier les dérapages de plannings, ou vous conseiller sur les meilleures méthodologies (PRINCE2, Agile, PMI). Posez-moi vos questions ou utilisez un des raccourcis ci-dessous.",
          timestamp: new Date(),
        }
      ]);
    }
  }, [messages]);

  // Faire défiler l'historique vers le bas
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // 1. Ajouter le message de l'utilisateur à l'historique
    const userMsgId = Math.random().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsLoading(true);

    // 2. Extraire la clé d'API de manière sécurisée
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'assistant',
        text: "⚠️ Erreur de configuration : Clé d'API Gemini manquante. Veuillez renseigner la variable d'environnement `VITE_GEMINI_API_KEY` pour pouvoir échanger avec le Copilote PMO.",
        timestamp: new Date(),
      }]);
      setIsLoading(false);
      return;
    }

    try {
      // 3. Extraire le contexte compressé
      const compressedContext = buildCopilotContext(tasks, projects, activeSpaceId);

      // 4. Prompt Système optimisé et consignes strictes
      const systemInstruction = `Tu es un Expert PMO Senior et Coach en Gestion de Projet. Ton rôle est d'assister le chef de projet au quotidien.
  - Si la question concerne la méthodologie, le leadership ou l'animation d'équipe (ex: gérer un sponsor difficile, cadrer un COPIL), réponds avec l'expertise d'un PMO Senior (clair, structuré, pragmatique et orienté solutions).
  - Si la question porte sur une procédure ou un mode d'emploi interne (SOP) et que l'information n'est PAS dans la base de connaissances (SOPs) fournie dans le contexte, indique poliment que cette fiche n'existe pas encore et recommande explicitement de la créer en proposant une trame claire.
  
  RÈGLE CRITIQUE D'ACTION AUTOMATIQUE :
  Si tu recommandes de créer une nouvelle fiche SOP parce qu'elle est absente du contexte, tu dois IMPÉRATIVEMENT inclure à la toute fin de ton message (sans espaces superflus) un bloc d'action invisible au format exact suivant pour que l'application puisse générer le bouton de raccourci :
  [ACTION_CREATE_SOP: Titre suggéré de la SOP | Résumé succinct de 1 phrase | Contenu HTML complet et riche avec balises h2, p, ul, li, blockquote détaillant le processus]`;

      const userPrompt = `Voici le contexte de mon espace de travail actuel au format JSON allégé :
${compressedContext}

Question de l'utilisateur :
"${textToSend}"

Rédige une réponse claire et pragmatique.`;

      // 5. Appel de l'API Gemini avec modèle performant Flash et mécanisme de fallback résilient
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
      let rawText = '';
      let apiSuccess = false;
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
                  parts: [{ text: `${systemInstruction}\n\n---\n\n${userPrompt}` }]
                }
              ],
              generationConfig: {
                temperature: 0.35,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2500,
                // Optimisation stricte des coûts : budget de réflexion nul
                thinkingConfig: {
                  thinkingBudget: 0
                }
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData?.error?.message || `Erreur HTTP ${response.status}`;
            lastErrorMsg = message;

            // Si le modèle est interdit (403), introuvable (404) ou quota dépassé (429 / resource_exhausted), on passe au suivant
            if (
              response.status === 403 || 
              response.status === 404 || 
              response.status === 429 || 
              message.toLowerCase().includes('exhausted') || 
              message.toLowerCase().includes('quota')
            ) {
              console.warn(`Modèle ${modelName} non accessible ou quota épuisé (HTTP ${response.status}). Essai du modèle suivant...`);
              continue;
            }
            throw new Error(message);
          }

          const data = await response.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Je n'ai pas pu générer de réponse.";
          apiSuccess = true;
          break; // Sortir de la boucle de fallback car l'appel a réussi
        } catch (err: any) {
          console.error(`Échec avec le modèle ${modelName}:`, err);
          const msg = err instanceof Error ? err.message : String(err);
          lastErrorMsg = msg;
          // Si l'erreur mentionne un refus d'accès, un quota épuisé ou un modèle absent, on continue
          if (
            msg.includes('403') || 
            msg.includes('404') || 
            msg.includes('429') || 
            msg.toLowerCase().includes('exhausted') || 
            msg.toLowerCase().includes('quota') || 
            msg.includes('permission') || 
            msg.includes('not found')
          ) {
            continue;
          }
          break; // Pour les autres types d'erreurs d'infrastructure, on arrête
        }
      }

      if (!apiSuccess) {
        throw new Error(lastErrorMsg || "Tous les modèles de secours ont échoué.");
      }

      // 6. Analyser la présence du tag d'action [ACTION_CREATE_SOP: ...]
      let cleanText = rawText;
      let actionData: Message['action'] = undefined;

      const actionRegex = /\[ACTION_CREATE_SOP:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([\s\S]+?)\]/i;
      const match = rawText.match(actionRegex);

      if (match) {
        const title = match[1].trim();
        const summary = match[2].trim();
        const contentHtml = match[3].trim();
        
        // Retirer le tag de l'affichage textuel visible pour l'utilisateur
        cleanText = rawText.replace(actionRegex, '').trim();
        
        actionData = {
          type: 'create_sop',
          title,
          summary,
          contentHtml
        };
      }

      // Ajouter la réponse de l'assistant à l'historique
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'assistant',
        text: cleanText,
        timestamp: new Date(),
        action: actionData
      }]);

    } catch (err: any) {
      console.error("Erreur lors de la communication avec l'assistant PMO :", err);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'assistant',
        text: "🙇 Désolé, j'ai rencontré une erreur temporaire lors de l'analyse. Veuillez réessayer dans quelques instants.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSopDraft = (action: Exclude<Message['action'], undefined>) => {
    // 1. Enregistrer le brouillon pré-rempli dans localStorage
    const draft = {
      title: action.title,
      category: 'process',
      summary: action.summary,
      contentHtml: action.contentHtml,
      tags: ['copilot', 'draft', 'recommande']
    };
    
    localStorage.setItem('prefilled_sop_draft', JSON.stringify(draft));
    
    // 2. Changer de vue vers la base de connaissances (Knowledge)
    onViewChange('knowledge');
    
    // 3. Fermer le volet du widget pour laisser l'utilisateur voir l'éditeur
    setIsOpen(false);
  };

  const handleShortcutClick = (shortcutType: 'sop' | 'risks' | 'overdue' | 'advice') => {
    let query = '';
    switch (shortcutType) {
      case 'sop':
        query = "Quelles sont les procédures (SOP) enregistrées dans ma base de connaissances ?";
        break;
      case 'risks':
        query = "Quels sont les risques critiques (RAID) actuellement identifiés dans mon espace actif ?";
        break;
      case 'overdue':
        query = "Quelles sont les tâches qui sont actuellement en retard par rapport à la date du jour ?";
        break;
      case 'advice':
        query = "Donnez-moi un conseil méthodologique de PMO Senior pour remotiver une équipe sous pression.";
        break;
    }
    handleSendMessage(query);
  };

  return (
    <>
      {/* BOUTON FLOTTANT COPILOTE (Style Minimaliste Japandi) */}
      <button
        id="btn-copilot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#6B8E78] text-white shadow-lg hover:bg-[#5D7C68] transition-all transform hover:scale-105 active:scale-95 duration-200 group border-2 border-white"
        aria-label="Ouvrir le Copilote PMO"
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform group-hover:rotate-90 duration-300" />
        ) : (
          <div className="relative">
            <Sparkles className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
            </span>
          </div>
        )}
      </button>

      {/* TIROIR DE CONVERSATION */}
      {isOpen && (
        <div
          id="copilot-pmo-drawer"
          className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-32px)] h-[580px] max-h-[calc(100vh-120px)] flex flex-col rounded-2xl border border-[#F0EFEB] bg-[#FAF9F6] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          {/* En-tête */}
          <div className="px-5 py-4 bg-white border-b border-[#F0EFEB] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#FAF9F6] border border-[#6B8E78]/20 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-[#6B8E78]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1A1D1A]">Copilote PMO & Coach</h3>
                <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">Gemini Flash</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[#737873] hover:bg-[#FAF9F6] hover:text-[#1A1D1A] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Zone des messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
                  }`}
                >
                  {/* Icône */}
                  <div
                    className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[11px] border ${
                      isAssistant
                        ? 'bg-white border-[#F0EFEB] text-[#6B8E78]'
                        : 'bg-[#6B8E78] border-[#6B8E78] text-white'
                    }`}
                  >
                    {isAssistant ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>

                  {/* Bulle de texte */}
                  <div className="space-y-2">
                    <div
                      className={`p-3.5 rounded-2xl text-[11px] leading-relaxed whitespace-pre-wrap ${
                        isAssistant
                          ? 'bg-white text-[#1A1D1A] border border-[#F0EFEB] shadow-[0_2px_8px_rgba(0,0,0,0.01)]'
                          : 'bg-[#6B8E78] text-white rounded-tr-none'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Raccourci / Action rapide de création de SOP */}
                    {isAssistant && msg.action && (
                      <div className="animate-in fade-in zoom-in-95 duration-300">
                        <button
                          type="button"
                          onClick={() => handleCreateSopDraft(msg.action!)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-[#6B8E78] bg-white text-[10px] font-bold text-[#6B8E78] hover:bg-[#6B8E78]/5 hover:border-solid transition-all shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>➕ Rédiger & Sauvegarder cette fiche SOP</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Chargement de l'assistant */}
            {isLoading && (
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="h-7 w-7 rounded-full bg-white border border-[#F0EFEB] shrink-0 flex items-center justify-center text-[#6B8E78]">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-[#F0EFEB] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center gap-2 text-[10px] text-[#737873]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6B8E78]" />
                  <span>Le PMO analyse et formule sa réponse...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* SUGGESTIONS DE QUESTIONS (Chips rapides) */}
          <div className="px-5 py-2 border-t border-[#F0EFEB] bg-white shrink-0">
            <span className="text-[8px] font-bold text-[#737873] uppercase tracking-wider block mb-1.5">Suggestions rapides :</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleShortcutClick('sop')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F0EFEB] bg-[#FAF9F6] hover:bg-[#F0EFEB] text-[9px] font-semibold text-[#1A1D1A] transition-colors"
              >
                <BookOpen className="h-2.5 w-2.5 text-indigo-600" />
                <span>📋 Procédures</span>
              </button>
              <button
                type="button"
                onClick={() => handleShortcutClick('risks')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F0EFEB] bg-[#FAF9F6] hover:bg-[#F0EFEB] text-[9px] font-semibold text-[#1A1D1A] transition-colors"
              >
                <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                <span>⚠️ Risques</span>
              </button>
              <button
                type="button"
                onClick={() => handleShortcutClick('overdue')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F0EFEB] bg-[#FAF9F6] hover:bg-[#F0EFEB] text-[9px] font-semibold text-[#1A1D1A] transition-colors"
              >
                <Clock className="h-2.5 w-2.5 text-rose-600" />
                <span>🚨 En retard</span>
              </button>
              <button
                type="button"
                onClick={() => handleShortcutClick('advice')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F0EFEB] bg-[#FAF9F6] hover:bg-[#F0EFEB] text-[9px] font-semibold text-[#1A1D1A] transition-colors"
              >
                <Lightbulb className="h-2.5 w-2.5 text-emerald-600" />
                <span>💡 Conseil PMO</span>
              </button>
            </div>
          </div>

          {/* Formulaire de saisie */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-4 border-t border-[#F0EFEB] bg-white flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Saisissez votre question PMO..."
              className="flex-1 rounded-xl border border-[#EAE8E2] bg-[#FAF9F6] px-3 py-2 text-[11px] text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-none transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6B8E78] text-white hover:bg-[#5D7C68] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
