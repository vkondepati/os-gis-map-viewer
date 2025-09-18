# Sedona routing pipeline (scaffold)

This folder contains a minimal local scaffold to build a routable graph from OSM roads and run a tiny router service.

Quick steps (Windows PowerShell):

1. Convert an OSM PBF to GeoJSON:
   ./scripts/sedona/convert_osm.ps1 -InputPbf path\to\file.osm.pbf -OutputGeoJson .\data\roads.geojson

2. Build graph (local fallback using GeoPandas):
   python services/sedona-graph/build_graph.py --input data\roads.geojson --out data\graph

3. Build and run the router service (Docker required):
   docker build -t sedona-router services/sedona-router
   docker run -p 8081:8081 -v ${PWD}\\deploy\\sedona-pipeline\\data\\graph:/data/graph sedona-router

Or use the provided docker-compose to run builder+router (the graph-builder image expects Spark to be set up; for small test runs, run the python script locally and only start the router service).
