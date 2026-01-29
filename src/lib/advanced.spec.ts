/**
 * Unit tests for advanced enum operations
 *
 * Feature: branded-enum
 */

import { createBrandedEnum } from './factory.js';
import { enumSubset, enumExclude, enumMap, enumFromKeys, enumDiff, enumToRecord, toJsonSchema, toZodSchema } from './advanced.js';
import { ENUM_ID, ENUM_VALUES, REGISTRY_KEY } from './types.js';
import { getRegistry, findEnumSources } from './registry.js';

/**
 * Clears the global registry for test isolation.
 */
function clearRegistry(): void {
  const global = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: unknown;
  };
  delete global[REGISTRY_KEY];
}

describe('enumSubset', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('creates a subset enum with only the specified keys', () => {
      const AllColors = createBrandedEnum('all-colors', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
        Yellow: 'yellow',
      } as const);

      const PrimaryColors = enumSubset('primary-colors', AllColors, ['Red', 'Blue', 'Yellow']);

      // Should have only the specified keys
      expect(Object.keys(PrimaryColors).sort()).toEqual(['Blue', 'Red', 'Yellow']);
      
      // Values should match the source enum
      expect(PrimaryColors.Red).toBe('red');
      expect(PrimaryColors.Blue).toBe('blue');
      expect(PrimaryColors.Yellow).toBe('yellow');
      
      // Should not have excluded keys
      expect('Green' in PrimaryColors).toBe(false);
    });

    it('preserves the original values from the source enum', () => {
      const Status = createBrandedEnum('status', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      const ActiveStatuses = enumSubset('active-statuses', Status, ['Active', 'Pending']);

      expect(ActiveStatuses.Active).toBe('active');
      expect(ActiveStatuses.Pending).toBe('pending');
    });

    it('works with a single key', () => {
      const Sizes = createBrandedEnum('sizes', {
        Small: 'small',
        Medium: 'medium',
        Large: 'large',
      } as const);

      const OnlySmall = enumSubset('only-small', Sizes, ['Small']);

      expect(Object.keys(OnlySmall)).toEqual(['Small']);
      expect(OnlySmall.Small).toBe('small');
    });
  });

  describe('metadata', () => {
    it('attaches correct ENUM_ID metadata', () => {
      const Source = createBrandedEnum('source-enum', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const Subset = enumSubset('subset-enum', Source, ['A', 'B']);

      expect(Subset[ENUM_ID]).toBe('subset-enum');
    });

    it('attaches correct ENUM_VALUES metadata with only subset values', () => {
      const Source = createBrandedEnum('source-enum-2', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const Subset = enumSubset('subset-enum-2', Source, ['A', 'C']);

      const values = Subset[ENUM_VALUES];
      expect(values.size).toBe(2);
      expect(values.has('a')).toBe(true);
      expect(values.has('c')).toBe(true);
      expect(values.has('b')).toBe(false);
    });

    it('freezes the resulting enum object', () => {
      const Source = createBrandedEnum('source-enum-3', {
        X: 'x',
        Y: 'y',
      } as const);

      const Subset = enumSubset('subset-enum-3', Source, ['X']);

      expect(Object.isFrozen(Subset)).toBe(true);
    });
  });

  describe('registry integration', () => {
    it('registers the subset enum in the global registry', () => {
      const Source = createBrandedEnum('source-for-registry', {
        One: 'one',
        Two: 'two',
      } as const);

      const Subset = enumSubset('subset-for-registry', Source, ['One']);

      const registry = getRegistry();
      expect(registry.enums.has('subset-for-registry')).toBe(true);
      expect(registry.enums.get('subset-for-registry')?.enumObj).toBe(Subset);
    });

    it('findEnumSources includes the subset enum ID for its values', () => {
      const Source = createBrandedEnum('source-for-find', {
        Alpha: 'alpha',
        Beta: 'beta',
      } as const);

      enumSubset('subset-for-find', Source, ['Alpha']);

      const sources = findEnumSources('alpha');
      expect(sources).toContain('source-for-find');
      expect(sources).toContain('subset-for-find');
    });

    it('findEnumSources does not include subset for excluded values', () => {
      const Source = createBrandedEnum('source-for-exclude', {
        Included: 'included',
        Excluded: 'excluded',
      } as const);

      enumSubset('subset-for-exclude', Source, ['Included']);

      const sources = findEnumSources('excluded');
      expect(sources).toContain('source-for-exclude');
      expect(sources).not.toContain('subset-for-exclude');
    });
  });

  describe('error handling', () => {
    it('throws when source is not a branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumSubset('invalid-subset', notAnEnum, ['A']);
      }).toThrow('enumSubset requires a branded enum as the source');
    });

    it('throws when keys array is empty', () => {
      const Source = createBrandedEnum('source-empty-keys', {
        A: 'a',
      } as const);

      expect(() => {
        enumSubset('empty-keys-subset', Source, []);
      }).toThrow('enumSubset requires at least one key');
    });

    it('throws when a key does not exist in the source enum', () => {
      const Source = createBrandedEnum('source-invalid-key', {
        A: 'a',
        B: 'b',
      } as const);

      expect(() => {
        // @ts-expect-error - intentionally passing invalid key
        enumSubset('invalid-key-subset', Source, ['A', 'NonExistent']);
      }).toThrow('Key "NonExistent" does not exist in enum "source-invalid-key"');
    });

    it('returns existing enum when newId is already registered', () => {
      const Source = createBrandedEnum('source-dup-id', {
        A: 'a',
      } as const);

      // Create first subset
      const first = enumSubset('duplicate-id', Source, ['A']);

      // Creating another with the same ID should return the existing one
      const second = enumSubset('duplicate-id', Source, ['A']);
      expect(second).toBe(first);
    });
  });

  describe('serialization', () => {
    it('JSON.stringify produces only the subset key-value pairs', () => {
      const Source = createBrandedEnum('source-json', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const Subset = enumSubset('subset-json', Source, ['A', 'C']);

      const json = JSON.stringify(Subset);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({ A: 'a', C: 'c' });
    });

    it('Object.keys returns only the subset keys', () => {
      const Source = createBrandedEnum('source-keys', {
        X: 'x',
        Y: 'y',
        Z: 'z',
      } as const);

      const Subset = enumSubset('subset-keys', Source, ['X', 'Z']);

      expect(Object.keys(Subset).sort()).toEqual(['X', 'Z']);
    });

    it('Object.values returns only the subset values', () => {
      const Source = createBrandedEnum('source-values', {
        X: 'x',
        Y: 'y',
        Z: 'z',
      } as const);

      const Subset = enumSubset('subset-values', Source, ['X', 'Z']);

      expect(Object.values(Subset).sort()).toEqual(['x', 'z']);
    });
  });
});


describe('enumExclude', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('creates an enum excluding the specified keys', () => {
      const AllColors = createBrandedEnum('all-colors-exc', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
        Yellow: 'yellow',
      } as const);

      const NonPrimary = enumExclude('non-primary', AllColors, ['Red', 'Blue', 'Yellow']);

      // Should have only the non-excluded keys
      expect(Object.keys(NonPrimary)).toEqual(['Green']);
      
      // Values should match the source enum
      expect(NonPrimary.Green).toBe('green');
      
      // Should not have excluded keys
      expect('Red' in NonPrimary).toBe(false);
      expect('Blue' in NonPrimary).toBe(false);
      expect('Yellow' in NonPrimary).toBe(false);
    });

    it('preserves the original values from the source enum', () => {
      const Status = createBrandedEnum('status-exc', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
        Archived: 'archived',
      } as const);

      const CurrentStatuses = enumExclude('current-statuses', Status, ['Archived']);

      expect(CurrentStatuses.Active).toBe('active');
      expect(CurrentStatuses.Inactive).toBe('inactive');
      expect(CurrentStatuses.Pending).toBe('pending');
    });

    it('works with excluding a single key', () => {
      const Sizes = createBrandedEnum('sizes-exc', {
        Small: 'small',
        Medium: 'medium',
        Large: 'large',
      } as const);

      const NoLarge = enumExclude('no-large', Sizes, ['Large']);

      expect(Object.keys(NoLarge).sort()).toEqual(['Medium', 'Small']);
      expect(NoLarge.Small).toBe('small');
      expect(NoLarge.Medium).toBe('medium');
    });

    it('works with an empty exclusion array (keeps all keys)', () => {
      const Source = createBrandedEnum('source-empty-exc', {
        A: 'a',
        B: 'b',
      } as const);

      const Copy = enumExclude('copy-all', Source, []);

      expect(Object.keys(Copy).sort()).toEqual(['A', 'B']);
      expect(Copy.A).toBe('a');
      expect(Copy.B).toBe('b');
    });
  });

  describe('metadata', () => {
    it('attaches correct ENUM_ID metadata', () => {
      const Source = createBrandedEnum('source-enum-exc', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const Excluded = enumExclude('excluded-enum', Source, ['B']);

      expect(Excluded[ENUM_ID]).toBe('excluded-enum');
    });

    it('attaches correct ENUM_VALUES metadata with only remaining values', () => {
      const Source = createBrandedEnum('source-enum-exc-2', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const Excluded = enumExclude('excluded-enum-2', Source, ['B']);

      const values = Excluded[ENUM_VALUES];
      expect(values.size).toBe(2);
      expect(values.has('a')).toBe(true);
      expect(values.has('c')).toBe(true);
      expect(values.has('b')).toBe(false);
    });

    it('freezes the resulting enum object', () => {
      const Source = createBrandedEnum('source-enum-exc-3', {
        X: 'x',
        Y: 'y',
      } as const);

      const Excluded = enumExclude('excluded-enum-3', Source, ['Y']);

      expect(Object.isFrozen(Excluded)).toBe(true);
    });
  });

  describe('registry integration', () => {
    it('registers the excluded enum in the global registry', () => {
      const Source = createBrandedEnum('source-for-registry-exc', {
        One: 'one',
        Two: 'two',
      } as const);

      const Excluded = enumExclude('excluded-for-registry', Source, ['Two']);

      const registry = getRegistry();
      expect(registry.enums.has('excluded-for-registry')).toBe(true);
      expect(registry.enums.get('excluded-for-registry')?.enumObj).toBe(Excluded);
    });

    it('findEnumSources includes the excluded enum ID for remaining values', () => {
      const Source = createBrandedEnum('source-for-find-exc', {
        Alpha: 'alpha',
        Beta: 'beta',
      } as const);

      enumExclude('excluded-for-find', Source, ['Beta']);

      const sources = findEnumSources('alpha');
      expect(sources).toContain('source-for-find-exc');
      expect(sources).toContain('excluded-for-find');
    });

    it('findEnumSources does not include excluded enum for excluded values', () => {
      const Source = createBrandedEnum('source-for-exclude-exc', {
        Included: 'included',
        Excluded: 'excluded',
      } as const);

      enumExclude('excluded-for-exclude', Source, ['Excluded']);

      const sources = findEnumSources('excluded');
      expect(sources).toContain('source-for-exclude-exc');
      expect(sources).not.toContain('excluded-for-exclude');
    });
  });

  describe('error handling', () => {
    it('throws when source is not a branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumExclude('invalid-exclude', notAnEnum, ['A']);
      }).toThrow('enumExclude requires a branded enum as the source');
    });

    it('throws when excluding all keys would result in empty enum', () => {
      const Source = createBrandedEnum('source-all-keys', {
        A: 'a',
      } as const);

      expect(() => {
        enumExclude('empty-result', Source, ['A']);
      }).toThrow('enumExclude: excluding all keys would result in an empty enum');
    });

    it('throws when a key to exclude does not exist in the source enum', () => {
      const Source = createBrandedEnum('source-invalid-key-exc', {
        A: 'a',
        B: 'b',
      } as const);

      expect(() => {
        // @ts-expect-error - intentionally passing invalid key
        enumExclude('invalid-key-exclude', Source, ['NonExistent']);
      }).toThrow('Key "NonExistent" does not exist in enum "source-invalid-key-exc"');
    });

    it('returns existing enum when newId is already registered', () => {
      const Source = createBrandedEnum('source-dup-id-exc', {
        A: 'a',
        B: 'b',
      } as const);

      // Create first excluded enum
      const first = enumExclude('duplicate-id-exc', Source, ['A']);

      // Creating another with the same ID should return the existing one
      const second = enumExclude('duplicate-id-exc', Source, ['B']);
      expect(second).toBe(first);
    });
  });

  describe('serialization', () => {
    it('JSON.stringify produces only the remaining key-value pairs', () => {
      const Source = createBrandedEnum('source-json-exc', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const Excluded = enumExclude('excluded-json', Source, ['B']);

      const json = JSON.stringify(Excluded);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({ A: 'a', C: 'c' });
    });

    it('Object.keys returns only the remaining keys', () => {
      const Source = createBrandedEnum('source-keys-exc', {
        X: 'x',
        Y: 'y',
        Z: 'z',
      } as const);

      const Excluded = enumExclude('excluded-keys', Source, ['Y']);

      expect(Object.keys(Excluded).sort()).toEqual(['X', 'Z']);
    });

    it('Object.values returns only the remaining values', () => {
      const Source = createBrandedEnum('source-values-exc', {
        X: 'x',
        Y: 'y',
        Z: 'z',
      } as const);

      const Excluded = enumExclude('excluded-values', Source, ['Y']);

      expect(Object.values(Excluded).sort()).toEqual(['x', 'z']);
    });
  });

  describe('complement relationship with enumSubset', () => {
    it('enumExclude and enumSubset are complements', () => {
      const Source = createBrandedEnum('source-complement', {
        A: 'a',
        B: 'b',
        C: 'c',
        D: 'd',
      } as const);

      // Subset with A, B
      const Subset = enumSubset('subset-complement', Source, ['A', 'B']);
      
      // Exclude A, B (should give C, D)
      const Excluded = enumExclude('excluded-complement', Source, ['A', 'B']);

      // Together they should cover all keys
      const subsetKeys = Object.keys(Subset).sort();
      const excludedKeys = Object.keys(Excluded).sort();
      const allKeys = [...subsetKeys, ...excludedKeys].sort();

      expect(allKeys).toEqual(['A', 'B', 'C', 'D']);
      
      // No overlap
      expect(subsetKeys.filter(k => excludedKeys.includes(k))).toEqual([]);
    });
  });
});



