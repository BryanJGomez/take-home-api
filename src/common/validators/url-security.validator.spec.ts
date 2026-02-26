import { validateUrl } from './url-security.validator';
import * as dns from 'dns/promises';

// Mock de dns para controlar las resoluciones sin red real
jest.mock('dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockedDns = dns as jest.Mocked<typeof dns>;

describe('validateUrl (SSRF)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validacion de formato y protocolo', () => {
    it('deberia rechazar URLs invalidas', async () => {
      await expect(validateUrl('not-a-url')).rejects.toThrow(
        'Invalid URL format',
      );
    });

    it('deberia rechazar protocolos no HTTP', async () => {
      await expect(validateUrl('ftp://example.com/file')).rejects.toThrow(
        'Only HTTP and HTTPS are allowed',
      );
    });

    it('deberia exigir HTTPS cuando requireHttps es true', async () => {
      await expect(
        validateUrl('http://example.com/webhook', true),
      ).rejects.toThrow('HTTPS is required');
    });

    it('deberia aceptar HTTPS cuando requireHttps es true', async () => {
      mockedDns.lookup.mockResolvedValue({
        address: '93.184.216.34',
        family: 4,
      });
      await expect(
        validateUrl('https://example.com/webhook', true),
      ).resolves.not.toThrow();
    });
  });

  describe('validacion de hosts bloqueados', () => {
    it('deberia bloquear localhost', async () => {
      await expect(validateUrl('http://localhost/admin')).rejects.toThrow(
        'restricted address',
      );
    });

    it('deberia bloquear metadata de cloud (169.254.169.254)', async () => {
      await expect(
        validateUrl('http://169.254.169.254/latest/meta-data'),
      ).rejects.toThrow('restricted address');
    });

    it('deberia bloquear metadata.google.internal', async () => {
      await expect(
        validateUrl('http://metadata.google.internal/computeMetadata'),
      ).rejects.toThrow('restricted address');
    });
  });

  describe('validacion de rangos privados RFC 1918', () => {
    const privateIPs = [
      { ip: '10.0.0.1', range: '10.x.x.x' },
      { ip: '172.16.0.1', range: '172.16.x.x' },
      { ip: '172.31.255.1', range: '172.31.x.x' },
      { ip: '192.168.1.1', range: '192.168.x.x' },
      { ip: '127.0.0.1', range: '127.x.x.x (loopback)' },
      { ip: '169.254.1.1', range: '169.254.x.x (link-local)' },
    ];

    it.each(privateIPs)(
      'deberia bloquear IP privada $ip ($range)',
      async ({ ip }) => {
        mockedDns.lookup.mockResolvedValue({ address: ip, family: 4 });

        await expect(
          validateUrl('http://internal-service.company.com'),
        ).rejects.toThrow('private address');
      },
    );
  });

  describe('URLs validas', () => {
    it('deberia aceptar una URL publica valida', async () => {
      mockedDns.lookup.mockResolvedValue({
        address: '93.184.216.34',
        family: 4,
      });

      await expect(
        validateUrl('https://example.com/photo.jpg'),
      ).resolves.not.toThrow();
    });

    it('deberia rechazar URLs con hostname que no resuelve', async () => {
      mockedDns.lookup.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(
        validateUrl('https://nonexistent.invalid/path'),
      ).rejects.toThrow('Unable to resolve hostname');
    });
  });
});
