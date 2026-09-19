import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Check, 
  X, 
  Calendar, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  BarChart, 
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
  Coins
} from 'lucide-react';
import { Projet, TeamMember, MonthlyAllocation } from '../types';

interface ProjectMonthlyCapacityProps {
  project: Projet;
  onUpdateProjectCapacity: (
    teamMembers: TeamMember[],
    allocations: MonthlyAllocation[]
  ) => void;
}

const MONTH_LABELS = [
  { num: 1, label: 'Jan' },
  { num: 2, label: 'Fév' },
  { num: 3, label: 'Mar' },
  { num: 4, label: 'Avr' },
  { num: 5, label: 'Mai' },
  { num: 6, label: 'Juin' },
  { num: 7, label: 'Juil' },
  { num: 8, label: 'Août' },
  { num: 9, label: 'Sept' },
  { num: 10, label: 'Oct' },
  { num: 11, label: 'Nov' },
  { num: 12, label: 'Déc' },
];

const ALLOCATION_STATUS_CONFIG = {
  draft: { label: 'Brouillon', textClass: 'text-slate-600', bgClass: 'bg-slate-100 border-slate-200' },
  requested: { label: 'Demandé', textClass: 'text-amber-700', bgClass: 'bg-amber-50 border-amber-200' },
  approved: { label: 'Validé', textClass: 'text-[#5D7C68]', bgClass: 'bg-[#6B8E78]/10 border-[#6B8E78]/30' },
  rejected: { label: 'Refusé', textClass: 'text-rose-700', bgClass: 'bg-rose-50 border-rose-200' },
};

/**
 * Fonction d'optimisation / compaction des données JSON avant envoi (stockage Firestore ou local).
 * Supprime les entrées d'allocations vides (0 jour ou indéfinies) pour économiser des kilo-octets
 * et réduire les coûts d'écriture/stockage Cloud de manière optimale.
 */
export function compactAllocationsPayload(allocations: MonthlyAllocation[]): MonthlyAllocation[] {
  return allocations.filter(
    (alloc) => alloc.requestedDays > 0 || alloc.status !== 'draft'
  );
}

