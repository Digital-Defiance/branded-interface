/**
 * Metadata accessors for branded enums.
 *
 * Provides functions to retrieve metadata from branded enum objects,
 * including enum ID, values array, and size.
 */

import {
  AnyBrandedEnum,
  BrandedEnum,
  BrandedEnumValue,
  ENUM_ID,
  ENUM_VALUES,
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
 * Gets the enum ID from a branded enum.
 *
 * Retrieves the unique identifier that was assigned when the enum was created.
 * Returns undefined for objects that are not branded enums.
 *
 * @param enumObj - The object to get the enum ID from. Can be any type.
 * @returns The enum ID string if enumObj is a branded enum, `undefined` otherwise.
 *
 * @example
 * // Get ID from branded enum
 * const Status = createBrandedEnum('status', { Active: 'active' } as const);
 * getEnumId(Status); // 'status'
 *
 * @example
 * // Returns undefined for non-branded objects
 * getEnumId({}); // undefined
 * getEnumId({ Active: 'active' }); // undefined
 * getEnumId(null); // undefined
 */
export function getEnumId(enumObj: unknown): string | undefined {
  if (!isBrandedEnum(enumObj)) {
    return undefined;
  }
  return enumObj[ENUM_ID];
}

/**
 * Gets all values from a branded enum as an array.
 *
 * Returns an array containing all the string values in the enum.
 * The order of values is not guaranteed.
 *
 * @template E - The branded enum type
 * @param enumObj - The object to get values from. Can be any type.
 * @returns Array of all enum values if enumObj is a branded enum,
 *   `undefined` otherwise.
 *
 * @example
 * // Get values from branded enum
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive'
 * } as const);
 * getEnumValues(Status); // ['active', 'inactive']
 *
 * @example
 * // Returns undefined for non-branded objects
 * getEnumValues({}); // undefined
 * getEnumValues({ Active: 'active' }); // undefined
 */
export function getEnumValues<E extends AnyBrandedEnum>(
  enumObj: E
): EnumValues<E>[] | undefined;
export function getEnumValues(enumObj: unknown): string[] | undefined;
export function getEnumValues(enumObj: unknown): string[] | undefined {
  if (!isBrandedEnum(enumObj)) {
    return undefined;
  }
  return Array.from(enumObj[ENUM_VALUES]);
}

/**
 * Gets the number of values in a branded enum.
 *
 * Returns the count of unique values in the enum. This is equivalent to
 * the number of key-value pairs defined when the enum was created.
 *
 * @param enumObj - The object to get the size of. Can be any type.
 * @returns The number of values in the enum if enumObj is a branded enum,
 *   `undefined` otherwise.
 *
 * @example
 * // Get size of branded enum
 * const Status = createBrandedEnum('status', {
 *   Active: 'active',
 *   Inactive: 'inactive'
 * } as const);
 * enumSize(Status); // 2
 *
 * @example
 * // Returns undefined for non-branded objects
 * enumSize({}); // undefined
 * enumSize({ Active: 'active' }); // undefined
 */
export function enumSize(enumObj: unknown): number | undefined {
  if (!isBrandedEnum(enumObj)) {
    return undefined;
  }
  return enumObj[ENUM_VALUES].size;
}
