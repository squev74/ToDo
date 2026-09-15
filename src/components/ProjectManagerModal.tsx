import React, { useState } from 'react';
import { X, Plus, Trash2, Folder, Check } from 'lucide-react';
import { Projet, Tache, Espace } from '../types';
import { getWorkspaceIconComponent } from '../utils/workspaceIcons';

interface ProjectManagerModalProps {
  isOpen: boolean;
  projects: Projet[];
  tasks: Tache[];
  activeSpace?: Espace;
  onAddProject: (nom: string, couleur: string) => void;
  onRequestDeleteProject: (projet: Projet) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
];

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  projects,
  tasks,
  activeSpace,
  onAddProject,
  onRequestDeleteProject,
  onClose,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const ActiveSpaceIcon = activeSpace ? getWorkspaceIconComponent(activeSpace.icone) : null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setError('Le nom du projet est obligatoire.');
      return;
    }
    if (projects.some((p) => p.nom.toLowerCase() === newProjectName.trim().toLowerCase())) {
      setError('Un projet portant ce nom existe déjà.');
      return;
    }

    onAddProject(newProjectName.trim(), selectedColor);
    setNewProjectName('');
    setError('');
  };

  return (
    <div
      id="project-manager-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-manager-title"
    >
      <div
        id="project-manager-container"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="project-manager-title" className="text-base font-semibold text-slate-900">
                  Gestion des Projets
                </h3>
                {activeSpace && ActiveSpaceIcon && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    <span
                      className="flex h-3.5 w-3.5 items-center justify-center rounded text-white"
                      style={{ backgroundColor: activeSpace.couleur || '#6366f1' }}
                    >
                      <ActiveSpaceIcon className="h-2 w-2 stroke-[2.5]" />
                    </span>
                    <span className="truncate max-w-[120px]">{activeSpace.nom}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Créez et organisez vos dossiers de tâches pour cet espace</p>
            </div>
          </div>
          <button
            id="project-manager-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire nouveau projet */}
        <form onSubmit={handleCreate} className="mt-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
            Ajouter un nouveau projet
          </h4>
          <div className="space-y-3">
            <div>
              <input
                id="new-project-name-input"
                type="text"
                value={newProjectName}
                onChange={(e) => {
                  setNewProjectName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ex. Refonte Mobile, Audit Sécurité, Recrutement..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              />
              {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Couleur d&apos;identification :</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="relative h-7 w-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: color }}
                    aria-label={`Choisir couleur ${color}`}
                  >
                    {selectedColor === color && (
                      <Check className="h-4 w-4 text-white stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="submit-new-project-btn"
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Créer le projet
            </button>
          </div>
        </form>

        {/* Liste des projets existants */}
        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Projets existants ({projects.length})
          </h4>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-3 text-center">Aucun projet créé pour l&apos;instant.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {projects.map((proj) => {
                const count = tasks.filter((t) => t.projetId === proj.id).length;
                return (
                  <div
                    key={proj.id}
                    id={`project-item-${proj.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                        style={{ backgroundColor: proj.couleur }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{proj.nom}</p>
                        <p className="text-xs text-slate-500">
                          {count} tâche{count > 1 ? 's' : ''} associée{count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      id={`delete-project-btn-${proj.id}`}
                      type="button"
                      onClick={() => onRequestDeleteProject(proj)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Supprimer ce projet"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button
            id="close-project-manager-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
