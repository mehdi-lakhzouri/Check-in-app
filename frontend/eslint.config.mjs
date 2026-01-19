import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
  ]),
  // Custom rules for production readiness
  {
    rules: {
      // Allow explicit any in specific cases (API responses, etc.)
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Relax unused vars - prefix with underscore to ignore
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      
      // Allow anonymous default exports
      "import/no-anonymous-default-export": "off",
      
      // Relax react hooks exhaustive deps - sometimes intentional
      "react-hooks/exhaustive-deps": "warn",
      
      // Allow setState in effects (sometimes needed for complex state machines)
      "react-hooks/set-state-in-effect": "off",
      
      // Allow empty interfaces extending other types
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
]);

export default eslintConfig;
