export type KnowledgeCategory = 'process' | 'reporting' | 'jira' | 'tooling' | 'template' | 'other';

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  contentHtml: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}
