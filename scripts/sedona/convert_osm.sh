#!/usr/bin/env bash
# Convert OSM PBF to LineString GeoJSON of roads using ogr2ogr (GDAL)
# Usage: ./convert_osm.sh input.osm.pbf output-roads.geojson

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 input.osm.pbf output-roads.geojson"
  exit 2
fi

IN=$1
OUT=$2

# Filter highway ways and convert to LineString
ogr2ogr -f GeoJSON -where "highway IS NOT NULL" "$OUT" "$IN" -nln roads

echo "wrote $OUT"