describe('enumMap', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('transforms all values through the mapper function', () => {
      const Status = createBrandedEnum('status-map', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const PrefixedStatus = enumMap('prefixed-status', Status, (value) => `app.${value}`);

      expect(PrefixedStatus.Active).toBe('app.active');
      expect(PrefixedStatus.Inactive).toBe('app.inactive');
    });

    it('preserves all keys from the source enum', () => {
      const Colors = createBrandedEnum('colors-map', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
      } as const);

      const UpperColors = enumMap('upper-colors', Colors, (value) => value.toUpperCase());

      expect(Object.keys(UpperColors).sort()).toEqual(['Blue', 'Green', 'Red']);
    });

    it('provides key as second argument to mapper', () => {
      const Sizes = createBrandedEnum('sizes-map', {
        Small: 's',
        Medium: 'm',
        Large: 'l',
      } as const);

      const VerboseSizes = enumMap('verbose-sizes', Sizes, (value, key) => `${key.toLowerCase()}-${value}`);

      expect(VerboseSizes.Small).toBe('small-s');
      expect(VerboseSizes.Medium).toBe('medium-m');
      expect(VerboseSizes.Large).toBe('large-l');
    });

    it('works with identity mapper (no transformation)', () => {
      const Source = createBrandedEnum('source-identity', {
        A: 'a',
        B: 'b',
      } as const);

      const Copy = enumMap('copy-identity', Source, (value) => value);

      expect(Copy.A).toBe('a');
      expect(Copy.B).toBe('b');
    });

    it('works with single-key enum', () => {
      const Single = createBrandedEnum('single-map', {
        Only: 'only',
      } as const);

      const Mapped = enumMap('mapped-single', Single, (value) => value.toUpperCase());

      expect(Object.keys(Mapped)).toEqual(['Only']);
      expect(Mapped.Only).toBe('ONLY');
    });
  });

  describe('metadata', () => {
    it('attaches correct ENUM_ID metadata', () => {
      const Source = createBrandedEnum('source-enum-map', {
        A: 'a',
        B: 'b',
      } as const);

      const Mapped = enumMap('mapped-enum', Source, (v) => v.toUpperCase());

      expect(Mapped[ENUM_ID]).toBe('mapped-enum');
    });

    it('attaches correct ENUM_VALUES metadata with transformed values', () => {
      const Source = createBrandedEnum('source-enum-map-2', {
        A: 'a',
        B: 'b',
      } as const);

      const Mapped = enumMap('mapped-enum-2', Source, (v) => `prefix_${v}`);

      const values = Mapped[ENUM_VALUES];
      expect(values.size).toBe(2);
      expect(values.has('prefix_a')).toBe(true);
      expect(values.has('prefix_b')).toBe(true);
      expect(values.has('a')).toBe(false);
      expect(values.has('b')).toBe(false);
    });

    it('freezes the resulting enum object', () => {
      const Source = createBrandedEnum('source-enum-map-3', {
        X: 'x',
      } as const);

      const Mapped = enumMap('mapped-enum-3', Source, (v) => v);

      expect(Object.isFrozen(Mapped)).toBe(true);
    });
  });

  describe('registry integration', () => {
    it('registers the mapped enum in the global registry', () => {
      const Source = createBrandedEnum('source-for-registry-map', {
        One: 'one',
      } as const);

      const Mapped = enumMap('mapped-for-registry', Source, (v) => v.toUpperCase());

      const registry = getRegistry();
      expect(registry.enums.has('mapped-for-registry')).toBe(true);
      expect(registry.enums.get('mapped-for-registry')?.enumObj).toBe(Mapped);
    });

    it('findEnumSources includes the mapped enum ID for transformed values', () => {
      const Source = createBrandedEnum('source-for-find-map', {
        Alpha: 'alpha',
      } as const);

      enumMap('mapped-for-find', Source, (v) => `mapped_${v}`);

      const sources = findEnumSources('mapped_alpha');
      expect(sources).toContain('mapped-for-find');
      expect(sources).not.toContain('source-for-find-map');
    });

    it('findEnumSources does not include mapped enum for original values', () => {
      const Source = createBrandedEnum('source-for-original', {
        Beta: 'beta',
      } as const);

      enumMap('mapped-for-original', Source, (v) => `transformed_${v}`);

      const sources = findEnumSources('beta');
      expect(sources).toContain('source-for-original');
      expect(sources).not.toContain('mapped-for-original');
    });
  });

  describe('error handling', () => {
    it('throws when source is not a branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumMap('invalid-map', notAnEnum, (v) => v);
      }).toThrow('enumMap requires a branded enum as the source');
    });

    it('throws when mapper returns non-string', () => {
      const Source = createBrandedEnum('source-non-string', {
        A: 'a',
      } as const);

      expect(() => {
        enumMap('non-string-map', Source, () => 123 as unknown as string);
      }).toThrow('enumMap mapper must return a string');
    });

    it('returns existing enum when newId is already registered', () => {
      const Source = createBrandedEnum('source-dup-id-map', {
        A: 'a',
      } as const);

      // Create first mapped enum
      const first = enumMap('duplicate-id-map', Source, (v) => v);

      // Creating another with the same ID should return the existing one
      const second = enumMap('duplicate-id-map', Source, (v) => v.toUpperCase());
      expect(second).toBe(first);
    });
  });

  describe('serialization', () => {
    it('JSON.stringify produces only the transformed key-value pairs', () => {
      const Source = createBrandedEnum('source-json-map', {
        A: 'a',
        B: 'b',
      } as const);

      const Mapped = enumMap('mapped-json', Source, (v) => `x_${v}`);

      const json = JSON.stringify(Mapped);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({ A: 'x_a', B: 'x_b' });
    });

    it('Object.keys returns all keys', () => {
      const Source = createBrandedEnum('source-keys-map', {
        X: 'x',
        Y: 'y',
      } as const);

      const Mapped = enumMap('mapped-keys', Source, (v) => v.toUpperCase());

      expect(Object.keys(Mapped).sort()).toEqual(['X', 'Y']);
    });

    it('Object.values returns transformed values', () => {
      const Source = createBrandedEnum('source-values-map', {
        X: 'x',
        Y: 'y',
      } as const);

      const Mapped = enumMap('mapped-values', Source, (v) => `${v}!`);

      expect(Object.values(Mapped).sort()).toEqual(['x!', 'y!']);
    });
  });

  describe('transformation examples', () => {
    it('can prefix all values', () => {
      const Events = createBrandedEnum('events-prefix', {
        Click: 'click',
        Hover: 'hover',
      } as const);

      const NamespacedEvents = enumMap('namespaced-events', Events, (v) => `ui.${v}`);

      expect(NamespacedEvents.Click).toBe('ui.click');
      expect(NamespacedEvents.Hover).toBe('ui.hover');
    });

    it('can suffix all values', () => {
      const Versions = createBrandedEnum('versions-suffix', {
        V1: 'v1',
        V2: 'v2',
      } as const);

      const BetaVersions = enumMap('beta-versions', Versions, (v) => `${v}-beta`);

      expect(BetaVersions.V1).toBe('v1-beta');
      expect(BetaVersions.V2).toBe('v2-beta');
    });

    it('can uppercase all values', () => {
      const Levels = createBrandedEnum('levels-upper', {
        Low: 'low',
        High: 'high',
      } as const);

      const UpperLevels = enumMap('upper-levels', Levels, (v) => v.toUpperCase());

      expect(UpperLevels.Low).toBe('LOW');
      expect(UpperLevels.High).toBe('HIGH');
    });

    it('can lowercase all values', () => {
      const Codes = createBrandedEnum('codes-lower', {
        Error: 'ERROR',
        Warning: 'WARNING',
      } as const);

      const LowerCodes = enumMap('lower-codes', Codes, (v) => v.toLowerCase());

      expect(LowerCodes.Error).toBe('error');
      expect(LowerCodes.Warning).toBe('warning');
    });
  });
});



