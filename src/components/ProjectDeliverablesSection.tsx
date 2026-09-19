import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  BarChart3, 
  Palette, 
  Link2, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Check, 
  X, 
  Edit2, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { ProjectDeliverable, Projet } from '../types';

interface ProjectDeliverablesSectionProps {
  project: Projet;
  onUpdateDeliverables: (deliverables: ProjectDeliverable[]) => void;
}

const DELIVERABLE_TYPES = [
  { id: 'planning', label: 'Planning', icon: Calendar },
  { id: 'doc', label: 'Documentation', icon: FileText },
  { id: 'report', label: 'Reporting', icon: BarChart3 },
  { id: 'design', label: 'Design & Mockups', icon: Palette },
  { id: 'other', label: 'Autre Lien', icon: Link2 },
] as const;

const STATUS_CONFIG = {
  planned: { label: 'À venir', textClass: 'text-slate-600', bgClass: 'bg-slate-100/70 border-slate-200' },
  in_progress: { label: 'En cours', textClass: 'text-amber-700', bgClass: 'bg-amber-50 border-amber-200' },
  delivered: { label: 'Livré', textClass: 'text-[#5D7C68]', bgClass: 'bg-[#6B8E78]/10 border-[#6B8E78]/30' },
};

export const ProjectDeliverablesSection: React.FC<ProjectDeliverablesSectionProps> = ({
  project,
  onUpdateDeliverables,
}) => {
  const deliverables = useMemo(() => project.deliverables || [], [project.deliverables]);

  // Formulaire d'ajout rapide
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<ProjectDeliverable['type']>('doc');
  const [newStatus, setNewStatus] = useState<ProjectDeliverable['status']>('planned');
  const [error, setError] = useState('');

  // Édition en cours
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editType, setEditType] = useState<ProjectDeliverable['type']>('doc');
  const [editStatus, setEditStatus] = useState<ProjectDeliverable['status']>('planned');
  const [editError, setEditError] = useState('');

  // Statistiques pour l'en-tête Japandi
  const stats = useMemo(() => {
    const total = deliverables.length;
    const delivered = deliverables.filter((d) => d.status === 'delivered').length;
    const inProgress = deliverables.filter((d) => d.status === 'in_progress').length;
    const planned = deliverables.filter((d) => d.status === 'planned').length;
    return { total, delivered, inProgress, planned };
  }, [deliverables]);

  // Valide le format de l'URL
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return string.startsWith('http://') || string.startsWith('https://');
    } catch (_) {
      return false;
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newTitle.trim()) {
      setError('Le titre du livrable est obligatoire.');
      return;
    }

    if (!newUrl.trim()) {
      setError("L'URL est obligatoire.");
      return;
    }

    if (!isValidUrl(newUrl.trim())) {
      setError("Veuillez saisir une URL valide commençant par http:// ou https://");
      return;
    }

    const newItem: ProjectDeliverable = {
      id: `deliv-${Date.now()}`,
      title: newTitle.trim(),
      url: newUrl.trim(),
      type: newType,
      status: newStatus,
      deliveredAt: newStatus === 'delivered' ? new Date().toISOString() : undefined,
    };

    onUpdateDeliverables([...deliverables, newItem]);

    // Réinitialisation
    setNewTitle('');
    setNewUrl('');
    setNewType('doc');
    setNewStatus('planned');
    setIsAdding(false);
  };

  const startEdit = (item: ProjectDeliverable) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.url);
    setEditType(item.type);
    setEditStatus(item.status);
    setEditError('');
  };

  const handleSaveEdit = (id: string) => {
    setEditError('');

    if (!editTitle.trim()) {
      setEditError('Le titre est obligatoire.');
      return;
    }

    if (!editUrl.trim()) {
      setEditError("L'URL est obligatoire.");
      return;
    }

    if (!isValidUrl(editUrl.trim())) {
      setEditError("Veuillez saisir une URL valide.");
      return;
    }

    const updated = deliverables.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          title: editTitle.trim(),
          url: editUrl.trim(),
          type: editType,
          status: editStatus,
          deliveredAt: editStatus === 'delivered' ? (item.deliveredAt || new Date().toISOString()) : undefined,
        };
      }
      return item;
    });

    onUpdateDeliverables(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce livrable ?')) {
      onUpdateDeliverables(deliverables.filter((item) => item.id !== id));
    }
  };

  const getIcon = (type: ProjectDeliverable['type']) => {
    const config = DELIVERABLE_TYPES.find((t) => t.id === type);
    return config ? config.icon : Link2;
  };

  return (
    <div className="space-y-6">
      {/* Résumé des statistiques épuré */}
      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#FAF9F6] p-4 border border-[#F0EFEB]">
        <div className="text-center border-r border-[#EAE8E2]">
          <span className="block text-[10px] text-[#737873] uppercase tracking-wider font-medium">Livrables</span>
          <span className="text-lg font-normal text-[#1A1D1A]">{stats.total}</span>
        </div>
        <div className="text-center border-r border-[#EAE8E2]">
          <span className="block text-[10px] text-[#737873] uppercase tracking-wider font-medium">Livrés</span>
          <span className="text-lg font-normal text-[#5D7C68] flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {stats.delivered}
          </span>
        </div>
        <div className="text-center">
          <span className="block text-[10px] text-[#737873] uppercase tracking-wider font-medium">En Cours</span>
          <span className="text-lg font-normal text-amber-600 flex items-center justify-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {stats.inProgress}
          </span>
        </div>
      </div>

      {/* Bouton ou Formulaire d'ajout rapide */}
      {!isAdding ? (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#6B8E78]/30 bg-white p-3 text-xs font-medium text-[#5D7C68] hover:bg-[#6B8E78]/5 hover:border-[#6B8E78]/50 transition-all duration-300 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Ajouter un livrable ou lien utile
        </button>
      ) : (
        <form onSubmit={handleAdd} className="rounded-2xl border border-[#6B8E78]/20 bg-[#FAF9F6] p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-[#1A1D1A]">Nouveau livrable</h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[#737873] hover:text-[#1A1D1A]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="deliv-title" className="block text-[10px] font-medium text-[#737873] mb-1">Titre du livrable *</label>
              <input
                id="deliv-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex. Plan Directeur, Cahier des charges"
                className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="deliv-url" className="block text-[10px] font-medium text-[#737873] mb-1">URL externe (Drive, Figma, Notion...) *</label>
              <input
                id="deliv-url"
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none transition-colors font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="deliv-type" className="block text-[10px] font-medium text-[#737873] mb-1">Catégorie / Icône</label>
                <select
                  id="deliv-type"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ProjectDeliverable['type'])}
                  className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none transition-colors"
                >
                  {DELIVERABLE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="deliv-status" className="block text-[10px] font-medium text-[#737873] mb-1">Statut initial</label>
                <select
                  id="deliv-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ProjectDeliverable['status'])}
                  className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none transition-colors"
                >
                  <option value="planned">À venir</option>
                  <option value="in_progress">En cours</option>
                  <option value="delivered">Livré</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-xl border border-[#EAE8E2] bg-white px-3.5 py-1.5 text-xs text-[#737873] hover:text-[#1A1D1A]"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#6B8E78] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#5D7C68] transition-all"
              >
                Créer
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Liste des Livrables */}
      <div className="space-y-2">
        {deliverables.length === 0 ? (
          <div className="text-center py-8 rounded-2xl border border-dashed border-[#EAE8E2] bg-[#FAF9F6]/50">
            <Link2 className="mx-auto h-8 w-8 text-[#737873]/40 stroke-[1.5] mb-2" />
            <p className="text-xs text-[#737873]">Aucun livrable ou lien utile pour ce projet.</p>
            <p className="text-[10px] text-[#737873]/60 mt-0.5">Associez des documents OneDrive, Figma ou Notion.</p>
          </div>
        ) : (
          deliverables.map((item) => {
            const isEditing = editingId === item.id;
            const ItemIcon = getIcon(item.type);
            const statusConfig = STATUS_CONFIG[item.status];

            if (isEditing) {
              return (
                <div key={item.id} className="rounded-2xl border border-[#6B8E78]/30 bg-[#FAF9F6] p-3.5 space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] font-medium text-[#737873]">Titre du livrable</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-[#EAE8E2] bg-white px-2.5 py-1 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-[#737873]">URL</label>
                      <input
                        type="text"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="w-full rounded-lg border border-[#EAE8E2] bg-white px-2.5 py-1 text-xs text-[#1A1D1A] font-mono focus:border-[#6B8E78] focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-medium text-[#737873]">Type</label>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as ProjectDeliverable['type'])}
                          className="w-full rounded-lg border border-[#EAE8E2] bg-white px-2 py-1 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                        >
                          {DELIVERABLE_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-[#737873]">Statut</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as ProjectDeliverable['status'])}
                          className="w-full rounded-lg border border-[#EAE8E2] bg-white px-2 py-1 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                        >
                          <option value="planned">À venir</option>
                          <option value="in_progress">En cours</option>
                          <option value="delivered">Livré</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {editError && (
                    <p className="text-[10px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {editError}
                    </p>
                  )}

                  <div className="flex justify-end gap-1.5 pt-1 border-t border-[#EAE8E2]">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-[#EAE8E2] bg-white px-2.5 py-1 text-[10px] font-medium text-[#737873] hover:text-[#1A1D1A]"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      className="rounded-lg bg-[#6B8E78] px-2.5 py-1 text-[10px] font-medium text-white hover:bg-[#5D7C68]"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-xl border border-[#F0EFEB] bg-white p-3 hover:border-[#E2DFD8] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF9F6] text-[#737873] border border-[#F0EFEB] group-hover:bg-[#6B8E78]/5 group-hover:text-[#5D7C68] group-hover:border-[#6B8E78]/20 transition-all">
                    <ItemIcon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#1A1D1A] hover:text-[#5D7C68] hover:underline transition-colors flex items-center gap-1 inline-flex max-w-full"
                      >
                        <span className="truncate">{item.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-[#737873]/50 inline" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-[#737873] truncate max-w-[150px] sm:max-w-[220px] font-mono">
                        {item.url.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                    {statusConfig.label}
                  </span>

                  <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity gap-0.5">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-lg p-1.5 text-[#737873] hover:bg-[#FAF9F6] hover:text-[#1A1D1A] transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-[#737873] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
