import { vi } from "vitest"

type MockDoc = { _id: string; _creationTime: number; [key: string]: unknown }

// Mock Convex database
export function createMockDb() {
  const storage = new Map<string, MockDoc>()
  let idCounter = 0

  const generateId = (table: string) => {
    idCounter++
    return `${table}:${idCounter}:${Date.now()}`
  }

  return {
    insert: vi.fn(async (table: string, data: Record<string, unknown>) => {
      const id = generateId(table)
      storage.set(id, { _id: id, _creationTime: Date.now(), ...data })
      return id
    }),
    patch: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const existing = storage.get(id)
      if (existing) {
        storage.set(id, { ...existing, ...data })
      }
    }),
    delete: vi.fn(async (id: string) => {
      storage.delete(id)
    }),
    get: vi.fn(async (id: string) => {
      return storage.get(id) ?? null
    }),
    query: vi.fn((table: string) => ({
      withIndex: vi.fn((_indexName: string, _filterFn?: unknown) => ({
        eq: vi.fn().mockReturnThis(),
        collect: vi.fn(async () => {
          const results: unknown[] = []
          for (const [, value] of storage) {
            if (value._id?.startsWith(table + ":")) {
              results.push(value)
            }
          }
          return results
        }),
        first: vi.fn(async () => {
          for (const [, value] of storage) {
            if (value._id?.startsWith(table + ":")) {
              return value
            }
          }
          return null
        }),
        unique: vi.fn(async () => {
          for (const [, value] of storage) {
            if (value._id?.startsWith(table + ":")) {
              return value
            }
          }
          return null
        }),
      })),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      take: vi.fn(async () => []),
      collect: vi.fn(async () => {
        const results: unknown[] = []
        for (const [, value] of storage) {
          if (value._id?.startsWith(table + ":")) {
            results.push(value)
          }
        }
        return results
      }),
    })),
    _storage: storage,
  }
}

// Mock Convex context
export function createMockCtx(db?: ReturnType<typeof createMockDb>) {
  const mockDb = db ?? createMockDb()
  return {
    db: mockDb,
  }
}

type TestUserOverrides = {
  clerkId?: string
  email?: string
  name?: string
  role?: "admin" | "coach" | "user"
  createdAt?: number
  updatedAt?: number
}

// Helper to create test user
export function createTestUser(overrides?: TestUserOverrides) {
  return {
    clerkId: "clerk_test_user_123",
    email: "test@example.com",
    name: "Test User",
    role: "user" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

// Helper to create test coach
export function createTestCoach(overrides?: TestUserOverrides) {
  return createTestUser({
    clerkId: "clerk_test_coach_123",
    email: "coach@example.com",
    name: "Test Coach",
    role: "coach",
    ...overrides,
  })
}

// Helper to create test plan
export function createTestPlan(overrides?: Record<string, unknown>) {
  return {
    coachId: "users:1",
    clientId: "users:2",
    title: "Test Plan",
    description: "A test workout plan",
    exercises: [],
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    status: "active" as const,
    ...overrides,
  }
}
