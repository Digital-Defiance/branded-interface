import * as fc from 'fast-check';
import { createBrandedInterface } from '../factory.js';
import { addMigration, migrate, resetMigrationRegistry } from '../versioning.js';
import { resetInterfaceRegistry } from '../registry.js';
import { INTERFACE_VERSION } from '../types.js';
import { arbUniqueId } from './arbitraries.js';

let idCounter = 0;
function uniqueId(prefix = 'Version'): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

beforeEach(() => {
  resetInterfaceRegistry();
  resetMigrationRegistry();
});

// =============================================================================
// Unit Tests for Versioning
// **Validates: Requirements 14.1, 14.2, 14.3, 14.4**
// =============================================================================

describe('addMigration()', () => {
  it('should register a migration correctly', () => {
    const def = createBrandedInterface('AddMigTest', { name: { type: 'string' } }, { version: 1 });

    // Should not throw
    expect(() =>
      addMigration(def, 1, 2, (data) => ({ ...data, extra: true }))
    ).not.toThrow();
  });
});

describe('migrate() — single-step', () => {
  it('should migrate from v1 to v2 with a single migration', () => {
    const defV1 = createBrandedInterface('SingleStep', { name: { type: 'string' } }, { version: 1 });

    addMigration(defV1, 1, 2, (data) => ({
      ...data,
      migrated: true,
    }));

    const instance = defV1.create({ name: 'Alice' } as Record<string, unknown>);
    const migrated = migrate(instance, 2);

    expect(migrated.name).toBe('Alice');
    expect(migrated.migrated).toBe(true);
  });
});

describe('migrate() — multi-step chain', () => {
  it('should migrate from v1 to v3 through v2', () => {
    const defV1 = createBrandedInterface('MultiStep', { name: { type: 'string' } }, { version: 1 });

    addMigration(defV1, 1, 2, (data) => ({
      ...data,
      age: 0,
    }));

    addMigration(defV1, 2, 3, (data) => ({
      ...data,
      active: true,
    }));

    const instance = defV1.create({ name: 'Bob' } as Record<string, unknown>);
    const migrated = migrate(instance, 3);

    expect(migrated.name).toBe('Bob');
    expect(migrated.age).toBe(0);
    expect(migrated.active).toBe(true);
  });
});

describe('migrate() — no migration path', () => {
  it('should throw when no migration path exists', () => {
    const def = createBrandedInterface('NoPath', { name: { type: 'string' } }, { version: 1 });
    const instance = def.create({ name: 'Charlie' } as Record<string, unknown>);

    expect(() => migrate(instance, 99)).toThrow(/no migration path/i);
  });
});

describe('migrate() — correct version on migrated instance', () => {
  it('should produce an instance associated with the target version', () => {
    const defV1 = createBrandedInterface('VersionCheck', { value: { type: 'number' } }, { version: 1 });

    addMigration(defV1, 1, 2, (data) => ({
      ...data,
      doubled: (data.value as number) * 2,
    }));

    const instance = defV1.create({ value: 42 } as Record<string, unknown>);
    const migrated = migrate(instance, 2);

    expect(migrated.value).toBe(42);
    expect(migrated.doubled).toBe(84);
  });
});

describe('resetMigrationRegistry()', () => {
  it('should clear all migrations so previously valid paths no longer exist', () => {
    const def = createBrandedInterface('ResetMig', { x: { type: 'string' } }, { version: 1 });

    addMigration(def, 1, 2, (data) => ({ ...data, y: 'added' }));

    const instance = def.create({ x: 'hello' } as Record<string, unknown>);

    // Migration should work before reset
    expect(() => migrate(instance, 2)).not.toThrow();

    // Reset and recreate instance (need fresh registry + definition)
    resetMigrationRegistry();
    resetInterfaceRegistry();

    const def2 = createBrandedInterface('ResetMig', { x: { type: 'string' } }, { version: 1 });
    const instance2 = def2.create({ x: 'hello' } as Record<string, unknown>);

    // Now migration should fail — no migrations registered
    expect(() => migrate(instance2, 2)).toThrow(/no migration path/i);
  });
});

// =============================================================================
// Property 32: Version stored in definition metadata
// **Validates: Requirements 14.1**
// =============================================================================

describe('Property 32: Version stored in definition metadata', () => {
  it('should store the version in both the version property and INTERFACE_VERSION symbol', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        fc.integer({ min: 1, max: 1000 }),
        (id, version) => {
          resetInterfaceRegistry();

          const def = createBrandedInterface(id, { x: { type: 'string' } }, { version });

          expect(def.version).toBe(version);
          expect((def as unknown as Record<symbol, unknown>)[INTERFACE_VERSION]).toBe(version);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 33: Migration transforms to target version
// **Validates: Requirements 14.3, 14.4**
// =============================================================================

describe('Property 33: Migration transforms to target version', () => {
  it('should apply migration chain and produce instance at target version', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        fc.string({ minLength: 1 }),
        (baseId, nameValue) => {
          resetInterfaceRegistry();
          resetMigrationRegistry();

          // Create v1 definition
          const id = baseId;
          const defV1 = createBrandedInterface(id, { name: { type: 'string' } }, { version: 1 });

          // Register migration from v1 -> v2 that adds an 'updated' field
          addMigration(defV1, 1, 2, (data) => ({
            ...data,
            updated: true,
          }));

          // Create a v1 instance
          const instanceV1 = defV1.create({ name: nameValue } as Record<string, unknown>);

          // Migrate to v2
          const instanceV2 = migrate(instanceV1, 2);

          // The migrated instance should have the original name and the new field
          expect(instanceV2.name).toBe(nameValue);
          expect(instanceV2.updated).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw when no migration path exists', () => {
    fc.assert(
      fc.property(arbUniqueId, fc.string({ minLength: 1 }), (id, nameValue) => {
        resetInterfaceRegistry();
        resetMigrationRegistry();

        const def = createBrandedInterface(id, { name: { type: 'string' } }, { version: 1 });
        const instance = def.create({ name: nameValue } as Record<string, unknown>);

        // No migration registered, so migrating to v99 should throw
        expect(() => migrate(instance, 99)).toThrow(/no migration path/i);
      }),
      { numRuns: 100 }
    );
  });
});
