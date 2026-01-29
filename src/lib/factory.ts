/**
 * Factory function for creating branded enums.
 *
 * Creates enum-like objects with runtime metadata for identification,
 * while keeping values as raw strings for serialization compatibility.
 */

import {
  BrandedEnum,
  BrandedEnumMetadata,
  ENUM_ID,
  ENUM_VALUES,
} from './types.js';
import { getRegistry, registerEnum } from './registry.js';

/**
 * Creates a branded enum with runtime metadata.
 *
 * The returned object:
 * - Contains all provided key-value pairs as enumerable properties
 * - Has non-enumerable Symbol properties for metadata (ENUM_ID, ENUM_VALUES)
 * - Is frozen to prevent modification
 * - Is registered in the global registry
 *
 * This function is idempotent - if an enum with the same ID already exists,
 * the existing enum is returned instead of creating a new one. This enables
 * safe usage in module-scoped code that may be re-executed in test environments
 * or hot-reload scenarios.
 *
 * @template T - The shape of the values object (use `as const` for literal types)
 * @param enumId - Unique identifier for this enum. Must be unique across all
 *   branded enums in the application.
 * @param values - Object containing key-value pairs where keys are enum member
 *   names and values are the string values. Use `as const` for literal type inference.
 * @returns A frozen branded enum object with attached metadata
 *
 * @example
 * // Basic usage
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive',
 * } as const);
 *
 * Status.Active // 'active' (raw string)
 * getEnumId(Status) // 'status'
 *
 * @example
 * // Type inference with as const
 * const Colors = createBrandedEnum('colors', {
 *   Red: 'red',
 *   Green: 'green',
 *   Blue: 'blue',
 * } as const);
 *
 * type ColorValue = typeof Colors[keyof typeof Colors]; // 'red' | 'green' | 'blue'
 *
 * @example
 * // Safe re-registration (idempotent)
 * const Enum1 = createBrandedEnum('myEnum', { A: 'a' } as const);
 * const Enum2 = createBrandedEnum('myEnum', { A: 'a' } as const);
 * // Enum1 === Enum2 (same reference)
 */
export function createBrandedEnum<T extends Record<string, string>>(
  enumId: string,
  values: T
): BrandedEnum<T> {
  // Check if already registered - return existing enum (idempotent)
  const registry = getRegistry();
  const existing = registry.enums.get(enumId);
  if (existing) {
    return existing.enumObj as BrandedEnum<T>;
  }

  // Create the enum object with user values
  const enumObj = { ...values } as T & BrandedEnumMetadata;

  // Collect all values into a Set for O(1) membership checks
  const valueSet = new Set<string>(Object.values(values));

  // Attach non-enumerable Symbol properties for metadata
  Object.defineProperty(enumObj, ENUM_ID, {
    value: enumId,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  Object.defineProperty(enumObj, ENUM_VALUES, {
    value: valueSet,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  // Freeze the object to prevent modification
  const frozenEnum = Object.freeze(enumObj) as BrandedEnum<T>;

  // Register in global registry (throws if duplicate ID)
  registerEnum(frozenEnum);

  return frozenEnum;
}
