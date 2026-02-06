import { defineConfig } from 'vitest/config'
import type { ConfigEnv, UserConfigExport } from 'vite'
import viteConfig from './vite.config'

const resolveViteConfig = async (env: ConfigEnv) => {
  const config = viteConfig as UserConfigExport
  if (typeof config === 'function') return await config(env)
  return await config
}

export default defineConfig(async (env) => {
  const base = await resolveViteConfig(env)
  return {
    ...base,
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
      exclude: ['node_modules', 'dist'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{js,ts,vue}'],
        exclude: [
          'node_modules',
          'src/**/*.d.ts',
          'src/**/*.spec.ts',
          'src/**/*.test.ts',
          'src/main.ts'
        ],
        thresholds: {
          global: {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80
          }
        }
      },
      setupFiles: ['./src/__tests__/setup.ts']
    }
  }
})
