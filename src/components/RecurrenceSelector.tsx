import React from 'react';
import { Repeat, Check, Calendar, HelpCircle } from 'lucide-react';
import { RecurrenceConfig, RecurrenceFrequency, DAYS_OF_WEEK } from '../types/recurringTask';

interface RecurrenceSelectorProps {
  config: RecurrenceConfig;
  onChange: (newConfig: RecurrenceConfig) => void;
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string; desc: string }[] = [
  { value: 'daily', label: 'Quotidien', desc: 'Répéter chaque jour' },
  { value: 'workdays', label: 'Jours ouvrés', desc: 'Lundi au vendredi' },
  { value: 'weekly', label: 'Hebdomadaire', desc: 'Chaque semaine' },
  { value: 'monthly', label: 'Mensuel', desc: 'Chaque mois' },
  { value: 'quarterly', label: 'Trimestriel', desc: 'Chaque trimestre' },
  { value: 'yearly', label: 'Annuel', desc: 'Chaque année' },
];

const SPECIFIC_DAY_INDEXES = [
  { value: 'first', label: 'Premier' },
  { value: 'second', label: 'Deuxième' },
  { value: 'third', label: 'Troisième' },
  { value: 'last', label: 'Dernier' },
];

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({ config, onChange }) => {
  const {
    frequency,
    interval,
    quarterlyOption = 'same_day',
    dayOfWeek = 1,
    dayOfMonth = 1,
    specificDayIndex = 'first',
    specificDayWeek = 1,
  } = config;

  const handleFrequencyChange = (freq: RecurrenceFrequency) => {
    const newConfig: RecurrenceConfig = {
      ...config,
      frequency: freq,
    };
    
    // Valeurs par défaut appropriées pour chaque fréquence
    if (freq === 'weekly' && config.dayOfWeek === undefined) {
      newConfig.dayOfWeek = 1; // Lundi
    } else if (freq === 'monthly' && config.dayOfMonth === undefined) {
      newConfig.dayOfMonth = 1;
    } else if (freq === 'quarterly') {
      newConfig.quarterlyOption = 'same_day';
      newConfig.dayOfMonth = config.dayOfMonth || 1;
      newConfig.specificDayIndex = 'first';
      newConfig.specificDayWeek = 1; // Lundi
    }
    
    onChange(newConfig);
  };

  const handleIntervalChange = (val: number) => {
    const safeVal = Math.max(1, Math.min(99, isNaN(val) ? 1 : val));
    onChange({
      ...config,
      interval: safeVal,
    });
  };

  const updateConfigField = (field: keyof RecurrenceConfig, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  // Libellé de l'intervalle selon la fréquence
  const getIntervalLabel = () => {
    switch (frequency) {
      case 'daily':
        return interval === 1 ? 'jour' : 'jours';
      case 'workdays':
        return 'jour ouvré';
      case 'weekly':
        return interval === 1 ? 'semaine' : 'semaines';
      case 'monthly':
        return interval === 1 ? 'mois' : 'mois';
      case 'quarterly':
        return interval === 1 ? 'trimestre' : 'trimestres';
      case 'yearly':
        return interval === 1 ? 'an' : 'ans';
      default:
        return 'périodes';
    }
  };

  return (
    <div className="space-y-4" id="recurrence-selector-root">
      {/* 1. Sélection de la fréquence */}
      <div>
        <label className="block text-xs font-medium text-[#737873] mb-2">
          Fréquence de la récurrence <span className="text-[#C89B7B]">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" id="recurrence-frequency-grid">
          {FREQUENCY_OPTIONS.map((opt) => {
            const isSelected = frequency === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFrequencyChange(opt.value)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'border-[#6B8E78] bg-[#6B8E78]/5 text-[#4e634a] ring-1 ring-[#6B8E78]'
                    : 'border-[#F0EFEB] bg-white text-[#737873] hover:border-[#E2DFD8] hover:text-[#1A1D1A]'
                }`}
                id={`freq-btn-${opt.value}`}
              >
                <span className="text-xs font-medium">{opt.label}</span>
                <span className="text-[9px] opacity-80 mt-0.5 leading-none hidden sm:inline">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Intervalle numérique */}
      {frequency !== 'workdays' && (
        <div className="flex items-center gap-3 bg-[#F9F8F6]/40 p-3 rounded-xl border border-[#F0EFEB] w-fit">
          <span className="text-xs text-[#737873] font-medium">Répéter tous les :</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
              className="w-14 text-center rounded-lg border border-[#F0EFEB] bg-white px-2 py-1 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden focus:ring-1 focus:ring-[#6B8E78]/15"
              id="recurrence-interval-input"
            />
            <span className="text-xs font-medium text-[#1A1D1A]">{getIntervalLabel()}</span>
          </div>
        </div>
      )}

      {/* 3. Options complémentaires selon fréquence */}
      {frequency === 'weekly' && (
        <div className="p-3.5 bg-white border border-[#F0EFEB] rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <label className="block text-xs font-medium text-[#737873]">
            Répéter quel jour de la semaine ?
          </label>
          <div className="flex flex-wrap gap-1">
            {DAYS_OF_WEEK.map((d) => {
              const isSelected = dayOfWeek === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => updateConfigField('dayOfWeek', d.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border ${
                    isSelected
                      ? 'bg-[#6B8E78] text-white border-[#6B8E78]'
                      : 'bg-white text-[#1A1D1A] border-[#F0EFEB] hover:bg-[#F9F8F6]'
                  }`}
                  id={`weekly-day-btn-${d.value}`}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {frequency === 'monthly' && (
        <div className="p-3.5 bg-white border border-[#F0EFEB] rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <label htmlFor="monthly-day-select" className="text-xs font-medium text-[#737873]">
            Répéter le jour du mois :
          </label>
          <select
            id="monthly-day-select"
            value={dayOfMonth}
            onChange={(e) => updateConfigField('dayOfMonth', parseInt(e.target.value, 10))}
            className="rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1er du mois' : `${n}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {frequency === 'quarterly' && (
        <div className="p-4 bg-white border border-[#F0EFEB] rounded-xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#737873]">
              Méthode de ciblage trimestriel
            </label>
            <div className="grid grid-cols-2 gap-2" id="quarterly-option-radios">
              <button
                type="button"
                onClick={() => updateConfigField('quarterlyOption', 'same_day')}
                className={`text-left rounded-xl border p-3 transition-all flex items-start gap-2.5 ${
                  quarterlyOption === 'same_day'
                    ? 'border-[#6B8E78] bg-[#6B8E78]/5 ring-1 ring-[#6B8E78]'
                    : 'border-[#F0EFEB] bg-white hover:border-[#E2DFD8]'
                }`}
                id="quarterly-opt-same-day"
              >
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  quarterlyOption === 'same_day' ? 'border-[#6B8E78] bg-[#6B8E78]' : 'border-[#C89B7B]'
                }`}>
                  {quarterlyOption === 'same_day' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="block text-xs font-medium text-[#1A1D1A]">Même jour du mois</span>
                  <span className="block text-[10px] text-[#737873] mt-0.5 leading-tight font-light">
                    Ex : Le 15 de chaque trimestre (s'ajuste si fin de mois court)
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateConfigField('quarterlyOption', 'specific_day')}
                className={`text-left rounded-xl border p-3 transition-all flex items-start gap-2.5 ${
                  quarterlyOption === 'specific_day'
                    ? 'border-[#6B8E78] bg-[#6B8E78]/5 ring-1 ring-[#6B8E78]'
                    : 'border-[#F0EFEB] bg-white hover:border-[#E2DFD8]'
                }`}
                id="quarterly-opt-specific-day"
              >
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  quarterlyOption === 'specific_day' ? 'border-[#6B8E78] bg-[#6B8E78]' : 'border-[#C89B7B]'
                }`}>
                  {quarterlyOption === 'specific_day' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="block text-xs font-medium text-[#1A1D1A]">Jour spécifique</span>
                  <span className="block text-[10px] text-[#737873] mt-0.5 leading-tight font-light">
                    Ex : Le premier lundi ou dernier vendredi du trimestre
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Options de ciblage complémentaires */}
          {quarterlyOption === 'same_day' ? (
            <div className="flex items-center gap-3 pt-3 border-t border-[#F0EFEB] animate-in fade-in duration-100">
              <label htmlFor="quarterly-day-select" className="text-xs font-medium text-[#737873]">
                Quel jour du mois cibler ?
              </label>
              <select
                id="quarterly-day-select"
                value={dayOfMonth}
                onChange={(e) => updateConfigField('dayOfMonth', parseInt(e.target.value, 10))}
                className="rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? '1er du mois' : `Le ${n}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="pt-3 border-t border-[#F0EFEB] animate-in fade-in duration-100">
              <span className="block text-xs font-medium text-[#737873] mb-2">
                Définir le jour précis :
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs text-[#737873]">Le :</span>
                  <select
                    id="quarterly-index-select"
                    value={specificDayIndex}
                    onChange={(e) => updateConfigField('specificDayIndex', e.target.value)}
                    className="flex-1 rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden"
                  >
                    {SPECIFIC_DAY_INDEXES.map((idx) => (
                      <option key={idx.value} value={idx.value}>
                        {idx.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs text-[#737873] sm:hidden">De la semaine :</span>
                  <select
                    id="quarterly-week-day-select"
                    value={specificDayWeek}
                    onChange={(e) => updateConfigField('specificDayWeek', parseInt(e.target.value, 10))}
                    className="flex-1 rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1.5 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-[#737873] hidden sm:inline">du trimestre</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {frequency === 'yearly' && (
        <div className="p-3.5 bg-white border border-[#F0EFEB] rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <label htmlFor="yearly-day-select" className="text-xs font-medium text-[#737873]">
            Répéter le jour du mois :
          </label>
          <select
            id="yearly-day-select"
            value={dayOfMonth}
            onChange={(e) => updateConfigField('dayOfMonth', parseInt(e.target.value, 10))}
            className="rounded-lg border border-[#F0EFEB] bg-white px-2.5 py-1 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-hidden"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1er du mois' : `${n}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
