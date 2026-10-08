import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  Copy,
  Check,
  Printer,
  AlertCircle,
  RefreshCw,
  FileText,
  Eye,
  Clock,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Tache, Projet, Espace, ActivityLog, Milestone } from '../types';
import {
  getMondayOfCurrentWeek,
  formatLocalDate,
  formatFrenchDateDisplay,
  extractAndPrepareTasks,
  getGeminiApiKey,
} from '../services/geminiReportService';
import { loadUserMilestonesFromStorage } from '../utils/storage';

interface ActivityReportViewProps {
  tasks: Tache[];
  projects: Projet[];
  activeSpace: Espace;
  initialStartDate?: string;
  initialEndDate?: string;
  activityLogs?: ActivityLog[];
  milestones?: Milestone[];
  onClose?: () => void;
  isModalContext?: boolean;
}

// Calcule le numéro de semaine ISO
function getISOWeekNumber(dateStr: string): number {
  if (!dateStr) return 1;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 1;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return 1;
  
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// Formate une date YYYY-MM-DD au format JJ/MM/YYYY
function formatToFrenchDate(dateStr?: string): string {
  if (!dateStr) return 'Non définie';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const ActivityReportView: React.FC<ActivityReportViewProps> = ({
  tasks,
  projects,
  activeSpace,
  initialStartDate,
  initialEndDate,
  activityLogs = [],
  milestones: propMilestones,
  onClose,
  isModalContext = false,
}) => {
  // 1. Initialisation des dates
  const defaultStart = useMemo(() => initialStartDate || getMondayOfCurrentWeek(), [initialStartDate]);
  const defaultEnd = useMemo(() => initialEndDate || formatLocalDate(new Date()), [initialEndDate]);

  const [dateDebut, setDateDebut] = useState<string>(defaultStart);
  const [dateFin, setDateFin] = useState<string>(defaultEnd);

  // Filtrer les projets de l'espace actif
  const spaceProjects = useMemo(() => {
    return projects.filter((p) => p.spaceId === activeSpace.id);
  }, [projects, activeSpace.id]);

  // État pour le projet sélectionné
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Initialiser automatiquement le premier projet par défaut
  useEffect(() => {
    if (spaceProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(spaceProjects[0].id);
    }
  }, [spaceProjects, selectedProjectId]);

  // Charger les jalons (milestones) de manière réactive
  const milestones = useMemo(() => {
    if (propMilestones) return propMilestones;
    if (activeSpace.userId) {
      return loadUserMilestonesFromStorage(activeSpace.userId);
    }
    return [];
  }, [propMilestones, activeSpace.userId]);

  // États de génération
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportResult, setReportResult] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState<boolean>(false);

  // Clé d'API locale/surchargée
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('VITE_GEMINI_API_KEY') || '';
    }
    return '';
  });

  const selectedProject = useMemo(() => {
    return spaceProjects.find((p) => p.id === selectedProjectId);
  }, [spaceProjects, selectedProjectId]);

  // Calcul dynamique des numéros de semaines ISO
  const weekStart = useMemo(() => getISOWeekNumber(dateDebut), [dateDebut]);
  const weekEnd = useMemo(() => getISOWeekNumber(dateFin), [dateFin]);

  // Filtrer les tâches correspondant au projet et à la période d'activité
  const matchingTasks = useMemo(() => {
    return extractAndPrepareTasks({
      tasks,
      projects,
      spaceId: activeSpace.id,
      dateDebut,
      dateFin,
      projetId: selectedProjectId || undefined,
    });
  }, [tasks, projects, activeSpace.id, dateDebut, dateFin, selectedProjectId]);

  // Raccourcis de sélection de dates
  const setQuickPreset = (preset: 'currentWeek' | 'last7days' | 'currentMonth' | 'today') => {
    const today = new Date();
    const todayStr = formatLocalDate(today);

    if (preset === 'currentWeek') {
      setDateDebut(getMondayOfCurrentWeek(today));
      setDateFin(todayStr);
    } else if (preset === 'last7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setDateDebut(formatLocalDate(past));
      setDateFin(todayStr);
    } else if (preset === 'today') {
      setDateDebut(todayStr);
      setDateFin(todayStr);
    } else if (preset === 'currentMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateDebut(formatLocalDate(firstDay));
      setDateFin(todayStr);
    }
  };

  // Lancement de la génération IA Gemini
  const handleGenerate = async () => {
    if (!selectedProjectId) {
      setErrorMessage("Veuillez sélectionner un projet pour générer le rapport.");
      return;
    }
    if (matchingTasks.length === 0) {
      setErrorMessage("Aucune tâche active n'a été trouvée sur cette période pour le projet sélectionné.");
      return;
    }

    const apiKey = customApiKey || getGeminiApiKey();
    if (!apiKey) {
      setErrorMessage(
        "Clé d'API Gemini non configurée. Veuillez saisir votre clé d'API personnelle dans le champ prévu à cet effet."
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const projName = selectedProject?.nom || 'Projet Spécifique';

    // 1. Filtrer les jalons du projet (ne garder que les jalons futurs, aujourd'hui ou après)
    const todayStr = formatLocalDate(new Date());
    const projMilestones = milestones
      .filter((m) => m.projectId === selectedProjectId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const futureMilestones = projMilestones.filter((m) => m.date >= todayStr);

    const formattedMilestones = futureMilestones.length > 0
      ? futureMilestones.map((m) => `  - ${m.title} (le ${formatToFrenchDate(m.date)})`).join('\n')
      : '  - Aucun jalon futur configuré';

    const endMilestone = projMilestones.find((m) => m.isBoundary === 'end');
    const formattedEndDate = endMilestone 
      ? formatToFrenchDate(endMilestone.date) 
      : (selectedProject?.endDate ? formatToFrenchDate(selectedProject.endDate) : 'Non définie');

    // 2. Tâches bloquées (status 'blocked')
    const blockedTasks = matchingTasks.filter((t) => t.statut === 'blocked');
    const formattedBlockedTasks = blockedTasks.length > 0
      ? blockedTasks.map((t) => `  - ${t.titre}`).join('\n')
      : '  - Aucun blocage actif';

    // 3. Tâches terminées (status 'done')
    const completedTasks = matchingTasks.filter((t) => t.statut === 'done');
    const formattedCompletedTasksList = completedTasks.length > 0
      ? completedTasks.map((t) => `- ${t.titre}${t.description ? ` (${t.description})` : ''}`).join('\n')
      : 'Aucune tâche terminée sur cette période.';

    // 4. Tâches en cours / à faire (hors terminées et annulées)
    const remainingTasks = matchingTasks.filter((t) => t.statut !== 'done' && t.statut !== 'cancelled');
    const formattedRemainingTasksList = remainingTasks.length > 0
      ? remainingTasks.map((t) => `- ${t.titre} [Statut: ${t.statut === 'blocked' ? 'En attente' : t.statut}]`).join('\n')
      : 'Aucune tâche planifiée restante.';

    // 5. Activity Log (Timeline)
    const projectLogs = activityLogs
      .filter((l) => {
        // Filtrer les logs pour les tâches de ce projet
        const taskOfProj = tasks.find((t) => t.id === l.taskId);
        return taskOfProj?.projetId === selectedProjectId;
      })
      .slice(0, 30)
      .map((l) => `[${l.timestamp.substring(0, 10)}] ${l.taskTitle} : ${l.details}`)
      .join('\n');

    // 6. RAID Log (Risques/Blocages)
    const projRaid = selectedProject?.raidLog || [];
    const formattedRaid = projRaid
      .filter((r) => r.status === 'open')
      .map((r) => `- [${r.type.toUpperCase()}] ${r.title} (Criticité: ${r.criticalityScore}, Mitigation: ${r.mitigationPlan || 'Aucun'})`)
      .join('\n');

    // Construction du Prompt exact avec structure stricte N+1 par projet
    const systemInstruction = `Tu es un chef de projet chevronné chez EVOLIT. Rédige un rapport d'activité destiné au Responsable direct (N+1) au format Markdown strict de style Japandi.

Tu dois impérativement respecter le canevas exact suivant, sans le modifier, sans ajouter d'autres sections, et sans introduction bavarde (comme "Voici le rapport..."). Commence directement par le titre "# 📊 Rapport d'Activité N+1...".

--------------------------------------------------
# 📊 Rapport d'Activité N+1 - ${projName}

• Général
  - Nom du Projet : ${projName}
  - Organisation : EVOLIT
  - Période : Du ${formatFrenchDateDisplay(dateDebut)} au ${formatFrenchDateDisplay(dateFin)} (Semaines S${weekStart}-S${weekEnd})

• Tendance : [📈 + (Amélioration) ou ➡️ = (Stable) ou 📉 - (Dégradation) - Choisis UNE seule option et affiche-la en gras selon les données factuelles]

• Status Météo : [☀️ Soleil ou ⛅ Soleil + Nuage ou 🌧️ Pluie ou 🌩️ Orage - Choisis UNE seule option et affiche-la en gras selon la santé du projet]
  - Synthèse Météo : [Synthèse explicative fluide de 2-3 phrases maximum basée sur les faits de la période]

• Planning
  - Prochains Jalons :
${formattedMilestones}
  - Date de fin prévue : ${formattedEndDate}

• Décisions
  - Prises : [Synthèse rédigée en 1 ou 2 phrases maximum, basée sur les tâches closes et le journal d'activité de la période]
  - À prendre : [Synthèse rédigée en 1 ou 2 phrases maximum, identifiant les arbitrages requis pour débloquer les tâches ou sécuriser la suite]

• Points de blocage et risques
  - Blocages :
${formattedBlockedTasks}
  - Impact : [Analyse d'impact claire et concise sur le planning rédigée par l'IA en 2 phrases max]

• Résultats obtenus et faits marquants
  - [Synthèse fluide et valorisante de 2 à 4 lignes maximum, rédigée par l'IA et basée sur les tâches terminées ci-dessous]

• Activités prévues
  - [Synthèse structurée et claire de 2 à 4 lignes maximum, rédigée par l'IA et basée sur les tâches planifiées / restantes ci-dessous]
--------------------------------------------------

RÈGLES DE RÉDACTION STRICTES :
1. Remplace l'intégralité du contenu entre crochets [ ] par ton analyse rédigée, mais conserve scrupuleusement la structure, les titres, les tirets et les puces.
2. Écris en français soigné, clair et professionnel.
3. Ne mentionne aucun identifiant technique ni clé JSON.
4. N'ajoute aucune phrase d'accompagnement avant ou après le rapport.
5. Utilise du texte gras pour la Tendance choisie et la Météo choisie.
`;

    const userPrompt = `Voici les données factuelles consolidées pour le projet "${projName}" sur la période :

TÂCHES TERMINÉES (DONE) :
${formattedCompletedTasksList}

TÂCHES EN COURS ET EN ATTENTE (NON CLOSES) :
${formattedRemainingTasksList}

JOURNAL D'ACTIVITÉ RÉCENT (TIMELINE) :
${projectLogs || 'Aucune action tracée.'}

REGISTRE DES RISQUES ET PROBLÈMES (RAID) :
${formattedRaid || 'Aucun risque actif déclaré.'}

Rédige le rapport maintenant.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    let lastErrorMsg = '';

    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\n---\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              temperature: 0.2, // Température basse pour assurer un respect strict de la structure
              topP: 0.95,
              maxOutputTokens: 3000,
              thinkingConfig: {
                thinkingBudget: 0, // Désactivation explicite des tokens de réflexion pour économie de coûts
              },
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastErrorMsg = errorData?.error?.message || `Erreur HTTP ${response.status}`;
          continue;
        }

        const data = await response.json();
        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText) {
          setReportResult(generatedText.trim());
          setIsLoading(false);
          return;
        }
      } catch (err: unknown) {
        lastErrorMsg = err instanceof Error ? err.message : String(err);
        continue;
      }
    }

    setErrorMessage(lastErrorMsg || "Une erreur est survenue lors de la communication avec l'IA Gemini.");
    setIsLoading(false);
  };

  // Copie dans le presse-papier
  const handleCopy = () => {
    if (!reportResult) return;
    navigator.clipboard.writeText(reportResult).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Impression soignée en PDF ou Papier
  const handlePrint = () => {
    if (!reportResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up de votre navigateur pour pouvoir imprimer en PDF.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Rapport d'Activité N+1 - ${selectedProject?.nom || 'EVOLIT'}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1A1D1A;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              background-color: #white;
            }
            h1 {
              font-size: 22px;
              border-bottom: 2px solid #EAE8E2;
              padding-bottom: 8px;
              margin-bottom: 20px;
              color: #1A1D1A;
            }
            h2, h3, h4 {
              color: #1A1D1A;
              font-size: 16px;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            ul, ol {
              padding-left: 20px;
              margin-bottom: 16px;
            }
            li {
              margin-bottom: 6px;
              font-size: 13px;
            }
            p {
              margin-bottom: 14px;
              font-size: 13px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="prose">
            ${document.getElementById('report-rendered-markdown')?.innerHTML || `<pre style="white-space: pre-wrap;">${reportResult}</pre>`}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className={`w-full space-y-6 ${!isModalContext ? 'animate-in fade-in duration-300' : ''}`}>
      {/* 1. RETOUR OU BANNIÈRE PMO */}
      {!isModalContext && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-[#F0EFEB] bg-white text-[#737873] hover:text-[#1A1D1A] hover:bg-[#FAF9F6] transition-colors"
              title="Retour aux tâches"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-semibold text-[#1A1D1A] tracking-wide flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
                Rapport d&apos;Activité N+1 (Gouvernance PMO)
              </h2>
              <p className="text-xs text-[#737873] mt-0.5">
                Génération automatisée et normalisée des rapports d&apos;activité consolidés pour votre responsable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. ZONE DE CONFIGURATION ET DROPDOWNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panneau de configuration (Gauche) */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-[#F0EFEB] space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <h3 className="text-xs font-bold text-[#1A1D1A] uppercase tracking-wider border-b border-[#F0EFEB] pb-2">
            Paramètres du rapport
          </h3>

          {/* Sélection du Projet */}
          <div className="space-y-1.5">
            <label htmlFor="report-project-select" className="block text-xs font-semibold text-[#737873]">
              Projet à analyser :
            </label>
            <select
              id="report-project-select"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setReportResult('');
              }}
              className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3 py-2 text-xs text-[#1A1D1A] focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            >
              {spaceProjects.length === 0 ? (
                <option value="">Aucun projet dans cet espace</option>
              ) : (
                spaceProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.jiraKey || 'PROJET'}] {p.nom}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Saisie Période */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="report-start-date" className="block text-[11px] font-semibold text-[#737873]">
                  Date début :
                </label>
                <input
                  id="report-start-date"
                  type="date"
                  value={dateDebut}
                  onChange={(e) => {
                    setDateDebut(e.target.value);
                    setReportResult('');
                  }}
                  className="w-full rounded-lg border border-[#F0EFEB] bg-[#F9F8F6] px-2 py-1.5 text-xs text-[#1A1D1A] focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="report-end-date" className="block text-[11px] font-semibold text-[#737873]">
                  Date fin :
                </label>
                <input
                  id="report-end-date"
                  type="date"
                  value={dateFin}
                  onChange={(e) => {
                    setDateFin(e.target.value);
                    setReportResult('');
                  }}
                  className="w-full rounded-lg border border-[#F0EFEB] bg-[#F9F8F6] px-2 py-1.5 text-xs text-[#1A1D1A] focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Badges de Semaine */}
            <div className="flex items-center justify-between text-[10px] text-[#737873] bg-[#F9F8F6] p-2 rounded-lg border border-[#F0EFEB] font-medium">
              <span>Semaine Début : <strong>S{weekStart}</strong></span>
              <span>Semaine Fin : <strong>S{weekEnd}</strong></span>
            </div>

            {/* Raccourcis temporels */}
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setQuickPreset('currentWeek')}
                className="text-[9px] py-1 bg-white hover:bg-slate-50 border border-[#F0EFEB] text-[#737873] rounded font-medium"
              >
                Semaine
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset('last7days')}
                className="text-[9px] py-1 bg-white hover:bg-slate-50 border border-[#F0EFEB] text-[#737873] rounded font-medium"
              >
                7j
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset('currentMonth')}
                className="text-[9px] py-1 bg-white hover:bg-slate-50 border border-[#F0EFEB] text-[#737873] rounded font-medium"
              >
                Mois
              </button>
              <button
                type="button"
                onClick={() => setQuickPreset('today')}
                className="text-[9px] py-1 bg-white hover:bg-slate-50 border border-[#F0EFEB] text-[#737873] rounded font-medium"
              >
                Auj.
              </button>
            </div>
          </div>

          {/* Saisie Clé API Gemini Directe */}
          <div className="space-y-1.5 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
            <label htmlFor="api-key-report" className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Clé d&apos;API Gemini (Surcharge) :
            </label>
            <input
              id="api-key-report"
              type="password"
              placeholder="Saisir clé perso (AIzaSy...)"
              value={customApiKey}
              onChange={(e) => {
                const val = e.target.value.trim();
                setCustomApiKey(val);
                if (val) {
                  window.localStorage.setItem('VITE_GEMINI_API_KEY', val);
                } else {
                  window.localStorage.removeItem('VITE_GEMINI_API_KEY');
                }
                setReportResult('');
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs text-[#1A1D1A] focus:outline-none focus:border-amber-500 placeholder:text-gray-300 font-mono"
            />
          </div>

          {/* Aperçu des activités sur la période */}
          <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#F0EFEB] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#1A1D1A]">
              <span>Portée des activités</span>
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px]">
                {matchingTasks.length} tâche(s)
              </span>
            </div>
            <div className="text-[10px] text-[#737873] space-y-1">
              <div className="flex justify-between">
                <span>Closes / Terminées :</span>
                <strong className="text-emerald-600 font-semibold">{matchingTasks.filter(t => t.statut === 'done').length}</strong>
              </div>
              <div className="flex justify-between">
                <span>En cours d&apos;exécution :</span>
                <strong className="text-amber-600 font-semibold">{matchingTasks.filter(t => t.statut === 'in_progress').length}</strong>
              </div>
              <div className="flex justify-between">
                <span>En attente (Status Blocked) :</span>
                <strong className="text-rose-600 font-semibold">{matchingTasks.filter(t => t.statut === 'blocked').length}</strong>
              </div>
            </div>
          </div>

          {/* Bouton de génération */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || matchingTasks.length === 0 || !selectedProjectId}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Génération du rapport...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-indigo-200" />
                <span>Générer le rapport N+1 IA</span>
              </>
            )}
          </button>
        </div>

        {/* Panneau de rendu / Aperçu (Milieu & Droite) */}
        <div className="lg:col-span-2 flex flex-col h-full min-h-[500px]">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 mb-4 animate-in fade-in">
              <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Erreur de génération :</strong>
                <p className="mt-1 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="bg-white flex-1 rounded-2xl border border-[#F0EFEB] flex flex-col overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
            {/* Barre de contrôle du rapport */}
            <div className="px-5 py-3.5 border-b border-[#F0EFEB] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#737873]" />
                <span className="text-xs font-bold text-[#1A1D1A]">Aperçu du Rapport d&apos;Activité</span>
              </div>

              {reportResult && (
                <div className="flex items-center gap-2">
                  {/* Onglets */}
                  <div className="flex items-center rounded-lg border border-[#F0EFEB] bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded ${
                        activeTab === 'preview' ? 'bg-[#6B8E78] text-white' : 'text-[#737873] hover:text-[#1A1D1A]'
                      }`}
                    >
                      <Eye className="h-3 w-3 inline mr-1" /> Formaté
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('raw')}
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded ${
                        activeTab === 'raw' ? 'bg-[#6B8E78] text-white' : 'text-[#737873] hover:text-[#1A1D1A]'
                      }`}
                    >
                      <FileText className="h-3 w-3 inline mr-1" /> Brut
                    </button>
                  </div>

                  {/* Bouton Copier */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg border border-[#F0EFEB] bg-white text-[#737873] hover:text-[#1A1D1A] transition-all hover:bg-slate-50 cursor-pointer"
                    title="Copier le texte"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" /> : <Copy className="h-4 w-4" />}
                  </button>

                  {/* Bouton Imprimer */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-1.5 rounded-lg border border-[#F0EFEB] bg-white text-[#737873] hover:text-[#1A1D1A] transition-all hover:bg-slate-50 cursor-pointer"
                    title="Imprimer / Imprimer en PDF"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Corps du rapport */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto bg-white min-h-[350px]">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 animate-ping opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-indigo-600 animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-[#1A1D1A]">Rédaction de votre rapport IA en cours...</h4>
                    <p className="text-[10px] text-[#737873] max-w-xs">
                      Gemini Flash analyse les tâches closes/bloquées, les jalons et la chronologie de votre projet EVOLIT.
                    </p>
                  </div>
                </div>
              ) : reportResult ? (
                activeTab === 'preview' ? (
                  <div id="report-rendered-markdown" className="prose prose-sm max-w-none select-text">
                    <Markdown>{reportResult}</Markdown>
                  </div>
                ) : (
                  <textarea
                    readOnly
                    value={reportResult}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    className="w-full h-full min-h-[350px] font-mono text-xs text-[#1A1D1A] border-0 focus:outline-none focus:ring-0 resize-none leading-relaxed"
                  />
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <Clock className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                  <div className="max-w-xs">
                    <h4 className="text-xs font-bold text-[#1A1D1A]">Rapport d&apos;activité N+1 vierge</h4>
                    <p className="text-[10px] text-[#737873] mt-1">
                      Sélectionnez un projet et une période, puis cliquez sur <strong>« Générer le rapport »</strong> pour laisser Gemini rédiger votre document.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityReportView;
