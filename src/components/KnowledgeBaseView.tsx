import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  ChevronRight, 
  Tag, 
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  BookOpen
} from 'lucide-react';
import { KnowledgeDoc, KnowledgeCategory } from '../types';
import { DocEditor } from './DocEditor';
import { useAuth } from '../context/AuthContext';
import { fetchKnowledgeDocs, saveKnowledgeDoc, deleteKnowledgeDoc } from '../services/knowledgeService';

// Éléments de départ par défaut (Starter Pack pour l'utilisateur)
const STARTER_DOCS: KnowledgeDoc[] = [
  {
    id: 'starter-1',
    title: "Guide d'importation et nettoyage des fichiers CSV Jira",
    category: 'jira',
    tags: ['jira', 'import', 'csv', 'tuto'],
    summary: "Procédure pas-à-pas pour exporter des tickets de Jira Cloud, nettoyer les colonnes inutiles, et réaliser l'importation propre dans le visualisateur de sprints.",
    contentHtml: `
      <h2>1. Exportation des données depuis Jira Cloud</h2>
      <p>Rendez-vous dans votre filtre Jira, cliquez sur <strong>Exporter</strong> en haut à droite, puis sélectionnez <strong>Exporter au format CSV (Tous les champs)</strong>.</p>
      
      <h2>2. Nettoyage préliminaire du fichier Excel/CSV</h2>
      <p>Ouvrez le fichier exporté et vérifiez les colonnes obligatoires suivantes :</p>
      <ul>
        <li><strong>Issue Key (Clé de ticket) :</strong> Doit être au format <code>PROJ-XXXX</code>.</li>
        <li><strong>Summary (Résumé) :</strong> Le titre ou nom du ticket.</li>
        <li><strong>Status (Statut) :</strong> Indispensable pour la répartition de l'avancement.</li>
        <li><strong>Story Points (Points d'effort) :</strong> Assurez-vous que les valeurs non définies soient remplacées par <code>0</code> pour éviter les écarts d'analyse.</li>
      </ul>
      
      <blockquote><strong>Astuce Pro :</strong> Conservez une nomenclature uniforme des priorités et des assignés pour faciliter le groupement automatique.</blockquote>
      
      <h2>3. Résolution des erreurs communes d'importation</h2>
      <p>Si un ticket n'apparaît pas ou génère une alerte, assurez-vous que le codage du fichier est bien réglé sur <strong>UTF-8</strong> (souvent mal interprété par défaut sur Excel Windows).</p>
    `,
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-15T15:30:00.000Z'
  },
  {
    id: 'starter-2',
    title: "SOP : Préparation du rapport mensuel avec l'IA Gemini",
    category: 'reporting',
    tags: ['ia', 'gemini', 'rapport', 'mensuel'],
    summary: "Méthode officielle pour solliciter la génération automatique de l'Executive Summary via l'IA en optimisant les tokens et en incluant le registre RAID.",
    contentHtml: `
      <h2>1. Préparation de la période de reporting</h2>
      <p>Avant d'envoyer la demande de génération à l'IA, assurez-vous de :</p>
      <ul>
        <li>Mettre à jour l'ensemble des statuts des tâches (au moins 90% de conformité de saisie).</li>
        <li>Valider et dater les livrables complétés.</li>
        <li>Saisir les risques majeurs dans le <strong>Registre RAID</strong> (criticité supérieure ou égale à 6).</li>
      </ul>

      <h2>2. Lancement de la génération automatisée</h2>
      <p>Cliquez sur l'onglet de génération IA. L'application compresse les données au format JSON ultra-léger pour réduire les coûts d'API (en utilisant Gemini 3.5 Flash) et force le paramètre de budget de réflexion à zéro.</p>

      <h2>3. Relecture et ajustement</h2>
      <p>Le rapport généré peut être copié au format Markdown ou HTML. Il est recommandé de vérifier l'exactitude des plans d'action associés aux risques majeurs détectés avant de l'exporter.</p>
    `,
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-09-18T11:45:00.000Z'
  },
  {
    id: 'starter-3',
    title: "Modèle de convocation et d'ordre du jour Copil",
    category: 'template',
    tags: ['template', 'copil', 'reunion', 'gouvernance'],
    summary: "Structure réutilisable pour animer le comité de pilotage mensuel, valider les jalons, et acter les arbitrages budgétaires et de capacité.",
    contentHtml: `
      <h2>Ordre du Jour - Comité de Pilotage (Copil)</h2>
      <p><strong>Projet :</strong> [Nom du Projet]<br><strong>Date :</strong> [JJ/MM/AAAA]<br><strong>Participants :</strong> Sponsors, Directeur de Programme, Chefs de Projets</p>
      
      <hr />
      
      <h3>1. Revue de l'Avancement Global (15 min)</h3>
      <p>Présentation du tableau de bord d'avancement et de la trajectoire des livrables.</p>
      
      <h3>2. Planification Capacitaire & Glissements (15 min)</h3>
      <p>Vérification du plan de charge (capacitaire vs réel) et validation des prolongations de ressources requises.</p>
      
      <h3>3. Analyse des Risques & Arbitrages (15 min)</h3>
      <p>Revue des éléments RAID critiques et décisions d'atténuation.</p>
      
      <h3>4. Planification des Prochains Jalons (15 min)</h3>
      <p>Validation des livrables de la phase suivante et signature de la feuille de route.</p>
    `,
    createdAt: '2026-09-05T14:00:00.000Z',
    updatedAt: '2026-09-05T14:30:00.000Z'
  }
];

