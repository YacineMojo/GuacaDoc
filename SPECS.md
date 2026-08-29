# Cahier des charges

## 1. Objectif

Une plateforme web qui permet de faire analyser un document sensible par un agent IA sans jamais transmettre le document.

Le fichier est chargé dans le navigateur et n'en sort pas. L'agent y accède uniquement via des tools WebMCP dont chaque réponse traverse une couche de politique : substitution des entités identifiantes par des jetons stables, plafond de volume transmis, journal d'audit visible.

L'utilisateur voit en permanence, en temps réel, ce qui a réellement quitté sa machine.

## 2. Problème traité

Aujourd'hui, faire analyser un contrat, un dossier médical ou un document interne par une IA suppose de l'uploader intégralement. L'utilisateur n'a aucune visibilité ni aucun contrôle sur ce qui part.

Cet outil vise un déploiement en entreprise avec des règles définies, pour que les salariés puissent utiliser l'IA sans exposer de données sensibles.

L'outil n'est pas spécifique à un type de document. C'est une couche générique d'anonymisation et de contrôle de l'information transmise aux agents.

## 3. Principes d'architecture non négociables

Ces contraintes ne doivent être contournées à aucun moment du développement.

1. Aucun appel réseau sortant depuis l'application. Pas de backend, pas de route API, aucun `fetch` vers un service tiers.
2. Le document et la table de correspondance restent en mémoire dans l'onglet. Rien en `localStorage`, rien en `IndexedDB`, rien sur disque.
3. Aucun tool ne renvoie le document intégral. Il n'existe pas de `get_full_text`.
4. La politique est appliquée dans le wrapper, en JavaScript. Elle n'est jamais déléguée au modèle. Les consignes placées dans les descriptions de tools sont un confort de comportement, jamais un mécanisme de sécurité.
5. La détection d'entités est locale. Aucun appel à une IA distante, sous aucun prétexte : ce serait reproduire exactement le problème que l'outil corrige.

## 4. Stack

- Next.js en export statique, déployable sur Netlify, Vercel ou Render.
- Aucune route serveur.
- Extraction de texte côté client uniquement : `pdf.js` pour le PDF, `mammoth` pour le docx, lecture directe pour txt et markdown.
- API WebMCP : `document.modelContext.registerTool()` et `requestUserInteraction()`.

## 5. Fonctionnalités par ordre de construction

### Phase 0 : socle

- Import par glisser-déposer. Formats : txt, md, pdf, docx.
- Extraction du texte et découpage en sections adressables par identifiant.
- Affichage du document dans la page.
- État applicatif en mémoire uniquement.

### Phase 1 : mode Édition, table de correspondance

C'est ici que l'utilisateur décide, une fois, ce qui sortira et sous quelle forme.

- Détection locale par expressions régulières : emails, téléphones, IBAN, dates, montants, numéros de référence.
- Heuristique sur les séquences en majuscules pour les noms propres et raisons sociales.
- Sélection manuelle au curseur pour ajouter une entité que la détection a manquée.
- Chaque entité reçoit un type et un jeton.
- **Stabilité du jeton** : une même valeur source produit toujours le même jeton dans tout le document. C'est ce qui préserve la validité de l'analyse. Une substitution aléatoire casserait tout raisonnement de l'agent.
- Trois niveaux par entité :
  - `visible` : transmis tel quel
  - `pseudonymisé` : transmis sous forme de jeton
  - `bloqué` : jamais transmis, sous aucune forme
- Prévisualisation « ce que l'agent verra », en regard du document réel.

### Phase 2 : couche de politique

Le cœur du projet. Un wrapper qui enveloppe chaque enregistrement de tool.

- Signature du type `registerToolWithPolicy(definition, policy)`.
- La politique porte : niveau d'accès, plafond de volume, substitution active ou non, confirmation utilisateur requise ou non.
- La substitution est appliquée en sortie, systématiquement, sur toute valeur renvoyée. Elle ne doit pas pouvoir être court-circuitée par un chemin de code.
- Comptage des octets réellement renvoyés à l'agent, cumulé sur la session.
- **Budget** exprimé en pourcentage du texte extrait, réglé par l'utilisateur, valeur par défaut 30 %. Les métadonnées de structure sont exclues du calcul.
- Au dépassement, le tool renvoie une réponse structurée et exploitable indiquant que le budget est atteint et invitant à une requête plus ciblée. Jamais une exception brute.
- Toute action d'écriture passe par `requestUserInteraction()`.
- Journal d'audit horodaté de chaque appel : tool appelé, arguments, octets renvoyés, décision de la politique.

### Phase 3 : tools WebMCP

Surface volontairement étroite.

- `get_document_outline` : structure et titres de sections, sans contenu.
- `search_document(query)` : renvoie des identifiants de sections et des extraits courts.
- `get_section(id)` : contenu d'une section, après substitution.
- `get_metrics()` : pourcentage consommé, octets transmis, budget restant.

Les métriques sont également jointes en champ secondaire à chaque réponse de tool, pour que l'agent s'autolimite. Ce champ est informatif : l'application ne dépend jamais de la façon dont le modèle l'interprète.

Les descriptions de tools sont sobres et invitent à la parcimonie, en une phrase. Pas de texte long, pas de formulation qui ressemble à une instruction injectée.

### Phase 4 : mode Agent, interface

- Compteur en temps réel : pourcentage du document consommé, en grand, avec le volume exact en octets en dessous.
- Flux temps réel du texte transmis à l'agent, qui défile latéralement.
- Panneau de correspondance permanent : jeton et valeur réelle en regard, consultable pendant que l'agent travaille.
- Champ de décodage : l'utilisateur colle la réponse de l'agent, l'application resubstitue localement les valeurs réelles.
- Blocage visible : au dépassement du budget, l'événement s'affiche en rouge dans le journal.

### Phase 5 : finitions

- Jeu de données de démonstration entièrement fictif. Aucun nom d'entreprise ou de personne réelle, y compris comme exemple d'anonymisation.
- README expliquant le modèle de menace traité, ce que l'outil garantit et ce qu'il ne garantit pas.
- Export du journal d'audit de la session.

## 6. Hors périmètre

- Pas de conseil juridique ni d'interprétation métier. L'application transporte et protège, elle n'analyse pas.
- Aucune revendication de conformité réglementaire.
- Pas d'extraction en bibliothèque générique publiable séparément, sauf si le reste est terminé.
- Pas de détection d'entités par modèle distant.

## 7. Limites connues, à documenter explicitement

- Le texte libre est le point faible. Une variante orthographique, une abréviation ou une mention partielle d'une entité peut échapper à la substitution.
- La substitution réduit la surface d'exposition, elle ne la supprime pas. Un agent qui pose un grand nombre de requêtes ciblées peut reconstituer une partie du document dans la limite du budget.
- Le pseudonyme protège l'identité, pas nécessairement l'unicité : une entité au comportement singulier peut rester réidentifiable par recoupement.

Ces limites doivent figurer dans le README. Les annoncer renforce la crédibilité du projet.
