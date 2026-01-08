import { lock } from 'proper-lockfile';
import * as fs from 'node:fs/promises';
import { log } from './logger.js';

export async function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>
): Promise<T> {
  // 파일이 없으면 기본 내용으로 생성
  try {
    await fs.access(filePath);
  } catch {
    log('Creating default config file:', filePath);
    await fs.writeFile(
      filePath,
      JSON.stringify({ version: '1.0', servers: {} }, null, 2),
      'utf-8'
    );
  }

  log('Acquiring lock for:', filePath);
  const release = await lock(filePath, {
    retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
    stale: 10000, // 10초 후 stale lock 제거
  });

  try {
    return await fn();
  } finally {
    log('Releasing lock for:', filePath);
    await release();
  }
}
