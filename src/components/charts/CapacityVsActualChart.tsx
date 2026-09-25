import React from 'react';
import { CapacityVsTimesheetMetric } from '../../utils/analyticsHelpers';
import { Award, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface CapacityVsActualChartProps {
  metrics: CapacityVsTimesheetMetric[];
  userName?: string; // Nom de l'intervenant filtré (ex: "Sylvain")
}

export const CapacityVsActualChart: React.FC<CapacityVsActualChartProps> = ({ metrics, userName = 'Sylvain' }) => {
  const hasMetrics = metrics && metrics.length > 0;
  const displayUserName = userName && userName.trim() !== '' ? userName : 'Intervenant non défini';

  if (!hasMetrics) {
    return (
      <div className="flex items-center justify-center h-48 border border-dashed border-[#F0EFEB] rounded-2xl bg-white text-xs text-[#737873]">
        Aucun projet avec planification capacitaire ou imputer d&apos;heures sur les 100 derniers jours pour {displayUserName}.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#737873]">Saisie Réelle vs Plan Capacitaire</h4>
            <p className="text-[11px] font-light text-[#A0A5A0] mt-0.5">Imputations de {displayUserName} comparées à son plan de charge sur 100 jours</p>
          </div>
        </div>

        <div className="space-y-4">
          {metrics.map((metric) => {
            const isOverloaded = metric.percentage > 100;
            const isNoAllocation = metric.allocatedHours === 0;
            
            // Calculer le pourcentage d'affichage (plafonnier à 100 pour la barre principale, ou afficher l'excès)
            const displayPercentage = Math.min(metric.percentage, 100);
            const overflowPercentage = metric.percentage > 100 ? Math.min(metric.percentage - 100, 100) : 0;

            const allocatedDays = (metric.allocatedHours / 8).toFixed(1);

            return (
              <div key={metric.projectId} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  {/* Nom du projet avec sa puce de couleur */}
                  <div className="flex items-center gap-2 font-medium text-[#1A1D1A] min-w-0 flex-1 mr-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: metric.projectColor }}
                    />
                    <span className="truncate max-w-[150px] sm:max-w-[200px]" title={metric.projectName}>
                      {metric.projectName}
                    </span>
                  </div>

                  {/* Valeurs numériques, ratio et badge de statut alignés */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-[11px] text-[#737873] font-light flex flex-col text-right">
                      <div>
                        Réel : <strong className="font-semibold text-[#1A1D1A]">{metric.actualHours}h</strong>
                        <span className="mx-1 text-[#D3CFC8]">/</span>
                        Alloué : <strong className="font-medium text-[#1A1D1A]">{metric.allocatedHours}h</strong>
                      </div>
                      {!isNoAllocation && (
                        <div className="text-[9px] text-[#A0A5A0] font-light">
                          (soit {allocatedDays} jours × 8h)
                        </div>
                      )}
                    </div>

                    {/* Badge de statut capacitaire en ligne (plus de superposition !) */}
                    <div className="flex items-center shrink-0">
                      {isNoAllocation ? (
                        <span className="text-[10px] text-[#9CA3AF] font-light bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">Sans cap.</span>
                      ) : isOverloaded ? (
                        <span className="text-[10px] text-rose-600 inline-flex items-center gap-0.5 font-semibold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>+{metric.percentage - 100}%</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#5D7C68] inline-flex items-center gap-0.5 font-medium bg-[#6B8E78]/10 border border-[#6B8E78]/20 px-1.5 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3 text-[#6B8E78]" />
                          <span>{metric.percentage}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Double barre de charge bicolore (Style Japandi minimaliste) */}
                <div className="relative pt-1">
                  <div className="w-full h-3 rounded-full bg-[#F0EFEB] overflow-hidden flex">
                    {/* Barre principale sous-allouée ou pile-poil */}
                    <div 
                      className={`h-full transition-all duration-500 rounded-l-full ${
                        isOverloaded ? 'bg-[#C89B7B]' : 'bg-[#6B8E78]'
                      }`}
                      style={{ width: `${displayPercentage}%` }}
                    />
                    
                    {/* Barre d'excès / dépassement si > 100% */}
                    {overflowPercentage > 0 && (
                      <div 
                        className="h-full bg-rose-500 transition-all duration-500 rounded-r-full animate-pulse"
                        style={{ width: `${overflowPercentage}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende bas de composant pour explications */}
      <div className="mt-5 border-t border-[#F0EFEB] pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-[#737873]">
        <div className="flex gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#6B8E78]" /> Consommation saine (≤100%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Dépassement de capacité pour {displayUserName}
          </span>
        </div>
        <div className="font-light shrink-0 text-right">
          1 jour de plan = 8 heures • Données filtrées pour : <strong>{displayUserName}</strong>
        </div>
      </div>
    </div>
  );
};
