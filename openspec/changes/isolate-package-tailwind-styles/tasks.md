## 1. Isolated stylesheet generation

- [x] 1.1 Add FileViewer root identification for generated utility and runtime CSS scoping.
- [x] 1.2 Replace global Tailwind theme compilation and broad source serialization with inline private defaults and an explicit candidate generator.
- [x] 1.3 Scope generated/runtime CSS, privatize Tailwind implementation properties, and add the optional Tailwind v4 token bridge export.

## 2. Package contract and validation

- [x] 2.1 Update package exports, artifact verification, and stylesheet tests to enforce no global theme or unprefixed utility leakage.
- [x] 2.2 Add a custom-theme Tailwind v4 consumer integration fixture covering both CSS import orders and unrelated host utilities.
- [x] 2.3 Update README/help/docs with the single stylesheet import, optional bridge, import-order guarantee, bounded utility policy, and Glide alpha rationale.

## 3. Release checks

- [x] 3.1 Run focused tests, package build, artifact verification, host integration validation, and type checks.
