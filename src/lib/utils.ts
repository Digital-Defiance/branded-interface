/**
 * Utility functions for branded enums.
 *
 * Provides additional functionality beyond standard enum operations,
 * including reverse lookup, key validation, and iteration.
 */

import {
  AnyBrandedEnum,
  BrandedEnum,
  BrandedEnumValue,
  ENUM_ID,
  ENUM_VALUES,
  EnumKeys,
  EnumValues,
} from './types.js';

/**
 * Checks if an object is a branded enum (has Symbol metadata).
 *
 * @param obj - The object to check
 * @returns true if obj is a branded enum
 */
function isBrandedEnum(obj: unknown): obj is AnyBrandedEnum {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    ENUM_ID in obj &&
    ENUM_VALUES in obj &&
    typeof (obj as AnyBrandedEnum)[ENUM_ID] === 'string' &&
    (obj as AnyBrandedEnum)[ENUM_VALUES] instanceof Set
  );
}

/**
 * Checks if a value exists in a branded enum (reverse lookup).
 *
 * Similar to `isFromEnum`, but with arguments in a different order that
 * may be more natural for some use cases. Also provides type narrowing.
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to search in
 * @param value - The value to check. Can be any type; non-strings return false.
 * @returns `true` if the value exists in the enum (with type narrowing),
 *   `false` otherwise. Returns `false` for non-string values or if
 *   enumObj is not a branded enum.
 *
 * @example
 * // Check if value exists
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 * hasValue(Status, 'active'); // true
 * hasValue(Status, 'unknown'); // false
 *
 * @example
 * // Returns false for non-string values
 * hasValue(Status, 123); // false
 * hasValue(Status, null); // false
 */
export function hasValue<E extends AnyBrandedEnum>(
  enumObj: E,
  value: unknown
): value is EnumValues<E> {
  if (!isBrandedEnum(enumObj)) {
    return false;
  }
  if (typeof value !== 'string') {
    return false;
  }
  return enumObj[ENUM_VALUES].has(value);
}

/**
 * Gets the key name for a value in a branded enum.
 *
 * Performs a reverse lookup to find which key maps to a given value.
 * If multiple keys have the same value, returns the first one found
 * (order is not guaranteed).
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to search in
 * @param value - The string value to look up
 * @returns The key name that maps to the value, or `undefined` if the
 *   value is not found or enumObj is not a branded enum.
 *
 * @example
 * // Find key for value
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 * getKeyForValue(Status, 'active'); // 'Active'
 * getKeyForValue(Status, 'inactive'); // 'Inactive'
 *
 * @example
 * // Returns undefined for unknown values
 * getKeyForValue(Status, 'unknown'); // undefined
 *
 * @example
 * // Roundtrip: value -> key -> value
 * const key = getKeyForValue(Status, 'active'); // 'Active'
 * Status[key]; // 'active'
 */
export function getKeyForValue<E extends AnyBrandedEnum>(
  enumObj: E,
  value: string
): EnumKeys<E> | undefined {
  if (!isBrandedEnum(enumObj)) {
    return undefined;
  }
  for (const key of Object.keys(enumObj)) {
    if ((enumObj as Record<string, unknown>)[key] === value) {
      return key as EnumKeys<E>;
    }
  }
  return undefined;
}

/**
 * Checks if a key exists in a branded enum.
 *
 * Validates whether a given key is a valid member of the enum.
 * Returns false for Symbol keys (metadata) and non-string keys.
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to check
 * @param key - The key to validate. Can be any type; non-strings return false.
 * @returns `true` if the key exists in the enum (with type narrowing),
 *   `false` otherwise. Returns `false` for metadata Symbol keys or if
 *   enumObj is not a branded enum.
 *
 * @example
 * // Check if key exists
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 * isValidKey(Status, 'Active'); // true
 * isValidKey(Status, 'Inactive'); // true
 * isValidKey(Status, 'Unknown'); // false
 *
 * @example
 * // Returns false for non-string keys
 * isValidKey(Status, 123); // false
 * isValidKey(Status, Symbol('test')); // false
 */
export function isValidKey<E extends AnyBrandedEnum>(
  enumObj: E,
  key: unknown
): key is EnumKeys<E> {
  if (!isBrandedEnum(enumObj)) {
    return false;
  }
  if (typeof key !== 'string') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(enumObj, key);
}

/**
 * Returns an iterator of [key, value] pairs for a branded enum.
 *
 * Provides a way to iterate over all key-value pairs in the enum using
 * a for...of loop. Only yields user-defined entries, not metadata.
 * Equivalent to `Object.entries(enumObj)` but with proper typing.
 *
 * @template E - The branded enum type
 * @param enumObj - The branded enum to iterate over
 * @returns An iterator yielding [key, value] tuples. Returns an empty
 *   iterator if enumObj is not a branded enum.
 *
 * @example
 * // Iterate over entries
 * const Status = createBrandedEnum('status', { Active: 'active', Inactive: 'inactive' } as const);
 *
 * for (const [key, value] of enumEntries(Status)) {
 *   console.log(`${key}: ${value}`);
 * }
 * // Output:
 * // Active: active
 * // Inactive: inactive
 *
 * @example
 * // Convert to array
 * const entries = [...enumEntries(Status)];
 * // [['Active', 'active'], ['Inactive', 'inactive']]
 *
 * @example
 * // Use with Array.from
 * const entriesArray = Array.from(enumEntries(Status));
 */
export function* enumEntries<E extends AnyBrandedEnum>(
  enumObj: E
): IterableIterator<[EnumKeys<E>, EnumValues<E>]> {
  if (!isBrandedEnum(enumObj)) {
    return;
  }
  for (const [key, value] of Object.entries(enumObj)) {
    yield [key as EnumKeys<E>, value as EnumValues<E>];
  }
}
