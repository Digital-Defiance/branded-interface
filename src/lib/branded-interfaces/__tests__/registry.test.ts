import {
  getInterfaceRegistry,
  registerInterfaceEntry,
  getAllInterfaceIds,
  getInterfaceById,
  resetInterfaceRegistry,
} from '../registry.js';
import {
  INTERFACE_REGISTRY_KEY,
  InterfaceRegistryEntry,
  BrandedInterfaceDefinition,
  BrandedPrimitiveDefinition,
  OpaqueTypeDefinition,
} from '../types.js';

// Minimal stubs for definitions used in registry entries
function stubInterfaceDef(id: string): BrandedInterfaceDefinition {
  return { id } as unknown as BrandedInterfaceDefinition;
}

function stubPrimitiveDef(id: string): BrandedPrimitiveDefinition {
  return { id } as unknown as BrandedPrimitiveDefinition;
}

function stubOpaqueDef(id: string): OpaqueTypeDefinition<unknown> {
  return { id } as unknown as OpaqueTypeDefinition<unknown>;
}

describe('Interface Registry', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  describe('getInterfaceRegistry()', () => {
    it('should return a registry with an entries Map', () => {
      const registry = getInterfaceRegistry();
      expect(registry).toBeDefined();
      expect(registry.entries).toBeInstanceOf(Map);
    });

    it('should return the same registry instance on repeated calls', () => {
      const a = getInterfaceRegistry();
      const b = getInterfaceRegistry();
      expect(a).toBe(b);
    });

    it('should initialize on globalThis under the correct key', () => {
      getInterfaceRegistry();
      const global = globalThis as typeof globalThis & {
        [INTERFACE_REGISTRY_KEY]?: unknown;
      };
      expect(global[INTERFACE_REGISTRY_KEY]).toBeDefined();
    });
  });

  describe('registerInterfaceEntry()', () => {
    it('should register an interface entry', () => {
      const entry: InterfaceRegistryEntry = {
        id: 'User',
        kind: 'interface',
        definition: stubInterfaceDef('User'),
      };
      registerInterfaceEntry(entry);
      expect(getInterfaceById('User')).toBe(entry);
    });

    it('should register a primitive entry', () => {
      const entry: InterfaceRegistryEntry = {
        id: 'Email',
        kind: 'primitive',
        definition: stubPrimitiveDef('Email'),
      };
      registerInterfaceEntry(entry);
      expect(getInterfaceById('Email')).toBe(entry);
    });

    it('should register an opaque entry', () => {
      const entry: InterfaceRegistryEntry = {
        id: 'Token',
        kind: 'opaque',
        definition: stubOpaqueDef('Token'),
      };
      registerInterfaceEntry(entry);
      expect(getInterfaceById('Token')).toBe(entry);
    });

    it('should silently return when registering the same ID and kind (idempotent)', () => {
      const entry: InterfaceRegistryEntry = {
        id: 'User',
        kind: 'interface',
        definition: stubInterfaceDef('User'),
      };
      registerInterfaceEntry(entry);
      // Should not throw
      registerInterfaceEntry(entry);
      expect(getAllInterfaceIds()).toEqual(['User']);
    });

    it('should throw on cross-kind ID collision (interface vs primitive)', () => {
      registerInterfaceEntry({
        id: 'Conflict',
        kind: 'interface',
        definition: stubInterfaceDef('Conflict'),
      });
      expect(() =>
        registerInterfaceEntry({
          id: 'Conflict',
          kind: 'primitive',
          definition: stubPrimitiveDef('Conflict'),
        })
      ).toThrow(/already registered as kind "interface".*kind "primitive"/);
    });

    it('should throw on cross-kind ID collision (primitive vs opaque)', () => {
      registerInterfaceEntry({
        id: 'Conflict',
        kind: 'primitive',
        definition: stubPrimitiveDef('Conflict'),
      });
      expect(() =>
        registerInterfaceEntry({
          id: 'Conflict',
          kind: 'opaque',
          definition: stubOpaqueDef('Conflict'),
        })
      ).toThrow(/already registered as kind "primitive".*kind "opaque"/);
    });
  });

  describe('getAllInterfaceIds()', () => {
    it('should return an empty array when no entries are registered', () => {
      expect(getAllInterfaceIds()).toEqual([]);
    });

    it('should return all registered IDs', () => {
      registerInterfaceEntry({ id: 'A', kind: 'interface', definition: stubInterfaceDef('A') });
      registerInterfaceEntry({ id: 'B', kind: 'primitive', definition: stubPrimitiveDef('B') });
      registerInterfaceEntry({ id: 'C', kind: 'opaque', definition: stubOpaqueDef('C') });
      const ids = getAllInterfaceIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).toContain('C');
    });
  });

  describe('getInterfaceById()', () => {
    it('should return undefined for an unregistered ID', () => {
      expect(getInterfaceById('nonexistent')).toBeUndefined();
    });

    it('should return the correct entry for a registered ID', () => {
      const entry: InterfaceRegistryEntry = {
        id: 'User',
        kind: 'interface',
        definition: stubInterfaceDef('User'),
      };
      registerInterfaceEntry(entry);
      expect(getInterfaceById('User')).toBe(entry);
    });
  });

  describe('resetInterfaceRegistry()', () => {
    it('should clear all registered entries', () => {
      registerInterfaceEntry({ id: 'A', kind: 'interface', definition: stubInterfaceDef('A') });
      registerInterfaceEntry({ id: 'B', kind: 'primitive', definition: stubPrimitiveDef('B') });
      expect(getAllInterfaceIds()).toHaveLength(2);

      resetInterfaceRegistry();
      expect(getAllInterfaceIds()).toEqual([]);
    });

    it('should allow re-registration after reset', () => {
      const entry: InterfaceRegistryEntry = {
        id: 'User',
        kind: 'interface',
        definition: stubInterfaceDef('User'),
      };
      registerInterfaceEntry(entry);
      resetInterfaceRegistry();

      // Re-register with a different kind — should work after reset
      const newEntry: InterfaceRegistryEntry = {
        id: 'User',
        kind: 'primitive',
        definition: stubPrimitiveDef('User'),
      };
      registerInterfaceEntry(newEntry);
      expect(getInterfaceById('User')).toBe(newEntry);
    });
  });
});


