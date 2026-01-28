/**
 * Example 16: JSON Schema Generation
 *
 * This example demonstrates generating JSON Schema from branded enums:
 * - toJsonSchema: Generate JSON Schema for validation
 * - Custom options: title, description, schema version
 * - Integration with validators
 *
 * Run: npx ts-node examples/16-json-schema.ts
 */

import { createBrandedEnum, toJsonSchema } from '../src/index.js';

// =============================================================================
// Basic JSON Schema Generation
// =============================================================================

console.log('=== Basic JSON Schema Generation ===');

const Status = createBrandedEnum('ex16-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

const schema = toJsonSchema(Status);
console.log('Generated schema:');
console.log(JSON.stringify(schema, null, 2));
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "title": "ex16-status",
//   "description": "Enum values for ex16-status",
//   "type": "string",
//   "enum": ["active", "inactive", "pending"]
// }

// =============================================================================
// Custom Title and Description
// =============================================================================

console.log('\n=== Custom Title and Description ===');

const Priority = createBrandedEnum('ex16-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
} as const);

const customSchema = toJsonSchema(Priority, {
  title: 'Task Priority',
  description: 'The priority level assigned to a task',
});

console.log('Custom schema:');
console.log(JSON.stringify(customSchema, null, 2));

// =============================================================================
// Schema Versions
// =============================================================================

console.log('\n=== Schema Versions ===');

// Draft-07 (default)
const draft07 = toJsonSchema(Status, { schemaVersion: 'draft-07' });
console.log('Draft-07 $schema:', draft07.$schema);

// Draft-04
const draft04 = toJsonSchema(Status, { schemaVersion: 'draft-04' });
console.log('Draft-04 $schema:', draft04.$schema);

// 2020-12 (latest)
const draft2020 = toJsonSchema(Status, { schemaVersion: '2020-12' });
console.log('2020-12 $schema:', draft2020.$schema);

// =============================================================================
// Without $schema Property
// =============================================================================

console.log('\n=== Without $schema Property ===');

const noSchemaProperty = toJsonSchema(Status, { includeSchema: false });
console.log('Schema without $schema:');
console.log(JSON.stringify(noSchemaProperty, null, 2));
// Useful when embedding in larger schemas

// =============================================================================
// Use Case: API Documentation (OpenAPI/Swagger)
// =============================================================================

console.log('\n=== Use Case: OpenAPI Components ===');

const OrderStatus = createBrandedEnum('ex16-order-status', {
  Created: 'created',
  Processing: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
} as const);

const PaymentStatus = createBrandedEnum('ex16-payment-status', {
  Pending: 'pending',
  Completed: 'completed',
  Failed: 'failed',
  Refunded: 'refunded',
} as const);

// Generate OpenAPI-compatible schemas
function toOpenApiSchema(enumObj: Parameters<typeof toJsonSchema>[0], title: string, description: string) {
  const schema = toJsonSchema(enumObj, {
    title,
    description,
    includeSchema: false, // OpenAPI doesn't use $schema
  });
  // Remove $schema if present
  const { $schema, ...rest } = schema as typeof schema & { $schema?: string };
  return rest;
}

const openApiComponents = {
  schemas: {
    OrderStatus: toOpenApiSchema(OrderStatus, 'Order Status', 'Current status of an order'),
    PaymentStatus: toOpenApiSchema(PaymentStatus, 'Payment Status', 'Current status of a payment'),
  },
};

console.log('OpenAPI components:');
console.log(JSON.stringify(openApiComponents, null, 2));

// =============================================================================
// Use Case: Embedding in Object Schema
// =============================================================================

console.log('\n=== Use Case: Embedding in Object Schema ===');

const statusSchema = toJsonSchema(Status, { includeSchema: false });
const prioritySchema = toJsonSchema(Priority, { includeSchema: false });

const taskSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Task',
  description: 'A task object',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', minLength: 1 },
    status: statusSchema,
    priority: prioritySchema,
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'title', 'status', 'priority'],
};

console.log('Task schema:');
console.log(JSON.stringify(taskSchema, null, 2));

// =============================================================================
// Use Case: Manual Validation (without external library)
// =============================================================================

console.log('\n=== Use Case: Manual Validation ===');

function validateAgainstSchema(value: unknown, schema: ReturnType<typeof toJsonSchema>): boolean {
  // Simple validation based on the schema
  if (schema.type !== 'string') return false;
  if (typeof value !== 'string') return false;
  if (!schema.enum.includes(value)) return false;
  return true;
}

const testSchema = toJsonSchema(Status);

console.log("Validate 'active':", validateAgainstSchema('active', testSchema)); // true
console.log("Validate 'invalid':", validateAgainstSchema('invalid', testSchema)); // false
console.log('Validate 123:', validateAgainstSchema(123, testSchema)); // false

// =============================================================================
// Use Case: Generate Schema Documentation
// =============================================================================

console.log('\n=== Use Case: Schema Documentation ===');

function generateSchemaDoc(enumObj: Parameters<typeof toJsonSchema>[0], name: string): string {
  const schema = toJsonSchema(enumObj, {
    title: name,
    includeSchema: false,
  });

  return `
## ${schema.title}

${schema.description}

**Type:** \`${schema.type}\`

**Allowed Values:**
${schema.enum.map((v) => `- \`${v}\``).join('\n')}
`.trim();
}

console.log(generateSchemaDoc(Status, 'Status'));

// =============================================================================
// Batch Schema Generation
// =============================================================================

console.log('\n=== Batch Schema Generation ===');

const enums = {
  Status,
  Priority,
  OrderStatus,
  PaymentStatus,
};

const allSchemas = Object.fromEntries(
  Object.entries(enums).map(([name, enumObj]) => [
    name,
    toJsonSchema(enumObj, {
      title: name,
      description: `Valid values for ${name}`,
      includeSchema: false,
    }),
  ])
);

console.log('All schemas generated:');
Object.keys(allSchemas).forEach((name) => {
  const schema = allSchemas[name];
  console.log(`  ${name}: ${schema.enum.length} values`);
});

console.log('\n✅ Example completed successfully!');