const CATEGORY_NAMES: Record<KnowledgeCategory, string> = {
  process: 'Procédures & SOP',
  reporting: 'Reporting',
  jira: 'Jira Cloud',
  tooling: 'Outils & Scripts',
  template: 'Modèles',
  other: 'Autre'
};

export const KnowledgeBaseView: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Charger les documents existants depuis le localStorage ou utiliser les starters
  const [docs, setDocs] = useState<KnowledgeDoc[]>(() => {
    const local = localStorage.getItem('knowledge_docs_list');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Erreur lors du chargement des SOPs', e);
      }
    }
    return STARTER_DOCS;
  });

  const [selectedDocId, setSelectedDocId] = useState<string | null>(() => {
    return docs.length > 0 ? docs[0].id : null;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Synchronisation avec Firestore au montage ou quand l'utilisateur change
  useEffect(() => {
    if (!user?.uid) return;

    const loadDocsFromFirestore = async () => {
      setLoading(true);
      try {
        const firestoreDocs = await fetchKnowledgeDocs(user.uid);
        if (firestoreDocs.length > 0) {
          setDocs(firestoreDocs);
        } else {
          // Si la collection est vide, on initialise la base avec les starters
          for (const sDoc of STARTER_DOCS) {
            await saveKnowledgeDoc(user.uid, sDoc);
          }
          setDocs(STARTER_DOCS);
        }
      } catch (err) {
        console.error('Erreur de récupération des SOPs depuis Firestore :', err);
      } finally {
        setLoading(false);
      }
    };

    loadDocsFromFirestore();
  }, [user?.uid]);

  // Sauvegarder les documents localement à chaque changement (LocalStorage en backup de secours)
  useEffect(() => {
    localStorage.setItem('knowledge_docs_list', JSON.stringify(docs));
  }, [docs]);

  // Gérer la sélection automatique du premier document disponible
  useEffect(() => {
    if (!selectedDocId && docs.length > 0) {
      setSelectedDocId(docs[0].id);
    }
  }, [docs, selectedDocId]);

  // Récupérer le document actuellement sélectionné
  const activeDoc = useMemo(() => {
    return docs.find(doc => doc.id === selectedDocId) || null;
  }, [docs, selectedDocId]);

  // Extraire tous les tags uniques pour la barre de filtres
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    docs.forEach(doc => {
      doc.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [docs]);

  // Filtrer la liste des documents
  const filteredDocs = useMemo(() => {
    return docs.filter(doc => {
      // Recherche textuelle
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (doc.summary && doc.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
        doc.contentHtml.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtre catégorie
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;

      // Filtre tag
      const matchesTag = selectedTag === 'all' || doc.tags.includes(selectedTag);

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [docs, searchQuery, selectedCategory, selectedTag]);

  // Enregistrer ou modifier un document
  const handleSaveDoc = async (savedDoc: KnowledgeDoc) => {
    setDocs(prevDocs => {
      const exists = prevDocs.some(d => d.id === savedDoc.id);
      if (exists) {
        return prevDocs.map(d => d.id === savedDoc.id ? savedDoc : d);
      } else {
        return [savedDoc, ...prevDocs];
      }
    });

    if (user?.uid) {
      try {
        await saveKnowledgeDoc(user.uid, savedDoc);
      } catch (err) {
        console.error('Erreur de sauvegarde de la SOP sur Firestore :', err);
      }
    }

    setSelectedDocId(savedDoc.id);
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  // Supprimer un document
  const handleDeleteDoc = async (id: string) => {
    const remaining = docs.filter(d => d.id !== id);
    setDocs(remaining);

    if (user?.uid) {
      try {
        await deleteKnowledgeDoc(user.uid, id);
      } catch (err) {
        console.error('Erreur de suppression de la SOP sur Firestore :', err);
      }
    }
    
    // Sélectionner un autre document s'il en reste
    if (remaining.length > 0) {
      setSelectedDocId(remaining[0].id);
    } else {
      setSelectedDocId(null);
    }
    
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  // Initier la création d'un nouveau SOP
  const handleInitCreate = () => {
    setIsCreatingNew(true);
    setIsEditing(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      
      {/* SECTION BANNIÈRE EXPLICATIVE JAPANDI */}
      <div className="rounded-2xl bg-[#FAF9F6] p-4 border border-[#F0EFEB] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-[#5D7C68]" />
          <div>
            <h3 className="text-sm font-bold text-[#1A1D1A]">Base de Connaissances & Wiki SOP</h3>
            <p className="text-[11px] text-[#737873]">Documentez vos modes d'emploi, processus de validation et tutoriels d'intégration d'équipe.</p>
          </div>
        </div>

        <button
          id="btn-create-sop-doc"
          type="button"
          onClick={handleInitCreate}
          className="flex items-center gap-1.5 rounded-xl bg-[#6B8E78] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5D7C68] transition-all"
        >
          <Plus className="h-4 w-4" />
          Rédiger un SOP
        </button>
      </div>

      {/* BARRE DE RECHERCHE ET FILTRES RAPIDES */}
      <div className="rounded-2xl border border-[#F0EFEB] bg-white p-4 flex flex-wrap items-center gap-3.5 shadow-xs">
        
        {/* Recherche */}
        <div className="flex-1 min-w-[200px] relative">
          <input
            id="sop-search-input"
            type="text"
            placeholder="Rechercher un mot-clé ou titre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#EAE8E2] bg-white pl-9 pr-4 py-2 text-xs text-[#1A1D1A] focus:border-[#6B8E78] focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#737873]" />
        </div>

        {/* Filtre Catégorie */}
        <div className="relative shrink-0">
          <select
            id="sop-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as KnowledgeCategory | 'all')}
            className="rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:outline-none"
          >
            <option value="all">Toutes les catégories</option>
            <option value="process">Procédures & SOP</option>
            <option value="reporting">Reporting</option>
            <option value="jira">Jira Cloud</option>
            <option value="tooling">Outils & Scripts</option>
            <option value="template">Modèles</option>
            <option value="other">Autres</option>
          </select>
        </div>

        {/* Filtre Tag */}
        <div className="relative shrink-0">
          <select
            id="sop-tag-filter"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="rounded-xl border border-[#EAE8E2] bg-white px-3 py-2 text-xs text-[#1A1D1A] focus:outline-none"
          >
            <option value="all">Tous les mots-clés</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>#{tag}</option>
            ))}
          </select>
        </div>

      </div>

      {/* REPRÉSENTATION DOUBLE COLONNE : 30% LISTE, 70% ZONE ACTIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* COLONNE DE GAUCHE : LISTE DES DOCUMENTS */}
        <div className="lg:col-span-4 rounded-2xl border border-[#F0EFEB] bg-white overflow-hidden flex flex-col h-[650px]">
          <div className="p-4 border-b border-[#F0EFEB] bg-[#FAF9F6] shrink-0">
            <span className="text-[10px] font-bold text-[#737873] uppercase tracking-wider block">
              Documents disponibles ({filteredDocs.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#F0EFEB]">
            {loading ? (
              <div className="p-8 text-center text-[#737873] space-y-2">
                <div className="w-5 h-5 border-2 border-[#6B8E78] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[11px] font-light">Sychronisation Cloud...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-[#737873] space-y-2">
                <FileText className="mx-auto h-8 w-8 text-[#737873]/30 stroke-[1.5]" />
                <p className="text-xs">Aucun document ne correspond à vos filtres.</p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isActive = doc.id === selectedDocId && !isCreatingNew;
                return (
                  <button
                    key={doc.id}
                    id={`btn-sop-item-${doc.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setIsEditing(false);
                      setIsCreatingNew(false);
                    }}
                    className={`w-full text-left p-4 hover:bg-[#FAF9F6]/50 transition-colors flex items-start gap-3 relative ${
                      isActive ? 'bg-[#FAF9F6]' : ''
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6B8E78]" />
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[9px] font-semibold text-[#6B8E78] uppercase tracking-wider font-mono">
                          {CATEGORY_NAMES[doc.category]}
                        </span>
                        
                        <div className="flex items-center gap-1 text-[9px] text-[#737873]">
                          <Clock className="h-2.5 w-2.5" />
                          <span>
                            {new Date(doc.updatedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-[#1A1D1A] group-hover:text-[#5D7C68] transition-colors break-words line-clamp-1">
                        {doc.title}
                      </h4>

                      {doc.summary && (
                        <p className="text-[10px] text-[#737873] font-light line-clamp-2">
                          {doc.summary}
                        </p>
                      )}

                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {doc.tags.map((tag) => (
                            <span key={tag} className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <ChevronRight className={`h-4 w-4 text-[#737873]/50 shrink-0 self-center transition-transform ${
                      isActive ? 'translate-x-0.5 text-[#6B8E78]' : ''
                    }`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNE DE DROITE : VISIONNEUSE / ÉDITEUR */}
        <div className="lg:col-span-8 flex flex-col h-[650px]">
          <DocEditor
            doc={isCreatingNew ? null : activeDoc}
            onSave={handleSaveDoc}
            onCancel={() => {
              setIsEditing(false);
              setIsCreatingNew(false);
            }}
            onDelete={handleDeleteDoc}
            isEditing={isEditing}
            onEditChange={setIsEditing}
          />
        </div>

      </div>

    </div>
  );
};
