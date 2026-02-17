/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 🏥 Patient Intake System — A showcase of branded-interface features
 *
 * This example models a healthcare patient intake workflow using nearly every
 * feature of the branded-interface library:
 *
 *   ✅ Branded primitives with refinement (SSN, MRN, PhoneNumber)
 *   ✅ Branded enums (BloodType, InsuranceTier)
 *   ✅ Branded interfaces with nested refs (Patient, Address, Insurance)
 *   ✅ Composition (composeInterfaces, extendInterface)
 *   ✅ Builder pattern (fluent API)
 *   ✅ Opaque types (hiding SSN from accidental logging)
 *   ✅ Codec pipelines (raw JSON → validated, enriched patient record)
 *   ✅ Serializer (JSON round-trip)
 *   ✅ Versioning & migration (v1 → v2 schema evolution)
 *   ✅ Watchers (audit log of every create/validate event)
 *   ✅ JSON Schema generation (for API documentation)
 *   ✅ Type guards (isBrandedInstance, assertBrandedInstance)
 *   ✅ Diff (comparing two patient records)
 *
 * Run with: npx tsx examples/patient-intake-system.ts
 */

import {
  // Factory & primitives
  createBrandedInterface,
  createBrandedPrimitive,
  createBrandedEnum,

  // Composition
  composeInterfaces,
  extendInterface,

  // Builder
  createBuilder,

  // Opaque
  createOpaqueType,

  // Codec
  createCodec,

  // Serializer
  interfaceSerializer,

  // Versioning
  addMigration,
  migrate,

  // Watch
  watchInterface,

  // JSON Schema
  interfaceToJsonSchema,

  // Guards
  isOfInterface,

  // Diff
  interfaceDiff,

  // Registry cleanup (for demo isolation)
  resetInterfaceRegistry,

  // Enum registry cleanup
  resetRegistry,
} from '../src/index.js';

// Clean slate for the demo
resetInterfaceRegistry();
resetRegistry();

