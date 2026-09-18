import React, { useState, useEffect, useMemo, useId } from 'react';
import {
  Sparkles,
  X,
  Calendar,
  Copy,
  Check,
  Download,
  AlertCircle,
  RefreshCw,
  FileText,
  Eye,
  Layers,
  FolderGit2,
  Clock,
  Send,
  Users,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Tache, Projet, Espace } from '../types';
import {
  getMondayOfCurrentWeek,
  formatLocalDate,
  formatFrenchDateDisplay,
  extractAndPrepareTasks,
  generateActivityReport,
  getGeminiApiKey,
} from '../services/geminiReportService';
import { getWorkspaceIconComponent } from '../utils/workspaceIcons';

export interface ActivityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Tache[];
  projects: Projet[];
  activeSpace: Espace;
  initialStartDate?: string;
  initialEndDate?: string;
}

export const ActivityReportModal: React.FC<ActivityReportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  activeSpace,
  initialStartDate,
  initialEndDate,
}) => {
  const modalId = useId();
  const ActiveSpaceIcon = getWorkspaceIconComponent(activeSpace.icone);

  // 1. Initialisation des dates par défaut : du lundi de la semaine en cours jusqu'à aujourd'hui
  const defaultStart = useMemo(() => initialStartDate || getMondayOfCurrentWeek(), [initialStartDate]);
  const defaultEnd = useMemo(() => initialEndDate || formatLocalDate(new Date()), [initialEndDate]);

  const [dateDebut, setDateDebut] = useState<string>(defaultStart);
  const [dateFin, setDateFin] = useState<string>(defaultEnd);

  // Nouveaux états pour la personnalisation du périmètre et du destinataire
  const [perimetre, setPerimetre] = useState<'tous' | 'projet'>('tous');
  const [projetSelectionneId, setProjetSelectionneId] = useState<string>('');
  const [cible, setCible] = useState<'n1' | 'codir'>('n1');

  // 2. États de génération et rendu
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportResult, setReportResult] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState<boolean>(false);

  // Filtrer les projets appartenant à l'espace actif
  const spaceProjects = useMemo(() => {
    return projects.filter((p) => p.spaceId === activeSpace.id);
  }, [projects, activeSpace.id]);

  // Initialiser automatiquement le projet spécifique s'il y en a de disponibles
  useEffect(() => {
    if (spaceProjects.length > 0 && !projetSelectionneId) {
      setProjetSelectionneId(spaceProjects[0].id);
    }
  }, [spaceProjects, projetSelectionneId]);

  // Réinitialiser les dates à l'ouverture de la modal si fournies
  useEffect(() => {
    if (isOpen) {
      if (initialStartDate) setDateDebut(initialStartDate);
      if (initialEndDate) setDateFin(initialEndDate);
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  // 3. Prévisualisation en direct des tâches filtrées sur la période pour l'espace actif et le périmètre choisi
  const matchingTasks = useMemo(() => {
    if (!isOpen) return [];
    return extractAndPrepareTasks({
      tasks,
      projects,
      spaceId: activeSpace.id,
      dateDebut,
      dateFin,
      projetId: perimetre === 'projet' ? projetSelectionneId : undefined,
    });
  }, [isOpen, tasks, projects, activeSpace.id, dateDebut, dateFin, perimetre, projetSelectionneId]);

  const uniqueProjectsCount = useMemo(() => {
    return new Set(matchingTasks.map((t) => t.projet)).size;
  }, [matchingTasks]);

  // Vérification de la présence de la clé API
  const hasApiKey = Boolean(getGeminiApiKey());

  // Raccourcis de sélection de dates
  const setQuickPreset = (preset: 'currentWeek' | 'last7days' | 'today' | 'currentMonth') => {
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

  // Déclenchement de la génération Gemini
  const handleGenerate = async () => {
    if (matchingTasks.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateActivityReport({
        tasks,
        projects,
        spaceId: activeSpace.id,
        spaceName: activeSpace.nom,
        dateDebut,
        dateFin,
        perimetre,
        projetSelectionneId: perimetre === 'projet' ? projetSelectionneId : undefined,
        cible,
      });

      if (result.success && result.reportText) {
        setReportResult(result.reportText);
      } else {
        setErrorMessage(
          result.error || 'Une erreur est survenue lors de la génération du rapport.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Échec de connexion au service Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copie dans le presse-papier
  const handleCopy = () => {
    if (!reportResult) return;
    navigator.clipboard.writeText(reportResult).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Téléchargement du fichier markdown
  const handleDownloadMarkdown = () => {
    if (!reportResult) return;
    const suffix = perimetre === 'projet' && spaceProjects.find((p) => p.id === projetSelectionneId)
      ? spaceProjects.find((p) => p.id === projetSelectionneId)!.nom.toLowerCase().replace(/\s+/g, '-')
      : 'tous-projets';
    const filename = `rapport-activite-${suffix}-${cible}-${dateDebut}-au-${dateFin}.md`;
    const blob = new Blob([reportResult], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      id="activity-report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="activity-report-modal-container"
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${modalId}`}
      >
        {/* 1. EN-TÊTE DE LA MODAL */}
        <div className="flex items-center justify-between border-b border-[#F0EFEB] px-5 py-4 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6B8E78]/10 text-[#6B8E78]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id={`modal-title-${modalId}`}
                  className="text-base font-normal tracking-wide text-[#1A1D1A] leading-tight"
                >
                  Rapport d&apos;activité IA
                </h3>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#6B8E78]/15 px-2 py-0.5 text-[10px] font-medium text-[#6B8E78]">
                  Gemini AI Studio
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#737873] mt-0.5">
                <span>Espace actif :</span>
                <span
                  className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-lg border text-[11px]"
                  style={{
                    backgroundColor: `${activeSpace.couleur || '#6B8E78'}12`,
                    color: activeSpace.couleur || '#6B8E78',
                    borderColor: `${activeSpace.couleur || '#6B8E78'}30`,
                  }}
                >
                  <ActiveSpaceIcon className="h-3 w-3" />
                  <span>{activeSpace.nom}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            id="activity-report-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors shrink-0"
            title="Fermer la modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. ZONE DE CONFIGURATION ET FILTRAGE DE LA PÉRIODE */}
        <div className="border-b border-[#F0EFEB] bg-[#F9F8F6] p-4 sm:p-5 shrink-0 space-y-3.5">
          {/* Alerte si la clé API n'est pas détectée */}
          {!hasApiKey && (
            <div
              id="gemini-key-warning"
              className="flex items-start gap-2.5 rounded-xl border border-[#C89B7B]/30 bg-[#C89B7B]/10 p-3 text-xs text-[#966847]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-[#966847] mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">
                  Clé d&apos;API Gemini (`VITE_GEMINI_API_KEY`) non renseignée
                </p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Pour que l&apos;intelligence artificielle puisse générer votre compte-rendu,
                  renseignez votre clé Gemini dans les variables d&apos;environnement.
                </p>
              </div>
            </div>
          )}

          {/* Formulaire Grid : Date Début & Date Fin, Périmètre, Destinataire */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Colonne 1 : Filtres de Date */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="report-date-debut"
                    className="block text-xs font-medium text-[#737873] mb-1 flex items-center gap-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#5B7083]" />
                    <span>Date de début :</span>
                  </label>
                  <input
                    id="report-date-debut"
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs font-normal text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="report-date-fin"
                    className="block text-xs font-medium text-[#737873] mb-1 flex items-center gap-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#5B7083]" />
                    <span>Date de fin :</span>
                  </label>
                  <input
                    id="report-date-fin"
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs font-normal text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                  />
                </div>
              </div>

              {/* Raccourcis de période */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold text-[#737873] uppercase tracking-wider mr-1">
                  Période :
                </span>
                <button
                  type="button"
                  onClick={() => setQuickPreset('currentWeek')}
                  className="rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-[10px] font-medium text-[#737873] hover:border-[#6B8E78]/40 hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                >
                  Semaine
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPreset('last7days')}
                  className="rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-[10px] font-medium text-[#737873] hover:border-[#6B8E78]/40 hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                >
                  7j
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPreset('currentMonth')}
                  className="rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-[10px] font-medium text-[#737873] hover:border-[#6B8E78]/40 hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                >
                  Mois
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPreset('today')}
                  className="rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-[10px] font-medium text-[#737873] hover:border-[#6B8E78]/40 hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                >
                  Auj.
                </button>
              </div>
            </div>

            {/* Colonne 2 : Périmètre et Destinataire */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Périmètre */}
              <div>
                <label
                  htmlFor="report-perimetre"
                  className="block text-xs font-medium text-[#737873] mb-1 flex items-center gap-1.5"
                >
                  <Layers className="h-3.5 w-3.5 text-[#5B7083]" />
                  <span>Périmètre :</span>
                </label>
                <select
                  id="report-perimetre"
                  value={perimetre}
                  onChange={(e) => {
                    const val = e.target.value as 'tous' | 'projet';
                    setPerimetre(val);
                    if (val === 'tous') {
                      setProjetSelectionneId('');
                    } else if (spaceProjects.length > 0 && !projetSelectionneId) {
                      setProjetSelectionneId(spaceProjects[0].id);
                    }
                  }}
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs font-normal text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                >
                  <option value="tous">Tous les projets</option>
                  <option value="projet">Un projet spécifique</option>
                </select>

                {/* Dropdown dynamique du projet spécifique */}
                {perimetre === 'projet' && (
                  <div className="mt-1.5 animate-in slide-in-from-top-1 duration-150">
                    <select
                      id="report-projet-specific"
                      value={projetSelectionneId}
                      onChange={(e) => setProjetSelectionneId(e.target.value)}
                      className="w-full rounded-xl border border-[#6B8E78]/30 bg-white px-3 py-2 text-xs font-normal text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                    >
                      {spaceProjects.length === 0 ? (
                        <option value="">Aucun projet dans cet espace</option>
                      ) : (
                        spaceProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nom}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* Destinataire / Cible */}
              <div>
                <label
                  htmlFor="report-cible"
                  className="block text-xs font-medium text-[#737873] mb-1 flex items-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5 text-[#5B7083]" />
                  <span>Destinataire :</span>
                </label>
                <select
                  id="report-cible"
                  value={cible}
                  onChange={(e) => setCible(e.target.value as 'n1' | 'codir')}
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs font-normal text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                >
                  <option value="n1">Responsable direct (N+1)</option>
                  <option value="codir">Comité de Direction / CODIR</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bouton principal de génération et compteurs */}
          <div className="pt-2 border-t border-[#F0EFEB]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Badge de tâches correspondantes */}
            <div className="flex items-center gap-2 text-xs font-medium">
              <span
                id="report-matching-count-badge"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] ${
                  matchingTasks.length > 0
                    ? 'bg-[#6B8E78]/10 text-[#4e634a] border-[#6B8E78]/25'
                    : 'bg-[#C89B7B]/10 text-[#966847] border-[#C89B7B]/25'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>
                  <strong>{matchingTasks.length}</strong> tâche{matchingTasks.length > 1 ? 's' : ''} active
                  {matchingTasks.length > 1 ? 's' : ''} ({uniqueProjectsCount} projet
                  {uniqueProjectsCount > 1 ? 's' : ''})
                </span>
              </span>
            </div>

            <button
              id="generate-ai-report-btn"
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || matchingTasks.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6B8E78] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#5d7c68] disabled:bg-[#F0EFEB] disabled:text-[#737873]/50 disabled:cursor-not-allowed transition-all active:scale-[0.99] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Rédaction du rapport en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Générer le rapport IA</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. CORPS DE LA MODAL (Résultat, Chargement ou État initial) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F9F8F6]/60 min-h-[300px]">
          {/* Message d'erreur si échec */}
          {errorMessage && (
            <div
              id="report-error-banner"
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 space-y-2 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2 font-medium text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span>Impossible de générer le rapport</span>
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-1 font-medium text-rose-700 underline hover:text-rose-900"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Réessayer la génération</span>
              </button>
            </div>
          )}

          {/* SPINNER DE CHARGEMENT ÉLÉGANT */}
          {isLoading && (
            <div
              id="report-generating-spinner"
              className="flex flex-col items-center justify-center py-16 space-y-4 text-center"
            >
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-[#6B8E78]/15 animate-ping opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-2xl bg-[#6B8E78] text-white flex items-center justify-center shadow-none">
                    <Sparkles className="h-6 w-6 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-medium text-[#1A1D1A]">
                  L&apos;IA Gemini analyse vos activités...
                </h4>
                <p className="text-xs text-[#737873] leading-relaxed">
                  {cible === 'codir' ? (
                    <>
                      Synthèse stratégique Executive Summary de haut niveau. Regroupement par projet et focus
                      sur les jalons franchis, la météo et l&apos;analyse des risques majeurs pour le CODIR.
                    </>
                  ) : (
                    <>
                      Regroupement strict par projet, synthèse de l&apos;avancement et formulation d&apos;un
                      compte-rendu serein et constructif destiné à votre responsable direct (N+1).
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ÉCRAN INITIAL : Aucune génération lancée */}
          {!isLoading && !reportResult && !errorMessage && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#6B8E78] border border-[#F0EFEB] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <FolderGit2 className="h-6 w-6" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-sm font-medium text-[#1A1D1A]">
                  Prêt à générer votre compte-rendu d&apos;activité
                </h4>
                <p className="text-xs text-[#737873] leading-relaxed font-light">
                  {matchingTasks.length > 0 ? (
                    <>
                      <strong>{matchingTasks.length} tâche(s)</strong> actives ou modifiées identifiées
                      sur cette période. Cliquez sur <strong>« Générer le rapport IA »</strong> pour
                      obtenir une synthèse structurée pour votre <strong>{cible === 'n1' ? 'responsable direct (N+1)' : 'Comité de Direction (CODIR)'}</strong>.
                    </>
                  ) : (
                    <>
                      Aucune activité enregistrée sur cette période pour le périmètre sélectionné.
                      Ajustez les dates ou changez de projet ci-dessus.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ÉCRAN RÉSULTAT : Le rapport a été généré */}
          {!isLoading && reportResult && (
            <div id="report-output-container" className="space-y-3">
              {/* Barre d'outils du résultat */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EFEB] pb-2.5">
                {/* Onglets d'affichage */}
                <div className="flex items-center rounded-xl border border-[#F0EFEB] bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-[#6B8E78] text-white'
                        : 'text-[#737873] hover:bg-[#F0EFEB]'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Aperçu formaté</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('raw')}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === 'raw'
                        ? 'bg-[#6B8E78] text-white'
                        : 'text-[#737873] hover:bg-[#F0EFEB]'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Texte brut</span>
                  </button>
                </div>

                {/* Actions : Copier et Télécharger */}
                <div className="flex items-center gap-2">
                  <button
                    id="copy-report-clipboard-btn"
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-medium text-white hover:bg-[#5d7c68] active:scale-[0.99] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                    title="Copier le rapport complet dans le presse-papier"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 stroke-[2.5]" />
                        <span>Copié dans le presse-papier !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copier dans le presse-papier</span>
                      </>
                    )}
                  </button>

                  <button
                    id="download-report-btn"
                    type="button"
                    onClick={handleDownloadMarkdown}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
                    title="Télécharger en fichier Markdown (.md)"
                  >
                    <Download className="h-3.5 w-3.5 text-[#737873]" />
                    <span className="hidden sm:inline">Télécharger .md</span>
                  </button>
                </div>
              </div>

              {/* Rendu dynamique : Markdown ou Texte brut */}
              {activeTab === 'preview' ? (
                <div
                  id="report-rendered-markdown"
                  className="rounded-2xl border border-[#F0EFEB] bg-white p-6 sm:p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-[#1A1D1A] leading-relaxed overflow-x-auto select-text"
                >
                  <div className="prose prose-sm max-w-none text-[#1A1D1A] prose-headings:text-[#1A1D1A] prose-headings:font-normal prose-h2:text-sm prose-h2:border-b prose-h2:border-[#F0EFEB] prose-h2:pb-1.5 prose-h2:mt-4 prose-h2:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
                    <Markdown>{reportResult}</Markdown>
                  </div>
                </div>
              ) : (
                <div id="report-raw-text-container">
                  <textarea
                    id="report-raw-textarea"
                    readOnly
                    value={reportResult}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    rows={16}
                    className="w-full rounded-2xl border border-[#F0EFEB] bg-white p-4 font-mono text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden leading-relaxed resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. PIED DE PAGE DE LA MODAL */}
        <div className="flex items-center justify-between border-t border-[#F0EFEB] bg-white px-5 py-3.5 shrink-0 text-xs text-[#737873]">
          <div className="flex items-center gap-2">
            <Send className="h-3.5 w-3.5 text-[#5B7083]" />
            <span className="hidden sm:inline font-light">
              Rapport personnalisé et optimisé prêt pour vos échanges.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="report-modal-footer-close-btn"
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#F0EFEB] bg-white px-4 py-1.5 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityReportModal;
