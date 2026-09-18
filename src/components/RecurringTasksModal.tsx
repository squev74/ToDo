import React, { useState, useMemo } from 'react';
import {
  X,
  Repeat,
  Calendar,
  Clock,
  Plus,
  Edit3,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Folder,
  CalendarClock,
  Check,
  Zap,
} from 'lucide-react';
import {
  RecurringTaskTemplate,
  RecurrenceType,
  RECURRENCE_OPTIONS,
  DAYS_OF_WEEK,
  RecurrenceConfig,
  RecurrenceFrequency,
} from '../types/recurringTask';
import { Projet, Tache } from '../types';
import {
  formatRecurrenceLabel,
  calculateNextRunDate,
  getNextUpcomingRunDate,
  getRecommendedFirstRunDate,
} from '../services/recurringTaskService';
import { getTodayDateString } from '../utils/storage';
import { RecurrenceSelector } from './RecurrenceSelector';

interface RecurringTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: RecurringTaskTemplate[];
  activeSpaceId: string;
  activeSpaceName: string;
  projects: Projet[];
  userId?: string;
  onSaveTemplate: (template: RecurringTaskTemplate) => Promise<void> | void;
  onDeleteTemplate: (templateId: string) => Promise<void> | void;
  onManualTrigger: (template: RecurringTaskTemplate) => Promise<void> | void;
}

