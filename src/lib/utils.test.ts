import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn utility", () => {
  it("merges class names", () => {
    const result = cn("text-red-500", "text-blue-500")
    expect(result).toBe("text-blue-500")
  })

  it("handles conditional classes", () => {
    const result = cn("base", true && "active", false && "inactive")
    expect(result).toBe("base active")
  })

  it("handles undefined and null", () => {
    const result = cn("base", undefined, null, "extra")
    expect(result).toBe("base extra")
  })

  it("handles empty string", () => {
    const result = cn("")
    expect(result).toBe("")
  })

  it("merges Tailwind classes correctly", () => {
    const result = cn("px-4 py-2", "px-8")
    expect(result).toBe("py-2 px-8")
  })
})
