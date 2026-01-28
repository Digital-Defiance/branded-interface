# branded-enum Examples

This folder contains runnable code examples demonstrating all features of the `@digitaldefiance/branded-enum` library.

## Running Examples

Each example file is a standalone TypeScript file that can be run with `ts-node` or compiled and run with Node.js:

```bash
# First, build the library
npm run build

# Using ts-node (from project root)
npx ts-node --esm examples/01-basic-usage.ts

# Or compile all examples
npx tsc -p examples/tsconfig.json
node dist/examples/examples/01-basic-usage.js
```

**Note:** Some examples may show TypeScript type errors in strict mode due to how `as const` assertions interact with generic type constraints. These are compile-time type checking issues only - the examples will run correctly at runtime.

## Example Categories

### Core Features
- [01-basic-usage.ts](./01-basic-usage.ts) - Creating and using branded enums
- [02-type-guards.ts](./02-type-guards.ts) - Runtime type checking with `isFromEnum` and `assertFromEnum`
- [03-registry.ts](./03-registry.ts) - Global registry operations
- [04-metadata-accessors.ts](./04-metadata-accessors.ts) - Accessing enum metadata
- [05-utility-functions.ts](./05-utility-functions.ts) - Reverse lookup and iteration

### Composition & Derivation
- [06-merge-enums.ts](./06-merge-enums.ts) - Combining multiple enums
- [07-enum-subset-exclude.ts](./07-enum-subset-exclude.ts) - Creating subsets and exclusions
- [08-enum-map-transform.ts](./08-enum-map-transform.ts) - Transforming enum values
- [09-enum-from-keys.ts](./09-enum-from-keys.ts) - Creating enums from key arrays

### Analysis & Comparison
- [10-enum-diff.ts](./10-enum-diff.ts) - Comparing enums for differences
- [11-enum-intersect.ts](./11-enum-intersect.ts) - Finding shared values across enums

### Safe Parsing
- [12-parse-enum.ts](./12-parse-enum.ts) - Parsing with defaults
- [13-safe-parse-enum.ts](./13-safe-parse-enum.ts) - Result-based parsing

### Exhaustiveness & Type Safety
- [14-exhaustive-checking.ts](./14-exhaustive-checking.ts) - Switch statement exhaustiveness
- [15-compile-time-types.ts](./15-compile-time-types.ts) - TypeScript utility types

### Schema Generation
- [16-json-schema.ts](./16-json-schema.ts) - JSON Schema generation
- [17-zod-schema.ts](./17-zod-schema.ts) - Zod-compatible schema definitions

### Serialization
- [18-enum-serializer.ts](./18-enum-serializer.ts) - Custom serialization/deserialization

### Decorators
- [19-decorators.ts](./19-decorators.ts) - Property validation and usage tracking

### Development Tools
- [20-watch-enum.ts](./20-watch-enum.ts) - Monitoring enum access

### Real-World Use Cases
- [21-i18n-keys.ts](./21-i18n-keys.ts) - Internationalization key management
- [22-api-validation.ts](./22-api-validation.ts) - API response validation
- [23-state-machine.ts](./23-state-machine.ts) - State machine with branded enums

## Best Practices

Each example includes comments explaining:
- **What** the feature does
- **When** to use it
- **How** to use it correctly
- **Anti-patterns** to avoid (where applicable)

## Before/After Comparisons

Several examples show before/after comparisons demonstrating how branded-enum improves upon standard TypeScript enums or plain objects.
