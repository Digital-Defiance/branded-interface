/**
 * Unit tests for decorators module
 *
 * Tests the @EnumValue decorator for runtime validation of class properties
 * against branded enums.
 */

import { createBrandedEnum } from './factory.js';
import { EnumValue } from './decorators.js';
import { REGISTRY_KEY } from './types.js';

/**
 * Clears the global registry for test isolation.
 */
function clearRegistry(): void {
  const global = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: unknown;
  };
  delete global[REGISTRY_KEY];
}

describe('EnumValue decorator', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic validation', () => {
    it('allows valid enum values to be assigned', () => {
      const Status = createBrandedEnum('status', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      class User {
        @EnumValue(Status)
        accessor status: string = Status.Active;
      }

      const user = new User();
      expect(user.status).toBe('active');

      user.status = Status.Inactive;
      expect(user.status).toBe('inactive');
    });

    it('throws error for invalid enum values', () => {
      const Status = createBrandedEnum('status-invalid', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      class User {
        @EnumValue(Status)
        accessor status: string = Status.Active;
      }

      const user = new User();

      expect(() => {
        user.status = 'invalid' as typeof Status.Active;
      }).toThrow(/invalid value "invalid"/);
    });

    it('error message includes valid values and enum ID', () => {
      const Status = createBrandedEnum('status-error-msg', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      class User {
        @EnumValue(Status)
        accessor status: string = Status.Active;
      }

      const user = new User();

      expect(() => {
        user.status = 'wrong' as typeof Status.Active;
      }).toThrow(/Expected one of: active, inactive.*status-error-msg/);
    });

    it('throws error for non-string values', () => {
      const Status = createBrandedEnum('status-nonstring', {
        Active: 'active',
      } as const);

      class User {
        @EnumValue(Status)
        accessor status: string = Status.Active;
      }

      const user = new User();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user.status = 123 as any;
      }).toThrow(/must be a string value/);
    });
  });

  describe('optional properties', () => {
    it('allows undefined when optional is true', () => {
      const Status = createBrandedEnum('status-optional', {
        Active: 'active',
      } as const);

      class Config {
        @EnumValue(Status, { optional: true })
        accessor status: string | undefined = undefined;
      }

      const config = new Config();
      expect(config.status).toBeUndefined();

      config.status = Status.Active;
      expect(config.status).toBe('active');

      config.status = undefined;
      expect(config.status).toBeUndefined();
    });

    it('throws error for undefined when optional is false', () => {
      const Status = createBrandedEnum('status-not-optional', {
        Active: 'active',
      } as const);

      class Config {
        @EnumValue(Status)
        accessor status: string = Status.Active;
      }

      const config = new Config();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config.status = undefined as any;
      }).toThrow(/cannot be undefined/);
    });
  });

  describe('nullable properties', () => {
    it('allows null when nullable is true', () => {
      const Status = createBrandedEnum('status-nullable', {
        Active: 'active',
      } as const);

      class Settings {
        @EnumValue(Status, { nullable: true })
        accessor status: string | null = null;
      }

      const settings = new Settings();
      expect(settings.status).toBeNull();

      settings.status = Status.Active;
      expect(settings.status).toBe('active');

      settings.status = null;
      expect(settings.status).toBeNull();
    });

    it('throws error for null when nullable is false', () => {
      const Status = createBrandedEnum('status-not-nullable', {
        Active: 'active',
      } as const);

      class Settings {
        @EnumValue(Status)
        accessor status: string = Status.Active;
      }

      const settings = new Settings();

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings.status = null as any;
      }).toThrow(/cannot be null/);
    });
  });

  describe('combined optional and nullable', () => {
    it('allows both null and undefined when both options are true', () => {
      const Status = createBrandedEnum('status-both', {
        Active: 'active',
      } as const);

      class Flexible {
        @EnumValue(Status, { optional: true, nullable: true })
        accessor status: string | null | undefined = undefined;
      }

      const flexible = new Flexible();
      expect(flexible.status).toBeUndefined();

      flexible.status = null;
      expect(flexible.status).toBeNull();

      flexible.status = Status.Active;
      expect(flexible.status).toBe('active');

      flexible.status = undefined;
      expect(flexible.status).toBeUndefined();
    });
  });

  describe('initialization validation', () => {
    it('validates initial value during class instantiation', () => {
      const Status = createBrandedEnum('status-init', {
        Active: 'active',
      } as const);

      expect(() => {
        class BadInit {
          @EnumValue(Status)
          accessor status: string = 'invalid' as typeof Status.Active;
        }
        new BadInit();
      }).toThrow(/initialized with invalid value/);
    });

    it('allows valid initial values', () => {
      const Status = createBrandedEnum('status-valid-init', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      class GoodInit {
        @EnumValue(Status)
        accessor status: string = Status.Inactive;
      }

      const instance = new GoodInit();
      expect(instance.status).toBe('inactive');
    });
  });

  describe('decorator creation validation', () => {
    it('throws error if first argument is not a branded enum', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EnumValue({ Active: 'active' } as any);
      }).toThrow(/requires a branded enum/);
    });

    it('throws error for null as enum argument', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EnumValue(null as any);
      }).toThrow(/requires a branded enum/);
    });

    it('throws error for undefined as enum argument', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EnumValue(undefined as any);
      }).toThrow(/requires a branded enum/);
    });
  });

  describe('multiple decorated properties', () => {
    it('validates each property independently', () => {
      const Status = createBrandedEnum('status-multi', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const Priority = createBrandedEnum('priority-multi', {
        High: 'high',
        Low: 'low',
      } as const);

      class Task {
        @EnumValue(Status)
        accessor status: string = Status.Active;

        @EnumValue(Priority)
        accessor priority: string = Priority.High;
      }

      const task = new Task();
      expect(task.status).toBe('active');
      expect(task.priority).toBe('high');

      task.status = Status.Inactive;
      task.priority = Priority.Low;

      expect(task.status).toBe('inactive');
      expect(task.priority).toBe('low');

      // Cross-assignment should fail
      expect(() => {
        task.status = Priority.High as typeof Status.Active;
      }).toThrow(/invalid value "high"/);
    });
  });
});