describe('enumFromKeys', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('creates an enum where keys equal values', () => {
      const Status = enumFromKeys('status-from-keys', ['Active', 'Inactive', 'Pending'] as const);

      expect(Status.Active).toBe('Active');
      expect(Status.Inactive).toBe('Inactive');
      expect(Status.Pending).toBe('Pending');
    });

    it('preserves all keys from the input array', () => {
      const Colors = enumFromKeys('colors-from-keys', ['Red', 'Green', 'Blue'] as const);

      expect(Object.keys(Colors).sort()).toEqual(['Blue', 'Green', 'Red']);
    });

    it('works with a single key', () => {
      const Single = enumFromKeys('single-from-keys', ['Only'] as const);

      expect(Object.keys(Single)).toEqual(['Only']);
      expect(Single.Only).toBe('Only');
    });

    it('works with many keys', () => {
      const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
      const ManyKeys = enumFromKeys('many-from-keys', keys);

      expect(Object.keys(ManyKeys).sort()).toEqual([...keys].sort());
      for (const key of keys) {
        expect(ManyKeys[key]).toBe(key);
      }
    });
  });

  describe('metadata', () => {
    it('attaches correct ENUM_ID metadata', () => {
      const Directions = enumFromKeys('directions-from-keys', ['North', 'South', 'East', 'West'] as const);

      expect(Directions[ENUM_ID]).toBe('directions-from-keys');
    });

    it('attaches correct ENUM_VALUES metadata', () => {
      const Sizes = enumFromKeys('sizes-from-keys', ['Small', 'Medium', 'Large'] as const);

      const values = Sizes[ENUM_VALUES];
      expect(values.size).toBe(3);
      expect(values.has('Small')).toBe(true);
      expect(values.has('Medium')).toBe(true);
      expect(values.has('Large')).toBe(true);
    });

    it('freezes the resulting enum object', () => {
      const Frozen = enumFromKeys('frozen-from-keys', ['A', 'B'] as const);

      expect(Object.isFrozen(Frozen)).toBe(true);
    });
  });

  describe('registry integration', () => {
    it('registers the enum in the global registry', () => {
      const Registered = enumFromKeys('registered-from-keys', ['One', 'Two'] as const);

      const registry = getRegistry();
      expect(registry.enums.has('registered-from-keys')).toBe(true);
      expect(registry.enums.get('registered-from-keys')?.enumObj).toBe(Registered);
    });

    it('findEnumSources includes the enum ID for its values', () => {
      enumFromKeys('findable-from-keys', ['Alpha', 'Beta'] as const);

      const sources = findEnumSources('Alpha');
      expect(sources).toContain('findable-from-keys');
    });
  });

  describe('error handling', () => {
    it('throws when keys array is empty', () => {
      expect(() => {
        enumFromKeys('empty-keys', []);
      }).toThrow('enumFromKeys requires at least one key');
    });

    it('throws when a key is an empty string', () => {
      expect(() => {
        enumFromKeys('empty-string-key', ['Valid', ''] as const);
      }).toThrow('enumFromKeys requires all keys to be non-empty strings');
    });

    it('throws when keys array contains duplicates', () => {
      expect(() => {
        enumFromKeys('duplicate-keys', ['A', 'B', 'A'] as const);
      }).toThrow('enumFromKeys: duplicate key "A" found');
    });

    it('returns existing enum when enumId is already registered', () => {
      const first = enumFromKeys('duplicate-id-from-keys', ['A'] as const);

      // Creating another with the same ID should return the existing one
      const second = enumFromKeys('duplicate-id-from-keys', ['B'] as const);
      expect(second).toBe(first);
    });
  });

  describe('serialization', () => {
    it('JSON.stringify produces the expected key-value pairs', () => {
      const Status = enumFromKeys('status-json-from-keys', ['Active', 'Inactive'] as const);

      const json = JSON.stringify(Status);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({ Active: 'Active', Inactive: 'Inactive' });
    });

    it('Object.keys returns all keys', () => {
      const Keys = enumFromKeys('keys-from-keys', ['X', 'Y', 'Z'] as const);

      expect(Object.keys(Keys).sort()).toEqual(['X', 'Y', 'Z']);
    });

    it('Object.values returns all values (same as keys)', () => {
      const Values = enumFromKeys('values-from-keys', ['X', 'Y', 'Z'] as const);

      expect(Object.values(Values).sort()).toEqual(['X', 'Y', 'Z']);
    });
  });

  describe('type safety', () => {
    it('provides correct type inference with as const', () => {
      const Status = enumFromKeys('typed-status', ['Active', 'Inactive'] as const);
      
      // TypeScript should infer the correct literal types
      const active: 'Active' = Status.Active;
      const inactive: 'Inactive' = Status.Inactive;
      
      expect(active).toBe('Active');
      expect(inactive).toBe('Inactive');
    });
  });
});



describe('enumDiff', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('identifies keys only in the first enum', () => {
      const First = createBrandedEnum('first-diff-1', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const Second = createBrandedEnum('second-diff-1', {
        A: 'a',
        B: 'b',
      } as const);

      const diff = enumDiff(First, Second);

      expect(diff.onlyInFirst).toEqual([{ key: 'C', value: 'c' }]);
      expect(diff.onlyInSecond).toEqual([]);
    });

    it('identifies keys only in the second enum', () => {
      const First = createBrandedEnum('first-diff-2', {
        A: 'a',
      } as const);

      const Second = createBrandedEnum('second-diff-2', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const diff = enumDiff(First, Second);

      expect(diff.onlyInFirst).toEqual([]);
      expect(diff.onlyInSecond).toHaveLength(2);
      expect(diff.onlyInSecond).toContainEqual({ key: 'B', value: 'b' });
      expect(diff.onlyInSecond).toContainEqual({ key: 'C', value: 'c' });
    });

    it('identifies keys with different values', () => {
      const First = createBrandedEnum('first-diff-3', {
        Status: 'active',
        Mode: 'light',
      } as const);

      const Second = createBrandedEnum('second-diff-3', {
        Status: 'inactive',
        Mode: 'dark',
      } as const);

      const diff = enumDiff(First, Second);

      expect(diff.differentValues).toHaveLength(2);
      expect(diff.differentValues).toContainEqual({
        key: 'Status',
        firstValue: 'active',
        secondValue: 'inactive',
      });
      expect(diff.differentValues).toContainEqual({
        key: 'Mode',
        firstValue: 'light',
        secondValue: 'dark',
      });
      expect(diff.sameValues).toEqual([]);
    });

    it('identifies keys with same values', () => {
      const First = createBrandedEnum('first-diff-4', {
        A: 'a',
        B: 'b',
      } as const);

      const Second = createBrandedEnum('second-diff-4', {
        A: 'a',
        B: 'b',
      } as const);

      const diff = enumDiff(First, Second);

      expect(diff.onlyInFirst).toEqual([]);
      expect(diff.onlyInSecond).toEqual([]);
      expect(diff.differentValues).toEqual([]);
      expect(diff.sameValues).toHaveLength(2);
      expect(diff.sameValues).toContainEqual({ key: 'A', value: 'a' });
      expect(diff.sameValues).toContainEqual({ key: 'B', value: 'b' });
    });

    it('handles mixed differences correctly', () => {
      const StatusV1 = createBrandedEnum('status-v1', {
        Active: 'active',
        Inactive: 'inactive',
        Deprecated: 'deprecated',
      } as const);

      const StatusV2 = createBrandedEnum('status-v2', {
        Active: 'active',
        Inactive: 'disabled',
        Pending: 'pending',
      } as const);

      const diff = enumDiff(StatusV1, StatusV2);

      // Deprecated only in first
      expect(diff.onlyInFirst).toEqual([{ key: 'Deprecated', value: 'deprecated' }]);
      
      // Pending only in second
      expect(diff.onlyInSecond).toEqual([{ key: 'Pending', value: 'pending' }]);
      
      // Inactive has different values
      expect(diff.differentValues).toEqual([{
        key: 'Inactive',
        firstValue: 'inactive',
        secondValue: 'disabled',
      }]);
      
      // Active is the same
      expect(diff.sameValues).toEqual([{ key: 'Active', value: 'active' }]);
    });
  });

  describe('edge cases', () => {
    it('handles identical enums', () => {
      const First = createBrandedEnum('identical-1', {
        X: 'x',
        Y: 'y',
      } as const);

      const Second = createBrandedEnum('identical-2', {
        X: 'x',
        Y: 'y',
      } as const);

      const diff = enumDiff(First, Second);

      expect(diff.onlyInFirst).toEqual([]);
      expect(diff.onlyInSecond).toEqual([]);
      expect(diff.differentValues).toEqual([]);
      expect(diff.sameValues).toHaveLength(2);
    });

    it('handles completely different enums', () => {
      const First = createBrandedEnum('different-1', {
        A: 'a',
        B: 'b',
      } as const);

      const Second = createBrandedEnum('different-2', {
        X: 'x',
        Y: 'y',
      } as const);

      const diff = enumDiff(First, Second);

      expect(diff.onlyInFirst).toHaveLength(2);
      expect(diff.onlyInSecond).toHaveLength(2);
      expect(diff.differentValues).toEqual([]);
      expect(diff.sameValues).toEqual([]);
    });

    it('handles single-key enums', () => {
      const First = createBrandedEnum('single-1', {
        Only: 'only',
      } as const);

      const Second = createBrandedEnum('single-2', {
        Only: 'different',
      } as const);

      const diff = enumDiff(First, Second);

      expect(diff.onlyInFirst).toEqual([]);
      expect(diff.onlyInSecond).toEqual([]);
      expect(diff.differentValues).toEqual([{
        key: 'Only',
        firstValue: 'only',
        secondValue: 'different',
      }]);
      expect(diff.sameValues).toEqual([]);
    });

    it('handles comparing enum with itself', () => {
      const Enum = createBrandedEnum('self-compare', {
        A: 'a',
        B: 'b',
      } as const);

      const diff = enumDiff(Enum, Enum);

      expect(diff.onlyInFirst).toEqual([]);
      expect(diff.onlyInSecond).toEqual([]);
      expect(diff.differentValues).toEqual([]);
      expect(diff.sameValues).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('throws when first argument is not a branded enum', () => {
      const notAnEnum = { A: 'a' };
      const validEnum = createBrandedEnum('valid-for-error-1', { B: 'b' } as const);

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumDiff(notAnEnum, validEnum);
      }).toThrow('enumDiff requires branded enums as arguments');
    });

    it('throws when second argument is not a branded enum', () => {
      const validEnum = createBrandedEnum('valid-for-error-2', { A: 'a' } as const);
      const notAnEnum = { B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumDiff(validEnum, notAnEnum);
      }).toThrow('enumDiff requires branded enums as arguments');
    });

    it('throws when both arguments are not branded enums', () => {
      const notAnEnum1 = { A: 'a' };
      const notAnEnum2 = { B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enums
        enumDiff(notAnEnum1, notAnEnum2);
      }).toThrow('enumDiff requires branded enums as arguments');
    });
  });

  describe('use cases', () => {
    it('can detect if enums are identical', () => {
      const First = createBrandedEnum('use-case-1a', {
        A: 'a',
        B: 'b',
      } as const);

      const Second = createBrandedEnum('use-case-1b', {
        A: 'a',
        B: 'b',
      } as const);

      const diff = enumDiff(First, Second);
      const areIdentical =
        diff.onlyInFirst.length === 0 &&
        diff.onlyInSecond.length === 0 &&
        diff.differentValues.length === 0;

      expect(areIdentical).toBe(true);
    });

    it('can detect if enums have any differences', () => {
      const First = createBrandedEnum('use-case-2a', {
        A: 'a',
        B: 'b',
      } as const);

      const Second = createBrandedEnum('use-case-2b', {
        A: 'a',
        C: 'c',
      } as const);

      const diff = enumDiff(First, Second);
      const hasDifferences =
        diff.onlyInFirst.length > 0 ||
        diff.onlyInSecond.length > 0 ||
        diff.differentValues.length > 0;

      expect(hasDifferences).toBe(true);
    });

    it('can be used for migration analysis', () => {
      const OldVersion = createBrandedEnum('migration-old', {
        Active: 'active',
        Inactive: 'inactive',
        Deleted: 'deleted',
      } as const);

      const NewVersion = createBrandedEnum('migration-new', {
        Active: 'active',
        Inactive: 'disabled',
        Archived: 'archived',
      } as const);

      const diff = enumDiff(OldVersion, NewVersion);

      // Removed keys
      const removedKeys = diff.onlyInFirst.map((e) => e.key);
      expect(removedKeys).toContain('Deleted');

      // Added keys
      const addedKeys = diff.onlyInSecond.map((e) => e.key);
      expect(addedKeys).toContain('Archived');

      // Changed values
      const changedKeys = diff.differentValues.map((e) => e.key);
      expect(changedKeys).toContain('Inactive');
    });
  });
});


