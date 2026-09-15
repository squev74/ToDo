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
  LogOut,
  Cloud,
  Loader2,
  Zap,
  User as UserIcon,
} from 'lucide-react';
import { Tache, Projet, StatutTache } from './types';
import {
  loadUserTasksFromStorage,
  saveUserTasksToStorage,
  loadUserProjectsFromStorage,
  saveUserProjectsToStorage,
  getDefaultProjects,
  getDefaultTasks,
  exportDataAsJson,
  validateImportData,
} from './utils/storage';
import {
  subscribeToUserData,
  initializeUserInitialDataIfEmpty,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  deleteMultipleTasksFromFirestore,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  batchUpdateTasksInFirestore,
  importDataToFirestore,
} from './services/firestoreService';
import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { TaskItem } from './components/TaskItem';
import { TaskFormModal } from './components/TaskFormModal';
import { BlockedReasonModal } from './components/BlockedReasonModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DailyReportPanel } from './components/DailyReportPanel';
import { WelcomeBanner } from './components/WelcomeBanner';

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();

  // Données strictement isolées par utilisateur (vide à l'initialisation pour éviter tout mélange de données)
  const [tasks, setTasks] = useState<Tache[]>([]);
  const [projects, setProjects] = useState<Projet[]>([]);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

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

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Synchronisation en temps réel avec Firebase Firestore strictement isolée par compte utilisateur (Multi-tenant)
  useEffect(() => {
    if (!user) {
      // Lorsque l'utilisateur est déconnecté, réinitialiser complètement l'état local (vide)
      setTasks([]);
      setProjects([]);
      setIsCloudSyncing(false);
      return;
    }

    const currentUserId = user.uid;

    if (user.isLocalFallback) {
      // Mode démo local sans backend Firebase Auth
      const cachedTasks = loadUserTasksFromStorage(currentUserId);
      const cachedProjects = loadUserProjectsFromStorage(currentUserId);
      if (cachedTasks.length > 0 || cachedProjects.length > 0) {
        setTasks(cachedTasks);
        setProjects(cachedProjects);
      } else {
        const initialProj = getDefaultProjects(currentUserId);
        const initialTasks = getDefaultTasks(currentUserId);
        setProjects(initialProj);
        setTasks(initialTasks);
        saveUserProjectsToStorage(currentUserId, initialProj);
        saveUserTasksToStorage(currentUserId, initialTasks);
      }
      setIsCloudSyncing(false);
      return;
    }

    let isMounted = true;
    setIsCloudSyncing(true);

    // 1. Initialise l'espace Firestore personnel s'il est encore vierge (aucune donnée d'un autre utilisateur)
    initializeUserInitialDataIfEmpty(currentUserId).catch((err) => {
      console.warn('Initialisation Firestore:', err);
    });

    // 2. Abonnement en temps réel aux collections Cloud STRICTEMENT isolées de cet utilisateur
    const unsubscribe = subscribeToUserData(
      currentUserId,
      (remoteTasks) => {
        if (!isMounted) return;
        setTasks(remoteTasks);
        saveUserTasksToStorage(currentUserId, remoteTasks);
        setIsCloudSyncing(false);
      },
      (remoteProjects) => {
        if (!isMounted) return;
        setProjects(remoteProjects);
        saveUserProjectsToStorage(currentUserId, remoteProjects);
        setIsCloudSyncing(false);
      },
      (syncErr) => {
        console.error('Erreur synchronisation Firestore:', syncErr);
        if (isMounted) {
          setIsCloudSyncing(false);
          // En cas d'indisponibilité réseau, restaurer les données en cache de cet utilisateur
          const fallbackTasks = loadUserTasksFromStorage(currentUserId);
          const fallbackProj = loadUserProjectsFromStorage(currentUserId);
          if (fallbackTasks.length > 0) setTasks(fallbackTasks);
          if (fallbackProj.length > 0) setProjects(fallbackProj);
          showToast('Mode hors-ligne : données locales utilisateur actives.', 'error');
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  // Sauvegarde miroir dans le localStorage STRICTEMENT isolée par userId
  useEffect(() => {
    if (user?.uid && tasks.length > 0) {
      saveUserTasksToStorage(user.uid, tasks);
    }
  }, [tasks, user]);

  useEffect(() => {
    if (user?.uid && projects.length > 0) {
      saveUserProjectsToStorage(user.uid, projects);
    }
  }, [projects, user]);

  // Déconnexion avec réinitialisation immédiate de l'état local (vide)
  const handleLogout = async () => {
    try {
      setTasks([]);
      setProjects([]);
      await logout();
      showToast('Vous avez été déconnecté.');
    } catch (err) {
      console.error('Erreur déconnexion:', err);
      showToast('Erreur lors de la déconnexion.', 'error');
    }
  };

  // Map des projets pour lookup instantané
  const projectsMap = useMemo(() => {
    const map = new Map<string, Projet>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Tri des tâches : les tâches Done vont automatiquement en bas de liste
  const sortedAndFilteredTasks = useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = t.titre.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchDesc) return false;
      }

      if (selectedProjectFilter !== 'all') {
        if (selectedProjectFilter === 'none') {
          if (t.projetId !== null && t.projetId !== '') return false;
        } else if (t.projetId !== selectedProjectFilter) {
          return false;
        }
      }

      if (selectedStatusFilter !== 'all' && t.statut !== selectedStatusFilter) {
        return false;
      }

      return true;
    });

    const activeTasks = filtered.filter((t) => t.statut !== 'Done');
    const doneTasks = filtered.filter((t) => t.statut === 'Done');

    activeTasks.sort((a, b) => a.ordre - b.ordre);
    doneTasks.sort((a, b) => a.ordre - b.ordre);

    return [...activeTasks, ...doneTasks];
  }, [tasks, searchQuery, selectedProjectFilter, selectedStatusFilter]);

  // Gestion des changements de Statut
  const handleStatusChangeRequest = (task: Tache, newStatus: StatutTache) => {
    if (task.statut === newStatus) return;

    if (newStatus === 'Blocked') {
      setBlockedModalTask(task);
      return;
    }

    applyStatusChange(task.id, newStatus);
  };

  const applyStatusChange = (taskId: string, newStatus: StatutTache, additionalComment?: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updatedComments = [...(target.commentaires || [])];
    if (additionalComment) {
      updatedComments.push({
        id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        texte: additionalComment,
        date: new Date().toISOString(),
      });
    }

    const isNowDone = newStatus === 'Done';
    const dateRealisation = isNowDone ? new Date().toISOString() : null;

    let newOrdre = target.ordre;
    if (isNowDone) {
      const maxOrdre = tasks.reduce((max, t) => Math.max(max, t.ordre), 0);
      newOrdre = maxOrdre + 1;
    }

    const updatedTask: Tache = {
      ...target,
      userId: user?.uid || target.userId,
      statut: newStatus,
      dateRealisation,
      dateModification: new Date().toISOString(),
      commentaires: updatedComments,
      ordre: newOrdre,
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    if (user && !user.isLocalFallback) {
      saveTaskToFirestore(user.uid, updatedTask).catch((err) => {
        console.error('Erreur Firestore statut:', err);
      });
    }

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
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const newComm = {
      id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      texte: commentText,
      date: new Date().toISOString(),
    };

    const updatedTask: Tache = {
      ...target,
      userId: user?.uid || target.userId,
      dateModification: new Date().toISOString(),
      commentaires: [...(target.commentaires || []), newComm],
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    if (user && !user.isLocalFallback) {
      saveTaskToFirestore(user.uid, updatedTask).catch((err) => {
        console.error('Erreur Firestore ajout commentaire:', err);
      });
    }

    showToast('Commentaire ajouté à l’historique.');
  };

  // Création / Modification d'une tâche
  const handleSaveTask = (taskData: {
    titre: string;
    description: string;
    projetId: string | null;
    statut: StatutTache;
    dateEcheance?: string | null;
    blockedReason?: string;
  }) => {
    if (editingTask) {
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

      const updatedTask: Tache = {
        ...editingTask,
        userId: user?.uid || editingTask.userId,
        titre: taskData.titre,
        description: taskData.description || '',
        projetId: taskData.projetId ?? null,
        statut: taskData.statut,
        dateEcheance: taskData.dateEcheance || null,
        dateRealisation,
        dateModification: new Date().toISOString(),
        commentaires: comments,
      };

      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updatedTask : t)));

      if (user && !user.isLocalFallback) {
        saveTaskToFirestore(user.uid, updatedTask).catch((err) => {
          console.error('Erreur Firestore mise à jour:', err);
        });
      }

      showToast('Tâche mise à jour avec succès.');
    } else {
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
        userId: user?.uid,
        titre: taskData.titre,
        description: taskData.description || '',
        projetId: taskData.projetId ?? null,
        statut: taskData.statut,
        dateEcheance: taskData.dateEcheance || null,
        dateRealisation: taskData.statut === 'Done' ? new Date().toISOString() : null,
        dateModification: new Date().toISOString(),
        ordre: maxOrdre + 1,
        commentaires: comments,
      };

      setTasks((prev) => [newTask, ...prev]);

      if (user && !user.isLocalFallback) {
        saveTaskToFirestore(user.uid, newTask).catch((err) => {
          console.error('Erreur Firestore création:', err);
        });
      }

      showToast('Nouvelle tâche créée.');
    }

    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // Demande de suppression de tâche (Modale de confirmation)
  const handleRequestDeleteTask = (task: Tache) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Supprimer cette tâche ?',
      message: `Êtes-vous certain de vouloir supprimer définitivement la tâche « ${task.titre} » ? Son historique sera également supprimé.`,
      onConfirm: () => {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        if (user && !user.isLocalFallback) {
          deleteTaskFromFirestore(user.uid, task.id).catch((err) => {
            console.error('Erreur Firestore suppression:', err);
          });
        }
        setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
        showToast('Tâche supprimée définitivement.');
      },
    });
  };

  // Projets : Ajout
  const handleAddProject = (nom: string, couleur: string) => {
    const newProj: Projet = {
      id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: user?.uid,
      nom,
      couleur,
      dateCreation: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProj]);

    if (user && !user.isLocalFallback) {
      saveProjectToFirestore(user.uid, newProj).catch((err) => {
        console.error('Erreur Firestore projet:', err);
      });
    }

    showToast(`Projet « ${nom} » créé.`);
  };

  // Projets : Demande de suppression (Modale de confirmation)
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
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        setTasks((prev) =>
          prev.map((t) => (t.projetId === project.id ? { ...t, projetId: null } : t))
        );

        if (user && !user.isLocalFallback) {
          deleteProjectFromFirestore(user.uid, project.id, tasks).catch((err) => {
            console.error('Erreur Firestore suppression projet:', err);
          });
        }

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

        if (user && !user.isLocalFallback) {
          deleteMultipleTasksFromFirestore(user.uid, exampleTaskIds).catch((err) => {
            console.error('Erreur Firestore suppression exemples:', err);
          });
        }

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

    const currentList = [...sortedAndFilteredTasks];
    const sourceIndex = currentList.findIndex((t) => t.id === draggedTaskId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      setDraggedTaskId(null);
      setDragOverIndex(null);
      return;
    }

    const [movedTask] = currentList.splice(sourceIndex, 1);
    currentList.splice(targetIndex, 0, movedTask);

    const updatedMap = new Map<string, number>();
    currentList.forEach((task, idx) => {
      updatedMap.set(task.id, idx + 1);
    });

    const updatedTasks = tasks.map((t) => {
      if (updatedMap.has(t.id)) {
        return { ...t, ordre: updatedMap.get(t.id)! };
      }
      return t;
    });

    setTasks(updatedTasks);

    if (user && !user.isLocalFallback) {
      batchUpdateTasksInFirestore(user.uid, updatedTasks).catch((err) => {
        console.error('Erreur Firestore réordonnancement:', err);
      });
    }

    setDraggedTaskId(null);
    setDragOverIndex(null);
    showToast('Ordre des tâches mis à jour.');
  };

  // Import / Export JSON
  const handleExportJson = () => {
    exportDataAsJson(tasks, projects, user?.uid);
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
        const parsed = JSON.parse(event.target?.result as string);
        const validated = validateImportData(parsed, user?.uid);

        if (!validated.valid || !validated.taches || !validated.projets) {
          showToast(validated.error || 'Erreur de format du fichier JSON.', 'error');
          return;
        }

        const newTasks = validated.taches;
        const newProjects = validated.projets;

        setConfirmModalConfig({
          isOpen: true,
          title: 'Importer les données JSON ?',
          message: `Ce fichier contient ${newTasks.length} tâche(s) et ${newProjects.length} projet(s). Voulez-vous remplacer votre contenu actuel par ces données et les synchroniser dans Firestore ?`,
          onConfirm: () => {
            setProjects(newProjects);
            setTasks(newTasks);

            if (user && !user.isLocalFallback) {
              importDataToFirestore(user.uid, newProjects, newTasks).catch((err) => {
                console.error('Erreur Firestore import:', err);
              });
            }

            setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
            showToast('Données importées et synchronisées dans le cloud.');
          },
        });
      } catch {
        showToast('Fichier JSON illisible ou corrompu.', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Si l'état d'authentification est en cours de vérification
  if (authLoading) {
    return (
      <div id="auth-loading-screen" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-4 animate-pulse">
          <ListTodo className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <span>Connexion à Firebase en cours...</span>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté, afficher l'écran d'authentification
  if (!user) {
    return <AuthScreen />;
  }

  // Nombre de tâches en retard (sauf Done)
  const overdueCount = tasks.filter((t) => {
    if (t.statut === 'Done') return false;
    if (!t.dateEcheance) return false;
    const today = new Date().toISOString().split('T')[0];
    return t.dateEcheance < today;
  }).length;

  // Filtres actifs ?
  const hasActiveFilters =
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
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>
                    {tasks.length} tâche{tasks.length > 1 ? 's' : ''} • {projects.length} projet{projects.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-300">•</span>
                  {user.isLocalFallback ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span>Mode Démo / Local</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <Cloud className="h-3 w-3" />
                      <span>Cloud Firestore</span>
                    </span>
                  )}
                </div>
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

              {/* Boutons Exporter / Importer JSON */}
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

              {/* Compte Utilisateur & Déconnexion */}
              <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[130px]" title={user.email || ''}>
                    {user.email}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {user.isLocalFallback ? 'Session Démo' : 'Connecté'}
                  </span>
                </div>

                <button
                  id="logout-btn"
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors shadow-2xs"
                  title="Se déconnecter"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
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
                <span>Rapport d&apos;Activité & Suivi</span>
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
                    placeholder="Rechercher par mot-clé dans les tâches..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                {/* Filtre par Projet */}
                <div className="md:col-span-3">
                  <label htmlFor="filter-project-select" className="sr-only">
                    Filtrer par projet
                  </label>
                  <div className="relative">
                    <select
                      id="filter-project-select"
                      value={selectedProjectFilter}
                      onChange={(e) => setSelectedProjectFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="all">Tous les projets ({tasks.length})</option>
                      <option value="none">Sans projet assigné</option>
                      {projects.map((proj) => {
                        const count = tasks.filter((t) => t.projetId === proj.id).length;
                        return (
                          <option key={proj.id} value={proj.id}>
                            {proj.nom} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Filtre par Statut */}
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

                {/* Bouton de réinitialisation */}
                <div className="md:col-span-1 flex justify-end">
                  {hasActiveFilters ? (
                    <button
                      id="reset-filters-btn"
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedProjectFilter('all');
                        setSelectedStatusFilter('all');
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      title="Réinitialiser les filtres"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <div className="h-8 w-8 flex items-center justify-center text-slate-300">
                      <Filter className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Indicateur de tâches en retard */}
              {overdueCount > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-100">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    Attention : {overdueCount} tâche{overdueCount > 1 ? 's ont' : ' a'} dépassé leur date d&apos;échéance.
                  </span>
                </div>
              )}
            </div>

            {/* LISTE DES TÂCHES */}
            <div id="tasks-list-container" className="space-y-2.5">
              {sortedAndFilteredTasks.length === 0 ? (
                <div
                  id="empty-tasks-placeholder"
                  className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {hasActiveFilters ? 'Aucune tâche ne correspond à vos filtres' : 'Votre to-do list est vide'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    {hasActiveFilters
                      ? 'Essayez d’élargir vos termes de recherche ou de réinitialiser les filtres de statut et de projet.'
                      : 'Créez votre première tâche pour commencer à organiser vos activités.'}
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedProjectFilter('all');
                          setSelectedStatusFilter('all');
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Effacer les filtres
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          setIsTaskModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Créer une tâche</span>
                      </button>
                    )}
                  </div>
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
                      onStatusChange={handleStatusChangeRequest}
                      onEditTask={(t) => {
                        setEditingTask(t);
                        setIsTaskModalOpen(true);
                      }}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setIsTaskModalOpen(true);
                      }}
                      onRequestDelete={handleRequestDeleteTask}
                      onDelete={handleRequestDeleteTask}
                      onAddComment={handleAddCommentToTask}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                      isDragged={draggedTaskId === task.id}
                      isDragOver={dragOverIndex === index}
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
          <p>Données synchronisées en temps réel via Firebase Firestore • Accès multi-appareils</p>
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
