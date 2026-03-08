import { defineConfig, mergeConfig } from "vitest/config";
import type { Plugin, UserConfig } from "vite";
import viteConfigFn from "./vite.config";

// Resolve the vite config function to a plain object for merging
const viteConfig =
  typeof viteConfigFn === "function"
    ? (viteConfigFn({ command: "serve", mode: "test" }) as UserConfig)
    : viteConfigFn;

/**
 * Stubs Vite-specific worker/URL/WASM imports in the test environment.
 * These imports require a real browser Worker API which happy-dom doesn't provide.
 */
function viteWorkerStubPlugin(): Plugin {
  return {
    name: "vitest-worker-stub",
    enforce: "pre",
    resolveId(source) {
      if (
        source.includes("?worker") ||
        source.includes("?url") ||
        source.includes("?inline")
      ) {
        return `\0virtual:worker-stub:${source}`;
      }
    },
    load(id) {
      if (id.startsWith("\0virtual:worker-stub:")) {
        if (id.includes("?url")) {
          return 'export default "/mock-asset-url";';
        }
        return `export default class MockWorker {
					postMessage() {}
					terminate() {}
					addEventListener() {}
					removeEventListener() {}
					onmessage = null;
					onerror = null;
				}`;
      }
    },
  };
}

export default mergeConfig(
  viteConfig,
  defineConfig({
    plugins: [viteWorkerStubPlugin()],
    test: {
      include: ["tests/**/*.{test,vitest}.ts"],
      environment: "happy-dom",
    },
  }),
);
