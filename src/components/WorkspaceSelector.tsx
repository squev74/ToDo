import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Settings, Check } from 'lucide-react';
import { Espace, Tache } from '../types';
import { getWorkspaceIconComponent } from '../utils/workspaceIcons';

interface WorkspaceSelectorProps {
  spaces: Espace[];
  activeSpaceId: string;
  tasks: Tache[]; // Toutes les tâches (pour calculer le compteur par espace)
  onSelectSpace: (spaceId: string) => void;
  onOpenManageModal: () => void;
  onOpenCreateModal: () => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  spaces,
  activeSpaceId,
  tasks,
  onSelectSpace,
  onOpenManageModal,
  onOpenCreateModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];
  const ActiveIcon = getWorkspaceIconComponent(activeSpace?.icone);

  // Fermer le dropdown lors d'un clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left" id="workspace-selector-container">
      {/* Bouton principal du sélecteur */}
      <button
        id="workspace-selector-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 transition-all shadow-2xs"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md text-white shadow-2xs shrink-0"
          style={{ backgroundColor: activeSpace?.couleur || '#6366f1' }}
        >
          <ActiveIcon className="h-3 w-3 stroke-[2.5]" />
        </span>
        <span className="font-bold text-slate-900 max-w-[120px] sm:max-w-[160px] truncate">
          {activeSpace?.nom || 'Mon espace'}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div
          id="workspace-dropdown-menu"
          className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
          role="menu"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Espaces de travail ({spaces.length})
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {spaces.map((space) => {
              const SpaceIcon = getWorkspaceIconComponent(space.icone);
              const isSelected = space.id === activeSpaceId;
              const taskCount = tasks.filter((t) => t.spaceId === space.id).length;

              return (
                <button
                  key={space.id}
                  id={`workspace-item-${space.id}`}
                  type="button"
                  onClick={() => {
                    onSelectSpace(space.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/80 text-indigo-950 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-md text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: space.couleur || '#6366f1' }}
                    >
                      <SpaceIcon className="h-3 w-3 stroke-[2.5]" />
                    </span>
                    <span className="truncate">{space.nom}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {taskCount}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              id="workspace-quick-create-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCreateModal();
              }}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Créer un nouvel espace</span>
            </button>

            <button
              id="workspace-manage-all-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenManageModal();
              }}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              <span>Gérer les espaces de travail</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
