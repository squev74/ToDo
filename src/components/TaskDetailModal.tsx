import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Folder, 
  Tag, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  User, 
  Clock, 
  Lightbulb, 
  BookOpen, 
  Eye, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Tache, Projet, StatutTache, ActivityLog, ProjectPhase, SopArticle } from '../types';
import { AiTaskRefiner } from './AiTaskRefiner';

interface TaskDetailModalProps {
  isOpen: boolean;
  initialTask?: Tache | null;
  defaultStatus?: StatutTache;
  projects: Projet[];
  phases: ProjectPhase[];
  activityLogs?: ActivityLog[];
  activeSpaceId?: string;
  onSave: (taskData: {
    titre: string;
    description: string;
    projetId: string | null;
    phaseId?: string | null;
    jiraKey?: string;
    statut: StatutTache;
    dateEcheance?: string | null;
    blockedReason?: string;
    activationDate?: string | null;
  }) => void;
  onClose: () => void;
  onAddComment?: (taskId: string, commentText: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  process: 'Procédures & SOP',
  reporting: 'Reporting',
  jira: 'Jira Cloud',
  tooling: 'Outils & Scripts',
  template: 'Modèles',
  other: 'Autre'
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  initialTask,
  defaultStatus,
  projects,
  phases = [],
  activityLogs,
  activeSpaceId,
  onSave,
  onClose,
  onAddComment,
}) => {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [projetId, setProjetId] = useState<string | null>(null);
  const [phaseId, setPhaseId] = useState<string | null>(null);
  const [jiraKey, setJiraKey] = useState('');
  const [statut, setStatut] = useState<StatutTache>(defaultStatus || 'Open');
  const [dateEcheance, setDateEcheance] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [activationDate, setActivationDate] = useState('');
  const [error, setError] = useState('');
  const [activeRightTab, setActiveRightTab] = useState<'comments' | 'timeline'>('comments');

  // Saisie du nouveau commentaire
  const [newCommentText, setNewCommentText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Liste des articles SOP chargés localement
  const [localSops, setLocalSops] = useState<SopArticle[]>([]);
  // SOP recommandée sélectionnée pour l'aperçu drawer
  const [previewSop, setPreviewSop] = useState<SopArticle | null>(null);

  // Charger les articles de connaissances depuis le localStorage au montage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('pmo_sop_articles') || localStorage.getItem('knowledge_docs_list');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setLocalSops(parsed);
          }
        } catch (e) {
          console.error('Erreur chargement local SOPs:', e);
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialTask) {
      setTitre(initialTask.titre);
      setDescription(initialTask.description || '');
      setProjetId(initialTask.projetId || null);
      setPhaseId(initialTask.phaseId || null);
      setJiraKey(initialTask.jiraKey || '');
      setStatut(initialTask.statut);
      setDateEcheance(initialTask.dateEcheance || '');
      setBlockedReason('');
      setActivationDate(initialTask.activationDate || '');
    } else {
      setTitre('');
      setDescription('');
      const defaultProjId = projects.length > 0 ? projects[0].id : null;
      setProjetId(defaultProjId);
      setPhaseId(null);
      setJiraKey('');
      setStatut(defaultStatus || 'Open');
      setDateEcheance('');
      setBlockedReason('');
      setActivationDate('');
    }
    setError('');
    setNewCommentText('');
    setPreviewSop(null);
  }, [initialTask, isOpen, projects, defaultStatus]);

  // Scroll automatique au bas des commentaires lorsqu'un nouveau est ajouté
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialTask?.commentaires]);

  // --- Algorithme de détection et matching de SOP 100% local ---
  const matchingSops = useMemo(() => {
    if (!titre.trim() && !description.trim()) return [];

    const textToSearch = `${titre} ${description}`.toLowerCase();
    
    // Normalisation basique pour ignorer les accents et diacritiques
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
    const normalizedText = normalize(textToSearch);
    const spaceIdToFilter = activeSpaceId || initialTask?.spaceId || 'default';

    return localSops
      .filter((sop) => {
        // Filtrage par espace actif : transversaux (sans spaceId) OU correspondant à l'espace
        return !sop.spaceId || sop.spaceId.trim() === '' || sop.spaceId === spaceIdToFilter;
      })
      .map((sop) => {
        let score = 0;
        const normalizedSopTitle = normalize(sop.title);
        const normalizedSopSummary = normalize(sop.summary || '');
        
        // 1. Recherche par tags
        if (sop.tags && Array.isArray(sop.tags)) {
          sop.tags.forEach(tag => {
            const normalizedTag = normalize(tag);
            if (normalizedTag.length > 1 && normalizedText.includes(normalizedTag)) {
              score += 15; // Fort signal si un tag de l'article est saisi
            }
          });
        }

        // 2. Recherche par keywords de déclenchement explicites
        if (sop.keywords && Array.isArray(sop.keywords)) {
          sop.keywords.forEach(kw => {
            const normalizedKw = normalize(kw);
            if (normalizedKw.length > 1 && normalizedText.includes(normalizedKw)) {
              score += 12;
            }
          });
        }

        // 3. Détection sémantique par groupes de déclenchement (Regex et synonymes)
        const rules = [
          {
            terms: [/deploiement/i, /prod/i, /production/i, /livraison/i, /csv/i, /excel/i, /import/i, /clean/i],
            targetContains: ['jira', 'import', 'csv', 'guide']
          },
          {
            terms: [/rapport/i, /mensuel/i, /report/i, /summary/i, /ia/i, /gemini/i, /synthese/i],
            targetContains: ['ia', 'gemini', 'rapport', 'mensuel']
          },
          {
            terms: [/copil/i, /comite/i, /pilote/i, /convocation/i, /ordre du jour/i, /reunion/i],
            targetContains: ['copil', 'template', 'reunion']
          }
        ];

        rules.forEach(rule => {
          // Vérifie si le SOP correspond à ce groupe
          const isTargetSop = rule.targetContains.some(tc => 
            normalizedSopTitle.includes(tc) || 
            normalizedSopSummary.includes(tc) || 
            (sop.tags && sop.tags.some(t => normalize(t).includes(tc)))
          );

          if (isTargetSop) {
            rule.terms.forEach(regex => {
              if (regex.test(normalizedText)) {
                score += 10;
              }
            });
          }
        });

        // 4. Recouvrement mot-à-mot (longueur minimum de 4 caractères pour éviter les pronoms)
        const queryWords = normalizedText.split(/[\s,.'"-]+/).filter(w => w.length >= 4);
        queryWords.forEach(word => {
          if (normalizedSopTitle.includes(word)) {
            score += 4;
          }
          if (normalizedSopSummary.includes(word)) {
            score += 2;
          }
        });

        return { sop, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.sop);
  }, [titre, description, localSops, activeSpaceId, initialTask?.spaceId]);

  // SOP recommandée active (la plus pertinente)
  const recommendedSop = matchingSops[0] || null;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) {
      setError('Le titre de la tâche est obligatoire.');
      return;
    }

    if (statut === 'Blocked' && initialTask?.statut !== 'Blocked' && !blockedReason.trim()) {
      setError('Un motif explicatif est obligatoire pour définir le statut sur En attente.');
      return;
    }

    const selectedPhase = phases.find((p) => p.id === phaseId);
    const finalJiraKey = selectedPhase?.jiraEpicKey || jiraKey;

    onSave({
      titre: titre.trim(),
      description: description.trim(),
      projetId: projetId || null,
      phaseId: phaseId || null,
      jiraKey: finalJiraKey.trim() || undefined,
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

  const projectPhases = projetId ? (phases || []).filter((p) => p.projectId === projetId) : [];
  const selectedPhase = phases.find((p) => p.id === phaseId);
  const isTaskDateExceeded = !!(
    selectedPhase &&
    dateEcheance &&
    (dateEcheance < selectedPhase.startDate || dateEcheance > selectedPhase.endDate)
  );

  return (
    <div
      id="task-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 p-4 backdrop-blur-xs transition-opacity duration-300 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <div
        id="task-detail-container"
        className={`w-full relative ${
          initialTask ? 'max-w-4xl' : 'max-w-lg'
        } rounded-2xl bg-white p-6 sm:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] transition-all duration-300 animate-in fade-in zoom-in-95`}
      >
        
        {/* EN-TÊTE MODAL */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EFEB]">
          <h3 id="task-detail-title" className="text-base font-normal tracking-wide text-[#1A1D1A]">
            {initialTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h3>
          <button
            id="task-detail-close-button"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ALERTE ERREUR */}
        {error && (
          <div
            id="task-detail-error-alert"
            className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50/70 border border-rose-200/60 p-3 text-xs text-rose-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* DEUX COLONNES OU FORMULAIRE UNIQUE */}
        <div className={`mt-5 ${initialTask ? 'grid grid-cols-1 md:grid-cols-12 gap-6' : 'space-y-4'}`}>
          
          {/* COLONNE GAUCHE : Formulaire */}
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
                  onChange={(e) => {
                    setProjetId(e.target.value ? e.target.value : null);
                    setPhaseId(null);
                  }}
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
                  <option value="Blocked">En attente (Blocked)</option>
                  <option value="Done">Terminé (Done)</option>
                  <option value="Backlog">Backlog</option>
                </select>
              </div>
            </div>

            {/* PHASE DE PROJET ASSOCIÉE */}
            <div className="rounded-xl border border-[#F0EFEB] bg-[#F9F8F6]/40 p-3.5 space-y-2.5">
              <label htmlFor="task-phase-select" className="block text-xs font-semibold text-[#5B7083]">
                Phase de projet associée (dans la roadmap)
              </label>
              <select
                id="task-phase-select"
                value={phaseId || ''}
                onChange={(e) => setPhaseId(e.target.value || null)}
                className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden transition-colors"
                disabled={!projetId}
              >
                <option value="">{projetId ? '-- Sélectionner une Phase --' : '(Sélectionnez d’abord un projet)'}</option>
                {projectPhases.map((ph) => (
                  <option key={ph.id} value={ph.id}>
                    {ph.name} ({ph.startDate} au {ph.endDate})
                  </option>
                ))}
              </select>

              {selectedPhase && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap gap-2 items-center text-[10px] text-[#737873]">
                    <span className="font-medium text-[#737873]">Période de la phase :</span>
                    <span className="bg-[#FAF9F6] px-1.5 py-0.5 rounded text-[#1A1D1A] font-mono border border-[#F0EFEB]">
                      {selectedPhase.startDate} au {selectedPhase.endDate}
                    </span>
                    {selectedPhase.jiraEpicKey && (
                      <span className="flex items-center gap-1 text-[#5B7083] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[9px]">
                        ⚡ Epic JIRA : {selectedPhase.jiraEpicKey}
                      </span>
                    )}
                  </div>

                  {isTaskDateExceeded && (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-700 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] leading-normal">
                        <strong>Attention :</strong> La date d’échéance de la tâche ({dateEcheance || 'non définie'}) est en dehors de la période de la phase ({selectedPhase.startDate} au {selectedPhase.endDate}).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RAISON DE BLOCAGE */}
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

            {/* DATE ÉCHÉANCE */}
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

            {/* RÉVEIL BACKLOG */}
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

            {/* --- SECTION JAPANDI : RECOMMANDATION SOP INTELLIGENTE LOCALE --- */}
            {recommendedSop && (
              <div className="rounded-2xl border border-[#E0DCD3] bg-[#FAF9F6] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#6B8E78]/10 p-2 text-[#5D7C68]">
                    <Lightbulb className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-[#6B8E78] uppercase tracking-wider">
                        💡 Procédure recommandée
                      </span>
                      <span className="text-[9px] text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded font-mono uppercase">
                        {CATEGORY_LABELS[recommendedSop.category] || 'Wiki'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#1A1D1A] mt-1 truncate">
                      {recommendedSop.title}
                    </h4>
                    {recommendedSop.summary && (
                      <p className="text-[10px] text-[#737873] font-light mt-0.5 line-clamp-1 leading-normal">
                        {recommendedSop.summary}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewSop(recommendedSop)}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white border border-[#D3CFC8] hover:border-[#6B8E78] px-3 py-1.5 text-[11px] font-bold text-[#5D7C68] hover:bg-[#FAF9F6] transition-all shadow-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Consulter
                  </button>
                </div>
              </div>
            )}

            {/* BOUTONS ACTIONS */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-[#F0EFEB]">
              <button
                id="task-detail-cancel-btn"
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#F0EFEB] bg-white px-4 py-2 text-xs font-medium text-[#737873] hover:text-[#1A1D1A] hover:bg-[#F0EFEB] transition-colors"
              >
                Annuler
              </button>
              <button
                id="task-detail-submit-btn"
                type="submit"
                className="rounded-xl bg-[#6B8E78] px-5 py-2 text-xs font-medium text-white hover:bg-[#5d7c68] active:scale-[0.99] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300"
              >
                {initialTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
              </button>
            </div>
          </form>

          {/* COLONNE DROITE : Commentaires & Historique (uniquement en édition) */}
          {initialTask && (
            <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-[#F0EFEB] pt-4 md:pt-0 md:pl-6 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0EFEB] shrink-0">
                <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded-lg border border-[#F0EFEB]">
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('comments')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                      activeRightTab === 'comments'
                        ? 'bg-white text-[#6B8E78] shadow-xs'
                        : 'text-[#737873] hover:text-[#1A1D1A]'
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Commentaires ({(initialTask.commentaires || []).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRightTab('timeline')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                      activeRightTab === 'timeline'
                        ? 'bg-white text-[#6B8E78] shadow-xs'
                        : 'text-[#737873] hover:text-[#1A1D1A]'
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    <span>Timeline ({(activityLogs || []).filter(l => l.taskId === initialTask.id).length})</span>
                  </button>
                </div>
              </div>

              {activeRightTab === 'comments' && (
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
              )}

              {activeRightTab === 'timeline' && (
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 custom-scrollbar min-h-[300px]">
                  {(!activityLogs || activityLogs.filter(l => l.taskId === initialTask.id).length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <Clock className="h-8 w-8 text-[#D3CFC8] mb-1.5 stroke-[1.5]" />
                      <p className="text-[11px] font-medium text-[#737873]">Aucun historique d'activité.</p>
                      <p className="text-[10px] text-[#737873]/60 font-light mt-0.5">Les changements de statut et les éditions de cette tâche apparaîtront ici.</p>
                    </div>
                  ) : (
                    activityLogs
                      .filter((l) => l.taskId === initialTask.id)
                      .map((log) => (
                        <div
                          key={log.id}
                          className="rounded-xl border border-[#F0EFEB] bg-[#F9F8F6] p-3 text-xs leading-relaxed transition-all hover:bg-slate-50 relative pl-7"
                        >
                          <span className="absolute left-2.5 top-4 w-2 h-2 rounded-full bg-[#6B8E78]" />
                          <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-[#F0EFEB]/30">
                            <span className="font-semibold text-[9px] uppercase font-mono tracking-wider text-[#6B8E78]">
                              {log.type}
                            </span>
                            <span className="text-[9px] text-[#737873] font-light">
                              {formatCommentDate(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#1A1D1A] font-light">
                            {log.details}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              )}

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

        {/* --- DRAWER D'APERÇU SÉLECTIONNÉ (VOLET LATÉRAL DE SOP) --- */}
        {previewSop && (
          <div className="absolute inset-0 z-50 flex justify-end overflow-hidden rounded-2xl">
            {/* Backdrop sombre et flouté */}
            <div 
              role="presentation"
              onClick={() => setPreviewSop(null)}
              className="absolute inset-0 bg-[#1A1D1A]/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            />
            
            {/* Contenu du Drawer */}
            <div className="relative w-full max-w-md bg-white border-l border-[#FAF9F6] shadow-2xl h-full flex flex-col z-10 transition-transform duration-300 animate-in slide-in-from-right">
              {/* Header du Drawer */}
              <div className="p-5 border-b border-[#F0EFEB] bg-[#FAF9F6] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#6B8E78]" />
                    <span className="text-[10px] font-bold text-[#6B8E78] uppercase tracking-wider font-mono">
                      {CATEGORY_LABELS[previewSop.category] || 'Wiki SOP'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#1A1D1A] truncate max-w-[280px]">
                    {previewSop.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSop(null)}
                  className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Contenu de la fiche SOP */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                {previewSop.summary && (
                  <div className="rounded-xl bg-[#FAF9F6] border border-[#F0EFEB] p-3.5 text-xs text-[#737873] font-light leading-relaxed">
                    <strong>Résumé :</strong> {previewSop.summary}
                  </div>
                )}

                {/* Rendu HTML propre de la SOP avec le style d'édition du Wiki */}
                <div 
                  className="prose prose-slate max-w-none text-xs text-[#1A1D1A] space-y-4 leading-relaxed font-light font-sans"
                  dangerouslySetInnerHTML={{ __html: previewSop.contentHtml }}
                />

                {/* Liste des tags de la SOP */}
                {previewSop.tags && previewSop.tags.length > 0 && (
                  <div className="pt-4 border-t border-[#F0EFEB] flex flex-wrap gap-1.5">
                    {previewSop.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-medium text-[#737873] bg-[#FAF9F6] border border-[#F0EFEB] px-2 py-0.5 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer du Drawer */}
              <div className="p-4 border-t border-[#F0EFEB] bg-[#FAF9F6] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreviewSop(null)}
                  className="rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5d7c68] transition-colors shadow-xs"
                >
                  Fermer l'aperçu
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
