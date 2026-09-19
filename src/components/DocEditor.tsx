import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit3, 
  Trash2, 
  Copy, 
  Printer, 
  Save, 
  X, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Link as LinkIcon, 
  Code,
  FileText,
  Tag,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { KnowledgeDoc, KnowledgeCategory } from '../types';
import { sanitizeHtml } from '../utils/security';

interface DocEditorProps {
  doc: KnowledgeDoc | null; // Null if creating a new one
  onSave: (doc: KnowledgeDoc) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  isEditing: boolean;
  onEditChange: (editing: boolean) => void;
}

const CATEGORY_LABELS: Record<KnowledgeCategory, { label: string; bg: string; text: string }> = {
  process: { label: 'Procédure (SOP)', bg: 'bg-[#6B8E78]/10 border-[#6B8E78]/20', text: 'text-[#4A6352]' },
  reporting: { label: 'Reporting & Rapports', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
  jira: { label: 'Intégration Jira', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
  tooling: { label: 'Outils & Scripts', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800' },
  template: { label: 'Modèles / Templates', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800' },
  other: { label: 'Autre document', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700' },
};

export const DocEditor: React.FC<DocEditorProps> = ({
  doc,
  onSave,
  onCancel,
  onDelete,
  isEditing,
  onEditChange
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('process');
  const [tagsInput, setTagsInput] = useState('');
  const [summary, setSummary] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);

  // Synchroniser l'état local avec le document fourni
  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setCategory(doc.category);
      setTagsInput(doc.tags.join(', '));
      setSummary(doc.summary || '');
      setContentHtml(doc.contentHtml);
    } else {
      // Nouveau document : vérifier s'il y a un brouillon pré-rempli par le Copilote IA
      const prefillJson = localStorage.getItem('prefilled_sop_draft');
      if (prefillJson) {
        try {
          const prefill = JSON.parse(prefillJson);
          setTitle(prefill.title || '');
          setCategory(prefill.category || 'process');
          setTagsInput(prefill.tags ? prefill.tags.join(', ') : 'copilot, draft');
          setSummary(prefill.summary || '');
          setContentHtml(prefill.contentHtml || '');
        } catch (e) {
          console.error('Erreur lors de la lecture du brouillon pré-rempli', e);
          setTitle('');
          setCategory('process');
          setTagsInput('');
          setSummary('');
          setContentHtml('<p>Commencez à rédiger votre mode d\'emploi ici...</p>');
        } finally {
          localStorage.removeItem('prefilled_sop_draft');
        }
      } else {
        setTitle('');
        setCategory('process');
        setTagsInput('');
        setSummary('');
        setContentHtml('<p>Commencez à rédiger votre mode d\'emploi ici...</p>');
      }
    }
    setError('');
  }, [doc, isEditing]);

  // Synchroniser le contenu de l'éditeur lors de l'activation du mode édition
  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = contentHtml;
    }
  }, [isEditing, contentHtml]);

  // Commandes de mise en forme de l'éditeur Rich Text
  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const handleEditorBlur = () => {
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const handleCopy = async () => {
    try {
      // Copier le texte brut et le HTML pour plus de flexibilité
      const text = doc ? `${doc.title}\n\n${doc.summary || ''}\n\n${editorRef.current?.innerText || ''}` : '';
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Le titre du document est requis.');
      return;
    }

    const currentContent = editorRef.current ? editorRef.current.innerHTML : contentHtml;
    if (!currentContent || currentContent === '<p><br></p>' || currentContent.trim() === '') {
      setError('Le contenu du mode d\'emploi ne peut pas être vide.');
      return;
    }

    // Convertir les tags en tableau nettoyé
    const parsedTags = tagsInput
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const now = new Date().toISOString();

    const savedDoc: KnowledgeDoc = {
      id: doc?.id || `doc-${Date.now()}`,
      title: title.trim(),
      category,
      tags: parsedTags,
      summary: summary.trim() || undefined,
      contentHtml: sanitizeHtml(currentContent),
      createdAt: doc?.createdAt || now,
      updatedAt: now,
    };

    onSave(savedDoc);
    onEditChange(false);
  };

  const handleDeleteClick = () => {
    if (doc && onDelete) {
      if (confirm(`Voulez-vous vraiment supprimer définitivement le mode d'emploi "${doc.title}" ?`)) {
        onDelete(doc.id);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F0EFEB] shadow-xs flex flex-col h-full overflow-hidden">
      
      {/* Styles CSS injectés globalement pour contourner les resets Tailwind */}
      <style>{`
        .wysiwyg-custom-styles h1 {
          font-size: 1.8em !important;
          font-weight: 700 !important;
          margin-top: 1.2em !important;
          margin-bottom: 0.4em !important;
          color: #1A1D1A !important;
          line-height: 1.25 !important;
          display: block !important;
        }
        .wysiwyg-custom-styles h2 {
          font-size: 1.4em !important;
          font-weight: 600 !important;
          margin-top: 1.1em !important;
          margin-bottom: 0.3em !important;
          color: #1A1D1A !important;
          line-height: 1.3 !important;
          display: block !important;
        }
        .wysiwyg-custom-styles p {
          margin-bottom: 0.8em !important;
          line-height: 1.6 !important;
        }
        .wysiwyg-custom-styles ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
          display: block !important;
        }
        .wysiwyg-custom-styles ul li {
          list-style-type: disc !important;
          margin-bottom: 0.25em !important;
          display: list-item !important;
        }
        .wysiwyg-custom-styles ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
          display: block !important;
        }
        .wysiwyg-custom-styles ol li {
          list-style-type: decimal !important;
          margin-bottom: 0.25em !important;
          display: list-item !important;
        }
        .wysiwyg-custom-styles blockquote {
          border-left: 4px solid #6B8E78 !important;
          padding-left: 1rem !important;
          color: #4A4D4A !important;
          font-style: italic !important;
          margin: 1em 0 !important;
          background-color: #FAF9F6 !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
          border-radius: 0 8px 8px 0 !important;
          display: block !important;
        }
        .wysiwyg-custom-styles pre {
          background-color: #F4F3EF !important;
          padding: 0.75rem !important;
          border-radius: 8px !important;
          font-family: monospace !important;
          font-size: 0.85em !important;
          overflow-x: auto !important;
          margin: 1em 0 !important;
          border: 1px solid #EAE8E2 !important;
          color: #1A1D1A !important;
          display: block !important;
          white-space: pre-wrap !important;
        }
        .wysiwyg-custom-styles a {
          color: #4F46E5 !important;
          text-decoration: underline !important;
        }
        .wysiwyg-custom-styles a:hover {
          color: #4338CA !important;
        }
      `}</style>
      
      {/* 1. EN-TÊTE D'ACTION */}
      <div className="px-6 py-4 border-b border-[#F0EFEB] flex items-center justify-between bg-[#FAF9F6] shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#5D7C68]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#737873]">
            {isEditing ? (doc ? "Édition du SOP" : "Nouveau Mode d'Emploi") : "Lecture du Document"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                id="btn-edit-sop"
                type="button"
                onClick={() => onEditChange(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EAE8E2] bg-white text-xs text-[#1A1D1A] hover:bg-slate-50 transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Éditer</span>
              </button>

              <button
                id="btn-copy-sop"
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EAE8E2] bg-white text-xs text-[#1A1D1A] hover:bg-slate-50 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>

              <button
                id="btn-print-sop"
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EAE8E2] bg-white text-xs text-[#1A1D1A] hover:bg-slate-50 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Imprimer</span>
              </button>

              {onDelete && doc && (
                <button
                  id="btn-delete-sop"
                  type="button"
                  onClick={handleDeleteClick}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-xs text-rose-700 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Supprimer</span>
                </button>
              )}
            </>
          ) : (
            <button
              id="btn-cancel-sop"
              type="button"
              onClick={onCancel}
              className="rounded-xl p-1.5 text-[#737873] hover:bg-slate-100 hover:text-[#1A1D1A] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. ZONE DE CONTENU (FORMULAIRE / ÉDITEUR ou LECTEUR) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {isEditing ? (
          /* ================= MODE ÉDITION ================= */
          <form onSubmit={handleFormSubmit} className="space-y-5 text-xs">
            
            {/* Titre & Catégorie */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="sop-title-input" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Titre du document *</label>
                <input
                  id="sop-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Procédure de synchronisation des sprints Jira"
                  className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="sop-category-select" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Catégorie *</label>
                <select
                  id="sop-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                  className="w-full rounded-xl border border-[#EAE8E2] bg-white px-2 py-2 text-xs text-[#1A1D1A] focus:outline-none"
                >
                  <option value="process">Procédure (SOP)</option>
                  <option value="reporting">Reporting & Rapports</option>
                  <option value="jira">Intégration Jira</option>
                  <option value="tooling">Outils & Scripts</option>
                  <option value="template">Modèles / Templates</option>
                  <option value="other">Autre document</option>
                </select>
              </div>
            </div>

            {/* Résumé synthétique */}
            <div>
              <label htmlFor="sop-summary-input" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Résumé synthétique (Conseillé)</label>
              <input
                id="sop-summary-input"
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ex: Guide rapide pour récupérer les tickets JIRA non synchronisés et valider les allocations d'équipe."
                className="w-full rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
              />
            </div>

            {/* Mots-clés / Tags */}
            <div>
              <label htmlFor="sop-tags-input" className="block text-[10px] font-semibold text-[#737873] uppercase tracking-wider mb-1">Mots-clés / Tags (Séparés par des virgules)</label>
              <div className="relative">
                <input
                  id="sop-tags-input"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Ex: jira, hebdomadaire, csv, tutoriel"
                  className="w-full rounded-xl border border-[#EAE8E2] bg-white pl-8 pr-3 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
                />
                <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#737873]/60" />
              </div>
            </div>

            {/* ÉDITEUR ENRICHI WYSIWYG */}
            <div className="border border-[#EAE8E2] rounded-xl overflow-hidden flex flex-col min-h-[300px]">
              {/* Barre d'outils WYSIWYG */}
              <div className="bg-[#FAF9F6] border-b border-[#EAE8E2] p-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand('bold');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700"
                  title="Gras"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand('italic');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700"
                  title="Italique"
                >
                  <IpadIconItalic className="h-3.5 w-3.5" />
                </button>
                <div className="w-px bg-[#EAE8E2] mx-1 shrink-0" />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand('formatBlock', 'h1');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700 text-[10px] font-bold"
                  title="Titre 1"
                >
                  <Heading1 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand('formatBlock', 'h2');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700 text-[10px] font-bold"
                  title="Titre 2"
                >
                  <Heading2 className="h-3.5 w-3.5" />
                </button>
                <div className="w-px bg-[#EAE8E2] mx-1 shrink-0" />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand('insertUnorderedList');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700"
                  title="Liste à puces"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand('insertOrderedList');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700"
                  title="Liste numérotée"
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand('formatBlock', 'blockquote');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700"
                  title="Citation"
                >
                  <Quote className="h-3.5 w-3.5" />
                </button>
                <div className="w-px bg-[#EAE8E2] mx-1 shrink-0" />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    
                    // Récupérer et cloner la sélection actuelle dans l'éditeur
                    const selection = window.getSelection();
                    let savedRange: Range | null = null;
                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0);
                      // S'assurer que la sélection est bien à l'intérieur de notre éditeur
                      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
                        savedRange = range.cloneRange();
                      }
                    }
                    
                    const url = prompt('Entrez l\'URL du lien :');
                    if (url) {
                      // Remettre le focus sur l'éditeur
                      if (editorRef.current) {
                        editorRef.current.focus();
                      }
                      
                      // Restaurer la sélection
                      if (selection && savedRange) {
                        selection.removeAllRanges();
                        selection.addRange(savedRange);
                      }
                      
                      if (selection && !selection.isCollapsed && savedRange) {
                        document.execCommand('createLink', false, url);
                        if (editorRef.current) {
                          setContentHtml(editorRef.current.innerHTML);
                        }
                      } else {
                        const htmlToInsert = `<a href="${url}" target="_blank" class="text-[#4F46E5] hover:text-[#4338CA] underline">${url}</a>`;
                        document.execCommand('insertHTML', false, htmlToInsert);
                        if (editorRef.current) {
                          setContentHtml(editorRef.current.innerHTML);
                        }
                      }
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700"
                  title="Lien"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCommand('formatBlock', 'pre');
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#EAE8E2] text-slate-700"
                  title="Code block"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Zone d'écriture éditable */}
              <div
                id="wysiwyg-content-editor"
                ref={editorRef}
                contentEditable
                onBlur={handleEditorBlur}
                className="flex-1 p-4 outline-none wysiwyg-custom-styles prose max-w-none text-[#1A1D1A] min-h-[250px] bg-white focus:bg-slate-50/20 transition-all text-sm leading-relaxed"
                style={{ fontFamily: 'Georgia, serif' }}
              />
            </div>

            {error && (
              <p className="text-[11px] text-rose-600 font-medium">
                ⚠️ {error}
              </p>
            )}

            {/* Boutons de soumission */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#F0EFEB]">
              <button
                id="btn-cancel-sop-edit"
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-[#EAE8E2] bg-white px-4 py-2 text-xs text-[#737873] hover:text-[#1A1D1A]"
              >
                Annuler
              </button>
              <button
                id="btn-save-sop"
                type="submit"
                className="rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5D7C68] flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                Enregistrer le SOP
              </button>
            </div>
          </form>
        ) : doc ? (
          /* ================= MODE LECTURE ================= */
          <div className="space-y-6">
            
            {/* Titre, Métadonnées et Résumé */}
            <div className="space-y-3 pb-5 border-b border-[#F0EFEB]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${CATEGORY_LABELS[doc.category].bg} ${CATEGORY_LABELS[doc.category].text}`}>
                  {CATEGORY_LABELS[doc.category].label}
                </span>
                
                {doc.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 text-[9px]">
                    #{tag}
                  </span>
                ))}
              </div>

              <h2 className="text-2xl font-serif text-[#1A1D1A] leading-tight font-semibold">
                {doc.title}
              </h2>

              <div className="flex items-center gap-4 text-[10px] text-[#737873] font-medium pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Dernière mise à jour : {new Date(doc.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {doc.summary && (
                <div className="mt-3 p-3 bg-[#FAF9F6] border-l-2 border-[#6B8E78] text-xs text-[#4A4D4A] rounded-r-xl italic">
                  <strong>Synthèse :</strong> {doc.summary}
                </div>
              )}
            </div>

            {/* Rendu du HTML dans le style de lecture élégant */}
            <div className="wysiwyg-custom-styles prose max-w-none text-[#1A1D1A] text-sm leading-relaxed font-sans" style={{ fontFamily: 'Georgia, serif' }}>
              <div 
                id="doc-html-render"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.contentHtml) }} 
                className="space-y-4"
              />
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-16 text-center text-[#737873] space-y-3">
            <FileText className="h-12 w-12 text-[#737873]/30 stroke-[1]" />
            <p className="text-xs">Sélectionnez un mode d'emploi dans la liste de gauche pour lire ou éditer son contenu.</p>
          </div>
        )}

      </div>
    </div>
  );
};

// Icône d'italique temporaire ou de contournement pour lucide-react
const IpadIconItalic: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <span className={`${className} italic font-serif font-bold text-xs select-none block text-center px-0.5`}>
      I
    </span>
  );
};
