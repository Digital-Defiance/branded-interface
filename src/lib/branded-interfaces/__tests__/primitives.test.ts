/**
 * Property-based tests for built-in refinement types.
 *
 * Feature: branded-interfaces
 * Property 8: Built-in refinement types validate correctly
 */

import * as fc from 'fast-check';
import { createBrandedPrimitive } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';

// =============================================================================
// Property 8: Built-in refinement types validate correctly
// =============================================================================

describe('Feature: branded-interfaces, Property 8: Built-in refinement types validate correctly', () => {
  /**
   * **Validates: Requirements 2.6**
   *
   * *For any* value, each built-in refinement type (Email, NonEmptyString,
   * PositiveInt, NonNegativeInt, Url, Uuid) should accept values matching
   * its pattern and reject values not matching.
   *
   * We create fresh primitives with the same predicates as the module-level
   * constants to avoid registry conflicts across tests.
   */

  let idCounter = 0;
  function freshId(prefix: string): string {
    return `${prefix}_prop8_${++idCounter}_${Date.now()}`;
  }

  beforeEach(() => {
    resetInterfaceRegistry();
    idCounter = 0;
  });

  // ---------------------------------------------------------------------------
  // Email
  // ---------------------------------------------------------------------------

  describe('Email refinement', () => {
    function isEmail(value: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    it('accepts valid email addresses', () => {
      const arbEmail = fc.tuple(
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[^\s@]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[^\s@]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 5 }).filter((s) => /^[^\s@]+$/.test(s)),
      ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

      fc.assert(
        fc.property(arbEmail, (email) => {
          const def = createBrandedPrimitive<string>(freshId('Email'), 'string', isEmail);
          expect(def.validate(email)).toBe(true);
          expect(() => def.create(email as never)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('rejects invalid email addresses', () => {
      const arbInvalidEmail = fc.oneof(
        fc.string().filter((s) => !isEmail(s)),
        fc.constant(''),
        fc.constant('noatsign'),
        fc.constant('@nodomain'),
        fc.constant('no@tld'),
      );

      fc.assert(
        fc.property(arbInvalidEmail, (value) => {
          const def = createBrandedPrimitive<string>(freshId('Email'), 'string', isEmail);
          expect(def.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // NonEmptyString
  // ---------------------------------------------------------------------------

  describe('NonEmptyString refinement', () => {
    function isNonEmptyString(value: string): boolean {
      return value.trim().length > 0;
    }

    it('accepts non-empty strings', () => {
      const arbNonEmpty = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

      fc.assert(
        fc.property(arbNonEmpty, (value) => {
          const def = createBrandedPrimitive<string>(freshId('NonEmpty'), 'string', isNonEmptyString);
          expect(def.validate(value)).toBe(true);
          expect(() => def.create(value as never)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('rejects empty or whitespace-only strings', () => {
      const arbEmpty = fc.oneof(
        fc.constant(''),
        fc.constant('   '),
        fc.constant('\t'),
        fc.constant('\n'),
        fc.constant('\r'),
        fc.constant('  \t  '),
      );

      fc.assert(
        fc.property(arbEmpty, (value) => {
          const def = createBrandedPrimitive<string>(freshId('NonEmpty'), 'string', isNonEmptyString);
          expect(def.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PositiveInt
  // ---------------------------------------------------------------------------

  describe('PositiveInt refinement', () => {
    function isPositiveInt(value: number): boolean {
      return Number.isInteger(value) && value > 0;
    }

    it('accepts positive integers', () => {
      const arbPosInt = fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER });

      fc.assert(
        fc.property(arbPosInt, (value) => {
          const def = createBrandedPrimitive<number>(freshId('PosInt'), 'number', isPositiveInt);
          expect(def.validate(value)).toBe(true);
          expect(() => def.create(value as never)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('rejects non-positive or non-integer numbers', () => {
      const arbInvalid = fc.oneof(
        fc.constant(0),
        fc.integer({ min: -1000, max: 0 }),
        fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n)),
        fc.constant(NaN),
        fc.constant(Infinity),
      );

      fc.assert(
        fc.property(arbInvalid, (value) => {
          const def = createBrandedPrimitive<number>(freshId('PosInt'), 'number', isPositiveInt);
          expect(def.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // NonNegativeInt
  // ---------------------------------------------------------------------------

  describe('NonNegativeInt refinement', () => {
    function isNonNegativeInt(value: number): boolean {
      return Number.isInteger(value) && value >= 0;
    }

    it('accepts non-negative integers', () => {
      const arbNonNegInt = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });

      fc.assert(
        fc.property(arbNonNegInt, (value) => {
          const def = createBrandedPrimitive<number>(freshId('NonNegInt'), 'number', isNonNegativeInt);
          expect(def.validate(value)).toBe(true);
          expect(() => def.create(value as never)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('rejects negative or non-integer numbers', () => {
      const arbInvalid = fc.oneof(
        fc.integer({ min: -1000, max: -1 }),
        fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n)),
        fc.constant(NaN),
        fc.constant(-Infinity),
      );

      fc.assert(
        fc.property(arbInvalid, (value) => {
          const def = createBrandedPrimitive<number>(freshId('NonNegInt'), 'number', isNonNegativeInt);
          expect(def.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Url
  // ---------------------------------------------------------------------------

  describe('Url refinement', () => {
    function isUrl(value: string): boolean {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    it('accepts valid URLs', () => {
      const arbUrl = fc.webUrl();

      fc.assert(
        fc.property(arbUrl, (value) => {
          const def = createBrandedPrimitive<string>(freshId('Url'), 'string', isUrl);
          expect(def.validate(value)).toBe(true);
          expect(() => def.create(value as never)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('rejects invalid URLs', () => {
      const arbInvalid = fc.oneof(
        fc.constant(''),
        fc.constant('not a url'),
        fc.constant('://missing-scheme'),
        fc.string().filter((s) => { try { new URL(s); return false; } catch { return true; } }),
      );

      fc.assert(
        fc.property(arbInvalid, (value) => {
          const def = createBrandedPrimitive<string>(freshId('Url'), 'string', isUrl);
          expect(def.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Uuid
  // ---------------------------------------------------------------------------

  describe('Uuid refinement', () => {
    function isUuid(value: string): boolean {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }

    it('accepts valid UUID v4 strings', () => {
      const arbUuid = fc.uuid().filter((u) => isUuid(u));

      fc.assert(
        fc.property(arbUuid, (value) => {
          const def = createBrandedPrimitive<string>(freshId('Uuid'), 'string', isUuid);
          expect(def.validate(value)).toBe(true);
          expect(() => def.create(value as never)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('rejects invalid UUID strings', () => {
      const arbInvalid = fc.oneof(
        fc.constant(''),
        fc.constant('not-a-uuid'),
        fc.constant('12345678-1234-1234-1234-123456789012'), // version not 4
        fc.string().filter((s) => !isUuid(s)),
      );

      fc.assert(
        fc.property(arbInvalid, (value) => {
          const def = createBrandedPrimitive<string>(freshId('Uuid'), 'string', isUuid);
          expect(def.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });
});

// =============================================================================
// Unit Tests: Refinement types with known valid/invalid values
// =============================================================================

describe('Unit Tests: Refinement types', () => {
  /**
   * **Validates: Requirements 2.6**
   *
   * Tests each built-in refinement type with specific known valid/invalid values.
   * Uses fresh primitives with the same predicates to avoid registry conflicts.
   */

  let idCounter = 0;
  function freshId(prefix: string): string {
    return `${prefix}_unit_${++idCounter}_${Date.now()}`;
  }

  beforeEach(() => {
    resetInterfaceRegistry();
    idCounter = 0;
  });

  // ---------------------------------------------------------------------------
  // Email
  // ---------------------------------------------------------------------------

  describe('Email', () => {
    function isEmail(value: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    it('accepts test@example.com', () => {
      const def = createBrandedPrimitive<string>(freshId('Email'), 'string', isEmail);
      expect(def.validate('test@example.com')).toBe(true);
      expect(() => def.create('test@example.com' as never)).not.toThrow();
    });

    it('rejects not-an-email', () => {
      const def = createBrandedPrimitive<string>(freshId('Email'), 'string', isEmail);
      expect(def.validate('not-an-email')).toBe(false);
      expect(() => def.create('not-an-email' as never)).toThrow();
    });

    it('rejects @missing-local', () => {
      const def = createBrandedPrimitive<string>(freshId('Email'), 'string', isEmail);
      expect(def.validate('@missing-local')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // NonEmptyString
  // ---------------------------------------------------------------------------

  describe('NonEmptyString', () => {
    function isNonEmptyString(value: string): boolean {
      return value.trim().length > 0;
    }

    it('accepts "hello"', () => {
      const def = createBrandedPrimitive<string>(freshId('NonEmpty'), 'string', isNonEmptyString);
      expect(def.validate('hello')).toBe(true);
      expect(() => def.create('hello' as never)).not.toThrow();
    });

    it('rejects empty string ""', () => {
      const def = createBrandedPrimitive<string>(freshId('NonEmpty'), 'string', isNonEmptyString);
      expect(def.validate('')).toBe(false);
    });

    it('rejects whitespace-only "   "', () => {
      const def = createBrandedPrimitive<string>(freshId('NonEmpty'), 'string', isNonEmptyString);
      expect(def.validate('   ')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // PositiveInt
  // ---------------------------------------------------------------------------

  describe('PositiveInt', () => {
    function isPositiveInt(value: number): boolean {
      return Number.isInteger(value) && value > 0;
    }

    it('accepts 1', () => {
      const def = createBrandedPrimitive<number>(freshId('PosInt'), 'number', isPositiveInt);
      expect(def.validate(1)).toBe(true);
      expect(() => def.create(1 as never)).not.toThrow();
    });

    it('rejects 0', () => {
      const def = createBrandedPrimitive<number>(freshId('PosInt'), 'number', isPositiveInt);
      expect(def.validate(0)).toBe(false);
    });

    it('rejects -5', () => {
      const def = createBrandedPrimitive<number>(freshId('PosInt'), 'number', isPositiveInt);
      expect(def.validate(-5)).toBe(false);
    });

    it('rejects 1.5 (non-integer)', () => {
      const def = createBrandedPrimitive<number>(freshId('PosInt'), 'number', isPositiveInt);
      expect(def.validate(1.5)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // NonNegativeInt
  // ---------------------------------------------------------------------------

  describe('NonNegativeInt', () => {
    function isNonNegativeInt(value: number): boolean {
      return Number.isInteger(value) && value >= 0;
    }

    it('accepts 0', () => {
      const def = createBrandedPrimitive<number>(freshId('NonNegInt'), 'number', isNonNegativeInt);
      expect(def.validate(0)).toBe(true);
      expect(() => def.create(0 as never)).not.toThrow();
    });

    it('accepts 5', () => {
      const def = createBrandedPrimitive<number>(freshId('NonNegInt'), 'number', isNonNegativeInt);
      expect(def.validate(5)).toBe(true);
    });

    it('rejects -1', () => {
      const def = createBrandedPrimitive<number>(freshId('NonNegInt'), 'number', isNonNegativeInt);
      expect(def.validate(-1)).toBe(false);
    });

    it('rejects 2.5 (non-integer)', () => {
      const def = createBrandedPrimitive<number>(freshId('NonNegInt'), 'number', isNonNegativeInt);
      expect(def.validate(2.5)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Url
  // ---------------------------------------------------------------------------

  describe('Url', () => {
    function isUrl(value: string): boolean {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    it('accepts https://example.com', () => {
      const def = createBrandedPrimitive<string>(freshId('Url'), 'string', isUrl);
      expect(def.validate('https://example.com')).toBe(true);
      expect(() => def.create('https://example.com' as never)).not.toThrow();
    });

    it('rejects not-a-url', () => {
      const def = createBrandedPrimitive<string>(freshId('Url'), 'string', isUrl);
      expect(def.validate('not-a-url')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Uuid
  // ---------------------------------------------------------------------------

  describe('Uuid', () => {
    function isUuid(value: string): boolean {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }

    it('accepts 550e8400-e29b-41d4-a716-446655440000', () => {
      const def = createBrandedPrimitive<string>(freshId('Uuid'), 'string', isUuid);
      expect(def.validate('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(() => def.create('550e8400-e29b-41d4-a716-446655440000' as never)).not.toThrow();
    });

    it('rejects not-a-uuid', () => {
      const def = createBrandedPrimitive<string>(freshId('Uuid'), 'string', isUuid);
      expect(def.validate('not-a-uuid')).toBe(false);
    });
  });
});
