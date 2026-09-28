import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Command,
  Search,
  ListTodo,
  Inbox,
  FolderOpen,
  BookOpen,
  Flag,
  Sparkles,
  Plus,
  ArrowRight,
  Clock,
  TrendingUp,
  X,
  ChevronRight,
  ShieldAlert,
  Terminal
} from 'lucide-react';
import { Tache, Projet, Milestone, KnowledgeDoc } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Tache[];
  projects: Projet[];
  milestones: Milestone[];
  activeSpaceId: string;
  onViewChange: (view: 'tasks' | 'backlog' | 'report' | 'timesheet' | 'admin' | 'knowledge' | 'archives' | 'analytics') => void;
  onSetPreferredTaskView?: (view: 'list' | 'kanban') => void;
  onOpenTaskModal: () => void;
  onEditTask: (task: Tache) => void;
  onSelectProject: (project: Projet) => void;
}

interface PaletteItem {
  id: string;
  category: 'action' | 'task' | 'project' | 'sop' | 'milestone';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeBg?: string;
  badgeText?: string;
  icon: React.ReactNode;
  handler: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  milestones,
  activeSpaceId,
  onViewChange,
  onSetPreferredTaskView,
  onOpenTaskModal,
  onEditTask,
  onSelectProject,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus automatique lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Éviter le défilement de la page arrière-plan quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Charger les SOP depuis le localStorage
  const localSops = useMemo<KnowledgeDoc[]>(() => {
    try {
      const local = localStorage.getItem('knowledge_docs_list');
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      console.error('Erreur de parsing des SOPs dans CommandPalette', e);
    }
    return [];
  }, [isOpen]);

  // Filtrer les entités de l'espace actif
  const currentSpaceTasks = useMemo(() => tasks.filter(t => t.spaceId === activeSpaceId), [tasks, activeSpaceId]);
  const currentSpaceProjects = useMemo(() => projects.filter(p => p.spaceId === activeSpaceId), [projects, activeSpaceId]);
  
  // Milestones associés aux projets de l'espace actif
  const currentSpaceMilestones = useMemo(() => {
    const projectIds = new Set(currentSpaceProjects.map(p => p.id));
    return milestones.filter(m => projectIds.has(m.projectId));
  }, [milestones, currentSpaceProjects]);

