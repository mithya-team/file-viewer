# Future Work

## Current Notes

- Demo fixtures are already present in `apps/demo/public/sample-files` for `txt`, `csv`, `jpg`, `pdf`, `docx`, `dotx`, `xlsx`, `pptx` (sample-4, sample-5).
- Some tooling views may omit binary fixtures. Treat the on-disk demo folder as source of truth.
- Shipping separate package CSS/tokens is deferred. Current styling uses Tailwind classes plus CSS variable fallbacks in component code.

## Remaining Work

- Decide publish posture: keep private vs prep for publish. If publish, finalize package metadata and export surface.
- Add publish-focused consumer guidance once the publish posture is decided.
- Harden runtime behavior: validate SSR-safe import boundaries and improve browser-only failure handling where needed.
- Revisit performance if needed: heavy parsing can move off main thread later.

## Explicitly Later

- custom renderer registration
- progressive rendering
