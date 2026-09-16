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
} from '../types/recurringTask';
import { Projet, Tache } from '../types';
import {
  formatRecurrenceLabel,
  calculateNextRunDate,
  getNextUpcomingRunDate,
  getRecommendedFirstRunDate,
} from '../services/recurringTaskService';
import { getTodayDateString } from '../utils/storage';

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
      dayOfWeek: recurrenceType === 'weekly' ? dayOfWeek : undefined,
      dayOfMonth: recurrenceType === 'monthly' ? dayOfMonth : undefined,
      nextRunDate: nextRunDate || todayStr,
      isActive,
      createdAt: editingTemplateId
        ? templates.find((t) => t.id === editingTemplateId)?.createdAt
        : new Date().toISOString(),
      lastGeneratedDate: editingTemplateId
        ? templates.find((t) => t.id === editingTemplateId)?.lastGeneratedDate
        : null,
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
      return { text: 'Demain', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    }
    if (diffDays < 0) {
      return { text: `Échue (${Math.abs(diffDays)} j)`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    return { text: `Dans ${diffDays} jours`, color: 'text-slate-700 bg-slate-100 border-slate-200' };
  };

  return (
    <div
      id="recurring-tasks-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="recurring-tasks-modal-content"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 overflow-hidden"
      >
        {/* En-tête Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Tâches planifiées & Récurrences</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {activeSpaceName}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Génération automatique de tâches opérationnelles (inspiration Microsoft Outlook)
              </p>
            </div>
          </div>

          <button
            id="recurring-modal-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
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
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                : 'bg-indigo-50 text-indigo-800 border-b border-indigo-100'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Barre d'onglets de navigation interne */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-2 bg-white">
          <div className="flex items-center gap-1.5">
            <button
              id="recurring-tab-list"
              type="button"
              onClick={() => {
                setActiveTab('list');
                setEditingTemplateId(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'list'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Planifications actives</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeTab === 'list' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {spaceTemplates.length}
              </span>
            </button>

            <button
              id="recurring-tab-create"
              type="button"
              onClick={handleOpenCreateForm}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'form' && !editingTemplateId
                  ? 'bg-indigo-600 text-white'
                  : activeTab === 'form' && editingTemplateId
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
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
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
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
                  className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
                    <Repeat className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Aucune tâche récurrente pour cet espace
                  </h4>
                  <p className="mt-1 max-w-md mx-auto text-xs text-slate-500">
                    Automatisez la création de vos tâches régulières (bilan hebdomadaire, sauvegarde mensuelle, revue quotidienne des mails, etc.).
                  </p>
                  <button
                    id="recurring-empty-create-btn"
                    type="button"
                    onClick={handleOpenCreateForm}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs transition-colors"
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
                        className={`rounded-xl border p-4 transition-all bg-white ${
                          template.isActive
                            ? 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                            : 'border-slate-200 bg-slate-50/70 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Titre & métadonnées */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 break-words">
                                {template.title}
                              </h4>

                              {/* Statut actif / en pause */}
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                  template.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    template.isActive ? 'bg-emerald-500' : 'bg-slate-400'
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
                              <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                {template.description}
                              </p>
                            )}

                            {/* Détails de planification */}
                            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                              {/* Fréquence Outlook */}
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50/70 text-indigo-700 px-2 py-0.5 text-[11px] font-medium border border-indigo-100">
                                <Repeat className="h-3 w-3" />
                                <span>
                                  {formatRecurrenceLabel(
                                    template.recurrenceType,
                                    template.dayOfWeek,
                                    template.dayOfMonth
                                  )}
                                </span>
                              </span>

                              {/* Prochaine exécution */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-400">Prochaine :</span>
                                <span className="font-semibold text-slate-700">
                                  {template.nextRunDate}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-bold border ${relativeDate.color}`}
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
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-200"
                              title="Générer immédiatement une tâche opérationnelle pour tester ou anticiper"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                              <span className="hidden sm:inline">Générer</span>
                            </button>

                            {/* Activer / Mettre en pause */}
                            <button
                              id={`toggle-active-btn-${template.id}`}
                              type="button"
                              onClick={() => handleToggleActive(template)}
                              className={`rounded-lg p-1.5 transition-colors ${
                                template.isActive
                                  ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                                  : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
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
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="Modifier la planification"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {/* Supprimer */}
                            <button
                              id={`delete-template-btn-${template.id}`}
                              type="button"
                              onClick={() => handleDelete(template)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Titre de la tâche à générer <span className="text-rose-500">*</span>
                </label>
                <input
                  id="template-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Réunion d'alignement hebdomadaire"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="template-desc-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Description / Consignes récurrentes (optionnel)
                </label>
                <textarea
                  id="template-desc-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails, ordre du jour ou points de contrôle à vérifier..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden resize-none"
                />
              </div>

              {/* Projet */}
              <div>
                <label
                  htmlFor="template-project-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Projet rattaché (optionnel)
                </label>
                <select
                  id="template-project-select"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="">Aucun projet (Tâche générale)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Fréquence type Outlook */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Périodicité de récurrence (Type Outlook)
                  </span>
                </div>

                {/* Sélecteur type de récurrence */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RECURRENCE_OPTIONS.map((opt) => {
                    const isSelected = recurrenceType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                          setRecurrenceType(opt.type);
                          if (!editingTemplateId) {
                            setNextRunDate(getRecommendedFirstRunDate(opt.type, { dayOfWeek, dayOfMonth }));
                          }
                        }}
                        className={`text-left rounded-lg border p-3 transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                          {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Options complémentaires si Hebdomadaire */}
                {recurrenceType === 'weekly' && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Quel jour de la semaine répéter ?
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map((d) => {
                        const isDaySelected = dayOfWeek === d.value;
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => {
                              setDayOfWeek(d.value);
                              if (!editingTemplateId) {
                                setNextRunDate(getRecommendedFirstRunDate('weekly', { dayOfWeek: d.value }));
                              }
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
                              isDaySelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Options complémentaires si Mensuel */}
                {recurrenceType === 'monthly' && (
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                    <label
                      htmlFor="template-day-of-month"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Le jour du mois :
                    </label>
                    <select
                      id="template-day-of-month"
                      value={dayOfMonth}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDayOfMonth(val);
                        if (!editingTemplateId) {
                          setNextRunDate(getRecommendedFirstRunDate('monthly', { dayOfMonth: val }));
                        }
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? '1er du mois' : `Le ${n}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Date de première exécution (Outlook style) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Début de la récurrence (Première exécution)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Option Prochain cycle / Demain */}
                  <button
                    type="button"
                    onClick={() =>
                      setNextRunDate(getRecommendedFirstRunDate(recurrenceType, { dayOfWeek, dayOfMonth }))
                    }
                    className={`text-left rounded-lg border p-2.5 transition-all ${
                      nextRunDate > todayStr
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-slate-900">
                        {recurrenceType === 'workdays' ? 'Prochain jour ouvré' : 'Demain'}
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded">
                        Recommandé
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      0 tâche aujourd'hui • 1ère tâche dès {recurrenceType === 'workdays' ? 'le prochain jour ouvré' : 'demain'}
                    </p>
                  </button>

                  {/* Option Dès aujourd'hui */}
                  <button
                    type="button"
                    onClick={() => setNextRunDate(todayStr)}
                    className={`text-left rounded-lg border p-2.5 transition-all ${
                      nextRunDate === todayStr
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-slate-900">Dès aujourd'hui</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Génère 1 tâche immédiatement pour aujourd'hui
                    </p>
                  </button>

                  {/* Date personnalisée */}
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col justify-center">
                    <label htmlFor="template-nextrun-input" className="text-[11px] font-semibold text-slate-700 mb-1">
                      Date précise :
                    </label>
                    <input
                      id="template-nextrun-input"
                      type="date"
                      required
                      value={nextRunDate}
                      onChange={(e) => setNextRunDate(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Bannière d'impact en temps réel */}
                <div
                  className={`rounded-lg p-3 text-xs flex items-start gap-2.5 border ${
                    nextRunDate > todayStr
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : nextRunDate === todayStr
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {nextRunDate > todayStr ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : nextRunDate === todayStr ? (
                    <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {nextRunDate > todayStr
                        ? `Première exécution : ${formatDisplayDateFr(nextRunDate)}`
                        : nextRunDate === todayStr
                        ? `Première exécution : Aujourd'hui (${formatDisplayDateFr(todayStr)})`
                        : `Date passée : ${formatDisplayDateFr(nextRunDate)}`}
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {nextRunDate > todayStr
                        ? `✅ Aucune tâche ne sera créée aujourd'hui (0 maintenant). La première tâche sera créée automatiquement le ${formatDisplayDateFr(
                            nextRunDate
                          )} à l'ouverture de l'application.`
                        : nextRunDate === todayStr
                        ? `⚡ 1 tâche unique pour aujourd'hui sera créée dans votre espace dès l'enregistrement.`
                        : `La tâche sera programmée pour le prochain cycle disponible.`}
                    </p>
                  </div>
                </div>

                {/* Statut actif */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      État de la récurrence
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Activer immédiatement la planification automatique
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-700 font-medium">Planification active</span>
                  </label>
                </div>
              </div>

              {/* Boutons d'action formulaire */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingTemplateId(null);
                  }}
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  id="recurring-template-submit-btn"
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
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
