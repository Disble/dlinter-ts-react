/**
 * Persists the user name remotely.
 */
export async function saveUserName(name: string): Promise<string> {
  await Promise.resolve();
  return name;
}

/**
 * Handles the save action without awaiting the write — a floating promise
 * the type-checked rules must flag as an error.
 */
export function handleSaveAction(): void {
  saveUserName('ada');
}
