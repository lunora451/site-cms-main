/**
 * Collections config — reads Zod schemas from content.config.ts
 * and merges them with CMS UI metadata from cms.config.ts.
 *
 * This replaces the old JSON-based collection definitions.
 * The Zod schemas are the single source of truth for field structure;
 * cms.config.ts provides UI labels, help text, and editor settings.
 */

import { z } from 'astro/zod';
import { collectionSchemas } from './schemas';
import { cmsConfig, type CmsCollectionConfig } from '../../admin/cms.config';
import { readSchemaFields, initZod, type FieldOverride } from './schema-reader';

// Initialize the schema-reader with the Zod instance from Astro
initZod(z);

export interface CollectionField {
    name: string;
    type: "string" | "textarea" | "slug" | "image" | "video" | "markdown" | "date" | "select" | "checkbox";
    label: string;
    placeholder?: string;
    required?: boolean;
    class?: string;
    generateFrom?: string;
    accept?: string;
    help?: string;
    editor?: string;
    options?: Array<{ value: string; label: string }>;
    validation?: {
        maxLength?: number;
        minLength?: number;
        pattern?: string;
    };
}

export interface CollectionSettings {
    enablePreview?: boolean;
    autoSave?: boolean;
    autoSaveInterval?: number;
    enableDraftMode?: boolean;
    previewChange?: string;
}

export interface CollectionConfig {
    name: string;
    title: string;
    description?: string;
    targetDirectory: string;
    fields: CollectionField[];
    settings: CollectionSettings;
}

/**
 * Hardcoded mapping from collection name to data directory.
 * This mirrors the glob `base` paths in content.config.ts.
 *
 * Note: The glob loader doesn't expose its `base` at runtime,
 * so we maintain this mapping here. The github.ts functions
 * use the collection name directly to build `src/data/{collection}`.
 */
const DATA_DIRECTORIES: Record<string, string> = {
    blog: 'src/data/blog',
    editable: 'src/data/editable',
    catta: 'src/data/catta',
};

/**
 * Build the full fields array for a collection by reading its Zod schema
 * and merging CMS UI overrides. If the collection has a markdown body,
 * a "content" field of type "markdown" is appended.
 */
function buildCollectionFields(
    collectionName: string,
    collectionDef: any,
    cmsConf?: CmsCollectionConfig
): CollectionField[] {
    const schema = collectionDef?.schema;
    if (!schema) {
        // No schema defined — if hasBody, just return a markdown field
        if (cmsConf?.hasBody) {
            return [{
                name: 'content',
                type: 'markdown',
                label: 'Contenu de l\'article',
                class: 'preview-content',
                required: true,
                editor: 'simplemde',
                help: 'Le contenu principal de votre article en Markdown',
            }];
        }
        return [];
    }

    // Read fields from the Zod schema with UI overrides
    const overrides = cmsConf?.fields || {};
    let fields = readSchemaFields(schema, overrides);

    // Append the markdown body field if needed
    if (cmsConf?.hasBody) {
        fields.push({
            name: 'content',
            type: 'markdown',
            label: 'Contenu de l\'article',
            class: 'preview-content',
            required: true,
            editor: 'simplemde',
            help: 'Le contenu principal de votre article en Markdown',
        });
    }

    return fields;
}

/**
 * Build a full CollectionConfig from a collection definition and CMS config.
 */
function buildCollectionConfig(name: string): CollectionConfig | null {
    const schema = collectionSchemas[name];
    if (!schema) return null;

    const cmsConf = cmsConfig[name];

    return {
        name,
        title: cmsConf?.title || name,
        description: cmsConf?.description || '',
        targetDirectory: DATA_DIRECTORIES[name] || `src/data/${name}`,
        fields: buildCollectionFields(name, { schema }, cmsConf),
        settings: cmsConf?.settings || {},
    };
}

// ─── Public API (same interface as before) ────────────────────────

/**
 * Get all available collection names
 */
export function getCollectionNames(): string[] {
    return Object.keys(collectionSchemas);
}

/**
 * Load a specific collection config
 */
export function getCollection(name: string): CollectionConfig | null {
    return buildCollectionConfig(name);
}

/**
 * Get all collections with their configs
 */
export function getAllCollections(): Record<string, CollectionConfig> {
    const result: Record<string, CollectionConfig> = {};
    for (const name of getCollectionNames()) {
        const config = buildCollectionConfig(name);
        if (config) {
            result[name] = config;
        }
    }
    return result;
}

/**
 * Get the fields for a specific collection
 */
export function getCollectionFields(name: string): CollectionField[] {
    const config = buildCollectionConfig(name);
    return config?.fields || [];
}
