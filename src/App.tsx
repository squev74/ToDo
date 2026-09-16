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
  Shield,
} from 'lucide-react';
import { Tache, Projet, Espace, StatutTache } from './types';
import {
  DEFAULT_SPACE_ID,
  getDefaultSpaces,
  getDefaultProjects,
  getDefaultTasks,
  loadUserSpacesFromStorage,
  saveUserSpacesToStorage,
  loadActiveSpaceId,
  saveActiveSpaceId,
  loadUserTasksFromStorage,
  saveUserTasksToStorage,
  loadUserProjectsFromStorage,
  saveUserProjectsToStorage,
  exportDataAsJson,
  validateImportData,
  getTodayDateString,
} from './utils/storage';
import { RecurringTaskTemplate } from './types/recurringTask';
import { RecurringTasksModal } from './components/RecurringTasksModal';
import {
  subscribeToRecurringTemplates,
  saveRecurringTemplate,
  deleteRecurringTemplate,
  processDueRecurringTasks,
  getNextUpcomingRunDate,
  formatRecurrenceLabel,
} from './services/recurringTaskService';
import {
  subscribeToUserData,
  initializeUserInitialDataIfEmpty,
  saveSpaceToFirestore,
  deleteSpaceFromFirestore,
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
import { AccessDenied } from './components/AccessDenied';
import { AdminPanel } from './components/AdminPanel';
import { TaskItem } from './components/TaskItem';
import { TaskFormModal } from './components/TaskFormModal';
import { BlockedReasonModal } from './components/BlockedReasonModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DailyReportPanel } from './components/DailyReportPanel';
import { WelcomeBanner } from './components/WelcomeBanner';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { WorkspaceManagerModal } from './components/WorkspaceManagerModal';
import { Header } from './components/Header';
import { TaskFilterBar } from './components/TaskFilterBar';
import { BacklogView } from './components/BacklogView';

export default function App() {
  const { user, loading: authLoading, logout, isAdmin, isApproved } = useAuth();

  // Données strictement isolées par utilisateur
  const [spaces, setSpaces] = useState<Espace[]>(() => getDefaultSpaces());
  const [activeSpaceId, setActiveSpaceId] = useState<string>(DEFAULT_SPACE_ID);
  const [tasks, setTasks] = useState<Tache[]>([]);
  const [projects, setProjects] = useState<Projet[]>([]);
  const [, setIsCloudSyncing] = useState<boolean>(false);

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

  // Navigation Vue Principale : 'tasks' | 'backlog' | 'report' | 'admin'
  const [currentView, setCurrentView] = useState<'tasks' | 'backlog' | 'report' | 'admin'>('tasks');
  const [taskModalDefaultStatus, setTaskModalDefaultStatus] = useState<StatutTache>('Open');

  // Filtres et Recherche Multi-Sélection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]); // Vide = tous les projets
  const [selectedStatuses, setSelectedStatuses] = useState<StatutTache[]>([]); // Vide = tous les statuts

  // Modales Tâche et Projet
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Tache | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Modale Tâches récurrentes planifiées (inspiration Outlook)
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTaskTemplate[]>([]);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const hasCheckedRecurringRef = useRef<Record<string, string>>({});
  const isProcessingRecurringRef = useRef<boolean>(false);

  // Modale Espaces de travail (Workspaces)
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [workspaceModalInitialMode, setWorkspaceModalInitialMode] = useState<'list' | 'create'>('list');

  // Modale Motif Bloqué (Règle 4)
  const [blockedModalTask, setBlockedModalTask] = useState<Tache | null>(null);

  // Modale de confirmation réutilisable
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

  // Synchronisation en temps réel avec Firebase Firestore strictement isolée par compte utilisateur
  useEffect(() => {
    if (!user || !isApproved) {
      // Déconnecté ou accès non validé ('pending' / 'disabled') : vider l'état
      setSpaces(getDefaultSpaces());
      setActiveSpaceId(DEFAULT_SPACE_ID);
      setTasks([]);
      setProjects([]);
      setIsCloudSyncing(false);
      return;
    }

    const currentUserId = user.uid;

    if (user.isLocalFallback) {
      // Mode démo local sans backend Firebase Auth
      const cachedSpaces = loadUserSpacesFromStorage(currentUserId);
      const cachedTasks = loadUserTasksFromStorage(currentUserId);
      const cachedProjects = loadUserProjectsFromStorage(currentUserId);
      const storedActiveSpaceId = loadActiveSpaceId(currentUserId);

      setSpaces(cachedSpaces.length > 0 ? cachedSpaces : getDefaultSpaces(currentUserId));
      setActiveSpaceId(
        storedActiveSpaceId && cachedSpaces.some((s) => s.id === storedActiveSpaceId)
          ? storedActiveSpaceId
          : cachedSpaces[0]?.id || DEFAULT_SPACE_ID
      );

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

    // Initialisation immédiate avec le cache local pour réactivité instantanée
    const localCachedSpaces = loadUserSpacesFromStorage(currentUserId);
    const localCachedTasks = loadUserTasksFromStorage(currentUserId);
    const localCachedProj = loadUserProjectsFromStorage(currentUserId);
    const localActiveSpaceId = loadActiveSpaceId(currentUserId);

    if (localCachedSpaces.length > 0) {
      setSpaces(localCachedSpaces);
      if (localActiveSpaceId && localCachedSpaces.some((s) => s.id === localActiveSpaceId)) {
        setActiveSpaceId(localActiveSpaceId);
      } else {
        setActiveSpaceId(localCachedSpaces[0].id);
      }
    }
    if (localCachedTasks.length > 0) setTasks(localCachedTasks);
    if (localCachedProj.length > 0) setProjects(localCachedProj);

    // 1. Initialise l'espace Firestore personnel s'il est vierge
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
      (remoteSpaces) => {
        if (!isMounted) return;
        if (remoteSpaces && remoteSpaces.length > 0) {
          setSpaces(remoteSpaces);
          saveUserSpacesToStorage(currentUserId, remoteSpaces);
          setActiveSpaceId((prevId) => {
            if (remoteSpaces.some((s) => s.id === prevId)) return prevId;
            return remoteSpaces[0].id;
          });
        }
      },
      (syncErr) => {
        console.error('Erreur synchronisation Firestore:', syncErr);
        if (isMounted) {
          setIsCloudSyncing(false);
          const fallbackSpaces = loadUserSpacesFromStorage(currentUserId);
          const fallbackTasks = loadUserTasksFromStorage(currentUserId);
          const fallbackProj = loadUserProjectsFromStorage(currentUserId);
          if (fallbackSpaces.length > 0) setSpaces(fallbackSpaces);
          if (fallbackTasks.length > 0) setTasks(fallbackTasks);
          if (fallbackProj.length > 0) setProjects(fallbackProj);
          showToast('Mode hors-ligne : données locales actives.', 'error');
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user, isApproved]);

  // Abonnement aux modèles de tâches récurrentes de l'utilisateur
  useEffect(() => {
    if (!user || !isApproved) {
      setRecurringTemplates([]);
      return;
    }

    const unsubscribe = subscribeToRecurringTemplates(user.uid, (remoteTemplates) => {
      setRecurringTemplates(remoteTemplates);
    });

    return () => {
      unsubscribe();
    };
  }, [user, isApproved]);

  // Sauvegardes miroir dans le localStorage
  useEffect(() => {
    if (user?.uid && spaces.length > 0) {
      saveUserSpacesToStorage(user.uid, spaces);
    }
  }, [spaces, user]);

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

  // Espace de travail actif courant
  const currentSpace = useMemo(() => {
    const found = spaces.find((s) => s.id === activeSpaceId);
    return found || spaces[0] || getDefaultSpaces()[0];
  }, [spaces, activeSpaceId]);

  // Données strictement cloisonnées pour l'espace actif (Workspaces étanches)
  const currentSpaceTasks = useMemo(() => {
    return tasks.filter((t) => (t.spaceId || DEFAULT_SPACE_ID) === currentSpace.id);
  }, [tasks, currentSpace.id]);

  // Tâches actives de l'espace (hors statut Backlog - vue principale Kanban opérationnelle)
  const activeSpaceTasks = useMemo(() => {
    return currentSpaceTasks.filter(
      (t) => (t.statut as string)?.toLowerCase() !== 'backlog'
    );
  }, [currentSpaceTasks]);

  // Tâches en attente dans le Backlog de l'espace actif
  const backlogSpaceTasks = useMemo(() => {
    return currentSpaceTasks.filter(
      (t) => (t.statut as string)?.toLowerCase() === 'backlog'
    );
  }, [currentSpaceTasks]);

  const currentSpaceProjects = useMemo(() => {
    return projects.filter((p) => (p.spaceId || DEFAULT_SPACE_ID) === currentSpace.id);
  }, [projects, currentSpace.id]);

  // Map des projets de l'espace actif pour lookup instantané
  const projectsMap = useMemo(() => {
    const map = new Map<string, Projet>();
    currentSpaceProjects.forEach((p) => map.set(p.id, p));
    return map;
  }, [currentSpaceProjects]);

  // Modèles de tâches récurrentes de l'espace actif
  const currentSpaceRecurringTemplates = useMemo(() => {
    return recurringTemplates.filter((t) => (t.spaceId || DEFAULT_SPACE_ID) === currentSpace.id);
  }, [recurringTemplates, currentSpace.id]);

  const currentSpaceRecurringCount = currentSpaceRecurringTemplates.filter((t) => t.isActive).length;

  // SERVICE DE GÉNÉRATION AUTOMATIQUE (Option A - Client-side)
  // Exécuté au chargement de l'espace actif : génère les tâches échues et avance nextRunDate
  useEffect(() => {
    if (!user || !isApproved || !currentSpace.id || recurringTemplates.length === 0) return;

    const todayStr = getTodayDateString();
    const checkKey = `${currentSpace.id}-${todayStr}`;

    // Verrouillage immédiat pour empêcher toute exécution concurrente ou multiple
    if (hasCheckedRecurringRef.current[checkKey] || isProcessingRecurringRef.current) {
      return;
    }

    hasCheckedRecurringRef.current[checkKey] = todayStr;
    isProcessingRecurringRef.current = true;

    const runAutoGeneration = async () => {
      try {
        const result = await processDueRecurringTasks({
          userId: user.uid,
          spaceId: currentSpace.id,
          templates: recurringTemplates,
          existingTasks: tasks,
          onTaskCreated: async (newTask) => {
            setTasks((prev) => {
              if (prev.some((t) => t.id === newTask.id)) return prev;
              return [newTask, ...prev];
            });
            if (!user.isLocalFallback) {
              await saveTaskToFirestore(user.uid, newTask);
            }
          },
          onTemplateUpdated: async (updatedTemplate) => {
            setRecurringTemplates((prev) =>
              prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
            );
          },
        });

        if (result.generatedCount > 0) {
          showToast(
            `⚡ ${result.generatedCount} tâche${
              result.generatedCount > 1 ? 's' : ''
            } récurrente${result.generatedCount > 1 ? 's ont été générées' : ' a été générée'} pour aujourd'hui !`
          );
        }
      } catch (err) {
        console.warn('Erreur lors de la génération automatique des tâches récurrentes :', err);
      } finally {
        isProcessingRecurringRef.current = false;
      }
    };

    runAutoGeneration();
  }, [user, isApproved, currentSpace.id, recurringTemplates, tasks]);

  // Déconnexion
  const handleLogout = async () => {
    try {
      setSpaces(getDefaultSpaces());
      setActiveSpaceId(DEFAULT_SPACE_ID);
      setTasks([]);
      setProjects([]);
      await logout();
      showToast('Vous avez été déconnecté.');
    } catch (err) {
      console.error('Erreur déconnexion:', err);
      showToast('Erreur lors de la déconnexion.', 'error');
    }
  };

  // Basculer d'espace de travail
  const handleSelectSpace = (spaceId: string) => {
    setActiveSpaceId(spaceId);
    if (user?.uid) {
      saveActiveSpaceId(user.uid, spaceId);
    }
    // Réinitialisation des filtres locaux lors d'un changement d'espace pour un affichage propre
    setSelectedProjectIds([]);
    setSelectedStatuses([]);
    setSearchQuery('');
    const targetSpace = spaces.find((s) => s.id === spaceId);
    if (targetSpace) {
      showToast(`Espace « ${targetSpace.nom} » activé.`);
    }
  };

  // Réinitialisation rapide de tous les filtres
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedProjectIds([]);
    setSelectedStatuses([]);
  };

  // Enregistrer (Créer ou Modifier) un espace de travail
  const handleSaveWorkspace = (spaceData: {
    id?: string;
    nom: string;
    couleur: string;
    icone: string;
    description?: string;
  }) => {
    if (spaceData.id) {
      // Modification d'un espace existant
      const updatedSpace: Espace = {
        id: spaceData.id,
        userId: user?.uid,
        nom: spaceData.nom,
        couleur: spaceData.couleur,
        icone: spaceData.icone,
        description: spaceData.description,
        dateCreation:
          spaces.find((s) => s.id === spaceData.id)?.dateCreation || new Date().toISOString(),
      };

      setSpaces((prev) => prev.map((s) => (s.id === spaceData.id ? updatedSpace : s)));

      if (user && !user.isLocalFallback) {
        saveSpaceToFirestore(user.uid, updatedSpace).catch((err) => {
          console.error('Erreur Firestore mise à jour espace:', err);
        });
      }

      showToast(`Espace « ${spaceData.nom} » mis à jour.`);
    } else {
      // Création d'un nouvel espace
      const newSpaceId = 'space-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const newSpace: Espace = {
        id: newSpaceId,
        userId: user?.uid,
        nom: spaceData.nom,
        couleur: spaceData.couleur,
        icone: spaceData.icone,
        description: spaceData.description,
        dateCreation: new Date().toISOString(),
      };

      setSpaces((prev) => [...prev, newSpace]);
      setActiveSpaceId(newSpaceId);
      if (user?.uid) {
        saveActiveSpaceId(user.uid, newSpaceId);
      }

      if (user && !user.isLocalFallback) {
        saveSpaceToFirestore(user.uid, newSpace).catch((err) => {
          console.error('Erreur Firestore création espace:', err);
        });
      }

      showToast(`Espace « ${spaceData.nom} » créé et activé.`);
    }
  };

  // Demande de suppression d'un espace de travail (avec confirmation stricte)
  const handleRequestDeleteWorkspace = (spaceToDelete: Espace) => {
    if (spaces.length <= 1) {
      showToast('Impossible de supprimer le dernier espace de travail restant.', 'error');
      return;
    }

    const taskCount = tasks.filter((t) => t.spaceId === spaceToDelete.id).length;
    const projectCount = projects.filter((p) => p.spaceId === spaceToDelete.id).length;

    setConfirmModalConfig({
      isOpen: true,
      title: `Supprimer l'espace « ${spaceToDelete.nom} » ?`,
      message: `Attention : cette action est irréversible. L'espace sera supprimé ainsi que la totalité de ses ${projectCount} projet(s) et ${taskCount} tâche(s) associés.`,
      onConfirm: () => {
        // Supprimer localement
        const remainingSpaces = spaces.filter((s) => s.id !== spaceToDelete.id);
        setSpaces(remainingSpaces);
        setTasks((prev) => prev.filter((t) => t.spaceId !== spaceToDelete.id));
        setProjects((prev) => prev.filter((p) => p.spaceId !== spaceToDelete.id));

        // Si l'espace supprimé était l'espace actif, basculer sur le premier restant
        if (activeSpaceId === spaceToDelete.id) {
          const nextActive = remainingSpaces[0]?.id || DEFAULT_SPACE_ID;
          setActiveSpaceId(nextActive);
          if (user?.uid) {
            saveActiveSpaceId(user.uid, nextActive);
          }
        }

        // Supprimer sur Firestore
        if (user && !user.isLocalFallback) {
          deleteSpaceFromFirestore(user.uid, spaceToDelete.id, tasks, projects).catch((err) => {
            console.error('Erreur Firestore suppression espace:', err);
          });
        }

        setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
        setIsWorkspaceModalOpen(false);
        showToast(`Espace « ${spaceToDelete.nom} » et ses données ont été supprimés.`);
      },
    });
  };

  // Tri et Filtrage multi-critères des tâches de l'espace actif (hors Backlog)
  const sortedAndFilteredTasks = useMemo(() => {
    const filtered = activeSpaceTasks.filter((t) => {
      // 1. Recherche textuelle dans le titre ou la description
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = t.titre.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchDesc) return false;
      }

      // 2. Filtre Multi-sélection Projets (vide = tous les projets autorisés)
      if (selectedProjectIds.length > 0) {
        const taskProjectId = t.projetId && t.projetId.trim() !== '' ? t.projetId : 'none';
        if (!selectedProjectIds.includes(taskProjectId)) {
          return false;
        }
      }

      // 3. Filtre Multi-sélection Statuts (vide = tous les statuts autorisés)
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(t.statut)) {
          return false;
        }
      }

      return true;
    });

    const activeTasks = filtered.filter((t) => t.statut !== 'Done');
    const doneTasks = filtered.filter((t) => t.statut === 'Done');

    activeTasks.sort((a, b) => a.ordre - b.ordre);
    doneTasks.sort((a, b) => a.ordre - b.ordre);

    return [...activeTasks, ...doneTasks];
  }, [activeSpaceTasks, searchQuery, selectedProjectIds, selectedStatuses]);

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
      const maxOrdre = currentSpaceTasks.reduce((max, t) => Math.max(max, t.ordre), 0);
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
    } else if (newStatus === 'Backlog' || (newStatus as string) === 'backlog') {
      showToast('Tâche déplacée dans le Backlog.');
    } else if (newStatus === 'Open') {
      showToast('Tâche transférée dans les tâches actives (À faire).');
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

  // Création / Modification d'une tâche dans l'espace actif
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
        spaceId: editingTask.spaceId || currentSpace.id,
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
      const maxOrdre = currentSpaceTasks.reduce((max, t) => Math.max(max, t.ordre), 0);
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
        spaceId: currentSpace.id,
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

      showToast(`Nouvelle tâche créée dans « ${currentSpace.nom} ».`);
    }

    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // Demande de suppression de tâche
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

  // Ajout rapide d'une tâche directement dans le Backlog
  const handleQuickAddBacklogTask = (titre: string, projetId?: string | null) => {
    const maxOrdre = currentSpaceTasks.reduce((max, t) => Math.max(max, t.ordre), 0);
    const newTask: Tache = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: user?.uid,
      spaceId: currentSpace.id,
      titre: titre.trim(),
      description: '',
      projetId: projetId ?? null,
      statut: 'Backlog',
      dateEcheance: null,
      dateRealisation: null,
      dateModification: new Date().toISOString(),
      ordre: maxOrdre + 1,
      commentaires: [],
    };

    setTasks((prev) => [newTask, ...prev]);

    if (user && !user.isLocalFallback) {
      saveTaskToFirestore(user.uid, newTask).catch((err) => {
        console.error('Erreur Firestore création tâche backlog:', err);
      });
    }

    showToast('Idée ajoutée au Backlog.');
  };

  // Réordonnancement des tâches du Backlog (Drag & Drop)
  const handleReorderBacklogTasks = (reorderedBacklogTasks: Tache[]) => {
    const orderMap = new Map<string, number>();
    reorderedBacklogTasks.forEach((t, idx) => {
      orderMap.set(t.id, idx + 1);
    });

    setTasks((prev) =>
      prev.map((t) => {
        if (orderMap.has(t.id)) {
          return { ...t, ordre: orderMap.get(t.id)! };
        }
        return t;
      })
    );

    if (user && !user.isLocalFallback) {
      reorderedBacklogTasks.forEach((t, idx) => {
        saveTaskToFirestore(user.uid, { ...t, ordre: idx + 1 }).catch((err) => {
          console.error('Erreur Firestore réordonnancement backlog:', err);
        });
      });
    }
  };

  // GESTION DES TÂCHES PLANIFIÉES & RÉCURRENTES
  const handleSaveRecurringTemplate = async (template: RecurringTaskTemplate) => {
    try {
      setRecurringTemplates((prev) => {
        const exists = prev.some((t) => t.id === template.id);
        return exists
          ? prev.map((t) => (t.id === template.id ? template : t))
          : [...prev, template];
      });
      await saveRecurringTemplate(user?.uid, template);
      showToast('Planification récurrente enregistrée.');
    } catch (err) {
      console.error('Erreur enregistrement récurrence:', err);
      showToast('Erreur lors de la sauvegarde.', 'error');
    }
  };

  const handleDeleteRecurringTemplate = async (templateId: string) => {
    try {
      setRecurringTemplates((prev) => prev.filter((t) => t.id !== templateId));
      await deleteRecurringTemplate(user?.uid, templateId);
      showToast('Planification supprimée.');
    } catch (err) {
      console.error('Erreur suppression récurrence:', err);
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  const handleManualTriggerRecurringTask = async (template: RecurringTaskTemplate) => {
    try {
      const todayStr = getTodayDateString();
      const nowIso = new Date().toISOString();
      const newTask: Tache = {
        id: `rec-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user?.uid,
        spaceId: template.spaceId,
        projetId: template.projectId || null,
        titre: template.title,
        description: template.description || '',
        statut: 'Open',
        dateEcheance: todayStr,
        dateRealisation: null,
        dateModification: nowIso,
        ordre: 0,
        commentaires: [
          {
            id: `comm-rec-${Date.now()}`,
            texte: `⚡ Occurrence générée manuellement (Règle : ${formatRecurrenceLabel(
              template.recurrenceType,
              template.dayOfWeek,
              template.dayOfMonth
            )}).`,
            date: nowIso,
          },
        ],
      };

      setTasks((prev) => [newTask, ...prev]);
      if (user && !user.isLocalFallback) {
        await saveTaskToFirestore(user.uid, newTask);
      }

      // Avancer la date de prochaine exécution au cycle suivant
      const nextDate = getNextUpcomingRunDate(
        template.nextRunDate,
        template.recurrenceType,
        todayStr,
        {
          dayOfWeek: template.dayOfWeek,
          dayOfMonth: template.dayOfMonth,
        }
      );

      const updatedTemplate: RecurringTaskTemplate = {
        ...template,
        nextRunDate: nextDate,
        lastGeneratedDate: todayStr,
      };

      setRecurringTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? updatedTemplate : t))
      );
      await saveRecurringTemplate(user?.uid, updatedTemplate);

      showToast(`Tâche « ${template.title} » générée immédiatement.`);
    } catch (err) {
      console.error('Erreur déclenchement manuel tâche récurrente:', err);
      showToast('Erreur lors du déclenchement.', 'error');
    }
  };

  // Projets : Ajout dans l'espace actif
  const handleAddProject = (nom: string, couleur: string) => {
    const newProj: Projet = {
      id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: user?.uid,
      spaceId: currentSpace.id,
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

    showToast(`Projet « ${nom} » créé dans « ${currentSpace.nom} ».`);
  };

  // Projets : Demande de suppression dans l'espace actif
  const handleRequestDeleteProject = (project: Projet) => {
    const count = currentSpaceTasks.filter((t) => t.projetId === project.id).length;
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

  // Tâches d'exemples dans l'espace actif
  const exampleTaskIds = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'];
  const hasExampleTasks = useMemo(() => {
    return currentSpaceTasks.some((t) => exampleTaskIds.includes(t.id));
  }, [currentSpaceTasks]);

  const handleClearExampleTasks = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Supprimer les tâches d'exemples ?",
      message:
        "Cette action va retirer les tâches de démonstration de cet espace pour vous laisser une to-do list vierge. Vos éventuelles nouvelles tâches seront conservées.",
      onConfirm: () => {
        setTasks((prev) =>
          prev.filter((t) => !(t.spaceId === currentSpace.id && exampleTaskIds.includes(t.id)))
        );

        if (user && !user.isLocalFallback) {
          deleteMultipleTasksFromFirestore(user.uid, exampleTaskIds).catch((err) => {
            console.error('Erreur Firestore suppression exemples:', err);
          });
        }

        setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
        showToast("Tâches d'exemples retirées.");
      },
    });
  };

  // Drag and Drop Logic (restreint aux tâches de l'espace actif)
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

  // Import / Export JSON (inclut les espaces)
  const handleExportJson = () => {
    exportDataAsJson(tasks, projects, spaces, user?.uid);
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

        const newSpaces = validated.espaces || spaces;
        const newProjects = validated.projets;
        const newTasks = validated.taches;

        setConfirmModalConfig({
          isOpen: true,
          title: 'Importer les données JSON ?',
          message: `Ce fichier contient ${newSpaces.length} espace(s), ${newProjects.length} projet(s) et ${newTasks.length} tâche(s). Voulez-vous importer ces données et les synchroniser dans Firestore ?`,
          onConfirm: () => {
            setSpaces(newSpaces);
            setActiveSpaceId(newSpaces[0]?.id || DEFAULT_SPACE_ID);
            setProjects(newProjects);
            setTasks(newTasks);

            if (user && !user.isLocalFallback) {
              importDataToFirestore(user.uid, newProjects, newTasks, newSpaces).catch((err) => {
                console.error('Erreur Firestore import:', err);
              });
            }

            setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }));
            showToast('Données et espaces importés avec succès.');
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

  // Écran d'attente d'authentification
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

  // Écran de connexion si non authentifié
  if (!user) {
    return <AuthScreen />;
  }

  // Garde-fou d'accès restreint : Si le compte est 'pending' ou 'disabled'
  if (!isApproved) {
    return <AccessDenied onLogout={handleLogout} />;
  }

  // Tâches en retard dans l'espace actif (exclut le Backlog)
  const overdueCount = activeSpaceTasks.filter((t) => {
    if (t.statut === 'Done') return false;
    if (!t.dateEcheance) return false;
    const today = new Date().toISOString().split('T')[0];
    return t.dateEcheance < today;
  }).length;

  // Filtres actifs ?
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedProjectIds.length > 0 ||
    selectedStatuses.length > 0;

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

      {/* Input caché pour Import JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* HEADER SUPÉRIEUR AVEC SÉLECTEUR D'ESPACE ET NAVIGATION */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        tasks={tasks}
        projects={projects}
        recurringCount={currentSpaceRecurringCount}
        onSelectSpace={handleSelectSpace}
        onOpenWorkspaceModal={(mode) => {
          setWorkspaceModalInitialMode(mode);
          setIsWorkspaceModalOpen(true);
        }}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
        onOpenTaskModal={() => {
          setEditingTask(null);
          setTaskModalDefaultStatus(currentView === 'backlog' ? 'Backlog' : 'Open');
          setIsTaskModalOpen(true);
        }}
        onExportJson={handleExportJson}
        onImportJson={handleTriggerFileInput}
        onLogout={handleLogout}
      />

      {/* CONTENU PRINCIPAL */}
      <main id="main-content" className="mx-auto max-w-6xl w-full flex-1 px-4 py-6 sm:px-6">
        {currentView === 'admin' ? (
          <AdminPanel onBack={() => setCurrentView('tasks')} />
        ) : currentView === 'backlog' ? (
          <BacklogView
            tasks={currentSpaceTasks}
            projects={currentSpaceProjects}
            activeSpace={currentSpace}
            onStatusChange={handleStatusChangeRequest}
            onEditTask={(t) => {
              setEditingTask(t);
              setTaskModalDefaultStatus('Backlog');
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleRequestDeleteTask}
            onAddComment={handleAddCommentToTask}
            onQuickAddTask={handleQuickAddBacklogTask}
            onOpenCreateModal={() => {
              setEditingTask(null);
              setTaskModalDefaultStatus('Backlog');
              setIsTaskModalOpen(true);
            }}
            onReorderTasks={handleReorderBacklogTasks}
          />
        ) : currentView === 'tasks' ? (
          <div className="space-y-4">
            {/* MESSAGE DE BIENVENUE POUR LES NOUVEAUX UTILISATEURS */}
            {showWelcome && (
              <WelcomeBanner
                onDismiss={handleDismissWelcome}
                onNewTaskClick={() => {
                  setEditingTask(null);
                  setTaskModalDefaultStatus('Open');
                  setIsTaskModalOpen(true);
                }}
                onClearExamplesClick={handleClearExampleTasks}
                hasExampleTasks={hasExampleTasks}
              />
            )}

            {/* BARRE DE RECHERCHE ET FILTRES MULTI-SÉLECTION ERGONOMIQUE */}
            <TaskFilterBar
              currentSpaceName={currentSpace.nom}
              tasks={activeSpaceTasks}
              projects={currentSpaceProjects}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedProjectIds={selectedProjectIds}
              onProjectSelectionChange={setSelectedProjectIds}
              selectedStatuses={selectedStatuses}
              onStatusSelectionChange={setSelectedStatuses}
              onResetFilters={handleResetFilters}
              overdueCount={overdueCount}
            />

            {/* LISTE DES TÂCHES DE L'ESPACE */}
            <div id="tasks-list-container" className="space-y-1.5 sm:space-y-2">
              {sortedAndFilteredTasks.length === 0 ? (
                <div
                  id="empty-tasks-placeholder"
                  className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {hasActiveFilters
                      ? 'Aucune tâche ne correspond à vos filtres'
                      : `Aucune tâche active dans l’espace « ${currentSpace.nom} »`}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    {hasActiveFilters
                      ? 'Essayez d’élargir vos termes de recherche ou de réinitialiser les filtres.'
                      : 'Créez votre première tâche ou piochez dans votre Backlog pour alimenter ce tableau opérationnel.'}
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Effacer les filtres
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          setTaskModalDefaultStatus('Open');
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
                        setTaskModalDefaultStatus(t.statut);
                        setIsTaskModalOpen(true);
                      }}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setTaskModalDefaultStatus(t.statut);
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
          /* PANNEAU DAILY REPORT DE L'ESPACE ACTIF (Exclut le Backlog) */
          <DailyReportPanel
            tasks={activeSpaceTasks}
            projects={currentSpaceProjects}
            activeSpace={currentSpace}
          />
        )}
      </main>

      {/* FOOTER DISCRET */}
      <footer id="main-footer" className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Espace actif : <strong>{currentSpace.nom}</strong> • Données synchronisées en temps réel via Firebase Firestore
          </p>
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

      {/* MODALE CRÉATION / ÉDITION TÂCHE (Projets de l'espace actif) */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        initialTask={editingTask}
        defaultStatus={taskModalDefaultStatus}
        projects={currentSpaceProjects}
        onSave={handleSaveTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setTaskModalDefaultStatus('Open');
        }}
      />

      {/* MODALE MOTIF DE BLOCAGE (Règle 4) */}
      <BlockedReasonModal
        isOpen={!!blockedModalTask}
        task={blockedModalTask}
        onConfirm={handleConfirmBlockedReason}
        onCancel={() => setBlockedModalTask(null)}
      />

      {/* MODALE GESTION DES PROJETS DE L'ESPACE ACTIF */}
      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        projects={currentSpaceProjects}
        tasks={currentSpaceTasks}
        activeSpace={currentSpace}
        onAddProject={handleAddProject}
        onRequestDeleteProject={handleRequestDeleteProject}
        onClose={() => setIsProjectModalOpen(false)}
      />

      {/* MODALE GESTION DES ESPACES DE TRAVAIL (CRUD WORKSPACES) */}
      <WorkspaceManagerModal
        isOpen={isWorkspaceModalOpen}
        initialMode={workspaceModalInitialMode}
        spaces={spaces}
        tasks={tasks}
        projects={projects}
        activeSpaceId={activeSpaceId}
        onSelectSpace={handleSelectSpace}
        onSaveSpace={handleSaveWorkspace}
        onRequestDeleteSpace={handleRequestDeleteWorkspace}
        onClose={() => setIsWorkspaceModalOpen(false)}
      />

      {/* MODALE REUTILISABLE DE CONFIRMATION DE SUPPRESSION */}
      <ConfirmationModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig((cfg) => ({ ...cfg, isOpen: false }))}
      />

      {/* MODALE GESTION DES TÂCHES PLANIFIÉES & RÉCURRENTES (Outlook style) */}
      <RecurringTasksModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        templates={recurringTemplates}
        activeSpaceId={currentSpace.id}
        activeSpaceName={currentSpace.nom}
        projects={currentSpaceProjects}
        userId={user?.uid}
        onSaveTemplate={handleSaveRecurringTemplate}
        onDeleteTemplate={handleDeleteRecurringTemplate}
        onManualTrigger={handleManualTriggerRecurringTask}
      />
    </div>
  );
}