console.log('═══════════════════════════════════════════════════════');
console.log('  🏥  Patient Intake System — branded-interface demo');
console.log('═══════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. BRANDED PRIMITIVES — domain-specific refinement types
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 1. Branded Primitives ──────────────────────────────\n');

// Medical Record Number: exactly 8 alphanumeric characters
const MRN = createBrandedPrimitive<string>('MRN', 'string', function isMRN(v: string) {
  return /^[A-Z0-9]{8}$/.test(v);
});

// US Phone: (xxx) xxx-xxxx or xxx-xxx-xxxx
const PhoneNumber = createBrandedPrimitive<string>('PhoneNumber', 'string', function isPhone(v: string) {
  return /^(\(\d{3}\)\s?|\d{3}[-.])\d{3}[-.]?\d{4}$/.test(v);
});

// Social Security Number: xxx-xx-xxxx
const SSN = createBrandedPrimitive<string>('SSN', 'string', function isSSN(v: string) {
  return /^\d{3}-\d{2}-\d{4}$/.test(v);
});

// Age: positive integer, max 150
const Age = createBrandedPrimitive<number>('Age', 'number', function isAge(v: number) {
  return Number.isInteger(v) && v > 0 && v <= 150;
});

const mrn = MRN.create('AB12CD34');
const phone = PhoneNumber.create('(555) 867-5309');
const age = Age.create(34);

console.log(`  MRN:   ${mrn}`);
console.log(`  Phone: ${phone}`);
console.log(`  Age:   ${age}`);
console.log(`  MRN validates "ZZZZ0000": ${MRN.validate('ZZZZ0000')}`);
console.log(`  MRN validates "too-long-value": ${MRN.validate('too-long-value')}`);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 2. BRANDED ENUMS — constrained string unions with runtime identity
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 2. Branded Enums ──────────────────────────────────\n');

const BloodType = createBrandedEnum('BloodType', {
  APos: 'A+', ANeg: 'A-',
  BPos: 'B+', BNeg: 'B-',
  ABPos: 'AB+', ABNeg: 'AB-',
  OPos: 'O+', ONeg: 'O-',
} as const);

const InsuranceTier = createBrandedEnum('InsuranceTier', {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
  Platinum: 'platinum',
} as const);

console.log(`  Blood types: ${Object.values(BloodType).join(', ')}`);
console.log(`  Insurance tiers: ${Object.values(InsuranceTier).join(', ')}`);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 3. BRANDED INTERFACES — structured domain objects with validation
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 3. Branded Interfaces ─────────────────────────────\n');

const Address = createBrandedInterface<{
  street: string;
  city: string;
  state: string;
  zip: string;
}>('Address', {
  street: { type: 'string' },
  city:   { type: 'string' },
  state:  { type: 'string' },
  zip:    { type: 'string', validate: (v) => /^\d{5}(-\d{4})?$/.test(v as string) },
});

const EmergencyContact = createBrandedInterface<{
  name: string;
  relationship: string;
  phone: string;
}>('EmergencyContact', {
  name:         { type: 'string' },
  relationship: { type: 'string' },
  phone:        { type: 'branded-primitive', ref: 'PhoneNumber' },
});

const addr = Address.create({
  street: '742 Evergreen Terrace',
  city: 'Springfield',
  state: 'IL',
  zip: '62704',
});

const emergency = EmergencyContact.create({
  name: 'Marge Simpson',
  relationship: 'Spouse',
  phone: '(555) 123-4567',
});

console.log(`  Address: ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`);
console.log(`  Emergency: ${emergency.name} (${emergency.relationship}) — ${emergency.phone}`);
console.log(`  Is branded instance: ${isOfInterface(addr, Address)}`);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMPOSITION — building complex types from simpler ones
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 4. Composition ────────────────────────────────────\n');

const PersonalInfo = createBrandedInterface('PersonalInfo', {
  firstName: { type: 'string' },
  lastName:  { type: 'string' },
  dob:       { type: 'string' },
  bloodType: { type: 'branded-enum', ref: 'BloodType' },
});

const InsuranceInfo = createBrandedInterface('InsuranceInfo', {
  provider:  { type: 'string' },
  policyNum: { type: 'string' },
  tier:      { type: 'branded-enum', ref: 'InsuranceTier' },
});

// Compose PersonalInfo + InsuranceInfo into a single PatientCore
const PatientCore = composeInterfaces('PatientCore', PersonalInfo, InsuranceInfo);

// Extend with MRN and timestamps
const Patient = extendInterface(PatientCore, 'Patient', {
  mrn:       { type: 'branded-primitive', ref: 'MRN' },
  createdAt: { type: 'string' },
});

const patient = Patient.create({
  firstName: 'Homer',
  lastName: 'Simpson',
  dob: '1956-05-12',
  bloodType: 'O+',
  provider: 'Springfield General',
  policyNum: 'SGH-99201',
  tier: 'gold',
  mrn: 'HJ56KL90',
  createdAt: new Date().toISOString(),
});

console.log(`  Patient: ${patient.firstName} ${patient.lastName}`);
console.log(`  Blood: ${patient.bloodType} | Insurance: ${patient.tier}`);
console.log(`  MRN: ${patient.mrn}`);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 5. BUILDER PATTERN — fluent API for defining interfaces
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 5. Builder Pattern ────────────────────────────────\n');

const LabResult = createBuilder('LabResult')
  .field('testName', { type: 'string' })
  .field('value', { type: 'number' })
  .field('unit', { type: 'string' })
  .field('referenceRange', { type: 'string' })
  .optional('notes', { type: 'string' })
  .build();

const cholesterol = (LabResult as any).create({
  testName: 'Total Cholesterol',
  value: 195,
  unit: 'mg/dL',
  referenceRange: '<200 desirable',
});

const glucose = (LabResult as any).create({
  testName: 'Fasting Glucose',
  value: 102,
  unit: 'mg/dL',
  referenceRange: '70-100 normal',
  notes: 'Slightly elevated — recheck in 3 months',
});

console.log(`  ${cholesterol.testName}: ${cholesterol.value} ${cholesterol.unit} (${cholesterol.referenceRange})`);
console.log(`  ${glucose.testName}: ${glucose.value} ${glucose.unit} — ${glucose.notes}`);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 6. OPAQUE TYPES — hiding sensitive data from accidental exposure
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 6. Opaque Types (SSN Protection) ─────────────────\n');

const OpaqueSSN = createOpaqueType<string>('OpaqueSSN', 'string');

// Wrap the SSN — the raw value is now hidden
const ssn = SSN.create('123-45-6789');
const protectedSSN = OpaqueSSN.wrap(ssn);

console.log(`  Wrapped SSN object: ${JSON.stringify(protectedSSN)}`);
console.log(`  typeof protectedSSN: ${typeof protectedSSN}`);
console.log(`  Keys visible: ${Object.keys(protectedSSN as object).length}`);

// Only unwrap() can retrieve the value
const revealed = OpaqueSSN.unwrap(protectedSSN);
console.log(`  Unwrapped SSN: ${revealed}`);

// Trying to unwrap a random object throws
try {
  OpaqueSSN.unwrap({ fake: true } as never);
} catch (e) {
  console.log(`  Unwrap random object: ❌ ${(e as Error).message}`);
}
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 7. CODEC PIPELINE — transform raw input into validated domain objects
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 7. Codec Pipeline ─────────────────────────────────\n');

const Vitals = createBrandedInterface('Vitals', {
  heartRate:   { type: 'number', validate: (v) => (v as number) >= 30 && (v as number) <= 220 },
  systolic:    { type: 'number', validate: (v) => (v as number) >= 50 && (v as number) <= 300 },
  diastolic:   { type: 'number', validate: (v) => (v as number) >= 20 && (v as number) <= 200 },
  temperature: { type: 'number', validate: (v) => (v as number) >= 90 && (v as number) <= 110 },
  oxygenSat:   { type: 'number', validate: (v) => (v as number) >= 50 && (v as number) <= 100 },
});

// Build a codec that validates, then enriches with computed fields
const vitalsCodec = createCodec(Vitals)
  .pipe((branded: any) => ({
    ...branded,
    bloodPressure: `${branded.systolic}/${branded.diastolic}`,
    status: branded.oxygenSat >= 95 && branded.heartRate < 100 ? '✅ Normal' : '⚠️ Review',
  }));

const rawVitals = {
  heartRate: 72,
  systolic: 120,
  diastolic: 80,
  temperature: 98.6,
  oxygenSat: 98,
};

const result = vitalsCodec.execute(rawVitals);
if (result.success) {
  const v = result.value as any;
  console.log(`  Heart Rate: ${v.heartRate} bpm`);
  console.log(`  BP: ${v.bloodPressure} mmHg`);
  console.log(`  Temp: ${v.temperature}°F`);
  console.log(`  O₂ Sat: ${v.oxygenSat}%`);
  console.log(`  Status: ${v.status}`);
}

// Bad data gets caught at the right step
const badResult = vitalsCodec.execute({ ...rawVitals, oxygenSat: 10 });
if (!badResult.success) {
  console.log(`  Bad vitals: ❌ step ${badResult.error.step} — ${badResult.error.message}`);
}
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 8. SERIALIZER — JSON round-trip with validation
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 8. Serializer (JSON Round-Trip) ───────────────────\n');

const vitalsSerializer = interfaceSerializer(Vitals);

const json = vitalsSerializer.serialize(Vitals.create(rawVitals));
console.log(`  Serialized: ${json}`);

const deserialized = vitalsSerializer.deserialize(json);
if (deserialized.success) {
  console.log(`  Deserialized HR: ${deserialized.value.heartRate} bpm ✅`);
}

// Corrupt JSON gets a clean error
const corrupt = vitalsSerializer.deserialize('{"heartRate": "not a number"}');
if (!corrupt.success) {
  console.log(`  Corrupt JSON: ❌ ${corrupt.error.code}`);
}
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 9. WATCHERS — audit trail for compliance
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 9. Watchers (Audit Trail) ─────────────────────────\n');

const auditLog: string[] = [];

const { unwatch } = watchInterface(Vitals, (event) => {
  auditLog.push(
    `[${new Date(event.timestamp).toISOString()}] ${event.eventType.toUpperCase()} on ${event.interfaceId}`
  );
});

// These operations trigger the watcher
Vitals.create(rawVitals);
Vitals.validate(rawVitals);
Vitals.validate({ heartRate: 'bad' }); // fails validation, no event

auditLog.forEach((entry) => console.log(`  ${entry}`));
console.log(`  Total audit entries: ${auditLog.length}`);

unwatch(); // clean up
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 10. JSON SCHEMA — auto-generate API documentation
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 10. JSON Schema Generation ────────────────────────\n');

const vitalsJsonSchema = interfaceToJsonSchema(Vitals);
console.log(JSON.stringify(vitalsJsonSchema, null, 2));
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 11. DIFF — comparing two patient records
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 11. Diff (Schema Comparison) ───────────────────────\n');

const vitals1 = Vitals.create(rawVitals);
const vitals2 = Vitals.create({
  heartRate: 88,
  systolic: 135,
  diastolic: 85,
  temperature: 99.1,
  oxygenSat: 96,
});

// Value-level diff: compare two instances field by field
const fields = Object.keys(vitals1) as string[];
console.log(`  Changes between two vitals readings:`);
for (const field of fields) {
  const v1 = (vitals1 as unknown as Record<string, unknown>)[field];
  const v2 = (vitals2 as unknown as Record<string, unknown>)[field];
  if (v1 !== v2) {
    console.log(`    ${field}: ${v1} → ${v2}`);
  }
}

// Schema-level diff: compare two interface definitions
const schemaDiff = interfaceDiff(Vitals, LabResult as any);
console.log(`\n  Schema diff (Vitals vs LabResult):`);
console.log(`    Only in Vitals: ${schemaDiff.onlyInFirst.map(f => f.field).join(', ')}`);
console.log(`    Only in LabResult: ${schemaDiff.onlyInSecond.map(f => f.field).join(', ')}`);
console.log(`    Shared fields: ${schemaDiff.inBoth.map(f => f.field).join(', ') || '(none)'}`);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// 12. VERSIONING — schema evolution with migration
// ─────────────────────────────────────────────────────────────────────────────

console.log('── 12. Versioning & Migration ────────────────────────\n');

// v1: simple allergy list as a string
const AllergyRecord_v1 = createBrandedInterface('AllergyRecord', {
  patientMrn: { type: 'string' },
  allergies:  { type: 'string' },
}, { version: 1 });

// Register migration: v1 → v2 splits the comma-separated string into an array
addMigration(AllergyRecord_v1, 1, 2, (data) => ({
  patientMrn: data.patientMrn,
  allergies: (data.allergies as string).split(',').map((s: string) => s.trim()),
  updatedAt: new Date().toISOString(),
}));

const v1Record = AllergyRecord_v1.create({
  patientMrn: 'HJ56KL90',
  allergies: 'Penicillin, Sulfa, Latex',
});

console.log(`  v1 allergies (string): "${v1Record.allergies}"`);

// Migrate to v2 — the string becomes an array, and updatedAt is added
const v2Record = migrate(v1Record, 2);

console.log(`  v2 allergies (array):  ${JSON.stringify((v2Record as Record<string, unknown>).allergies)}`);
console.log(`  v2 updatedAt:          ${(v2Record as Record<string, unknown>).updatedAt}`);
console.log();

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════');
console.log('  ✅ All 12 features demonstrated successfully');
console.log('═══════════════════════════════════════════════════════');
