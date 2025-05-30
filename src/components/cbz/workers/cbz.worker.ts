// src/workers/cbz.worker.ts

import JSZip from "jszip";
import type { JSZipObject } from "jszip";

let currentZip: JSZip | null = null;
let sortedImageFiles: JSZipObject[] = [];
let currentDocumentId: string | null = null;
let pendingOperations: Set<string> = new Set();
let isLoadingDocument: boolean = false;

// Add logging function to track state changes
function logStateChange(action: string, details: Record<string, any> = {}) {
  console.debug(`CBZ Worker - ${action}:`, {
    documentId: currentDocumentId,
    pendingOps: pendingOperations.size,
    isLoading: isLoadingDocument,
    ...details,
  });
}

const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp)$/i;

/**
 * A simple natural sort comparator for filenames.
 * Handles cases like "page1.jpg", "page02.jpg", "page10.jpg".
 */
function naturalSort(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g;
  const aParts = a.match(re) || [];
  const bParts = b.match(re) || [];

  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];

    if (isNaN(parseInt(aPart)) || isNaN(parseInt(bPart))) {
      // String comparison
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    } else {
      // Number comparison
      const aNum = parseInt(aPart);
      const bNum = parseInt(bPart);
      if (aNum < bNum) return -1;
      if (aNum > bNum) return 1;
    }
  }
  return aParts.length - bParts.length;
}

self.onmessage = async (event: MessageEvent<any>) => {
  const { type, payload, messageId } = event.data;

  try {
    switch (type) {
      case "init":
        // JSZip is pure JS, so init mainly confirms worker is ready.
        self.postMessage({
          type: "cbzWorkerInitialized",
          success: true,
          messageId,
        });
        break;

      case "loadCbz":
        isLoadingDocument = true;
        logStateChange("Starting document load", {
          newDocId: payload.documentId,
        });

        // Cancel any pending operations when loading a new document
        for (const opId of pendingOperations) {
          self.postMessage({
            type: "cancelled",
            messageId: opId,
            reason: "New document being loaded",
            success: false,
          });
        }
        pendingOperations.clear();

        // Payload: { archiveBuffer: ArrayBuffer, documentId?: string }
        if (!payload || !payload.archiveBuffer) {
          isLoadingDocument = false;
          throw new Error("CBZ archiveBuffer not provided.");
        }

        // Clean up existing resources
        currentZip = null;
        sortedImageFiles = [];
        currentDocumentId = null;

        currentZip = await JSZip.loadAsync(payload.archiveBuffer);
        currentDocumentId = payload.documentId || `cbz-doc-${Date.now()}`;
        sortedImageFiles = [];

        const filesInZip: JSZipObject[] = [];
        currentZip.forEach((_path, fileEntry) => {
          // Skip directories and non-image files
          if (
            !fileEntry.dir &&
            SUPPORTED_IMAGE_EXTENSIONS.test(fileEntry.name)
          ) {
            filesInZip.push(fileEntry);
          }
        });

        // Sort the image files alphanumerically/naturally by name
        sortedImageFiles = filesInZip.sort((a, b) =>
          naturalSort(a.name, b.name)
        );

        if (sortedImageFiles.length === 0) {
          throw new Error("No supported image files found in the CBZ archive.");
        }

        isLoadingDocument = false;
        logStateChange("Document load complete", {
          totalPages: sortedImageFiles.length,
        });

        self.postMessage({
          type: "cbzLoaded",
          documentId: currentDocumentId,
          totalPages: sortedImageFiles.length,
          success: true,
          messageId,
        });
        break;

      case "renderCbzPage":
        // Check if we're in the middle of loading a document
        if (isLoadingDocument) {
          logStateChange("Ignoring render during load", {
            requestedId: payload.documentId,
            requestedPage: payload.pageNumber,
          });
          return;
        }

        // Check if this operation is for the current document
        if (payload.documentId !== currentDocumentId) {
          logStateChange("Ignoring outdated render request", {
            requestedId: payload.documentId,
            requestedPage: payload.pageNumber,
          });
          return;
        }

        if (!currentZip || sortedImageFiles.length === 0) {
          throw new Error("No CBZ archive loaded or no images found.");
        }

        // Add this operation to pending set
        pendingOperations.add(messageId);
        logStateChange("Starting page render", {
          page: payload.pageNumber,
          messageId,
        });

        const pageNumber: number = payload.pageNumber;

        if (pageNumber < 0 || pageNumber >= sortedImageFiles.length) {
          throw new Error(
            `Invalid page number: ${pageNumber}. CBZ has ${sortedImageFiles.length} pages.`
          );
        }

        const imageFileEntry = sortedImageFiles[pageNumber];
        const imageBuffer = await imageFileEntry.async("arraybuffer");

        // Determine MIME type from extension for the main thread
        const extension = imageFileEntry.name
          .substring(imageFileEntry.name.lastIndexOf(".") + 1)
          .toLowerCase();
        let mimeType = "application/octet-stream"; // Default
        if (extension === "jpg" || extension === "jpeg")
          mimeType = "image/jpeg";
        else if (extension === "png") mimeType = "image/png";
        else if (extension === "gif") mimeType = "image/gif";
        else if (extension === "webp") mimeType = "image/webp";

        // Send raw image buffer and let main thread handle image creation
        self.postMessage(
          {
            type: "cbzPageRendered",
            documentId: currentDocumentId,
            pageNumber: pageNumber,
            imageData: imageBuffer,
            imageMimeType: mimeType,
            payload: payload, // Include the original payload so we keep isSecondPage
            success: true,
            messageId,
          },
          { transfer: [imageBuffer] } // Transfer the ArrayBuffer for better performance
        );

        // Remove the operation from pending set when complete
        pendingOperations.delete(messageId);
        logStateChange("Page render complete", {
          page: payload.pageNumber,
          messageId,
        });

        break;

      case "closeCbz": // Optional: if you want to explicitly clear resources
        pendingOperations.clear();
        currentZip = null;
        sortedImageFiles = [];
        currentDocumentId = null;
        self.postMessage({ type: "cbzClosed", success: true, messageId });
        break;

      default:
        console.warn(`CBZ Worker: Unknown message type "${type}"`);
        throw new Error(`Unknown message type received by CBZ worker: ${type}`);
    }
  } catch (error) {
    console.error("CBZ Worker Error:", error);
    self.postMessage({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "An unknown error occurred in CBZ worker.",
      originalType: type,
      success: false,
      messageId,
    });
  }
};

// Handle unhandled promise rejections within the worker
self.addEventListener("unhandledrejection", (event) => {
  console.error("CBZ Worker: Unhandled Promise Rejection:", event.reason);
  self.postMessage({
    type: "error",
    message: `Unhandled promise rejection in CBZ worker: ${
      (event.reason as Error)?.message || event.reason
    }`,
    success: false,
  });
});

console.log("CBZ Worker initialized and ready.");
