/**
 * Composition and variant functions for branded interfaces.
 *
 * All functions create new definitions via createBrandedInterface(),
 * ensuring proper registration and freezing.
 */

import {
  InterfaceSchema,
  BrandedInterfaceDefinition,
  FieldDescriptor,
} from './types.js';

import { createBrandedInterface } from './factory.js';

// =============================================================================
// composeInterfaces
// =============================================================================

/**
 * Merges multiple branded interface definitions into a single new definition.
 * Throws if any field name appears in more than one source definition.
 *
 * @param newId - Unique ID for the composed definition
 * @param definitions - Two or more definitions to compose
 * @returns A new BrandedInterfaceDefinition with all fields merged
 */
export function composeInterfaces(
  newId: string,
  ...definitions: BrandedInterfaceDefinition[]
): BrandedInterfaceDefinition {
  const mergedSchema: Record<string, FieldDescriptor> = {};
  const fieldSources: Record<string, string> = {};

  for (const def of definitions) {
    for (const [fieldName, descriptor] of Object.entries(def.schema)) {
      if (fieldName in mergedSchema) {
        throw new Error(
          `Duplicate field "${fieldName}" found in definitions "${fieldSources[fieldName]}" and "${def.id}" during composition of "${newId}"`
        );
      }
      mergedSchema[fieldName] = descriptor;
      fieldSources[fieldName] = def.id;
    }
  }

  return createBrandedInterface(newId, mergedSchema as InterfaceSchema);
}


// =============================================================================
// extendInterface
// =============================================================================

/**
 * Creates a new definition by extending a base definition with additional fields.
 * Throws if any additional field name conflicts with a base field.
 *
 * @param base - The base definition to extend
 * @param newId - Unique ID for the extended definition
 * @param additionalFields - New fields to add
 * @returns A new BrandedInterfaceDefinition with base + additional fields
 */
export function extendInterface(
  base: BrandedInterfaceDefinition,
  newId: string,
  additionalFields: InterfaceSchema
): BrandedInterfaceDefinition {
  for (const fieldName of Object.keys(additionalFields)) {
    if (fieldName in base.schema) {
      throw new Error(
        `Field "${fieldName}" conflicts with existing field in base definition "${base.id}" during extension to "${newId}"`
      );
    }
  }

  const mergedSchema: InterfaceSchema = {
    ...base.schema,
    ...additionalFields,
  };

  return createBrandedInterface(newId, mergedSchema);
}

// =============================================================================
// partialInterface
// =============================================================================

/**
 * Creates a new definition where all fields are optional.
 *
 * @param definition - The source definition
 * @param newId - Unique ID for the partial definition
 * @returns A new BrandedInterfaceDefinition with all fields set to optional
 */
export function partialInterface(
  definition: BrandedInterfaceDefinition,
  newId: string
): BrandedInterfaceDefinition {
  const partialSchema: Record<string, FieldDescriptor> = {};

  for (const [fieldName, descriptor] of Object.entries(definition.schema)) {
    partialSchema[fieldName] = { ...descriptor, optional: true };
  }

  return createBrandedInterface(newId, partialSchema as InterfaceSchema);
}

// =============================================================================
// pickFields
// =============================================================================

/**
 * Creates a new definition containing only the specified fields.
 * Throws if any field name does not exist in the source definition.
 *
 * @param definition - The source definition
 * @param newId - Unique ID for the picked definition
 * @param fields - Field names to include
 * @returns A new BrandedInterfaceDefinition with only the specified fields
 */
export function pickFields(
  definition: BrandedInterfaceDefinition,
  newId: string,
  fields: string[]
): BrandedInterfaceDefinition {
  const pickedSchema: Record<string, FieldDescriptor> = {};

  for (const fieldName of fields) {
    if (!(fieldName in definition.schema)) {
      throw new Error(
        `Unknown field "${fieldName}" in definition "${definition.id}" during pick for "${newId}"`
      );
    }
    pickedSchema[fieldName] = definition.schema[fieldName];
  }

  return createBrandedInterface(newId, pickedSchema as InterfaceSchema);
}

// =============================================================================
// omitFields
// =============================================================================

/**
 * Creates a new definition containing all fields except the specified ones.
 * Throws if any field name does not exist in the source definition.
 *
 * @param definition - The source definition
 * @param newId - Unique ID for the omitted definition
 * @param fields - Field names to exclude
 * @returns A new BrandedInterfaceDefinition with the specified fields removed
 */
export function omitFields(
  definition: BrandedInterfaceDefinition,
  newId: string,
  fields: string[]
): BrandedInterfaceDefinition {
  for (const fieldName of fields) {
    if (!(fieldName in definition.schema)) {
      throw new Error(
        `Unknown field "${fieldName}" in definition "${definition.id}" during omit for "${newId}"`
      );
    }
  }

  const omitSet = new Set(fields);
  const omittedSchema: Record<string, FieldDescriptor> = {};

  for (const [fieldName, descriptor] of Object.entries(definition.schema)) {
    if (!omitSet.has(fieldName)) {
      omittedSchema[fieldName] = descriptor;
    }
  }

  return createBrandedInterface(newId, omittedSchema as InterfaceSchema);
}
