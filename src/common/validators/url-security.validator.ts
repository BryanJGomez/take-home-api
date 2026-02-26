import { URL } from 'url';
import { lookup } from 'dns/promises';
import { isIPv4 } from 'net';
import { ArgumentInvalidException } from '../argument-invalid.exception';

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^0\./,
];

const BLOCKED_HOSTS = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
];

export async function validateUrl(
  url: string,
  requireHttps = false,
): Promise<void> {
  // 1. ¿Es una URL válida?
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ArgumentInvalidException('Invalid URL format');
  }

  // 2. ¿Protocolo permitido?
  if (requireHttps && parsed.protocol !== 'https:') {
    throw new ArgumentInvalidException('HTTPS is required');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ArgumentInvalidException('Only HTTP and HTTPS are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. ¿Hostname bloqueado?
  if (BLOCKED_HOSTS.includes(hostname)) {
    throw new ArgumentInvalidException('URL points to a restricted address');
  }

  // 4. Resolver DNS y verificar la IP resultante
  let address: string;
  try {
    ({ address } = await lookup(hostname));
  } catch {
    throw new ArgumentInvalidException('Unable to resolve hostname');
  }

  if (isIPv4(address) && PRIVATE_RANGES.some((r) => r.test(address))) {
    throw new ArgumentInvalidException('URL resolves to a private address');
  }
}
