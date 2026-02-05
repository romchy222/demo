export function makeId(prefix = ''): string {
  const cryptoObj = (globalThis as any).crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return `${prefix}${cryptoObj.randomUUID()}`;
  return `${prefix}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

