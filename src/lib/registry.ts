/**
 * Global registry for branded enums.
 *
 * Uses globalThis to ensure cross-bundle compatibility - all instances
 * of the library share the same registry regardless of how they're bundled.
 */

import {
  BrandedEnum,
  BrandedEnumRegistry,
  RegistryEntry,
  REGISTRY_KEY,
  ENUM_ID,
  ENUM_VALUES,
} from './types.js';

/**
 * Gets the global registry, initializing it lazily if needed.
 * Uses globalThis for cross-bundle compatibility.
 *
 * The registry is shared across all instances of the library, even when
 * bundled separately or loaded as different module formats (ESM/CJS).
 *
 * @returns The global branded enum registry containing all registered enums
 *   and a value index for reverse lookups.
 *
 * @example
 * const registry = getRegistry();
 * console.log(registry.enums.size); // Number of registered enums
 */
export function getRegistry(): BrandedEnumRegistry {
  const global = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: BrandedEnumRegistry;
  };

  if (!(REGISTRY_KEY in global) || !global[REGISTRY_KEY]) {
    global[REGISTRY_KEY] = {
      enums: new Map<string, RegistryEntry>(),
      valueIndex: new Map<string, Set<string>>(),
    };
  }

  return global[REGISTRY_KEY];
}

/**
 * Registers a branded enum in the global registry.
 * Also updates the value index for reverse lookups.
 *
 * This function is idempotent - if an enum with the same ID is already
 * registered, it returns the existing entry instead of throwing an error.
 * This enables safe usage in module-scoped code that may be re-executed
 * in test environments or hot-reload scenarios.
 *
 * @param enumObj - The branded enum to register
 * @returns The registered entry (either new or existing)
 */
export function registerEnum<T extends Record<string, string>>(
  enumObj: BrandedEnum<T>
): RegistryEntry {
  const registry = getRegistry();
  const enumId = enumObj[ENUM_ID];
  const values = enumObj[ENUM_VALUES];

  // If already registered, return existing entry (idempotent)
  const existing = registry.enums.get(enumId);
  if (existing) {
    return existing;
  }

  // Create registry entry
  const entry: RegistryEntry = {
    enumId,
    enumObj: enumObj as BrandedEnum<Record<string, string>>,
    values,
  };

  // Add to enums map
  registry.enums.set(enumId, entry);

  // Update value index for reverse lookups
  for (const value of values) {
    let enumIds = registry.valueIndex.get(value);
    if (!enumIds) {
      enumIds = new Set<string>();
      registry.valueIndex.set(value, enumIds);
    }
    enumIds.add(enumId);
  }

  return entry;
}

/**
 * Gets all registered enum IDs.
 *
 * Returns an array of all enum IDs that have been registered via
 * `createBrandedEnum`. Useful for debugging or introspection.
 *
 * @returns Array of all registered enum IDs. Returns empty array if no
 *   enums have been registered.
 *
 * @example
 * createBrandedEnum('colors', { Red: 'red' } as const);
 * createBrandedEnum('sizes', { Small: 'small' } as const);
 *
 * getAllEnumIds(); // ['colors', 'sizes']
 */
export function getAllEnumIds(): string[] {
  const registry = getRegistry();
  return Array.from(registry.enums.keys());
}

/**
 * Gets a branded enum by its ID.
 *
 * Retrieves a previously registered branded enum from the global registry.
 * Useful when you need to access an enum dynamically by its ID.
 *
 * @param enumId - The enum ID to look up
 * @returns The branded enum object if found, or `undefined` if no enum
 *   with the given ID has been registered.
 *
 * @example
 * const Status = createBrandedEnum('status', { Active: 'active' } as const);
 *
 * const retrieved = getEnumById('status');
 * console.log(retrieved === Status); // true
 *
 * const notFound = getEnumById('nonexistent');
 * console.log(notFound); // undefined
 */
export function getEnumById(
  enumId: string
): BrandedEnum<Record<string, string>> | undefined {
  const registry = getRegistry();
  const entry = registry.enums.get(enumId);
  return entry?.enumObj;
}

/**
 * Finds all enum IDs that contain a given value.
 *
 * Performs a reverse lookup to find which enums contain a specific value.
 * Useful for debugging value collisions or routing values to handlers.
 *
 * @param value - The string value to search for
 * @returns Array of enum IDs that contain the value. Returns empty array
 *   if no enums contain the value.
 *
 * @example
 * // Single enum containing value
 * createBrandedEnum('colors', { Red: 'red', Blue: 'blue' } as const);
 * findEnumSources('red'); // ['colors']
 *
 * @example
 * // Multiple enums with same value (collision detection)
 * createBrandedEnum('status1', { Active: 'active' } as const);
 * createBrandedEnum('status2', { Enabled: 'active' } as const);
 * findEnumSources('active'); // ['status1', 'status2']
 *
 * @example
 * // Value not found
 * findEnumSources('nonexistent'); // []
 */
export function findEnumSources(value: string): string[] {
  const registry = getRegistry();
  const enumIds = registry.valueIndex.get(value);
  return enumIds ? Array.from(enumIds) : [];
}

/**
 * Resets the global branded enum registry, clearing all registered enums.
 *
 * **WARNING**: This function is intended for testing purposes only.
 * Using it in production code will break any code that depends on
 * previously registered enums.
 *
 * Clears all entries from:
 * - The enums map (ID -> enum object)
 * - The value index (value -> set of enum IDs)
 *
 * @example
 * // In test setup/teardown
 * beforeEach(() => {
 *   resetRegistry();
 * });
 *
 * @example
 * // Clear and verify
 * resetRegistry();
 * getAllEnumIds(); // []
 */
export function resetRegistry(): void {
  const registry = getRegistry();
  registry.enums.clear();
  registry.valueIndex.clear();
}
