import { Tache, Projet } from '../types';
import { getGeminiApiKey } from './geminiReportService';
import { scrubSensitiveEntities } from '../utils/aiSanitizer';

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

  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastErrorMsg = '';

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nNote à reformuler : "${quickNote}"` }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 150,
            thinkingConfig: {
              thinkingBudget: 0 // Désactive les tokens de réflexion pour économiser les coûts
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `Erreur HTTP ${response.status}`;
        lastErrorMsg = message;

        // Tenter le modèle de secours sur erreur de permission, quota ou indisponibilité
        const msgLower = message.toLowerCase();
        if (
          response.status === 402 ||
          response.status === 403 ||
          response.status === 404 ||
          response.status === 429 ||
          msgLower.includes('permission') ||
          msgLower.includes('caller') ||
          msgLower.includes('quota') ||
          msgLower.includes('exhausted')
        ) {
          continue;
        }
        throw new Error(message);
      }

      const data = await response.json();
      let generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('Réponse vide reçue de l’API Gemini.');
      }

      // Nettoyage de la réponse (suppression des guillemets d'enrobage éventuels)
      generatedText = generatedText.trim().replace(/^["']|["']$/g, '');

      return {
        success: true,
        refinedText: generatedText
      };
    } catch (err: any) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
      const msgLower = lastErrorMsg.toLowerCase();
      if (
        lastErrorMsg.includes('402') ||
        lastErrorMsg.includes('403') ||
        lastErrorMsg.includes('404') ||
        lastErrorMsg.includes('429') ||
        msgLower.includes('permission') ||
        msgLower.includes('caller') ||
        msgLower.includes('quota') ||
        msgLower.includes('exhausted')
      ) {
        continue;
      }
      break;
    }
  }

  return {
    success: false,
    error: lastErrorMsg.toLowerCase().includes('quota') || lastErrorMsg.toLowerCase().includes('429') || lastErrorMsg.toLowerCase().includes('exhausted')
      ? 'Quota d’utilisation de l’API Gemini dépassé (Limite de taux temporaire). Veuillez réessayer dans quelques instants.'
      : lastErrorMsg || 'Impossible de communiquer avec l’API Gemini.'
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

  const systemInstruction =
    "Analyse les tâches fournies. Identifie les 3 à 5 prochaines tâches à traiter en priorité. Pour chaque tâche recommandée, donne une justification d'une phrase.";

  const userPrompt = `Voici la liste des tâches ouvertes à analyser :\n\n${JSON.stringify(lightweightTasks, null, 2)}\n\nIdentifie les tâches prioritaires à faire immédiatement et renvoie-moi la sélection structurée. Justifie chaque choix par une phrase courte et percutante.`;

  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastErrorMsg = '';

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1000,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `Erreur HTTP ${response.status}`;
        lastErrorMsg = message;

        // Tenter le modèle de secours sur erreur de permission, quota ou indisponibilité
        const msgLower = message.toLowerCase();
        if (
          response.status === 402 ||
          response.status === 403 ||
          response.status === 404 ||
          response.status === 429 ||
          msgLower.includes('permission') ||
          msgLower.includes('caller') ||
          msgLower.includes('quota') ||
          msgLower.includes('exhausted')
        ) {
          continue;
        }
        throw new Error(message);
      }

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('Réponse vide de l’API Gemini.');
      }

      // Parser de façon robuste pour essayer de retrouver les recommandations
      // On renverra le texte brut formaté de façon épurée pour l'utilisateur
      return {
        success: true,
        rawText: generatedText.trim()
      };
    } catch (err: any) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
      const msgLower = lastErrorMsg.toLowerCase();
      if (
        lastErrorMsg.includes('402') ||
        lastErrorMsg.includes('403') ||
        lastErrorMsg.includes('404') ||
        lastErrorMsg.includes('429') ||
        msgLower.includes('permission') ||
        msgLower.includes('caller') ||
        msgLower.includes('quota') ||
        msgLower.includes('exhausted')
      ) {
        continue;
      }
      break;
    }
  }

  return {
    success: false,
    error: lastErrorMsg.toLowerCase().includes('quota') || lastErrorMsg.toLowerCase().includes('429') || lastErrorMsg.toLowerCase().includes('exhausted')
      ? 'Quota d’utilisation de l’API Gemini dépassé (Limite de taux temporaire). Veuillez réessayer dans quelques instants.'
      : lastErrorMsg || 'Impossible de prioriser le backlog pour le moment.'
  };
}
