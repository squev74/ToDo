import React, { useMemo } from 'react';
import { Task, Projet, TimeEntry } from '../types';
import { 
  buildCfdMetrics, 
  buildCapacityVsTimesheetMetrics, 
  buildVelocityMetrics, 
  getStagnantTasksCount 
} from '../utils/analyticsHelpers';
import { CumulativeFlowChart } from '../components/charts/CumulativeFlowChart';
import { CapacityVsActualChart } from '../components/charts/CapacityVsActualChart';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckSquare, 
  Clock, 
  Layers, 
  Calendar,
  Sparkles,
  Inbox
} from 'lucide-react';

interface AnalyticsReportingViewProps {
  tasks: Task[];
  projects: Projet[];
  timesheets: TimeEntry[];
  activeSpaceId: string;
  activeSpaceName: string;
  onNavigateToTab?: (tab: 'tasks' | 'backlog' | 'timesheet' | 'archives') => void;
  userName?: string; // Nom de l'intervenant filtré (ex: "Sylvain")
}

export const AnalyticsReportingView: React.FC<AnalyticsReportingViewProps> = ({
  tasks = [],
  projects = [],
  timesheets = [],
  activeSpaceId,
  activeSpaceName,
  onNavigateToTab,
  userName = 'Sylvain'
}) => {
  // 1. Isoler et filtrer les données par espace courant
  const currentSpaceTasks = useMemo(() => tasks.filter(t => t.spaceId === activeSpaceId), [tasks, activeSpaceId]);
  
  // 2. Calculer les métriques du Cumulative Flow Diagram (CFD)
  const cfdData = useMemo(() => {
    return buildCfdMetrics(tasks, activeSpaceId);
  }, [tasks, activeSpaceId]);

  // 3. Calculer les métriques de capacité vs feuille de temps réelle
  const capacityMetrics = useMemo(() => {
    return buildCapacityVsTimesheetMetrics(projects, timesheets, activeSpaceId, tasks, userName);
  }, [projects, timesheets, activeSpaceId, tasks, userName]);

  // 4. Calculer la vélocité mensuelle (Derniers 6 mois)
  const velocityData = useMemo(() => {
    return buildVelocityMetrics(tasks, activeSpaceId);
  }, [tasks, activeSpaceId]);

  // 5. Calculer le volume de tâches stagnantes (> 14 jours)
  const stagnantCount = useMemo(() => {
    return getStagnantTasksCount(tasks, activeSpaceId);
  }, [tasks, activeSpaceId]);

  // 6. Statistiques générales additionnelles pour l'espace
  const generalStats = useMemo(() => {
    const activeTasks = currentSpaceTasks.filter(t => t.statut !== 'Done' && t.statut !== 'Cancelled');
    const closedTasks = currentSpaceTasks.filter(t => t.statut === 'Done' || t.statut === 'Cancelled');
    
    // Calcul de la durée moyenne de réalisation (Lead Time)
    let totalLeadTimeMs = 0;
    let countWithLeadTime = 0;

    closedTasks.forEach(task => {
      if (task.createdAt && task.dateRealisation) {
        const createTime = new Date(task.createdAt).getTime();
        const finishTime = new Date(task.dateRealisation).getTime();
        if (!isNaN(createTime) && !isNaN(finishTime) && finishTime >= createTime) {
          totalLeadTimeMs += (finishTime - createTime);
          countWithLeadTime++;
        }
      }
    });

    const averageLeadTimeDays = countWithLeadTime > 0 
      ? parseFloat((totalLeadTimeMs / (1000 * 60 * 60 * 24 * countWithLeadTime)).toFixed(1))
      : null;

    return {
      activeCount: activeTasks.length,
      closedCount: closedTasks.length,
      stagnantCount,
      averageLeadTimeDays
    };
  }, [currentSpaceTasks, stagnantCount]);

  // Calcul du SVG de vélocité mensuelle
  const maxVelocityVal = useMemo(() => {
    const vals = velocityData.flatMap(d => [d.created, d.closed]);
    const max = Math.max(...vals);
    return max === 0 ? 5 : max;
  }, [velocityData]);

  // Rendu graphique natif SVG pour la vélocité mensuelle
  const velocityChartWidth = 500;
  const velocityChartHeight = 180;
  const vPadding = { top: 15, right: 10, bottom: 30, left: 30 };
  const vChartW = velocityChartWidth - vPadding.left - vPadding.right;
  const vChartH = velocityChartHeight - vPadding.top - vPadding.bottom;

  return (
    <div className="space-y-6">
      {/* En-tête de la vue */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#F0EFEB] pb-4">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-[#1A1D1A]">
            Reporting &amp; Dashboard Opérationnel
          </h2>
          <p className="text-xs text-[#737873] font-light mt-1">
            Indicateurs clés et diagrammes analytiques pour l&apos;espace : <strong className="font-semibold text-[#6B8E78]">{activeSpaceName}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#737873] font-light bg-[#F9F8F6] px-3 py-1.5 rounded-xl border border-[#F0EFEB]">
          <Calendar className="w-3.5 h-3.5 text-[#6B8E78]" />
          <span>Fenêtre d&apos;analyse : 100 derniers jours</span>
        </div>
      </div>

      {/* Cartes KPI (Style Japandi épuré et sophistiqué) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Tâches Actives */}
        <div 
          onClick={() => onNavigateToTab?.('tasks')}
          className="bg-white rounded-2xl border border-[#F0EFEB] p-4 flex items-center gap-4 hover:border-[#6B8E78]/30 transition-all duration-300 cursor-pointer group"
        >
          <div className="h-10 w-10 rounded-xl bg-[#6B8E78]/10 text-[#6B8E78] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#737873] font-medium">Tâches Actives</span>
            <div className="text-xl font-bold text-[#1A1D1A] mt-0.5">{generalStats.activeCount}</div>
            <span className="text-[10px] text-[#A0A5A0] font-light">En cours de traitement</span>
          </div>
        </div>

        {/* KPI 2 : Tâches Stagnantes */}
        <div 
          onClick={() => onNavigateToTab?.('tasks')}
          className={`bg-white rounded-2xl border p-4 flex items-center gap-4 hover:border-amber-300 transition-all duration-300 cursor-pointer group ${
            generalStats.stagnantCount > 0 ? 'border-amber-100 bg-amber-50/20' : 'border-[#F0EFEB]'
          }`}
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
            generalStats.stagnantCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-[#737873]/10 text-[#737873]'
          }`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#737873] font-medium">Tâches Stagnantes</span>
            <div className={`text-xl font-bold mt-0.5 ${generalStats.stagnantCount > 0 ? 'text-amber-700' : 'text-[#1A1D1A]'}`}>
              {generalStats.stagnantCount}
            </div>
            <span className="text-[10px] text-[#A0A5A0] font-light">Sans activité &gt; 14 jours</span>
          </div>
        </div>

        {/* KPI 3 : Temps de Cycle Moyen */}
        <div className="bg-white rounded-2xl border border-[#F0EFEB] p-4 flex items-center gap-4 group">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#737873] font-medium">Temps de cycle</span>
            <div className="text-xl font-bold text-[#1A1D1A] mt-0.5">
              {generalStats.averageLeadTimeDays !== null ? `${generalStats.averageLeadTimeDays} j` : '—'}
            </div>
            <span className="text-[10px] text-[#A0A5A0] font-light">Moyenne de complétion</span>
          </div>
        </div>

        {/* KPI 4 : Tâches Clôturées */}
        <div 
          onClick={() => onNavigateToTab?.('archives')}
          className="bg-white rounded-2xl border border-[#F0EFEB] p-4 flex items-center gap-4 hover:border-amber-800/30 transition-all duration-300 cursor-pointer group"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#737873] font-medium">Clôturées</span>
            <div className="text-xl font-bold text-[#1A1D1A] mt-0.5">{generalStats.closedCount}</div>
            <span className="text-[10px] text-[#A0A5A0] font-light">Terminées / Annulées</span>
          </div>
        </div>
      </div>

      {/* Rangée de graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CFD : Cumulative Flow Diagram (9 colonnes sur lg) */}
        <div className="lg:col-span-7">
          <CumulativeFlowChart data={cfdData} />
        </div>

        {/* Capacitaire vs Réel (5 colonnes sur lg) */}
        <div className="lg:col-span-5">
          <CapacityVsActualChart metrics={capacityMetrics} userName={userName} />
        </div>
      </div>

      {/* Deuxième rangée : Vélocité Mensuelle */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Graphique de Vélocité (8 colonnes) */}
        <div className="bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] md:col-span-8 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#737873]">Vélocité de Production</h4>
            <p className="text-[11px] font-light text-[#A0A5A0] mt-0.5">Nombre de tâches créées vs fermées sur les 6 derniers mois</p>
          </div>

          <div className="mt-5 relative">
            <svg viewBox={`0 0 ${velocityChartWidth} ${velocityChartHeight}`} className="w-full h-auto overflow-visible select-none">
              {/* Grilles horizontales */}
              {[0, 1, 2, 3, 4].map((stepIdx) => {
                const tickVal = Math.round((maxVelocityVal / 4) * stepIdx);
                const y = vPadding.top + vChartH - (tickVal / maxVelocityVal) * vChartH;
                return (
                  <g key={stepIdx} className="opacity-40">
                    <line 
                      x1={vPadding.left} 
                      y1={y} 
                      x2={velocityChartWidth - vPadding.right} 
                      y2={y} 
                      stroke="#F0EFEB" 
                      strokeWidth={1} 
                      strokeDasharray="2 2"
                    />
                    <text 
                      x={vPadding.left - 6} 
                      y={y + 3} 
                      textAnchor="end" 
                      className="text-[9px] font-light fill-[#737873]"
                    >
                      {tickVal}
                    </text>
                  </g>
                );
              })}

              {/* Rendu des bâtons groupés (Created / Closed) */}
              {velocityData.map((d, idx) => {
                const stepX = vChartW / velocityData.length;
                const groupX = vPadding.left + idx * stepX + stepX * 0.15;
                const barWidth = stepX * 0.3;

                // Hauteur créée
                const hCreated = (d.created / maxVelocityVal) * vChartH;
                const yCreated = vPadding.top + vChartH - hCreated;

                // Hauteur fermée
                const hClosed = (d.closed / maxVelocityVal) * vChartH;
                const yClosed = vPadding.top + vChartH - hClosed;

                return (
                  <g key={d.monthKey}>
                    {/* Bâton Tâches Créées */}
                    <rect 
                      x={groupX} 
                      y={yCreated} 
                      width={barWidth} 
                      height={Math.max(hCreated, 1)} // Au moins 1px pour visibilité
                      fill="#C89B7B" 
                      rx={1.5}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                    {/* Libellé de valeur au-dessus */}
                    {d.created > 0 && (
                      <text 
                        x={groupX + barWidth / 2} 
                        y={yCreated - 4} 
                        textAnchor="middle" 
                        className="text-[8px] font-medium fill-[#C89B7B]"
                      >
                        {d.created}
                      </text>
                    )}

                    {/* Bâton Tâches Fermées */}
                    <rect 
                      x={groupX + barWidth + 2} 
                      y={yClosed} 
                      width={barWidth} 
                      height={Math.max(hClosed, 1)} 
                      fill="#6B8E78" 
                      rx={1.5}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                    {/* Libellé de valeur au-dessus */}
                    {d.closed > 0 && (
                      <text 
                        x={groupX + barWidth * 1.5 + 2} 
                        y={yClosed - 4} 
                        textAnchor="middle" 
                        className="text-[8px] font-medium fill-[#6B8E78]"
                      >
                        {d.closed}
                      </text>
                    )}

                    {/* Libellé de l'axe X (Mois) */}
                    <text 
                      x={groupX + barWidth + 1} 
                      y={vPadding.top + vChartH + 15} 
                      textAnchor="middle" 
                      className="text-[9px] font-light fill-[#737873]"
                    >
                      {d.monthLabel}
                    </text>
                  </g>
                );
              })}

              {/* Ligne d'axe X */}
              <line 
                x1={vPadding.left} 
                y1={vPadding.top + vChartH} 
                x2={velocityChartWidth - vPadding.right} 
                y2={vPadding.top + vChartH} 
                stroke="#D3CFC8" 
                strokeWidth={1}
              />
            </svg>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0EFEB] flex items-center justify-between text-[10px] text-[#737873]">
            <div className="flex gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1.5 rounded-sm bg-[#C89B7B]" /> Nouvelles tâches créées
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1.5 rounded-sm bg-[#6B8E78]" /> Tâches clôturées/annulées
              </span>
            </div>
            <span className="font-light">Mise à jour temps réel</span>
          </div>
        </div>

        {/* Conseil / Recommandations d'organisation (4 colonnes) */}
        <div className="bg-[#6B8E78]/5 rounded-2xl border border-[#6B8E78]/15 p-5 md:col-span-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#6B8E78]">
              <Sparkles className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-semibold tracking-wider uppercase">Conseils PMO Proactifs</h4>
            </div>

            <div className="space-y-2.5 text-xs text-[#1A1D1A] font-light leading-relaxed">
              {generalStats.stagnantCount > 0 ? (
                <p>
                  Attention, vous avez <strong className="font-semibold text-amber-700">{generalStats.stagnantCount} tâche(s) stagnante(s)</strong> sans mise à jour depuis plus de 14 jours dans l&apos;espace courant. Nous vous suggérons d&apos;organiser un point d&apos;avancement ou de les replacer dans le <span className="font-medium text-[#6B8E78] underline cursor-pointer" onClick={() => onNavigateToTab?.('backlog')}>Backlog</span> si elles ne sont plus prioritaires.
                </p>
              ) : (
                <p>
                  Bravo ! Votre tableau de bord est impeccable : <strong className="font-semibold text-[#6B8E78]">aucune tâche stagnante</strong> n&apos;est à déplorer dans cet espace. Les flux de travail de vos projets circulent de façon saine et régulière.
                </p>
              )}

              {capacityMetrics.some(m => m.percentage > 100) ? (
                <p>
                  Certains projets affichent un <strong className="font-semibold text-rose-600">taux de consommation capacitaire supérieur à 100%</strong>. Le volume d&apos;heures réelles saisies dépasse les prévisions allouées. Pensez à réévaluer les effectifs ou le périmètre de ces livrables.
                </p>
              ) : capacityMetrics.length > 0 ? (
                <p>
                  Les charges de travail de vos collaborateurs sur vos différents projets sont saines et restent à l&apos;intérieur des budgets d&apos;allocation définis pour ce trimestre.
                </p>
              ) : null}

              {generalStats.averageLeadTimeDays && generalStats.averageLeadTimeDays > 10 ? (
                <p>
                  Le cycle de vie moyen d&apos;une tâche est de <strong className="font-medium text-indigo-600">{generalStats.averageLeadTimeDays} jours</strong>. Pour accélérer la vélocité, envisagez de découper vos tâches les plus complexes en sous-tâches plus digestes et granulaires.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#6B8E78]/15">
            <button
              onClick={() => onNavigateToTab?.('tasks')}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[#6B8E78] hover:bg-[#5d7c68] text-[11px] font-medium text-white shadow-sm transition-all duration-300"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Gérer les tâches actives</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
