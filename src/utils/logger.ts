const DEBUG = !!process.env.DEBUG;

export function log(...args: unknown[]): void {
  if (DEBUG) {
    console.error('[mcproxy]', ...args);
  }
}

export function error(...args: unknown[]): void {
  console.error('[mcproxy:error]', ...args);
}
