import { Tache, Projet } from '../types';

export interface PreparedTaskReportItem {
  id: string;
  titre: string;
  description: string;
  projet: string;
  statut: 'done' | 'in_progress' | 'blocked' | 'open' | 'backlog' | string;
  dateEcheance?: string | null;
  dateRealisation?: string | null;
  derniereActivite?: string | null;
  commentairesRecents?: string[];
}

export interface ActivityReportFilterParams {
  tasks: Tache[];
  projects: Projet[];
  spaceId: string;
  dateDebut: string; // Format YYYY-MM-DD
  dateFin: string;   // Format YYYY-MM-DD
  projetId?: string; // Optionnel : ID de projet spécifique pour restreindre le périmètre
}

export interface GenerateReportResult {
  success: boolean;
  reportText: string;
  tasksCount: number;
  projectsCount: number;
  error?: string;
}

/**
 * Récupère la clé d'API Gemini de façon sécurisée depuis les variables d'environnement.
 * Priorise VITE_GEMINI_API_KEY et retombe sur GEMINI_API_KEY si disponible.
 */
export function getGeminiApiKey(): string {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
  const viteKey = metaEnv?.VITE_GEMINI_API_KEY?.trim();
  if (viteKey) return viteKey;

  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }

  return '';
}

/**
 * Formate un objet Date en chaîne ISO courte locale "YYYY-MM-DD"
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calcule le lundi de la semaine en cours au format YYYY-MM-DD
 */
export function getMondayOfCurrentWeek(refDate: Date = new Date()): string {
  const date = new Date(refDate);
  const day = date.getDay(); // 0 = Dimanche, 1 = Lundi, ...
  // Si dimanche (0), reculer de 6 jours, sinon reculer de (day - 1) jours
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  return formatLocalDate(monday);
}

/**
 * Normalise la date sous forme YYYY-MM-DD à partir d'une chaîne ISO ou Date
 */
function extractDateStr(isoOrDateStr?: string | null): string | null {
  if (!isoOrDateStr) return null;
  return isoOrDateStr.split('T')[0];
}

/**
 * Vérifie si au moins une date d'activité ou de modification de la tâche est comprise entre dateDebut et dateFin.
 * Prend en compte : lastActivityAt, updatedAt, completedAt/dateRealisation, dateModification, createdAt et les commentaires.
 */
export function isTaskActiveInPeriod(task: Tache, dateDebut: string, dateFin: string): boolean {
  const start = dateDebut <= dateFin ? dateDebut : dateFin;
  const end = dateDebut <= dateFin ? dateFin : dateDebut;

  const datesToCheck: (string | null)[] = [
    extractDateStr(task.lastActivityAt),
    extractDateStr(task.updatedAt),
    extractDateStr(task.dateRealisation),
    extractDateStr(task.dateModification),
    extractDateStr(task.createdAt),
  ];

  // Vérifier aussi les dates de commentaires récents
  if (task.commentaires && task.commentaires.length > 0) {
    for (const comm of task.commentaires) {
      datesToCheck.push(extractDateStr(comm.date));
    }
  }

  return datesToCheck.some((d) => d !== null && d >= start && d <= end);
}

/**
 * Mappe le statut interne vers la convention demandée ('done', 'in_progress', 'blocked', 'open', 'backlog')
 */
export function normalizeTaskStatus(statut: string): string {
  const s = statut.toLowerCase().trim();
  if (s === 'done' || s === 'terminé' || s === 'termine') return 'done';
  if (s === 'in progress' || s === 'in_progress' || s === 'en cours') return 'in_progress';
  if (s === 'blocked' || s === 'bloqué' || s === 'bloque') return 'blocked';
  if (s === 'backlog') return 'backlog';
  return 'open';
}

/**
 * Extrait et prépare les tâches de l'espace courant actives sur la période sélectionnée
 */
export function extractAndPrepareTasks({
  tasks,
  projects,
  spaceId,
  dateDebut,
  dateFin,
  projetId,
}: ActivityReportFilterParams): PreparedTaskReportItem[] {
  // 1. Filtrer par espace de travail
  let spaceTasks = tasks.filter((t) => t.spaceId === spaceId);

  // 2. Filtrer par projet spécifique si demandé
  if (projetId) {
    spaceTasks = spaceTasks.filter((t) => t.projetId === projetId);
  }

  // 3. Créer une map des projets pour résolution rapide
  const projectMap = new Map<string, Projet>();
  projects.forEach((p) => projectMap.set(p.id, p));

  // 4. Filtrer par période d'activité
  const filteredTasks = spaceTasks.filter((t) => isTaskActiveInPeriod(t, dateDebut, dateFin));

  // 5. Mappage des données nettoyées et structurées
  return filteredTasks.map((t) => {
    const proj = t.projetId ? projectMap.get(t.projetId) : undefined;
    const projectName = proj ? proj.nom : 'Général / Sans projet';

    // Commentaires pertinents récents
    const recentComments = (t.commentaires || [])
      .slice(-3)
      .map((c) => c.texte.trim())
      .filter((text) => text.length > 0);

    return {
      id: t.id,
      titre: t.titre,
      description: t.description || '',
      projet: projectName,
      statut: normalizeTaskStatus(t.statut),
      dateEcheance: t.dateEcheance || null,
      dateRealisation: t.dateRealisation || null,
      derniereActivite: t.lastActivityAt || t.updatedAt || t.dateModification || null,
      commentairesRecents: recentComments.length > 0 ? recentComments : undefined,
    };
  });
}

