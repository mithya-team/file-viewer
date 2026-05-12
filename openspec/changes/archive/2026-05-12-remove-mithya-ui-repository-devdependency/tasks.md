## 1. Dependency cleanup

- [x] 1.1 Remove `@mithya/ui-registry` from the root and `packages/file-viewer` manifests, then update the lockfile
- [x] 1.2 Verify no package scripts, source files, or install flows still reference Mithya tooling

## 2. Guidance and validation

- [x] 2.1 Update any package distribution docs or validation steps that still imply Mithya setup is required
- [x] 2.2 Run targeted validation for install/build/package-artifact flows without the Mithya dependency
