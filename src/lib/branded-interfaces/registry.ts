/**
 * Global registry for branded interfaces, primitives, and opaque types.
 *
 * Uses globalThis to ensure cross-bundle compatibility — all instances
 * of the library share the same registry regardless of how they're bundled.
 * Follows the same pattern as the enum registry but uses a separate key
 * to avoid ID collisions.
 */

import {
  INTERFACE_REGISTRY_KEY,
  InterfaceRegistry,
  InterfaceRegistryEntry,
} from './types.js';

/**
 * Gets the global interface registry, initializing it lazily if needed.
 * Uses globalThis for cross-bundle compatibility.
 *
 * @returns The global interface registry containing all registered
 *   interfaces, primitives, and opaque types.
 */
export function getInterfaceRegistry(): InterfaceRegistry {
  const global = globalThis as typeof globalThis & {
    [INTERFACE_REGISTRY_KEY]?: InterfaceRegistry;
  };

  if (!(INTERFACE_REGISTRY_KEY in global) || !global[INTERFACE_REGISTRY_KEY]) {
    global[INTERFACE_REGISTRY_KEY] = {
      entries: new Map<string, InterfaceRegistryEntry>(),
    };
  }

  return global[INTERFACE_REGISTRY_KEY];
}

/**
 * Registers an interface, primitive, or opaque type entry in the global registry.
 *
 * - If an entry with the same ID and same kind already exists, silently returns (idempotent).
 * - If an entry with the same ID but a DIFFERENT kind exists, throws a descriptive error
 *   (cross-kind collision).
 * - Otherwise, adds the entry to the registry.
 *
 * @param entry - The registry entry to register
 * @throws Error if a cross-kind ID collision is detected
 */
export function registerInterfaceEntry(entry: InterfaceRegistryEntry): void {
  const registry = getInterfaceRegistry();
  const existing = registry.entries.get(entry.id);

  if (existing) {
    if (existing.kind !== entry.kind) {
      throw new Error(
        `Interface registry ID collision: "${entry.id}" is already registered as kind "${existing.kind}" but attempted to register as kind "${entry.kind}"`
      );
    }
    // Same ID, same kind — idempotent, silently return
    return;
  }

  registry.entries.set(entry.id, entry);
}

/**
 * Gets all registered interface, primitive, and opaque type IDs.
 *
 * @returns Array of all registered IDs.
 */
export function getAllInterfaceIds(): string[] {
  const registry = getInterfaceRegistry();
  return Array.from(registry.entries.keys());
}

/**
 * Gets a registry entry by its ID.
 *
 * @param id - The ID to look up
 * @returns The registry entry if found, or `undefined` if not registered.
 */
export function getInterfaceById(id: string): InterfaceRegistryEntry | undefined {
  const registry = getInterfaceRegistry();
  return registry.entries.get(id);
}

/**
 * Resets the global interface registry, clearing all registered entries.
 *
 * **WARNING**: Intended for testing purposes only.
 */
export function resetInterfaceRegistry(): void {
  const registry = getInterfaceRegistry();
  registry.entries.clear();
}
