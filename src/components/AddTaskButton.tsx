import React from 'react';
import { Plus } from 'lucide-react';
import { AddTask, AddTaskProps } from './AddTask';

export interface AddTaskButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
  variant?: 'sage' | 'outline';
}

/**
 * Bouton d'ajout de tâche Zen Japandi épuré
 *
 * - Variante sauge : Fond #6B8E78, texte blanc, hover très doux vers #5d7c68
 * - Variante outline : Fond transparent, bordure #F0EFEB, texte #1A1D1A, hover #F0EFEB
 * - Transition 300ms ease-out
 */
export const AddTaskButton: React.FC<AddTaskButtonProps> = ({
  onClick,
  className = '',
  label = 'Nouvelle tâche',
  variant = 'sage',
}) => {
  if (variant === 'outline') {
    return (
      <button
        id="zen-add-task-outline-btn"
        type="button"
        onClick={onClick}
        className={`group inline-flex items-center gap-2 rounded-xl border border-[#F0EFEB] bg-white px-3.5 py-2 text-xs font-medium text-[#1A1D1A] hover:bg-[#F0EFEB] hover:border-[#E2DFD8] transition-all duration-300 ease-out shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer ${className}`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F0EFEB] text-[#6B8E78] transition-all duration-300 group-hover:bg-[#6B8E78] group-hover:text-white">
          <Plus className="h-3 w-3" />
        </span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      id="zen-add-task-sage-btn"
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-medium text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-[#5d7c68] active:scale-[0.99] transition-all duration-300 ease-out cursor-pointer ${className}`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:rotate-90">
        <Plus className="h-3.5 w-3.5" />
      </span>
      <span className="tracking-wide">{label}</span>
    </button>
  );
};

export { AddTask };
export default AddTaskButton;
