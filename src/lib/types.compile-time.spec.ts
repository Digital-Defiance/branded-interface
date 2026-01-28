/**
 * Compile-time type tests for branded-enum utility types.
 *
 * These tests verify that the compile-time validation types work correctly.
 * If any of these type assertions fail, TypeScript will produce a compile error.
 *
 * Feature: branded-enum
 */

import { createBrandedEnum } from './factory.js';
import {
  EnumKeys,
  EnumValues,
  ValidEnumValue,
  StrictEnumParam,
  REGISTRY_KEY,
} from './types.js';

/**
 * Clears the global registry for test isolation.
 */
function clearRegistry(): void {
  const global = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: unknown;
  };
  delete global[REGISTRY_KEY];
}

// =============================================================================
// Type-Level Test Utilities
// =============================================================================

/**
 * Utility type that asserts two types are equal.
 * If T and U are not the same type, this produces a compile error.
 */
type AssertEqual<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;

/**
 * Utility type that asserts a type is `never`.
 */
type AssertNever<T> = [T] extends [never] ? true : false;

/**
 * Utility type that asserts a type is NOT `never`.
 */
type AssertNotNever<T> = [T] extends [never] ? false : true;

// =============================================================================
// Test Setup
// =============================================================================

describe('Compile-time validation types', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('EnumKeys<E>', () => {
    it('extracts all keys from a branded enum', () => {
      const Status = createBrandedEnum('status-keys-test', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      // Type-level assertion: EnumKeys should be 'Active' | 'Inactive' | 'Pending'
      type StatusKeys = EnumKeys<typeof Status>;
      
      // Runtime verification that the type is correct
      const validKeys: StatusKeys[] = ['Active', 'Inactive', 'Pending'];
      expect(validKeys).toHaveLength(3);

      // Compile-time assertion
      const _assertKeysCorrect: AssertEqual<
        StatusKeys,
        'Active' | 'Inactive' | 'Pending'
      > = true;
      expect(_assertKeysCorrect).toBe(true);
    });

    it('works with single-key enums', () => {
      const Single = createBrandedEnum('single-key-test', {
        Only: 'only',
      } as const);

      type SingleKeys = EnumKeys<typeof Single>;
      
      const _assertSingleKey: AssertEqual<SingleKeys, 'Only'> = true;
      expect(_assertSingleKey).toBe(true);
    });

    it('excludes Symbol metadata keys', () => {
      const Colors = createBrandedEnum('colors-keys-test', {
        Red: 'red',
        Blue: 'blue',
      } as const);

      type ColorKeys = EnumKeys<typeof Colors>;
      
      // Should only include string keys, not Symbol keys
      const keys: ColorKeys[] = ['Red', 'Blue'];
      expect(keys).toHaveLength(2);
    });
  });

  describe('EnumValues<E>', () => {
    it('extracts all values from a branded enum', () => {
      const Status = createBrandedEnum('status-values-test', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      type StatusValues = EnumValues<typeof Status>;
      
      // Runtime verification
      const validValues: StatusValues[] = ['active', 'inactive', 'pending'];
      expect(validValues).toHaveLength(3);

      // Compile-time assertion
      const _assertValuesCorrect: AssertEqual<
        StatusValues,
        'active' | 'inactive' | 'pending'
      > = true;
      expect(_assertValuesCorrect).toBe(true);
    });

    it('is equivalent to BrandedEnumValue', () => {
      const Priority = createBrandedEnum('priority-values-test', {
        High: 'high',
        Low: 'low',
      } as const);

      type ValuesType = EnumValues<typeof Priority>;

      // EnumValues should produce the same union as the values
      const _assertValuesCorrect: AssertEqual<ValuesType, 'high' | 'low'> = true;
      expect(_assertValuesCorrect).toBe(true);
    });
  });

  describe('ValidEnumValue<E, V>', () => {
    it('returns the value type when V is a valid enum value', () => {
      const Status = createBrandedEnum('status-valid-test', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      // 'active' is a valid value
      type ValidActive = ValidEnumValue<typeof Status, 'active'>;
      
      const _assertValidActive: AssertEqual<ValidActive, 'active'> = true;
      expect(_assertValidActive).toBe(true);

      // 'inactive' is also valid
      type ValidInactive = ValidEnumValue<typeof Status, 'inactive'>;
      
      const _assertValidInactive: AssertEqual<ValidInactive, 'inactive'> = true;
      expect(_assertValidInactive).toBe(true);
    });

    it('returns never when V is not a valid enum value', () => {
      const Status = createBrandedEnum('status-invalid-test', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      // 'unknown' is not a valid value
      type InvalidValue = ValidEnumValue<typeof Status, 'unknown'>;
      
      const _assertInvalidIsNever: AssertNever<InvalidValue> = true;
      expect(_assertInvalidIsNever).toBe(true);

      // 'pending' is also not valid
      type AlsoInvalid = ValidEnumValue<typeof Status, 'pending'>;
      
      const _assertAlsoNever: AssertNever<AlsoInvalid> = true;
      expect(_assertAlsoNever).toBe(true);
    });

    it('works with literal string types', () => {
      const Colors = createBrandedEnum('colors-valid-test', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
      } as const);

      // All valid colors
      type ValidRed = ValidEnumValue<typeof Colors, 'red'>;
      type ValidGreen = ValidEnumValue<typeof Colors, 'green'>;
      type ValidBlue = ValidEnumValue<typeof Colors, 'blue'>;

      const _assertRed: AssertNotNever<ValidRed> = true;
      const _assertGreen: AssertNotNever<ValidGreen> = true;
      const _assertBlue: AssertNotNever<ValidBlue> = true;

      expect(_assertRed).toBe(true);
      expect(_assertGreen).toBe(true);
      expect(_assertBlue).toBe(true);

      // Invalid color
      type InvalidYellow = ValidEnumValue<typeof Colors, 'yellow'>;
      const _assertYellowNever: AssertNever<InvalidYellow> = true;
      expect(_assertYellowNever).toBe(true);
    });
  });

  describe('StrictEnumParam<E>', () => {
    it('creates a type that accepts valid enum values', () => {
      const Status = createBrandedEnum('status-param-test', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      type StatusParam = StrictEnumParam<typeof Status>;

      // Should be equivalent to the union of all values
      const _assertParamType: AssertEqual<
        StatusParam,
        'active' | 'inactive' | 'pending'
      > = true;
      expect(_assertParamType).toBe(true);
    });

    it('can be used in function parameters', () => {
      const Priority = createBrandedEnum('priority-param-test', {
        High: 'high',
        Medium: 'medium',
        Low: 'low',
      } as const);

      // Function using StrictEnumParam
      function setPriority(priority: StrictEnumParam<typeof Priority>): string {
        return `Priority set to: ${priority}`;
      }

      // Should accept valid values
      expect(setPriority(Priority.High)).toBe('Priority set to: high');
      expect(setPriority('medium')).toBe('Priority set to: medium');
      expect(setPriority(Priority.Low)).toBe('Priority set to: low');
    });

    it('works with generic functions', () => {
      const Colors = createBrandedEnum('colors-param-test', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
      } as const);

      // Generic function using the enum directly (not a generic constraint)
      function processColorValue(
        value: StrictEnumParam<typeof Colors>
      ): string {
        return `Processing: ${value}`;
      }

      // Should work with the enum values
      expect(processColorValue('red')).toBe('Processing: red');
      expect(processColorValue(Colors.Green)).toBe('Processing: green');
    });
  });

  describe('Type composition', () => {
    it('EnumKeys and EnumValues work together', () => {
      const Sizes = createBrandedEnum('sizes-composition-test', {
        Small: 's',
        Medium: 'm',
        Large: 'l',
      } as const);

      type Keys = EnumKeys<typeof Sizes>;
      type Values = EnumValues<typeof Sizes>;

      // Keys and values should be different
      const keys: Keys[] = ['Small', 'Medium', 'Large'];
      const values: Values[] = ['s', 'm', 'l'];

      expect(keys).toHaveLength(3);
      expect(values).toHaveLength(3);

      // Verify they're different types
      const _assertKeysDifferent: AssertEqual<Keys, Values> = false;
      expect(_assertKeysDifferent).toBe(false);
    });

    it('ValidEnumValue works with EnumValues', () => {
      const Status = createBrandedEnum('status-composition-test', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      type AllValues = EnumValues<typeof Status>;
      
      // Any value from EnumValues should be valid
      type ValidFromValues = ValidEnumValue<typeof Status, AllValues>;
      
      // Should be the same as AllValues (all values are valid)
      const _assertSame: AssertEqual<ValidFromValues, AllValues> = true;
      expect(_assertSame).toBe(true);
    });
  });

  describe('Real-world usage patterns', () => {
    it('type-safe switch statement exhaustiveness', () => {
      const Status = createBrandedEnum('status-switch-test', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      function getStatusLabel(status: StrictEnumParam<typeof Status>): string {
        switch (status) {
          case 'active':
            return 'Active';
          case 'inactive':
            return 'Inactive';
          case 'pending':
            return 'Pending';
        }
      }

      expect(getStatusLabel(Status.Active)).toBe('Active');
      expect(getStatusLabel('inactive')).toBe('Inactive');
      expect(getStatusLabel(Status.Pending)).toBe('Pending');
    });

    it('type-safe object mapping', () => {
      const Priority = createBrandedEnum('priority-mapping-test', {
        High: 'high',
        Medium: 'medium',
        Low: 'low',
      } as const);

      // Create a type-safe mapping object
      const priorityWeights: Record<EnumValues<typeof Priority>, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };

      expect(priorityWeights[Priority.High]).toBe(3);
      expect(priorityWeights['medium']).toBe(2);
      expect(priorityWeights[Priority.Low]).toBe(1);
    });

    it('type-safe array filtering', () => {
      const Status = createBrandedEnum('status-filter-test', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      type StatusValue = EnumValues<typeof Status>;

      const items: Array<{ id: number; status: StatusValue }> = [
        { id: 1, status: 'active' },
        { id: 2, status: 'inactive' },
        { id: 3, status: 'pending' },
        { id: 4, status: 'active' },
      ];

      const activeItems = items.filter((item) => item.status === Status.Active);
      expect(activeItems).toHaveLength(2);
    });
  });
});
