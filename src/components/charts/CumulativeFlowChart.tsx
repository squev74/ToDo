import React, { useState, useRef, useMemo } from 'react';
import { CfdDayMetric } from '../../utils/analyticsHelpers';

interface CumulativeFlowChartProps {
  data: CfdDayMetric[];
}

export const CumulativeFlowChart: React.FC<CumulativeFlowChartProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<SVGSVGElement | null>(null);

  const width = 650;
  const height = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const baseline = padding.top + chartHeight;

  // Si pas de données, on affiche un message
  const hasData = data && data.length > 0;
  
  // Calculer les données cumulées et le maximum
  const processedData = useMemo(() => {
    if (!hasData) return [];
    return data.map((d) => {
      const yDone = d.done_cancelled;
      const yProgress = yDone + d.in_progress;
      const yTodo = yProgress + d.todo;
      return {
        ...d,
        yDone,
        yProgress,
        yTodo,
      };
    });
  }, [data, hasData]);

  const maxTotal = useMemo(() => {
    if (!hasData) return 10;
    const vals = processedData.map((d) => d.yTodo);
    const max = Math.max(...vals);
    return max === 0 ? 10 : max;
  }, [processedData, hasData]);

  // Générer les coordonnées pour les tracés
  const points = useMemo(() => {
    if (!hasData) return { todo: '', progress: '', done: '', coordList: [] };
    
    const coordList: { x: number; yTodo: number; yProgress: number; yDone: number }[] = [];
    const n = processedData.length;

    processedData.forEach((d, i) => {
      const x = padding.left + (i / (n - 1)) * chartWidth;
      const yTodo = baseline - (d.yTodo / maxTotal) * chartHeight;
      const yProgress = baseline - (d.yProgress / maxTotal) * chartHeight;
      const yDone = baseline - (d.yDone / maxTotal) * chartHeight;

      coordList.push({ x, yTodo, yProgress, yDone });
    });

    // Générer les chaines d'attributs d pour les paths
    let todoPath = `M ${coordList[0].x} ${baseline} `;
    coordList.forEach((pt) => { todoPath += `L ${pt.x} ${pt.yTodo} `; });
    todoPath += `L ${coordList[coordList.length - 1].x} ${baseline} Z`;

    let progressPath = `M ${coordList[0].x} ${baseline} `;
    coordList.forEach((pt) => { progressPath += `L ${pt.x} ${pt.yProgress} `; });
    progressPath += `L ${coordList[coordList.length - 1].x} ${baseline} Z`;

    let donePath = `M ${coordList[0].x} ${baseline} `;
    coordList.forEach((pt) => { donePath += `L ${pt.x} ${pt.yDone} `; });
    donePath += `L ${coordList[coordList.length - 1].x} ${baseline} Z`;

    return { todo: todoPath, progress: progressPath, done: donePath, coordList };
  }, [processedData, hasData, chartWidth, chartHeight, baseline, maxTotal]);

  // Gérer le survol pour le tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || !hasData) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xInSvg = ((e.clientX - rect.left) / rect.width) * width;
    
    // Trouver l'index le plus proche
    const xRelative = xInSvg - padding.left;
    const fraction = xRelative / chartWidth;
    const index = Math.round(fraction * (data.length - 1));
    
    if (index >= 0 && index < data.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Libellés d'axe X (5 libellés répartis)
  const xLabels = useMemo(() => {
    if (!hasData) return [];
    const step = Math.floor(data.length / 4);
    const indices = [0, step, step * 2, step * 3, data.length - 1];
    return indices.map((idx) => {
      const d = data[idx].date; // format YYYY-MM-DD
      const parts = d.split('-');
      // Renvoyer JJ/MM
      return {
        text: `${parts[2]}/${parts[1]}`,
        x: padding.left + (idx / (data.length - 1)) * chartWidth,
      };
    });
  }, [data, hasData, chartWidth]);

  // Libellés d'axe Y (4 graduations de 0 à maxTotal)
  const yTicks = useMemo(() => {
    const ticks = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = Math.round((maxTotal / steps) * i);
      const y = baseline - (val / maxTotal) * chartHeight;
      ticks.push({ val, y });
    }
    return ticks;
  }, [maxTotal, chartHeight, baseline]);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed border-[#F0EFEB] rounded-2xl bg-white text-xs text-[#737873]">
        Pas d&apos;historique de tâches disponible pour l&apos;espace sélectionné.
      </div>
    );
  }

  const hoverData = hoverIndex !== null ? processedData[hoverIndex] : null;
  const hoverCoords = hoverIndex !== null ? points.coordList[hoverIndex] : null;

  return (
    <div className="relative bg-white rounded-2xl border border-[#F0EFEB] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-[#737873]">Cumulative Flow Diagram (CFD)</h4>
          <p className="text-[11px] font-light text-[#A0A5A0] mt-0.5">Évolution quotidienne des statuts de tâches sur 100 jours</p>
        </div>
        
        {/* Légende minimaliste Japandi */}
        <div className="flex gap-4 text-[10px] font-medium text-[#737873]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#CBD5E1]" />
            <span>À faire</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#C89B7B]" />
            <span>En cours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#6B8E78]" />
            <span>Clôturées</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={containerRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grille horizontale */}
          {yTicks.map((tick, i) => (
            <g key={i} className="opacity-40">
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="#F0EFEB"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 3}
                textAnchor="end"
                className="text-[10px] font-light fill-[#737873]"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* Aires de flux cumulées (Ordre important : Todo -> Progress -> Done pour le masquage correct) */}
          <path d={points.todo} fill="#E2E8F0" opacity={0.8} />
          <path d={points.progress} fill="#F0DDD1" opacity={0.9} />
          <path d={points.done} fill="#E4ECE6" opacity={1.0} />

          {/* Ligne des contours des aires pour un rendu Japandi dessiné main ou hyper élégant */}
          <path d={points.todo} fill="none" stroke="#94A3B8" strokeWidth={1} opacity={0.2} />
          <path d={points.progress} fill="none" stroke="#C89B7B" strokeWidth={1} opacity={0.3} />
          <path d={points.done} fill="none" stroke="#6B8E78" strokeWidth={1} opacity={0.4} />

          {/* Axe X Libellés */}
          {xLabels.map((label, i) => (
            <g key={i}>
              <line
                x1={label.x}
                y1={baseline}
                x2={label.x}
                y2={baseline + 4}
                stroke="#D3CFC8"
                strokeWidth={1}
              />
              <text
                x={label.x}
                y={baseline + 16}
                textAnchor="middle"
                className="text-[9px] font-light fill-[#737873]"
              >
                {label.text}
              </text>
            </g>
          ))}

          {/* Axe principal */}
          <line
            x1={padding.left}
            y1={baseline}
            x2={width - padding.right}
            y2={baseline}
            stroke="#D3CFC8"
            strokeWidth={1}
          />

          {/* Indicateur de survol */}
          {hoverCoords && hoverData && (
            <g>
              {/* Ligne verticale de suivi */}
              <line
                x1={hoverCoords.x}
                y1={padding.top}
                x2={hoverCoords.x}
                y2={baseline}
                stroke="#6B8E78"
                strokeWidth={1}
                strokeDasharray="2 2"
              />

              {/* Cercles de données survolés */}
              <circle cx={hoverCoords.x} cy={hoverCoords.yTodo} r={3} fill="#94A3B8" stroke="white" strokeWidth={1} />
              <circle cx={hoverCoords.x} cy={hoverCoords.yProgress} r={3} fill="#C89B7B" stroke="white" strokeWidth={1} />
              <circle cx={hoverCoords.x} cy={hoverCoords.yDone} r={3} fill="#6B8E78" stroke="white" strokeWidth={1} />
            </g>
          )}
        </svg>

        {/* Info-bulle HTML premium flottante */}
        {hoverData && hoverCoords && (
          <div
            className="absolute z-20 pointer-events-none bg-white/95 backdrop-blur-md rounded-xl border border-[#F0EFEB] px-3 py-2 text-[11px] text-[#1A1D1A] shadow-[0_4px_15px_rgba(0,0,0,0.05)] flex flex-col gap-1 w-36 transition-all duration-75"
            style={{
              left: `${(hoverCoords.x / width) * 100}%`,
              transform: `translate(${hoverCoords.x > width / 2 ? '-110%' : '10%'}, -10%)`,
              top: `${(hoverCoords.yProgress / height) * 100}%`,
            }}
          >
            <div className="font-medium text-[#737873] border-b border-[#F0EFEB] pb-1 mb-1 text-[10px]">
              {hoverData.date.split('-').reverse().join('/')}
            </div>
            <div className="flex justify-between items-center text-[#737873]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
                À faire :
              </span>
              <strong className="font-medium text-[#1A1D1A]">{hoverData.todo}</strong>
            </div>
            <div className="flex justify-between items-center text-[#737873]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C89B7B]" />
                En cours :
              </span>
              <strong className="font-medium text-[#1A1D1A]">{hoverData.in_progress}</strong>
            </div>
            <div className="flex justify-between items-center text-[#737873]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6B8E78]" />
                Clôturées :
              </span>
              <strong className="font-medium text-[#1A1D1A]">{hoverData.done_cancelled}</strong>
            </div>
            <div className="border-t border-[#F0EFEB] pt-1 mt-1 flex justify-between items-center font-semibold text-[#1A1D1A] text-[10px]">
              <span>Total :</span>
              <span>{hoverData.yTodo}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
