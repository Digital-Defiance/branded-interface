/**
 * Versioning and migration support for branded interfaces.
 *
 * Stores migrations in a Map on `globalThis` keyed by interface ID.
 * `migrate()` finds a path from the instance's version to the target version
 * using registered migrations and applies the chain sequentially.
 */

import {
  BrandedInterfaceDefinition,
  BrandedInstance,
  MigrationFn,
  MigrationEntry,
  INTERFACE_ID,
  INTERFACE_VERSION,
} from './types.js';

import { getInterfaceById } from './registry.js';
import { createBrandedInterface } from './factory.js';

// =============================================================================
// Migration Registry
// =============================================================================

const MIGRATION_REGISTRY_KEY = '__brandedInterfaceMigrations__' as const;

type MigrationRegistry = Map<string, MigrationEntry[]>;

function getMigrationRegistry(): MigrationRegistry {
  const g = globalThis as Record<string, unknown>;
  if (!g[MIGRATION_REGISTRY_KEY]) {
    g[MIGRATION_REGISTRY_KEY] = new Map<string, MigrationEntry[]>();
  }
  return g[MIGRATION_REGISTRY_KEY] as MigrationRegistry;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Register a migration function between two versions of a branded interface.
 *
 * @param definition - The branded interface definition to add a migration for
 * @param fromVersion - Source version number
 * @param toVersion - Target version number
 * @param migrateFn - Function that transforms data from source to target version
 */
export function addMigration(
  definition: BrandedInterfaceDefinition,
  fromVersion: number,
  toVersion: number,
  migrateFn: MigrationFn
): void {
  const registry = getMigrationRegistry();
  const interfaceId = definition.id;

  if (!registry.has(interfaceId)) {
    registry.set(interfaceId, []);
  }

  registry.get(interfaceId)!.push({
    fromVersion,
    toVersion,
    migrate: migrateFn,
  });
}

/**
 * Migrate a branded instance to a target version by applying registered migrations.
 *
 * Finds the shortest path from the instance's current version to the target version
 * using BFS over registered migrations, then applies each migration in sequence.
 *
 * @param instance - The branded instance to migrate
 * @param targetVersion - The desired target version
 * @returns A new branded instance at the target version
 * @throws Error if no migration path exists
 */
export function migrate<T extends Record<string, unknown>>(
  instance: BrandedInstance<T>,
  targetVersion: number
): BrandedInstance<Record<string, unknown>> {
  const interfaceId = (instance as unknown as Record<symbol, unknown>)[INTERFACE_ID] as string;
  if (!interfaceId) {
    throw new Error('Cannot migrate: instance does not have an INTERFACE_ID');
  }

  // Get the instance's current version from the definition that created it
  const entry = getInterfaceById(interfaceId);
  if (!entry || entry.kind !== 'interface') {
    throw new Error(`Cannot migrate: interface "${interfaceId}" is not registered`);
  }

  const currentDef = entry.definition as BrandedInterfaceDefinition;
  const currentVersion = currentDef.version;

  if (currentVersion === targetVersion) {
    return instance as BrandedInstance<Record<string, unknown>>;
  }

  const registry = getMigrationRegistry();
  const migrations = registry.get(interfaceId);

  if (!migrations || migrations.length === 0) {
    throw new Error(
      `No migration path from version ${currentVersion} to version ${targetVersion} for interface "${interfaceId}"`
    );
  }

  // BFS to find shortest path from currentVersion to targetVersion
  const path = findMigrationPath(migrations, currentVersion, targetVersion);

  if (!path) {
    throw new Error(
      `No migration path from version ${currentVersion} to version ${targetVersion} for interface "${interfaceId}"`
    );
  }

  // Extract enumerable data from the instance
  let data: Record<string, unknown> = {};
  for (const key of Object.keys(instance)) {
    data[key] = (instance as Record<string, unknown>)[key];
  }

  // Apply each migration in sequence
  for (const migration of path) {
    data = migration.migrate(data);
  }

  // Re-brand at the target version using createBrandedInterface
  // We need a definition at the target version — create one with a versioned ID
  const targetDefId = `${interfaceId}`;
  const targetEntry = getInterfaceById(targetDefId);

  if (targetEntry && targetEntry.kind === 'interface') {
    const targetDef = targetEntry.definition as BrandedInterfaceDefinition;
    if (targetDef.version === targetVersion) {
      return targetDef.create(data);
    }
  }

  // If no definition exists at the target version, create a minimal one
  // Build schema from the migrated data
  const schema: Record<string, { type: string }> = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      schema[key] = { type: 'array' };
    } else if (value === null) {
      schema[key] = { type: 'object' };
    } else {
      schema[key] = { type: typeof value as string };
    }
  }

  const targetDef = createBrandedInterface(
    `${interfaceId}__v${targetVersion}`,
    schema as Record<string, { type: 'string' | 'number' | 'boolean' | 'object' | 'array' }>,
    { version: targetVersion }
  );

  return targetDef.create(data);
}

// =============================================================================
// Path Finding
// =============================================================================

/**
 * Find the shortest migration path from one version to another using BFS.
 */
function findMigrationPath(
  migrations: MigrationEntry[],
  fromVersion: number,
  toVersion: number
): MigrationEntry[] | null {
  // BFS queue: each entry is [currentVersion, pathSoFar]
  const queue: Array<[number, MigrationEntry[]]> = [[fromVersion, []]];
  const visited = new Set<number>();
  visited.add(fromVersion);

  while (queue.length > 0) {
    const [current, path] = queue.shift()!;

    for (const migration of migrations) {
      if (migration.fromVersion === current && !visited.has(migration.toVersion)) {
        const newPath = [...path, migration];

        if (migration.toVersion === toVersion) {
          return newPath;
        }

        visited.add(migration.toVersion);
        queue.push([migration.toVersion, newPath]);
      }
    }
  }

  return null;
}

// =============================================================================
// Testing Helper
// =============================================================================

/**
 * Reset the migration registry. For testing purposes only.
 */
export function resetMigrationRegistry(): void {
  const g = globalThis as Record<string, unknown>;
  g[MIGRATION_REGISTRY_KEY] = new Map<string, MigrationEntry[]>();
}
