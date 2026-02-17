/**
 * Metadata accessors for branded interface definitions and instances.
 *
 * Each function checks for the appropriate Symbol before accessing metadata,
 * returning undefined if the value is not a branded interface definition or instance.
 */

import { INTERFACE_ID, INTERFACE_SCHEMA } from './types.js';
import type { InterfaceSchema } from './types.js';

/**
 * Retrieve the interface ID from a branded instance or definition.
 * Works on both branded instances AND definitions (both carry INTERFACE_ID).
 */
export function getInterfaceId(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const id = (value as Record<symbol, unknown>)[INTERFACE_ID];
  return typeof id === 'string' ? id : undefined;
}

/**
 * Retrieve the field schema from a branded interface definition.
 */
export function getInterfaceSchema(definition: unknown): InterfaceSchema | undefined {
  if (definition === null || typeof definition !== 'object') {
    return undefined;
  }
  const schema = (definition as Record<symbol, unknown>)[INTERFACE_SCHEMA];
  return schema !== undefined && schema !== null && typeof schema === 'object'
    ? (schema as InterfaceSchema)
    : undefined;
}

/**
 * Retrieve the list of field names from a branded interface definition.
 */
export function getInterfaceFields(definition: unknown): string[] | undefined {
  const schema = getInterfaceSchema(definition);
  return schema !== undefined ? Object.keys(schema) : undefined;
}

/**
 * Retrieve the number of fields in a branded interface definition.
 */
export function interfaceFieldCount(definition: unknown): number | undefined {
  const fields = getInterfaceFields(definition);
  return fields !== undefined ? fields.length : undefined;
}
