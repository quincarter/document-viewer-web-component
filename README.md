# Document Viewer Web Component

This project's goal is to give an all in one approach to rendering documents. Have you ever been overwhelemed developing a product that needs support for more than one file type? Well this document viewer should eventually be the go to for you once i build the remaining support for the remaining file types!

- The PDF Viewer is using a wasm binary for rendering that is highly optimized for rendering. 
- The ePub viewer is written entirely in javascript and runs very fast, rendering pages as html for easy highlighting and manipulation.

## Support

Document support is as follows:
- PDF - Supported
- ePub - Supported
- CBZ (Comic Books) - Coming soon
- Office Files - Coming Soon (doc/docx/ppt/pptx)

## Development

```bash
yarn && yarn start
```

### Building

```bash
yarn build
```
