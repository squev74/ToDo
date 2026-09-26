import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Folder, Tag, AlertCircle, MessageSquare, Send, User, Clock } from 'lucide-react';
import { Tache, Projet, StatutTache } from '../types';
import { AiTaskRefiner } from './AiTaskRefiner';

interface TaskFormModalProps {
  isOpen: boolean;
  initialTask?: Tache | null;
  defaultStatus?: StatutTache;
  projects: Projet[];
  onSave: (taskData: {
    titre: string;
    description: string;
    projetId: string | null;
    jiraKey?: string;
    statut: StatutTache;
    dateEcheance?: string | null;
    blockedReason?: string;
    activationDate?: string | null;
  }) => void;
  onClose: () => void;
  onAddComment?: (taskId: string, commentText: string) => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  initialTask,
  defaultStatus,
  projects,
  onSave,
  onClose,
  onAddComment,
}) => {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [projetId, setProjetId] = useState<string | null>(null);
  const [jiraKey, setJiraKey] = useState('');
  const [statut, setStatut] = useState<StatutTache>(defaultStatus || 'Open');
  const [dateEcheance, setDateEcheance] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [activationDate, setActivationDate] = useState('');
  const [error, setError] = useState('');

  // Saisie du nouveau commentaire
  const [newCommentText, setNewCommentText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTask) {
      setTitre(initialTask.titre);
      setDescription(initialTask.description || '');
      setProjetId(initialTask.projetId || null);
      setJiraKey(initialTask.jiraKey || '');
      setStatut(initialTask.statut);
      setDateEcheance(initialTask.dateEcheance || '');
      setBlockedReason('');
      setActivationDate(initialTask.activationDate || '');
    } else {
      setTitre('');
      setDescription('');
      setProjetId(projects.length > 0 ? projects[0].id : null);
      setJiraKey('');
      setStatut(defaultStatus || 'Open');
      setDateEcheance('');
      setBlockedReason('');
      setActivationDate('');
    }
    setError('');
    setNewCommentText('');
  }, [initialTask, isOpen, projects, defaultStatus]);

  // Scroll automatique au bas des commentaires lorsqu'un nouveau est ajouté
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialTask?.commentaires]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) {
      setError('Le titre de la tâche est obligatoire.');
      return;
    }

    if (statut === 'Blocked' && initialTask?.statut !== 'Blocked' && !blockedReason.trim()) {
      setError('Un motif explicatif est obligatoire pour définir le statut sur Bloqué.');
      return;
    }

    onSave({
      titre: titre.trim(),
      description: description.trim(),
      projetId: projetId || null,
      jiraKey: jiraKey.trim() || undefined,
      statut,
      dateEcheance: dateEcheance.trim() ? dateEcheance.trim() : null,
      blockedReason: statut === 'Blocked' ? blockedReason.trim() : undefined,
      activationDate: (statut?.toLowerCase() === 'backlog') && activationDate.trim() ? activationDate.trim() : null,
    });
    onClose();
  };

  const handlePostComment = () => {
    if (!newCommentText.trim() || !initialTask || !onAddComment) return;
    onAddComment(initialTask.id, newCommentText.trim());
    setNewCommentText('');
  };

  // Aide au formatage de la date locale de commentaire
  const formatCommentDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      id="task-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 p-4 backdrop-blur-xs transition-opacity duration-300 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-form-title"
    >
      <div
        id="task-form-container"
        className={`w-full ${
          initialTask ? 'max-w-4xl' : 'max-w-lg'
        } rounded-2xl bg-white p-6 sm:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] transition-all duration-300 animate-in fade-in zoom-in-95`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EFEB]">
          <h3 id="task-form-title" className="text-base font-normal tracking-wide text-[#1A1D1A]">
            {initialTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h3>
          <button
            id="task-form-close-button"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div
            id="task-form-error-alert"
            className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50/70 border border-rose-200/60 p-3 text-xs text-rose-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className={`mt-5 ${initialTask ? 'grid grid-cols-1 md:grid-cols-12 gap-6' : 'space-y-4'}`}>
          
          {/* COLONNE GAUCHE : Formulaire d'édition standard */}
          <form onSubmit={handleSubmit} className={`${initialTask ? 'md:col-span-7' : 'w-full'} space-y-4`}>
            <div>
              <label htmlFor="task-title-input" className="block text-xs font-medium text-[#737873] mb-1.5">
                Intention / Titre <span className="text-rose-500">*</span>
              </label>
              <input
                id="task-title-input"
                type="text"
                value={titre}
                onChange={(e) => {
                  setTitre(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ex. Finaliser la validation du cahier des charges"
                className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3.5 py-2 text-sm text-[#1A1D1A] placeholder:text-[#737873]/60 focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                autoFocus
              />
              <AiTaskRefiner currentValue={titre} onApplyRefinement={setTitre} />
            </div>

            <div>
              <label htmlFor="task-description-input" className="block text-xs font-medium text-[#737873] mb-1.5">
                Description détaillée
              </label>
              <textarea
                id="task-description-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails, consignes ou contexte supplémentaire..."
                className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] p-3 text-sm text-[#1A1D1A] placeholder:text-[#737873]/60 focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="task-project-select" className="flex items-center gap-1.5 text-xs font-medium text-[#737873] mb-1.5">
                  <Folder className="h-3.5 w-3.5 text-[#5B7083]" />
                  Projet associé
                </label>
                <select
                  id="task-project-select"
                  value={projetId || ''}
                  onChange={(e) => setProjetId(e.target.value ? e.target.value : null)}
                  className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                >
                  <option value="">(Aucun projet)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="task-status-select" className="flex items-center gap-1.5 text-xs font-medium text-[#737873] mb-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#6B8E78]" />
                  Statut
                </label>
                <select
                  id="task-status-select"
                  value={statut}
                  onChange={(e) => setStatut(e.target.value as StatutTache)}
                  className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                >
                  <option value="Open">À faire (Open)</option>
                  <option value="In Progress">En cours (In Progress)</option>
                  <option value="Blocked">Bloqué (Blocked)</option>
                  <option value="Done">Terminé (Done)</option>
                  <option value="Backlog">Backlog (En attente)</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-[#F0EFEB] bg-[#F9F8F6]/40 p-3.5 space-y-2.5">
              <label htmlFor="task-jirakey-select" className="block text-xs font-semibold text-[#5B7083]">
                Imputation JIRA associée (Optionnelle)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  id="task-jirakey-select"
                  value={['EVOLIT-24', 'EVOLIT-94', 'PMOIT-1845', 'Vacances/Maladie', 'PMO-GENERAL'].includes(jiraKey) ? jiraKey : ''}
                  onChange={(e) => setJiraKey(e.target.value)}
                  className="rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden"
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="EVOLIT-24">EVOLIT-24 (Produit V24)</option>
                  <option value="EVOLIT-94">EVOLIT-94 (Performance)</option>
                  <option value="PMOIT-1845">PMOIT-1845 (Cloud)</option>
                  <option value="Vacances/Maladie">Absences & Congés</option>
                  <option value="PMO-GENERAL">PMO & Support</option>
                </select>
                <input
                  id="task-jirakey-input"
                  type="text"
                  value={jiraKey}
                  onChange={(e) => setJiraKey(e.target.value)}
                  placeholder="Saisir clé JIRA libre (PROJ-123)"
                  className="rounded-lg border border-[#F0EFEB] bg-white px-3 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden"
                />
              </div>
            </div>

            {statut === 'Blocked' && initialTask?.statut !== 'Blocked' && (
              <div className="rounded-xl bg-[#C89B7B]/10 border border-[#C89B7B]/30 p-3">
                <label htmlFor="task-blocked-reason-input" className="block text-xs font-medium text-[#966847] mb-1">
                  Motif explicatif obligatoire <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="task-blocked-reason-input"
                  rows={2}
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="Raison du blocage de la tâche..."
                  className="w-full rounded-xl border border-[#C89B7B]/30 bg-white p-2 text-xs text-[#1A1D1A] focus:border-[#C89B7B] focus:outline-hidden focus:ring-2 focus:ring-[#C89B7B]/10 transition-colors resize-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="task-due-date-input" className="flex items-center gap-1.5 text-xs font-medium text-[#737873] mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#5B7083]" />
                Date d&apos;échéance (optionnelle)
              </label>
              <input
                id="task-due-date-input"
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
                className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
              />
            </div>

            {(statut?.toLowerCase() === 'backlog') && (
              <div className="rounded-xl border border-[#D3CFC8]/40 bg-[#F9F8F6]/80 p-3.5 space-y-2 animate-in slide-in-from-top-1 duration-200">
                <label htmlFor="task-activation-date-input" className="flex items-center gap-1.5 text-xs font-semibold text-[#966847]">
                  <Clock className="h-4 w-4 text-[#C89B7B]" />
                  <span>Réveil Planifié (Mise en route automatique)</span>
                </label>
                <p className="text-[10px] text-[#737873] font-light">
                  Planifiez une date pour que cette tâche du Backlog passe automatiquement à l&apos;état <strong>« À faire »</strong> à cette date.
                </p>
                <input
                  id="task-activation-date-input"
                  type="date"
                  value={activationDate}
                  onChange={(e) => setActivationDate(e.target.value)}
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                />
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-[#F0EFEB]">
              <button
                id="task-form-cancel-btn"
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#F0EFEB] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
              >
                Annuler
              </button>
              <button
                id="task-form-submit-btn"
                type="submit"
                className="rounded-xl bg-[#6B8E78] px-5 py-2 text-xs font-medium text-white hover:bg-[#5d7c68] active:scale-[0.99] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300"
              >
                {initialTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
              </button>
            </div>
          </form>

          {/* COLONNE DROITE : Visualisation et saisie de commentaires (Visible uniquement en édition) */}
          {initialTask && (
            <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-[#F0EFEB] pt-4 md:pt-0 md:pl-6 flex flex-col h-[520px]">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#F0EFEB] shrink-0">
                <MessageSquare className="h-4.5 w-4.5 text-[#6B8E78]" />
                <h4 className="text-xs font-semibold text-[#1A1D1A] tracking-wide">
                  Historique & Commentaires
                </h4>
                <span className="inline-flex h-5 items-center justify-center rounded-full bg-slate-100 px-2 text-[10px] font-bold text-[#737873] border border-[#F0EFEB]">
                  {(initialTask.commentaires || []).length}
                </span>
              </div>

              {/* Liste des commentaires */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 custom-scrollbar min-h-[300px]">
                {(!initialTask.commentaires || initialTask.commentaires.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <MessageSquare className="h-8 w-8 text-[#D3CFC8] mb-1.5 stroke-[1.5]" />
                    <p className="text-[11px] font-medium text-[#737873]">Aucun commentaire pour le moment.</p>
                    <p className="text-[10px] text-[#737873]/60 font-light mt-0.5">Saisissez une note ci-dessous pour lancer la discussion.</p>
                  </div>
                ) : (
                  initialTask.commentaires.map((comm) => (
                    <div
                      key={comm.id}
                      className="rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] p-3 text-xs leading-relaxed transition-all hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#F0EFEB]/50">
                        <div className="flex items-center gap-1.5 font-semibold text-[#1A1D1A] text-[11px]">
                          <User className="h-3 w-3 text-[#737873]" />
                          <span className="truncate max-w-[120px]">{comm.auteur || 'Collaborateur'}</span>
                        </div>
                        <span className="text-[9px] text-[#737873] font-light">
                          {formatCommentDate(comm.date)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#1A1D1A] whitespace-pre-wrap font-light font-sans break-words">
                        {comm.texte}
                      </p>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Saisie d'un nouveau commentaire */}
              {onAddComment ? (
                <div className="mt-4 pt-3 border-t border-[#F0EFEB] shrink-0">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Ajouter une note de suivi, d'avancement..."
                      className="w-full rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] p-2.5 pr-10 text-xs text-[#1A1D1A] placeholder:text-[#737873]/50 focus:border-[#6B8E78] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-all resize-none font-sans"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={!newCommentText.trim()}
                      onClick={handlePostComment}
                      className="absolute right-2 bottom-2.5 rounded-lg bg-[#6B8E78] p-1.5 text-white hover:bg-[#5d7c68] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Envoyer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[9px] text-[#737873] font-light mt-1.5 text-right">
                    Appuyez sur <kbd className="font-semibold bg-slate-100 px-1 py-0.5 rounded border border-[#F0EFEB]">Entrée</kbd> pour valider.
                  </p>
                </div>
              ) : (
                <div className="mt-4 text-center p-3 border border-amber-100 bg-amber-50/20 rounded-xl">
                  <p className="text-[10px] text-amber-700">L&apos;ajout de commentaires n&apos;est pas disponible.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
