import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  CheckCircle2,
  AlertOctagon,
  MessageSquare,
  Clock,
  Folder,
  ArrowRight,
  Download,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { Tache, Projet, Espace } from '../types';
import { getTodayDateString } from '../utils/storage';
import { getWorkspaceIconComponent } from '../utils/workspaceIcons';
import { EmailInboxAlert } from './EmailInboxAlert';

interface DailyReportPanelProps {
  tasks: Tache[];
  projects: Projet[];
  activeSpace?: Espace;
  onOpenActivityReportModal?: (startDate?: string, endDate?: string) => void;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DailyReportPanel: React.FC<DailyReportPanelProps> = ({
  tasks,
  projects,
  activeSpace,
  onOpenActivityReportModal,
}) => {
  const todayStr = useMemo(() => getTodayDateString(), []);
  const ActiveSpaceIcon = activeSpace ? getWorkspaceIconComponent(activeSpace.icone) : null;

  // Plage de dates : Date de début (jour ouvré d'avant aujourd'hui) et Date de fin (aujourd'hui)
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    // Reculer d'un jour d'abord
    now.setDate(now.getDate() - 1);
    
    // Dimanche (0) -> reculer à Vendredi (-2 jours)
    if (now.getDay() === 0) {
      now.setDate(now.getDate() - 2);
    }
    // Samedi (6) -> reculer à Vendredi (-1 jour)
    else if (now.getDay() === 6) {
      now.setDate(now.getDate() - 1);
    }
    
    // Formater au format YYYY-MM-DD
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Normalisation de l'intervalle [Date de début, Date de fin]
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    if (!startDate && !endDate) {
      return { effectiveStart: todayStr, effectiveEnd: todayStr };
    }
    const s = startDate || endDate;
    const e = endDate || startDate;
    return s <= e ? { effectiveStart: s, effectiveEnd: e } : { effectiveStart: e, effectiveEnd: s };
  }, [startDate, endDate, todayStr]);

  const isSingleDay = effectiveStart === effectiveEnd;

  // Projets map pour accès rapide
  const projectsMap = useMemo(() => {
    const map = new Map<string, Projet>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // 1. Tâches terminées ("Done") dans l'intervalle sélectionné
  const completedTasksInPeriod = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.statut !== 'Done') return false;
        const taskDate = (t.dateRealisation || t.dateModification || '').split('T')[0];
        return taskDate >= effectiveStart && taskDate <= effectiveEnd;
      })
      .sort((a, b) => {
        const timeA = a.dateRealisation ? new Date(a.dateRealisation).getTime() : 0;
        const timeB = b.dateRealisation ? new Date(b.dateRealisation).getTime() : 0;
        return timeB - timeA;
      });
  }, [tasks, effectiveStart, effectiveEnd]);

  // 2. Tâches bloquées ("Blocked") dans l'intervalle sélectionné
  const blockedTasksInPeriod = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.statut !== 'Blocked') return false;
        // Vérifier si la date de modification ou l'un des commentaires de blocage se situe dans l'intervalle
        const modDate = (t.dateModification || '').split('T')[0];
        const hasBlockedCommentInPeriod = t.commentaires?.some((c) => {
          const cDate = c.date.split('T')[0];
          return (
            cDate >= effectiveStart &&
            cDate <= effectiveEnd &&
            c.texte.toLowerCase().includes('bloqué')
          );
        });

        const isModifiedInPeriod = modDate >= effectiveStart && modDate <= effectiveEnd;
        return isModifiedInPeriod || hasBlockedCommentInPeriod;
      })
      .sort((a, b) => {
        const timeA = a.dateModification ? new Date(a.dateModification).getTime() : 0;
        const timeB = b.dateModification ? new Date(b.dateModification).getTime() : 0;
        return timeB - timeA;
      });
  }, [tasks, effectiveStart, effectiveEnd]);

  // 3. Commentaires & notes saisis dans l'intervalle sélectionné sur toutes les tâches
  interface CommentReportItem {
    id: string;
    taskTitle: string;
    taskId: string;
    taskStatus: string;
    project?: Projet;
    texte: string;
    date: string;
  }

  const commentsInPeriod = useMemo(() => {
    const list: CommentReportItem[] = [];
    tasks.forEach((task) => {
      const proj = task.projetId ? projectsMap.get(task.projetId) : undefined;
      task.commentaires?.forEach((comm) => {
        const commDate = comm.date.split('T')[0];
        if (commDate >= effectiveStart && commDate <= effectiveEnd) {
          list.push({
            id: comm.id,
            taskTitle: task.titre,
            taskId: task.id,
            taskStatus: task.statut,
            project: proj,
            texte: comm.texte,
            date: comm.date,
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tasks, projectsMap, effectiveStart, effectiveEnd]);

  // Raccourcis d'action rapide
  const applyPreset = (preset: 'today' | 'last7days' | 'thisMonth') => {
    const now = new Date();
    if (preset === 'today') {
      const today = formatLocalDate(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'last7days') {
      const today = formatLocalDate(now);
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setStartDate(formatLocalDate(past));
      setEndDate(today);
    } else if (preset === 'thisMonth') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      setStartDate(formatLocalDate(firstDay));
      setEndDate(formatLocalDate(lastDay));
    }
  };

  // Détection des présets actifs
  const activePreset = useMemo<'today' | 'last7days' | 'thisMonth' | null>(() => {
    const now = new Date();
    const today = formatLocalDate(now);

    if (startDate === today && endDate === today) {
      return 'today';
    }

    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    if (startDate === formatLocalDate(past7) && endDate === today) {
      return 'last7days';
    }

    const firstDay = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastDay = formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    if (startDate === firstDay && endDate === lastDay) {
      return 'thisMonth';
    }

    return null;
  }, [startDate, endDate]);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate && val > endDate) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val < startDate) {
      setStartDate(val);
    }
  };

  const formatFrenchDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return dateObj.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatReadableDateLong = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatItemTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const timeStr = d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (isSingleDay) {
        return timeStr;
      }
      const dayStr = d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
      return `${dayStr}, ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  // Export du rapport filtré en JSON
  const handleExportFilteredReport = () => {
    const reportPayload = {
      titre: 'Rapport d’Activité Filtré',
      periode: {
        debut: effectiveStart,
        fin: effectiveEnd,
      },
      exporteLe: new Date().toISOString(),
      statistiques: {
        tachesTerminees: completedTasksInPeriod.length,
        tachesBloquees: blockedTasksInPeriod.length,
        commentairesSaisis: commentsInPeriod.length,
      },
      tachesTerminees: completedTasksInPeriod.map((t) => ({
        id: t.id,
        titre: t.titre,
        projet: t.projetId ? projectsMap.get(t.projetId)?.nom || null : null,
        dateRealisation: t.dateRealisation,
        commentaires: t.commentaires,
      })),
      tachesBloquees: blockedTasksInPeriod.map((t) => ({
        id: t.id,
        titre: t.titre,
        projet: t.projetId ? projectsMap.get(t.projetId)?.nom || null : null,
        dateModification: t.dateModification,
        commentaires: t.commentaires,
      })),
      commentaires: commentsInPeriod,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reportPayload, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `rapport-activite-${effectiveStart}_au_${effectiveEnd}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copie d'un résumé texte formaté dans le presse-papiers
  const handleCopySummary = () => {
    const lines: string[] = [];
    lines.push(`📋 RAPPORT D'ACTIVITÉ : ${effectiveStart} au ${effectiveEnd}`);
    lines.push('────────────────────────────────────────');
    lines.push(`✅ TÂCHES CLÔTURÉES (${completedTasksInPeriod.length}) :`);
    if (completedTasksInPeriod.length === 0) {
      lines.push('  • Aucune tâche clôturée sur cette période.');
    } else {
      completedTasksInPeriod.forEach((t) => {
        const pNom = t.projetId ? ` [${projectsMap.get(t.projetId)?.nom || ''}]` : '';
        lines.push(`  • ${t.titre}${pNom} (réalisé le ${t.dateRealisation?.split('T')[0] || ''})`);
      });
    }

    lines.push('');
    lines.push(`⛔ TÂCHES BLOQUÉES (${blockedTasksInPeriod.length}) :`);
    if (blockedTasksInPeriod.length === 0) {
      lines.push('  • Aucune tâche bloquée sur cette période.');
    } else {
      blockedTasksInPeriod.forEach((t) => {
        const pNom = t.projetId ? ` [${projectsMap.get(t.projetId)?.nom || ''}]` : '';
        const lastComment = t.commentaires?.[t.commentaires.length - 1]?.texte || 'Sans motif';
        lines.push(`  • ${t.titre}${pNom} - ${lastComment}`);
      });
    }

    lines.push('');
    lines.push(`💬 COMMENTAIRES & SUIVI (${commentsInPeriod.length}) :`);
    if (commentsInPeriod.length === 0) {
      lines.push('  • Aucun commentaire rédigé sur cette période.');
    } else {
      commentsInPeriod.forEach((c) => {
        lines.push(`  • [${c.taskTitle}] ${c.texte}`);
      });
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    });
  };

  return (
    <div id="daily-report-section" className="space-y-6">
      {/* En-tête avec Sélecteur de plage de dates et actions rapides */}
      <div
        id="daily-report-header"
        className="rounded-2xl border border-[#F0EFEB] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6B8E78]/10 text-[#6B8E78]">
                <CalendarRange className="h-4 w-4" />
              </span>
              <h2 className="text-base font-normal tracking-wide text-[#1A1D1A]">
                Rapport d&apos;Activité & Suivi
              </h2>
              {activeSpace && ActiveSpaceIcon && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0EFEB] bg-[#F9F8F6] px-2.5 py-1 text-xs font-medium text-[#737873]">
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded text-white"
                    style={{ backgroundColor: activeSpace.couleur || '#6B8E78' }}
                  >
                    <ActiveSpaceIcon className="h-2.5 w-2.5 stroke-[2.5]" />
                  </span>
                  <span>Espace : {activeSpace.nom}</span>
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#737873] capitalize font-light">
              {isSingleDay ? (
                <>
                  {formatReadableDateLong(effectiveStart)}{' '}
                  {effectiveStart === todayStr && '• (Aujourd’hui)'}
                </>
              ) : (
                <>
                  Période du <strong className="text-[#1A1D1A] font-medium">{formatFrenchDate(effectiveStart)}</strong> au{' '}
                  <strong className="text-[#1A1D1A] font-medium">{formatFrenchDate(effectiveEnd)}</strong>
                </>
              )}
            </p>
          </div>

          {/* Boutons d'action rapide et export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Raccourcis de dates */}
            <div
              id="report-quick-presets"
              className="flex items-center rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] p-0.5"
            >
              <button
                id="preset-today-btn"
                type="button"
                onClick={() => applyPreset('today')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activePreset === 'today'
                    ? 'bg-white text-[#1A1D1A] shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
                    : 'text-[#737873] hover:text-[#1A1D1A]'
                }`}
              >
                Aujourd&apos;hui
              </button>
              <button
                id="preset-last7days-btn"
                type="button"
                onClick={() => applyPreset('last7days')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activePreset === 'last7days'
                    ? 'bg-white text-[#1A1D1A] shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
                    : 'text-[#737873] hover:text-[#1A1D1A]'
                }`}
              >
                Les 7 derniers jours
              </button>
              <button
                id="preset-thisMonth-btn"
                type="button"
                onClick={() => applyPreset('thisMonth')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activePreset === 'thisMonth'
                    ? 'bg-white text-[#1A1D1A] shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
                    : 'text-[#737873] hover:text-[#1A1D1A]'
                }`}
              >
                Ce mois-ci
              </button>
            </div>

            {/* Boutons Exporter, Copier et Rapport IA */}
            <div className="flex items-center gap-1.5">
              {onOpenActivityReportModal && (
                <button
                  id="open-ai-report-from-panel-btn"
                  type="button"
                  onClick={() => onOpenActivityReportModal(effectiveStart, effectiveEnd)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#5d7c68] active:scale-[0.99] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                  title="Générer un compte-rendu synthétique professionnel avec l'IA Gemini pour cette période"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Rapport IA</span>
                </button>
              )}

              <button
                id="export-filtered-report-btn"
                type="button"
                onClick={handleExportFilteredReport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0EFEB] bg-white px-3 py-1.5 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                title="Exporter ce rapport filtré en fichier JSON"
              >
                <Download className="h-3.5 w-3.5 text-[#5B7083]" />
                <span className="hidden sm:inline">Exporter</span>
              </button>

              <button
                id="copy-summary-report-btn"
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                title="Copier le résumé dans le presse-papiers"
              >
                {copiedSummary ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#6B8E78]" />
                    <span className="text-[#6B8E78] hidden sm:inline">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#737873]" />
                    <span className="hidden sm:inline">Copier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Champs de sélection Date de début et Date de fin */}
        <div className="mt-4 pt-4 border-t border-[#F0EFEB] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label
              htmlFor="report-start-date-input"
              className="block text-xs font-medium text-[#737873] mb-1"
            >
              Date de début
            </label>
            <div className="relative">
              <input
                id="report-start-date-input"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-1.5 text-xs font-normal text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
              />
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center pt-5 text-[#737873]/50">
            <ArrowRight className="h-4 w-4" />
          </div>

          <div className="flex-1">
            <label
              htmlFor="report-end-date-input"
              className="block text-xs font-medium text-[#737873] mb-1"
            >
              Date de fin
            </label>
            <div className="relative">
              <input
                id="report-end-date-input"
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-1.5 text-xs font-normal text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Métriques synthétiques (3 volets : Terminées, Bloquées, Notes) */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            id="metric-completed-card"
            className="flex items-center gap-3 rounded-xl border border-[#6B8E78]/20 bg-[#6B8E78]/5 p-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6B8E78]/15 text-[#4e634a]">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#4e634a]">Tâches clôturées</p>
              <p className="text-lg font-medium text-[#4e634a]">
                {completedTasksInPeriod.length}
              </p>
            </div>
          </div>

          <div
            id="metric-blocked-card"
            className="flex items-center gap-3 rounded-xl border border-[#C89B7B]/25 bg-[#C89B7B]/10 p-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C89B7B]/20 text-[#966847]">
              <AlertOctagon className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#966847]">Tâches bloquées</p>
              <p className="text-lg font-medium text-[#966847]">
                {blockedTasksInPeriod.length}
              </p>
            </div>
          </div>

          <div
            id="metric-comments-card"
            className="flex items-center gap-3 rounded-xl border border-[#5B7083]/20 bg-[#5B7083]/5 p-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5B7083]/15 text-[#5B7083]">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#5B7083]">Notes & commentaires</p>
              <p className="text-lg font-medium text-[#5B7083]">{commentsInPeriod.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerte dynamique d'emails non classés (Zero Inbox) */}
      {activeSpace && (
        <EmailInboxAlert spaceId={activeSpace.id} spaceName={activeSpace.nom} />
      )}

      {/* Grille des volets du rapport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Volet 1: Tâches clôturées ("Done") */}
        <div
          id="report-completed-tasks-container"
          className="rounded-2xl border border-[#F0EFEB] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EFEB] mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#6B8E78]" />
              <h3 className="text-sm font-medium text-[#1A1D1A]">
                Tâches clôturées ({completedTasksInPeriod.length})
              </h3>
            </div>
            <span className="text-[11px] font-medium text-[#737873]">
              Date de réalisation
            </span>
          </div>

          {completedTasksInPeriod.length === 0 ? (
            <div
              id="empty-completed-tasks-message"
              className="flex flex-col items-center justify-center py-12 text-center text-[#737873] my-auto"
            >
              <Sparkles className="h-7 w-7 text-[#737873]/40 mb-2" />
              <p className="text-xs font-medium text-[#1A1D1A]">
                Aucune tâche clôturée sur cette période
              </p>
              <p className="text-[11px] text-[#737873] mt-1 max-w-xs font-light">
                Aucune tâche n&apos;a été finalisée entre le {formatFrenchDate(effectiveStart)} et le{' '}
                {formatFrenchDate(effectiveEnd)}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-96 pr-1">
              {completedTasksInPeriod.map((task) => {
                const project = task.projetId ? projectsMap.get(task.projetId) : undefined;
                return (
                  <div
                    key={task.id}
                    id={`report-task-${task.id}`}
                    className="rounded-xl border border-[#F0EFEB] bg-[#F9F8F6]/70 p-3 hover:bg-[#F9F8F6] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-medium text-[#737873] line-through decoration-[#A3B19B]">
                        {task.titre}
                      </h4>
                      {task.dateRealisation && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500 text-white px-2 py-0.5 text-[11px] font-medium shrink-0 shadow-2xs">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{formatItemTimestamp(task.dateRealisation)}</span>
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="mt-1 text-xs text-[#737873] line-clamp-2 font-light">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {project && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border"
                          style={{
                            backgroundColor: `${project.couleur}10`,
                            color: project.couleur,
                            borderColor: `${project.couleur}30`,
                          }}
                        >
                          <Folder className="h-2.5 w-2.5" />
                          {project.nom}
                        </span>
                      )}
                      <span className="text-[10px] text-[#737873]">
                        {task.commentaires?.length || 0} note(s)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Volet 2: Tâches bloquées ("Blocked") */}
        <div
          id="report-blocked-tasks-container"
          className="rounded-2xl border border-[#F0EFEB] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EFEB] mb-4">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-[#C89B7B]" />
              <h3 className="text-sm font-medium text-[#1A1D1A]">
                Tâches bloquées ({blockedTasksInPeriod.length})
              </h3>
            </div>
            <span className="text-[11px] font-medium text-[#737873]">
              Points d&apos;attention
            </span>
          </div>

          {blockedTasksInPeriod.length === 0 ? (
            <div
              id="empty-blocked-tasks-message"
              className="flex flex-col items-center justify-center py-12 text-center text-[#737873] my-auto"
            >
              <CheckCircle2 className="h-7 w-7 text-[#6B8E78]/50 mb-2" />
              <p className="text-xs font-medium text-[#1A1D1A]">
                Aucune tâche bloquée sur cette période
              </p>
              <p className="text-[11px] text-[#737873] mt-1 max-w-xs font-light">
                Aucun blocage n&apos;a été signalé entre le {formatFrenchDate(effectiveStart)} et le{' '}
                {formatFrenchDate(effectiveEnd)}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-96 pr-1">
              {blockedTasksInPeriod.map((task) => {
                const project = task.projetId ? projectsMap.get(task.projetId) : undefined;
                const lastBlockedComment = [...(task.commentaires || [])]
                  .reverse()
                  .find((c) => c.texte.toLowerCase().includes('bloqué'))?.texte;

                return (
                  <div
                    key={task.id}
                    id={`report-blocked-task-${task.id}`}
                    className="rounded-xl border border-[#C89B7B]/30 bg-[#C89B7B]/10 p-3 hover:bg-[#C89B7B]/15 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-900">
                        {task.titre}
                      </h4>
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-500 text-white px-2 py-0.5 text-xs font-bold shrink-0 shadow-2xs">
                        Bloqué
                      </span>
                    </div>

                    {lastBlockedComment && (
                      <p className="mt-1.5 rounded-lg bg-white/90 p-2 text-xs font-normal text-[#966847] border border-[#C89B7B]/20 leading-snug">
                        {lastBlockedComment}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      {project ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border"
                          style={{
                            backgroundColor: `${project.couleur}10`,
                            color: project.couleur,
                            borderColor: `${project.couleur}30`,
                          }}
                        >
                          <Folder className="h-2.5 w-2.5" />
                          {project.nom}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#737873]">Sans projet</span>
                      )}
                      {task.dateModification && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#737873]">
                          <Clock className="h-3 w-3 text-[#737873]" />
                          {formatItemTimestamp(task.dateModification)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Volet 3: Commentaires rédigés sur l'intervalle */}
        <div
          id="report-comments-container"
          className="rounded-2xl border border-[#F0EFEB] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EFEB] mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#5B7083]" />
              <h3 className="text-sm font-medium text-[#1A1D1A]">
                Notes & Suivi ({commentsInPeriod.length})
              </h3>
            </div>
            <span className="text-[11px] font-medium text-[#737873]">
              Historique transverse
            </span>
          </div>

          {commentsInPeriod.length === 0 ? (
            <div
              id="empty-comments-message"
              className="flex flex-col items-center justify-center py-12 text-center text-[#737873] my-auto"
            >
              <MessageSquare className="h-7 w-7 text-[#737873]/40 mb-2" />
              <p className="text-xs font-medium text-[#1A1D1A]">
                Aucune note saisie sur cette période
              </p>
              <p className="text-[11px] text-[#737873] mt-1 max-w-xs font-light">
                Aucun commentaire n&apos;a été consigné entre le {formatFrenchDate(effectiveStart)} et le{' '}
                {formatFrenchDate(effectiveEnd)}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-96 pr-1">
              {commentsInPeriod.map((item) => (
                <div
                  key={item.id}
                  id={`report-comment-${item.id}`}
                  className="rounded-xl border border-[#F0EFEB] bg-white p-3 space-y-1.5 hover:border-[#E2DFD8] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ArrowRight className="h-3 w-3 text-[#737873] shrink-0" />
                      <span className="font-medium text-[#1A1D1A] truncate" title={item.taskTitle}>
                        {item.taskTitle}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-normal text-[#737873] shrink-0">
                      <Clock className="h-3 w-3 text-[#737873]" />
                      {formatItemTimestamp(item.date)}
                    </span>
                  </div>

                  <p className="rounded-lg bg-[#F9F8F6] p-2 text-xs text-[#1A1D1A] leading-relaxed whitespace-pre-wrap border border-[#F0EFEB] font-light">
                    {item.texte}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
