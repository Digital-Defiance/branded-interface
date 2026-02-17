import * as fc from 'fast-check';
import { createOpaqueType } from '../opaque.js';
import { resetInterfaceRegistry, getInterfaceById } from '../registry.js';
import { arbUniqueId } from './arbitraries.js';

beforeEach(() => {
  resetInterfaceRegistry();
});

// =============================================================================
// Unit Tests for Opaque Types
// **Validates: Requirements 18.1, 18.2, 18.3, 18.4**
// =============================================================================

describe('createOpaqueType()', () => {
  it('should return an object with wrap and unwrap functions', () => {
    const opaque = createOpaqueType<string>('OpaqueStr', 'string');

    expect(opaque).toBeDefined();
    expect(opaque.id).toBe('OpaqueStr');
    expect(typeof opaque.wrap).toBe('function');
    expect(typeof opaque.unwrap).toBe('function');
  });
});

describe('wrap()', () => {
  it('should create an opaque value', () => {
    const opaque = createOpaqueType<string>('WrapTest', 'string');
    const wrapped = opaque.wrap('hello');

    expect(wrapped).toBeDefined();
    // The wrapped value should not expose the underlying value as an enumerable property
    expect(Object.keys(wrapped)).toEqual([]);
  });
});

describe('unwrap()', () => {
  it('should return the original value', () => {
    const opaque = createOpaqueType<number>('UnwrapTest', 'number');
    const wrapped = opaque.wrap(42);
    const result = opaque.unwrap(wrapped);

    expect(result).toBe(42);
  });

  it('should throw for a value not created by the corresponding wrap()', () => {
    const opaque1 = createOpaqueType<string>('OpaqueA', 'string');
    const opaque2 = createOpaqueType<string>('OpaqueB', 'string');

    const wrapped1 = opaque1.wrap('test');

    expect(() => opaque2.unwrap(wrapped1)).toThrow(/not created by opaque type/i);
  });

  it('should throw for a plain (non-wrapped) value', () => {
    const opaque = createOpaqueType<string>('OpaquePlain', 'string');

    expect(() => opaque.unwrap('plain string' as never)).toThrow(/not created by opaque type/i);
    expect(() => opaque.unwrap(123 as never)).toThrow(/not created by opaque type/i);
    expect(() => opaque.unwrap(null as never)).toThrow(/not created by opaque type/i);
    expect(() => opaque.unwrap(undefined as never)).toThrow(/not created by opaque type/i);
  });
});

describe('opaque type registry', () => {
  it('should be registered in the interface registry', () => {
    const opaque = createOpaqueType<string>('OpaqueReg', 'string');

    const entry = getInterfaceById('OpaqueReg');
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('opaque');
    expect(entry!.id).toBe('OpaqueReg');
    expect(entry!.definition).toBe(opaque);
  });
});

describe('wrap/unwrap with different value types', () => {
  it('should work with strings', () => {
    const opaque = createOpaqueType<string>('OpaqueString', 'string');
    expect(opaque.unwrap(opaque.wrap('hello'))).toBe('hello');
  });

  it('should work with numbers', () => {
    const opaque = createOpaqueType<number>('OpaqueNumber', 'number');
    expect(opaque.unwrap(opaque.wrap(3.14))).toBe(3.14);
  });

  it('should work with objects', () => {
    const opaque = createOpaqueType<{ a: number }>('OpaqueObj', 'object');
    const obj = { a: 1 };
    expect(opaque.unwrap(opaque.wrap(obj))).toEqual({ a: 1 });
  });

  it('should work with arrays', () => {
    const opaque = createOpaqueType<number[]>('OpaqueArr', 'array');
    const arr = [1, 2, 3];
    expect(opaque.unwrap(opaque.wrap(arr))).toEqual([1, 2, 3]);
  });
});

// =============================================================================
// Property 37: Opaque type wrap/unwrap round-trip
// **Validates: Requirements 18.2, 18.3, 18.4**
// =============================================================================

describe('Property 37: Opaque type wrap/unwrap round-trip', () => {
  it('should round-trip: unwrap(wrap(value)) === value for any value', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.array(fc.integer()),
          fc.dictionary(fc.string({ minLength: 1 }), fc.integer())
        ),
        (id, value) => {
          resetInterfaceRegistry();

          const opaque = createOpaqueType<unknown>(id, typeof value);

          const wrapped = opaque.wrap(value);
          const unwrapped = opaque.unwrap(wrapped);

          // Round-trip should produce the original value
          expect(unwrapped).toEqual(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw when unwrapping a value not created by the corresponding wrap()', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        arbUniqueId,
        fc.string(),
        (id1, id2, value) => {
          resetInterfaceRegistry();

          const opaque1 = createOpaqueType<string>(id1, 'string');
          const opaque2 = createOpaqueType<string>(id2, 'string');

          const wrapped1 = opaque1.wrap(value);

          // Unwrapping with the wrong opaque type should throw
          if (id1 !== id2) {
            expect(() => opaque2.unwrap(wrapped1)).toThrow(/not created by opaque type/i);
          }

          // Unwrapping a plain value should throw
          expect(() => opaque1.unwrap(value as never)).toThrow(/not created by opaque type/i);
        }
      ),
      { numRuns: 100 }
    );
  });
});
