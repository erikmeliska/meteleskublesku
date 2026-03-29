import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Polyfill scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock next/cache globally - revalidateTag/revalidatePath require Next.js runtime
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}));
