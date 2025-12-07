import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const DEBUG_LOG_FILE = path.join(LOG_DIR, 'debug.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatTimestamp() {
  return new Date().toISOString();
}

export function logDebug(tag: string, message: string, data?: any) {
  const timestamp = formatTimestamp();
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  const logEntry = `[${timestamp}] [${tag}] ${message}${dataStr}\n`;

  // Write to file
  fs.appendFileSync(DEBUG_LOG_FILE, logEntry);

  // Also log to console (in case it's visible)
  console.log(`[${tag}]`, message, data || '');
}

export function logError(tag: string, message: string, error?: any) {
  const timestamp = formatTimestamp();
  const errorStr = error ? `\nError: ${error.message}\nStack: ${error.stack}` : '';
  const logEntry = `[${timestamp}] [ERROR] [${tag}] ${message}${errorStr}\n`;

  // Write to file
  fs.appendFileSync(DEBUG_LOG_FILE, logEntry);

  // Also log to console
  console.error(`[${tag}]`, message, error || '');
}
