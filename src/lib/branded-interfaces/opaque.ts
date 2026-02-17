/**
 * Opaque type wrappers that completely hide the underlying type.
 *
 * Opaque values can only be accessed through the designated unwrap() function,
 * enforcing that branded values flow through controlled access points.
 */

import { OPAQUE_ID } from './types.js';
import type { OpaqueTypeDefinition, OpaqueValue } from './types.js';
import { getInterfaceById, registerInterfaceEntry } from './registry.js';

/**
 * Creates an opaque type definition with wrap() and unwrap() functions.
 *
 * @param typeId - Unique identifier for this opaque type
 * @param baseType - Description of the underlying base type (for documentation)
 * @returns A frozen OpaqueTypeDefinition with wrap() and unwrap()
 */
export function createOpaqueType<T>(
  typeId: string,
  baseType: string
): OpaqueTypeDefinition<T> {
  // Idempotent: return existing definition if already registered
  const existing = getInterfaceById(typeId);
  if (existing && existing.kind === 'opaque') {
    return existing.definition as unknown as OpaqueTypeDefinition<T>;
  }

  const wrap = (value: T): OpaqueValue<T> => {
    const opaque = Object.create(null) as OpaqueValue<T>;

    Object.defineProperty(opaque, OPAQUE_ID, {
      value: typeId,
      enumerable: false,
      writable: false,
      configurable: false,
    });

    Object.defineProperty(opaque, '__opaqueValue', {
      value: value,
      enumerable: false,
      writable: false,
      configurable: false,
    });

    return Object.freeze(opaque);
  };

  const unwrap = (opaque: OpaqueValue<T>): T => {
    if (
      opaque == null ||
      typeof opaque !== 'object' ||
      (opaque as unknown as Record<symbol, unknown>)[OPAQUE_ID] !== typeId
    ) {
      throw new Error(
        `Cannot unwrap: value was not created by opaque type "${typeId}"`
      );
    }
    return opaque.__opaqueValue;
  };

  const definition: OpaqueTypeDefinition<T> = Object.freeze({
    id: typeId,
    wrap,
    unwrap,
  });

  // Register in the interface registry as kind 'opaque'
  registerInterfaceEntry({
    id: typeId,
    kind: 'opaque',
    definition: definition as OpaqueTypeDefinition<unknown>,
  });

  return definition;
}
