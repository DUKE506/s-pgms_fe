import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // shadcn/ui 컴포넌트가 컴포넌트와 함께 variants(cva) 상수를 같이
      // export하는 패턴을 표준으로 씀 (예: Button + buttonVariants)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])
