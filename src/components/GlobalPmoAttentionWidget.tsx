import React, { useState, useMemo } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Clock, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Folder 
} from 'lucide-react';
import { PmoAlert } from '../utils/pmoHealthCheck';

interface GlobalPmoAttentionWidgetProps {
  alerts: PmoAlert[];
  onNavigateToTab?: (tab: 'tasks' | 'backlog' | 'report' | 'timesheet' | 'archives' | 'knowledge') => void;
  onSelectProject?: (projectId: string) => void;
}

export const GlobalPmoAttentionWidget: React.FC<GlobalPmoAttentionWidgetProps> = ({
  alerts,
  onNavigateToTab,
  onSelectProject,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'timesheet' | 'delay' | 'stagnant' | 'capacity' | 'raid' | 'deliverable'>('all');

  // Comptages rapides
  const stats = useMemo(() => {
    const critical = alerts.filter((a) => a.severity === 'critical').length;
    const warning = alerts.filter((a) => a.severity === 'warning').length;
    const info = alerts.filter((a) => a.severity === 'info').length;
    const total = alerts.length;
    return { critical, warning, info, total };
  }, [alerts]);

  // Filtrage local
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchSev = activeSeverityFilter === 'all' || alert.severity === activeSeverityFilter;
      const matchCat = activeCategoryFilter === 'all' || alert.category === activeCategoryFilter;
      return matchSev && matchCat;
    });
  }, [alerts, activeSeverityFilter, activeCategoryFilter]);

  const getSeverityStyles = (severity: PmoAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-rose-50/75 border-rose-100',
          text: 'text-rose-800',
          icon: AlertOctagon,
          iconColor: 'text-rose-600',
          badge: 'bg-rose-100 text-rose-800',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/75 border-amber-100',
          text: 'text-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-800',
        };
      case 'info':
        return {
          bg: 'bg-sky-50/75 border-sky-100',
          text: 'text-sky-800',
          icon: Info,
          iconColor: 'text-sky-600',
          badge: 'bg-sky-100 text-sky-800',
        };
    }
  };

  const getCategoryIcon = (category: PmoAlert['category']) => {
    switch (category) {
      case 'timesheet': return Clock;
      case 'delay': return Calendar;
      case 'stagnant': return Activity;
      case 'capacity': return TrendingUp;
      case 'raid': return AlertOctagon;
      case 'deliverable': return Folder;
    }
  };

  const handleAlertAction = (alert: PmoAlert) => {
    if (alert.projectId && onSelectProject) {
      onSelectProject(alert.projectId);
    }
    if (alert.actionTab && onNavigateToTab) {
      // Cas particulier : si l'action redirige vers les tâches, on force l'onglet
      if (alert.actionTab === 'timesheet') {
        onNavigateToTab('timesheet');
      } else if (alert.actionTab === 'tasks') {
        onNavigateToTab('tasks');
      }
    }
  };

  return (
    <div className="rounded-3xl border border-[#EAE8E2] bg-white transition-all duration-300 hover:shadow-[0_4px_24px_rgba(107,142,120,0.04)] overflow-hidden">
      {/* EN-TÊTE DU PANNEAU */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-5 bg-[#FAF9F6] border-b border-[#F0EFEB] cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-[#6B8E78]/10 text-[#5D7C68] border border-[#6B8E78]/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1D1A] tracking-tight">PMO Health Check</h3>
            <p className="text-[11px] text-[#737873] font-light">Analyse proactive de la santé de vos projets & ressources</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* BADGES SYNTHÉTIQUES */}
          <div className="flex items-center gap-1.5">
            {stats.critical > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                {stats.critical} Critique{stats.critical > 1 ? 's' : ''}
              </span>
            )}
            {stats.warning > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                {stats.warning} Alerte{stats.warning > 1 ? 's' : ''}
              </span>
            )}
            {stats.info > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100">
                {stats.info} Info{stats.info > 1 ? 's' : ''}
              </span>
            )}
            {stats.total === 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold bg-[#6B8E78]/10 text-[#5D7C68] border border-[#6B8E78]/20 animate-pulse">
                <CheckCircle className="h-3 w-3" />
                Sain & Conforme
              </span>
            )}
          </div>
          <button type="button" className="text-[#737873] hover:text-[#1A1D1A] p-1">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4 animate-in fade-in duration-300">
          {stats.total > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b border-[#F0EFEB]">
              {/* FILTRES PAR SÉVÉRITÉ */}
              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveSeverityFilter('all')}
                  className={`px-3 py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                    activeSeverityFilter === 'all'
                      ? 'bg-[#1A1D1A] text-white'
                      : 'bg-[#FAF9F6] text-[#737873] hover:bg-[#F0EFEB]'
                  }`}
                >
                  Tous ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeverityFilter('critical')}
                  className={`px-3 py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                    activeSeverityFilter === 'critical'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Critiques ({stats.critical})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeverityFilter('warning')}
                  className={`px-3 py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                    activeSeverityFilter === 'warning'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Avertissements ({stats.warning})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeverityFilter('info')}
                  className={`px-3 py-1 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                    activeSeverityFilter === 'info'
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  Infos ({stats.info})
                </button>
              </div>

              {/* SEPARATEUR SUR DESKTOP */}
              <div className="hidden sm:block h-4 w-px bg-slate-200" />

              {/* FILTRES PAR CATÉGORIE */}
              <div className="flex flex-wrap gap-1">
                <select
                  value={activeCategoryFilter}
                  onChange={(e) => setActiveCategoryFilter(e.target.value as any)}
                  className="rounded-xl border border-[#EAE8E2] bg-[#FAF9F6] px-2.5 py-1 text-[10px] text-[#737873] focus:border-[#6B8E78] focus:outline-none"
                >
                  <option value="all">Toutes catégories</option>
                  <option value="timesheet">Feuille de temps</option>
                  <option value="delay">Tâches en retard</option>
                  <option value="stagnant">Tâches stagnantes</option>
                  <option value="capacity">Capacité planning</option>
                  <option value="raid">RAID Log</option>
                  <option value="deliverable">Livrables</option>
                </select>
              </div>
            </div>
          )}

          {/* LISTE DES ALERTES */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed border-[#EAE8E2] bg-[#FAF9F6]/30">
                <CheckCircle className="mx-auto h-8 w-8 text-[#5D7C68]/50 stroke-[1.5] mb-2" />
                <p className="text-xs font-semibold text-[#1A1D1A]">Aucune alerte à afficher</p>
                <p className="text-[10px] text-[#737873] mt-0.5 font-light">Le portefeuille respecte les exigences de gouvernance PMO.</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const styles = getSeverityStyles(alert.severity);
                const Icon = styles.icon;
                const CatIcon = getCategoryIcon(alert.category);

                return (
                  <div 
                    key={alert.id}
                    className={`flex items-start justify-between rounded-2xl border p-3.5 ${styles.bg} transition-all hover:translate-x-0.5 duration-200`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 ${styles.iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-slate-800 leading-relaxed">
                            {alert.message}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {CatIcon && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-[#737873] font-medium uppercase tracking-wider bg-white/80 px-1.5 py-0.5 rounded border border-[#EAE8E2]">
                              <CatIcon className="h-3 w-3" />
                              {alert.category}
                            </span>
                          )}
                          {alert.projectCode && (
                            <span className="inline-flex items-center text-[9px] text-slate-700 font-bold bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200">
                              {alert.projectCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {(alert.projectId || alert.actionTab) && (
                      <button
                        type="button"
                        onClick={() => handleAlertAction(alert)}
                        className="ml-3 p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-500 hover:text-[#1A1D1A] shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
                        title="Résoudre le problème"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
