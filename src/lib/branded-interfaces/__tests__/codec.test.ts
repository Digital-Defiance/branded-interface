import { createCodec } from '../codec.js';
import { createBrandedInterface } from '../factory.js';
import { resetInterfaceRegistry } from '../registry.js';

let idCounter = 0;
function uniqueId(prefix = 'Codec'): string {
  return `${prefix}_${Date.now()}_${idCounter++}`;
}

beforeEach(() => {
  resetInterfaceRegistry();
});

describe('createCodec', () => {
  it('should validate and brand valid input on execute', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, {
      name: { type: 'string' },
      age: { type: 'number' },
    });

    const codec = createCodec(def);
    const result = codec.execute({ name: 'Alice', age: 30 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe('Alice');
      expect(result.value.age).toBe(30);
    }
  });

  it('should return failure when input fails validation (step 0)', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, {
      name: { type: 'string' },
    });

    const codec = createCodec(def);
    const result = codec.execute({ name: 123 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.step).toBe(0);
      expect(result.error.message).toBeDefined();
    }
  });

  it('should pipe a transform and apply it after branding', () => {
    const id = uniqueId();
    const def = createBrandedInterface<{ value: number }>(id, {
      value: { type: 'number' },
    });

    const codec = createCodec(def).pipe((branded) => ({
      doubled: branded.value * 2,
    }));

    const result = codec.execute({ value: 5 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toEqual({ doubled: 10 });
    }
  });

  it('should chain multiple pipe transforms in order', () => {
    const id = uniqueId();
    const def = createBrandedInterface<{ x: number }>(id, {
      x: { type: 'number' },
    });

    const codec = createCodec(def)
      .pipe((branded) => branded.x)
      .pipe((x) => x * 3)
      .pipe((n) => `result:${n}`);

    const result = codec.execute({ x: 7 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('result:21');
    }
  });

  it('should short-circuit on error in a piped transform', () => {
    const id = uniqueId();
    const def = createBrandedInterface<{ v: number }>(id, {
      v: { type: 'number' },
    });

    const codec = createCodec(def)
      .pipe(() => {
        throw new Error('transform failed');
      })
      .pipe(() => 'should not reach');

    const result = codec.execute({ v: 1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.step).toBe(1);
      expect(result.error.message).toBe('transform failed');
    }
  });

  it('should report the correct step index for later failures', () => {
    const id = uniqueId();
    const def = createBrandedInterface<{ n: number }>(id, {
      n: { type: 'number' },
    });

    const codec = createCodec(def)
      .pipe((branded) => branded.n + 1)
      .pipe((n) => {
        if (n > 5) throw new Error('too big');
        return n;
      });

    const result = codec.execute({ n: 10 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.step).toBe(2);
      expect(result.error.message).toBe('too big');
    }
  });

  it('should never throw from execute — always returns CodecResult', () => {
    const id = uniqueId();
    const def = createBrandedInterface(id, {
      a: { type: 'string' },
    });

    const codec = createCodec(def);

    // Passing completely wrong input — should not throw
    const result = codec.execute(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.step).toBe(0);
    }
  });

  it('should be immutable — pipe returns a new pipeline', () => {
    const id = uniqueId();
    const def = createBrandedInterface<{ v: number }>(id, {
      v: { type: 'number' },
    });

    const base = createCodec(def);
    const piped = base.pipe((branded) => branded.v * 2);

    // base still returns the branded instance
    const baseResult = base.execute({ v: 3 });
    expect(baseResult.success).toBe(true);
    if (baseResult.success) {
      expect(baseResult.value).toHaveProperty('v', 3);
    }

    // piped returns the transformed value
    const pipedResult = piped.execute({ v: 3 });
    expect(pipedResult.success).toBe(true);
    if (pipedResult.success) {
      expect(pipedResult.value).toBe(6);
    }
  });

  it('should capture the input at the failing step in the error', () => {
    const id = uniqueId();
    const def = createBrandedInterface<{ s: string }>(id, {
      s: { type: 'string' },
    });

    const codec = createCodec(def)
      .pipe((branded) => branded.s.length)
      .pipe((len) => {
        throw new Error('boom');
        return len;  
      });

    const result = codec.execute({ s: 'hello' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.step).toBe(2);
      expect(result.error.input).toBe(5); // the length value passed to step 2
    }
  });
});

import * as fc from 'fast-check';
import { arbUniqueId } from './arbitraries.js';

// =============================================================================
// Property 36: Codec pipeline execution order and error handling
// **Validates: Requirements 17.2, 17.3, 17.4**
// =============================================================================

describe('Property 36: Codec pipeline execution order and error handling', () => {
  it('should apply piped transforms in order and return success for valid input', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        fc.integer({ min: 1, max: 100 }),
        (id, multiplier) => {
          resetInterfaceRegistry();

          const def = createBrandedInterface<{ value: number }>(id, {
            value: { type: 'number' },
          });

          // Build a pipeline with multiple transforms
          const executionOrder: number[] = [];
          const codec = createCodec(def)
            .pipe((branded) => {
              executionOrder.push(1);
              return branded.value;
            })
            .pipe((v) => {
              executionOrder.push(2);
              return v * multiplier;
            })
            .pipe((v) => {
              executionOrder.push(3);
              return `result:${v}`;
            });

          const result = codec.execute({ value: 5 });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.value).toBe(`result:${5 * multiplier}`);
          }
          // Verify execution order
          expect(executionOrder).toEqual([1, 2, 3]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should short-circuit on error and report the failing step index', () => {
    fc.assert(
      fc.property(
        arbUniqueId,
        fc.integer({ min: 0, max: 4 }),
        (id, failAtStep) => {
          resetInterfaceRegistry();

          const def = createBrandedInterface<{ x: number }>(id, {
            x: { type: 'number' },
          });

          // Build a pipeline where one step throws
          let pipeline = createCodec(def) as ReturnType<typeof createCodec>;
          const stepsExecuted: number[] = [];

          for (let i = 0; i < 5; i++) {
            const stepIndex = i;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pipeline = (pipeline as any).pipe((v: unknown) => {
              if (stepIndex === failAtStep) {
                throw new Error(`fail at step ${stepIndex}`);
              }
              stepsExecuted.push(stepIndex);
              return v;
            });
          }

          const result = pipeline.execute({ x: 42 });

          expect(result.success).toBe(false);
          if (!result.success) {
            // Step 0 is the initial branding step, piped steps start at 1
            expect(result.error.step).toBe(failAtStep + 1);
            expect(result.error.message).toBe(`fail at step ${failAtStep}`);
          }

          // Steps after the failing one should not have executed
          for (const s of stepsExecuted) {
            expect(s).toBeLessThan(failAtStep);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
