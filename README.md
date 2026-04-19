# field-rendering.jerryio

A website for VEX robotics teams and developers to download standardized VEX field rendering images.

## Why this exists

As more teams started using `PATH.JERRYIO`, people kept asking us to publish the field images separately because they were useful outside PATH as well. This project is the answer to that request: a public, dedicated gallery where anyone can browse and download the same standardized rendering assets for engineering notebooks, simulation, and custom tooling.

## Rendering standards

All renders are generated with a fixed top-down orthographic camera condition so field geometry aligns across the full asset set. `FieldCAD` is used as the rendering toolchain that enforces standardized camera setup and export behavior ([FieldCAD](https://github.com/Jerrylum/FieldCAD)). This is the program we used to generate the renders for `PATH.JERRYIO`.

VEX V5 renders use a `3690mm` extent and VEX IQ renders use a `1920mm` extent. The toolchain is designed to avoid unintended offset, drift, and jitter between exports; framing remains center-aligned to the field, and each render includes exactly the intended extent, no more and no less. In practice, this means top corners line up consistently across comparable renders, which allows direct overlay and stable coordinate use in planning tools.

## Asset versions and previews

Downloadable assets are stored in `static/renders`. We designed a pipeline that generates a `+2000px` derivative and a `+500px` preview variant for each render.

## Filename and metadata model

The base naming format is `Competition-Season-Setup-View-Theme@SemVer.ext`. For example, a full asset may be `V5RC-HighStakes-H2H-TopDown-TileColor66_71@4.0.png`, with derivatives such as `@4.0+2000px` and `@4.0+500px`. The file `src/lib/renderings.ts` is generated metadata for downloadable assets, and preview-only files are intentionally excluded from that metadata.

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

This command validates Cloudflare worker types, runs Svelte type checks, and runs TypeScript checks for scripts under `scripts/`.

## Render pipeline

To generate derivative assets and refresh metadata, run:

```sh
bun run renders:pipeline
```

The pipeline generates missing `+2000px` derivatives, generates `+500px` preview derivatives, and regenerates `src/lib/renderings.ts`.

## Licensing

Source code is licensed under GPL (see `LICENSE`). Rendered image assets are distributed under a Creative Commons license.
