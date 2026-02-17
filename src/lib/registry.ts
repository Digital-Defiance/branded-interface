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
 */
export function registerEnum<T extends Record<string, string>>(
  enumObj: BrandedEnum<T>
): RegistryEntry {
  const registry = getRegistry();
  const enumId = enumObj[ENUM_ID];
  const values = enumObj[ENUM_VALUES];

  const existing = registry.enums.get(enumId);
  if (existing) {
    return existing;
  }

  const entry: RegistryEntry = {
    enumId,
    enumObj: enumObj as BrandedEnum<Record<string, string>>,
    values,
  };

  registry.enums.set(enumId, entry);

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
 * Gets a branded enum by its ID.
 */
export function getEnumById(
  enumId: string
): BrandedEnum<Record<string, string>> | undefined {
  const registry = getRegistry();
  const entry = registry.enums.get(enumId);
  return entry?.enumObj;
}

/**
 * Resets the global branded enum registry. For testing only.
 */
export function resetRegistry(): void {
  const registry = getRegistry();
  registry.enums.clear();
  registry.valueIndex.clear();
}
