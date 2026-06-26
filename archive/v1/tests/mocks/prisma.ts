import { vi } from "vitest";

// Mock Prisma client for unit tests
export const mockPrisma = {
  content: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  legalRepresentation: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  representationAcceptance: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  identity: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  identityEmail: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  identityPhone: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  identityDomain: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mailingAddress: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  apiKey: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
};

// Helper to reset all mocks
export function resetPrismaMocks() {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === "object" && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === "function" && "mockReset" in method) {
          (method as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    }
  });
}