import { enumIntersect } from './advanced.js';

describe('enumIntersect', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('finds values shared between two enums', () => {
      const PrimaryColors = createBrandedEnum('primary-intersect', {
        Red: 'red',
        Blue: 'blue',
        Yellow: 'yellow',
      } as const);

      const WarmColors = createBrandedEnum('warm-intersect', {
        Red: 'red',
        Orange: 'orange',
        Yellow: 'yellow',
      } as const);

      const shared = enumIntersect(PrimaryColors, WarmColors);

      expect(shared).toHaveLength(2);
      expect(shared).toContainEqual({
        value: 'red',
        enumIds: ['primary-intersect', 'warm-intersect'],
      });
      expect(shared).toContainEqual({
        value: 'yellow',
        enumIds: ['primary-intersect', 'warm-intersect'],
      });
    });

    it('finds values shared across three or more enums', () => {
      const LibA = createBrandedEnum('lib-a-intersect', {
        Submit: 'submit',
        Cancel: 'cancel',
      } as const);

      const LibB = createBrandedEnum('lib-b-intersect', {
        Submit: 'submit',
        Reset: 'reset',
      } as const);

      const LibC = createBrandedEnum('lib-c-intersect', {
        Submit: 'submit',
        Clear: 'clear',
      } as const);

      const shared = enumIntersect(LibA, LibB, LibC);

      expect(shared).toHaveLength(1);
      expect(shared[0]).toEqual({
        value: 'submit',
        enumIds: ['lib-a-intersect', 'lib-b-intersect', 'lib-c-intersect'],
      });
    });

    it('returns empty array when no values are shared', () => {
      const EnumA = createBrandedEnum('enum-a-no-share', {
        A: 'a',
        B: 'b',
      } as const);

      const EnumB = createBrandedEnum('enum-b-no-share', {
        X: 'x',
        Y: 'y',
      } as const);

      const shared = enumIntersect(EnumA, EnumB);

      expect(shared).toEqual([]);
    });

    it('handles partial overlaps correctly', () => {
      const EnumA = createBrandedEnum('enum-a-partial', {
        Shared: 'shared',
        OnlyA: 'only-a',
      } as const);

      const EnumB = createBrandedEnum('enum-b-partial', {
        Shared: 'shared',
        OnlyB: 'only-b',
      } as const);

      const EnumC = createBrandedEnum('enum-c-partial', {
        OnlyC: 'only-c',
        Different: 'different',
      } as const);

      const shared = enumIntersect(EnumA, EnumB, EnumC);

      // Only 'shared' appears in multiple enums (A and B)
      expect(shared).toHaveLength(1);
      expect(shared[0]).toEqual({
        value: 'shared',
        enumIds: ['enum-a-partial', 'enum-b-partial'],
      });
    });
  });

  describe('result ordering', () => {
    it('sorts results by value', () => {
      const EnumA = createBrandedEnum('enum-a-order', {
        Z: 'zebra',
        A: 'apple',
        M: 'mango',
      } as const);

      const EnumB = createBrandedEnum('enum-b-order', {
        Z: 'zebra',
        A: 'apple',
        M: 'mango',
      } as const);

      const shared = enumIntersect(EnumA, EnumB);

      expect(shared.map(e => e.value)).toEqual(['apple', 'mango', 'zebra']);
    });

    it('sorts enum IDs within each entry', () => {
      const ZEnum = createBrandedEnum('z-enum-order', {
        Common: 'common',
      } as const);

      const AEnum = createBrandedEnum('a-enum-order', {
        Common: 'common',
      } as const);

      const MEnum = createBrandedEnum('m-enum-order', {
        Common: 'common',
      } as const);

      const shared = enumIntersect(ZEnum, AEnum, MEnum);

      expect(shared[0].enumIds).toEqual(['a-enum-order', 'm-enum-order', 'z-enum-order']);
    });
  });

  describe('edge cases', () => {
    it('handles enums with single values', () => {
      const SingleA = createBrandedEnum('single-a-intersect', {
        Only: 'only',
      } as const);

      const SingleB = createBrandedEnum('single-b-intersect', {
        Only: 'only',
      } as const);

      const shared = enumIntersect(SingleA, SingleB);

      expect(shared).toHaveLength(1);
      expect(shared[0]).toEqual({
        value: 'only',
        enumIds: ['single-a-intersect', 'single-b-intersect'],
      });
    });

    it('handles comparing enum with itself', () => {
      const Enum = createBrandedEnum('self-intersect', {
        A: 'a',
        B: 'b',
      } as const);

      const shared = enumIntersect(Enum, Enum);

      // When comparing an enum with itself, each value only appears in one unique enum
      // (the same enum counted once), so no values meet the "2+ enums" threshold
      expect(shared).toHaveLength(0);
    });

    it('handles many enums with complex overlaps', () => {
      const E1 = createBrandedEnum('e1-complex', { A: 'a', B: 'b' } as const);
      const E2 = createBrandedEnum('e2-complex', { B: 'b', C: 'c' } as const);
      const E3 = createBrandedEnum('e3-complex', { C: 'c', D: 'd' } as const);
      const E4 = createBrandedEnum('e4-complex', { A: 'a', D: 'd' } as const);

      const shared = enumIntersect(E1, E2, E3, E4);

      // 'a' in E1, E4
      // 'b' in E1, E2
      // 'c' in E2, E3
      // 'd' in E3, E4
      expect(shared).toHaveLength(4);
      expect(shared).toContainEqual({ value: 'a', enumIds: ['e1-complex', 'e4-complex'] });
      expect(shared).toContainEqual({ value: 'b', enumIds: ['e1-complex', 'e2-complex'] });
      expect(shared).toContainEqual({ value: 'c', enumIds: ['e2-complex', 'e3-complex'] });
      expect(shared).toContainEqual({ value: 'd', enumIds: ['e3-complex', 'e4-complex'] });
    });
  });

  describe('error handling', () => {
    it('throws when fewer than two enums are provided', () => {
      const SingleEnum = createBrandedEnum('single-error', { A: 'a' } as const);

      expect(() => {
        enumIntersect(SingleEnum);
      }).toThrow('enumIntersect requires at least two branded enums');
    });

    it('throws when no enums are provided', () => {
      expect(() => {
        enumIntersect();
      }).toThrow('enumIntersect requires at least two branded enums');
    });

    it('throws when first argument is not a branded enum', () => {
      const notAnEnum = { A: 'a' };
      const validEnum = createBrandedEnum('valid-intersect-1', { B: 'b' } as const);

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumIntersect(notAnEnum, validEnum);
      }).toThrow('enumIntersect requires all arguments to be branded enums');
    });

    it('throws when second argument is not a branded enum', () => {
      const validEnum = createBrandedEnum('valid-intersect-2', { A: 'a' } as const);
      const notAnEnum = { B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumIntersect(validEnum, notAnEnum);
      }).toThrow('enumIntersect requires all arguments to be branded enums');
    });

    it('throws when any argument in the middle is not a branded enum', () => {
      const validEnum1 = createBrandedEnum('valid-intersect-3', { A: 'a' } as const);
      const validEnum2 = createBrandedEnum('valid-intersect-4', { B: 'b' } as const);
      const notAnEnum = { C: 'c' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumIntersect(validEnum1, notAnEnum, validEnum2);
      }).toThrow('enumIntersect requires all arguments to be branded enums');
    });
  });

  describe('use cases', () => {
    it('can detect i18n key collisions', () => {
      const AppKeys = createBrandedEnum('app-keys', {
        Submit: 'submit',
        Cancel: 'cancel',
        Save: 'save',
      } as const);

      const LibraryKeys = createBrandedEnum('library-keys', {
        Submit: 'submit',
        Reset: 'reset',
        Clear: 'clear',
      } as const);

      const collisions = enumIntersect(AppKeys, LibraryKeys);

      expect(collisions).toHaveLength(1);
      expect(collisions[0].value).toBe('submit');
    });

    it('can check if enums have any overlap', () => {
      const EnumA = createBrandedEnum('check-overlap-a', {
        Unique1: 'unique1',
        Unique2: 'unique2',
      } as const);

      const EnumB = createBrandedEnum('check-overlap-b', {
        Unique3: 'unique3',
        Unique4: 'unique4',
      } as const);

      const shared = enumIntersect(EnumA, EnumB);
      const hasOverlap = shared.length > 0;

      expect(hasOverlap).toBe(false);
    });

    it('can find common values for refactoring', () => {
      const UserStatus = createBrandedEnum('user-status-refactor', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      const OrderStatus = createBrandedEnum('order-status-refactor', {
        Active: 'active',
        Completed: 'completed',
        Pending: 'pending',
      } as const);

      const commonValues = enumIntersect(UserStatus, OrderStatus);

      // These could potentially be extracted to a shared enum
      expect(commonValues.map(e => e.value).sort()).toEqual(['active', 'pending']);
    });
  });
});


