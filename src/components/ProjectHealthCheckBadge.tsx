import React, { useMemo } from 'react';
import { 
  Sun, 
  CloudSun, 
  CloudRain, 
  CloudLightning, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  CheckCircle2 
} from 'lucide-react';
import { Projet, Tache } from '../types';
import { generateProjectAlerts, PmoAlert } from '../utils/pmoHealthCheck';

interface ProjectHealthCheckBadgeProps {
  projectId: string;
  projects: Projet[];
  tasks: Tache[];
  currentDateStr?: string;
}

export const ProjectHealthCheckBadge: React.FC<ProjectHealthCheckBadgeProps> = ({
  projectId,
  projects,
  tasks,
  currentDateStr,
}) => {
  const alerts = useMemo(() => {
    return generateProjectAlerts(projectId, projects, tasks, currentDateStr);
  }, [projectId, projects, tasks, currentDateStr]);

  // Déterminer la météo du projet en fonction des alertes
  const weather = useMemo(() => {
    const critical = alerts.filter((a) => a.severity === 'critical').length;
    const warning = alerts.filter((a) => a.severity === 'warning').length;

    if (critical >= 2) {
      return {
        label: 'Orageux',
        description: 'Dérives majeures à adresser en priorité.',
        icon: CloudLightning,
        colorClass: 'bg-rose-50 border-rose-200 text-rose-700',
        iconClass: 'text-rose-600 animate-bounce',
      };
    } else if (critical === 1 || warning >= 2) {
      return {
        label: 'Pluvieux',
        description: 'Plusieurs points de blocage ou retards actifs.',
        icon: CloudRain,
        colorClass: 'bg-amber-50 border-amber-200 text-amber-700',
        iconClass: 'text-amber-600',
      };
    } else if (warning === 1 || alerts.length > 0) {
      return {
        label: 'Variable',
        description: 'Quelques points de vigilance mineurs.',
        icon: CloudSun,
        colorClass: 'bg-sky-50 border-sky-200 text-sky-700',
        iconClass: 'text-sky-600',
      };
    } else {
      return {
        label: 'Ensoleillé',
        description: 'Toutes les métriques de gouvernance sont au vert.',
        icon: Sun,
        colorClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        iconClass: 'text-emerald-600 spin-slow',
      };
    }
  }, [alerts]);

  const getSeverityStyles = (severity: PmoAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return { text: 'text-rose-800 bg-rose-100/50 border-rose-200', icon: AlertOctagon };
      case 'warning':
        return { text: 'text-amber-800 bg-amber-100/50 border-amber-200', icon: AlertTriangle };
      case 'info':
        return { text: 'text-sky-800 bg-sky-100/50 border-sky-200', icon: Info };
    }
  };

  const WeatherIcon = weather.icon;

  return (
    <div className="rounded-2xl border border-[#EAE8E2] bg-[#FAF9F6] p-4 space-y-3.5 shadow-sm hover:shadow-md transition-all duration-300">
      {/* SECTION MÉTÉO PRINCIPALE */}
      <div className={`flex items-center justify-between rounded-xl border p-3 bg-white ${weather.colorClass}`}>
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-black/5`}>
            <WeatherIcon className={`h-6 w-6 ${weather.iconClass}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Météo PMO</span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <strong className="text-xs font-bold leading-none">{weather.label}</strong>
            </div>
            <p className="text-[10.5px] leading-relaxed mt-0.5 opacity-80 font-light">{weather.description}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xl font-extrabold leading-none tracking-tight">{alerts.length}</span>
          <span className="block text-[8px] font-semibold uppercase tracking-wider opacity-60">Sujet{alerts.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* RAPPELS COMPLETS DES ALERTES SI EXISTANTES */}
      {alerts.length > 0 ? (
        <div className="space-y-1.5">
          <h4 className="text-[9px] font-bold text-[#737873] uppercase tracking-wider px-1">Alertes & Vigilances ({alerts.length})</h4>
          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const styles = getSeverityStyles(alert.severity);
              const AlertIcon = styles.icon;

              return (
                <div 
                  key={alert.id}
                  className={`flex items-start gap-2 rounded-lg border p-2 text-[10.5px] leading-relaxed font-medium transition-colors ${styles.text}`}
                >
                  <AlertIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-85" />
                  <span>{alert.message.replace(/\[.*?\]\s*/, '')}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-[#6B8E78]/20 bg-[#6B8E78]/5 p-2.5 text-[#5D7C68] text-[10.5px]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Aucune anomalie détectée sur ce projet. Tout est conforme !</span>
        </div>
      )}
    </div>
  );
};