export const RecurringTasksModal: React.FC<RecurringTasksModalProps> = ({
  isOpen,
  onClose,
  templates,
  activeSpaceId,
  activeSpaceName,
  projects,
  userId,
  onSaveTemplate,
  onDeleteTemplate,
  onManualTrigger,
}) => {
  const todayStr = getTodayDateString();

  // Mode vue : 'list' ou 'create' ou 'edit'
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('workdays');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Lundi par défaut
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [nextRunDate, setNextRunDate] = useState<string>(todayStr);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Nouveaux états de récurrence avancée
  const [interval, setInterval] = useState<number>(1);
  const [quarterlyOption, setQuarterlyOption] = useState<'same_day' | 'specific_day'>('same_day');
  const [specificDayIndex, setSpecificDayIndex] = useState<'first' | 'second' | 'third' | 'last'>('first');
  const [specificDayWeek, setSpecificDayWeek] = useState<number>(1);

  // Notifications locales d'action
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'info';
    text: string;
  } | null>(null);

  // Filtre des templates pour l'espace actif
  const spaceTemplates = useMemo(() => {
    return templates
      .filter((t) => t.spaceId === activeSpaceId)
      .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));
  }, [templates, activeSpaceId]);

  if (!isOpen) return null;

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const formatDisplayDateFr = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleOpenCreateForm = () => {
    setEditingTemplateId(null);
    setTitle('');
    setDescription('');
    setProjectId('');
    setRecurrenceType('workdays');
    setDayOfWeek(1);
    setDayOfMonth(1);
    setInterval(1);
    setQuarterlyOption('same_day');
    setSpecificDayIndex('first');
    setSpecificDayWeek(1);
    // Par défaut, débuter au prochain cycle (demain pour jours ouvrés) -> 0 tâche aujourd'hui
    setNextRunDate(getRecommendedFirstRunDate('workdays'));
    setIsActive(true);
    setActiveTab('form');
  };

  const handleOpenEditForm = (template: RecurringTaskTemplate) => {
    setEditingTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.description || '');
    setProjectId(template.projectId || '');
    setRecurrenceType(template.recurrenceType);
    setDayOfWeek(template.dayOfWeek !== undefined ? template.dayOfWeek : 1);
    setDayOfMonth(template.dayOfMonth !== undefined ? template.dayOfMonth : 1);
    setInterval(template.interval !== undefined ? template.interval : 1);
    setQuarterlyOption(template.quarterlyOption || 'same_day');
    setSpecificDayIndex(template.specificDayIndex || 'first');
    setSpecificDayWeek(template.specificDayWeek !== undefined ? template.specificDayWeek : 1);
    setNextRunDate(template.nextRunDate);
    setIsActive(template.isActive);
    setActiveTab('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const templateToSave: RecurringTaskTemplate = {
      id: editingTemplateId || `template-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      spaceId: activeSpaceId,
      projectId: projectId || null,
      title: title.trim(),
      description: description.trim(),
      recurrenceType,
      dayOfWeek: recurrenceType === 'weekly' ? dayOfWeek : (recurrenceType === 'quarterly' && quarterlyOption === 'specific_day' ? specificDayWeek : undefined),
      dayOfMonth: (recurrenceType === 'monthly' || recurrenceType === 'quarterly' || recurrenceType === 'yearly') ? dayOfMonth : undefined,
      nextRunDate: nextRunDate || todayStr,
      isActive,
      createdAt: editingTemplateId
        ? templates.find((t) => t.id === editingTemplateId)?.createdAt
        : new Date().toISOString(),
      lastGeneratedDate: editingTemplateId
        ? templates.find((t) => t.id === editingTemplateId)?.lastGeneratedDate
        : null,
      interval: (recurrenceType === 'quarterly' || recurrenceType === 'yearly' || recurrenceType === 'daily' || recurrenceType === 'weekly' || recurrenceType === 'monthly') ? interval : 1,
      quarterlyOption: recurrenceType === 'quarterly' ? quarterlyOption : undefined,
      specificDayIndex: (recurrenceType === 'quarterly' && quarterlyOption === 'specific_day') ? specificDayIndex : undefined,
      specificDayWeek: (recurrenceType === 'quarterly' && quarterlyOption === 'specific_day') ? specificDayWeek : undefined,
    };

    await onSaveTemplate(templateToSave);
    showNotification(
      editingTemplateId
        ? 'Modèle de tâche récurrente mis à jour avec succès.'
        : 'Nouvelle planification récurrente enregistrée.'
    );
    setActiveTab('list');
    setEditingTemplateId(null);
  };

  const handleToggleActive = async (template: RecurringTaskTemplate) => {
    const updated = { ...template, isActive: !template.isActive };
    await onSaveTemplate(updated);
    showNotification(
      updated.isActive
        ? `Planification "${template.title}" réactivée.`
        : `Planification "${template.title}" mise en pause.`,
      'info'
    );
  };

  const handleDelete = async (template: RecurringTaskTemplate) => {
    if (window.confirm(`Confirmer la suppression de la tâche récurrente "${template.title}" ?`)) {
      await onDeleteTemplate(template.id);
      showNotification(`Planification "${template.title}" supprimée.`);
    }
  };

  const handleTriggerNow = async (template: RecurringTaskTemplate) => {
    await onManualTrigger(template);
    showNotification(`Occurrence immédiate générée avec succès pour "${template.title}".`);
  };

  // Helper pour afficher le décompte relatif
  const getRelativeDateLabel = (dateStr: string) => {
    if (dateStr === todayStr) {
      return { text: "Aujourd'hui", color: 'text-amber-700 bg-amber-50 border-amber-200' };
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d).getTime();
    const currentDate = new Date(ty, tm - 1, td).getTime();
    const diffDays = Math.round((targetDate - currentDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return { text: 'Demain', color: 'text-[#5B7083] bg-[#5B7083]/10 border-[#5B7083]/20' };
    }
    if (diffDays < 0) {
      return { text: `Échue (${Math.abs(diffDays)} j)`, color: 'text-[#966847] bg-[#C89B7B]/10 border-[#C89B7B]/20' };
    }
    return { text: `Dans ${diffDays} jours`, color: 'text-[#737873] bg-[#F9F8F6] border-[#F0EFEB]' };
  };

  return (
    <div
      id="recurring-tasks-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="recurring-tasks-modal-content"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] overflow-hidden"
      >
        {/* En-tête Modal */}
        <div className="flex items-center justify-between border-b border-[#F0EFEB] px-6 py-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6B8E78]/10 text-[#6B8E78]">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-normal tracking-wide text-[#1A1D1A] flex items-center gap-2">
                <span>Tâches planifiées & Récurrences</span>
                <span className="rounded-lg bg-[#6B8E78]/10 px-2 py-0.5 text-xs font-medium text-[#6B8E78] border border-[#6B8E78]/20">
                  {activeSpaceName}
                </span>
              </h3>
              <p className="text-xs text-[#737873] font-light">
                Génération automatique selon votre rythme de travail
              </p>
            </div>
          </div>

          <button
            id="recurring-modal-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bannière de notification contextuelle */}
        {feedbackMessage && (
          <div
            id="recurring-feedback-banner"
            className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-[#6B8E78]/10 text-[#4e634a] border-b border-[#6B8E78]/20'
                : 'bg-[#5B7083]/10 text-[#5B7083] border-b border-[#5B7083]/20'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6B8E78]" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Barre d'onglets de navigation interne */}
        <div className="flex items-center justify-between border-b border-[#F0EFEB] px-6 py-2.5 bg-[#F9F8F6]/50">
          <div className="flex items-center gap-1.5">
            <button
              id="recurring-tab-list"
              type="button"
              onClick={() => {
                setActiveTab('list');
                setEditingTemplateId(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-white text-[#1A1D1A] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#F0EFEB]'
                  : 'text-[#737873] hover:text-[#1A1D1A]'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Planifications actives</span>
              <span
                className={`rounded-lg px-1.5 py-0.2 text-[10px] font-medium ${
                  activeTab === 'list' ? 'bg-[#F0EFEB] text-[#1A1D1A]' : 'bg-[#F0EFEB]/60 text-[#737873]'
                }`}
              >
                {spaceTemplates.length}
              </span>
            </button>

            <button
              id="recurring-tab-create"
              type="button"
              onClick={handleOpenCreateForm}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'form'
                  ? 'bg-white text-[#1A1D1A] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#F0EFEB]'
                  : 'text-[#737873] hover:text-[#1A1D1A]'
              }`}
            >
              {editingTemplateId ? (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Modifier la règle</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nouvelle récurrence</span>
                </>
              )}
            </button>
          </div>

          {activeTab === 'list' && (
            <button
              id="recurring-add-btn-shortcut"
              type="button"
              onClick={handleOpenCreateForm}
              className="inline-flex items-center gap-1 rounded-xl bg-[#6B8E78] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#5d7c68] transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter</span>
            </button>
          )}
        </div>

        {/* Corps du modal */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' ? (
            /* VUE LISTE DES PLANIFICATIONS */
            <div>
              {spaceTemplates.length === 0 ? (
                <div
                  id="recurring-empty-state"
                  className="rounded-2xl border border-dashed border-[#F0EFEB] p-10 text-center bg-white"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9F8F6] text-[#6B8E78] border border-[#F0EFEB] mb-3">
                    <Repeat className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-normal text-[#1A1D1A]">
                    Aucune tâche récurrente pour cet espace
                  </h4>
                  <p className="mt-1 max-w-md mx-auto text-xs text-[#737873] font-light">
                    Automatisez la création de vos tâches régulières (bilan hebdomadaire, sauvegarde, revue des priorités).
                  </p>
                  <button
                    id="recurring-empty-create-btn"
                    type="button"
                    onClick={handleOpenCreateForm}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#5d7c68] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Créer une première récurrence</span>
                  </button>
                </div>
              ) : (
                <div id="recurring-templates-list" className="space-y-3">
                  {spaceTemplates.map((template) => {
                    const project = template.projectId
                      ? projects.find((p) => p.id === template.projectId)
                      : undefined;
                    const relativeDate = getRelativeDateLabel(template.nextRunDate);

                    return (
                      <div
                        key={template.id}
                        id={`recurring-template-card-${template.id}`}
                        className={`rounded-2xl border p-4.5 transition-all bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${
                          template.isActive
                            ? 'border-[#F0EFEB] hover:bg-[#F9F8F6]/40'
                            : 'border-[#F0EFEB] bg-[#F9F8F6]/60 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Titre & métadonnées */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-medium text-[#1A1D1A] break-words">
                                {template.title}
                              </h4>

                              {/* Statut actif / en pause */}
                              <span
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium border ${
                                  template.isActive
                                    ? 'bg-[#6B8E78]/10 text-[#4e634a] border-[#6B8E78]/20'
                                    : 'bg-[#F0EFEB] text-[#737873] border-[#F0EFEB]'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    template.isActive ? 'bg-[#6B8E78]' : 'bg-[#737873]'
                                  }`}
                                />
                                {template.isActive ? 'Active' : 'En pause'}
                              </span>

                              {/* Projet associé */}
                              {project && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border"
                                  style={{
                                    backgroundColor: `${project.couleur}15`,
                                    color: project.couleur,
                                    borderColor: `${project.couleur}30`,
                                  }}
                                >
                                  <Folder className="h-3 w-3" />
                                  <span>{project.nom}</span>
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {template.description && (
                              <p className="mt-1 text-xs text-[#737873] line-clamp-2 font-light">
                                {template.description}
                              </p>
                            )}

                            {/* Détails de planification */}
                            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-[#737873]">
                              {/* Fréquence */}
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#5B7083]/10 text-[#5B7083] px-2 py-0.5 text-[11px] font-medium border border-[#5B7083]/20">
                                <Repeat className="h-3 w-3" />
                                <span>
                                  {formatRecurrenceLabel(
                                    template.recurrenceType,
                                    template.dayOfWeek,
                                    template.dayOfMonth,
                                    {
                                      interval: template.interval,
                                      quarterlyOption: template.quarterlyOption,
                                      specificDayIndex: template.specificDayIndex,
                                      specificDayWeek: template.specificDayWeek,
                                    }
                                  )}
                                </span>
                              </span>

                              {/* Prochaine exécution */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-[#737873]">Prochaine :</span>
                                <span className="font-medium text-[#1A1D1A]">
                                  {template.nextRunDate}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-medium border ${relativeDate.color}`}
                                >
                                  {relativeDate.text}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Boutons d'action */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                            {/* Déclencher maintenant */}
                            <button
                              id={`trigger-template-btn-${template.id}`}
                              type="button"
                              onClick={() => handleTriggerNow(template)}
                              className="inline-flex items-center gap-1 rounded-xl bg-[#6B8E78]/10 px-2.5 py-1.5 text-xs font-medium text-[#4e634a] hover:bg-[#6B8E78] hover:text-white transition-all border border-[#6B8E78]/20"
                              title="Générer immédiatement une tâche opérationnelle"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                              <span className="hidden sm:inline">Générer</span>
                            </button>

                            {/* Activer / Mettre en pause */}
                            <button
                              id={`toggle-active-btn-${template.id}`}
                              type="button"
                              onClick={() => handleToggleActive(template)}
                              className={`rounded-xl p-1.5 transition-colors ${
                                template.isActive
                                  ? 'text-[#737873] hover:bg-[#C89B7B]/10 hover:text-[#966847]'
                                  : 'text-[#737873] hover:bg-[#6B8E78]/10 hover:text-[#6B8E78]'
                              }`}
                              title={template.isActive ? 'Mettre en pause' : 'Réactiver'}
                            >
                              <Zap className="h-4 w-4" />
                            </button>

                            {/* Modifier */}
                            <button
                              id={`edit-template-btn-${template.id}`}
                              type="button"
                              onClick={() => handleOpenEditForm(template)}
                              className="rounded-xl p-1.5 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                              title="Modifier la planification"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {/* Supprimer */}
                            <button
                              id={`delete-template-btn-${template.id}`}
                              type="button"
                              onClick={() => handleDelete(template)}
                              className="rounded-xl p-1.5 text-[#737873] hover:bg-[#C89B7B]/10 hover:text-[#966847] transition-colors"
                              title="Supprimer la planification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* VUE FORMULAIRE D'AJOUT / ÉDITION */
            <form onSubmit={handleSubmit} id="recurring-template-form" className="space-y-4">
              {/* Titre */}
              <div>
                <label
                  htmlFor="template-title-input"
                  className="block text-xs font-medium text-[#737873] mb-1"
                >
                  Titre de la tâche à générer <span className="text-[#C89B7B]">*</span>
                </label>
                <input
                  id="template-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Réunion d'alignement hebdomadaire"
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3.5 py-2 text-xs text-[#1A1D1A] placeholder:text-[#737873]/50 focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="template-desc-input"
                  className="block text-xs font-medium text-[#737873] mb-1"
                >
                  Description / Consignes récurrentes (optionnel)
                </label>
                <textarea
                  id="template-desc-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails, ordre du jour ou points de contrôle à vérifier..."
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3.5 py-2 text-xs text-[#1A1D1A] placeholder:text-[#737873]/50 focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors resize-none"
                />
              </div>

              {/* Projet */}
              <div>
                <label
                  htmlFor="template-project-select"
                  className="block text-xs font-medium text-[#737873] mb-1"
                >
                  Projet rattaché (optionnel)
                </label>
                <select
                  id="template-project-select"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-xl border border-[#F0EFEB] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-2 focus:ring-[#6B8E78]/10 transition-colors"
                >
                  <option value="">Aucun projet (Tâche générale)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Fréquence */}
              <RecurrenceSelector
                config={{
                  frequency: recurrenceType,
                  interval,
                  quarterlyOption,
                  dayOfWeek,
                  dayOfMonth,
                  specificDayIndex,
                  specificDayWeek,
                }}
                onChange={(newConfig) => {
                  setRecurrenceType(newConfig.frequency);
                  setInterval(newConfig.interval);
                  if (newConfig.quarterlyOption !== undefined) setQuarterlyOption(newConfig.quarterlyOption);
                  if (newConfig.dayOfWeek !== undefined) setDayOfWeek(newConfig.dayOfWeek);
                  if (newConfig.dayOfMonth !== undefined) setDayOfMonth(newConfig.dayOfMonth);
                  if (newConfig.specificDayIndex !== undefined) setSpecificDayIndex(newConfig.specificDayIndex);
                  if (newConfig.specificDayWeek !== undefined) setSpecificDayWeek(newConfig.specificDayWeek);

                  if (!editingTemplateId) {
                    setNextRunDate(getRecommendedFirstRunDate(newConfig.frequency, {
                      dayOfWeek: newConfig.dayOfWeek !== undefined ? newConfig.dayOfWeek : dayOfWeek,
                      dayOfMonth: newConfig.dayOfMonth !== undefined ? newConfig.dayOfMonth : dayOfMonth,
                      interval: newConfig.interval,
                      quarterlyOption: newConfig.quarterlyOption || quarterlyOption,
                      specificDayIndex: newConfig.specificDayIndex || specificDayIndex,
                      specificDayWeek: newConfig.specificDayWeek !== undefined ? newConfig.specificDayWeek : specificDayWeek,
                    }));
                  }
                }}
              />

              {/* Date de première exécution */}
              <div className="rounded-2xl border border-[#F0EFEB] bg-[#F9F8F6]/50 p-4.5 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-[#6B8E78]" />
                  <span className="text-xs font-medium text-[#1A1D1A]">
                    Début de la récurrence
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Option Prochain cycle / Demain */}
                  <button
                    type="button"
                    onClick={() =>
                      setNextRunDate(getRecommendedFirstRunDate(recurrenceType, {
                        dayOfWeek,
                        dayOfMonth,
                        interval,
                        quarterlyOption,
                        specificDayIndex,
                        specificDayWeek,
                      }))
                    }
                    className={`text-left rounded-xl border p-2.5 transition-all ${
                      nextRunDate > todayStr
                        ? 'border-[#6B8E78] bg-white ring-1 ring-[#6B8E78]'
                        : 'border-[#F0EFEB] bg-white hover:border-[#E2DFD8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-[#1A1D1A]">
                        {recurrenceType === 'workdays' ? 'Prochain jour ouvré' : 'Demain'}
                      </span>
                      <span className="text-[10px] bg-[#6B8E78]/10 text-[#6B8E78] font-medium px-1.5 py-0.5 rounded-md">
                        Recommandé
                      </span>
                    </div>
                    <p className="text-[11px] text-[#737873] font-light">
                      0 tâche aujourd'hui • 1ère dès {recurrenceType === 'workdays' ? 'le prochain jour ouvré' : 'demain'}
                    </p>
                  </button>

                  {/* Option Dès aujourd'hui */}
                  <button
                    type="button"
                    onClick={() => setNextRunDate(todayStr)}
                    className={`text-left rounded-xl border p-2.5 transition-all ${
                      nextRunDate === todayStr
                        ? 'border-[#6B8E78] bg-white ring-1 ring-[#6B8E78]'
                        : 'border-[#F0EFEB] bg-white hover:border-[#E2DFD8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-[#1A1D1A]">Dès aujourd'hui</span>
                    </div>
                    <p className="text-[11px] text-[#737873] font-light">
                      Génère 1 tâche immédiatement pour aujourd'hui
                    </p>
                  </button>

                  {/* Date personnalisée */}
                  <div className="rounded-xl border border-[#F0EFEB] bg-white p-2.5 flex flex-col justify-center">
                    <label htmlFor="template-nextrun-input" className="text-[11px] font-medium text-[#737873] mb-1">
                      Date précise :
                    </label>
                    <input
                      id="template-nextrun-input"
                      type="date"
                      required
                      value={nextRunDate}
                      onChange={(e) => setNextRunDate(e.target.value)}
                      className="w-full rounded-lg border border-[#F0EFEB] px-2 py-1 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Bannière d'impact en temps réel */}
                <div
                  className={`rounded-xl p-3 text-xs flex items-start gap-2.5 border ${
                    nextRunDate > todayStr
                      ? 'bg-[#6B8E78]/10 border-[#6B8E78]/20 text-[#4e634a]'
                      : nextRunDate === todayStr
                      ? 'bg-[#5B7083]/10 border-[#5B7083]/20 text-[#5B7083]'
                      : 'bg-[#C89B7B]/10 border-[#C89B7B]/20 text-[#966847]'
                  }`}
                >
                  {nextRunDate > todayStr ? (
                    <CheckCircle2 className="h-4 w-4 text-[#6B8E78] shrink-0 mt-0.5" />
                  ) : nextRunDate === todayStr ? (
                    <Zap className="h-4 w-4 text-[#5B7083] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[#C89B7B] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">
                      {nextRunDate > todayStr
                        ? `Première exécution : ${formatDisplayDateFr(nextRunDate)}`
                        : nextRunDate === todayStr
                        ? `Première exécution : Aujourd'hui (${formatDisplayDateFr(todayStr)})`
                        : `Date passée : ${formatDisplayDateFr(nextRunDate)}`}
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5 font-light">
                      {nextRunDate > todayStr
                        ? `La première tâche sera créée automatiquement le ${formatDisplayDateFr(
                            nextRunDate
                          )} à l'ouverture.`
                        : nextRunDate === todayStr
                        ? `1 tâche pour aujourd'hui sera créée dans votre espace dès l'enregistrement.`
                        : `La tâche sera programmée pour le prochain cycle disponible.`}
                    </p>
                  </div>
                </div>

                {/* Statut actif */}
                <div className="pt-2 border-t border-[#F0EFEB] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-[#1A1D1A] block">
                      État de la récurrence
                    </span>
                    <span className="text-[11px] text-[#737873] font-light">
                      Activer la planification automatique
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-[#F0EFEB] text-[#6B8E78] focus:ring-[#6B8E78]"
                    />
                    <span className="text-xs text-[#1A1D1A] font-medium">Planification active</span>
                  </label>
                </div>
              </div>

              {/* Boutons d'action formulaire */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#F0EFEB]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingTemplateId(null);
                  }}
                  className="rounded-xl border border-[#F0EFEB] px-4 py-2 text-xs font-medium text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
                >
                  Annuler
                </button>
                <button
                  id="recurring-template-submit-btn"
                  type="submit"
                  className="rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-medium text-white hover:bg-[#5d7c68] transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                >
                  {editingTemplateId ? 'Enregistrer les modifications' : 'Créer la récurrence'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
