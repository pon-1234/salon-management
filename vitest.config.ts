import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // ワーカー数を制限してメモリ使用量を削減
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // シングルスレッドで実行
      },
    },
    // または以下のオプションでワーカー数を制限
    // maxWorkers: 1,
    // minWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '.next/',
        'public/',
        '**/*.mjs',
        '**/ui/**', // shadcn/ui components (already tested upstream)
        'app/layout.tsx',
        'styles/globals.css',
        'lib/utils.ts', // utility functions
      ],
      thresholds: {
        branches: 55,
        functions: 55,
        lines: 55,
        statements: 55,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
