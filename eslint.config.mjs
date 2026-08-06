import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },

  /**
   * Type-aware rules.
   *
   * `next/typescript` runs the parser without a program, which makes every rule
   * that needs to know a type unavailable — including the one below. Turning on
   * the project service costs a slower lint and buys a class of bug that tests
   * catch only by luck.
   */
  {
    // `.ts`/`.tsx` only — tsconfig includes exactly those, so the build tools
    // written as `.mjs` have no program to be type-checked against.
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      /*
        `a ? a : b` and `a || b` fire on every falsy value; `a ?? b` fires only
        on null and undefined. The difference is invisible until a legitimate 0
        or "" passes through, and then the function silently does the opposite
        of what it says.

        This is here because it happened: the substitution ranker read
        `options.limit ? slice(0, limit) : all`, so asking for zero results
        returned all of them. A test caught it, but only because one was
        written for a case that looked too boring to test. This rule catches
        the whole family without anyone having to think of the case.
      */
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignoreTernaryTests: false },
      ],
    },
  },
];

export default eslintConfig;
