## Context

The EmbedPDF adapter opens a document before its virtual scroll layout is usable. `FileViewer` can therefore accept a page command, update its chrome state, and call `scrollToPage` before EmbedPDF has a target offset. Separately, EmbedPDF's React `useZoom` hook returns a newly scoped capability object on each render. Depending on that object causes an unchanged zoom request after every page update, and EmbedPDF treats each request as a scroll/layout mutation.

## Goals / Non-Goals

**Goals:**

- Execute every accepted PDF page command once the document's scroll layout can accept it.
- Preserve latest-request-wins, same-page re-jumps, user-scroll page reporting, and settled-navigation callbacks.
- Apply a zoom level once per real page or zoom change without creating a render/scroll loop.

**Non-Goals:**

- Change public chrome APIs, navigation animation choice, or EmbedPDF dependency versions.
- Rework PDF rendering, search behavior, or FileViewer state ownership.

## Decisions

### 1. Use EmbedPDF layout-ready as the navigation boundary

The adapter will treat the scroll plugin's layout-ready signal—not PDF parse completion—as proof that a page has a usable virtual position. It will retain only the latest `{ intent, page }` command until that boundary, then issue `scrollToPage`. A command remains pending until it has been dispatched, so an early command cannot be lost.

**Alternative considered:** retry on an arbitrary timer. Rejected because timing varies with document size, device performance, and viewport resize; the engine already exposes its real layout boundary.

### 2. Synchronize zoom by semantic inputs, not scoped capability identity

The zoom effect will depend on the document identity and requested zoom value. The latest imperative capability can be held in a ref, so the effect does not react to EmbedPDF's fresh scoped wrapper objects.

**Alternative considered:** add an adapter-side equality check around every zoom request. Rejected because it still couples effects to unstable library objects and hides lifecycle ordering bugs.

### 3. Open the viewport without a redundant default-scale transaction

EmbedPDF gates the viewport until its zoom plugin handles an initial request. The PDF document is already opened at the requested scale, so the adapter releases the `zoom` gate directly once the viewport reports non-zero dimensions when the requested scale is 100%. This avoids an unnecessary scale-and-scroll transaction that can repaint the first page during startup. Non-default initial scales still use the zoom capability.

Requested zoom changes are held while the viewport reports active user or smooth programmatic scrolling and applied once the scroll activity is idle. This keeps scale recalculation from racing an in-flight scroll offset.

**Alternative considered:** issue zoom requests on every viewport resize or scoped capability update. Rejected because those updates are lifecycle noise and can repeatedly reset the scroll anchor.

### 3. Treat page events during a pending programmatic command as internal

The renderer will not forward EmbedPDF page-change events to `FileViewer` while a command is pending or the scroll plugin says it is changing pages. User-originated active-page events continue to update chrome state; the existing scroll-idle settle rule emits only for the latest dispatched command.

**Alternative considered:** let all events update parent state and use timing guards. Rejected because a programmatic target becomes active synchronously before physical scroll reaches it, creating competing state sources.

## Risks / Trade-offs

- [Layout-ready can occur again after re-layout] → retain the latest pending command and use the intent token to ensure already dispatched commands are not repeated.
- [Scoped EmbedPDF capability APIs are not referentially stable] → keep them in refs and test a fresh wrapper on every render.
- [A user interrupts a smooth jump] → do not emit a settle until the target is active and scrolling has become idle; a later command supersedes the interrupted target.

## Migration Plan

1. Add adapter tests reproducing pre-layout navigation and a fresh scoped zoom control.
2. Queue navigation to layout readiness and remove unstable zoom-effect dependencies.
3. Verify focused renderer and FileViewer tests, then run package typecheck/build checks.

Rollback is limited to restoring the prior internal adapter implementation; no consumer migration or persisted data is involved.

## Open Questions

None.