/**
 * Allège et compresse les données JSON des tâches avant de les envoyer à Gemini
 * pour optimiser les coûts et réduire drastiquement le nombre de tokens.
 */
export function compressAndLightenTasks(tasks: PreparedTaskReportItem[]): any[] {
  return tasks.map((t) => {
    const cleanItem: Record<string, any> = {
      title: t.titre,
      status: t.statut,
    };

    if (t.projet && t.projet !== 'Général / Sans projet') {
      cleanItem.project = t.projet;
    }

    if (t.description && t.description.trim()) {
      const desc = t.description.trim();
      // On tronque la description à 120 caractères max pour alléger drastiquement
      cleanItem.desc = desc.length > 120 ? desc.substring(0, 117) + '...' : desc;
    }

    if (t.dateEcheance) {
      cleanItem.due = t.dateEcheance;
    }

    if (t.dateRealisation) {
      cleanItem.completed = t.dateRealisation;
    }

    if (t.commentairesRecents && t.commentairesRecents.length > 0) {
      // On ne garde que l'essentiel des notes récentes
      cleanItem.notes = t.commentairesRecents.map((c) =>
        c.length > 80 ? c.substring(0, 77) + '...' : c
      );
    }

    return cleanItem;
  });
}

/**
 * Formate une date YYYY-MM-DD en français lisible (ex: 14 septembre 2026)
 */
export function formatFrenchDateDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return dt.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Appelle l'API Gemini pour générer le rapport d'activité synthétique selon la cible et le périmètre.
 */
