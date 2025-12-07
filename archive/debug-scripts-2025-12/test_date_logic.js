// Test the date logic from calendar_client.tsx line 58-60
const yyyyMM = "2025-12";
const [y, m] = yyyyMM.split("-").map(Number);
const start = new Date(y, m - 1, 1);
const end = new Date(y, m, 0);

console.log('Input:', yyyyMM);
console.log('y:', y, 'm:', m);
console.log('start:', start.toISOString(), '=', start.toDateString());
console.log('end:', end.toISOString(), '=', end.toDateString());

console.log('\nExpected for December 2025:');
console.log('start: 2025-12-01');
console.log('end: 2025-12-31');

console.log('\nActual ISO slices:');
console.log('from=' + start.toISOString().slice(0, 10));
console.log('to=' + end.toISOString().slice(0, 10));
