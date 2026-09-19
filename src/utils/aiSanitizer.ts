import { Tache, RaidItem, ProjectDeliverable } from '../types';

/**
 * Nettoie les adresses e-mail d'un texte.
 */
export function removeEmails(text: string): string {
  return text.replace(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDUIT]');
}

/**
 * Masque les noms de tiers, d'entreprises ou de prestataires dans un texte.
 * Remplace également les URLs sensibles par [LIEN_SÉCURISÉ].
 */
export function scrubSensitiveEntities(text: string): string {
  if (!text) return '';
  let cleaned = removeEmails(text);
  
  // Masquage d'URL
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '[LIEN_SÉCURISÉ]');
  
  // Remplacements de structures d'entreprises courantes ou mots-clés d'affaires
  const replacements = [
    { regex: /\b(microsoft|google|amazon|aws|oracle|salesforce|sap|capgemini|accenture|sopra\s*steria|cgi|atos)\b/gi, replacement: '[PRESTATAIRE]' },
    { regex: /\b(air\s*france|peugeot|renault|edf|total|bnp|sg|societe\s*generale|loreal|lvmh)\b/gi, replacement: '[PARTENAIRE]' },
    { regex: /\b(client\s+x|client\s+y|client\s+z)\b/gi, replacement: '[CLIENT_SÉCURISÉ]' }
  ];

  for (const item of replacements) {
    cleaned = cleaned.replace(item.regex, item.replacement);
  }

  return cleaned;
}

/**
 * Transforme un nom d'utilisateur complet en prénom seul et supprime les emails.
 */
export function sanitizeUserIdentity(name: string): string {
  if (!name) return '';
  
  // Si c'est un e-mail, on le vide ou remplace
  if (name.includes('@')) {
    return '[COLLABORATEUR]';
  }

  // On prend le premier mot (prénom) et on nettoie les espaces
  const firstName = name.trim().split(/\s+/)[0];
  
  // S'assurer qu'il ne reste aucun caractère spécial ou email
  return removeEmails(firstName);
}

/**
 * Désinfecte une tâche / ticket JIRA pour l'IA :
 * - Conserve uniquement la clé JIRA, le titre (limité à 80 caractères), le statut et la date d'échéance.
 * - Supprime toute description complète, emails, pièces jointes, URLs et budgets.
 */
export function sanitizeTaskForAi(task: Tache): Partial<Tache> & { originalTitleTruncated: string } {
  const truncatedTitle = task.titre.substring(0, 80).trim() + (task.titre.length > 80 ? '...' : '');
  
  return {
    id: task.id,
    jiraKey: task.jiraKey || 'SANS_CLE',
    originalTitleTruncated: scrubSensitiveEntities(truncatedTitle),
    statut: task.statut,
    dateEcheance: task.dateEcheance || null,
  };
}

/**
 * Désinfecte un élément RAID (Risque, Hypothèse, Dépendance, Problème) pour l'IA :
 * - Conserve uniquement le type, score, statut, impact, probabilité et un titre épuré.
 * - Supprime/remplace les entités tiers de la description par [TIERS]/[PRESTATAIRE].
 */
export function sanitizeRaidItemForAi(item: RaidItem): Partial<RaidItem> & { cleanTitle: string; cleanDescription?: string } {
  const truncatedTitle = item.title.substring(0, 80).trim() + (item.title.length > 80 ? '...' : '');
  const cleanTitle = scrubSensitiveEntities(truncatedTitle);
  const cleanDesc = item.description ? scrubSensitiveEntities(item.description.substring(0, 150)) : undefined;

  return {
    id: item.id,
    type: item.type,
    criticalityScore: item.criticalityScore,
    roamStatus: item.roamStatus,
    impact: item.impact,
    probability: item.probability,
    status: item.status,
    cleanTitle,
    cleanDescription: cleanDesc,
  };
}

/**
 * Désinfecte un livrable de projet pour l'IA :
 * - Exclut formellement le champ URL (SharePoint/Drive) pour ne pas divulguer de liens d'entreprise.
 */
export function sanitizeDeliverableForAi(deliverable: ProjectDeliverable): Omit<ProjectDeliverable, 'url'> {
  return {
    id: deliverable.id,
    title: scrubSensitiveEntities(deliverable.title),
    type: deliverable.type,
    status: deliverable.status,
    deliveredAt: deliverable.deliveredAt,
  };
}
