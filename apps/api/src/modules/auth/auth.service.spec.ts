import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;

  const mockDb = {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: "1", code: "123456" }]),
      }),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockRedis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };
  const mockExolve = { sendSms: jest.fn().mockResolvedValue(true) };
  const mockTelegram = { sendCode: jest.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: "DATABASE", useValue: mockDb },
        { provide: "REDIS", useValue: mockRedis },
        { provide: "EXOLVE_PROVIDER", useValue: mockExolve },
        { provide: "TELEGRAM_PROVIDER", useValue: mockTelegram },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                JWT_SECRET: "test-secret-min-16-chars",
                JWT_ACCESS_TTL: "15m",
                JWT_REFRESH_TTL: "90d",
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should generate a 6-digit code", () => {
    const code = (service as any).generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });
});
