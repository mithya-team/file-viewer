## 1. PdfRenderer loading UI

- [x] 1.1 Replace `pageCount === 0` loading gate with `pdfDocument == null`
- [x] 1.2 Show `Page {page} / {pageCount}` only when `pdfDocument != null`

## 2. Tests

- [x] 2.1 Add unit test: `Loading PDF...` visible while `getDocument` promise is pending
- [x] 2.2 Add unit test: page indicator hidden during load, shown after resolve
- [x] 2.3 Add unit test: loading UI returns when `blob` prop changes (before new doc loads)

## 3. Verification

- [x] 3.1 Run `pnpm test` in `packages/file-viewer`
