import { createHmac } from 'crypto';
import { WebhookService } from './webhook.service';
import { HttpService } from '../../../common/http';

describe('WebhookService', () => {
  let service: WebhookService;

  const mockRequestWithRetry = jest.fn();

  beforeEach(() => {
    service = new WebhookService({
      requestWithRetry: mockRequestWithRetry,
    } as unknown as HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sign', () => {
    it('deberia generar una firma HMAC-SHA256 valida', () => {
      const payload = '{"jobId":"123","status":"completed"}';
      const secret = 'my-webhook-secret';
      const timestamp = '1700000000000';
      const message = `${timestamp}.${payload}`;

      const result = service.sign(message, secret);

      // Verificamos que la firma coincide con la esperada
      const expected = createHmac('sha256', secret)
        .update(message)
        .digest('hex');
      expect(result).toBe(expected);
    });

    it('deberia generar firmas diferentes para payloads diferentes', () => {
      const secret = 'my-webhook-secret';
      const sig1 = service.sign('payload-1', secret);
      const sig2 = service.sign('payload-2', secret);
      expect(sig1).not.toBe(sig2);
    });

    it('deberia generar firmas diferentes para secrets diferentes', () => {
      const payload = 'same-payload';
      const sig1 = service.sign(payload, 'secret-1');
      const sig2 = service.sign(payload, 'secret-2');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('deliver', () => {
    it('deberia entregar el webhook exitosamente e incluir headers de firma', async () => {
      mockRequestWithRetry.mockResolvedValue({
        success: true,
        attempts: 1,
        response: { ok: true, status: 200, body: 'OK' },
      });

      const result = await service.deliver({
        url: 'https://cliente.com/webhook',
        payload: { jobId: 'job_123', status: 'completed' },
        secret: 'my-secret',
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);

      // Verificamos que se enviaron los headers correctos
      const callArgs = mockRequestWithRetry.mock.calls[0];
      const requestOptions = callArgs[0];
      expect(requestOptions.headers).toHaveProperty('X-Signature');
      expect(requestOptions.headers).toHaveProperty('X-Timestamp');
      expect(requestOptions.method).toBe('POST');
      expect(requestOptions.url).toBe('https://cliente.com/webhook');
    });

    it('deberia reportar fallo cuando el webhook no responde', async () => {
      mockRequestWithRetry.mockResolvedValue({
        success: false,
        attempts: 3,
        error: 'Exhausted 3 retries',
      });

      const result = await service.deliver({
        url: 'https://cliente.com/webhook',
        payload: { jobId: 'job_123', status: 'failed' },
        secret: 'my-secret',
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toContain('Exhausted');
    });

    it('deberia configurar retry solo para errores 5xx', async () => {
      mockRequestWithRetry.mockResolvedValue({
        success: false,
        attempts: 1,
        response: { ok: false, status: 400, body: 'Bad Request' },
        error: 'Non-retryable status: 400',
      });

      await service.deliver({
        url: 'https://cliente.com/webhook',
        payload: { jobId: 'job_123', status: 'completed' },
        secret: 'my-secret',
      });

      // Verificamos que la funcion de retry solo acepta 5xx
      const retryOptions = mockRequestWithRetry.mock.calls[0][1];
      expect(retryOptions.maxRetries).toBe(3);
      expect(retryOptions.baseDelayMs).toBe(1000);
      // 4xx no es retryable
      expect(retryOptions.retryOnStatusCodes(400)).toBe(false);
      expect(retryOptions.retryOnStatusCodes(404)).toBe(false);
      // 5xx si es retryable
      expect(retryOptions.retryOnStatusCodes(500)).toBe(true);
      expect(retryOptions.retryOnStatusCodes(503)).toBe(true);
    });
  });
});
