import { URL } from 'url';
import * as dns from 'dns';
import * as net from 'net';
import { BadRequestException } from '@nestjs/common';

// Private and reserved IP ranges that must be blocked (SSRF prevention)
const BLOCKED_IPV4_RANGES = [
  { network: '10.0.0.0', prefix: 8 }, // RFC 1918 Class A
  { network: '172.16.0.0', prefix: 12 }, // RFC 1918 Class B
  { network: '192.168.0.0', prefix: 16 }, // RFC 1918 Class C
  { network: '127.0.0.0', prefix: 8 }, // Loopback
  { network: '169.254.0.0', prefix: 16 }, // Link-local
  { network: '0.0.0.0', prefix: 8 }, // Current network
  { network: '100.64.0.0', prefix: 10 }, // Shared address space (RFC 6598)
  { network: '198.18.0.0', prefix: 15 }, // Benchmark testing (RFC 2544)
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
  '169.254.169.254',
];

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

function isInRange(ip: string, network: string, prefix: number): boolean {
  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

function isBlockedIPv4(ip: string): boolean {
  return BLOCKED_IPV4_RANGES.some((range) =>
    isInRange(ip, range.network, range.prefix),
  );
}

function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' || // Loopback
    normalized.startsWith('fc') || // Unique local (fc00::/7)
    normalized.startsWith('fd') || // Unique local (fc00::/7)
    normalized.startsWith('fe80') // Link-local
  );
}

function resolveHostname(hostname: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    dns.resolve(hostname, (err, addresses) => {
      if (err) {
        dns.lookup(hostname, { all: true }, (lookupErr, results) => {
          if (lookupErr) {
            reject(new Error(`Cannot resolve hostname: ${hostname}`));
            return;
          }
          resolve(results.map((r) => r.address));
        });
        return;
      }
      resolve(addresses);
    });
  });
}

export async function validateUrlSecurity(
  url: string,
  fieldName: string,
  requireHttps = false,
): Promise<void> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException(`${fieldName}: Invalid URL format`);
  }

  // Check scheme
  if (requireHttps && parsed.protocol !== 'https:') {
    throw new BadRequestException(`${fieldName}: HTTPS is required`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException(
      `${fieldName}: Only HTTP and HTTPS protocols are allowed`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new BadRequestException(
      `${fieldName}: URL points to a restricted address`,
    );
  }

  // If hostname is already an IP, check it directly
  if (net.isIPv4(hostname)) {
    if (isBlockedIPv4(hostname)) {
      throw new BadRequestException(
        `${fieldName}: URL points to a private or reserved IP address`,
      );
    }
    return;
  }

  if (net.isIPv6(hostname)) {
    if (isBlockedIPv6(hostname)) {
      throw new BadRequestException(
        `${fieldName}: URL points to a private or reserved IP address`,
      );
    }
    return;
  }

  // Resolve DNS and check all resulting IPs
  let addresses: string[];
  try {
    addresses = await resolveHostname(hostname);
  } catch {
    throw new BadRequestException(`${fieldName}: Unable to resolve hostname`);
  }

  for (const address of addresses) {
    if (net.isIPv4(address) && isBlockedIPv4(address)) {
      throw new BadRequestException(
        `${fieldName}: URL resolves to a private or reserved IP address`,
      );
    }
    if (net.isIPv6(address) && isBlockedIPv6(address)) {
      throw new BadRequestException(
        `${fieldName}: URL resolves to a private or reserved IP address`,
      );
    }
  }
}
