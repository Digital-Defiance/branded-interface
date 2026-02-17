import { createBrandedInterface } from '../factory.js';
import { createBrandedPrimitive } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';
import {
  BrandedField,
  BrandedClass,
  getBrandedConsumers,
  getConsumedDefinitions,
  clearBrandedConsumerRegistry,
} from '../decorators.js';

beforeEach(() => {
  resetInterfaceRegistry();
  clearBrandedConsumerRegistry();
});

describe('BrandedField', () => {
  it('should accept valid values for a branded interface definition', () => {
    const UserDef = createBrandedInterface('dec-user-1', {
      name: { type: 'string' },
      age: { type: 'number' },
    });

    class MyClass {
      @BrandedField(UserDef)
      accessor user = UserDef.create({ name: 'Alice', age: 30 });
    }

    const obj = new MyClass();
    expect(obj.user.name).toBe('Alice');

    // Reassign with another valid value
    obj.user = UserDef.create({ name: 'Bob', age: 25 }) as typeof obj.user;
    expect(obj.user.name).toBe('Bob');
  });

  it('should reject invalid values for a branded interface definition', () => {
    const UserDef = createBrandedInterface('dec-user-2', {
      name: { type: 'string' },
    });

    class MyClass {
      @BrandedField(UserDef)
      accessor user = UserDef.create({ name: 'Alice' });
    }

    const obj = new MyClass();
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj as any).user = { name: 123 };
    }).toThrow(/invalid value for "dec-user-2"/);
  });

  it('should accept valid values for a branded primitive definition', () => {
    const PositiveNum = createBrandedPrimitive<number>(
      'dec-pos-num-1',
      'number',
      (v) => (v as number) > 0
    );

    class MyClass {
      @BrandedField(PositiveNum)
      accessor value = PositiveNum.create(42);
    }

    const obj = new MyClass();
    expect(obj.value).toBe(42);
  });

  it('should reject invalid values for a branded primitive definition', () => {
    const PositiveNum = createBrandedPrimitive<number>(
      'dec-pos-num-2',
      'number',
      (v) => (v as number) > 0
    );

    class MyClass {
      @BrandedField(PositiveNum)
      accessor value = PositiveNum.create(1);
    }

    const obj = new MyClass();
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj as any).value = -5;
    }).toThrow(/invalid value for "dec-pos-num-2"/);
  });

  it('should handle optional fields (allow undefined)', () => {
    const UserDef = createBrandedInterface('dec-user-opt', {
      name: { type: 'string' },
    });

    class MyClass {
      @BrandedField(UserDef, { optional: true })
      accessor user: ReturnType<typeof UserDef.create> | undefined = undefined;
    }

    const obj = new MyClass();
    expect(obj.user).toBeUndefined();

    obj.user = UserDef.create({ name: 'Alice' });
    expect(obj.user.name).toBe('Alice');

    obj.user = undefined;
    expect(obj.user).toBeUndefined();
  });

  it('should reject undefined when not optional', () => {
    const UserDef = createBrandedInterface('dec-user-no-opt', {
      name: { type: 'string' },
    });

    expect(() => {
      class MyClass {
        @BrandedField(UserDef)
        accessor user: ReturnType<typeof UserDef.create> | undefined = undefined;
      }
      new MyClass();
    }).toThrow(/cannot be initialized as undefined/);
  });

  it('should handle nullable fields (allow null)', () => {
    const UserDef = createBrandedInterface('dec-user-null', {
      name: { type: 'string' },
    });

    class MyClass {
      @BrandedField(UserDef, { nullable: true })
      accessor user: ReturnType<typeof UserDef.create> | null = null;
    }

    const obj = new MyClass();
    expect(obj.user).toBeNull();

    obj.user = UserDef.create({ name: 'Alice' });
    expect(obj.user.name).toBe('Alice');

    obj.user = null;
    expect(obj.user).toBeNull();
  });

  it('should reject null when not nullable', () => {
    const UserDef = createBrandedInterface('dec-user-no-null', {
      name: { type: 'string' },
    });

    expect(() => {
      class MyClass {
        @BrandedField(UserDef)
        accessor user: ReturnType<typeof UserDef.create> | null = null;
      }
      new MyClass();
    }).toThrow(/cannot be initialized as null/);
  });

  it('should throw if definition is not valid', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      BrandedField({} as any);
    }).toThrow(/requires a BrandedInterfaceDefinition or BrandedPrimitiveDefinition/);
  });
});

