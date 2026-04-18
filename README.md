# field-rendering.jerryio

A VEX field rendering gallery for teams and tool developers.

## What this project is

`field-rendering.jerryio` is a static gallery for browsing and downloading standardized VEX field renders by:

- competition
- season
- setup
- view
- theme
- version / resolution

The UI is designed for fast discovery while preserving exact downloadable assets for route-planning tools, custom editors, and engineering notebooks.

## Why this exists

This project sits alongside:

- `FieldCAD` (render generation workflow and camera consistency)
- `PATH.JERRYIO` (path-planning/editor usage)

The goal is to provide reusable field imagery with predictable framing and naming, instead of ad-hoc screenshots from manuals or CAD viewports.

## Rendering standards

Renders are prepared with a consistent top-down camera setup so field geometry aligns across assets:

- VEX V5 extent baseline: `3690mm`
- VEX IQ extent baseline: `1920mm`

This consistency is important when assets are used as coordinate-aware backgrounds.

## Asset versions and previews

- Downloadable assets live in `static/renders`.
- The gallery preview image uses a generated `+500px` variant for faster loading.
- Preview variants are not included in downloadable metadata.
- Additional `+2000px` derivatives are generated for lower-bandwidth usage where available.

## Filename and metadata model

Base naming pattern:

`Competition-Season-Setup-View-Theme@SemVer.ext`

Examples:

- `V5RC-HighStakes-H2H-TopDown-TileColor66_71@4.0.png`
- `V5RC-HighStakes-H2H-TopDown-TileColor66_71@4.0+2000px.png`
- `V5RC-HighStakes-H2H-TopDown-TileColor66_71@4.0+500px.png` (preview-only)

`src/lib/renderings.ts` is generated metadata for downloadable assets (preview-only files are intentionally excluded).

## Development

```sh
bun install
bun run dev
```

## Build and deploy

```sh
bun run build
bun run deploy
```

## Quality checks

```sh
bun run check
```

This includes:

- Cloudflare worker type validation
- Svelte type checks
- TypeScript checks for scripts under `scripts/`

## Render pipeline

To generate derivative assets and refresh metadata:

```sh
bun run renders:pipeline
```

Pipeline behavior:

- generates missing `+2000px` derivatives
- generates `+500px` preview derivatives
- regenerates `src/lib/renderings.ts`
