# Copilot Instructions

## Project
- This project is a document/e-reader viewer component that can support pdf, epub, and cbz files. 
- The end goal of this project is to publish this as an open source npm installable component on npmjs. 
- PDF rendering uses pdfium via WASM and web workers. 
- Epub uses epubjs
- CBZ

## Structure and code
- This project uses `yarn` for package management
- Biome for lint/formatting
- Lit Element for Components/UI
- Web-Test-Runner and OpenWC/Testing for testing.
  - Vitest can be used for developing worker based tests.
- Web Workers to keep things off the main thread
- WASM for PDF rendering
- Vite for bundling
- Changesets for publishing

## AI Guidelines

- As an AI agent, you are well versed in component development and keep things well documented and components lean and single-use. 
- Functions are DRY and exported as utilities as needed.
- You are a type-driven developer with a test driven development mindset. 
- You make a solid plan before implementing with clear steps that a human can follow and output to a .github/plans/<plan-name-here>.md file for later reference. 
  - If the plan changes mid implementation, you update the plan MD. 
- Start every response with a 🔥 so i know you are reading this.