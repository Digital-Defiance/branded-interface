import { createBrandedInterface } from '../factory.js';
import { watchInterface } from '../watch.js';
import { resetInterfaceRegistry } from '../registry.js';
import { InterfaceAccessEvent } from '../types.js';

let idCounter = 0;
function uniqueId(prefix = 'Watch'): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

beforeEach(() => {
  resetInterfaceRegistry();
  // Clear watcher registry
  delete (globalThis as Record<string, unknown>)['__brandedInterfaceWatchers__'];
});

describe('watchInterface', () => {
  it('should invoke callback on create()', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, { name: { type: 'string' } });
    const events: InterfaceAccessEvent[] = [];

    watchInterface(def, (event) => events.push(event));
    def.create({ name: 'Alice' } as Record<string, unknown>);

    expect(events).toHaveLength(1);
    expect(events[0].interfaceId).toBe(id);
    expect(events[0].eventType).toBe('create');
    expect(events[0].timestamp).toBeGreaterThan(0);
  });

  it('should invoke callback on validate()', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, { age: { type: 'number' } });
    const events: InterfaceAccessEvent[] = [];

    watchInterface(def, (event) => events.push(event));
    def.validate({ age: 30 });

    expect(events).toHaveLength(1);
    expect(events[0].interfaceId).toBe(id);
    expect(events[0].eventType).toBe('validate');
  });

  it('should not invoke callback after unwatch()', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, { x: { type: 'number' } });
    const events: InterfaceAccessEvent[] = [];

    const { unwatch } = watchInterface(def, (event) => events.push(event));
    def.create({ x: 1 } as Record<string, unknown>);
    expect(events).toHaveLength(1);

    unwatch();
    def.create({ x: 2 } as Record<string, unknown>);
    expect(events).toHaveLength(1); // no new event
  });

  it('should support multiple watchers on the same definition', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, { v: { type: 'string' } });
    const events1: InterfaceAccessEvent[] = [];
    const events2: InterfaceAccessEvent[] = [];

    watchInterface(def, (e) => events1.push(e));
    watchInterface(def, (e) => events2.push(e));

    def.create({ v: 'hello' } as Record<string, unknown>);

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
  });

  it('should not fire for a different interface', () => {
    const id1 = uniqueId('A');
    const id2 = uniqueId('B');
    const def1 = createBrandedInterface(id1, { a: { type: 'string' } });
    const def2 = createBrandedInterface(id2, { b: { type: 'number' } });
    const events: InterfaceAccessEvent[] = [];

    watchInterface(def1, (e) => events.push(e));
    def2.create({ b: 42 } as Record<string, unknown>);

    expect(events).toHaveLength(0);
  });

  it('should not fire validate callback when validation fails', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, { n: { type: 'number' } });
    const events: InterfaceAccessEvent[] = [];

    watchInterface(def, (e) => events.push(e));
    def.validate('not an object');

    expect(events).toHaveLength(0);
  });

  it('should pass the value in the event for create', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, { name: { type: 'string' } });
    const events: InterfaceAccessEvent[] = [];

    watchInterface(def, (e) => events.push(e));
    const instance = def.create({ name: 'Bob' } as Record<string, unknown>);

    expect(events[0].value).toBe(instance);
  });

  it('should pass the value in the event for validate', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, { x: { type: 'number' } });
    const events: InterfaceAccessEvent[] = [];

    watchInterface(def, (e) => events.push(e));
    const data = { x: 5 };
    def.validate(data);

    expect(events[0].value).toBe(data);
  });

  it('unwatch should be idempotent', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, { x: { type: 'number' } });
    const { unwatch } = watchInterface(def, () => {});

    // Should not throw when called multiple times
    unwatch();
    unwatch();
  });
});

import * as fc from 'fast-check';
import { arbInterfaceSchema, arbMatchingData, arbUniqueId } from './arbitraries.js';

// =============================================================================
// Property 30: Watcher invocation on create and validate
// **Validates: Requirements 12.1, 12.2, 12.3**
// =============================================================================

describe('Property 30: Watcher invocation on create and validate', () => {
  it('should invoke watcher on create() and validate() with correct event data, and stop after unwatch()', () => {
    fc.assert(
      fc.property(arbUniqueId, arbInterfaceSchema, (id, schema) => {
        // Reset to avoid ID collisions during shrinking
        resetInterfaceRegistry();
        delete (globalThis as Record<string, unknown>)['__brandedInterfaceWatchers__'];

        const def = createBrandedInterface(id, schema);
        const events: InterfaceAccessEvent[] = [];
        const { unwatch } = watchInterface(def, (e) => events.push(e));

        // Generate matching data for create
        const matchingArb = arbMatchingData(schema);
        const data = fc.sample(matchingArb, 1)[0];

        // create() should fire a 'create' event
        def.create(data as Record<string, unknown>);
        expect(events).toHaveLength(1);
        expect(events[0].interfaceId).toBe(id);
        expect(events[0].eventType).toBe('create');
        expect(events[0].timestamp).toBeGreaterThan(0);

        // validate() should fire a 'validate' event
        def.validate(data);
        expect(events).toHaveLength(2);
        expect(events[1].interfaceId).toBe(id);
        expect(events[1].eventType).toBe('validate');

        // After unwatch(), no more events
        unwatch();
        def.create(data as Record<string, unknown>);
        def.validate(data);
        expect(events).toHaveLength(2);
      }),
      { numRuns: 100 }
    );
  });
});