describe('EnumClass decorator', () => {
  beforeEach(() => {
    clearRegistry();
    // Also clear the consumer registry
    const global = globalThis as typeof globalThis & {
      __brandedEnumConsumerRegistry__?: unknown;
    };
    delete global.__brandedEnumConsumerRegistry__;
  });

  describe('basic registration', () => {
    it('registers a class as a consumer of a single enum', async () => {
      const Status = createBrandedEnum('status-class-single', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const { EnumClass, getEnumConsumers, getConsumedEnums } = await import('./decorators.js');

      @EnumClass(Status)
      class User {
        status = Status.Active;
      }

      expect(getEnumConsumers('status-class-single')).toContain('User');
      expect(getConsumedEnums('User')).toContain('status-class-single');

      // Verify the class still works normally
      const user = new User();
      expect(user.status).toBe('active');
    });

    it('registers a class as a consumer of multiple enums', async () => {
      const Status = createBrandedEnum('status-class-multi', {
        Active: 'active',
      } as const);

      const Priority = createBrandedEnum('priority-class-multi', {
        High: 'high',
      } as const);

      const { EnumClass, getEnumConsumers, getConsumedEnums } = await import('./decorators.js');

      @EnumClass(Status, Priority)
      class Task {
        status = Status.Active;
        priority = Priority.High;
      }

      expect(getEnumConsumers('status-class-multi')).toContain('Task');
      expect(getEnumConsumers('priority-class-multi')).toContain('Task');
      expect(getConsumedEnums('Task')).toEqual(
        expect.arrayContaining(['status-class-multi', 'priority-class-multi'])
      );
    });
  });

  describe('multiple classes consuming same enum', () => {
    it('tracks multiple classes consuming the same enum', async () => {
      const Status = createBrandedEnum('status-shared', {
        Active: 'active',
      } as const);

      const { EnumClass, getEnumConsumers } = await import('./decorators.js');

      @EnumClass(Status)
      class User {
        status = Status.Active;
      }

      @EnumClass(Status)
      class Order {
        status = Status.Active;
      }

      const consumers = getEnumConsumers('status-shared');
      expect(consumers).toContain('User');
      expect(consumers).toContain('Order');
      expect(consumers.length).toBe(2);
    });
  });

  describe('getAllEnumConsumers', () => {
    it('returns all registered consumer entries', async () => {
      const Status = createBrandedEnum('status-all', {
        Active: 'active',
      } as const);

      const Priority = createBrandedEnum('priority-all', {
        High: 'high',
      } as const);

      const { EnumClass, getAllEnumConsumers } = await import('./decorators.js');

      @EnumClass(Status)
      class User {}

      @EnumClass(Priority)
      class Task {}

      const allConsumers = getAllEnumConsumers();
      expect(allConsumers.length).toBe(2);

      const userEntry = allConsumers.find((e) => e.className === 'User');
      const taskEntry = allConsumers.find((e) => e.className === 'Task');

      expect(userEntry).toBeDefined();
      expect(userEntry?.enumIds.has('status-all')).toBe(true);

      expect(taskEntry).toBeDefined();
      expect(taskEntry?.enumIds.has('priority-all')).toBe(true);
    });
  });

  describe('validation', () => {
    it('throws error if argument is not a branded enum', async () => {
      const { EnumClass } = await import('./decorators.js');

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EnumClass({ Active: 'active' } as any);
      }).toThrow(/not a valid branded enum/);
    });

    it('throws error with index for invalid enum in array', async () => {
      const Status = createBrandedEnum('status-valid-arg', {
        Active: 'active',
      } as const);

      const { EnumClass } = await import('./decorators.js');

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EnumClass(Status, { Invalid: 'invalid' } as any);
      }).toThrow(/argument at index 1/);
    });

    it('throws error for null argument', async () => {
      const { EnumClass } = await import('./decorators.js');

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EnumClass(null as any);
      }).toThrow(/not a valid branded enum/);
    });
  });

  describe('class functionality preservation', () => {
    it('does not modify class behavior', async () => {
      const Status = createBrandedEnum('status-preserve', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const { EnumClass } = await import('./decorators.js');

      @EnumClass(Status)
      class User {
        constructor(public name: string) {}

        getStatus() {
          return Status.Active;
        }
      }

      const user = new User('John');
      expect(user.name).toBe('John');
      expect(user.getStatus()).toBe('active');
      expect(user instanceof User).toBe(true);
    });
  });

  describe('empty queries', () => {
    it('returns empty array for unknown enum ID', async () => {
      const { getEnumConsumers } = await import('./decorators.js');
      expect(getEnumConsumers('nonexistent')).toEqual([]);
    });

    it('returns empty array for unknown class name', async () => {
      const { getConsumedEnums } = await import('./decorators.js');
      expect(getConsumedEnums('NonexistentClass')).toEqual([]);
    });
  });
});
