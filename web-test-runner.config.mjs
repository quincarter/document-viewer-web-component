import { esbuildPlugin } from "@web/dev-server-esbuild";
import { playwrightLauncher } from "@web/test-runner-playwright";

/**
 * Custom plugin to handle Vite-specific import syntax that esbuild doesn't understand.
 * Rewrites ?worker&inline, ?url, and ?worker imports to return stubs.
 */
function viteImportStubPlugin() {
  return {
    name: "vite-import-stub",
    transformImport({ source }) {
      // Strip Vite query params from imports
      if (
        source?.includes("?worker") ||
        source?.includes("?url") ||
        source?.includes("?inline")
      ) {
        return `data:text/javascript,export default class MockWorker { postMessage() {} terminate() {} addEventListener() {} removeEventListener() {} onmessage = null; onerror = null; }`;
      }
    },
    transform(context) {
      // Also handle wasm imports from @hyzyla/pdfium
      if (context.path?.includes("pdfium.wasm")) {
        return {
          body: 'export default "/mock-pdfium.wasm";',
          headers: { "content-type": "application/javascript" },
        };
      }
    },
  };
}

export default {
  files: "tests/**/*.test.ts",
  nodeResolve: true,
  plugins: [
    viteImportStubPlugin(),
    esbuildPlugin({
      ts: true,
      target: "auto",
      esbuildConfig: {
        tsconfigRaw: JSON.stringify({
          compilerOptions: {
            experimentalDecorators: true,
            useDefineForClassFields: false,
          },
        }),
      },
    }),
  ],
  browsers: [playwrightLauncher({ product: "chromium" })],
  testFramework: {
    config: {
      timeout: 10000,
    },
  },
};
