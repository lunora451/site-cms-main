/**
 * Schema Reader — Introspects Zod schemas from content.config.ts
 * to automatically generate CMS field definitions.
 *
 * This module unwraps Zod types (Optional, Default, Pipeline, etc.)
 * and maps them to CMS UI field types.
 */

import type { CollectionField } from './collections';

/** Metadata overrides from cms.config.ts for a single field */
export interface FieldOverride {
    label?: string;
    placeholder?: string;
    help?: string;
    class?: string;
    type?: string; // Override inferred type, e.g. "slug", "textarea", "video"
    generateFrom?: string;
    accept?: string;
    required?: boolean;
    editor?: string;
    options?: Array<{ value: string; label: string } | string>;
    validation?: {
        maxLength?: number;
        minLength?: number;
        pattern?: string;
    };
}

/**
 * Unwrap a Zod type to its innermost base type.
 * Handles: ZodOptional, ZodDefault, ZodNullable, ZodPipeline, ZodEffects
 */
function unwrapZodType(zodType: any): { baseType: any; isOptional: boolean; hasDefault: boolean; defaultValue?: any } {
    let isOptional = false;
    let hasDefault = false;
    let defaultValue: any = undefined;
    let current = zodType;

    // Max depth to avoid infinite loops
    for (let i = 0; i < 10; i++) {
        const def = current?._zod?.def;
        if (!def) break;

        const typeName = def.type;

        if (typeName === 'optional' || typeName === 'nullable') {
            isOptional = true;
            current = def.innerType;
            continue;
        }

        if (typeName === 'default') {
            hasDefault = true;
            isOptional = true; // Fields with defaults are effectively optional in the UI
            defaultValue = typeof def.defaultValue === 'function' ? def.defaultValue() : def.defaultValue;
            current = def.innerType;
            continue;
        }

        if (typeName === 'pipeline' || typeName === 'effects') {
            // ZodPipeline wraps an inner type with transforms
            current = def.in || def.innerType || def.schema;
            continue;
        }

        // Reached a base type
        break;
    }

    return { baseType: current, isOptional, hasDefault, defaultValue };
}

/**
 * Detect if a Zod schema is Astro's image() helper.
 * Astro's image() produces a ZodObject with shape: { src, width, height, format }
 */
function isAstroImageSchema(zodType: any): boolean {
    const def = zodType?._zod?.def;
    if (def?.type !== 'object') return false;

    const shape = zodType?.shape;
    if (!shape) return false;

    return 'src' in shape && 'width' in shape && 'height' in shape && 'format' in shape;
}

/**
 * Map a Zod base type to a CMS UI field type string.
 */
function zodTypeToCmsType(baseType: any): string {
    // Check for Astro image() first (it's a ZodObject with specific shape)
    if (isAstroImageSchema(baseType)) {
        return 'image';
    }

    const def = baseType?._zod?.def;
    if (!def) return 'string'; // fallback

    switch (def.type) {
        case 'string':
            return 'string';
        case 'boolean':
            return 'checkbox';
        case 'number':
            return 'string'; // rendered as text input, could be enhanced later
        case 'date':
            return 'date';
        case 'enum':
            return 'select';
        case 'array':
            return 'string'; // e.g. tags rendered as comma-separated
        case 'object':
            return 'string'; // nested objects not directly supported in flat UI
        default:
            return 'string';
    }
}

/**
 * Extract enum values from a ZodEnum for select fields.
 */
function extractEnumValues(baseType: any): Array<{ value: string; label: string }> | undefined {
    const def = baseType?._zod?.def;
    if (def?.type !== 'enum') return undefined;

    const values: string[] = def.values;
    if (!Array.isArray(values)) return undefined;

    return values.map(v => ({ value: v, label: v }));
}

/**
 * Generate a human-readable label from a camelCase field name.
 * e.g. "pictureHeader" → "Picture header"
 *      "imageAlt" → "Image alt"
 *      "title" → "Title"
 */
function fieldNameToLabel(name: string): string {
    const result = name
        .replace(/([A-Z])/g, ' $1') // Insert space before uppercase
        .replace(/^./, s => s.toUpperCase()) // Capitalize first letter
        .trim();
    return result;
}

/**
 * Read a Zod schema and produce an array of CollectionField definitions.
 *
 * @param schema - The Zod schema, either direct or as a function `({image}) => z.object({...})`
 * @param overrides - Optional field overrides from cms.config.ts
 * @returns Array of CollectionField ready for the editor UI
 */
export function readSchemaFields(
    schema: any,
    overrides: Record<string, FieldOverride> = {}
): CollectionField[] {
    // If schema is a function (common with Astro image()), call it with a mock image helper
    let resolvedSchema = schema;
    if (typeof schema === 'function') {
        // Create a mock image() function that produces the same Zod structure Astro uses
        const z = getZod();
        const imageHelper = () => z.object({
            src: z.string(),
            width: z.number(),
            height: z.number(),
            format: z.union([
                z.literal('png'), z.literal('jpg'), z.literal('jpeg'),
                z.literal('tiff'), z.literal('webp'), z.literal('gif'),
                z.literal('svg'), z.literal('avif'),
            ]),
        });
        resolvedSchema = schema({ image: imageHelper });
    }

    // Get shape from the ZodObject
    const shape = resolvedSchema?.shape;
    if (!shape) {
        console.warn('[schema-reader] Could not extract shape from schema');
        return [];
    }

    const fields: CollectionField[] = [];

    for (const [name, zodField] of Object.entries(shape)) {
        const { baseType, isOptional, hasDefault, defaultValue } = unwrapZodType(zodField);
        const inferredType = zodTypeToCmsType(baseType);
        const override = overrides[name] || {};

        // Determine the final CMS field type
        // Override takes priority, then inferred type
        let fieldType = (override.type || inferredType) as CollectionField['type'];

        // Build the field definition
        const field: CollectionField = {
            name,
            type: fieldType,
            label: override.label || fieldNameToLabel(name),
            placeholder: override.placeholder,
            required: override.required !== undefined ? override.required : !isOptional,
            class: override.class,
            help: override.help,
            editor: override.editor,
            accept: override.accept,
            generateFrom: override.generateFrom,
            validation: override.validation,
        };

        // Add enum options for select fields
        if (fieldType === 'select') {
            field.options = override.options || extractEnumValues(baseType);
        }

        fields.push(field);
    }

    return fields;
}

/**
 * Get a reference to the Zod module.
 * Since we're in an Astro context, we import from 'astro/zod'.
 */
let _zod: any = null;
function getZod() {
    if (!_zod) {
        // This will be resolved by Vite/Astro at build time
        // In the context of this module, it's imported statically at the top
        throw new Error('Zod not initialized. Call initZod() first.');
    }
    return _zod;
}

/**
 * Initialize the Zod reference. Must be called before readSchemaFields
 * when schemas use function form (with image helper).
 */
export function initZod(z: any) {
    _zod = z;
}
