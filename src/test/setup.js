import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom no implementa matchMedia (lo usa el tema claro/oscuro).
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}
