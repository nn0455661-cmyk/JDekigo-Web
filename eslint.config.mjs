import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
    ...nextCoreWebVitals,
    {
        rules: {
            // Existing client flows intentionally hydrate cached/local state in effects.
            "react-hooks/set-state-in-effect": "off",
            // React Compiler is not enabled; preserve the established callback behavior.
            "react-hooks/preserve-manual-memoization": "off",
        },
    },
    globalIgnores([
        ".next/**",
        ".git/**",
        "node_modules/**",
        "migration-runs/**",
        "logs/**",
        "public/**",
    ]),
]);