describe('enumToRecord', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('converts a branded enum to a plain Record', () => {
      const Status = createBrandedEnum('status-to-record', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      const record = enumToRecord(Status);

      expect(record).toEqual({
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      });
    });

    it('returns a new object, not the original enum', () => {
      const Colors = createBrandedEnum('colors-to-record', {
        Red: 'red',
        Green: 'green',
      } as const);

      const record = enumToRecord(Colors);

      expect(record).not.toBe(Colors);
    });

    it('works with a single-key enum', () => {
      const Single = createBrandedEnum('single-to-record', {
        Only: 'only',
      } as const);

      const record = enumToRecord(Single);

      expect(record).toEqual({ Only: 'only' });
    });

    it('works with many keys', () => {
      const ManyKeys = createBrandedEnum('many-to-record', {
        A: 'a',
        B: 'b',
        C: 'c',
        D: 'd',
        E: 'e',
      } as const);

      const record = enumToRecord(ManyKeys);

      expect(record).toEqual({
        A: 'a',
        B: 'b',
        C: 'c',
        D: 'd',
        E: 'e',
      });
    });
  });

  describe('metadata stripping', () => {
    it('does not include ENUM_ID in the result', () => {
      const Source = createBrandedEnum('source-no-id', {
        Key: 'value',
      } as const);

      const record = enumToRecord(Source);

      expect(ENUM_ID in record).toBe(false);
      expect(Object.getOwnPropertySymbols(record)).toEqual([]);
    });

    it('does not include ENUM_VALUES in the result', () => {
      const Source = createBrandedEnum('source-no-values', {
        Key: 'value',
      } as const);

      const record = enumToRecord(Source);

      expect(ENUM_VALUES in record).toBe(false);
      expect(Object.getOwnPropertySymbols(record)).toEqual([]);
    });

    it('result is a plain object without Symbol properties', () => {
      const Source = createBrandedEnum('source-plain', {
        A: 'a',
        B: 'b',
      } as const);

      const record = enumToRecord(Source);

      // Should have no Symbol properties
      expect(Object.getOwnPropertySymbols(record)).toEqual([]);
      
      // Should only have the string keys
      expect(Object.keys(record).sort()).toEqual(['A', 'B']);
    });
  });

  describe('result properties', () => {
    it('result is not frozen (unlike the source enum)', () => {
      const Source = createBrandedEnum('source-not-frozen', {
        Key: 'value',
      } as const);

      expect(Object.isFrozen(Source)).toBe(true);

      const record = enumToRecord(Source);

      expect(Object.isFrozen(record)).toBe(false);
    });

    it('result can be modified', () => {
      const Source = createBrandedEnum('source-modifiable', {
        Key: 'value',
      } as const);

      const record = enumToRecord(Source);

      // Should be able to modify the result
      record['NewKey'] = 'newValue';
      expect(record['NewKey']).toBe('newValue');

      // Original enum should be unchanged
      expect('NewKey' in Source).toBe(false);
    });
  });

  describe('serialization equivalence', () => {
    it('JSON.stringify produces the same result as the original enum', () => {
      const Source = createBrandedEnum('source-json-equiv', {
        A: 'a',
        B: 'b',
        C: 'c',
      } as const);

      const record = enumToRecord(Source);

      expect(JSON.stringify(record)).toBe(JSON.stringify(Source));
    });

    it('result equals JSON.parse(JSON.stringify(enum))', () => {
      const Source = createBrandedEnum('source-roundtrip', {
        X: 'x',
        Y: 'y',
      } as const);

      const record = enumToRecord(Source);
      const parsed = JSON.parse(JSON.stringify(Source));

      expect(record).toEqual(parsed);
    });
  });

  describe('error handling', () => {
    it('throws when argument is not a branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumToRecord(notAnEnum);
      }).toThrow('enumToRecord requires a branded enum');
    });

    it('throws when argument is null', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing null
        enumToRecord(null);
      }).toThrow('enumToRecord requires a branded enum');
    });

    it('throws when argument is undefined', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing undefined
        enumToRecord(undefined);
      }).toThrow('enumToRecord requires a branded enum');
    });

    it('throws when argument is a primitive', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing string
        enumToRecord('not an enum');
      }).toThrow('enumToRecord requires a branded enum');
    });
  });

  describe('use cases', () => {
    it('can be used for API payloads', () => {
      const Config = createBrandedEnum('config-api', {
        Theme: 'dark',
        Language: 'en',
      } as const);

      const payload = {
        settings: enumToRecord(Config),
      };

      expect(payload).toEqual({
        settings: {
          Theme: 'dark',
          Language: 'en',
        },
      });
    });

    it('can be spread into other objects', () => {
      const Defaults = createBrandedEnum('defaults-spread', {
        Color: 'blue',
        Size: 'medium',
      } as const);

      const record = enumToRecord(Defaults);
      const combined = { ...record, Extra: 'extra' };

      expect(combined).toEqual({
        Color: 'blue',
        Size: 'medium',
        Extra: 'extra',
      });
    });
  });
});


import { watchEnum, watchAllEnums, clearAllEnumWatchers, getEnumWatcherCount, getGlobalWatcherCount, EnumAccessEvent } from './advanced.js';

describe('watchEnum', () => {
  beforeEach(() => {
    clearRegistry();
    clearAllEnumWatchers();
  });

  afterEach(() => {
    clearAllEnumWatchers();
  });

  describe('basic functionality', () => {
    it('triggers callback when accessing enum values', () => {
      const Status = createBrandedEnum('status-watch', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const events: EnumAccessEvent[] = [];
      const { watched } = watchEnum(Status, (event) => {
        events.push(event);
      });

      // Access a value
      const value = watched.Active;

      expect(value).toBe('active');
      expect(events.length).toBe(1);
      expect(events[0].enumId).toBe('status-watch');
      expect(events[0].accessType).toBe('get');
      expect(events[0].key).toBe('Active');
      expect(events[0].value).toBe('active');
      expect(typeof events[0].timestamp).toBe('number');
    });

    it('triggers callback for multiple accesses', () => {
      const Colors = createBrandedEnum('colors-watch', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
      } as const);

      const events: EnumAccessEvent[] = [];
      const { watched } = watchEnum(Colors, (event) => {
        events.push(event);
      });

      watched.Red;
      watched.Green;
      watched.Blue;

      expect(events.length).toBe(3);
      expect(events[0].key).toBe('Red');
      expect(events[1].key).toBe('Green');
      expect(events[2].key).toBe('Blue');
    });

    it('preserves original enum values', () => {
      const Sizes = createBrandedEnum('sizes-watch', {
        Small: 'small',
        Medium: 'medium',
        Large: 'large',
      } as const);

      const { watched } = watchEnum(Sizes, () => {});

      expect(watched.Small).toBe('small');
      expect(watched.Medium).toBe('medium');
      expect(watched.Large).toBe('large');
    });

    it('preserves enum metadata', () => {
      const Status = createBrandedEnum('status-meta-watch', {
        Active: 'active',
      } as const);

      const { watched } = watchEnum(Status, () => {});

      expect(watched[ENUM_ID]).toBe('status-meta-watch');
      expect(watched[ENUM_VALUES].has('active')).toBe(true);
    });
  });

  describe('unwatch functionality', () => {
    it('stops triggering callback after unwatch is called', () => {
      const Status = createBrandedEnum('status-unwatch', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const events: EnumAccessEvent[] = [];
      const { watched, unwatch } = watchEnum(Status, (event) => {
        events.push(event);
      });

      watched.Active;
      expect(events.length).toBe(1);

      unwatch();

      watched.Inactive;
      expect(events.length).toBe(1); // No new events
    });

    it('removes watcher from registry after unwatch', () => {
      const Status = createBrandedEnum('status-unwatch-registry', {
        Active: 'active',
      } as const);

      const { unwatch } = watchEnum(Status, () => {});

      expect(getEnumWatcherCount('status-unwatch-registry')).toBe(1);

      unwatch();

      expect(getEnumWatcherCount('status-unwatch-registry')).toBe(0);
    });
  });

  describe('has operation', () => {
    it('triggers callback for "in" operator', () => {
      const Status = createBrandedEnum('status-has', {
        Active: 'active',
      } as const);

      const events: EnumAccessEvent[] = [];
      const { watched } = watchEnum(Status, (event) => {
        events.push(event);
      });

      const hasActive = 'Active' in watched;

      expect(hasActive).toBe(true);
      expect(events.length).toBe(1);
      expect(events[0].accessType).toBe('has');
      expect(events[0].key).toBe('Active');
    });
  });

  describe('keys operation', () => {
    it('triggers callback for Object.keys()', () => {
      const Status = createBrandedEnum('status-keys', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const events: EnumAccessEvent[] = [];
      const { watched } = watchEnum(Status, (event) => {
        events.push(event);
      });

      const keys = Object.keys(watched);

      expect(keys.sort()).toEqual(['Active', 'Inactive']);
      // Object.keys triggers ownKeys trap
      const keysEvents = events.filter(e => e.accessType === 'keys');
      expect(keysEvents.length).toBe(1);
    });
  });

  describe('multiple watchers', () => {
    it('supports multiple watchers on the same enum', () => {
      const Status = createBrandedEnum('status-multi', {
        Active: 'active',
      } as const);

      const events1: EnumAccessEvent[] = [];
      const events2: EnumAccessEvent[] = [];

      const { watched: watched1 } = watchEnum(Status, (event) => {
        events1.push(event);
      });

      const { watched: watched2 } = watchEnum(Status, (event) => {
        events2.push(event);
      });

      watched1.Active;
      watched2.Active;

      // Each watcher only receives events from its own proxy
      expect(events1.length).toBe(1);
      expect(events2.length).toBe(1);
    });

    it('tracks watcher count correctly', () => {
      const Status = createBrandedEnum('status-count', {
        Active: 'active',
      } as const);

      expect(getEnumWatcherCount('status-count')).toBe(0);

      const { unwatch: unwatch1 } = watchEnum(Status, () => {});
      expect(getEnumWatcherCount('status-count')).toBe(1);

      const { unwatch: unwatch2 } = watchEnum(Status, () => {});
      expect(getEnumWatcherCount('status-count')).toBe(2);

      unwatch1();
      expect(getEnumWatcherCount('status-count')).toBe(1);

      unwatch2();
      expect(getEnumWatcherCount('status-count')).toBe(0);
    });
  });

  describe('error handling', () => {
    it('throws when argument is not a branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        watchEnum(notAnEnum, () => {});
      }).toThrow('watchEnum requires a branded enum');
    });

    it('throws when argument is null', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing null
        watchEnum(null, () => {});
      }).toThrow('watchEnum requires a branded enum');
    });

    it('throws when argument is undefined', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing undefined
        watchEnum(undefined, () => {});
      }).toThrow('watchEnum requires a branded enum');
    });
  });
});


