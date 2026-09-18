import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  X,
  Info,
  Loader2,
} from 'lucide-react';
import {
  fetchMonthTimeEntries,
  saveTimeEntry,
  fetchTimesheetConfig,
  saveTimesheetConfig,
} from '../services/timesheetService';
import {
  TimeEntry,
  PMOProject,
  TimesheetConfig,
  DEFAULT_PMO_PROJECTS,
  ABSENCE_PROJECT,
} from '../types/timesheet';
import { Projet } from '../types';
import { TimesheetProjectManager } from './TimesheetProjectManager';

interface TimesheetGridProps {
  userId: string;
  spaceId: string;
  spaceName?: string;
  globalProjects: Projet[]; // Tous les projets de l'espace
  onCreateGlobalProject: (nom: string, jiraKey: string) => Promise<void>; // Créer un projet globalement
  onUpdateGlobalProject: (id: string, nom: string, jiraKey: string) => Promise<void>; // Mettre à jour un projet globalement
  onOpenReportModal: (year: number, month: number) => void;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const TimesheetGrid: React.FC<TimesheetGridProps> = ({
  userId,
  spaceId,
  spaceName = 'Principal',
  globalProjects,
  onCreateGlobalProject,
  onUpdateGlobalProject,
  onOpenReportModal,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1); // 1-12
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingCell, setSavingCell] = useState<string | null>(null); // e.g. "date_jiraKey"
  const [error, setError] = useState<string | null>(null);

  // États pour les projets de la timesheet
  const [activeProjectIds, setActiveProjectIds] = useState<string[]>([]);
  const [hiddenProjectIds, setHiddenProjectIds] = useState<string[]>([]);
  const [customProjects, setCustomProjects] = useState<PMOProject[]>([]);

