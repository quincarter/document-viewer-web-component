# Extending the Document Viewer

This document describes how to extend the document viewer system to support new file types.

## Architecture Overview

The document viewer uses a modular architecture with three main components:

- **Document Router** (`document-viewer.ts`): Handles file type detection and routing
- **Individual Viewers**: Specialized components for specific file types
- **Main Interface** (`my-element.ts`): High-level user interface component

### Key Features

- **Modular Design**: Each viewer is independent and can be maintained separately
- **Smart File Detection**: Uses file signatures (magic numbers) to identify file types
- **Extensible**: Easy to add support for new file formats
- **Error Handling**: Built-in error handling for unsupported formats and loading issues

## Adding a New File Type

### 1. Create a New Viewer Component

Create a new component in the appropriate directory. For example, for CBZ support:

```typescript
// src/components/cbz/cbz-viewer.ts
@customElement("cbz-viewer")
export class CbzViewer extends LitElement {
  @property({ type: String })
  src: string | null = null;

  // Implement your viewer...
}
```

### 2. Update Supported File Types

In `document-viewer.ts`, add your new file type to the type definition:

```typescript
type SupportedFileType = "pdf" | "epub" | "cbz" | "unknown";
```

### 3. Add File Type Detection

In the `determineFileType` method of `document-viewer.ts`, add your file signature detection:

```typescript
// Check for CBZ signature (ZIP file with .cbz extension)
const isCBZ =
  buffer.byteLength > 58 &&
  String.fromCharCode(...new Uint8Array(buffer.slice(0, 4))) === "PK\x03\x04" &&
  this.src.toLowerCase().endsWith(".cbz");

if (isCBZ) {
  this.fileType = "cbz";
}
```

### 4. Add Viewer Routing

In the `renderViewer` method of `document-viewer.ts`, add a case for your new file type:

```typescript
private renderViewer() {
  switch (this.fileType) {
    // ... existing cases ...
    case 'cbz':
      return html`<cbz-viewer .src=${this.src}></cbz-viewer>`;
  }
}
```

### 5. Import the New Viewer

Add an import statement in `document-viewer.ts`:

```typescript
import "./cbz/cbz-viewer";
```

## Best Practices

1. **File Organization**:

   - Place viewer components in dedicated folders
   - Keep related utilities and styles together
   - Use consistent naming conventions

2. **Component Design**:

   - Implement consistent interfaces across viewers
   - Handle loading states and errors
   - Support common features (zoom, navigation, etc.)

3. **File Type Detection**:

   - Use reliable file signatures when possible
   - Consider multiple detection methods (extension + signature)
   - Handle edge cases and corrupted files

4. **Error Handling**:
   - Provide meaningful error messages
   - Handle loading and parsing errors gracefully
   - Include fallback behaviors

## Example Implementation

For a complete example of how to implement a new viewer, see the existing implementations:

- PDF Viewer: `src/components/pdf/pdf-viewer.ts`
- EPUB Viewer: `src/components/epub/epub-viewer.ts`

These provide good templates for creating new viewer components while maintaining consistency across the application.