export const ProjectMonthlyCapacity: React.FC<ProjectMonthlyCapacityProps> = ({
  project,
  onUpdateProjectCapacity,
}) => {
  const teamMembers = useMemo(() => project.teamMembers || [], [project.teamMembers]);
  const allocations = useMemo(() => project.allocations || [], [project.allocations]);

  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [copiedSuccess, setCopiedSuccess] = useState<string | null>(null);

  // Nouvel expert / collaborateur form state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Développeur');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addError, setAddError] = useState('');

  // Rôles suggérés
  const ROLE_SUGGESTIONS = ['Ingénieur applicatif', 'Développeur', 'Expert Sécurité', 'PMO', 'Designer UX/UI', 'QA Engineer', 'Product Owner'];

  // Gestion des changements de cellule d'allocation
  const handleAllocationChange = (memberId: string, monthNum: number, valueStr: string) => {
    const rawVal = parseFloat(valueStr);
    const days = isNaN(rawVal) ? 0 : Math.max(0, rawVal);

    // Trouver si une ligne d'allocation existe déjà pour ce collaborateur, cette année et ce mois
    const existingIndex = allocations.findIndex(
      (a) => a.memberId === memberId && a.year === currentYear && a.month === monthNum
    );

    let updatedAllocations = [...allocations];

    if (existingIndex > -1) {
      updatedAllocations[existingIndex] = {
        ...updatedAllocations[existingIndex],
        requestedDays: days,
      };
    } else {
      updatedAllocations.push({
        memberId,
        year: currentYear,
        month: monthNum,
        requestedDays: days,
        status: 'draft',
      });
    }

    // Compacter et sauvegarder
    const compacted = compactAllocationsPayload(updatedAllocations);
    onUpdateProjectCapacity(teamMembers, compacted);
  };

  // Gestion des changements de statut globaux par collaborateur
  const handleStatusChange = (memberId: string, status: MonthlyAllocation['status']) => {
    // Mettre à jour toutes les allocations de l'année pour ce collaborateur au statut sélectionné
    let updatedAllocations = [...allocations];
    
    // Pour chaque mois, s'il n'y a pas d'allocation existante, on peut en initialiser une à 0 ou simplement mettre à jour les existantes
    // S'assurer qu'au moins une entrée existe ou modifier celles existantes
    let updatedCount = 0;
    updatedAllocations = updatedAllocations.map((alloc) => {
      if (alloc.memberId === memberId && alloc.year === currentYear) {
        updatedCount++;
        return { ...alloc, status };
      }
      return alloc;
    });

    // Si aucune allocation n'était enregistrée, on en pré-remplit une pour stocker le statut
    if (updatedCount === 0) {
      updatedAllocations.push({
        memberId,
        year: currentYear,
        month: 1,
        requestedDays: 0,
        status,
      });
    }

    const compacted = compactAllocationsPayload(updatedAllocations);
    onUpdateProjectCapacity(teamMembers, compacted);
  };

  // Ajouter un nouveau collaborateur au projet
  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newMemberName.trim()) {
      setAddError('Le nom du collaborateur est requis.');
      return;
    }

    const newId = `member-${Date.now()}`;
    const newMember: TeamMember = {
      id: newId,
      name: newMemberName.trim(),
      role: newMemberRole,
      email: newMemberEmail.trim() || undefined,
    };

    onUpdateProjectCapacity([...teamMembers, newMember], allocations);

    // Reset form
    setNewMemberName('');
    setNewMemberEmail('');
    setIsAddingMember(false);
  };

  // Supprimer un collaborateur et ses allocations associées
  const handleDeleteMember = (memberId: string, name: string) => {
    if (confirm(`Voulez-vous vraiment retirer ${name} et toutes ses allocations de jours pour ce projet ?`)) {
      const updatedMembers = teamMembers.filter((m) => m.id !== memberId);
      const updatedAllocations = allocations.filter((a) => a.memberId !== memberId);
      onUpdateProjectCapacity(updatedMembers, updatedAllocations);
    }
  };

  // HELPER CALCULS CAPACITAIRES
  const getAllocationValue = (memberId: string, monthNum: number): number => {
    const alloc = allocations.find(
      (a) => a.memberId === memberId && a.year === currentYear && a.month === monthNum
    );
    return alloc ? alloc.requestedDays : 0;
  };

  const getMemberStatus = (memberId: string): MonthlyAllocation['status'] => {
    const alloc = allocations.find(
      (a) => a.memberId === memberId && a.year === currentYear
    );
    return alloc ? alloc.status : 'draft';
  };

  // Total annuel par personne
  const getMemberAnnualTotal = (memberId: string): number => {
    return MONTH_LABELS.reduce((sum, m) => sum + getAllocationValue(memberId, m.num), 0);
  };

  // Somme des allocations par mois
  const getMonthlyTotal = (monthNum: number): number => {
    return teamMembers.reduce((sum, m) => sum + getAllocationValue(m.id, monthNum), 0);
  };

  // Total cumulé sur l'année pour le projet
  const getProjectAnnualTotal = useMemo(() => {
    return teamMembers.reduce((sum, m) => sum + getMemberAnnualTotal(m.id), 0);
  }, [teamMembers, allocations, currentYear]);

  // Trimestres (Q1 à Q4) pour faciliter les copier-coller
  const quarterlyTotals = useMemo(() => {
    const q1 = [1, 2, 3].reduce((sum, mNum) => sum + getMonthlyTotal(mNum), 0);
    const q2 = [4, 5, 6].reduce((sum, mNum) => sum + getMonthlyTotal(mNum), 0);
    const q3 = [7, 8, 9].reduce((sum, mNum) => sum + getMonthlyTotal(mNum), 0);
    const q4 = [10, 11, 12].reduce((sum, mNum) => sum + getMonthlyTotal(mNum), 0);
    return { q1, q2, q3, q4 };
  }, [teamMembers, allocations, currentYear]);

  // Exporter la synthèse trimestrielle au format texte pour presse-papier
  const copyQuarterlySummaryToClipboard = () => {
    const text = `Synthèse Capacitaire - Projet: ${project.nom} (Année: ${currentYear})\n` +
      `--------------------------------------------------\n` +
      `Trimestre 1 (Q1) : ${quarterlyTotals.q1} Jours/Homme\n` +
      `Trimestre 2 (Q2) : ${quarterlyTotals.q2} Jours/Homme\n` +
      `Trimestre 3 (Q3) : ${quarterlyTotals.q3} Jours/Homme\n` +
      `Trimestre 4 (Q4) : ${quarterlyTotals.q4} Jours/Homme\n` +
      `--------------------------------------------------\n` +
      `TOTAL ANNUEL     : ${getProjectAnnualTotal} Jours/Homme`;
    
    navigator.clipboard.writeText(text);
    setCopiedSuccess('Synthèse copiée !');
    setTimeout(() => setCopiedSuccess(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* SECTION EXPLICATIONS COMPRESSION ET STATS */}
      <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#F0EFEB] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#5D7C68]" />
            <div>
              <h4 className="text-xs font-semibold text-[#1A1D1A]">Planification Macro-Capacitaire</h4>
              <p className="text-[10px] text-[#737873]">Déterminez les jours d'expertises requis par mois sans micro-gestion.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="year-select" className="text-[11px] font-medium text-[#737873]">Année fiscale :</label>
            <select
              id="year-select"
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="rounded-lg border border-[#EAE8E2] bg-white px-2 py-1 text-xs text-[#1A1D1A] focus:outline-none"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>

        {/* STATS RAPIDES & COMPRESSION PAYLOAD INDICATION */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-[#F0EFEB]">
          <div className="p-2 bg-white rounded-xl border border-[#F0EFEB]">
            <span className="block text-[9px] text-[#737873] uppercase tracking-wider font-medium">Cumul Annuel</span>
            <span className="text-sm font-semibold text-[#1A1D1A]">{getProjectAnnualTotal} Jours</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-[#F0EFEB]">
            <span className="block text-[9px] text-[#737873] uppercase tracking-wider font-medium">Experts affectés</span>
            <span className="text-sm font-semibold text-[#5D7C68]">{teamMembers.length}</span>
          </div>
          <div className="p-2 bg-white rounded-xl border border-[#F0EFEB] col-span-2">
            <span className="block text-[9px] text-[#737873] uppercase tracking-wider font-medium">Compression Payload JSON</span>
            <span className="text-[10px] text-amber-700 font-mono block mt-0.5">Optimisé pour réduire les coûts d'écriture</span>
          </div>
        </div>
      </div>

      {/* BOUTON AJOUT COLLABORATEUR / EXPERT */}
      {!isAddingMember ? (
        <button
          type="button"
          onClick={() => setIsAddingMember(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#6B8E78]/30 bg-white p-3 text-xs font-medium text-[#5D7C68] hover:bg-[#6B8E78]/5 hover:border-[#6B8E78]/50 transition-all duration-300 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Ajouter un collaborateur ou rôle expert au projet
        </button>
      ) : (
        <form onSubmit={handleAddMemberSubmit} className="rounded-2xl border border-[#6B8E78]/20 bg-[#FAF9F6] p-4 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-[#1A1D1A]">Ajouter une ressource</h5>
            <button type="button" onClick={() => setIsAddingMember(false)} className="text-[#737873] hover:text-[#1A1D1A]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="member-name" className="block text-[10px] font-medium text-[#737873] mb-1">Nom du collaborateur *</label>
              <input
                id="member-name"
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Ex. Alice Martin"
                className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="member-role" className="block text-[10px] font-medium text-[#737873] mb-1">Rôle associé *</label>
              <input
                id="member-role"
                type="text"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                placeholder="Ex. Architecte, Chef de projet"
                className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="member-email" className="block text-[10px] font-medium text-[#737873] mb-1">Email (facultatif)</label>
              <input
                id="member-email"
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="alice@entreprise.com"
                className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
              />
            </div>
          </div>

          {addError && (
            <p className="text-[11px] text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {addError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingMember(false)}
              className="rounded-xl border border-[#EAE8E2] bg-white px-3.5 py-1.5 text-xs text-[#737873] hover:text-[#1A1D1A]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#6B8E78] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#5D7C68]"
            >
              Confirmer l'ajout
            </button>
          </div>
        </form>
      )}

      {/* GRILLE MATRICIELLE JAPANDI */}
      <div className="overflow-x-auto rounded-2xl border border-[#F0EFEB] bg-white">
        <table className="w-full min-w-[800px] border-collapse text-left text-xs text-[#1A1D1A]">
          <thead>
            <tr className="border-b border-[#F0EFEB] bg-[#FAF9F6]">
              <th className="p-3 font-semibold text-[#737873] w-[200px]">Ressource / Expert</th>
              {MONTH_LABELS.map((m) => (
                <th key={m.num} className="p-2 text-center font-medium text-[#737873] w-[45px]">{m.label}</th>
              ))}
              <th className="p-3 text-right font-semibold text-[#737873] w-[70px]">Total An</th>
              <th className="p-3 font-semibold text-[#737873] w-[100px]">Statut</th>
              <th className="p-3 text-center w-[40px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFEB]">
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan={16} className="p-8 text-center text-[#737873]">
                  <Briefcase className="mx-auto h-8 w-8 text-[#737873]/30 stroke-[1.5] mb-2" />
                  Aucun collaborateur planifié sur ce projet.
                  <p className="text-[10px] text-[#737873]/60 mt-0.5">Commencez par ajouter un expert ou un rôle.</p>
                </td>
              </tr>
            ) : (
              teamMembers.map((member) => {
                const totalAnnuel = getMemberAnnualTotal(member.id);
                const currentStatus = getMemberStatus(member.id);
                const statusStyle = ALLOCATION_STATUS_CONFIG[currentStatus];

                return (
                  <tr key={member.id} className="hover:bg-[#FAF9F6]/40 transition-colors">
                    {/* Nom & Rôle de l'expert */}
                    <td className="p-3 min-w-[200px]">
                      <div className="font-semibold text-[#1A1D1A] truncate">{member.name}</div>
                      <div className="text-[10px] text-[#737873] flex items-center gap-1">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        {member.role}
                      </div>
                    </td>

                    {/* Cellules mensuelles */}
                    {MONTH_LABELS.map((m) => (
                      <td key={m.num} className="p-1 text-center">
                        <input
                          id={`input-capacity-${member.id}-${m.num}`}
                          type="number"
                          step="0.5"
                          min="0"
                          max="31"
                          value={getAllocationValue(member.id, m.num) || ''}
                          onChange={(e) => handleAllocationChange(member.id, m.num, e.target.value)}
                          placeholder="0"
                          className="w-11 rounded-lg border border-[#EAE8E2] bg-white py-1 text-center text-xs font-mono text-[#1A1D1A] focus:border-[#6B8E78] focus:ring-1 focus:ring-[#6B8E78] focus:outline-none transition-all placeholder-slate-200"
                        />
                      </td>
                    ))}

                    {/* Total Annuel Collaborateur */}
                    <td className="p-3 text-right font-semibold font-mono text-[#1A1D1A]">
                      {totalAnnuel} j
                    </td>

                    {/* Sélecteur de statut de la demande */}
                    <td className="p-3">
                      <select
                        id={`status-select-${member.id}`}
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(member.id, e.target.value as MonthlyAllocation['status'])}
                        className={`rounded-lg border px-1.5 py-1 text-[10px] font-medium focus:outline-none cursor-pointer ${statusStyle.bgClass} ${statusStyle.textClass}`}
                      >
                        <option value="draft">Brouillon</option>
                        <option value="requested">Demandé</option>
                        <option value="approved">Validé</option>
                        <option value="rejected">Refusé</option>
                      </select>
                    </td>

                    {/* Suppression */}
                    <td className="p-3 text-center">
                      <button
                        id={`btn-delete-member-${member.id}`}
                        type="button"
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="rounded-lg p-1 text-[#737873] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Retirer la ressource"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}

            {/* LIGNE DES TOTAUX PAR MOIS (S'il y a des membres) */}
            {teamMembers.length > 0 && (
              <tr className="bg-[#FAF9F6]/60 border-t-2 border-[#FAF9F6] font-semibold">
                <td className="p-3 text-[#737873]">Sommes Mensuelles</td>
                {MONTH_LABELS.map((m) => {
                  const monthlyTotal = getMonthlyTotal(m.num);
                  return (
                    <td key={m.num} className="p-2 text-center font-mono text-[#1A1D1A]">
                      {monthlyTotal > 0 ? `${monthlyTotal}j` : '-'}
                    </td>
                  );
                })}
                <td className="p-3 text-right font-mono text-[#5D7C68]">
                  {getProjectAnnualTotal} j
                </td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SYNTHÈSE TRIMESTRIELLE POUR COPIER VERS LES OUTILS ENTREPRISE */}
      {teamMembers.length > 0 && (
        <div className="rounded-2xl border border-[#F0EFEB] bg-[#FAF9F6]/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-[#1A1D1A] flex items-center gap-1.5">
              <BarChart className="h-4 w-4 text-[#5D7C68]" />
              Synthèse Trimestrielle (Jours/Homme) pour demande d'outil entreprise
            </h4>
            
            <button
              id="btn-copy-quarterly"
              type="button"
              onClick={copyQuarterlySummaryToClipboard}
              className="flex items-center gap-1 rounded-lg border border-[#6B8E78]/30 bg-white px-2.5 py-1 text-[11px] font-medium text-[#5D7C68] hover:bg-[#6B8E78]/5 transition-all"
            >
              <Copy className="h-3 w-3" />
              {copiedSuccess || "Copier la synthèse"}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#F0EFEB] bg-white p-3 text-center">
              <span className="block text-[10px] text-[#737873] uppercase tracking-wider font-medium">Trimestre 1 (Q1)</span>
              <span className="text-base font-bold font-mono text-[#1A1D1A] mt-1 block">{quarterlyTotals.q1} j</span>
              <span className="text-[9px] text-[#737873]">Janv - Mars</span>
            </div>
            <div className="rounded-xl border border-[#F0EFEB] bg-white p-3 text-center">
              <span className="block text-[10px] text-[#737873] uppercase tracking-wider font-medium">Trimestre 2 (Q2)</span>
              <span className="text-base font-bold font-mono text-[#1A1D1A] mt-1 block">{quarterlyTotals.q2} j</span>
              <span className="text-[9px] text-[#737873]">Avril - Juin</span>
            </div>
            <div className="rounded-xl border border-[#F0EFEB] bg-white p-3 text-center">
              <span className="block text-[10px] text-[#737873] uppercase tracking-wider font-medium">Trimestre 3 (Q3)</span>
              <span className="text-base font-bold font-mono text-[#1A1D1A] mt-1 block">{quarterlyTotals.q3} j</span>
              <span className="text-[9px] text-[#737873]">Juil - Sept</span>
            </div>
            <div className="rounded-xl border border-[#F0EFEB] bg-white p-3 text-center">
              <span className="block text-[10px] text-[#737873] uppercase tracking-wider font-medium">Trimestre 4 (Q4)</span>
              <span className="text-base font-bold font-mono text-[#1A1D1A] mt-1 block">{quarterlyTotals.q4} j</span>
              <span className="text-[9px] text-[#737873]">Oct - Déc</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