  // Construction de la liste globale d'items disponibles
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];
    const q = query.trim().toLowerCase();

    // 1. Gérer l'action Copilote dédiée "/ai" ou clic direct
    if (q.startsWith('/ai ')) {
      const question = query.substring(4).trim();
      items.push({
        id: 'copilot-custom',
        category: 'action',
        title: `Demander au PMO CoPilot : "${question || 'Votre question...'}"`,
        subtitle: "Démarre la génération de réponse par l'IA",
        badge: "PMO CoPilot",
        badgeBg: "bg-[#6B8E78]/15",
        badgeText: "text-[#6B8E78]",
        icon: <Sparkles className="h-4 w-4 text-[#6B8E78]" />,
        handler: () => {
          if (question) {
            window.dispatchEvent(new CustomEvent('pmo-copilot-trigger', { detail: { query: question } }));
            onClose();
          }
        }
      });
    } else {
      // Suggestion standard de CoPilot
      items.push({
        id: 'copilot-suggest',
        category: 'action',
        title: q ? `Demander au PMO CoPilot : "${q}"` : "Demander au PMO CoPilot...",
        subtitle: "Saisissez '/ai [question]' pour lancer une recherche IA",
        badge: "PMO CoPilot",
        badgeBg: "bg-[#6B8E78]/15",
        badgeText: "text-[#6B8E78]",
        icon: <Sparkles className="h-4 w-4 text-[#6B8E78]" />,
        handler: () => {
          const targetQuery = q || "Quels sont les risques et l'état général de mes projets ?";
          window.dispatchEvent(new CustomEvent('pmo-copilot-trigger', { detail: { query: targetQuery } }));
          onClose();
        }
      });
    }

    // 2. Actions rapides standards
    const quickActions: PaletteItem[] = [
      {
        id: 'action-create-task',
        category: 'action',
        title: "Créer une nouvelle tâche",
        subtitle: "Ouvre le formulaire de création",
        badge: "Action",
        badgeBg: "bg-emerald-50",
        badgeText: "text-emerald-700",
        icon: <Plus className="h-4 w-4 text-emerald-600" />,
        handler: () => {
          onOpenTaskModal();
          onClose();
        }
      },
      {
        id: 'action-view-kanban',
        category: 'action',
        title: "Basculer vers Kanban",
        subtitle: "Vue en colonnes des tâches actives",
        badge: "Vue",
        badgeBg: "bg-[#FAF9F6] border border-[#F0EFEB]",
        badgeText: "text-[#1A1D1A]",
        icon: <ListTodo className="h-4 w-4 text-[#6B8E78]" />,
        handler: () => {
          if (onSetPreferredTaskView) onSetPreferredTaskView('kanban');
          onViewChange('tasks');
          onClose();
        }
      },
      {
        id: 'action-view-list',
        category: 'action',
        title: "Basculer vers Liste des tâches",
        subtitle: "Vue tabulaire ou liste des tâches actives",
        badge: "Vue",
        badgeBg: "bg-[#FAF9F6] border border-[#F0EFEB]",
        badgeText: "text-[#1A1D1A]",
        icon: <ListTodo className="h-4 w-4 text-[#6B8E78]" />,
        handler: () => {
          if (onSetPreferredTaskView) onSetPreferredTaskView('list');
          onViewChange('tasks');
          onClose();
        }
      },
      {
        id: 'action-view-backlog',
        category: 'action',
        title: "Basculer vers le Backlog",
        subtitle: "Liste d'attente et activation planifiée",
        badge: "Vue",
        badgeBg: "bg-[#FAF9F6] border border-[#F0EFEB]",
        badgeText: "text-[#1A1D1A]",
        icon: <Inbox className="h-4 w-4 text-[#5B7083]" />,
        handler: () => {
          onViewChange('backlog');
          onClose();
        }
      },
      {
        id: 'action-view-knowledge',
        category: 'action',
        title: "Basculer vers Base de connaissances (SOP)",
        subtitle: "Fiches de procédures et guides d'animation",
        badge: "Vue",
        badgeBg: "bg-[#FAF9F6] border border-[#F0EFEB]",
        badgeText: "text-[#1A1D1A]",
        icon: <BookOpen className="h-4 w-4 text-indigo-600" />,
        handler: () => {
          onViewChange('knowledge');
          onClose();
        }
      },
      {
        id: 'action-view-report',
        category: 'action',
        title: "Basculer vers Suivi & Rapport d'activité",
        subtitle: "Suivi opérationnel et rapports IA",
        badge: "Vue",
        badgeBg: "bg-[#FAF9F6] border border-[#F0EFEB]",
        badgeText: "text-[#1A1D1A]",
        icon: <TrendingUp className="h-4 w-4 text-[#6B8E78]" />,
        handler: () => {
          onViewChange('report');
          onClose();
        }
      },
      {
        id: 'action-view-timesheet',
        category: 'action',
        title: "Basculer vers Feuille de temps",
        subtitle: "Saisie d'heures et imputations JIRA",
        badge: "Vue",
        badgeBg: "bg-[#FAF9F6] border border-[#F0EFEB]",
        badgeText: "text-[#1A1D1A]",
        icon: <Clock className="h-4 w-4 text-indigo-600" />,
        handler: () => {
          onViewChange('timesheet');
          onClose();
        }
      },
      {
        id: 'action-view-analytics',
        category: 'action',
        title: "Basculer vers Tableau de bord / Analytics",
        subtitle: "Vue consolidée et graphiques d'avancement",
        badge: "Vue",
        badgeBg: "bg-[#FAF9F6] border border-[#F0EFEB]",
        badgeText: "text-[#1A1D1A]",
        icon: <TrendingUp className="h-4 w-4 text-[#6B8E78]" />,
        handler: () => {
          onViewChange('analytics');
          onClose();
        }
      }
    ];

    // N'ajouter les actions rapides que si la requête ne cible pas spécifiquement une recherche avancée ou filtre
    const filteredQuickActions = quickActions.filter(action => 
      !q || action.title.toLowerCase().includes(q) || action.subtitle?.toLowerCase().includes(q)
    );
    items.push(...filteredQuickActions);

    // 3. Filtrer et ajouter les Tâches
    if (q && !q.startsWith('/ai ')) {
      const matchedTasks = currentSpaceTasks.filter(t => 
        t.titre.toLowerCase().includes(q) || 
        t.description?.toLowerCase().includes(q) || 
        t.id.toLowerCase().includes(q) ||
        t.jiraKey?.toLowerCase().includes(q)
      );
      
      matchedTasks.slice(0, 8).forEach(t => {
        const associatedProject = currentSpaceProjects.find(p => p.id === t.projetId);
        items.push({
          id: `task-${t.id}`,
          category: 'task',
          title: t.titre,
          subtitle: `${associatedProject ? associatedProject.nom : 'Général'} • Statut: ${t.statut}${t.jiraKey ? ` • JIRA: ${t.jiraKey}` : ''}`,
          badge: `Tâche #${t.id.substring(0, 5)}`,
          badgeBg: "bg-amber-50 text-amber-700 border border-amber-100",
          icon: <ListTodo className="h-4 w-4 text-[#6B8E78]" />,
          handler: () => {
            onEditTask(t);
            onClose();
          }
        });
      });
    }

    // 4. Filtrer et ajouter les Projets
    if (q) {
      const matchedProjects = currentSpaceProjects.filter(p => 
        p.nom.toLowerCase().includes(q) || 
        p.jiraKey?.toLowerCase().includes(q)
      );

      matchedProjects.forEach(p => {
        items.push({
          id: `project-${p.id}`,
          category: 'project',
          title: p.nom,
          subtitle: p.jiraKey ? `Clé JIRA: ${p.jiraKey}` : "Pas de clé JIRA associée",
          badge: "Projet",
          badgeBg: "bg-[#6B8E78]/10 text-[#6B8E78]",
          icon: (
            <div 
              className="h-4 w-4 rounded-full border border-white shrink-0" 
              style={{ backgroundColor: p.couleur || '#6B8E78' }} 
            />
          ),
          handler: () => {
            onSelectProject(p);
            onClose();
          }
        });
      });
    }

    // 5. Filtrer et ajouter les SOPs / Documents de Connaissances
    if (q) {
      const matchedSops = localSops.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.summary?.toLowerCase().includes(q)
      );

      matchedSops.forEach(s => {
        items.push({
          id: `sop-${s.id || s.title}`,
          category: 'sop',
          title: s.title,
          subtitle: s.summary || "Fiche de procédure interne",
          badge: "SOP Doc",
          badgeBg: "bg-indigo-50 text-indigo-700 border border-indigo-100",
          icon: <BookOpen className="h-4 w-4 text-indigo-600" />,
          handler: () => {
            onViewChange('knowledge');
            // Sauvegarder dans localStorage pour ouvrir le doc s'il y a un système de sélection de document
            try {
              localStorage.setItem('command_palette_selected_sop_title', s.title);
              window.dispatchEvent(new CustomEvent('select-sop-by-title', { detail: { title: s.title } }));
            } catch (err) {
              console.error(err);
            }
            onClose();
          }
        });
      });
    }

    // 6. Filtrer et ajouter les Jalons / Milestones
    if (q) {
      const matchedMilestones = currentSpaceMilestones.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.description?.toLowerCase().includes(q)
      );

      matchedMilestones.forEach(m => {
        const associatedProj = currentSpaceProjects.find(p => p.id === m.projectId);
        items.push({
          id: `milestone-${m.id}`,
          category: 'milestone',
          title: m.title,
          subtitle: `Échéance: ${m.date} • Projet: ${associatedProj?.nom || 'Général'}`,
          badge: m.completed ? "Jalon ✔" : "Jalon",
          badgeBg: m.completed ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100",
          icon: <Flag className="h-4 w-4 text-[#966847]" />,
          handler: () => {
            // Ouvrir la vue détaillée du projet
            if (associatedProj) {
              onSelectProject(associatedProj);
            }
            onClose();
          }
        });
      });
    }

    return items;
  }, [query, currentSpaceTasks, currentSpaceProjects, currentSpaceMilestones, localSops, activeSpaceId]);

  // Réinitialiser la sélection à chaque mise à jour de la liste filtrée
  useEffect(() => {
    setSelectedIndex(0);
  }, [allItems.length]);

  // Assurer que l'élément sélectionné est visible lors du défilement au clavier
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const selectedEl = listEl.children[selectedIndex] as HTMLElement;
    if (!selectedEl) return;

    const listHeight = listEl.clientHeight;
    const scrollOffset = listEl.scrollTop;
    const itemHeight = selectedEl.offsetHeight;
    const itemOffset = selectedEl.offsetTop;

    if (itemOffset + itemHeight > listHeight + scrollOffset) {
      listEl.scrollTop = itemOffset + itemHeight - listHeight;
    } else if (itemOffset < scrollOffset) {
      listEl.scrollTop = itemOffset;
    }
  }, [selectedIndex]);

  // Listener global clavier dans le modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, allItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].handler();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allItems, selectedIndex]);

  if (!isOpen) return null;

  // Grouper les résultats par catégorie pour l'affichage visuel
  const categories = {
    action: allItems.filter(item => item.category === 'action'),
    task: allItems.filter(item => item.category === 'task'),
    project: allItems.filter(item => item.category === 'project'),
    sop: allItems.filter(item => item.category === 'sop'),
    milestone: allItems.filter(item => item.category === 'milestone'),
  };

  // Liste ordonnée pour récupérer le bon index absolu lors du survol
  const getAbsoluteIndex = (category: keyof typeof categories, localIndex: number) => {
    let index = 0;
    const order: (keyof typeof categories)[] = ['action', 'task', 'project', 'sop', 'milestone'];
    for (const cat of order) {
      if (cat === category) {
        return index + localIndex;
      }
      index += categories[cat].length;
    }
    return 0;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-[10vh] backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#F0EFEB] bg-[#FAF9F6] shadow-2xl animate-in slide-in-from-top-4 duration-300 flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Barre de recherche */}
        <div className="flex items-center gap-3 border-b border-[#F0EFEB] bg-white px-4 py-3.5 shrink-0">
          <Search className="h-5 w-5 text-[#6B8E78] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 border-0 bg-transparent text-sm text-[#1A1D1A] placeholder:text-gray-400 focus:outline-hidden focus:ring-0"
            placeholder="Rechercher des tâches, projets, SOPs, jalons ou tapez '/ai [question]'..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-[#F0EFEB] bg-[#FAF9F6] px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 shrink-0">
            Échap
          </kbd>
        </div>

        {/* Corps des résultats */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-[#F0EFEB]/50 max-h-[50vh]"
        >
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Command className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-xs font-semibold text-[#1A1D1A]">Aucun résultat trouvé pour votre recherche</p>
              <p className="text-[11px] text-[#737873] mt-1 max-w-md">
                Essayez de saisir un autre mot-clé ou demandez directement à l&apos;intelligence PMO en tapant <code className="bg-[#F0EFEB] px-1.5 py-0.5 rounded font-mono text-[#6B8E78]">/ai [votre question]</code>
              </p>
            </div>
          ) : (
            <>
              {/* Actions Rapides */}
              {categories.action.length > 0 && (
                <div className="py-2 first:pt-0">
                  <h3 className="px-3 py-1.5 text-[10px] font-bold text-[#737873] uppercase tracking-wider">
                    Actions rapides & Raccourcis
                  </h3>
                  <div className="space-y-0.5">
                    {categories.action.map((item, localIdx) => {
                      const absoluteIdx = getAbsoluteIndex('action', localIdx);
                      const isSelected = selectedIndex === absoluteIdx;
                      return (
                        <div
                          key={item.id}
                          onClick={item.handler}
                          onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#6B8E78] text-white shadow-xs'
                              : 'hover:bg-[#FAF9F6] text-[#1A1D1A]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`${isSelected ? 'text-white' : 'text-[#6B8E78]'}`}>{item.icon}</span>
                            <div>
                              <p className="text-xs font-semibold">{item.title}</p>
                              {item.subtitle && (
                                <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#737873]'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider ${
                              isSelected ? 'bg-white/20 text-white' : item.badgeBg || 'bg-gray-100 text-gray-700'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tâches */}
              {categories.task.length > 0 && (
                <div className="py-2">
                  <h3 className="px-3 py-1.5 text-[10px] font-bold text-[#737873] uppercase tracking-wider">
                    Tâches opérationnelles
                  </h3>
                  <div className="space-y-0.5">
                    {categories.task.map((item, localIdx) => {
                      const absoluteIdx = getAbsoluteIndex('task', localIdx);
                      const isSelected = selectedIndex === absoluteIdx;
                      return (
                        <div
                          key={item.id}
                          onClick={item.handler}
                          onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#6B8E78] text-white shadow-xs'
                              : 'hover:bg-[#FAF9F6] text-[#1A1D1A]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`${isSelected ? 'text-white' : 'text-[#6B8E78]'}`}>{item.icon}</span>
                            <div>
                              <p className="text-xs font-semibold">{item.title}</p>
                              {item.subtitle && (
                                <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#737873]'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold tracking-wider ${
                              isSelected ? 'bg-white/20 text-white' : item.badgeBg || 'bg-gray-100 text-gray-700'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Projets */}
              {categories.project.length > 0 && (
                <div className="py-2">
                  <h3 className="px-3 py-1.5 text-[10px] font-bold text-[#737873] uppercase tracking-wider">
                    Projets actifs
                  </h3>
                  <div className="space-y-0.5">
                    {categories.project.map((item, localIdx) => {
                      const absoluteIdx = getAbsoluteIndex('project', localIdx);
                      const isSelected = selectedIndex === absoluteIdx;
                      return (
                        <div
                          key={item.id}
                          onClick={item.handler}
                          onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#6B8E78] text-white shadow-xs'
                              : 'hover:bg-[#FAF9F6] text-[#1A1D1A]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span>{item.icon}</span>
                            <div>
                              <p className="text-xs font-semibold">{item.title}</p>
                              {item.subtitle && (
                                <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#737873]'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider ${
                              isSelected ? 'bg-white/20 text-white' : item.badgeBg || 'bg-gray-100 text-gray-700'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SOP Documents */}
              {categories.sop.length > 0 && (
                <div className="py-2">
                  <h3 className="px-3 py-1.5 text-[10px] font-bold text-[#737873] uppercase tracking-wider">
                    Base de connaissances (SOP / Procédures)
                  </h3>
                  <div className="space-y-0.5">
                    {categories.sop.map((item, localIdx) => {
                      const absoluteIdx = getAbsoluteIndex('sop', localIdx);
                      const isSelected = selectedIndex === absoluteIdx;
                      return (
                        <div
                          key={item.id}
                          onClick={item.handler}
                          onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#6B8E78] text-white shadow-xs'
                              : 'hover:bg-[#FAF9F6] text-[#1A1D1A]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`${isSelected ? 'text-white' : 'text-indigo-600'}`}>{item.icon}</span>
                            <div>
                              <p className="text-xs font-semibold">{item.title}</p>
                              {item.subtitle && (
                                <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#737873]'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider ${
                              isSelected ? 'bg-white/20 text-white' : item.badgeBg || 'bg-gray-100 text-gray-700'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Jalons / Milestones */}
              {categories.milestone.length > 0 && (
                <div className="py-2">
                  <h3 className="px-3 py-1.5 text-[10px] font-bold text-[#737873] uppercase tracking-wider">
                    Jalons & Échéances importantes
                  </h3>
                  <div className="space-y-0.5">
                    {categories.milestone.map((item, localIdx) => {
                      const absoluteIdx = getAbsoluteIndex('milestone', localIdx);
                      const isSelected = selectedIndex === absoluteIdx;
                      return (
                        <div
                          key={item.id}
                          onClick={item.handler}
                          onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#6B8E78] text-white shadow-xs'
                              : 'hover:bg-[#FAF9F6] text-[#1A1D1A]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`${isSelected ? 'text-white' : 'text-[#966847]'}`}>{item.icon}</span>
                            <div>
                              <p className="text-xs font-semibold">{item.title}</p>
                              {item.subtitle && (
                                <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#737873]'}`}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider ${
                              isSelected ? 'bg-white/20 text-white' : item.badgeBg || 'bg-gray-100 text-gray-700'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer d'information et d'aide */}
        <div className="bg-[#FAF9F6] border-t border-[#F0EFEB] px-4 py-2.5 flex items-center justify-between text-[10px] text-[#737873] font-light shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5 rounded border border-[#EAE8E2] bg-white px-1 py-0.2 font-mono">↑↓</span>
            <span>Naviguer</span>
            <span className="text-[#D3CFC8]">•</span>
            <span className="flex items-center gap-0.5 rounded border border-[#EAE8E2] bg-white px-1 py-0.2 font-mono">Entrée</span>
            <span>Sélectionner</span>
          </div>
          <p className="italic">
            Astuce : Saisissez <code className="bg-[#F0EFEB] px-1 py-0.2 rounded font-mono font-medium text-[#6B8E78]">/ai ...</code> pour appeler directement l&apos;assistant PMO
          </p>
        </div>
      </div>
    </div>
  );
};
