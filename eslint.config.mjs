import { createRequire } from "node:module"
import babelEslintParser from "next/dist/compiled/babel/eslint-parser.js"

const require = createRequire(import.meta.url)

export default [
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "pnpm-lock.yaml",
      "**/*.d.ts",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: babelEslintParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: [require.resolve("next/babel")],
        },
      },
    },
    rules: {},
  },
]
