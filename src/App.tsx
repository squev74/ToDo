import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  FolderPlus,
  ListTodo,
  CalendarCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Tache, Projet, StatutTache } from './types';
import {
  loadTasksFromStorage,
  saveTasksToStorage,
  loadProjectsFromStorage,
  saveProjectsToStorage,
  exportDataAsJson,
  validateImportData,
} from './utils/storage';
import { TaskItem } from './components/TaskItem';
import { TaskFormModal } from './components/TaskFormModal';
import { BlockedReasonModal } from './components/BlockedReasonModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DailyReportPanel } from './components/DailyReportPanel';
import { WelcomeBanner } from './components/WelcomeBanner';

export default function App() {
  // Données
  const [tasks, setTasks] = useState<Tache[]>(() => loadTasksFromStorage());
  const [projects, setProjects] = useState<Projet[]>(() => loadProjectsFromStorage());

  // Message de bienvenue pour les nouveaux utilisateurs
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('todolist_welcome_dismissed');
      return dismissed !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem('todolist_welcome_dismissed', 'true');
    } catch (err) {
      console.error(err);
    }
  };

  // Navigation Vue Principale : 'tasks' | 'report'
  const [currentView, setCurrentView] = useState<'tasks' | 'report'>('tasks');

  // Filtres et Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modales
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Tache | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Modale Motif Bloqué (Règle 4)
  const [blockedModalTask, setBlockedModalTask] = useState<Tache | null>(null);

  // Modale de confirmation de suppression
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Notif toast temporaire
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sauvegarde automatique localStorage à chaque changement
  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  useEffect(() => {
    saveProjectsToStorage(projects);
  }, [projects]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Map des projets pour lookup instantané
  const projectsMap = useMemo(() => {
    const map = new Map<string, Projet>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Tri des tâches : les tâches Done vont automatiquement en bas de liste
  // Les tâches actives conservent leur ordre relatif
  const sortedAndFilteredTasks = useMemo(() => {
    // 1. Filtrage
    const filtered = tasks.filter((t) => {
      // Recherche textuelle sur titre ou description
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = t.titre.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchDesc) return false;
      }

      // Filtre Projet
      if (selectedProjectFilter !== 'all') {
        if (selectedProjectFilter === 'none') {
          if (t.projetId !== null && t.projetId !== '') return false;
        } else if (t.projetId !== selectedProjectFilter) {
          return false;
        }
      }

      // Filtre Statut
      if (selectedStatusFilter !== 'all' && t.statut !== selectedStatusFilter) {
        return false;
      }

      return true;
    });

    // 2. Règle : les 'Done' sont automatiquement en bas de liste
    const activeTasks = filtered.filter((t) => t.statut !== 'Done');
    const doneTasks = filtered.filter((t) => t.statut === 'Done');

    // Tri par 'ordre' croissant
    activeTasks.sort((a, b) => a.ordre - b.ordre);
    doneTasks.sort((a, b) => a.ordre - b.ordre);

    return [...activeTasks, ...doneTasks];
  }, [tasks, searchQuery, selectedProjectFilter, selectedStatusFilter]);

  // Gestion des changements de Statut
  const handleStatusChangeRequest = (task: Tache, newStatus: StatutTache) => {
    if (task.statut === newStatus) return;

    // Règle 4 : Passage vers 'Blocked' -> Modale obligatoire
    if (newStatus === 'Blocked') {
      setBlockedModalTask(task);
      return;
    }

    applyStatusChange(task.id, newStatus);
  };

  const applyStatusChange = (taskId: string, newStatus: StatutTache, additionalComment?: string) => {
    setTasks((prevTasks) => {
      const target = prevTasks.find((t) => t.id === taskId);
      if (!target) return prevTasks;

      const updatedComments = [...(target.commentaires || [])];
      if (additionalComment) {
        updatedComments.push({
          id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          texte: additionalComment,
          date: new Date().toISOString(),
        });
      }

      // Horodatage ISO automatique quand statut passe à 'Done'
      const isNowDone = newStatus === 'Done';
      const dateRealisation = isNowDone ? new Date().toISOString() : null;

      // Si la tâche passe à 'Done', on lui donne un ordre supérieur pour se caler en bas
      let newOrdre = target.ordre;
      if (isNowDone) {
        const maxOrdre = prevTasks.reduce((max, t) => Math.max(max, t.ordre), 0);
        newOrdre = maxOrdre + 1;
      }

      return prevTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              statut: newStatus,
              dateRealisation,
              commentaires: updatedComments,
              ordre: newOrdre,
            }
          : t
      );
    });

    if (newStatus === 'Done') {
      showToast('Tâche marquée comme terminée.');
    } else if (newStatus === 'Blocked') {
      showToast('Tâche marquée comme bloquée avec motif.');
    }
  };

  // Validation du motif de blocage
  const handleConfirmBlockedReason = (reason: string) => {
    if (!blockedModalTask) return;
    applyStatusChange(blockedModalTask.id, 'Blocked', `Bloqué : ${reason}`);
    setBlockedModalTask(null);
  };

  // Ajout direct de commentaire à une tâche
  const handleAddCommentToTask = (taskId: string, commentText: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const newComm = {
            id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            texte: commentText,
            date: new Date().toISOString(),
          };
          return {
            ...t,
            commentaires: [...(t.commentaires || []), newComm],
          };
        }
        return t;
      })
    );
    showToast('Commentaire ajouté à l’historique.');
  };

  // Création / Modification d'une tâche
  const handleSaveTask = (taskData: {
    titre: string;
    description: string;
    projetId: string | null;
    statut: StatutTache;
    dateEcheance?: string;
    blockedReason?: string;
  }) => {
    if (editingTask) {
      // Édition
      const comments = [...(editingTask.commentaires || [])];
      if (taskData.blockedReason && taskData.statut === 'Blocked') {
        comments.push({
          id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          texte: `Bloqué : ${taskData.blockedReason}`,
          date: new Date().toISOString(),
        });
      }

      const isNowDone = taskData.statut === 'Done';
      const dateRealisation = isNowDone
        ? editingTask.dateRealisation || new Date().toISOString()
        : null;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                titre: taskData.titre,
                description: taskData.description,
                projetId: taskData.projetId,
                statut: taskData.statut,
                dateEcheance: taskData.dateEcheance,
                dateRealisation,
                commentaires: comments,
              }
            : t
        )
      );
      showToast('Tâche mise à jour avec succès.');
    } else {
      // Création
      const maxOrdre = tasks.reduce((max, t) => Math.max(max, t.ordre), 0);
      const comments = [];
      if (taskData.blockedReason && taskData.statut === 'Blocked') {
        comments.push({
          id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          texte: `Bloqué : ${taskData.blockedReason}`,
          date: new Date().toISOString(),
        });
      }

      const newTask: Tache = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        titre: taskData.titre,
        description: taskData.description,
        projetId: taskData.projetId,
        statut: taskData.statut,
        dateEcheance: taskData.dateEcheance,
        dateRealisation: taskData.statut === 'Done' ? new Date().toISOString() : null,
        ordre: maxOrdre + 1,
        commentaires: comments,
      };

      setTasks((prev) => [newTask, ...prev]);
      showToast('Nouvelle tâche créée.');
    }

    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // Demande de suppression de tâche (Règle 3 : Modale de confirmation obligatoire)
  const handleRequestDeleteTask = (task: Tache) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Supprimer cette tâche ?',
      message: `Êtes-vous certain de vouloir supprimer définitivement la tâche « ${task.titre} » ? Son historique de commentaires sera également supprimé.`,
      onConfirm: () => {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
        showToast('Tâche supprimée définitivement.');
      },
    });
  };

  // Projets : Ajout
  const handleAddProject = (nom: string, couleur: string) => {
    const newProj: Projet = {
      id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      nom,
      couleur,
      dateCreation: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProj]);
    showToast(`Projet « ${nom} » créé.`);
  };

  // Projets : Demande de suppression (Règle 3 : Modale de confirmation obligatoire)
  const handleRequestDeleteProject = (project: Projet) => {
    const count = tasks.filter((t) => t.projetId === project.id).length;
    setConfirmModalConfig({
      isOpen: true,
      title: `Supprimer le projet « ${project.nom} » ?`,
      message: `Cette action supprimera le projet. ${
        count > 0
          ? `Les ${count} tâche(s) qui lui étaient associées seront conservées et réassignées en « Sans projet ».`
          : 'Aucune tâche n’y est associée.'
      }`,
      onConfirm: () => {
        // Supprime le projet et dissocie les tâches
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        setTasks((prev) =>
          prev.map((t) => (t.projetId === project.id ? { ...t, projetId: null } : t))
        );
        setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
        showToast(`Projet « ${project.nom} » supprimé.`);
      },
    });
  };

  // Tâches d'exemples
  const exampleTaskIds = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'];
  const hasExampleTasks = useMemo(() => {
    return tasks.some((t) => exampleTaskIds.includes(t.id));
  }, [tasks]);

  const handleClearExampleTasks = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Supprimer les tâches d'exemples ?",
      message: "Cette action va retirer les tâches de démonstration pour vous laisser un espace de travail vierge. Vos éventuelles nouvelles tâches seront conservées.",
      onConfirm: () => {
        setTasks((prev) => prev.filter((t) => !exampleTaskIds.includes(t.id)));
        setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
        showToast("Tâches d'exemples supprimées.");
      },
    });
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    // Récupérer la tâche déplacée
    const currentList = [...sortedAndFilteredTasks];
    const sourceIndex = currentList.findIndex((t) => t.id === draggedTaskId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      setDraggedTaskId(null);
      setDragOverIndex(null);
      return;
    }

    // Réordonner la liste affichée
    const [movedTask] = currentList.splice(sourceIndex, 1);
    currentList.splice(targetIndex, 0, movedTask);

    // Mettre à jour l'ordre de chaque tâche
    const updatedMap = new Map<string, number>();
    currentList.forEach((task, idx) => {
      updatedMap.set(task.id, idx + 1);
    });

    setTasks((prev) =>
      prev.map((t) => {
        if (updatedMap.has(t.id)) {
          return { ...t, ordre: updatedMap.get(t.id)! };
        }
        return t;
      })
    );

    setDraggedTaskId(null);
    setDragOverIndex(null);
    showToast('Ordre des tâches mis à jour.');
  };

  // Import / Export JSON
  const handleExportJson = () => {
    exportDataAsJson(tasks, projects);
    showToast('Fichier JSON exporté avec succès.');
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const validation = validateImportData(parsed);

        if (!validation.valid || !validation.taches || !validation.projets) {
          showToast(validation.error || 'Fichier JSON non conforme.', 'error');
          return;
        }

        // Confirmation avant écrasement
        setConfirmModalConfig({
          isOpen: true,
          title: 'Importer les données ?',
          message: `Le fichier contient ${validation.taches.length} tâche(s) et ${validation.projets.length} projet(s). Cette action remplacera vos données actuelles.`,
          onConfirm: () => {
            setTasks(validation.taches!);
            setProjects(validation.projets!);
            setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
            showToast('Données importées avec succès.');
          },
        });
      } catch (err) {
        showToast('Impossible de lire le fichier JSON sélectionné.', 'error');
        console.error(err);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedProjectFilter('all');
    setSelectedStatusFilter('all');
  };

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    selectedProjectFilter !== 'all' ||
    selectedStatusFilter !== 'all';

  return (
    <div id="app-root" className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast de notification flottant */}
      {toastMessage && (
        <div
          id="app-toast-notification"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-lg border transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Input de fichier caché pour Import JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* HEADER SUPÉRIEUR */}
      <header id="main-header" className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Titre & Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <ListTodo className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Gestionnaire de Tâches
                </h1>
                <p className="text-xs text-slate-500">
                  {tasks.length} tâche{tasks.length > 1 ? 's' : ''} • {projects.length} projet{projects.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Barre d'actions supérieures */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bouton Projets */}
              <button
                id="open-projects-manager-btn"
                type="button"
                onClick={() => setIsProjectModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                title="Gérer les projets"
              >
                <FolderPlus className="h-4 w-4 text-indigo-600" />
                <span className="hidden sm:inline">Projets</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[11px] font-bold text-slate-600">
                  {projects.length}
                </span>
              </button>

              {/* Boutons discrets Exporter / Importer JSON */}
              <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  id="export-json-button"
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Exporter les données au format JSON"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Exporter</span>
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <button
                  id="import-json-button"
                  type="button"
                  onClick={handleTriggerFileInput}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Importer un fichier JSON"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Importer</span>
                </button>
              </div>

              {/* Bouton Nouvelle Tâche */}
              <button
                id="create-task-primary-btn"
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Nouvelle tâche</span>
              </button>
            </div>
          </div>

          {/* Navigation par Onglets (Vues) */}
          <div className="mt-3 flex items-center border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-2">
              <button
                id="tab-view-tasks"
                type="button"
                onClick={() => setCurrentView('tasks')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  currentView === 'tasks'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ListTodo className="h-3.5 w-3.5" />
                <span>Liste des tâches</span>
              </button>

              <button
                id="tab-view-report"
                type="button"
                onClick={() => setCurrentView('report')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  currentView === 'report'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>Rapport Journalier</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main id="main-content" className="mx-auto max-w-6xl w-full flex-1 px-4 py-6 sm:px-6">
        {currentView === 'tasks' ? (
          <div className="space-y-4">
            {/* MESSAGE DE BIENVENUE POUR LES NOUVEAUX UTILISATEURS */}
            {showWelcome && (
              <WelcomeBanner
                onDismiss={handleDismissWelcome}
                onNewTaskClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                onClearExamplesClick={handleClearExampleTasks}
                hasExampleTasks={hasExampleTasks}
              />
            )}

            {/* BARRE SUPÉRIEURE DE RECHERCHE ET FILTRES */}
            <div
              id="tasks-filters-bar"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Champ de recherche textuel */}
                <div className="md:col-span-5 relative">
                  <label htmlFor="search-tasks-input" className="sr-only">
                    Rechercher une tâche
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="search-tasks-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par titre ou description..."
                    className="w-full rounded-lg border border-slate-300 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Filtre déroulant par Projet */}
                <div className="md:col-span-3">
                  <label htmlFor="filter-project-select" className="sr-only">
                    Filtrer par projet
                  </label>
                  <select
                    id="filter-project-select"
                    value={selectedProjectFilter}
                    onChange={(e) => setSelectedProjectFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">Tous les projets</option>
                    <option value="none">Sans projet assigné</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre déroulant par Statut */}
                <div className="md:col-span-3">
                  <label htmlFor="filter-status-select" className="sr-only">
                    Filtrer par statut
                  </label>
                  <select
                    id="filter-status-select"
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="Open">À faire (Open)</option>
                    <option value="In Progress">En cours (In Progress)</option>
                    <option value="Blocked">Bloqué (Blocked)</option>
                    <option value="Done">Terminé (Done)</option>
                  </select>
                </div>

                {/* Réinitialiser les filtres */}
                <div className="md:col-span-1 flex justify-end">
                  {isAnyFilterActive && (
                    <button
                      id="reset-filters-btn"
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 p-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      title="Réinitialiser les filtres"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Indicateur de résultats */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Affichage de <strong className="text-slate-800">{sortedAndFilteredTasks.length}</strong> tâche{sortedAndFilteredTasks.length > 1 ? 's' : ''} sur {tasks.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Glissez-déposez les cartes pour réordonner • Les tâches terminées descendent automatiquement
                </span>
              </div>
            </div>

            {/* LISTE VERTICALE GLOBALE DES TÂCHES */}
            <div id="tasks-vertical-list" className="space-y-2.5">
              {sortedAndFilteredTasks.length === 0 ? (
                <div
                  id="empty-tasks-placeholder"
                  className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
                >
                  <FileText className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    Aucune tâche correspondante
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    {isAnyFilterActive
                      ? 'Modifiez ou réinitialisez vos critères de recherche pour afficher les tâches.'
                      : 'Votre liste est vide. Créez votre première tâche pour commencer.'}
                  </p>
                  {isAnyFilterActive ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Réinitialiser les filtres
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsTaskModalOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Créer une tâche
                    </button>
                  )}
                </div>
              ) : (
                sortedAndFilteredTasks.map((task, index) => {
                  const project = task.projetId ? projectsMap.get(task.projetId) : undefined;
                  return (
                    <TaskItem
                      key={task.id}
                      task={task}
                      project={project}
                      index={index}
                      onStatusChangeRequest={handleStatusChangeRequest}
                      onEditTask={(t) => {
                        setEditingTask(t);
                        setIsTaskModalOpen(true);
                      }}
                      onRequestDelete={handleRequestDeleteTask}
                      onAddComment={handleAddCommentToTask}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                      isDragOver={dragOverIndex === index && draggedTaskId !== task.id}
                    />
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* PANNEAU DAILY REPORT */
          <DailyReportPanel tasks={tasks} projects={projects} />
        )}
      </main>

      {/* FOOTER DISCRET */}
      <footer id="main-footer" className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Application autonome de gestion de tâches • Données sauvegardées en temps réel dans votre navigateur (localStorage)</p>
          {!showWelcome && (
            <button
              id="reopen-welcome-banner-btn"
              type="button"
              onClick={() => {
                setShowWelcome(true);
                try {
                  localStorage.removeItem('todolist_welcome_dismissed');
                } catch (err) {
                  console.error(err);
                }
              }}
              className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium transition-colors"
            >
              Afficher le guide de bienvenue
            </button>
          )}
        </div>
      </footer>

      {/* MODALE CRÉATION / ÉDITION TÂCHE */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        initialTask={editingTask}
        projects={projects}
        onSave={handleSaveTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
      />

      {/* MODALE MOTIF DE BLOCAGE (Règle 4) */}
      <BlockedReasonModal
        isOpen={!!blockedModalTask}
        task={blockedModalTask}
        onConfirm={handleConfirmBlockedReason}
        onCancel={() => setBlockedModalTask(null)}
      />

      {/* MODALE GESTION DES PROJETS */}
      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        projects={projects}
        tasks={tasks}
        onAddProject={handleAddProject}
        onRequestDeleteProject={handleRequestDeleteProject}
        onClose={() => setIsProjectModalOpen(false)}
      />

      {/* MODALE REUTILISABLE DE CONFIRMATION DE SUPPRESSION (Règle 3) */}
      <ConfirmationModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }))}
      />
    </div>
  );
}
