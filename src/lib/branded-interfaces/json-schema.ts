/**
 * JSON Schema generation for branded interface definitions.
 *
 * Maps FieldDescriptor types to JSON Schema types, handles optional/nullable,
 * resolves branded-interface refs to enum constraints, and emits format annotations
 * for known branded-primitive refinements.
 */

import type {
  BrandedInterfaceDefinition,
  FieldDescriptor,
  InterfaceJsonSchema,
} from './types.js';
import { getEnumById } from '../registry.js';
import { ENUM_VALUES } from '../types.js';

/** JSON Schema draft URLs */
const SCHEMA_DRAFTS: Record<string, string> = {
  '2020-12': 'https://json-schema.org/draft/2020-12/schema',
  '07': 'http://json-schema.org/draft-07/schema#',
};

/** Known refinement IDs mapped to JSON Schema format annotations */
const REFINEMENT_FORMATS: Record<string, string> = {
  Email: 'email',
  Uuid: 'uuid',
  Url: 'uri',
};

/**
 * Maps a FieldBaseType to its JSON Schema type string.
 */
function baseTypeToJsonSchemaType(type: string): string {
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    default:
      return 'string';
  }
}

/**
 * Converts a single FieldDescriptor to a JSON Schema property definition.
 */
function fieldToJsonSchemaProperty(descriptor: FieldDescriptor): unknown {
  const { type, nullable, ref } = descriptor;

  // Handle branded-enum refs: look up enum and emit { enum: [...values] }
  if (type === 'branded-enum' && ref) {
    const enumDef = getEnumById(ref);
    if (enumDef) {
      const values = Array.from(enumDef[ENUM_VALUES]);
      if (nullable) {
        return { enum: [...values, null] };
      }
      return { enum: values };
    }
    // Enum not found in registry — fall back to string
    const fallback: Record<string, unknown> = { type: 'string' };
    if (nullable) {
      fallback['type'] = ['string', 'null'];
    }
    return fallback;
  }

  // Handle branded-primitive refs: emit format annotations for known refinements
  if (type === 'branded-primitive' && ref) {
    const format = REFINEMENT_FORMATS[ref];
    const prop: Record<string, unknown> = { type: 'string' };
    if (format) {
      prop['format'] = format;
    }
    if (nullable) {
      prop['type'] = ['string', 'null'];
    }
    return prop;
  }

  // Handle branded-interface refs: emit { type: 'object' }
  if (type === 'branded-interface') {
    const prop: Record<string, unknown> = { type: 'object' };
    if (nullable) {
      prop['type'] = ['object', 'null'];
    }
    return prop;
  }

  // Standard field types
  const jsonType = baseTypeToJsonSchemaType(type);
  const prop: Record<string, unknown> = { type: jsonType };

  if (nullable) {
    prop['type'] = [jsonType, 'null'];
  }

  return prop;
}

/**
 * Generates a JSON Schema from a branded interface definition.
 *
 * @param definition - The branded interface definition to convert
 * @param options - Optional settings (draft version)
 * @returns A valid JSON Schema object describing the interface structure
 */
export function interfaceToJsonSchema(
  definition: BrandedInterfaceDefinition,
  options?: { draft?: '2020-12' | '07' }
): InterfaceJsonSchema {
  const draft = options?.draft ?? '2020-12';
  const schemaUrl = SCHEMA_DRAFTS[draft] ?? SCHEMA_DRAFTS['2020-12'];

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [fieldName, descriptor] of Object.entries(definition.schema)) {
    properties[fieldName] = fieldToJsonSchemaProperty(descriptor);

    if (!descriptor.optional) {
      required.push(fieldName);
    }
  }

  return {
    $schema: schemaUrl,
    type: 'object',
    title: definition.id,
    properties,
    required,
    additionalProperties: false,
  };
}
