/**
 * Enum composition functions for branded enums.
 *
 * Enables merging multiple branded enums into a new combined enum
 * while maintaining type safety and registry tracking.
 */

import { AnyBrandedEnum, BrandedEnum, ENUM_ID, ENUM_VALUES } from './types.js';
import { createBrandedEnum } from './factory.js';

/**
 * Type helper to extract the values type from a branded enum.
 */
type ExtractValues<E> = E extends BrandedEnum<infer T> ? T : never;

/**
 * Type helper to merge multiple branded enum value types into one.
 */
type MergedValues<T extends AnyBrandedEnum[]> = {
  [K in keyof T]: ExtractValues<T[K]>;
}[number];

/**
 * Checks if an object is a branded enum.
 */
function isBrandedEnum(obj: unknown): obj is AnyBrandedEnum {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ENUM_ID in obj &&
    ENUM_VALUES in obj
  );
}

/**
 * Merges multiple branded enums into a new branded enum.
 *
 * Creates a new branded enum that contains all key-value pairs from all
 * source enums. The merged enum is registered in the global registry
 * as a new independent enum.
 *
 * Key collision handling:
 * - Duplicate keys (same key in multiple enums) throw an error
 * - Duplicate values (same value in multiple enums) are allowed
 *
 * @template T - Tuple of branded enum types being merged
 * @param newId - Unique identifier for the merged enum. If already registered,
 *   returns the existing enum (idempotent behavior).
 * @param enums - One or more branded enums to merge
 * @returns A new branded enum containing all values from source enums,
 *   or the existing enum if newId is already registered
 * @throws {Error} Throws `Error` with message
 *   `Cannot merge enums: duplicate key "${key}" found in enums "${enumId1}" and "${enumId2}"`
 *   if the same key exists in multiple source enums.
 * @throws {Error} Throws `Error` with message `All arguments must be branded enums`
 *   if any argument is not a valid branded enum.
 *
 * @example
 * // Basic merge
 * const Colors = createBrandedEnum('colors', { Red: 'red', Blue: 'blue' } as const);
 * const Sizes = createBrandedEnum('sizes', { Small: 'small', Large: 'large' } as const);
 *
 * const Combined = mergeEnums('combined', Colors, Sizes);
 * // Combined has: Red, Blue, Small, Large
 *
 * Combined.Red; // 'red'
 * Combined.Small; // 'small'
 *
 * @example
 * // Duplicate values are allowed
 * const Status1 = createBrandedEnum('status1', { Active: 'active' } as const);
 * const Status2 = createBrandedEnum('status2', { Enabled: 'active' } as const);
 *
 * const Merged = mergeEnums('merged', Status1, Status2);
 * // Both Active and Enabled have value 'active' - this is allowed
 *
 * @example
 * // Duplicate keys throw an error
 * const Enum1 = createBrandedEnum('enum1', { Key: 'value1' } as const);
 * const Enum2 = createBrandedEnum('enum2', { Key: 'value2' } as const);
 *
 * try {
 *   mergeEnums('merged', Enum1, Enum2);
 * } catch (e) {
 *   console.log(e.message);
 *   // 'Cannot merge enums: duplicate key "Key" found in enums "enum1" and "enum2"'
 * }
 */
export function mergeEnums<T extends readonly AnyBrandedEnum[]>(
  newId: string,
  ...enums: T
): BrandedEnum<Record<string, string>> {
  // Collect all key-value pairs, checking for duplicate keys
  const mergedValues: Record<string, string> = {};
  const seenKeys = new Map<string, string>(); // key -> source enumId

  for (const enumObj of enums) {
    if (!isBrandedEnum(enumObj)) {
      throw new Error('All arguments must be branded enums');
    }

    const sourceEnumId = enumObj[ENUM_ID];

    // Iterate over enumerable properties (user-defined keys only)
    for (const [key, value] of Object.entries(enumObj)) {
      // Check for duplicate keys
      if (seenKeys.has(key)) {
        const originalEnumId = seenKeys.get(key);
        throw new Error(
          `Cannot merge enums: duplicate key "${key}" found in enums "${originalEnumId}" and "${sourceEnumId}"`
        );
      }

      seenKeys.set(key, sourceEnumId);
      mergedValues[key] = value as string;
    }
  }

  // Create and return the new branded enum (this handles registration)
  return createBrandedEnum(newId, mergedValues) as BrandedEnum<MergedValues<[...T]>>;
}
