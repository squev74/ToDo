import React from 'react';
import { TaskDetailModal } from './TaskDetailModal';
import { Tache, Projet, StatutTache, ActivityLog, ProjectPhase } from '../types';

interface TaskFormModalProps {
  isOpen: boolean;
  initialTask?: Tache | null;
  defaultStatus?: StatutTache;
  projects: Projet[];
  phases: ProjectPhase[];
  activityLogs?: ActivityLog[];
  onSave: (taskData: {
    titre: string;
    description: string;
    projetId: string | null;
    phaseId?: string | null;
    jiraKey?: string;
    statut: StatutTache;
    dateEcheance?: string | null;
    blockedReason?: string;
    activationDate?: string | null;
  }) => void;
  onClose: () => void;
  onAddComment?: (taskId: string, commentText: string) => void;
  activeSpaceId?: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = (props) => {
  return <TaskDetailModal {...props} />;
};
