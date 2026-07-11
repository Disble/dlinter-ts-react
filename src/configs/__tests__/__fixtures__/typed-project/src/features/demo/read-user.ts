/**
 * Reads the stored user name.
 */
export async function readUserName(): Promise<string> {
  await Promise.resolve();
  return 'ada';
}

/**
 * Reads and trims the stored user name.
 */
export async function readTrimmedUserName(): Promise<string> {
  const name = await readUserName();
  return name.trim();
}
