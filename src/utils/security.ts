/**
 * Sécurisation et Assainissement des données HTML (Anti-XSS)
 * Conforme aux directives OWASP Top 10 (A03:2021-Injection / Cross-Site Scripting)
 */

/**
 * Assainit une chaîne de caractères HTML en n'autorisant que les balises,
 * attributs et protocoles sécurisés sur liste blanche pour empêcher toute exécution de script malveillant.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof window === 'undefined') return html || '';
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Liste blanche des balises HTML autorisées pour le formateur de texte enrichi
    const allowedTags = new Set([
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'p', 'br', 'span', 'div',
      'b', 'strong', 'i', 'em', 'u', 's', 'strike',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img'
    ]);
    
    // Liste blanche des attributs autorisés par balise
    const allowedAttributes: Record<string, string[]> = {
      'a': ['href', 'title', 'target', 'class'],
      'img': ['src', 'alt', 'title', 'class', 'width', 'height'],
      'span': ['class', 'style'],
      'div': ['class', 'style'],
      'blockquote': ['class'],
      'pre': ['class'],
      'code': ['class']
    };

    // Parcours récursif de l'arbre DOM pour nettoyer chaque élément
    const sanitizeElement = (element: Element) => {
      const tagName = element.tagName.toLowerCase();
      
      // Si la balise n'est pas sur liste blanche, on la remplace par son contenu textuel pour préserver l'information sans danger
      if (!allowedTags.has(tagName)) {
        const textNode = doc.createTextNode(element.textContent || '');
        element.parentNode?.replaceChild(textNode, element);
        return;
      }
      
      // Assainir les attributs de l'élément
      const attrs = Array.from(element.attributes);
      const allowedAttrs = allowedAttributes[tagName] || [];
      
      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase();
        
        // Supprimer immédiatement les attributs non autorisés (ex: onload, onerror, onclick, etc.)
        if (!allowedAttrs.includes(attrName)) {
          element.removeAttribute(attr.name);
          continue;
        }
        
        // Sécuriser les liens (href) et sources d'images (src) contre les protocoles d'injection (javascript:, data:)
        if (attrName === 'href' || attrName === 'src') {
          const val = attr.value.trim().toLowerCase();
          if (
            val.startsWith('javascript:') || 
            val.startsWith('data:') || 
            val.startsWith('vbscript:') || 
            val.startsWith('file:')
          ) {
            element.removeAttribute(attr.name);
          }
        }
      }
      
      // Nettoyer récursivement tous les nœuds enfants (les collections sont dynamiques, on utilise Array.from pour figer la liste)
      const children = Array.from(element.children);
      children.forEach(sanitizeElement);
    };
    
    // Nettoyer tous les nœuds de premier niveau présents dans le body
    Array.from(doc.body.children).forEach(sanitizeElement);
    
    return doc.body.innerHTML;
  } catch (error) {
    console.error('Erreur lors de l\'assainissement HTML :', error);
    // En cas d'erreur inattendue de parsing, on renvoie une version textuelle échappée par précaution
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
}