describe('watchAllEnums', () => {
  beforeEach(() => {
    clearRegistry();
    clearAllEnumWatchers();
  });

  afterEach(() => {
    clearAllEnumWatchers();
  });

  it('receives events from all watched enums', () => {
    const Status = createBrandedEnum('status-global', {
      Active: 'active',
    } as const);

    const Colors = createBrandedEnum('colors-global', {
      Red: 'red',
    } as const);

    const globalEvents: EnumAccessEvent[] = [];
    watchAllEnums((event) => {
      globalEvents.push(event);
    });

    const { watched: watchedStatus } = watchEnum(Status, () => {});
    const { watched: watchedColors } = watchEnum(Colors, () => {});

    watchedStatus.Active;
    watchedColors.Red;

    expect(globalEvents.length).toBe(2);
    expect(globalEvents[0].enumId).toBe('status-global');
    expect(globalEvents[1].enumId).toBe('colors-global');
  });

  it('can be unregistered', () => {
    const Status = createBrandedEnum('status-global-unreg', {
      Active: 'active',
    } as const);

    const globalEvents: EnumAccessEvent[] = [];
    const unregister = watchAllEnums((event) => {
      globalEvents.push(event);
    });

    const { watched } = watchEnum(Status, () => {});

    watched.Active;
    expect(globalEvents.length).toBe(1);

    unregister();

    watched.Active;
    expect(globalEvents.length).toBe(1); // No new events
  });

  it('tracks global watcher count', () => {
    expect(getGlobalWatcherCount()).toBe(0);

    const unreg1 = watchAllEnums(() => {});
    expect(getGlobalWatcherCount()).toBe(1);

    const unreg2 = watchAllEnums(() => {});
    expect(getGlobalWatcherCount()).toBe(2);

    unreg1();
    expect(getGlobalWatcherCount()).toBe(1);

    unreg2();
    expect(getGlobalWatcherCount()).toBe(0);
  });
});


describe('clearAllEnumWatchers', () => {
  beforeEach(() => {
    clearRegistry();
    clearAllEnumWatchers();
  });

  it('clears all specific watchers', () => {
    const Status = createBrandedEnum('status-clear', {
      Active: 'active',
    } as const);

    watchEnum(Status, () => {});
    watchEnum(Status, () => {});

    expect(getEnumWatcherCount('status-clear')).toBe(2);

    clearAllEnumWatchers();

    expect(getEnumWatcherCount('status-clear')).toBe(0);
  });

  it('clears all global watchers', () => {
    watchAllEnums(() => {});
    watchAllEnums(() => {});

    expect(getGlobalWatcherCount()).toBe(2);

    clearAllEnumWatchers();

    expect(getGlobalWatcherCount()).toBe(0);
  });
});


import { exhaustive, exhaustiveGuard } from './advanced.js';

describe('exhaustive', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('throws an error when called', () => {
      // We need to cast to never to simulate what happens at runtime
      // when TypeScript's exhaustiveness check is bypassed
      expect(() => {
        exhaustive('unexpected' as never);
      }).toThrow('Exhaustive check failed: unexpected value "unexpected"');
    });

    it('includes the value in the error message', () => {
      expect(() => {
        exhaustive('some-value' as never);
      }).toThrow('some-value');
    });

    it('uses custom message when provided', () => {
      expect(() => {
        exhaustive('value' as never, 'Custom error message');
      }).toThrow('Custom error message');
    });

    it('handles numeric values', () => {
      expect(() => {
        exhaustive(42 as never);
      }).toThrow('Exhaustive check failed: unexpected value "42"');
    });

    it('handles object values', () => {
      expect(() => {
        exhaustive({ key: 'value' } as never);
      }).toThrow('Exhaustive check failed: unexpected value "[object Object]"');
    });

    it('handles null values', () => {
      expect(() => {
        exhaustive(null as never);
      }).toThrow('Exhaustive check failed: unexpected value "null"');
    });

    it('handles undefined values', () => {
      expect(() => {
        exhaustive(undefined as never);
      }).toThrow('Exhaustive check failed: unexpected value "undefined"');
    });
  });

  describe('switch statement usage', () => {
    it('works in a switch statement with branded enum', () => {
      const Status = createBrandedEnum('status-exhaustive', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      type StatusValue = typeof Status[keyof typeof Status];

      function handleStatus(status: StatusValue): string {
        switch (status) {
          case Status.Active:
            return 'active-result';
          case Status.Inactive:
            return 'inactive-result';
          default:
            return exhaustive(status);
        }
      }

      expect(handleStatus(Status.Active)).toBe('active-result');
      expect(handleStatus(Status.Inactive)).toBe('inactive-result');
    });

    it('throws when switch is not exhaustive at runtime', () => {
      const Status = createBrandedEnum('status-exhaustive-2', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      // Simulate a function that doesn't handle all cases
      // (in real code, TypeScript would catch this at compile time)
      function incompleteHandler(status: string): string {
        switch (status) {
          case 'active':
            return 'active-result';
          case 'inactive':
            return 'inactive-result';
          default:
            return exhaustive(status as never);
        }
      }

      expect(incompleteHandler('active')).toBe('active-result');
      expect(() => incompleteHandler('pending')).toThrow(
        'Exhaustive check failed: unexpected value "pending"'
      );
    });
  });
});


describe('exhaustiveGuard', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('returns a function that throws with enum ID in message', () => {
      const Status = createBrandedEnum('status-guard', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const guard = exhaustiveGuard(Status);

      expect(() => {
        guard('unexpected' as never);
      }).toThrow('Exhaustive check failed for enum "status-guard": unexpected value "unexpected"');
    });

    it('includes the enum ID in the error message', () => {
      const Colors = createBrandedEnum('colors-guard', {
        Red: 'red',
        Blue: 'blue',
      } as const);

      const guard = exhaustiveGuard(Colors);

      expect(() => {
        guard('green' as never);
      }).toThrow('colors-guard');
    });

    it('includes the unexpected value in the error message', () => {
      const Sizes = createBrandedEnum('sizes-guard', {
        Small: 'small',
        Large: 'large',
      } as const);

      const guard = exhaustiveGuard(Sizes);

      expect(() => {
        guard('medium' as never);
      }).toThrow('medium');
    });
  });

  describe('error handling', () => {
    it('throws when called with non-branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        exhaustiveGuard(notAnEnum);
      }).toThrow('exhaustiveGuard requires a branded enum');
    });

    it('throws when called with null', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing null
        exhaustiveGuard(null);
      }).toThrow('exhaustiveGuard requires a branded enum');
    });

    it('throws when called with undefined', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing undefined
        exhaustiveGuard(undefined);
      }).toThrow('exhaustiveGuard requires a branded enum');
    });
  });

  describe('switch statement usage', () => {
    it('works in a switch statement with branded enum', () => {
      const Priority = createBrandedEnum('priority-guard', {
        High: 'high',
        Medium: 'medium',
        Low: 'low',
      } as const);

      type PriorityValue = typeof Priority[keyof typeof Priority];
      const assertPriorityExhaustive = exhaustiveGuard(Priority);

      function handlePriority(priority: PriorityValue): number {
        switch (priority) {
          case Priority.High:
            return 3;
          case Priority.Medium:
            return 2;
          case Priority.Low:
            return 1;
          default:
            return assertPriorityExhaustive(priority);
        }
      }

      expect(handlePriority(Priority.High)).toBe(3);
      expect(handlePriority(Priority.Medium)).toBe(2);
      expect(handlePriority(Priority.Low)).toBe(1);
    });

    it('throws when switch is not exhaustive at runtime', () => {
      const Level = createBrandedEnum('level-guard', {
        Debug: 'debug',
        Info: 'info',
        Error: 'error',
      } as const);

      const assertLevelExhaustive = exhaustiveGuard(Level);

      // Simulate a function that doesn't handle all cases
      function incompleteHandler(level: string): string {
        switch (level) {
          case 'debug':
            return 'debug-result';
          case 'info':
            return 'info-result';
          default:
            return assertLevelExhaustive(level as never);
        }
      }

      expect(incompleteHandler('debug')).toBe('debug-result');
      expect(incompleteHandler('info')).toBe('info-result');
      expect(() => incompleteHandler('error')).toThrow(
        'Exhaustive check failed for enum "level-guard": unexpected value "error"'
      );
    });

    it('can be used inline without storing the guard', () => {
      const Mode = createBrandedEnum('mode-guard', {
        Read: 'read',
        Write: 'write',
      } as const);

      type ModeValue = typeof Mode[keyof typeof Mode];

      function handleMode(mode: ModeValue): string {
        switch (mode) {
          case Mode.Read:
            return 'reading';
          case Mode.Write:
            return 'writing';
          default:
            return exhaustiveGuard(Mode)(mode);
        }
      }

      expect(handleMode(Mode.Read)).toBe('reading');
      expect(handleMode(Mode.Write)).toBe('writing');
    });
  });

  describe('guard reusability', () => {
    it('can be stored and reused across multiple functions', () => {
      const State = createBrandedEnum('state-guard', {
        Initial: 'initial',
        Loading: 'loading',
        Ready: 'ready',
      } as const);

      type StateValue = typeof State[keyof typeof State];
      const assertStateExhaustive = exhaustiveGuard(State);

      function getStateLabel(state: StateValue): string {
        switch (state) {
          case State.Initial:
            return 'Not started';
          case State.Loading:
            return 'In progress';
          case State.Ready:
            return 'Complete';
          default:
            return assertStateExhaustive(state);
        }
      }

      function getStateColor(state: StateValue): string {
        switch (state) {
          case State.Initial:
            return 'gray';
          case State.Loading:
            return 'yellow';
          case State.Ready:
            return 'green';
          default:
            return assertStateExhaustive(state);
        }
      }

      expect(getStateLabel(State.Initial)).toBe('Not started');
      expect(getStateColor(State.Ready)).toBe('green');
    });
  });
});


