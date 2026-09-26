/**
 * PMO CoPilot - AI Cost & Token Optimizer
 * Provides utility functions to compress, trim and lighten telemetry, metadata, and JSON payloads
 * to reduce prompt tokens, save costs, and optimize rate limit consumption on Gemini Flash models.
 */

/**
 * Strips out unused properties, metadata, nested dates, and excessively long text
 * from objects (Tasks, Projects, RAID logs) to yield a highly lightweight representation.
 */
export function compressAndLightenJson<T>(data: T): any {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => compressAndLightenJson(item));
  }

  if (typeof data === 'object') {
    const output: Record<string, any> = {};

    for (const [key, val] of Object.entries(data)) {
      // 1. Skip system properties that carry no semantic value for AI task reasoning
      if ([
        'userId', 'spaceId', 'createdAt', 'updatedAt', 'dateCreation', 
        'dateModification', 'order', 'ordre', 'color', 'couleur'
      ].includes(key)) {
        continue;
      }

      // 2. Compress description/text fields if they are overly long
      if (typeof val === 'string') {
        if (val.length > 350) {
          output[key] = val.substring(0, 320) + '... [tronqué pour économie de tokens]';
        } else {
          output[key] = val;
        }
        continue;
      }

      // 3. Compress commentaries array into a simple count or lightweight array
      if (key === 'commentaires' && Array.isArray(val)) {
        if (val.length === 0) continue;
        output['notesCount'] = val.length;
        output['recentNotes'] = val.slice(-3).map((c: any) => ({
          author: c.auteur || 'Collaborateur',
          text: typeof c.texte === 'string' && c.texte.length > 100 
            ? c.texte.substring(0, 95) + '...' 
            : c.texte
        }));
        continue;
      }

      // 4. Recursively compress sub-objects
      output[key] = compressAndLightenJson(val);
    }

    return output;
  }

  return data;
}

interface GeminiCallParams {
  apiKey: string;
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Unified wrapper calling the Gemini Flash model family with strict cost controls.
 * Uses gemini-2.5-flash as default, disables reflection tokens (thinkingBudget: 0),
 * and handles model fallbacks gracefully.
 */
export async function callGeminiFlash({
  apiKey,
  systemInstruction,
  userPrompt,
  temperature = 0.3,
  maxOutputTokens = 1500
}: GeminiCallParams): Promise<{ success: boolean; text?: string; error?: string }> {
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite'
  ];

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
            temperature,
            maxOutputTokens,
            // Optimization: Set thinking budget to 0 to disable reasoning tokens and minimize compute costs
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

        const msgLower = message.toLowerCase();
        if (
          response.status === 402 ||
          response.status === 403 ||
          response.status === 429 ||
          msgLower.includes('permission') ||
          msgLower.includes('caller') ||
          msgLower.includes('quota') ||
          msgLower.includes('exhausted')
        ) {
          continue; // Try fallback model
        }
        throw new Error(message);
      }

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('Réponse vide reçue de l’API Gemini.');
      }

      return {
        success: true,
        text: generatedText.trim()
      };
    } catch (err: any) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
      const msgLower = lastErrorMsg.toLowerCase();
      if (
        lastErrorMsg.includes('402') ||
        lastErrorMsg.includes('403') ||
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
      ? 'Quota d’utilisation de l’API Gemini dépassé. Veuillez réessayer dans quelques instants.'
      : lastErrorMsg || 'Impossible de communiquer avec le modèle IA.'
  };
}