  // Pour la modale d'édition de commentaire
  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    date: string;
    jiraKey: string;
    projectName: string;
    hours: number;
    comment: string;
  } | null>(null);

  // Charger les entrées de temps et la configuration des projets au changement de mois / année / espace
  const loadEntriesAndConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesData, configData] = await Promise.all([
        fetchMonthTimeEntries(userId, spaceId, currentYear, currentMonth),
        fetchTimesheetConfig(userId, spaceId, currentYear, currentMonth),
      ]);

      setEntries(entriesData);

      if (configData) {
        setActiveProjectIds(configData.activeProjectIds || []);
        setHiddenProjectIds(configData.hiddenProjectIds || []);
        setCustomProjects(configData.customProjects || []);
      } else {
        // Si aucune configuration, activer tous les projets du workspace par défaut
        setActiveProjectIds(globalProjects.map((gp) => gp.id));
        setHiddenProjectIds([]);
        setCustomProjects([]);
      }
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les données de la feuille de temps.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && spaceId) {
      loadEntriesAndConfig();
    }
  }, [userId, spaceId, currentYear, currentMonth, globalProjects.length]);

  // Obtenir le nombre de jours dans le mois sélectionné
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Générer la liste des jours avec métadonnées (jour de la semaine, weekend)
  const daysList = useMemo(() => {
    const list = [];
    const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Dimanche=0, Lundi=1, etc.
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(currentYear, currentMonth - 1, day);
      const dayOfWeekNum = dateObj.getDay();
      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      list.push({
        day,
        dayName: dayNames[dayOfWeekNum],
        isWeekend,
        dateStr,
      });
    }
    return list;
  }, [currentYear, currentMonth, daysInMonth]);

  // Construire la liste des projets actifs à afficher (sans absences)
  const activeProjects = useMemo(() => {
    // 1. Projets du workspace qui ne sont pas explicitement cachés
    const list: PMOProject[] = globalProjects
      .filter((gp) => !hiddenProjectIds.includes(gp.id))
      .map((gp) => ({
        id: gp.id,
        code: gp.jiraKey || gp.id,
        name: gp.nom,
      }));

    // 2. S'assurer que les projets avec des heures imputées ce mois-ci sont visibles, SAUF s'ils ont été explicitement masqués
    globalProjects.forEach((gp) => {
      const key = gp.jiraKey || gp.id;
      const hasHours = entries.some((e) => e.jiraKey === key);
      if (hasHours && !hiddenProjectIds.includes(gp.id) && !list.some((p) => p.id === gp.id)) {
        list.push({
          id: gp.id,
          code: key,
          name: gp.nom,
        });
      }
    });

    // 3. Ajouter les projets customisés
    customProjects.forEach((cp) => {
      if (!list.some((p) => p.code === cp.code)) {
        list.push(cp);
      }
    });

    // 4. Si vide et aucun projet dans l'app, utiliser les projets de démonstration
    if (list.length === 0 && globalProjects.length === 0) {
      return DEFAULT_PMO_PROJECTS;
    }

    return list;
  }, [globalProjects, hiddenProjectIds, customProjects, entries]);

  // Ajouter la ligne fixe des absences "Vacances / Congés / Maladie" à la fin
  const projectsToRender = useMemo(() => {
    return [...activeProjects, ABSENCE_PROJECT];
  }, [activeProjects]);

  // Structurer les heures loggées sous forme de dictionnaire pour un accès ultra-rapide
  const entriesMap = useMemo(() => {
    const map: Record<string, { hours: number; comment: string; entry: TimeEntry }> = {};
    entries.forEach((e) => {
      const key = `${e.date}_${e.jiraKey}`;
      map[key] = {
        hours: e.hours,
        comment: e.comment || '',
        entry: e,
      };
    });
    return map;
  }, [entries]);

  // Calculer la somme des heures par jour (pour le total de colonne)
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    daysList.forEach((d) => {
      let sum = 0;
      projectsToRender.forEach((p) => {
        const key = `${d.dateStr}_${p.code}`;
        sum += entriesMap[key]?.hours || 0;
      });
      totals[d.dateStr] = sum;
    });
    return totals;
  }, [daysList, entriesMap, projectsToRender]);

  // Calculer la somme des heures par projet (pour le total de ligne)
  const projectTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    projectsToRender.forEach((p) => {
      let sum = 0;
      daysList.forEach((d) => {
        const key = `${d.dateStr}_${p.code}`;
        sum += entriesMap[key]?.hours || 0;
      });
      totals[p.code] = sum;
      grandTotal += sum;
    });

    return { projects: totals, grandTotal };
  }, [daysList, entriesMap, projectsToRender]);

  // Gérer la distribution de temps par code projet pour désactiver le masquage si total > 0
  const projectHoursRecord = useMemo(() => {
    const record: Record<string, number> = {};
    projectsToRender.forEach((p) => {
      record[p.code] = projectTotals.projects[p.code] || 0;
    });
    return record;
  }, [projectsToRender, projectTotals]);

  // Actions de configuration
  const handleAddProjectToTimesheet = (projectId: string) => {
    const updatedActive = [...activeProjectIds];
    if (!updatedActive.includes(projectId)) {
      updatedActive.push(projectId);
    }
    const updatedHidden = hiddenProjectIds.filter((id) => id !== projectId);

    setActiveProjectIds(updatedActive);
    setHiddenProjectIds(updatedHidden);

    saveTimesheetConfig(userId, spaceId, currentYear, currentMonth, {
      spaceId,
      year: currentYear,
      month: currentMonth,
      activeProjectIds: updatedActive,
      hiddenProjectIds: updatedHidden,
      customProjects,
    }).catch((err) => console.error('Erreur sauvegarde config timesheet:', err));
  };

  const handleHideProjectFromTimesheet = (projectId: string) => {
    const updatedActive = activeProjectIds.filter((id) => id !== projectId);
    const updatedHidden = [...hiddenProjectIds];
    if (!updatedHidden.includes(projectId)) {
      updatedHidden.push(projectId);
    }

    setActiveProjectIds(updatedActive);
    setHiddenProjectIds(updatedHidden);

    saveTimesheetConfig(userId, spaceId, currentYear, currentMonth, {
      spaceId,
      year: currentYear,
      month: currentMonth,
      activeProjectIds: updatedActive,
      hiddenProjectIds: updatedHidden,
      customProjects,
    }).catch((err) => console.error('Erreur sauvegarde config timesheet:', err));
  };

  const handleShowProjectInTimesheet = (projectId: string) => {
    const updatedHidden = hiddenProjectIds.filter((id) => id !== projectId);
    const updatedActive = [...activeProjectIds];
    if (!updatedActive.includes(projectId)) {
      updatedActive.push(projectId);
    }

    setHiddenProjectIds(updatedHidden);
    setActiveProjectIds(updatedActive);

    saveTimesheetConfig(userId, spaceId, currentYear, currentMonth, {
      spaceId,
      year: currentYear,
      month: currentMonth,
      activeProjectIds: updatedActive,
      hiddenProjectIds: updatedHidden,
      customProjects,
    }).catch((err) => console.error('Erreur sauvegarde config timesheet:', err));
  };

  const handleCreateGlobalProject = async (nom: string, jiraKey: string) => {
    await onCreateGlobalProject(nom, jiraKey);
    const updatedHidden = hiddenProjectIds.filter((id) => id !== jiraKey);
    setHiddenProjectIds(updatedHidden);
  };

  const handleAddCustomProject = (name: string, code: string) => {
    const newCustom: PMOProject = { code, name };
    const updatedCustom = [...customProjects, newCustom];
    setCustomProjects(updatedCustom);

    saveTimesheetConfig(userId, spaceId, currentYear, currentMonth, {
      spaceId,
      year: currentYear,
      month: currentMonth,
      activeProjectIds,
      hiddenProjectIds,
      customProjects: updatedCustom,
    }).catch((err) => console.error('Erreur sauvegarde config timesheet:', err));
  };

  const handleRemoveCustomProject = (code: string) => {
    const updatedCustom = customProjects.filter((p) => p.code !== code);
    setCustomProjects(updatedCustom);

    saveTimesheetConfig(userId, spaceId, currentYear, currentMonth, {
      spaceId,
      year: currentYear,
      month: currentMonth,
      activeProjectIds,
      hiddenProjectIds,
      customProjects: updatedCustom,
    }).catch((err) => console.error('Erreur sauvegarde config timesheet:', err));
  };

  // Changer de mois
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Modifier les heures à la volée
  const handleHoursChange = async (dateStr: string, jiraKey: string, projectName: string, valueStr: string) => {
    const hours = parseFloat(valueStr);
    const cellKey = `${dateStr}_${jiraKey}`;

    if (isNaN(hours) || hours < 0) return;
    if (hours > 24) {
      alert('La valeur maximale autorisée est de 24 heures par jour.');
      return;
    }

    setSavingCell(cellKey);
    try {
      const existingComment = entriesMap[cellKey]?.comment || '';

      await saveTimeEntry(userId, spaceId, {
        jiraKey,
        projectName,
        date: dateStr,
        hours,
        comment: existingComment,
      });

      setEntries((prev) => {
        const docId = `${dateStr}_${jiraKey}`;
        const filtered = prev.filter((e) => e.id !== docId);
        if (hours <= 0) return filtered;

        const newEntry: TimeEntry = {
          id: docId,
          userId,
          spaceId,
          jiraKey,
          projectName,
          date: dateStr,
          hours,
          comment: existingComment,
        };
        return [...filtered, newEntry];
      });
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la sauvegarde de la cellule.');
    } finally {
      setSavingCell(null);
    }
  };

  // Ouvrir la modale de commentaire
  const openCommentModal = (dateStr: string, jiraKey: string, projectName: string) => {
    const cellKey = `${dateStr}_${jiraKey}`;
    const hours = entriesMap[cellKey]?.hours || 0;
    const comment = entriesMap[cellKey]?.comment || '';

    setCommentModal({
      isOpen: true,
      date: dateStr,
      jiraKey,
      projectName,
      hours,
      comment,
    });
  };

  // Enregistrer le commentaire
  const saveComment = async () => {
    if (!commentModal) return;
    const { date, jiraKey, projectName, hours, comment } = commentModal;
    const cellKey = `${date}_${jiraKey}`;

    setSavingCell(cellKey);
    setCommentModal(null);

    try {
      await saveTimeEntry(userId, spaceId, {
        jiraKey,
        projectName,
        date,
        hours: hours > 0 ? hours : 0,
        comment: comment.trim(),
      });

      setEntries((prev) => {
        const docId = `${date}_${jiraKey}`;
        const filtered = prev.filter((e) => e.id !== docId);
        if (hours <= 0 && !comment.trim()) return filtered;

        const newEntry: TimeEntry = {
          id: docId,
          userId,
          spaceId,
          jiraKey,
          projectName,
          date,
          hours: hours > 0 ? hours : 0,
          comment: comment.trim(),
        };
        return [...filtered, newEntry];
      });
    } catch (err) {
      console.error(err);
      setError('Erreur lors de l’enregistrement du commentaire.');
    } finally {
      setSavingCell(null);
    }
  };

  // Exporter la feuille de temps au format CSV (compatible Excel)
  const handleExportCSV = () => {
    try {
      const headers: (string | number)[] = ['Projet', 'Code JIRA', ...daysList.map((d) => d.day), 'Total (heures)', '% Distribution'];
      
      const rows: (string | number)[][] = projectsToRender.map((p) => {
        const rowData: (string | number)[] = [p.name, p.code];
        
        daysList.forEach((d) => {
          const key = `${d.dateStr}_${p.code}`;
          rowData.push(entriesMap[key]?.hours || 0);
        });

        const totalProjet = projectTotals.projects[p.code] || 0;
        rowData.push(totalProjet);

        const percent = projectTotals.grandTotal > 0 
          ? ((totalProjet / projectTotals.grandTotal) * 100).toFixed(1) + '%'
          : '0%';
        rowData.push(percent);

        return rowData;
      });

      const totalsRow: (string | number)[] = ['TOTAL IMPUTÉ', '-', ...daysList.map((d) => dailyTotals[d.dateStr]), projectTotals.grandTotal, '100%'];
      rows.push(totalsRow);

      const csvContent = '\uFEFF' + [headers, ...rows]
        .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Timesheet_${currentYear}_${String(currentMonth).padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération du CSV.');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* SECTION BANNIÈRE & CONTRÔLE DE SÉLECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#F0EFEB] shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
        <div>
          <h2 className="text-base font-semibold text-[#1A1D1A] tracking-wide flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Suivi des imputations de temps (Timesheet)
          </h2>
          <p className="text-xs text-[#737873] mt-1">
            Saisissez quotidiennement le temps passé par projet dans l&apos;espace : <strong className="text-[#1A1D1A] font-medium">{spaceName}</strong>.
          </p>
        </div>

        {/* CONTROLES NAVIGATION MOIS */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-[#F0EFEB] bg-white text-[#737873] hover:bg-[#F9F8F6] hover:text-[#1A1D1A] transition-all cursor-pointer"
            title="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="min-w-[150px] text-center font-medium text-xs text-[#1A1D1A]">
            {MONTHS_FR[currentMonth - 1]} {currentYear}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-[#F0EFEB] bg-white text-[#737873] hover:bg-[#F9F8F6] hover:text-[#1A1D1A] transition-all cursor-pointer"
            title="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* BOUTONS ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenReportModal(currentYear, currentMonth)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer"
            title="Générer la synthèse d'activités avec Gemini"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Synthèse Rapport IA</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0EFEB] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:bg-[#F9F8F6] hover:text-[#1A1D1A] active:scale-[0.98] transition-all cursor-pointer"
            title="Exporter la grille au format CSV"
          >
            <Download className="h-3.5 w-3.5 text-[#737873]" />
            <span>Exporter Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* GESTIONNAIRE DYNAMIQUE DE PROJETS DU MOIS */}
      <TimesheetProjectManager
        globalProjects={globalProjects}
        activeProjectIds={activeProjectIds}
        hiddenProjectIds={hiddenProjectIds}
        customProjects={customProjects}
        projectHours={projectHoursRecord}
        onAddProjectToTimesheet={handleAddProjectToTimesheet}
        onHideProjectFromTimesheet={handleHideProjectFromTimesheet}
        onShowProjectInTimesheet={handleShowProjectInTimesheet}
        onCreateGlobalProject={handleCreateGlobalProject}
        onUpdateGlobalProject={onUpdateGlobalProject}
        onAddCustomProject={handleAddCustomProject}
        onRemoveCustomProject={handleRemoveCustomProject}
      />

      {/* ERROR MESSAGE BAR */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={loadEntriesAndConfig} className="ml-auto text-rose-600 hover:text-rose-800 font-semibold">Réessayer</button>
        </div>
      )}

      {/* METRIQUES DE SYNTHÈSE RAPIDE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#F0EFEB] flex items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[#737873]">Total Imputé</div>
            <div className="text-base font-bold text-[#1A1D1A] mt-0.5">{projectTotals.grandTotal} h</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#F0EFEB] flex items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[#737873]">Objectif Mensuel</div>
            <div className="text-base font-bold text-[#1A1D1A] mt-0.5">
              {daysList.filter((d) => !d.isWeekend).length * 8} h
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#F0EFEB] flex items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-[#737873]">Jours Ouvrés</div>
            <div className="text-base font-bold text-[#1A1D1A] mt-0.5">
              {daysList.filter((d) => !d.isWeekend).length} Jours
            </div>
          </div>
        </div>
      </div>

      {/* GRILLE MATRICIELLE SCROLLABLE */}
      <div className="bg-white rounded-2xl border border-[#F0EFEB] shadow-[0_2px_12px_rgba(0,0,0,0.01)] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#737873]">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <span className="text-xs">Chargement de votre feuille de temps...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[1600px]">
              {/* EN-TÊTE DU TABLEAU */}
              <thead>
                <tr className="bg-[#F9F8F6] border-b border-[#F0EFEB]">
                  <th className="p-3 text-xs font-medium text-[#737873] tracking-wider w-[220px] sticky left-0 bg-[#F9F8F6] z-10 border-r border-[#F0EFEB]">
                    Projets (Clé JIRA)
                  </th>
                  {daysList.map((d) => (
                    <th
                      key={d.day}
                      className={`p-2 text-center text-[10px] font-medium border-r border-[#F0EFEB] ${
                        d.isWeekend ? 'bg-slate-100 text-[#737873]/50' : 'text-[#737873]'
                      }`}
                    >
                      <div className="font-bold uppercase">{d.dayName}</div>
                      <div className="text-xs mt-0.5">{d.day}</div>
                    </th>
                  ))}
                  <th className="p-3 text-center text-xs font-medium text-[#737873] tracking-wider w-[80px] border-l border-[#F0EFEB] bg-[#F9F8F6]">
                    Total
                  </th>
                  <th className="p-3 text-center text-xs font-medium text-[#737873] tracking-wider w-[70px] bg-[#F9F8F6]">
                    %
                  </th>
                </tr>
              </thead>

              {/* CORPS DU TABLEAU (LIGNES PROJETS) */}
              <tbody className="divide-y divide-[#F0EFEB]">
                {projectsToRender.map((p) => {
                  const projTotal = projectTotals.projects[p.code] || 0;
                  const projPercent = projectTotals.grandTotal > 0
                    ? ((projTotal / projectTotals.grandTotal) * 100).toFixed(0)
                    : '0';

                  return (
                    <tr key={p.code} className="hover:bg-[#F9F8F6]/40 transition-colors">
                      {/* Titre Projet Fixe à gauche */}
                      <td className="p-3 text-xs text-[#1A1D1A] sticky left-0 bg-white hover:bg-[#F9F8F6]/40 z-10 border-r border-[#F0EFEB] truncate" title={`${p.name}`}>
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-indigo-600 font-mono mt-0.5">{p.code}</div>
                      </td>

                      {/* Cellules imputations quotidiennes */}
                      {daysList.map((d) => {
                        const cellKey = `${d.dateStr}_${p.code}`;
                        const cellData = entriesMap[cellKey];
                        const cellValue = cellData?.hours || '';
                        const hasComment = !!cellData?.comment;
                        const isSaving = savingCell === cellKey;

                        return (
                          <td
                            key={d.day}
                            className={`p-1 border-r border-[#F0EFEB] relative ${
                              d.isWeekend ? 'bg-slate-100/30' : ''
                            }`}
                          >
                            {/* Petit coin supérieur droit coloré si commentaire existant (style Excel) */}
                            {hasComment && (
                              <div
                                onClick={() => openCommentModal(d.dateStr, p.code, p.name)}
                                className="absolute top-0 right-0 w-2.5 h-2.5 bg-indigo-500 rounded-bl-sm cursor-pointer hover:scale-125 transition-transform"
                                title={`Note : "${cellData.comment}"`}
                              />
                            )}

                            {/* Boîtier d'édition / input */}
                            <div className="relative flex items-center justify-center">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={cellValue}
                                onChange={(e) =>
                                  handleHoursChange(d.dateStr, p.code, p.name, e.target.value)
                                }
                                placeholder="0"
                                className={`w-full text-center h-8 text-xs font-medium rounded-lg border px-0.5 focus:outline-none focus:ring-2 transition-all ${
                                  cellValue
                                    ? 'bg-indigo-50/70 text-indigo-900 border-indigo-200 focus:ring-indigo-100 focus:border-indigo-500'
                                    : 'bg-transparent text-slate-400 border-slate-100 hover:border-slate-200 focus:ring-slate-100'
                                } ${isSaving ? 'animate-pulse opacity-50' : ''}`}
                              />
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Projet en bout de ligne */}
                      <td className="p-3 text-center text-xs font-bold text-[#1A1D1A] border-l border-[#F0EFEB] bg-[#F9F8F6]/20">
                        {projTotal}h
                      </td>

                      {/* % Distribution en bout de ligne */}
                      <td className="p-3 text-center text-xs font-medium text-[#737873] bg-[#F9F8F6]/20">
                        {projPercent}%
                      </td>
                    </tr>
                  );
                })}

                {/* LIGNE DE TOTAUX QUOTIDIENS ET ALERTES */}
                <tr className="bg-[#F9F8F6]/80 font-bold border-t border-[#F0EFEB]">
                  <td className="p-3 text-xs text-[#1A1D1A] sticky left-0 bg-[#F0EFEB] z-10 border-r border-[#F0EFEB] uppercase tracking-wider font-bold">
                    Total Imputé Jour
                  </td>
                  {daysList.map((d) => {
                    const tot = dailyTotals[d.dateStr] || 0;
                    const isWorkday = !d.isWeekend;
                    const hasAlert = isWorkday && tot !== 8 && tot > 0;
                    const isPerfect = isWorkday && tot === 8;

                    return (
                      <td
                        key={d.day}
                        className={`p-1.5 text-center text-xs border-r border-[#F0EFEB] ${
                          isPerfect
                            ? 'bg-emerald-50 text-emerald-800'
                            : hasAlert
                            ? 'bg-amber-50 text-amber-800 ring-2 ring-inset ring-amber-300'
                            : d.isWeekend
                            ? 'bg-slate-100 text-slate-400'
                            : 'text-slate-500'
                        }`}
                        title={
                          hasAlert
                            ? `Attention : Jour ouvré avec ${tot}h imputées (Recommandé : 8h)`
                            : isPerfect
                            ? 'Journée parfaitement équilibrée (8h/8h)'
                            : ''
                        }
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span>{tot > 0 ? `${tot}h` : '0'}</span>
                          {hasAlert && (
                            <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 animate-bounce" />
                          )}
                          {isPerfect && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                  
                  {/* Grand total d'imputation mensuel */}
                  <td className="p-3 text-center text-sm font-extrabold text-indigo-900 border-l border-[#F0EFEB] bg-indigo-50">
                    {projectTotals.grandTotal}h
                  </td>

                  <td className="p-3 text-center text-xs text-[#737873] bg-[#F9F8F6]">
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BLOC LÉGENDE DE CONFORMITÉ */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-[#F0EFEB] bg-[#F9F8F6]/40 text-[11px] text-[#737873]">
        <span className="flex items-center gap-1.5 font-semibold text-[#1A1D1A] shrink-0">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          Règles d&apos;imputations :
        </span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300" />
            <span>Journée de 8h complétée (parfait)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-[8px] text-amber-600 font-bold">!</span>
            <span>Alerte : total différent de 8h sur un jour ouvré</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-200" />
            <span>Week-end (Samedi & Dimanche)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 border-r-4 border-t-4 border-indigo-500 rotate-135" />
            <span>Cellule contenant un commentaire explicatif (cliquer sur le coin bleu)</span>
          </span>
        </div>
      </div>

      {/* MODALE COMPACTE DE COMMENTAIRE EXPLICATIF */}
      {commentModal?.isOpen && (
        <div
          id="comment-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/35 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            id="comment-modal-container"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg border border-[#F0EFEB] animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EFEB]">
              <h4 className="text-sm font-semibold text-[#1A1D1A]">
                Commentaire d&apos;imputation : {commentModal.jiraKey}
              </h4>
              <button
                id="close-comment-modal-btn"
                type="button"
                onClick={() => setCommentModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-[#F9F8F6] hover:text-[#1A1D1A] transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-xs text-[#737873]">
                <div>Projet : <strong className="text-[#1A1D1A] font-medium">{commentModal.projectName}</strong></div>
                <div className="mt-1">Date : <strong className="text-[#1A1D1A] font-medium">{commentModal.date}</strong></div>
              </div>

              {/* Saisie heures */}
              <div>
                <label className="block text-xs font-semibold text-[#737873] mb-1">Heures imputées :</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={commentModal.hours}
                  onChange={(e) => setCommentModal(prev => prev ? { ...prev, hours: parseFloat(e.target.value) || 0 } : null)}
                  className="w-24 px-2 py-1.5 rounded-lg border border-[#F0EFEB] text-xs text-[#1A1D1A]"
                />
              </div>

              {/* Saisie commentaire */}
              <div>
                <label className="block text-xs font-semibold text-[#737873] mb-1">
                  Commentaires / Tâches accomplies :
                </label>
                <textarea
                  rows={4}
                  value={commentModal.comment}
                  onChange={(e) => setCommentModal(prev => prev ? { ...prev, comment: e.target.value } : null)}
                  placeholder="Ex. Développement des API de synchronisation, réunions techniques..."
                  className="w-full rounded-xl border border-[#F0EFEB] p-3 text-xs text-[#1A1D1A] placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                id="cancel-comment-btn"
                type="button"
                onClick={() => setCommentModal(null)}
                className="rounded-xl border border-[#F0EFEB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#737873] hover:bg-[#F9F8F6] hover:text-[#1A1D1A] transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="save-comment-btn"
                type="button"
                onClick={saveComment}
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
