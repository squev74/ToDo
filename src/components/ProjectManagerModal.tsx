import React, { useState } from 'react';
import { X, Plus, Trash2, Folder, Check, Edit2 } from 'lucide-react';
import { Projet, Tache, Espace } from '../types';
import { getWorkspaceIconComponent } from '../utils/workspaceIcons';

interface ProjectManagerModalProps {
  isOpen: boolean;
  projects: Projet[];
  tasks: Tache[];
  activeSpace?: Espace;
  onAddProject: (nom: string, couleur: string, jiraKey?: string) => void;
  onUpdateProject: (id: string, nom: string, couleur: string, jiraKey?: string) => void;
  onRequestDeleteProject: (projet: Projet) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#4F46E5', // Indigo vif
  '#0D9488', // Teal énergique
  '#E11D48', // Rose / Framboise vif
  '#0284C7', // Bleu azur
  '#D97706', // Ambre / Orange chaud
  '#7C3AED', // Violet éclatant
  '#059669', // Vert émeraude
  '#EA580C', // Orange flamboyant
  '#65A30D', // Vert lime punchy
  '#C026D3', // Fuchsia vibrant
];

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  projects,
  tasks,
  activeSpace,
  onAddProject,
  onUpdateProject,
  onRequestDeleteProject,
  onClose,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectJira, setNewProjectJira] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  // États pour l'édition en ligne
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editJiraKey, setEditJiraKey] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editError, setEditError] = useState('');

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
    const cleanJira = newProjectJira.trim().toUpperCase();
    if (cleanJira && projects.some((p) => p.jiraKey === cleanJira)) {
      setError('Un projet avec ce code JIRA existe déjà.');
      return;
    }

    onAddProject(newProjectName.trim(), selectedColor, cleanJira || undefined);
    setNewProjectName('');
    setNewProjectJira('');
    setError('');
  };

  const startEdit = (proj: Projet) => {
    setEditingProjectId(proj.id);
    setEditName(proj.nom);
    setEditJiraKey(proj.jiraKey || '');
    setEditColor(proj.couleur);
    setEditError('');
  };

  const handleSaveEdit = (projectId: string) => {
    if (!editName.trim()) {
      setEditError('Le nom du projet est obligatoire.');
      return;
    }
    if (projects.some((p) => p.id !== projectId && p.nom.toLowerCase() === editName.trim().toLowerCase())) {
      setEditError('Un autre projet porte déjà ce nom.');
      return;
    }
    const cleanJira = editJiraKey.trim().toUpperCase();
    if (cleanJira && projects.some((p) => p.id !== projectId && p.jiraKey === cleanJira)) {
      setEditError('Un autre projet porte déjà ce code JIRA.');
      return;
    }

    onUpdateProject(projectId, editName.trim(), editColor, cleanJira || undefined);
    setEditingProjectId(null);
  };

  return (
    <div
      id="project-manager-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 p-4 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-manager-title"
    >
      <div
        id="project-manager-container"
        className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EFEB]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5B7083]/10 text-[#5B7083]">
              <Folder className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="project-manager-title" className="text-base font-normal tracking-wide text-[#1A1D1A]">
                  Gestion des Projets
                </h3>
                {activeSpace && ActiveSpaceIcon && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#F0EFEB] px-2 py-0.5 text-[11px] font-medium text-[#737873]">
                    <span
                      className="flex h-3.5 w-3.5 items-center justify-center rounded text-white"
                      style={{ backgroundColor: activeSpace.couleur || '#6B8E78' }}
                    >
                      <ActiveSpaceIcon className="h-2 w-2 stroke-[2.5]" />
                    </span>
                    <span className="truncate max-w-[120px]">{activeSpace.nom}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#737873]">Organisez vos intentions par projets dans cet espace</p>
            </div>
          </div>
          <button
            id="project-manager-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulaire nouveau projet */}
        <form onSubmit={handleCreate} className="mt-4 rounded-xl bg-[#F9F8F6] p-4 border border-[#F0EFEB]">
          <h4 className="text-xs font-medium text-[#737873] mb-2.5">
            Nouveau projet
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label htmlFor="new-project-name-input" className="block text-[10px] text-[#737873] mb-1">Nom du projet :</label>
                <input
                  id="new-project-name-input"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Ex. Refonte Mobile, Audit..."
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3.5 py-2 text-xs text-[#1A1D1A] placeholder:text-[#737873]/60 focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="new-project-jira-input" className="block text-[10px] text-[#737873] mb-1">Code JIRA associé (optionnel) :</label>
                <input
                  id="new-project-jira-input"
                  type="text"
                  value={newProjectJira}
                  onChange={(e) => {
                    setNewProjectJira(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Ex. PROJ-101"
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3.5 py-2 text-xs text-[#1A1D1A] placeholder:text-[#737873]/60 focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors font-mono"
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-600 font-light">{error}</p>}

            <div>
              <label className="block text-[11px] text-[#737873] mb-1.5">Nuance d&apos;identification :</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="relative h-6 w-6 rounded-full transition-transform duration-200 hover:scale-110 flex items-center justify-center shadow-none cursor-pointer"
                    style={{ backgroundColor: color }}
                    aria-label={`Choisir couleur ${color}`}
                  >
                    {selectedColor === color && (
                      <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="submit-new-project-btn"
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-medium text-white hover:bg-[#5d7c68] active:scale-[0.99] transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer le projet
            </button>
          </div>
        </form>

        {/* Liste des projets existants */}
        <div className="mt-5">
          <h4 className="text-xs font-medium text-[#737873] mb-2">
            Projets existants ({projects.length})
          </h4>
          {projects.length === 0 ? (
            <p className="text-xs text-[#737873] py-4 text-center font-light">Aucun projet créé dans cet espace.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {projects.map((proj) => {
                const count = tasks.filter((t) => t.projetId === proj.id).length;
                const isEditing = editingProjectId === proj.id;

                if (isEditing) {
                  return (
                    <div
                      key={proj.id}
                      className="rounded-xl border border-[#6B8E78]/30 bg-[#F9F8F6] p-3 space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-[#737873]">Nom du projet</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-xs text-[#1A1D1A] focus:outline-hidden focus:border-[#6B8E78]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#737873]">Code JIRA</label>
                          <input
                            type="text"
                            value={editJiraKey}
                            onChange={(e) => setEditJiraKey(e.target.value)}
                            placeholder="Optionnel"
                            className="w-full rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-xs text-[#1A1D1A] font-mono focus:outline-hidden focus:border-[#6B8E78]"
                          />
                        </div>
                      </div>

                      {/* Sélecteur de couleur en édition */}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditColor(color)}
                              className="h-4.5 w-4.5 rounded-full transition-transform hover:scale-110 flex items-center justify-center shadow-none cursor-pointer"
                              style={{ backgroundColor: color }}
                            >
                              {editColor === color && (
                                <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {editError && <p className="text-[10px] text-rose-600 font-light">{editError}</p>}

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingProjectId(null)}
                          className="rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-[10px] font-medium text-[#737873] hover:text-[#1A1D1A]"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(proj.id)}
                          className="rounded-lg bg-[#6B8E78] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#5d7c68]"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={proj.id}
                    id={`project-item-${proj.id}`}
                    className="flex items-center justify-between rounded-xl border border-[#F0EFEB] bg-white p-3 hover:border-[#E2DFD8] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: proj.couleur }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#1A1D1A] truncate flex items-center gap-1.5">
                          <span>{proj.nom}</span>
                          {proj.jiraKey && (
                            <span className="rounded bg-indigo-50 text-indigo-700 px-1 py-0.5 text-[9px] font-mono">
                              {proj.jiraKey}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#737873]">
                          {count} tâche{count > 1 ? 's' : ''} associée{count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id={`edit-project-btn-${proj.id}`}
                        type="button"
                        onClick={() => startEdit(proj)}
                        className="rounded-lg p-1.5 text-[#737873] hover:bg-slate-50 hover:text-slate-800 transition-colors"
                        title="Modifier ce projet"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`delete-project-btn-${proj.id}`}
                        type="button"
                        onClick={() => onRequestDeleteProject(proj)}
                        className="rounded-lg p-1.5 text-[#737873] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Supprimer ce projet"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end border-t border-[#F0EFEB] pt-4">
          <button
            id="close-project-manager-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#F0EFEB] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