describe('toJsonSchema', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('generates a valid JSON Schema with default options', () => {
      const Status = createBrandedEnum('status-schema', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      const schema = toJsonSchema(Status);

      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(schema.title).toBe('status-schema');
      expect(schema.description).toBe('Enum values for status-schema');
      expect(schema.type).toBe('string');
      expect(schema.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('includes all enum values in the enum constraint', () => {
      const Colors = createBrandedEnum('colors-schema', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
        Yellow: 'yellow',
      } as const);

      const schema = toJsonSchema(Colors);

      expect(schema.enum).toHaveLength(4);
      expect(schema.enum).toContain('red');
      expect(schema.enum).toContain('green');
      expect(schema.enum).toContain('blue');
      expect(schema.enum).toContain('yellow');
    });

    it('sorts enum values alphabetically', () => {
      const Unsorted = createBrandedEnum('unsorted-schema', {
        Zebra: 'zebra',
        Apple: 'apple',
        Mango: 'mango',
      } as const);

      const schema = toJsonSchema(Unsorted);

      expect(schema.enum).toEqual(['apple', 'mango', 'zebra']);
    });

    it('works with single-value enum', () => {
      const Single = createBrandedEnum('single-schema', {
        Only: 'only',
      } as const);

      const schema = toJsonSchema(Single);

      expect(schema.enum).toEqual(['only']);
    });
  });

  describe('custom options', () => {
    it('uses custom title when provided', () => {
      const Priority = createBrandedEnum('priority-schema', {
        High: 'high',
        Low: 'low',
      } as const);

      const schema = toJsonSchema(Priority, { title: 'Task Priority' });

      expect(schema.title).toBe('Task Priority');
    });

    it('uses custom description when provided', () => {
      const Priority = createBrandedEnum('priority-schema-2', {
        High: 'high',
        Low: 'low',
      } as const);

      const schema = toJsonSchema(Priority, { description: 'The priority level of a task' });

      expect(schema.description).toBe('The priority level of a task');
    });

    it('excludes $schema when includeSchema is false', () => {
      const Status = createBrandedEnum('status-no-schema', {
        Active: 'active',
      } as const);

      const schema = toJsonSchema(Status, { includeSchema: false });

      expect(schema.$schema).toBeUndefined();
      expect(schema.title).toBe('status-no-schema');
      expect(schema.type).toBe('string');
    });

    it('uses draft-04 schema version', () => {
      const Status = createBrandedEnum('status-draft-04', {
        Active: 'active',
      } as const);

      const schema = toJsonSchema(Status, { schemaVersion: 'draft-04' });

      expect(schema.$schema).toBe('http://json-schema.org/draft-04/schema#');
    });

    it('uses draft-06 schema version', () => {
      const Status = createBrandedEnum('status-draft-06', {
        Active: 'active',
      } as const);

      const schema = toJsonSchema(Status, { schemaVersion: 'draft-06' });

      expect(schema.$schema).toBe('http://json-schema.org/draft-06/schema#');
    });

    it('uses 2019-09 schema version', () => {
      const Status = createBrandedEnum('status-2019-09', {
        Active: 'active',
      } as const);

      const schema = toJsonSchema(Status, { schemaVersion: '2019-09' });

      expect(schema.$schema).toBe('https://json-schema.org/draft/2019-09/schema');
    });

    it('uses 2020-12 schema version', () => {
      const Status = createBrandedEnum('status-2020-12', {
        Active: 'active',
      } as const);

      const schema = toJsonSchema(Status, { schemaVersion: '2020-12' });

      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    });

    it('combines multiple custom options', () => {
      const Status = createBrandedEnum('status-combined', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const schema = toJsonSchema(Status, {
        title: 'User Status',
        description: 'The current status of a user account',
        schemaVersion: '2020-12',
      });

      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(schema.title).toBe('User Status');
      expect(schema.description).toBe('The current status of a user account');
      expect(schema.type).toBe('string');
      expect(schema.enum).toEqual(['active', 'inactive']);
    });
  });

  describe('error handling', () => {
    it('throws when input is not a branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        toJsonSchema(notAnEnum);
      }).toThrow('toJsonSchema requires a branded enum');
    });

    it('throws for null input', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing null
        toJsonSchema(null);
      }).toThrow('toJsonSchema requires a branded enum');
    });

    it('throws for undefined input', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing undefined
        toJsonSchema(undefined);
      }).toThrow('toJsonSchema requires a branded enum');
    });

    it('throws for primitive input', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing string
        toJsonSchema('not-an-enum');
      }).toThrow('toJsonSchema requires a branded enum');
    });
  });

  describe('schema structure', () => {
    it('always sets type to string', () => {
      const Enum = createBrandedEnum('type-test', {
        A: 'a',
      } as const);

      const schema = toJsonSchema(Enum);

      expect(schema.type).toBe('string');
    });

    it('produces a schema that can be serialized to JSON', () => {
      const Status = createBrandedEnum('serializable-schema', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const schema = toJsonSchema(Status);
      const json = JSON.stringify(schema);
      const parsed = JSON.parse(json);

      expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(parsed.title).toBe('serializable-schema');
      expect(parsed.type).toBe('string');
      expect(parsed.enum).toEqual(['active', 'inactive']);
    });

    it('produces immutable enum array', () => {
      const Status = createBrandedEnum('immutable-schema', {
        Active: 'active',
      } as const);

      const schema = toJsonSchema(Status);

      // The enum array should be a new array each time
      const schema2 = toJsonSchema(Status, { includeSchema: false });
      expect(schema.enum).not.toBe(schema2.enum);
    });
  });

  describe('integration scenarios', () => {
    it('can be embedded in a larger schema', () => {
      const Status = createBrandedEnum('embeddable-status', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const statusSchema = toJsonSchema(Status, { includeSchema: false });

      const userSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          status: statusSchema,
        },
        required: ['name', 'status'],
      };

      expect(userSchema.properties.status.type).toBe('string');
      expect(userSchema.properties.status.enum).toEqual(['active', 'inactive']);
    });

    it('can generate schemas for multiple enums', () => {
      const Status = createBrandedEnum('multi-status', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const Priority = createBrandedEnum('multi-priority', {
        High: 'high',
        Low: 'low',
      } as const);

      const schemas = {
        Status: toJsonSchema(Status),
        Priority: toJsonSchema(Priority),
      };

      expect(schemas.Status.title).toBe('multi-status');
      expect(schemas.Priority.title).toBe('multi-priority');
      expect(schemas.Status.enum).toEqual(['active', 'inactive']);
      expect(schemas.Priority.enum).toEqual(['high', 'low']);
    });
  });
});


