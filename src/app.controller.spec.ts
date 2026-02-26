import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  const mockHealthCheck = jest.fn();

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: { healthCheck: mockHealthCheck },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('deberia retornar informacion del sistema', async () => {
      const mockResponse = {
        'node-version': 'v22.0.0',
        memory: { rss: 1000, heapTotal: 500, heapUsed: 300, external: 100 },
        pid: 1234,
        uptime: 60,
        appName: 'take-home',
        appVersion: '0.2.0',
      };
      mockHealthCheck.mockResolvedValue(mockResponse);

      const result = await appController.getHello();

      expect(mockHealthCheck).toHaveBeenCalled();
      expect(result).toHaveProperty('node-version');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('pid');
      expect(result).toHaveProperty('uptime');
    });
  });
});
