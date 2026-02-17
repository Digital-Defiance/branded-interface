/**
 * Zod schema generation for branded interface definitions.
 *
 * Maps FieldDescriptor types to Zod type strings, handles optional/nullable,
 * and resolves branded-interface refs to z.enum() constraints.
 */

import type {
  BrandedInterfaceDefinition,
  FieldDescriptor,
  InterfaceZodSchemaDefinition,
} from './types.js';
import { getEnumById } from '../registry.js';
import { ENUM_VALUES } from '../types.js';

/**
 * Maps a FieldDescriptor to its Zod type string.
 */
function fieldToZodType(descriptor: FieldDescriptor): string {
  const { type, nullable, ref } = descriptor;

  // Handle branded-enum refs: look up enum and emit z.enum([...values])
  if (type === 'branded-enum' && ref) {
    const enumDef = getEnumById(ref);
    if (enumDef) {
      const values = Array.from(enumDef[ENUM_VALUES]);
      const valuesStr = values.map((v) => `'${v}'`).join(', ');
      const base = `z.enum([${valuesStr}])`;
      return nullable ? `${base}.nullable()` : base;
    }
    // Enum not found — fall back to z.string()
    return nullable ? 'z.string().nullable()' : 'z.string()';
  }

  let base: string;
  switch (type) {
    case 'string':
    case 'branded-primitive':
      base = 'z.string()';
      break;
    case 'number':
      base = 'z.number()';
      break;
    case 'boolean':
      base = 'z.boolean()';
      break;
    case 'object':
    case 'branded-interface':
      base = 'z.object({})';
      break;
    case 'array':
      base = 'z.array(z.unknown())';
      break;
    default:
      base = 'z.unknown()';
      break;
  }

  return nullable ? `${base}.nullable()` : base;
}

/**
 * Generates a Zod schema definition from a branded interface definition.
 *
 * @param definition - The branded interface definition to convert
 * @returns A Zod schema definition object describing the interface structure
 */
export function interfaceToZodSchema(
  definition: BrandedInterfaceDefinition
): InterfaceZodSchemaDefinition {
  const fields: Record<string, { zodType: string; optional: boolean; nullable: boolean }> = {};

  for (const [fieldName, descriptor] of Object.entries(definition.schema)) {
    fields[fieldName] = {
      zodType: fieldToZodType(descriptor),
      optional: descriptor.optional === true,
      nullable: descriptor.nullable === true,
    };
  }

  return {
    interfaceId: definition.id,
    fields,
  };
}
