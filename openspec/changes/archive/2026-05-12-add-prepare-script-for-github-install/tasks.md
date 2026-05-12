## 1. Package lifecycle wiring

- [x] 1.1 Add a shared build-script entrypoint in `packages/file-viewer/package.json` and have `prepare` invoke it for git installs
- [x] 1.2 Ensure the install hook does not depend on a consumer-global `pnpm` binary

## 2. Guidance and validation

- [x] 2.1 Update `packages/file-viewer/README.md` so GitHub install guidance matches lifecycle-built package behavior
- [x] 2.2 Validate that a git-style install path works without committed `dist`, while normal package build verification still passes