// =============================================================================
// Property-based tests
// =============================================================================

import * as fc from 'fast-check';
import { createBrandedInterface, createBrandedPrimitive } from '../factory.js';
import { arbUniqueId, arbInterfaceSchema, arbPrimitiveBaseType } from './arbitraries.js';

// =============================================================================
// Property 9: Registry tracks all created definitions
// =============================================================================

describe('Feature: branded-interfaces, Property 9: Registry tracks all created definitions', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   *
   * *For any* set of created interface and primitive definitions,
   * `getAllInterfaceIds()` should contain all their IDs, and
   * `getInterfaceById(id)` should return the corresponding definition for each.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('tracks all created interface definitions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(arbUniqueId, arbInterfaceSchema), { minLength: 1, maxLength: 5 }),
        (entries) => {
          resetInterfaceRegistry();

          const createdDefs: Array<{ id: string; def: unknown }> = [];
          for (const [id, schema] of entries) {
            const def = createBrandedInterface(id, schema);
            createdDefs.push({ id, def });
          }

          const allIds = getAllInterfaceIds();
          for (const { id, def } of createdDefs) {
            expect(allIds).toContain(id);
            const entry = getInterfaceById(id);
            expect(entry).toBeDefined();
            expect(entry!.kind).toBe('interface');
            expect(entry!.definition).toBe(def);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('tracks all created primitive definitions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(arbUniqueId, arbPrimitiveBaseType), { minLength: 1, maxLength: 5 }),
        (entries) => {
          resetInterfaceRegistry();

          const createdDefs: Array<{ id: string; def: unknown }> = [];
          for (const [id, baseType] of entries) {
            const def = createBrandedPrimitive(id, baseType);
            createdDefs.push({ id, def });
          }

          const allIds = getAllInterfaceIds();
          for (const { id, def } of createdDefs) {
            expect(allIds).toContain(id);
            const entry = getInterfaceById(id);
            expect(entry).toBeDefined();
            expect(entry!.kind).toBe('primitive');
            expect(entry!.definition).toBe(def);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('tracks mixed interface and primitive definitions', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema,
        arbUniqueId,
        arbPrimitiveBaseType,
        (ifaceId, schema, primId, baseType) => {
          resetInterfaceRegistry();

          const ifaceDef = createBrandedInterface(ifaceId, schema);
          const primDef = createBrandedPrimitive(primId, baseType);

          const allIds = getAllInterfaceIds();
          expect(allIds).toContain(ifaceId);
          expect(allIds).toContain(primId);

          expect(getInterfaceById(ifaceId)!.definition).toBe(ifaceDef);
          expect(getInterfaceById(primId)!.definition).toBe(primDef);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 10: Registry rejects cross-kind ID collisions
// =============================================================================

describe('Feature: branded-interfaces, Property 10: Registry rejects cross-kind ID collisions', () => {
  /**
   * **Validates: Requirements 3.6**
   *
   * *For any* ID already registered as one kind (interface or primitive),
   * attempting to register a different kind with the same ID should throw
   * a descriptive error.
   */

  beforeEach(() => {
    resetInterfaceRegistry();
  });

  it('throws when registering a primitive with an ID already used by an interface', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbInterfaceSchema,
        arbPrimitiveBaseType,
        (id, schema, baseType) => {
          resetInterfaceRegistry();

          createBrandedInterface(id, schema);
          expect(() => createBrandedPrimitive(id, baseType)).toThrow(/already registered/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throws when registering an interface with an ID already used by a primitive', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbPrimitiveBaseType,
        arbInterfaceSchema,
        (id, baseType, schema) => {
          resetInterfaceRegistry();

          createBrandedPrimitive(id, baseType);
          expect(() => createBrandedInterface(id, schema)).toThrow(/already registered/);
        },
      ),
      { numRuns: 100 },
    );
  });
});
