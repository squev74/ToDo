export type KnowledgeCategory = 'process' | 'reporting' | 'jira' | 'tooling' | 'template' | 'other';

export interface KnowledgeDoc {
  id: string;
  spaceId?: string; // Espace de travail de l'article (pour le cloisonnement strict)
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  contentHtml: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  keywords?: string[]; // Mots-clés de déclenchement pour la recommandation intelligente
}

export type SopArticle = KnowledgeDoc;

