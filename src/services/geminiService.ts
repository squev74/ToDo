import { Tache, Projet } from '../types';
import { getGeminiApiKey } from './geminiReportService';
import { scrubSensitiveEntities } from '../utils/aiSanitizer';
import { compressAndLightenJson, callGeminiFlash } from '../utils/aiCostOptimizer';

export interface ClarifyTaskResult {
  success: boolean;
  refinedText?: string;
  error?: string;
}

export interface RecommendedTask {
  id: string;
  title: string;
  project: string;
  reason: string;
}

export interface PrioritizeBacklogResult {
  success: boolean;
  recommendations?: RecommendedTask[];
  rawText?: string;
  error?: string;
}

/**
 * Reformule une note rapide de tâche en un intitulé d'action professionnel (Style PMO).
 */
export async function clarifyTaskTitle(quickNote: string): Promise<ClarifyTaskResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: 'Clé d’API Gemini non configurée dans Settings > Secrets ou localStorage.'
    };
  }

  const systemInstruction = 
    "Tu es un assistant PMO expert. Prends la prise de note rapide suivante et reformule-la sous forme d'une action claire, concise, commençant par un verbe à l'infinitif. Conserve le contexte exact sans inventer d'information.";

  // Compress input note slightly (limiting to clean sub-string)
  const compressedNote = typeof quickNote === 'string' && quickNote.length > 300 
    ? quickNote.substring(0, 280) + '...'
    : quickNote;

  const result = await callGeminiFlash({
    apiKey,
    systemInstruction,
    userPrompt: `Note à reformuler : "${compressedNote}"`,
    temperature: 0.2,
    maxOutputTokens: 150
  });

  if (!result.success || !result.text) {
    return {
      success: false,
      error: result.error || 'Erreur lors de la clarification.'
    };
  }

  // Nettoyage de la réponse (suppression des guillemets d'enrobage éventuels)
  const generatedText = result.text.trim().replace(/^["']|["']$/g, '');

  return {
    success: true,
    refinedText: generatedText
  };
}

/**
 * Analyse et priorise une liste de tâches ouvertes pour un espace donné.
 */
export async function prioritizeBacklog(
  tasks: Tache[],
  projects: Projet[],
  spaceId: string
): Promise<PrioritizeBacklogResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: 'Clé d’API Gemini non configurée.'
    };
  }

  // Ne prendre en compte que les tâches ouvertes (non Done) de l'espace courant
  const activeSpaceTasks = tasks.filter(
    (t) => t.spaceId === spaceId && t.statut !== 'Done' && t.statut !== 'Cancelled'
  );

  if (activeSpaceTasks.length === 0) {
    return {
      success: false,
      error: 'Aucune tâche ouverte ou planifiée dans cet espace à prioriser.'
    };
  }

  // Alléger et structurer les données envoyées pour optimiser les jetons
  const projectMap = new Map<string, string>();
  projects.forEach((p) => projectMap.set(p.id, p.nom));

  const lightweightTasks = activeSpaceTasks.map((t) => ({
    id: t.id,
    title: scrubSensitiveEntities(t.titre),
    status: t.statut,
    project: t.projetId ? scrubSensitiveEntities(projectMap.get(t.projetId) || 'Général') : 'Général',
    due: t.dateEcheance || 'Non définie'
  }));

  // Appliquer la fonction de compression pour alléger le JSON final transmis
  const compressedTasksPayload = compressAndLightenJson(lightweightTasks);

  const systemInstruction =
    "Analyse les tâches fournies. Identifie les 3 à 5 prochaines tâches à traiter en priorité. Pour chaque tâche recommandée, donne une justification d'une phrase.";

  const userPrompt = `Voici la liste des tâches ouvertes à analyser (allégée pour économie de tokens) :\n\n${JSON.stringify(compressedTasksPayload, null, 2)}\n\nIdentifie les tâches prioritaires à faire immédiatement et renvoie-moi la sélection structurée. Justifie chaque choix par une phrase courte et percutante.`;

  const result = await callGeminiFlash({
    apiKey,
    systemInstruction,
    userPrompt,
    temperature: 0.35,
    maxOutputTokens: 1000
  });

  if (!result.success || !result.text) {
    return {
      success: false,
      error: result.error || 'Erreur lors de la priorisation.'
    };
  }

  return {
    success: true,
    rawText: result.text.trim()
  };
}
