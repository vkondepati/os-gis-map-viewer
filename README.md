# GIS Map Viewer (Open Source)

A modern, cloud-agnostic GIS map viewer with plugin-based datasources (Sedona, Iceberg, Snowflake, Databricks, AWS Athena, Azure Data Lake Gen2), CRS support, editing, and professional cartography.

## Quick Start (Docker Compose)
```bash
cd deploy/compose
docker compose up --build
```
Viewer: http://localhost:5173  
API: http://localhost:8080/health  
CRS: http://localhost:9000/docs

## Monorepo
- apps/: viewer, api-gateway, tiler
- packages/: SDKs (frontend/backend), styles, crs
- plugins/: datasource templates
- services/: CRS transform (FastAPI + pyproj)
- deploy/: docker-compose + Helm
- samples/: demo data & styles

## License
Apache-2.0
