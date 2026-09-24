import React from 'react';
import { CapacityVsTimesheetMetric } from '../../utils/analyticsHelpers';
import { Award, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface CapacityVsActualChartProps {
  metrics: CapacityVsTimesheetMetric[];
}

export const CapacityVsActualChart: React.FC<CapacityVsActualChartProps> = ({ metrics }) => {
  const hasMetrics = metrics && metrics.length > 0;

  if (!hasMetrics) {
    return (
      <div className="flex items-center justify-center h-48 border border-dashed border-[#F0EFEB] rounded-2xl bg-white text-xs text-[#737873]">
        Aucun projet avec planification capacitaire ou imputer d&apos;heures sur les 100 derniers jours.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#737873]">Saisie Réelle vs Plan Capacitaire</h4>
            <p className="text-[11px] font-light text-[#A0A5A0] mt-0.5">Imputations réelles (heures) comparées au plan de charge sur 100 jours</p>
          </div>
        </div>

        <div className="space-y-4">
          {metrics.map((metric) => {
            const isOverloaded = metric.percentage > 100;
            const isNoAllocation = metric.allocatedHours === 0;
            
            // Calculer le pourcentage d'affichage (plafonnier à 100 pour la barre principale, ou afficher l'excès)
            const displayPercentage = Math.min(metric.percentage, 100);
            const overflowPercentage = metric.percentage > 100 ? Math.min(metric.percentage - 100, 100) : 0;

            return (
              <div key={metric.projectId} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  {/* Nom du projet avec sa puce de couleur */}
                  <div className="flex items-center gap-2 font-medium text-[#1A1D1A]">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: metric.projectColor }}
                    />
                    <span className="truncate max-w-[180px]" title={metric.projectName}>
                      {metric.projectName}
                    </span>
                  </div>

                  {/* Valeurs numériques et ratio */}
                  <div className="text-[11px] text-[#737873] font-light flex items-center gap-1.5">
                    <span>Réel : <strong className="font-semibold text-[#1A1D1A]">{metric.actualHours}h</strong></span>
                    <span className="text-[#D3CFC8]">/</span>
                    <span>Alloué : <strong className="font-medium text-[#1A1D1A]">{metric.allocatedHours}h</strong></span>
                  </div>
                </div>

                {/* Double barre de charge bicolore (Style Japandi minimaliste) */}
                <div className="relative">
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

                  {/* Badge d'avertissement ou de validation au bout de la ligne */}
                  <div className="absolute right-0 -top-5 flex items-center gap-1 text-[10px] font-medium">
                    {isNoAllocation ? (
                      <span className="text-[#9CA3AF] font-light">Sans cap.</span>
                    ) : isOverloaded ? (
                      <span className="text-rose-600 inline-flex items-center gap-0.5 font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>+{metric.percentage - 100}%</span>
                      </span>
                    ) : (
                      <span className="text-[#5D7C68] inline-flex items-center gap-0.5 font-medium">
                        <CheckCircle className="w-3 h-3 text-[#6B8E78]" />
                        <span>{metric.percentage}%</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende bas de composant pour explications */}
      <div className="mt-5 border-t border-[#F0EFEB] pt-3 flex items-center justify-between text-[10px] text-[#737873]">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#6B8E78]" /> Consommation saine (≤100%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Dépassement de capacité
          </span>
        </div>
        <div className="font-light">
          1 jour de plan = 8 heures
        </div>
      </div>
    </div>
  );
};
