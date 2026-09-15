import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  Shield,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Espace, Tache, Projet } from '../types';
import {
  WORKSPACE_ICONS,
  WORKSPACE_PRESET_COLORS,
  getWorkspaceIconComponent,
} from '../utils/workspaceIcons';

interface WorkspaceManagerModalProps {
  isOpen: boolean;
  initialMode?: 'list' | 'create';
  spaces: Espace[];
  tasks: Tache[];
  projects: Projet[];
  activeSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
  onSaveSpace: (spaceData: {
    id?: string;
    nom: string;
    couleur: string;
    icone: string;
    description?: string;
  }) => void;
  onRequestDeleteSpace: (space: Espace) => void;
  onClose: () => void;
}

export const WorkspaceManagerModal: React.FC<WorkspaceManagerModalProps> = ({
  isOpen,
  initialMode = 'list',
  spaces,
  tasks,
  projects,
  activeSpaceId,
  onSelectSpace,
  onSaveSpace,
  onRequestDeleteSpace,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(initialMode === 'create');
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);

  const [nom, setNom] = useState('');
  const [couleur, setCouleur] = useState(WORKSPACE_PRESET_COLORS[0]);
  const [icone, setIcone] = useState(WORKSPACE_ICONS[0].id);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showRulesHelper, setShowRulesHelper] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /test/connection {
      allow read: if true;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /spaces/{spaceId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /projects/{projectId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`;

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2500);
    } catch {
      // Ignorer
    }
  };

  // Synchroniser le mode d'ouverture (création directe ou liste)
  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'create') {
        startCreate();
      } else {
        setIsEditing(false);
        setEditingSpaceId(null);
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const startCreate = () => {
    setEditingSpaceId(null);
    setNom('');
    setCouleur(WORKSPACE_PRESET_COLORS[(spaces.length * 2) % WORKSPACE_PRESET_COLORS.length]);
    setIcone(WORKSPACE_ICONS[(spaces.length + 1) % WORKSPACE_ICONS.length].id);
    setDescription('');
    setError('');
    setIsEditing(true);
  };

  const startEdit = (space: Espace) => {
    setEditingSpaceId(space.id);
    setNom(space.nom);
    setCouleur(space.couleur || WORKSPACE_PRESET_COLORS[0]);
    setIcone(space.icone || WORKSPACE_ICONS[0].id);
    setDescription(space.description || '');
    setError('');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingSpaceId(null);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setError("Le nom de l'espace de travail est requis.");
      return;
    }

    // Vérification d'unicité de nom (hors espace en cours d'édition)
    const exists = spaces.some(
      (s) => s.id !== editingSpaceId && s.nom.toLowerCase() === nom.trim().toLowerCase()
    );
    if (exists) {
      setError('Un espace portant ce nom existe déjà.');
      return;
    }

    onSaveSpace({
      id: editingSpaceId || undefined,
      nom: nom.trim(),
      couleur,
      icone,
      description: description.trim() || undefined,
    });

    setIsEditing(false);
    setEditingSpaceId(null);
  };

  return (
    <div
      id="workspace-manager-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-manager-title"
    >
      <div
        id="workspace-manager-container"
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Entête */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h3 id="workspace-manager-title" className="text-base font-bold text-slate-900">
                Espaces de travail (Workspaces)
              </h3>
              <p className="text-xs text-slate-500">
                Cloisonnez vos projets, tâches et rapports selon vos contextes de vie
              </p>
            </div>
          </div>
          <button
            id="workspace-manager-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTENU : SOIT LE FORMULAIRE SOIT LA LISTE */}
        {isEditing ? (
          /* FORMULAIRE DE CRÉATION / ÉDITION */
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {editingSpaceId ? 'Modifier l’espace' : 'Créer un nouvel espace'}
              </h4>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Retour à la liste
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Nom de l'espace */}
            <div>
              <label htmlFor="workspace-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Nom de l&apos;espace <span className="text-rose-500">*</span>
              </label>
              <input
                id="workspace-name-input"
                type="text"
                value={nom}
                onChange={(e) => {
                  setNom(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ex: Travail, Maison, Hobbies, Études..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />
            </div>

            {/* Description facultative */}
            <div>
              <label htmlFor="workspace-desc-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Description (facultative)
              </label>
              <input
                id="workspace-desc-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Activités professionnelles et missions clients"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Sélecteur de couleur */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Couleur distinctive
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {WORKSPACE_PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCouleur(c)}
                    className="relative flex h-7 w-7 items-center justify-center rounded-lg transition-transform hover:scale-110 shadow-2xs"
                    style={{ backgroundColor: c }}
                  >
                    {couleur === c && <Check className="h-4 w-4 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélecteur d'icône */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Icône représentative
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                {WORKSPACE_ICONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = icone === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcone(item.id)}
                      title={item.label}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] font-medium truncate w-full">
                        {item.label.split('/')[0].trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Boutons d'action formulaire */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                id="save-workspace-submit-btn"
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
              >
                {editingSpaceId ? 'Enregistrer les modifications' : 'Créer l’espace'}
              </button>
            </div>
          </form>
        ) : (
          /* LISTE DES ESPACES */
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Vos espaces configurés ({spaces.length})
              </span>
              <button
                id="start-create-workspace-btn"
                type="button"
                onClick={startCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Nouvel espace</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {spaces.map((space) => {
                const SpaceIcon = getWorkspaceIconComponent(space.icone);
                const isSelected = space.id === activeSpaceId;
                const taskCount = tasks.filter((t) => t.spaceId === space.id).length;
                const projectCount = projects.filter((p) => p.spaceId === space.id).length;
                const isOnlySpace = spaces.length <= 1;

                return (
                  <div
                    key={space.id}
                    id={`workspace-row-${space.id}`}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-2xs shrink-0"
                        style={{ backgroundColor: space.couleur || '#6366f1' }}
                      >
                        <SpaceIcon className="h-4 w-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {space.nom}
                          </h4>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100/80 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Actif
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>
                            {taskCount} tâche{taskCount > 1 ? 's' : ''}
                          </span>
                          <span>•</span>
                          <span>
                            {projectCount} projet{projectCount > 1 ? 's' : ''}
                          </span>
                          {space.description && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[160px] text-slate-400">
                                {space.description}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSpace(space.id);
                            onClose();
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Basculer
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => startEdit(space)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Modifier l'espace"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isOnlySpace}
                        onClick={() => onRequestDeleteSpace(space)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          isOnlySpace
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                        title={
                          isOnlySpace
                            ? 'Le dernier espace ne peut pas être supprimé'
                            : 'Supprimer cet espace et ses données'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 border border-slate-200">
              <p className="font-semibold text-slate-700 mb-0.5">Étanchéité des données :</p>
              <p>
                Changer d&apos;espace isole strictement vos listes, projets, statuts et rapports journaliers.
                Vous pouvez créer des espaces pour chaque facette de votre organisation.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setShowRulesHelper(!showRulesHelper)}
                className="w-full flex items-center justify-between text-left text-xs font-medium text-slate-500 hover:text-slate-700 py-1 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-500" />
                  Règles de sécurité Firestore (Console Firebase)
                </span>
                {showRulesHelper ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {showRulesHelper && (
                <div className="mt-2 p-3 bg-slate-900 rounded-xl text-slate-200 text-xs font-mono">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-400 font-sans">
                      firestore.rules (à copier dans Firebase Console) :
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRules}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-sans transition-colors"
                    >
                      {copiedRules ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-300" />
                          Copié !
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copier
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[10px] leading-relaxed overflow-x-auto text-indigo-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800 max-h-40">
                    {FIRESTORE_RULES_SNIPPET}
                  </pre>
                  <p className="mt-2 text-[10px] text-slate-400 font-sans">
                    Collez ce contenu dans votre onglet <strong>Firestore Database &gt; Règles</strong> dans votre console Firebase, puis cliquez sur <strong>Publier</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
