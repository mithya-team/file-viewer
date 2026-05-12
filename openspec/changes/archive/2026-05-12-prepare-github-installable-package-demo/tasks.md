## 1. Package artifact contract

- [x] 1.1 Audit `packages/file-viewer` build output, package metadata, and runtime-owned assets against GitHub-install and built-artifact requirements
- [x] 1.2 Replace the package JS build with Vite library mode (or equivalent Rollup/Rolldown-backed bundling) while keeping TypeScript declaration emission for public types
- [x] 1.3 Update `packages/file-viewer` build/package configuration so the built artifact exposes the intended JS, types, exports, and packaged runtime assets
- [x] 1.4 Replace the current PDF worker post-build patching approach with bundler-managed worker asset emission
- [x] 1.5 Verify the built package does not need any extra packaged CSS artifact beyond current JS/types and runtime dependencies
- [x] 1.6 Remove any no-longer-needed post-build rewrite scripts once the bundler-managed artifact is in place
- [x] 1.7 Verify the built package no longer depends on workspace-only source paths at runtime

## 2. Demo built-package validation

- [x] 2.1 Replace demo source-alias/workspace-link-only consumption with built `@file-viewer/react` artifact consumption through a repo-local `file:` dependency
- [x] 2.2 Update demo Tailwind scanning and related wiring to target the installed/built package location
- [x] 2.3 Validate demo URL, Blob, base64, stream, and unsupported/error flows against the built package artifact, including worker-backed behavior

## 3. Consumer guidance and validation workflow

- [x] 3.1 Update `packages/file-viewer/README.md` with GitHub install, peer dependency, and Tailwind setup guidance that matches the built artifact
- [x] 3.2 Add or update repo validation steps/scripts so built-package checks cover the bundler output and emitted worker asset as part of normal demo/package verification
- [x] 3.3 Run the package build and demo validation flow and fix any packaging/export/style regressions found
