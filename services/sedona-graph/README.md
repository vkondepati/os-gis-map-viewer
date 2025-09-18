# sedona-graph

Small PySpark/GeoPandas job to convert a roads GeoJSON into a simple routable graph (nodes.csv, edges.csv).

Usage (local, small datasets):

python build_graph.py --input /path/to/roads.geojson --out /path/to/outdir

Notes:

- This scaffold tries to detect PySpark and Sedona, but in most local developer setups the geopandas fallback will be used.
- For production, run the PySpark job on a Spark cluster with Sedona jars and replace the fallback with real Sedona spatial SQL operations.
