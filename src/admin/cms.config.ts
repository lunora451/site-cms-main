/**
 * CMS Configuration — UI metadata for content collections.
 *
 * This file provides labels, placeholders, help text, and settings
 * that complement the Zod schemas in content.config.ts.
 *
 * The schema-reader auto-generates fields from Zod types;
 * this file only provides UI overrides and CMS-specific settings.
 */

import type { FieldOverride } from '../lib/schema-reader';

export interface CmsCollectionConfig {
    /** Display title for the collection in the admin UI */
    title: string;
    /** Short description shown in the dashboard */
    description?: string;
    /** Whether this collection's entries have a markdown body (content after frontmatter) */
    hasBody: boolean;
    /** Admin preview and editor settings */
    settings: {
        enablePreview?: boolean;
        autoSave?: boolean;
        autoSaveInterval?: number;
        enableDraftMode?: boolean;
        previewChange?: string;
    };
    /** Per-field UI overrides — keys match frontmatter field names */
    fields?: Record<string, FieldOverride>;
}

export const cmsConfig: Record<string, CmsCollectionConfig> = {
    // ─── Atelier ─────────────────────────────────────────────────────
    atelier: {
        title: "Ateliers",
        description: "Gestion des ateliers et stages",
        hasBody: false,
        settings: {
            enablePreview: true,
            autoSave: true,
            autoSaveInterval: 30000,
            previewChange: "previewAtelier",
        },
        fields: {
            title: {
                label: "Titre de l'atelier",
                placeholder: "Ex: Magnétisme : Initiation...",
                required: true,
                validation: { maxLength: 200, minLength: 5 },
            },
            date: {
                label: "Date de l'atelier",
                help: "Date à laquelle aura lieu l'atelier",
            },
            horaire: {
                label: "Horaire",
                placeholder: "Ex: 13h30 - 17h30",
            },
            lieu: {
                label: "Lieu",
                placeholder: "Ex: Le Comptoir des Minéraux...",
            },
            lieuUrl: {
                label: "Lien Google Maps",
                placeholder: "https://www.google.com/maps/...",
            },
            description: {
                type: "textarea",
                label: "Description/Programme",
                help: "Détails de l'atelier (accepte le texte multi-ligne)",
            },
            prix: {
                label: "Prix (€)",
                placeholder: "90",
            },
            pictureHeader: {
                label: "Image de couverture",
                accept: "image/*",
            },
            alt: {
                label: "Description de l'image (ALT)",
                placeholder: "Texte pour l'accessibilité",
            },
        },
    },
};

/**
 * 💡 EXEMPLE COMPLET DE CONFIGURATION (Commenté)
 * Utilisez cet exemple comme référence pour ajouter de nouvelles collections ou champs.
 * Copiez-collez et décommentez ce dont vous avez besoin.
 * 
 * example: {
 *     title: "Titre de la Collection",
 *     description: "Description affichée sur le tableau de bord",
 *     hasBody: true, // Si l'article accepte du contenu Markdown après le frontmatter
 *     settings: {
 *         enablePreview: true,      // Active la prévisualisation en temps réel
 *         autoSave: true,           // Sauvegarde automatique pendant l'édition
 *         autoSaveInterval: 30000,  // Intervalle de sauvegarde (ms)
 *         enableDraftMode: true,    // Permet de sauvegarder en brouillon (published: false)
 *         previewChange: "previewCustom", // Nom du composant de preview Svelte à utiliser
 *     },
 *     fields: {
 *         // 1. Champ Texte Standard (Inferred by Zod string)
 *         title: {
 *             label: "Titre principal",
 *             placeholder: "Saisissez le titre...",
 *             help: "S'affiche en haut de page",
 *             required: true,
 *             validation: { minLength: 5, maxLength: 100 }
 *         },
 * 
 *         // 2. Champ Slug (Généré automatiquement)
 *         slug: {
 *             type: "slug",
 *             label: "Lien URL (Slug)",
 *             generateFrom: "title", // Se synchronise avec le champ 'title'
 *             help: "L'adresse web de l'article",
 *             validation: { pattern: "^[a-z0-9-]+$" }
 *         },
 * 
 *         // 3. Champ Zone de Texte (Textarea)
 *         excerpt: {
 *             type: "textarea",
 *             label: "Résumé / Extrait",
 *             placeholder: "Petit texte d'introduction...",
 *             help: "Utilisé pour la liste des articles",
 *             validation: { maxLength: 250 }
 *         },
 * 
 *         // 4. Champ Sélection (Dropdown / Select)
 *         category: {
 *             type: "select",
 *             label: "Catégorie",
 *             options: [
 *                 { value: "news", label: "Actualités" },
 *                 { value: "tutoriaux", label: "Tutoriels" },
 *                 "Autre" // Peut aussi être une simple chaîne
 *             ],
 *             help: "Choisissez la catégorie principale"
 *         },
 * 
 *         // 5. Champ Image
 *         coverImage: {
 *             type: "image", // Inferred if Astro image() is used in Zod
 *             label: "Image de couverture",
 *             accept: "image/*",
 *             help: "Format recommandé: 1200x630px"
 *         },
 * 
 *         // 6. Champ Vidéo
 *         heroVideo: {
 *             type: "video",
 *             label: "Vidéo d'arrière-plan",
 *             accept: "video/*",
 *             help: "Fichier .mp4 recommandé"
 *         },
 * 
 *         // 7. Champ Date
 *         eventDate: {
 *             type: "date",
 *             label: "Date de l'événement"
 *         },
 * 
 *         // 8. Champ Case à cocher (Boolean)
 *         isFeatured: {
 *             label: "Mettre en avant",
 *             help: "Si coché, apparaîtra sur la page d'accueil"
 *         },
 * 
 *         // 9. Champ avec Classe CSS Personnalisée (pour le styling du formulaire)
 *         specialInput: {
 *             label: "Input Spécial",
 *             class: "col-span-2 border-primary"
 *         },
 * 
 *         // 10. Configuration du corps Markdown (si hasBody: true)
 *         // Note: Le champ est automatiquement nommé 'content' en interne
 *         content: {
 *             label: "Contenu Principal",
 *             editor: "simplemde", // Force l'utilisation de l'éditeur Markdown
 *             help: "Rédigez le contenu complet ici"
 *         }
 *     }
 * }
 */
