# Contributing Guide

Thanks for your interest! This repo is designed for extension via plugins and SDKs.

## Setup
- Node 20+, PNPM 9+, Python 3.11+
- `pnpm i` then `pnpm -r dev`

## Ways to Contribute
- New datasource under `plugins/`
- New tools/layers via `packages/sdk-frontend`
- CRS definitions via `packages/crs`
- Cartography styles via `packages/styles`

## Pull Requests
- Include tests where practical
- Run `pnpm typecheck` and `pnpm build`
