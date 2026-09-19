import { Tache, Projet, KnowledgeDoc, RaidItem } from '../types';
import { 
  sanitizeTaskForAi, 
  sanitizeRaidItemForAi, 
  scrubSensitiveEntities 
} from './aiSanitizer';

/**
 * Filtre et renvoie les tâches en retard par rapport à la date du jour (YYYY-MM-DD).
 * Exclut les tâches terminées ('Done').
 */
export function getOverdueTasks(tasks: Tache[], spaceId: string): Tache[] {
  const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  
  return tasks.filter((t) => {
    // Filtrer par espace de travail actif, non terminées, et ayant une date d'échéance dépassée
    if (t.spaceId !== spaceId) return false;
    if (t.statut === 'Done' || t.statut === 'backlog' || t.statut === 'Backlog') return false;
    if (!t.dateEcheance) return false;
    
    return t.dateEcheance < todayStr;
  });
}

/**
 * Extrait les risques majeurs ou critiques (score de criticité >= 6) du registre RAID des projets de l'espace actif.
 */
export function getCriticalRisks(projects: Projet[], spaceId: string): { projectTitle: string; risk: RaidItem }[] {
  const spaceProjects = projects.filter((p) => p.spaceId === spaceId);
  const criticalRisks: { projectTitle: string; risk: RaidItem }[] = [];

  spaceProjects.forEach((proj) => {
    if (proj.raidLog) {
      proj.raidLog.forEach((item) => {
        if (item.type === 'risk' && item.status === 'open' && item.criticalityScore >= 6) {
          criticalRisks.push({
            projectTitle: proj.nom,
            risk: item,
          });
        }
      });
    }
  });

  return criticalRisks;
}

/**
 * Récupère les résumés et titres des fiches de procédures (SOP) existantes depuis le stockage local.
 */
export function getSopSummaries(): { title: string; category: string; summary: string }[] {
  const local = localStorage.getItem('knowledge_docs_list');
  if (local) {
    try {
      const docs: KnowledgeDoc[] = JSON.parse(local);
      return docs.map((doc) => ({
        title: doc.title,
        category: doc.category,
        summary: doc.summary || "Aucun résumé disponible.",
      }));
    } catch (e) {
      console.error("Erreur d'extraction des SOP", e);
    }
  }
  return [];
}

/**
 * Compresse et construit un contexte textuel minimaliste (Japandi Style - Light JSON)
 * pour nourrir l'assistant Gemini à chaque question en réduisant drastiquement les tokens.
 * Toutes les données sont rigoureusement anonymisées et désinfectées (RGPD, Confidentialité Client).
 */
export function buildCopilotContext(tasks: Tache[], projects: Projet[], spaceId: string): string {
  const overdue = getOverdueTasks(tasks, spaceId);
  const criticalRisks = getCriticalRisks(projects, spaceId);
  const sops = getSopSummaries();

  // Allègement maximal : structure ultra-condensée et anonymisée
  const contextData = {
    date: new Date().toLocaleDateString('fr-FR'),
    overdue_tasks: overdue.map((t) => {
      const s = sanitizeTaskForAi(t);
      return {
        id: s.id,
        title: s.originalTitleTruncated,
        due: s.dateEcheance,
        status: s.statut,
      };
    }),
    critical_risks: criticalRisks.map(({ projectTitle, risk }) => {
      const r = sanitizeRaidItemForAi(risk);
      return {
        proj: scrubSensitiveEntities(projectTitle),
        title: r.cleanTitle,
        score: r.criticalityScore,
        mitigation: r.cleanDescription ? r.cleanDescription : "Non défini",
      };
    }),
    knowledge_sops: sops.map((s) => ({
      title: scrubSensitiveEntities(s.title),
      summary: scrubSensitiveEntities(s.summary),
    })),
  };

  return JSON.stringify(contextData);
}
