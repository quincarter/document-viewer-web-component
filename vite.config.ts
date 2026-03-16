// vite.config.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

/**
 * Resolves `@hyzyla/pdfium/pdfium.wasm?url` to a base64 data URL at build time.
 * This avoids publishing Vite-specific `?url` imports that break for consumers
 * using non-Vite bundlers.
 */
function pdfiumWasmInlinePlugin(): Plugin {
	return {
		name: "pdfium-wasm-inline",
		enforce: "pre",
		resolveId(source) {
			if (source.includes("pdfium.wasm") && source.includes("?url")) {
				return "\0pdfium-wasm-url";
			}
		},
		load(id) {
			if (id === "\0pdfium-wasm-url") {
				const wasmPath = resolve(
					"node_modules/@hyzyla/pdfium/dist/pdfium.wasm",
				);
				const wasmBuffer = readFileSync(wasmPath);
				const base64 = wasmBuffer.toString("base64");
				return `export default "data:application/wasm;base64,${base64}";`;
			}
		},
	};
}

export default defineConfig(({ mode }) => {
	const isDemo = mode === "demo";

	return {
		base: isDemo ? "/document-viewer-web-component/" : "/",
		plugins: [
			pdfiumWasmInlinePlugin(),
			wasm(),
			topLevelAwait(),
			...(!isDemo
				? [
						dts({
							include: ["src"],
							outDir: "lib",
							rollupTypes: false,
							tsconfigPath: "./tsconfig.json",
						}),
					]
				: []),
		],
		worker: {
			format: "es" as const,
			plugins: () => [wasm(), topLevelAwait()],
		},
		optimizeDeps: {
			exclude: ["@hyzyla/pdfium"],
		},
		build: isDemo
			? {
					target: "esnext",
					outDir: "dist",
				}
			: {
					target: "esnext",
					outDir: "lib",
					copyPublicDir: false,
					lib: {
						entry: resolve(__dirname, "src/index.ts"),
						formats: ["es"],
						fileName: "index",
					},
					rollupOptions: {
						external(id) {
							// Let Vite resolve worker/url/inline imports
							if (
								id.includes("?worker") ||
								id.includes("?inline") ||
								id.includes("?url")
							) {
								return false;
							}
							if (id === "lit" || id.startsWith("lit/")) return true;
							if (id === "epubjs") return true;
							if (id === "jszip") return true;
							if (id === "@hyzyla/pdfium" || id.startsWith("@hyzyla/pdfium/"))
								return true;
							return false;
						},
						output: {
							preserveModules: true,
							preserveModulesRoot: "src",
							entryFileNames: "[name].js",
						},
					},
				},
		assetsInclude: ["**/*.wasm", "**/*.pdf"],
		server: {
			fs: {
				allow: [".."],
			},
			headers: {
				"*.pdf": {
					"Content-Type": "application/pdf",
				},
			},
		},
	};
});
