import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from '../repositories/users.repository';

describe('UsersService', () => {
  let service: UsersService;

  const mockDeductCredit = jest.fn();
  const mockRefundCredit = jest.fn();
  const mockFindById = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            deductCredit: mockDeductCredit,
            refundCredit: mockRefundCredit,
            findById: mockFindById,
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deberia estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deberia llamar al repositorio para deducir creditos', async () => {
    mockDeductCredit.mockResolvedValue(true);
    const result = await service.deductCredit('user-123');
    expect(result).toBe(true);
    expect(mockDeductCredit).toHaveBeenCalledWith('user-123');
  });

  it('deberia llamar al repositorio para reembolsar creditos', async () => {
    mockRefundCredit.mockResolvedValue(undefined);
    await service.refundCredit('user-123');
    expect(mockRefundCredit).toHaveBeenCalledWith('user-123');
  });
});