describe('toZodSchema', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('generates a valid Zod schema definition with default options', () => {
      const Status = createBrandedEnum('status-zod', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      const schemaDef = toZodSchema(Status);

      expect(schemaDef.typeName).toBe('ZodEnum');
      expect(schemaDef.enumId).toBe('status-zod');
      expect(schemaDef.values).toEqual(['active', 'inactive', 'pending']);
      expect(schemaDef.description).toBeUndefined();
    });

    it('includes all enum values in the values array', () => {
      const Colors = createBrandedEnum('colors-zod', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
        Yellow: 'yellow',
      } as const);

      const schemaDef = toZodSchema(Colors);

      expect(schemaDef.values).toHaveLength(4);
      expect(schemaDef.values).toContain('red');
      expect(schemaDef.values).toContain('green');
      expect(schemaDef.values).toContain('blue');
      expect(schemaDef.values).toContain('yellow');
    });

    it('sorts values alphabetically', () => {
      const Unsorted = createBrandedEnum('unsorted-zod', {
        Zebra: 'zebra',
        Apple: 'apple',
        Mango: 'mango',
      } as const);

      const schemaDef = toZodSchema(Unsorted);

      expect(schemaDef.values).toEqual(['apple', 'mango', 'zebra']);
    });

    it('works with single-value enum', () => {
      const Single = createBrandedEnum('single-zod', {
        Only: 'only',
      } as const);

      const schemaDef = toZodSchema(Single);

      expect(schemaDef.values).toEqual(['only']);
    });
  });

  describe('custom options', () => {
    it('includes description when provided', () => {
      const Priority = createBrandedEnum('priority-zod', {
        High: 'high',
        Low: 'low',
      } as const);

      const schemaDef = toZodSchema(Priority, { description: 'Task priority level' });

      expect(schemaDef.description).toBe('Task priority level');
    });

    it('omits description when not provided', () => {
      const Status = createBrandedEnum('status-no-desc-zod', {
        Active: 'active',
      } as const);

      const schemaDef = toZodSchema(Status);

      expect(schemaDef.description).toBeUndefined();
    });

    it('includes empty string description when explicitly provided', () => {
      const Status = createBrandedEnum('status-empty-desc-zod', {
        Active: 'active',
      } as const);

      const schemaDef = toZodSchema(Status, { description: '' });

      expect(schemaDef.description).toBe('');
    });
  });

  describe('error handling', () => {
    it('throws when input is not a branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        toZodSchema(notAnEnum);
      }).toThrow('toZodSchema requires a branded enum');
    });

    it('throws for null input', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing null
        toZodSchema(null);
      }).toThrow('toZodSchema requires a branded enum');
    });

    it('throws for undefined input', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing undefined
        toZodSchema(undefined);
      }).toThrow('toZodSchema requires a branded enum');
    });

    it('throws for primitive input', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing string
        toZodSchema('not-an-enum');
      }).toThrow('toZodSchema requires a branded enum');
    });
  });

  describe('schema definition structure', () => {
    it('always sets typeName to ZodEnum', () => {
      const Enum = createBrandedEnum('type-test-zod', {
        A: 'a',
      } as const);

      const schemaDef = toZodSchema(Enum);

      expect(schemaDef.typeName).toBe('ZodEnum');
    });

    it('includes the enumId from the branded enum', () => {
      const Status = createBrandedEnum('my-custom-enum-id', {
        Active: 'active',
      } as const);

      const schemaDef = toZodSchema(Status);

      expect(schemaDef.enumId).toBe('my-custom-enum-id');
    });

    it('produces a definition that can be serialized to JSON', () => {
      const Status = createBrandedEnum('serializable-zod', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const schemaDef = toZodSchema(Status);
      const json = JSON.stringify(schemaDef);
      const parsed = JSON.parse(json);

      expect(parsed.typeName).toBe('ZodEnum');
      expect(parsed.enumId).toBe('serializable-zod');
      expect(parsed.values).toEqual(['active', 'inactive']);
    });

    it('produces a new values array each time', () => {
      const Status = createBrandedEnum('immutable-zod', {
        Active: 'active',
      } as const);

      const schemaDef1 = toZodSchema(Status);
      const schemaDef2 = toZodSchema(Status);

      expect(schemaDef1.values).not.toBe(schemaDef2.values);
      expect(schemaDef1.values).toEqual(schemaDef2.values);
    });
  });

  describe('integration scenarios', () => {
    it('can generate schema definitions for multiple enums', () => {
      const Status = createBrandedEnum('multi-status-zod', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const Priority = createBrandedEnum('multi-priority-zod', {
        High: 'high',
        Low: 'low',
      } as const);

      const schemas = {
        Status: toZodSchema(Status),
        Priority: toZodSchema(Priority),
      };

      expect(schemas.Status.enumId).toBe('multi-status-zod');
      expect(schemas.Priority.enumId).toBe('multi-priority-zod');
      expect(schemas.Status.values).toEqual(['active', 'inactive']);
      expect(schemas.Priority.values).toEqual(['high', 'low']);
    });

    it('values array is compatible with Zod z.enum() requirements (non-empty tuple)', () => {
      const Status = createBrandedEnum('zod-compatible', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const schemaDef = toZodSchema(Status);

      // Zod's z.enum() requires at least one value
      expect(schemaDef.values.length).toBeGreaterThan(0);
      // Values should be strings
      expect(schemaDef.values.every(v => typeof v === 'string')).toBe(true);
    });

    it('can be used to construct validation logic', () => {
      const Status = createBrandedEnum('validation-zod', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      const schemaDef = toZodSchema(Status);

      // Simulate what a user would do with Zod
      const isValid = (value: unknown): boolean => {
        return typeof value === 'string' && schemaDef.values.includes(value);
      };

      expect(isValid('active')).toBe(true);
      expect(isValid('inactive')).toBe(true);
      expect(isValid('pending')).toBe(true);
      expect(isValid('unknown')).toBe(false);
      expect(isValid(123)).toBe(false);
      expect(isValid(null)).toBe(false);
    });
  });
});


import { enumSerializer } from './advanced.js';

describe('enumSerializer', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('basic functionality', () => {
    it('creates a serializer for a branded enum', () => {
      const Status = createBrandedEnum('status-serializer', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const serializer = enumSerializer(Status);

      expect(serializer.enumObj).toBe(Status);
      expect(serializer.enumId).toBe('status-serializer');
    });

    it('serializes enum values without transformation', () => {
      const Status = createBrandedEnum('status-serialize-basic', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const serializer = enumSerializer(Status);

      expect(serializer.serialize(Status.Active)).toBe('active');
      expect(serializer.serialize(Status.Inactive)).toBe('inactive');
    });

    it('deserializes valid values successfully', () => {
      const Status = createBrandedEnum('status-deserialize-basic', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const serializer = enumSerializer(Status);

      const result = serializer.deserialize('active');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('active');
      }
    });

    it('deserialize returns failure for invalid values', () => {
      const Status = createBrandedEnum('status-deserialize-invalid', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const serializer = enumSerializer(Status);

      const result = serializer.deserialize('unknown');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('unknown');
        expect(result.error.message).toContain('status-deserialize-invalid');
        expect(result.error.input).toBe('unknown');
        expect(result.error.enumId).toBe('status-deserialize-invalid');
        expect(result.error.validValues).toEqual(['active', 'inactive']);
      }
    });
  });

  describe('custom transforms', () => {
    it('applies serialize transform', () => {
      const Priority = createBrandedEnum('priority-serialize-transform', {
        High: 'high',
        Low: 'low',
      } as const);

      const serializer = enumSerializer(Priority, {
        serialize: (value) => `priority:${value}`,
      });

      expect(serializer.serialize(Priority.High)).toBe('priority:high');
      expect(serializer.serialize(Priority.Low)).toBe('priority:low');
    });

    it('applies deserialize transform before validation', () => {
      const Priority = createBrandedEnum('priority-deserialize-transform', {
        High: 'high',
        Low: 'low',
      } as const);

      const serializer = enumSerializer(Priority, {
        deserialize: (value) => value.replace('priority:', ''),
      });

      const result = serializer.deserialize('priority:high');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('high');
      }
    });

    it('supports bidirectional transforms', () => {
      const Status = createBrandedEnum('status-bidirectional', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const serializer = enumSerializer(Status, {
        serialize: (value) => `prefix_${value}_suffix`,
        deserialize: (value) => value.replace('prefix_', '').replace('_suffix', ''),
      });

      // Serialize
      const serialized = serializer.serialize(Status.Active);
      expect(serialized).toBe('prefix_active_suffix');

      // Deserialize
      const result = serializer.deserialize('prefix_active_suffix');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('active');
      }
    });

    it('supports case-insensitive deserialization', () => {
      const Colors = createBrandedEnum('colors-case-insensitive', {
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
      } as const);

      const serializer = enumSerializer(Colors, {
        deserialize: (value) => value.toLowerCase(),
      });

      expect(serializer.deserialize('RED').success).toBe(true);
      expect(serializer.deserialize('Red').success).toBe(true);
      expect(serializer.deserialize('red').success).toBe(true);

      const result = serializer.deserialize('RED');
      if (result.success) {
        expect(result.value).toBe('red');
      }
    });
  });

  describe('deserializeOrThrow', () => {
    it('returns value for valid input', () => {
      const Status = createBrandedEnum('status-throw-valid', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const serializer = enumSerializer(Status);

      expect(serializer.deserializeOrThrow('active')).toBe('active');
      expect(serializer.deserializeOrThrow('inactive')).toBe('inactive');
    });

    it('throws for invalid input', () => {
      const Status = createBrandedEnum('status-throw-invalid', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const serializer = enumSerializer(Status);

      expect(() => serializer.deserializeOrThrow('unknown')).toThrow(
        'Value "unknown" is not a member of enum "status-throw-invalid"'
      );
    });

    it('throws for non-string input', () => {
      const Status = createBrandedEnum('status-throw-nonstring', {
        Active: 'active',
      } as const);

      const serializer = enumSerializer(Status);

      expect(() => serializer.deserializeOrThrow(123)).toThrow(
        'Expected a string value, received number'
      );
    });
  });

  describe('error handling', () => {
    it('throws when input is not a branded enum', () => {
      const notAnEnum = { A: 'a', B: 'b' };

      expect(() => {
        // @ts-expect-error - intentionally passing non-branded enum
        enumSerializer(notAnEnum);
      }).toThrow('enumSerializer requires a branded enum');
    });

    it('throws for null input', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing null
        enumSerializer(null);
      }).toThrow('enumSerializer requires a branded enum');
    });

    it('throws for undefined input', () => {
      expect(() => {
        // @ts-expect-error - intentionally passing undefined
        enumSerializer(undefined);
      }).toThrow('enumSerializer requires a branded enum');
    });

    it('returns failure for non-string values', () => {
      const Status = createBrandedEnum('status-nonstring', {
        Active: 'active',
      } as const);

      const serializer = enumSerializer(Status);

      const nullResult = serializer.deserialize(null);
      expect(nullResult.success).toBe(false);
      if (!nullResult.success) {
        expect(nullResult.error.message).toContain('null');
      }

      const numberResult = serializer.deserialize(123);
      expect(numberResult.success).toBe(false);
      if (!numberResult.success) {
        expect(numberResult.error.message).toContain('number');
      }

      const objectResult = serializer.deserialize({});
      expect(objectResult.success).toBe(false);
      if (!objectResult.success) {
        expect(objectResult.error.message).toContain('object');
      }

      const undefinedResult = serializer.deserialize(undefined);
      expect(undefinedResult.success).toBe(false);
      if (!undefinedResult.success) {
        expect(undefinedResult.error.message).toContain('undefined');
      }
    });

    it('handles deserialize transform errors gracefully', () => {
      const Status = createBrandedEnum('status-transform-error', {
        Active: 'active',
      } as const);

      const serializer = enumSerializer(Status, {
        deserialize: () => {
          throw new Error('Transform failed');
        },
      });

      const result = serializer.deserialize('active');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Transform failed');
      }
    });
  });

  describe('error details', () => {
    it('includes enumId in error', () => {
      const Status = createBrandedEnum('status-error-details', {
        Active: 'active',
      } as const);

      const serializer = enumSerializer(Status);

      const result = serializer.deserialize('invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.enumId).toBe('status-error-details');
      }
    });

    it('includes validValues in error', () => {
      const Status = createBrandedEnum('status-valid-values', {
        Active: 'active',
        Inactive: 'inactive',
        Pending: 'pending',
      } as const);

      const serializer = enumSerializer(Status);

      const result = serializer.deserialize('invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.validValues).toEqual(['active', 'inactive', 'pending']);
      }
    });

    it('includes original input in error', () => {
      const Status = createBrandedEnum('status-input-error', {
        Active: 'active',
      } as const);

      const serializer = enumSerializer(Status);

      const result = serializer.deserialize('original-input');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.input).toBe('original-input');
      }
    });
  });

  describe('use cases', () => {
    it('can be used for database storage with prefixes', () => {
      const UserRole = createBrandedEnum('user-role-db', {
        Admin: 'admin',
        User: 'user',
        Guest: 'guest',
      } as const);

      const serializer = enumSerializer(UserRole, {
        serialize: (value) => `role:${value}`,
        deserialize: (value) => value.replace('role:', ''),
      });

      // Store in database
      const dbValue = serializer.serialize(UserRole.Admin);
      expect(dbValue).toBe('role:admin');

      // Read from database
      const result = serializer.deserialize('role:admin');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('admin');
      }
    });

    it('can be used for API communication with uppercase', () => {
      const Status = createBrandedEnum('status-api', {
        Active: 'active',
        Inactive: 'inactive',
      } as const);

      const serializer = enumSerializer(Status, {
        serialize: (value) => value.toUpperCase(),
        deserialize: (value) => value.toLowerCase(),
      });

      // Send to API
      const apiValue = serializer.serialize(Status.Active);
      expect(apiValue).toBe('ACTIVE');

      // Receive from API
      const result = serializer.deserialize('ACTIVE');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('active');
      }
    });

    it('roundtrip serialization works correctly', () => {
      const Priority = createBrandedEnum('priority-roundtrip', {
        High: 'high',
        Medium: 'medium',
        Low: 'low',
      } as const);

      const serializer = enumSerializer(Priority, {
        serialize: (value) => `[${value}]`,
        deserialize: (value) => value.slice(1, -1),
      });

      // Test roundtrip for all values
      for (const value of [Priority.High, Priority.Medium, Priority.Low]) {
        const serialized = serializer.serialize(value);
        const result = serializer.deserialize(serialized);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(value);
        }
      }
    });
  });
});
