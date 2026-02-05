const SALT = 'bolashak-ai:v1';

export function hashPassword(password: string): string {
  // FNV-1a (32-bit). Not cryptographically secure; OK for local/demo storage.
  let h = 0x811c9dc5;
  const input = `${SALT}:${password ?? ''}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `fnv1a:${hex}`;
}

export function verifyPassword(password: string, hash: string | undefined | null): boolean {
  if (!hash) return false;
  return hashPassword(password) === hash;
}

