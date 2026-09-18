import React, { useState } from 'react';
import { Plus, Eye, EyeOff, FolderPlus, Folder, Loader2, Info, X, Edit2 } from 'lucide-react';
import { Projet } from '../types';
import { PMOProject } from '../types/timesheet';

interface TimesheetProjectManagerProps {
  globalProjects: Projet[]; // Tous les projets de l'espace de travail
  activeProjectIds: string[]; // Projets actifs ce mois-ci dans la timesheet
  hiddenProjectIds: string[]; // Projets masqués ce mois-ci dans la timesheet
  customProjects: PMOProject[]; // Projets personnalisés saisis directement
  projectHours: Record<string, number>; // Total d'heures par code projet pour désactiver le masquage si > 0
  onAddProjectToTimesheet: (projectId: string) => void;
  onHideProjectFromTimesheet: (projectId: string) => void;
  onShowProjectInTimesheet: (projectId: string) => void;
  onCreateGlobalProject: (nom: string, jiraKey: string) => Promise<void>;
  onUpdateGlobalProject: (id: string, nom: string, jiraKey: string) => Promise<void>;
  onAddCustomProject: (name: string, code: string) => void;
  onRemoveCustomProject: (code: string) => void;
}

export const TimesheetProjectManager: React.FC<TimesheetProjectManagerProps> = ({
  globalProjects,
  activeProjectIds,
  hiddenProjectIds,
  customProjects,
  projectHours,
  onAddProjectToTimesheet,
  onHideProjectFromTimesheet,
  onShowProjectInTimesheet,
  onCreateGlobalProject,
  onUpdateGlobalProject,
  onAddCustomProject,
  onRemoveCustomProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingGlobal, setIsCreatingGlobal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjJira, setNewProjJira] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Projets de l'espace de travail disponibles à ajouter (ceux qui ne sont pas encore actifs ou qui sont masqués)
  const availableGlobalProjects = globalProjects.filter(
    (gp) => !activeProjectIds.includes(gp.id)
  );

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjJira.trim()) {
      setError('Le nom et le code JIRA sont requis.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      // Nettoyer et formater la clé JIRA
      const formattedJira = newProjJira.trim().toUpperCase();
      
      // Vérifier si le projet existe déjà par code ou nom
      const exists = globalProjects.some(
        (p) => p.nom.toLowerCase() === newProjName.trim().toLowerCase() || p.jiraKey === formattedJira
      );
      if (exists) {
        setError('Un projet avec ce nom ou ce code JIRA existe déjà.');
        setSubmitting(false);
        return;
      }

      await onCreateGlobalProject(newProjName.trim(), formattedJira);
      setNewProjName('');
      setNewProjJira('');
      setIsCreatingGlobal(false);
    } catch (err) {
      console.error(err);
      setError('Impossible de créer le projet.');
    } finally {
      setSubmitting(false);
    }
  };

  // États d'édition en ligne
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editJira, setEditJira] = useState('');
  const [editError, setEditError] = useState('');

  const startEdit = (gp: Projet) => {
    setEditingProjId(gp.id);
    setEditName(gp.nom);
    setEditJira(gp.jiraKey || '');
    setEditError('');
  };

  const handleSaveEdit = async (projectId: string) => {
    if (!editName.trim() || !editJira.trim()) {
      setEditError('Le nom et le code JIRA sont requis.');
      return;
    }
    const formattedJira = editJira.trim().toUpperCase();

    const exists = globalProjects.some(
      (p) => p.id !== projectId && (p.nom.toLowerCase() === editName.trim().toLowerCase() || p.jiraKey === formattedJira)
    );
    if (exists) {
      setEditError('Un autre projet avec ce nom ou ce code JIRA existe déjà.');
      return;
    }

    try {
      await onUpdateGlobalProject(projectId, editName.trim(), formattedJira);
      setEditingProjId(null);
    } catch (err) {
      setEditError('Impossible de mettre à jour le projet.');
    }
  };

  return (
    <div id="timesheet-proj-manager" className="bg-white rounded-2xl p-4 border border-[#F0EFEB] shadow-[0_2px_12px_rgba(0,0,0,0.01)] mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Folder className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#1A1D1A]">Projets de la feuille de temps</h4>
            <p className="text-[10px] text-[#737873]">Gérez les lignes de projets affichées dans votre grille mensuelle</p>
          </div>
        </div>
        <button
          id="toggle-project-manager-btn"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0EFEB] bg-white px-3 py-1.5 text-xs font-medium text-[#1A1D1A] hover:bg-[#F9F8F6] transition-all"
        >
          {isOpen ? 'Fermer le gestionnaire' : 'Gérer les projets du mois'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-[#F0EFEB] grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-1 duration-200">
          
          {/* Section 1 : Ajouter un projet existant ou masquer les actifs */}
          <div className="space-y-4">
            <div>
              <h5 className="text-xs font-medium text-[#1A1D1A] mb-2">Projets affichés dans la Timesheet ({activeProjectIds.length})</h5>
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-2">
                {globalProjects.length === 0 ? (
                  <p className="text-[11px] text-[#737873] italic">Aucun projet créé dans cet espace de travail.</p>
                ) : (
                  globalProjects.map((gp, index) => {
                    const isActive = activeProjectIds.includes(gp.id);
                    const isHidden = hiddenProjectIds.includes(gp.id);
                    const hoursImputed = projectHours[gp.jiraKey || gp.id] || 0;
                    const canHide = true; // Permettre de masquer n'importe quel projet à tout moment
                    const isEditing = editingProjId === gp.id;

                    if (isEditing) {
                      return (
                        <div
                          key={gp.id}
                          className="p-2 rounded-xl border border-indigo-200 bg-indigo-50/30 text-xs space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-medium text-[#737873]">Nom du projet</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full rounded border border-[#F0EFEB] bg-white px-1.5 py-0.5 text-[11px] text-[#1A1D1A]"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-medium text-[#737873]">Code JIRA</label>
                              <input
                                type="text"
                                value={editJira}
                                onChange={(e) => setEditJira(e.target.value)}
                                className="w-full rounded border border-[#F0EFEB] bg-white px-1.5 py-0.5 text-[11px] text-[#1A1D1A] font-mono"
                              />
                            </div>
                          </div>
                          {editError && <p className="text-[9px] text-red-600 font-light">{editError}</p>}
                          <div className="flex justify-end gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setEditingProjId(null)}
                              className="rounded bg-white border border-[#F0EFEB] px-2 py-0.5 text-[10px] font-medium text-[#737873] hover:text-[#1A1D1A]"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(gp.id)}
                              className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700"
                            >
                              Sauver
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={gp.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: gp.couleur || '#6B8E78' }}
                          />
                          <span className="font-medium truncate max-w-[140px]">{gp.nom}</span>
                          {gp.jiraKey && (
                            <span className="rounded bg-indigo-50 text-indigo-700 px-1 py-0.5 text-[9px] font-mono">
                              {gp.jiraKey}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id={`edit-timesheet-project-btn-${gp.id}`}
                            type="button"
                            onClick={() => startEdit(gp)}
                            title="Modifier le nom ou code JIRA"
                            className="p-1 rounded-lg border border-[#F0EFEB] hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                           {isActive ? (
                            <button
                              id={`hide-project-btn-${gp.id}`}
                              type="button"
                              onClick={() => onHideProjectFromTimesheet(gp.id)}
                              disabled={!canHide}
                              title={
                                !canHide
                                  ? "Impossible de masquer : des heures sont imputées"
                                  : "Masquer de la grille mensuelle"
                              }
                              className={`p-1 rounded-lg border transition-colors ${
                                canHide
                                  ? 'border-[#F0EFEB] hover:bg-red-50 text-red-600 cursor-pointer'
                                  : 'border-[#F0EFEB] opacity-40 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              id={`show-project-btn-${gp.id}`}
                              type="button"
                              onClick={() => {
                                if (isHidden) {
                                  onShowProjectInTimesheet(gp.id);
                                } else {
                                  onAddProjectToTimesheet(gp.id);
                                }
                              }}
                              title="Afficher dans la grille"
                              className="p-1 rounded-lg border border-[#F0EFEB] hover:bg-emerald-50 hover:text-emerald-600 text-gray-500 transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {availableGlobalProjects.length > 0 && (
              <div className="pt-2 border-t border-[#F0EFEB]/50">
                <label className="block text-[10px] font-medium text-[#737873] mb-1.5">
                  Ajouter un projet existant de l'espace à la grille :
                </label>
                <div className="flex gap-2">
                  <select
                    id="add-existing-project-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        onAddProjectToTimesheet(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Sélectionner un projet à ajouter --</option>
                    {availableGlobalProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom} {p.jiraKey ? `(${p.jiraKey})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 2 : Créer un tout nouveau projet avec code JIRA */}
          <div className="space-y-4 border-t pt-4 md:border-t-0 md:pt-0 md:border-l md:pl-6 border-[#F0EFEB]">
            <h5 className="text-xs font-medium text-[#1A1D1A] flex items-center gap-1.5">
              <FolderPlus className="h-4 w-4 text-indigo-600" />
              Créer un projet avec Code JIRA
            </h5>
            
            <p className="text-[10px] text-[#737873] leading-relaxed">
              Crée un nouveau projet global dans l'application et l'ajoute instantanément à votre feuille de temps mensuelle.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-[#737873] mb-1">
                  Nom du projet
                </label>
                <input
                  id="new-timesheet-project-name"
                  type="text"
                  placeholder="ex: Migration de la Base de Données"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-[#737873] mb-1">
                  Code JIRA / Clé de suivi
                </label>
                <input
                  id="new-timesheet-project-jira"
                  type="text"
                  placeholder="ex: EVOLIT-94"
                  value={newProjJira}
                  onChange={(e) => setNewProjJira(e.target.value)}
                  className="w-full rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-[10px] text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
              )}

              <button
                id="create-global-project-btn"
                type="submit"
                disabled={submitting || !newProjName.trim() || !newProjJira.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Créer & Ajouter à la Grille
                  </>
                )}
              </button>
            </form>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-2">
              <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[9px] text-amber-800 leading-relaxed">
                <strong>Conseil d'imputation :</strong> Les heures imputées sont conservées même si le projet est retiré de la vue plus tard. La ligne "Absences & Congés" reste fixe pour vos vacances.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
