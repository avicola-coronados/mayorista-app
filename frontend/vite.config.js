var _a, _b, _c, _d;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var buildId = (_d = (_b = (_a = process.env.VERCEL_GIT_COMMIT_SHA) === null || _a === void 0 ? void 0 : _a.slice(0, 7)) !== null && _b !== void 0 ? _b : (_c = process.env.GITHUB_SHA) === null || _c === void 0 ? void 0 : _c.slice(0, 7)) !== null && _d !== void 0 ? _d : "local";
export default defineConfig({
    plugins: [react()],
    define: {
        __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    server: {
        port: 5173,
    },
});
