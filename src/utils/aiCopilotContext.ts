import { Tache, Projet, KnowledgeDoc } from '../types';
import { 
  sanitizeTaskForAi, 
  sanitizeRaidItemForAi, 
  sanitizeDeliverableForAi,
  sanitizeUserIdentity,
  scrubSensitiveEntities 
} from './aiSanitizer';

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
 * Compresse et construit un contexte de données complet (Japandi Style - Ultra-Light JSON)
 * englobant l'INTEGRALITE des données de l'espace actif (tâches, livrables, RAID log, capacité planning)
 * tout en respectant scrupuleusement les consignes de RGPD et de non-divulgation de secrets d'affaires.
 */
export function buildCopilotContext(tasks: Tache[], projects: Projet[], spaceId: string): string {
  // 1. Filtrer les tâches de l'espace actif
  const spaceTasks = tasks.filter((t) => t.spaceId === spaceId);

  // 2. Filtrer les projets de l'espace actif
  const spaceProjects = projects.filter((p) => p.spaceId === spaceId);

  // 3. Récupérer les fiches de connaissances (SOPs)
  const sops = getSopSummaries();

  // 4. Cartographie des membres d'équipes pour simplifier et croiser les allocations de capacité
  const projectCapacityAndDetails = spaceProjects.map((proj) => {
    // Membres de l'équipe anonymisés
    const team = (proj.teamMembers || []).map((m) => ({
      id: m.id,
      name: sanitizeUserIdentity(m.name),
      role: m.role,
    }));

    // Map locale des ID de membres vers leur prénom anonymisé pour résolution
    const memberNameMap = new Map<string, string>();
    team.forEach((m) => memberNameMap.set(m.id, m.name));

    // Allocations de capacité condensées
    const planningAllocations = (proj.allocations || []).map((alloc) => {
      const memberName = memberNameMap.get(alloc.memberId) || "Collaborateur";
      return {
        collaborateur: memberName,
        periode: `${alloc.year}-${String(alloc.month).padStart(2, '0')}`,
        jours: alloc.requestedDays,
        statut: alloc.status,
      };
    });

    // Livrables anonymisés sans URL
    const deliverables = (proj.deliverables || []).map((deliv) => {
      const clean = sanitizeDeliverableForAi(deliv);
      return {
        titre: clean.title,
        type: clean.type,
        statut: clean.status,
        date_livraison: clean.deliveredAt || null,
      };
    });

    // Registre RAID complet (Risques, Décisions, Dépendances, Problèmes)
    const raidItems = (proj.raidLog || []).map((item) => {
      const clean = sanitizeRaidItemForAi(item);
      return {
        type: clean.type,
        titre: clean.cleanTitle,
        criticite: clean.criticalityScore,
        statut: clean.status,
        responsable: item.owner ? sanitizeUserIdentity(item.owner) : "Non assigné",
        plan_action: clean.cleanDescription || "Non défini",
      };
    });

    return {
      projet: scrubSensitiveEntities(proj.nom),
      jira: proj.jiraKey || "SANS_CLE",
      equipe: team.map((t) => ({ name: t.name, role: t.role })),
      planning_capacite: planningAllocations,
      livrables: deliverables,
      raid_log: raidItems,
    };
  });

  // 5. Synthétiser l'ensemble des tâches de l'espace (Opérations actives)
  // On ne garde que les tâches pour ne pas saturer le prompt, avec un allègement maximal
  const tasksSummary = spaceTasks.map((t) => {
    const s = sanitizeTaskForAi(t);
    const projName = t.projetId 
      ? spaceProjects.find((p) => p.id === t.projetId)?.nom || "Général"
      : "Général";
    return {
      id: s.id,
      titre: s.originalTitleTruncated,
      statut: s.statut,
      echeance: s.dateEcheance,
      projet: scrubSensitiveEntities(projName),
    };
  });

  // 6. Assembler le JSON de contexte ultra-compressé
  const contextData = {
    date_du_jour: new Date().toLocaleDateString('fr-FR'),
    espace_id: spaceId,
    projets_et_gouvernance: projectCapacityAndDetails,
    taches_actives: tasksSummary,
    knowledge_sops: sops.map((s) => ({
      titre: scrubSensitiveEntities(s.title),
      resume: scrubSensitiveEntities(s.summary),
    })),
  };

  return JSON.stringify(contextData);
}