describe('BrandedClass', () => {
  it('should register a class as a consumer of branded interface definitions', () => {
    const UserDef = createBrandedInterface('dec-class-user', {
      name: { type: 'string' },
    });

    @BrandedClass(UserDef)
    class UserService {
      name = 'service';
    }

    // Verify registration
    expect(getBrandedConsumers('dec-class-user')).toContain('UserService');
    expect(getConsumedDefinitions('UserService')).toContain('dec-class-user');

    // Class still works normally
    const svc = new UserService();
    expect(svc.name).toBe('service');
  });

  it('should register a class with multiple definitions', () => {
    const UserDef = createBrandedInterface('dec-class-multi-1', {
      name: { type: 'string' },
    });
    const PosDef = createBrandedPrimitive<number>(
      'dec-class-multi-2',
      'number',
      (v) => (v as number) > 0
    );

    @BrandedClass(UserDef, PosDef)
    class MultiService {
      x = 1;
    }

    expect(getConsumedDefinitions('MultiService')).toEqual(
      expect.arrayContaining(['dec-class-multi-1', 'dec-class-multi-2'])
    );
    expect(getBrandedConsumers('dec-class-multi-1')).toContain('MultiService');
    expect(getBrandedConsumers('dec-class-multi-2')).toContain('MultiService');

    const svc = new MultiService();
    expect(svc.x).toBe(1);
  });

  it('should throw if a definition argument is not valid', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      BrandedClass({} as any);
    }).toThrow(/not a valid BrandedInterfaceDefinition or BrandedPrimitiveDefinition/);
  });

  it('should return empty arrays for unknown consumers/definitions', () => {
    expect(getBrandedConsumers('nonexistent')).toEqual([]);
    expect(getConsumedDefinitions('NonexistentClass')).toEqual([]);
  });
});

import * as fc from 'fast-check';
import { arbUniqueId } from './arbitraries.js';

// =============================================================================
// Property 31: Decorator validates assignments
// **Validates: Requirements 13.1, 13.2**
// =============================================================================

describe('Property 31: Decorator validates assignments', () => {
  it('should accept valid branded values and reject invalid values via @BrandedField', () => {
    fc.assert(
      fc.property(arbUniqueId, fc.string(), fc.integer(), (id, validName, invalidValue) => {
        // Reset to avoid ID collisions during shrinking
        resetInterfaceRegistry();
        clearBrandedConsumerRegistry();

        const def = createBrandedInterface(id, { name: { type: 'string' } });

        // Create a class with a @BrandedField accessor
        class TestClass {
          @BrandedField(def)
          accessor value = def.create({ name: validName });
        }

        const obj = new TestClass();
        // Valid branded value should be accepted
        expect(obj.value.name).toBe(validName);

        // Setting another valid branded value should work
        const newBranded = def.create({ name: 'updated' });
        obj.value = newBranded as typeof obj.value;
        expect(obj.value.name).toBe('updated');

        // Setting an invalid (non-branded) value should throw
        expect(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (obj as any).value = { name: invalidValue };
        }).toThrow(/invalid value/i);
      }),
      { numRuns: 100 }
    );
  });

  it('should accept valid branded primitives and reject invalid values via @BrandedField', () => {
    fc.assert(
      fc.property(arbUniqueId, fc.double({ noNaN: true, noDefaultInfinity: true, min: 1 }), (id, validNum) => {
        // Reset to avoid ID collisions during shrinking
        resetInterfaceRegistry();
        clearBrandedConsumerRegistry();

        const def = createBrandedPrimitive<number>(id, 'number', (v) => (v as number) > 0);

        class TestClass {
          @BrandedField(def)
          accessor value = def.create(validNum);
        }

        const obj = new TestClass();
        expect(obj.value).toBe(validNum);

        // Invalid value (string) should throw
        expect(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (obj as any).value = 'not-a-number';
        }).toThrow(/invalid value/i);
      }),
      { numRuns: 100 }
    );
  });
});
