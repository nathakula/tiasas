import { format, parseISO } from 'date-fns';

// Simulate the date object from database
const testDate = new Date('2025-11-12T00:00:00.000Z');

console.log('Original date object:');
console.log('  toString():', testDate.toString());
console.log('  toISOString():', testDate.toISOString());
console.log('  toUTCString():', testDate.toUTCString());
console.log('');

// OLD METHOD (incorrect - shows Nov 11 in CST timezone)
const oldFormat = format(testDate, "MMM d, yyyy");
console.log('OLD formatting (direct format):');
console.log('  Result:', oldFormat);
console.log('  ❌ Shows Nov 11 due to timezone conversion');
console.log('');

// NEW METHOD (correct - extracts date part in UTC, shows Nov 12)
const isoDateString = testDate.toISOString().split('T')[0]; // "2025-11-12"
const parsedDate = parseISO(isoDateString);
const newFormat = format(parsedDate, "MMM d, yyyy");
console.log('NEW formatting (ISO date part + parseISO):');
console.log('  ISO date part:', isoDateString);
console.log('  Parsed date:', parsedDate.toString());
console.log('  Result:', newFormat);
console.log('  ✅ Shows Nov 12 correctly');