export async function generateActivityReport(params: {
  tasks: Tache[];
  projects: Projet[];
  spaceId: string;
  spaceName?: string;
  dateDebut: string;
  dateFin: string;
  perimetre?: 'tous' | 'projet';
  projetSelectionneId?: string;
  cible?: 'n1' | 'codir';
}): Promise<GenerateReportResult> {
  const {
    tasks,
    projects,
    spaceId,
    spaceName,
    dateDebut,
    dateFin,
    perimetre = 'tous',
    projetSelectionneId,
    cible = 'n1',
  } = params;

  // 1. Préparer les données en fonction du périmètre
  const preparedTasks = extractAndPrepareTasks({
    tasks,
    projects,
    spaceId,
    dateDebut,
    dateFin,
    projetId: perimetre === 'projet' ? projetSelectionneId : undefined,
  });

  if (preparedTasks.length === 0) {
    return {
      success: false,
      reportText: '',
      tasksCount: 0,
      projectsCount: 0,
      error: 'Aucune tâche ou activité enregistrée sur cette période pour le périmètre sélectionné.',
    };
  }

  // Nombre de projets uniques concernés
  const uniqueProjects = Array.from(new Set(preparedTasks.map((t) => t.projet)));

  // 2. Vérification de la clé d'API Gemini
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      success: false,
      reportText: '',
      tasksCount: preparedTasks.length,
      projectsCount: uniqueProjects.length,
      error:
        'Clé d’API Gemini non configurée. Veuillez renseigner la variable VITE_GEMINI_API_KEY dans votre configuration d’environnement.',
    };
  }

  // 3. Construction des consignes adaptées à la cible
  const debutFormatted = formatFrenchDateDisplay(dateDebut);
  const finFormatted = formatFrenchDateDisplay(dateFin);

  let systemInstruction = '';
  const scopeInfo = perimetre === 'projet' && uniqueProjects.length > 0
    ? `Périmètre : Projet "${uniqueProjects[0]}" uniquement.`
    : `Périmètre : Tous les projets de l'espace.`;

  if (cible === 'n1') {
    systemInstruction = `Tu es un assistant de gestion de projet expert. Rédige un e-mail ou compte-rendu professionnel, fluide, constructif et valorisant destiné au responsable hiérarchique direct (N+1) de l'utilisateur.
Période couverte : du ${debutFormatted} au ${finFormatted}.
Espace de travail : ${spaceName || 'Principal'}.
${scopeInfo}

STRUCTURE OBLIGATOIRE :
1. Une brève introduction courtoise (1 à 2 phrases) résumant la dynamique opérationnelle et les avancées de la période.
2. Regroupe les activités strictement PAR PROJET (ex: ## Nom du Projet) ou utilise une section générale s'il n'y a qu'un projet.
3. Pour chaque projet, liste les tâches sous forme de puces claires en indiquant leur état d'avancement :
   - [Réalisé] pour les tâches achevées (statut 'done'), en valorisant les livrables concrets et réalisations réelles.
   - [En cours] pour les tâches en cours d'exécution (statut 'in_progress').
   - [Points d'attention / Bloqué] pour les tâches rencontrant un obstacle (statut 'blocked'), avec le motif succinct et le besoin d'aide/arbitrage.
   - [À faire / Planifié] pour les tâches prioritaires initialisées ou planifiées à court terme.
4. Une conclusion concise axée sur les prochaines priorités opérationnelles immédiates.

RÈGLES DE RÉDACTION :
- Ton professionnel, fluide, engagé et constructif. Focus sur les livrables concrets et les points de blocage nécessitant arbitrage.
- Ne mentionne AUCUNE donnée brute de code (pas d'ID de tâche ni de clés techniques JSON).
- Ne mentionne JAMAIS que ce document a été généré par une IA.
- Utilise une mise en page Markdown soignée avec des listes à puces et du texte en gras.`;
  } else {
    // CODIR / Parties prenantes
    systemInstruction = `Tu es un conseiller stratégique et assistant de haute direction. Rédige une note de synthèse claire et de haut niveau (Executive Summary) destinée au Comité de Direction (CODIR) ou aux Parties Prenantes clés de l'entreprise.
Période couverte : du ${debutFormatted} au ${finFormatted}.
Espace de travail : ${spaceName || 'Principal'}.
${scopeInfo}

STRUCTURE OBLIGATOIRE :
1. EXECUTIVE SUMMARY (Résumé Décisionnel) : Une synthèse de haut niveau (3-4 phrases maximum) sur l'avancement stratégique, la météo globale du projet et la valeur créée sur la période.
2. JALONS CLÉS ET VICTOIRES STRATÉGIQUES : Liste synthétique des grandes victoires et jalons clés franchis (statut 'done').
3. SYNTHÈSE DES CHANTIERS EN COURS : Aperçu des chantiers en cours d'exécution (statut 'in_progress') décrits de manière macroscopique (regrouper par axe ou thématique, ne pas lister de détails opérationnels mineurs).
4. ANALYSE DES RISQUES ET IMPACTS MAJEURS : Focus sur les risques critiques et blocages (statut 'blocked') pouvant impacter le planning stratégique ou la qualité, avec les impacts potentiels associés (sans détails techniques).

RÈGLES DE RÉDACTION :
- Ton extrêmement synthétique, percutant, de haut niveau (Executive Summary), orienté résultats.
- Focus sur l'avancement stratégique et la météo du projet. Pas de micro-détails opérationnels techniques.
- Ne mentionne AUCUN ID technique, clé JSON ou jargon informatique.
- Ne mentionne JAMAIS que ce document a été généré par une IA.
- Utilise une mise en page Markdown soignée, fluide et aérée.`;
  }

  // Compression des tâches pour optimiser les coûts et le volume de tokens
  const lightenedTasks = compressAndLightenTasks(preparedTasks);

  const legendInfo = `LÉGENDE DES DONNÉES COMPRESSÉES :
- title = Titre de la tâche
- status = Statut (done=Réalisé, in_progress=En cours, blocked=Bloqué, open=À faire, backlog=Backlog)
- project = Projet associé
- desc = Description de la tâche (tronquée)
- due = Date d'échéance
- completed = Date de réalisation
- notes = Liste de commentaires ou suivis récents`;

  const userPrompt = `${legendInfo}\n\nVoici les données d'activité compressées et allégées des ${preparedTasks.length} tâches actives sur la période :\n\n${JSON.stringify(lightenedTasks, null, 2)}\n\nRédige le compte-rendu professionnel adapté maintenant.`;

  // 4. Appel de l'API Gemini avec modèle performant Flash et fallback
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
  let lastErrorMsg = '';

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemInstruction}\n\n---\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4000,
            // Optimisation des coûts : désactivation explicite des tokens de réflexion (thinkingBudget: 0)
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `Erreur HTTP ${response.status}`;
        lastErrorMsg = message;

        // Si le modèle est introuvable (404), on essaye le modèle suivant dans la liste
        if (response.status === 404) {
          continue;
        }

        throw new Error(message);
      }

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('La réponse de l’API Gemini ne contient aucun texte.');
      }

      return {
        success: true,
        reportText: generatedText.trim(),
        tasksCount: preparedTasks.length,
        projectsCount: uniqueProjects.length,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      lastErrorMsg = msg;
      // Si ce n'est pas une erreur 404 de modèle, on s'arrête
      if (!msg.includes('404') && !msg.includes('not found')) {
        break;
      }
    }
  }

  return {
    success: false,
    reportText: '',
    tasksCount: preparedTasks.length,
    projectsCount: uniqueProjects.length,
    error: lastErrorMsg || 'Impossible de communiquer avec l’API Gemini.',
  };
}
