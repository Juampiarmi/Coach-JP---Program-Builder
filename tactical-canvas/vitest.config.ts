import { defineConfig } from 'vitest/config'

/** Tests unitarios (lógica pura: parser, prompts, IA, doctor). Los e2e corren con Playwright. */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
