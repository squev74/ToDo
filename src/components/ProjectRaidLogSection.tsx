import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  HelpCircle, 
  Activity, 
  Link, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Filter, 
  CheckCircle, 
  X, 
  User, 
  Sparkles,
  TrendingUp,
  Info
} from 'lucide-react';
import { Projet, RaidItem, RaidType, ImpactLevel, ProbabilityLevel, RoamStatus } from '../types';

interface ProjectRaidLogSectionProps {
  project: Projet;
  onUpdateRaidLog: (updatedRaidLog: RaidItem[]) => void;
}

const RAID_TYPES_CONFIG = {
  risk: { label: 'Risque', icon: ShieldAlert, colorClass: 'text-amber-600 bg-amber-50 border-amber-200' },
  assumption: { label: 'Hypothèse', icon: HelpCircle, colorClass: 'text-sky-600 bg-sky-50 border-sky-200' },
  dependency: { label: 'Dépendance', icon: Link, colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  issue: { label: 'Problème (Issue)', icon: AlertTriangle, colorClass: 'text-rose-600 bg-rose-50 border-rose-200' },
};

const ROAM_STATUS_CONFIG = {
  resolved: { label: 'Resolved', desc: 'Résolu ou éliminé', bgClass: 'bg-[#6B8E78]/15 border-[#6B8E78]/30', textClass: 'text-[#4A6352]' },
  owned: { label: 'Owned', desc: 'Attribué à un responsable', bgClass: 'bg-blue-50 border-blue-200', textClass: 'text-blue-700' },
  accepted: { label: 'Accepted', desc: 'Accepté / Risque toléré', bgClass: 'bg-slate-100 border-slate-200', textClass: 'text-slate-600' },
  mitigated: { label: 'Mitigated', desc: 'Plan de remédiation actif', bgClass: 'bg-amber-50 border-amber-200', textClass: 'text-amber-700' },
};

export const ProjectRaidLogSection: React.FC<ProjectRaidLogSectionProps> = ({
  project,
  onUpdateRaidLog,
}) => {
  const raidLog = useMemo(() => project.raidLog || [], [project.raidLog]);

  // Filtres
  const [filterType, setFilterType] = useState<RaidType | 'all'>('all');
  const [filterRoam, setFilterRoam] = useState<RoamStatus | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'open' | 'closed' | 'all'>('open');
  const [selectedCell, setSelectedCell] = useState<{ impact: ImpactLevel; probability: ProbabilityLevel } | null>(null);

  // Formulaire d'édition / création d'item RAID
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RaidType>('risk');
  const [impact, setImpact] = useState<ImpactLevel>(2);
  const [probability, setProbability] = useState<ProbabilityLevel>(2);
  const [roamStatus, setRoamStatus] = useState<RoamStatus>('owned');
  const [owner, setOwner] = useState('');
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [itemStatus, setItemStatus] = useState<'open' | 'closed'>('open');
  const [formError, setFormError] = useState('');

  // Statistiques de la matrice d'impact / probabilité (score = impact * probability)
  // Tableau de score de 1 à 9
  const matrixCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Initialisation
    for (let imp = 1; imp <= 3; imp++) {
      for (let prob = 1; prob <= 3; prob++) {
        counts[`${imp}-${prob}`] = 0;
      }
    }
    // Filtrer uniquement sur les ouverts de type 'risk' ou 'issue' pour la matrice
    raidLog.forEach((item) => {
      if (item.status === 'open' && (item.type === 'risk' || item.type === 'issue')) {
        const key = `${item.impact}-${item.probability}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [raidLog]);

  // Filtrer les items affichés dans le tableau
  const filteredItems = useMemo(() => {
    return raidLog.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterRoam !== 'all' && item.roamStatus !== filterRoam) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (selectedCell) {
        if (item.impact !== selectedCell.impact || item.probability !== selectedCell.probability) {
          return false;
        }
      }
      return true;
    });
  }, [raidLog, filterType, filterRoam, filterStatus, selectedCell]);

  // Ouvrir formulaire pour création
  const handleOpenCreate = () => {
    setEditingItemId(null);
    setTitle('');
    setDescription('');
    setType('risk');
    setImpact(2);
    setProbability(2);
    setRoamStatus('owned');
    setOwner('');
    setMitigationPlan('');
    setItemStatus('open');
    setFormError('');
    setIsFormOpen(true);
  };

  // Ouvrir formulaire pour édition
  const handleOpenEdit = (item: RaidItem) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setDescription(item.description || '');
    setType(item.type);
    setImpact(item.impact);
    setProbability(item.probability);
    setRoamStatus(item.roamStatus);
    setOwner(item.owner || '');
    setMitigationPlan(item.mitigationPlan || '');
    setItemStatus(item.status);
    setFormError('');
    setIsFormOpen(true);
  };

  // Soumettre le formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Le titre de l\'élément est requis.');
      return;
    }

    if (roamStatus === 'owned' && !owner.trim()) {
      setFormError('Un responsable (Owner) doit être assigné lorsque le statut ROAM est "Owned".');
      return;
    }

    const now = new Date().toISOString();
    const criticalityScore = impact * probability;

    let updatedList: RaidItem[];

    if (editingItemId) {
      // Édition
      updatedList = raidLog.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            title: title.trim(),
            description: description.trim() || undefined,
            type,
            impact,
            probability,
            criticalityScore,
            roamStatus,
            owner: roamStatus === 'owned' ? owner.trim() : (owner.trim() || undefined),
            mitigationPlan: mitigationPlan.trim() || undefined,
            status: itemStatus,
            updatedAt: now,
          };
        }
        return item;
      });
    } else {
      // Nouvelle création
      const newItem: RaidItem = {
        id: `raid-${Date.now()}`,
        projectId: project.id,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        impact,
        probability,
        criticalityScore,
        roamStatus,
        owner: owner.trim() || undefined,
        mitigationPlan: mitigationPlan.trim() || undefined,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
      updatedList = [newItem, ...raidLog];
    }

    onUpdateRaidLog(updatedList);
    setIsFormOpen(false);
  };

  // Supprimer un élément du RAID Log
  const handleDeleteItem = (itemId: string, itemTitle: string) => {
    if (confirm(`Voulez-vous vraiment supprimer définitivement l'élément RAID "${itemTitle}" ?`)) {
      const updated = raidLog.filter((item) => item.id !== itemId);
      onUpdateRaidLog(updated);
    }
  };

  // Obtenir la classe de couleur de criticité (score = impact * probability)
  const getCriticalityBadgeClass = (score: number) => {
    if (score >= 6) return 'bg-rose-50 border-rose-200 text-rose-700'; // Rouge
    if (score >= 3) return 'bg-amber-50 border-amber-200 text-amber-700'; // Orange
    return 'bg-[#6B8E78]/10 border-[#6B8E78]/20 text-[#4A6352]'; // Vert
  };

  // Compter les statuts de criticité globaux
  const criticalCount = useMemo(() => {
    return raidLog.filter(item => item.status === 'open' && item.criticalityScore >= 6).length;
  }, [raidLog]);

  return (
    <div className="space-y-6">
      {/* EXPLICATIONS DE LA MÉTHODE ROAM & COMPRESSEUR RAPIDE */}
      <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#F0EFEB] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#5D7C68]" />
            <div>
              <h4 className="text-xs font-semibold text-[#1A1D1A]">Registre RAID & Cadre ROAM</h4>
              <p className="text-[10px] text-[#737873]">Gérez les Risques, Hypothèses, Dépendances et Problèmes via le classement d'impact et la remédiation ROAM.</p>
            </div>
          </div>
          
          <button
            id="btn-add-raid-item"
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5D7C68] transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvel élément RAID
          </button>
        </div>

        {/* METRICS RAPIDES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-[#F0EFEB]">
          <div className="p-2.5 bg-white rounded-xl border border-[#F0EFEB]">
            <span className="block text-[9px] text-[#737873] uppercase tracking-wider font-medium">Éléments Total</span>
            <span className="text-sm font-semibold text-[#1A1D1A]">{raidLog.length}</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-[#F0EFEB]">
            <span className="block text-[9px] text-[#737873] uppercase tracking-wider font-medium">Risques Critiques (Score &ge; 6)</span>
            <span className={`text-sm font-semibold ${criticalCount > 0 ? 'text-rose-600' : 'text-[#737873]'}`}>{criticalCount}</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-[#F0EFEB] col-span-2">
            <span className="block text-[9px] text-[#737873] uppercase tracking-wider font-medium">Rapport IA Mensuel</span>
            <span className="text-[10px] text-amber-700 font-medium block mt-0.5 flex items-center gap-1">
              <Info className="h-3 w-3 inline shrink-0 text-amber-600" />
              Criticités &ge; 6 & issues ouvertes incluses d'office
            </span>
          </div>
        </div>
      </div>

      {/* MATRICE D'IMPACT / PROBABILITÉ (3x3 JAPANDI) & FORMULAIRE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MATRICE 3X3 */}
        <div className="lg:col-span-4 rounded-2xl border border-[#F0EFEB] bg-white p-4 space-y-3 flex flex-col justify-between">
          <div>
            <h5 className="text-xs font-bold text-[#1A1D1A] flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[#5D7C68]" />
              Matrice de criticité 3x3 (Risques & Problèmes ouverts)
            </h5>
            <p className="text-[10px] text-[#737873] mt-0.5">Cliquez sur une cellule pour filtrer par niveau de criticité.</p>
          </div>

          <div className="flex flex-col items-stretch pt-2">
            {/* L'axe des ordonnées (Impact) en haut */}
            <div className="flex">
              {/* Libellé vertical d'ordonnée */}
              <div className="w-8 flex items-center justify-center">
                <span className="text-[9px] font-bold text-[#737873] rotate-270 uppercase tracking-wider whitespace-nowrap">Impact</span>
              </div>

              {/* Contenu de la grille */}
              <div className="flex-1 space-y-1.5">
                {/* Ligne 3: Impact Élevé */}
                <div className="flex gap-1.5 items-center">
                  <span className="w-12 text-[10px] font-medium text-right text-[#737873] pr-1.5">Élevé (3)</span>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 3 && selectedCell?.probability === 1 ? null : { impact: 3, probability: 1 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 3 && selectedCell?.probability === 1 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-amber-100/60 border-amber-200 hover:bg-amber-100 text-amber-800`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['3-1']}</span>
                    <span className="text-[8px] text-amber-700">Moyen (3)</span>
                  </button>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 3 && selectedCell?.probability === 2 ? null : { impact: 3, probability: 2 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 3 && selectedCell?.probability === 2 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-rose-100/60 border-rose-200 hover:bg-rose-100 text-rose-800`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['3-2']}</span>
                    <span className="text-[8px] text-rose-700">Critique (6)</span>
                  </button>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 3 && selectedCell?.probability === 3 ? null : { impact: 3, probability: 3 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 3 && selectedCell?.probability === 3 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-rose-200/60 border-rose-300 hover:bg-rose-200 text-rose-900 font-bold`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['3-3']}</span>
                    <span className="text-[8px] text-rose-800">Critique (9)</span>
                  </button>
                </div>

                {/* Ligne 2: Impact Moyen */}
                <div className="flex gap-1.5 items-center">
                  <span className="w-12 text-[10px] font-medium text-right text-[#737873] pr-1.5">Moyen (2)</span>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 2 && selectedCell?.probability === 1 ? null : { impact: 2, probability: 1 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 2 && selectedCell?.probability === 1 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-[#6B8E78]/10 border-[#6B8E78]/20 hover:bg-[#6B8E78]/15 text-[#4A6352]`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['2-1']}</span>
                    <span className="text-[8px] text-[#737873]">Faible (2)</span>
                  </button>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 2 && selectedCell?.probability === 2 ? null : { impact: 2, probability: 2 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 2 && selectedCell?.probability === 2 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-amber-100/60 border-amber-200 hover:bg-amber-100 text-amber-800`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['2-2']}</span>
                    <span className="text-[8px] text-amber-700">Moyen (4)</span>
                  </button>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 2 && selectedCell?.probability === 3 ? null : { impact: 2, probability: 3 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 2 && selectedCell?.probability === 3 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-rose-100/60 border-rose-200 hover:bg-rose-100 text-rose-800`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['2-3']}</span>
                    <span className="text-[8px] text-rose-700">Critique (6)</span>
                  </button>
                </div>

                {/* Ligne 1: Impact Faible */}
                <div className="flex gap-1.5 items-center">
                  <span className="w-12 text-[10px] font-medium text-right text-[#737873] pr-1.5">Faible (1)</span>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 1 && selectedCell?.probability === 1 ? null : { impact: 1, probability: 1 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 1 && selectedCell?.probability === 1 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-[#6B8E78]/10 border-[#6B8E78]/20 hover:bg-[#6B8E78]/15 text-[#4A6352]`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['1-1']}</span>
                    <span className="text-[8px] text-[#737873]">Faible (1)</span>
                  </button>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 1 && selectedCell?.probability === 2 ? null : { impact: 1, probability: 2 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 1 && selectedCell?.probability === 2 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-[#6B8E78]/10 border-[#6B8E78]/20 hover:bg-[#6B8E78]/15 text-[#4A6352]`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['1-2']}</span>
                    <span className="text-[8px] text-[#737873]">Faible (2)</span>
                  </button>
                  <button 
                    onClick={() => setSelectedCell(selectedCell?.impact === 1 && selectedCell?.probability === 3 ? null : { impact: 1, probability: 3 })}
                    className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all border ${
                      selectedCell?.impact === 1 && selectedCell?.probability === 3 ? 'ring-2 ring-offset-2 ring-[#6B8E78]' : ''
                    } bg-amber-100/60 border-amber-200 hover:bg-amber-100 text-amber-800`}
                  >
                    <span className="text-xs font-semibold">{matrixCounts['1-3']}</span>
                    <span className="text-[8px] text-amber-700">Moyen (3)</span>
                  </button>
                </div>

                {/* Axe Probabilité (En bas) */}
                <div className="flex pt-1.5 pl-12 gap-1.5">
                  <span className="flex-1 text-[10px] text-center font-medium text-[#737873]">Faible (1)</span>
                  <span className="flex-1 text-[10px] text-center font-medium text-[#737873]">Moyenne (2)</span>
                  <span className="flex-1 text-[10px] text-center font-medium text-[#737873]">Élevée (3)</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] font-bold text-[#737873] uppercase tracking-wider">Probabilité</span>
                </div>
              </div>
            </div>
          </div>

          {selectedCell && (
            <div className="mt-2 text-center">
              <button 
                onClick={() => setSelectedCell(null)}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-semibold"
              >
                Filtrer : Impact {selectedCell.impact} & Prob {selectedCell.probability}
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* LISTE ET FILTRES DES ITEMS RAID */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* BARRE DE FILTRES */}
          <div className="rounded-2xl border border-[#F0EFEB] bg-white p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#737873]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#737873]">Filtres :</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type */}
              <select
                id="filter-raid-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as RaidType | 'all')}
                className="rounded-lg border border-[#EAE8E2] bg-white px-2 py-1 text-xs text-[#1A1D1A] focus:outline-none"
              >
                <option value="all">Tous les types</option>
                <option value="risk">Risques</option>
                <option value="assumption">Hypothèses</option>
                <option value="dependency">Dépendances</option>
                <option value="issue">Problèmes</option>
              </select>

              {/* ROAM */}
              <select
                id="filter-raid-roam"
                value={filterRoam}
                onChange={(e) => setFilterRoam(e.target.value as RoamStatus | 'all')}
                className="rounded-lg border border-[#EAE8E2] bg-white px-2 py-1 text-xs text-[#1A1D1A] focus:outline-none"
              >
                <option value="all">Tous les statuts ROAM</option>
                <option value="resolved">Resolved</option>
                <option value="owned">Owned</option>
                <option value="accepted">Accepted</option>
                <option value="mitigated">Mitigated</option>
              </select>

              {/* Statut ouvert / fermé */}
              <select
                id="filter-raid-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'open' | 'closed' | 'all')}
                className="rounded-lg border border-[#EAE8E2] bg-white px-2 py-1 text-xs text-[#1A1D1A] focus:outline-none"
              >
                <option value="open">Ouvert</option>
                <option value="closed">Fermé</option>
                <option value="all">Tout (Ouvert & Fermé)</option>
              </select>
            </div>
          </div>

          {/* TABLEAU DES RAID ITEMS */}
          <div className="overflow-x-auto rounded-2xl border border-[#F0EFEB] bg-white">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs text-[#1A1D1A]">
              <thead>
                <tr className="border-b border-[#F0EFEB] bg-[#FAF9F6]">
                  <th className="p-3 font-semibold text-[#737873] w-[180px]">Titre / Type</th>
                  <th className="p-3 font-semibold text-[#737873] w-[80px] text-center">Score</th>
                  <th className="p-3 font-semibold text-[#737873] w-[120px]">Méthode ROAM</th>
                  <th className="p-3 font-semibold text-[#737873] w-[220px]">Plan de mitigation & Actions</th>
                  <th className="p-3 font-semibold text-[#737873] w-[80px] text-center">État</th>
                  <th className="p-3 text-center w-[70px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEB]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#737873]">
                      <Info className="mx-auto h-8 w-8 text-[#737873]/30 stroke-[1.5] mb-2" />
                      Aucun élément RAID ne correspond aux filtres appliqués.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const typeConfig = RAID_TYPES_CONFIG[item.type];
                    const TypeIcon = typeConfig.icon;
                    const roamConfig = ROAM_STATUS_CONFIG[item.roamStatus];

                    return (
                      <tr key={item.id} className="hover:bg-[#FAF9F6]/40 transition-colors">
                        {/* Titre et Type */}
                        <td className="p-3 min-w-[180px]">
                          <div className="font-semibold text-[#1A1D1A] break-words">{item.title}</div>
                          {item.description && (
                            <p className="text-[10px] text-[#737873] line-clamp-2 mt-0.5">{item.description}</p>
                          )}
                          <div className="mt-1.5 inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider font-mono bg-white">
                            <TypeIcon className="h-2.5 w-2.5" />
                            {typeConfig.label}
                          </div>
                        </td>

                        {/* Score Criticité */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded-lg border font-mono font-bold text-[10px] ${getCriticalityBadgeClass(item.criticalityScore)}`}>
                              Score {item.criticalityScore}
                            </span>
                            <span className="text-[9px] text-[#737873] mt-0.5">I: {item.impact} &times; P: {item.probability}</span>
                          </div>
                        </td>

                        {/* ROAM Status & Responsable */}
                        <td className="p-3">
                          <span className={`inline-block rounded-lg border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${roamConfig.bgClass} ${roamConfig.textClass}`}>
                            {roamConfig.label}
                          </span>
                          {item.roamStatus === 'owned' && item.owner && (
                            <div className="text-[10px] text-slate-700 font-medium flex items-center gap-1 mt-1 truncate">
                              <User className="h-3 w-3 text-slate-400" />
                              {item.owner}
                            </div>
                          )}
                        </td>

                        {/* Plan de Mitigation */}
                        <td className="p-3 text-[10px] max-w-[220px]">
                          {item.mitigationPlan ? (
                            <p className="text-slate-700 italic break-words line-clamp-3">"{item.mitigationPlan}"</p>
                          ) : (
                            <span className="text-[#737873]/50 italic">Aucun plan défini</span>
                          )}
                        </td>

                        {/* État (Open / Closed) */}
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[9px] font-bold ${
                            item.status === 'open' 
                              ? 'bg-amber-50 border-amber-200 text-amber-700' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            {item.status === 'open' ? 'Ouvert' : 'Clos'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-edit-raid-${item.id}`}
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="rounded-lg p-1 text-[#737873] hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              title="Modifier"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`btn-delete-raid-${item.id}`}
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.title)}
                              className="rounded-lg p-1 text-[#737873] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FORMULAIRE MODAL D'AJOUT ET D'ÉDITION RAID LOG */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-2xl border border-[#F0EFEB] bg-white p-5 shadow-2xl flex flex-col space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EFEB]">
              <h4 className="text-sm font-bold text-[#1A1D1A] flex items-center gap-1.5">
                <ShieldAlert className="h-4.5 w-4.5 text-[#6B8E78]" />
                {editingItemId ? 'Modifier l\'élément RAID' : 'Ajouter un nouvel élément RAID'}
              </h4>
              <button 
                id="btn-close-raid-form"
                type="button" 
                onClick={() => setIsFormOpen(false)} 
                className="text-[#737873] hover:text-[#1A1D1A]"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Titre */}
              <div>
                <label htmlFor="raid-title" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Titre de l'élément *</label>
                <input
                  id="raid-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Retard d'approbation sur les specs sécurité"
                  className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="raid-desc" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Description / Contexte</label>
                <textarea
                  id="raid-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Expliquez la situation opérationnelle..."
                  className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                />
              </div>

              {/* Type, Impact, Probabilité */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="raid-type" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Type d'élément *</label>
                  <select
                    id="raid-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as RaidType)}
                    className="w-full rounded-xl border border-[#EAE8E2] bg-white px-2 py-1.5 text-xs text-[#1A1D1A] focus:outline-none"
                  >
                    <option value="risk">Risque</option>
                    <option value="assumption">Hypothèse</option>
                    <option value="dependency">Dépendance</option>
                    <option value="issue">Problème (Issue)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="raid-impact" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Impact *</label>
                  <select
                    id="raid-impact"
                    value={impact}
                    onChange={(e) => setImpact(parseInt(e.target.value) as ImpactLevel)}
                    className="w-full rounded-xl border border-[#EAE8E2] bg-white px-2 py-1.5 text-xs text-[#1A1D1A] focus:outline-none"
                  >
                    <option value={1}>1 - Faible</option>
                    <option value={2}>2 - Moyen</option>
                    <option value={3}>3 - Élevé</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="raid-prob" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Probabilité *</label>
                  <select
                    id="raid-prob"
                    value={probability}
                    onChange={(e) => setProbability(parseInt(e.target.value) as ProbabilityLevel)}
                    className="w-full rounded-xl border border-[#EAE8E2] bg-white px-2 py-1.5 text-xs text-[#1A1D1A] focus:outline-none"
                  >
                    <option value={1}>1 - Faible</option>
                    <option value={2}>2 - Moyenne</option>
                    <option value={3}>3 - Élevée</option>
                  </select>
                </div>
              </div>

              {/* ROAM Status & Responsable */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="raid-roam" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Statut ROAM *</label>
                  <select
                    id="raid-roam"
                    value={roamStatus}
                    onChange={(e) => setRoamStatus(e.target.value as RoamStatus)}
                    className="w-full rounded-xl border border-[#EAE8E2] bg-white px-2 py-1.5 text-xs text-[#1A1D1A] focus:outline-none"
                  >
                    <option value="resolved">Resolved (Résolu)</option>
                    <option value="owned">Owned (Assigné)</option>
                    <option value="accepted">Accepted (Accepté)</option>
                    <option value="mitigated">Mitigated (Plan de mitigation)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="raid-owner" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Responsable (Owner) {roamStatus === 'owned' && '*'}</label>
                  <input
                    id="raid-owner"
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Ex: Alice Martin"
                    className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                    required={roamStatus === 'owned'}
                  />
                </div>
              </div>

              {/* Plan de Mitigation */}
              <div>
                <label htmlFor="raid-mitigation" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Plan de mitigation & Actions de contournement</label>
                <textarea
                  id="raid-mitigation"
                  rows={2}
                  value={mitigationPlan}
                  onChange={(e) => setMitigationPlan(e.target.value)}
                  placeholder="Rédigez les mesures d'atténuation..."
                  className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                />
              </div>

              {/* État de l'élément (Open / Closed) */}
              {editingItemId && (
                <div>
                  <label className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1.5">État de l'élément</label>
                  <div className="flex gap-4">
                    <label htmlFor="state-open" className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        id="state-open"
                        type="radio"
                        name="itemStatus"
                        checked={itemStatus === 'open'}
                        onChange={() => setItemStatus('open')}
                        className="text-[#6B8E78] focus:ring-[#6B8E78]"
                      />
                      <span>Ouvert (Actif)</span>
                    </label>
                    <label htmlFor="state-closed" className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        id="state-closed"
                        type="radio"
                        name="itemStatus"
                        checked={itemStatus === 'closed'}
                        onChange={() => setItemStatus('closed')}
                        className="text-[#6B8E78] focus:ring-[#6B8E78]"
                      />
                      <span>Clos (Fermé / Résolu)</span>
                    </label>
                  </div>
                </div>
              )}

              {formError && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F0EFEB]">
                <button
                  id="btn-cancel-raid"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-[#EAE8E2] bg-white px-4 py-2 text-xs text-[#737873] hover:text-[#1A1D1A]"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-raid"
                  type="submit"
                  className="rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5D7C68]"
                >
                  {editingItemId ? 'Enregistrer les modifications' : 'Ajouter l\'élément'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
