/**
 * Example 19: Decorators
 *
 * This example demonstrates decorator-based validation:
 * - @EnumValue: Property validation decorator
 * - @EnumClass: Usage tracking decorator
 * - Optional and nullable support
 *
 * NOTE: Requires TypeScript 5.0+ with decorator support
 * Run: npx ts-node examples/19-decorators.ts
 */

import {
  createBrandedEnum,
  EnumValue,
  EnumClass,
  getEnumConsumers,
  getConsumedEnums,
  getAllEnumConsumers,
  BrandedEnumValue,
} from '../src/index.js';

// =============================================================================
// Setup: Create Enums
// =============================================================================

const Status = createBrandedEnum('ex19-status', {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const);

const Priority = createBrandedEnum('ex19-priority', {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
} as const);

const Role = createBrandedEnum('ex19-role', {
  Admin: 'admin',
  User: 'user',
  Guest: 'guest',
} as const);

// =============================================================================
// @EnumValue: Basic Property Validation
// =============================================================================

console.log('=== @EnumValue: Basic Property Validation ===');

class User {
  name: string;

  @EnumValue(Status)
  accessor status: string = Status.Active;

  constructor(name: string) {
    this.name = name;
  }
}

const user = new User('John');
console.log('Initial status:', user.status); // 'active'

// Valid assignment
user.status = Status.Inactive;
console.log('After valid assignment:', user.status); // 'inactive'

// Invalid assignment throws
try {
  user.status = 'invalid' as never;
} catch (error) {
  console.log('Invalid assignment error:', (error as Error).message);
  // 'Property "status" received invalid value "invalid". Expected one of: active, inactive, pending'
}

// =============================================================================
// @EnumValue: Optional Properties
// =============================================================================

console.log('\n=== @EnumValue: Optional Properties ===');

class Config {
  @EnumValue(Priority, { optional: true })
  accessor priority: string | undefined;

  @EnumValue(Status)
  accessor status: string = Status.Active;
}

const config = new Config();
console.log('Initial priority (optional):', config.priority); // undefined

// Can set to undefined
config.priority = undefined;
console.log('After setting undefined:', config.priority); // undefined

// Can set to valid value
config.priority = Priority.High;
console.log('After setting valid:', config.priority); // 'high'

// =============================================================================
// @EnumValue: Nullable Properties
// =============================================================================

console.log('\n=== @EnumValue: Nullable Properties ===');

class Settings {
  @EnumValue(Status, { nullable: true })
  accessor defaultStatus: string | null = null;
}

const settings = new Settings();
console.log('Initial (nullable):', settings.defaultStatus); // null

// Can set to null
settings.defaultStatus = null;
console.log('After setting null:', settings.defaultStatus); // null

// Can set to valid value
settings.defaultStatus = Status.Pending;
console.log('After setting valid:', settings.defaultStatus); // 'pending'

// =============================================================================
// @EnumValue: Combined Optional and Nullable
// =============================================================================

console.log('\n=== @EnumValue: Optional + Nullable ===');

class FlexibleConfig {
  @EnumValue(Priority, { optional: true, nullable: true })
  accessor priority: string | null | undefined;
}

const flexConfig = new FlexibleConfig();
flexConfig.priority = undefined; // OK
flexConfig.priority = null; // OK
flexConfig.priority = Priority.Low; // OK
console.log('Flexible config works with undefined, null, and valid values');

// =============================================================================
// @EnumClass: Usage Tracking
// =============================================================================

console.log('\n=== @EnumClass: Usage Tracking ===');

@EnumClass(Status, Priority)
class Task {
  title: string;

  @EnumValue(Status)
  accessor status: string = Status.Pending;

  @EnumValue(Priority)
  accessor priority: string = Priority.Medium;

  constructor(title: string) {
    this.title = title;
  }
}

@EnumClass(Status, Role)
class Account {
  @EnumValue(Status)
  accessor status: string = Status.Active;

  @EnumValue(Role)
  accessor role: string = Role.User;
}

// Query which classes consume an enum
console.log("Classes consuming 'ex19-status':", getEnumConsumers('ex19-status'));
// ['Task', 'Account']

console.log("Classes consuming 'ex19-priority':", getEnumConsumers('ex19-priority'));
// ['Task']

console.log("Classes consuming 'ex19-role':", getEnumConsumers('ex19-role'));
// ['Account']

// Query which enums a class consumes
console.log("Enums consumed by 'Task':", getConsumedEnums('Task'));
// ['ex19-status', 'ex19-priority']

console.log("Enums consumed by 'Account':", getConsumedEnums('Account'));
// ['ex19-status', 'ex19-role']

// =============================================================================
// Get All Consumers
// =============================================================================

console.log('\n=== Get All Consumers ===');

const allConsumers = getAllEnumConsumers();
console.log('All enum consumers:');
allConsumers.forEach((entry) => {
  console.log(`  ${entry.className}: [${Array.from(entry.enumIds).join(', ')}]`);
});

// =============================================================================
// Use Case: Domain Model Validation
// =============================================================================

console.log('\n=== Use Case: Domain Model Validation ===');

const OrderStatus = createBrandedEnum('ex19-order-status', {
  Created: 'created',
  Paid: 'paid',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
} as const);

const PaymentMethod = createBrandedEnum('ex19-payment-method', {
  CreditCard: 'credit_card',
  PayPal: 'paypal',
  BankTransfer: 'bank_transfer',
} as const);

@EnumClass(OrderStatus, PaymentMethod)
class Order {
  id: string;

  @EnumValue(OrderStatus)
  accessor status: string = OrderStatus.Created;

  @EnumValue(PaymentMethod, { optional: true })
  accessor paymentMethod: string | undefined;

  constructor(id: string) {
    this.id = id;
  }

  pay(method: BrandedEnumValue<typeof PaymentMethod>): void {
    this.paymentMethod = method;
    this.status = OrderStatus.Paid;
    console.log(`Order ${this.id} paid via ${method}`);
  }

  ship(): void {
    if (this.status !== OrderStatus.Paid) {
      throw new Error('Cannot ship unpaid order');
    }
    this.status = OrderStatus.Shipped;
    console.log(`Order ${this.id} shipped`);
  }
}

const order = new Order('ORD-001');
console.log('New order status:', order.status);

order.pay(PaymentMethod.CreditCard);
console.log('After payment:', order.status, order.paymentMethod);

order.ship();
console.log('After shipping:', order.status);

// =============================================================================
// Error Messages
// =============================================================================

console.log('\n=== Error Messages ===');

class ErrorDemo {
  @EnumValue(Status)
  accessor status: string = Status.Active;
}

const demo = new ErrorDemo();

// Different error scenarios
const errorCases = [
  { value: 'invalid', desc: 'Invalid string value' },
  { value: 123, desc: 'Number value' },
  { value: null, desc: 'Null value (non-nullable)' },
  { value: undefined, desc: 'Undefined value (non-optional)' },
];

errorCases.forEach(({ value, desc }) => {
  try {
    demo.status = value as never;
  } catch (error) {
    console.log(`${desc}:`, (error as Error).message.substring(0, 60) + '...');
  }
});

// =============================================================================
// Best Practices
// =============================================================================

console.log('\n=== Best Practices ===');

console.log(`
1. Use @EnumValue for runtime validation of enum properties
2. Use @EnumClass to track which classes use which enums
3. Use { optional: true } for properties that can be undefined
4. Use { nullable: true } for properties that can be null
5. Combine with TypeScript types for compile-time safety:
   @EnumValue(Status)
   accessor status: typeof Status[keyof typeof Status] = Status.Active;
`);

console.log('\n✅ Example completed successfully!');
