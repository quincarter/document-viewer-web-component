// src/workers/pdf.worker.ts

import { PDFiumDocument, PDFiumLibrary } from "@hyzyla/pdfium";

let pdfLibrary: PDFiumLibrary | null = null;
let currentDocument: PDFiumDocument | null = null;
let currentDocumentId: string | null = null;

/**
 * Handles incoming messages from the main thread.
 */
self.onmessage = async (event: MessageEvent<any>) => {
  const { type, payload, messageId } = event.data;

  try {
    switch (type) {
      case "init":
        if (!payload || !payload.wasmUrl) {
          throw new Error("WASM URL not provided for init.");
        }
        console.log("Initializing PDFium with WASM URL:", payload.wasmUrl);
        if (!pdfLibrary) {
          try {
            pdfLibrary = await PDFiumLibrary.init({
              wasmUrl: payload.wasmUrl,
            });
            console.log("PDFium initialization successful");
          } catch (error) {
            console.error("PDFium initialization failed:", error);
            throw error;
          }
        }
        self.postMessage({
          type: "libraryInitialized",
          success: true,
          messageId,
        });
        break;

      case "loadPdf":
        if (!pdfLibrary) {
          throw new Error(
            'PDF library not initialized. Send "init" message first.'
          );
        }
        if (!payload || !payload.pdfBuffer) {
          throw new Error("PDF buffer is required.");
        }

        // Ensure we have an ArrayBuffer
        let pdfBuffer: ArrayBuffer;
        if (payload.pdfBuffer instanceof ArrayBuffer) {
          pdfBuffer = payload.pdfBuffer;
        } else if (payload.pdfBuffer instanceof Uint8Array) {
          pdfBuffer = payload.pdfBuffer.buffer;
        } else {
          throw new Error(
            "Invalid PDF buffer type. Expected ArrayBuffer or Uint8Array."
          );
        }

        try {
          // Clean up existing document before loading new one
          if (currentDocument) {
            currentDocument = null;
            currentDocumentId = null;
          }

          // Convert to Uint8Array for PDFium
          const pdfData = new Uint8Array(pdfBuffer);

          // Attempt to load the document
          currentDocument = await pdfLibrary.loadDocument(pdfData);

          if (!currentDocument) {
            throw new Error("Failed to load PDF document - result was null.");
          }

          currentDocumentId = payload.documentId || `doc-${Date.now()}`;
          const pageCount = currentDocument.getPageCount();

          if (pageCount <= 0) {
            throw new Error("PDF document contains no pages.");
          }

          self.postMessage({
            type: "pdfLoaded",
            documentId: currentDocumentId,
            pageCount: pageCount,
            success: true,
            messageId,
          });
        } catch (error) {
          currentDocument = null;
          currentDocumentId = null;
          throw error;
        }
        break;

      case "renderPage":
        if (!pdfLibrary || !currentDocument) {
          throw new Error("No PDF document loaded or library not initialized.");
        }

        const { pageNumber, scale = 1.5 } = payload;

        // Validate page number
        if (pageNumber < 0 || pageNumber >= currentDocument.getPageCount()) {
          throw new Error(
            `Invalid page number: ${pageNumber}. Document has ${currentDocument.getPageCount()} pages.`
          );
        }

        try {
          // Get the page
          const page = currentDocument.getPage(pageNumber);

          // Get page size and calculate scaled dimensions
          const size = page.getSize();
          const width = Math.floor(size.width * scale);
          const height = Math.floor(size.height * scale);

          // Render the page with PDFium
          const renderResult = await page.render({
            render: "bitmap",
            width,
            height,
          });

          // Send back the rendered page
          const message = {
            type: "pageRendered",
            success: true,
            messageId,
            documentId: currentDocumentId,
            pageNumber,
            imageData: renderResult.data.buffer,
            width,
            height,
          };

          const transfer = [renderResult.data.buffer];

          // Use correct postMessage overload
          self.postMessage(message, { transfer });
        } catch (error) {
          console.error("Error rendering page:", error);
          self.postMessage({
            type: "pageRendered",
            success: false,
            messageId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error(`PDF Worker Error:`, error);
    self.postMessage({
      type: "error",
      messageId,
      error: {
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
    });
  }
};

// Optional: Handle unhandled promise rejections within the worker
self.addEventListener("unhandledrejection", (event) => {
  console.error("PDF Worker: Unhandled Promise Rejection:", event.reason);
  self.postMessage({
    type: "error",
    message: `Unhandled promise rejection: ${
      (event.reason as Error)?.message || event.reason
    }`,
    success: false,
  });
});

console.log("PDF Worker initialized and ready.");
