import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { Tache, Projet, Espace, ActivityLog, Milestone } from '../types';
import { ActivityReportView } from '../views/ActivityReportView';

export interface ActivityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Tache[];
  projects: Projet[];
  activeSpace: Espace;
  initialStartDate?: string;
  initialEndDate?: string;
  activityLogs?: ActivityLog[];
  milestones?: Milestone[];
}

export const ActivityReportModal: React.FC<ActivityReportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  activeSpace,
  initialStartDate,
  initialEndDate,
  activityLogs = [],
  milestones,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="activity-report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1D1A]/30 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="activity-report-modal-container"
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-[#F0EFEB] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* En-tête de la modal */}
        <div className="flex items-center justify-between border-b border-[#F0EFEB] px-5 py-4 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1D1A]">
              Génération du Rapport d&apos;Activité N+1
            </h3>
          </div>
          <button
            id="activity-report-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-[#737873] hover:bg-[#F0EFEB] hover:text-[#1A1D1A] transition-colors"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps avec la vue de rapport */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#F9F8F6]/40">
          <ActivityReportView
            tasks={tasks}
            projects={projects}
            activeSpace={activeSpace}
            initialStartDate={initialStartDate}
            initialEndDate={initialEndDate}
            activityLogs={activityLogs}
            milestones={milestones}
            onClose={onClose}
            isModalContext={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ActivityReportModal;
