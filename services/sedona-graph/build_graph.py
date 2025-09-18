#!/usr/bin/env python3
"""
Build a routable graph from a roads GeoJSON.
Tries to use PySpark + Sedona if available; otherwise falls back to GeoPandas + Shapely.

Outputs CSVs: nodes.csv and edges.csv under --out directory.
"""
import argparse
import json
import os
from pathlib import Path

def write_csv_nodes_edges(nodes, edges, outdir):
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    nodes_path = outdir / 'nodes.csv'
    edges_path = outdir / 'edges.csv'
    with open(nodes_path, 'w', encoding='utf8') as f:
        f.write('id,x,y\n')
        for nid, (x,y) in nodes.items():
            f.write(f"{nid},{x},{y}\n")
    with open(edges_path, 'w', encoding='utf8') as f:
        f.write('u,v,geom_wkt,length\n')
        for u,v,wkt,l in edges:
            f.write(f'"{u}","{v}","{wkt}",{l}\n')
    print('wrote', nodes_path, edges_path)

def geopandas_fallback(input_path, outdir):
    print('Running GeoPandas fallback (local, small datasets)')
    try:
        import geopandas as gpd
        from shapely.geometry import LineString
        from shapely.ops import linemerge, split
    except Exception as e:
        raise RuntimeError('geopandas fallback requires geopandas and shapely: ' + str(e))

    gdf = gpd.read_file(input_path)
    # Normalize to LineString geometries
    lines = []
    for geom in gdf.geometry:
        if geom is None:
            continue
        if geom.geom_type == 'LineString':
            lines.append(geom)
        elif geom.geom_type == 'MultiLineString':
            for seg in geom:
                lines.append(seg)

    # naively build nodes at endpoints and edges between them
    nodes = {}
    edges = []
    next_id = 1
    def node_id(pt):
        # Use coordinate tuple as key
        return f'n{pt[0]:.6f}_{pt[1]:.6f}'

    for ln in lines:
        coords = list(ln.coords)
        for i in range(len(coords)-1):
            a = coords[i]
            b = coords[i+1]
            ida = node_id(a)
            idb = node_id(b)
            if ida not in nodes:
                nodes[ida] = (a[0], a[1])
            if idb not in nodes:
                nodes[idb] = (b[0], b[1])
            seg = LineString([a,b])
            edges.append((ida, idb, seg.wkt, seg.length))

    write_csv_nodes_edges(nodes, edges, outdir)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--input', required=True)
    p.add_argument('--out', required=True)
    args = p.parse_args()
    inp = args.input
    out = args.out

    # Try pyspark + sedona (light check)
    try:
        from pyspark.sql import SparkSession
        print('PySpark available; attempting Sedona pipeline (user must supply Sedona jars via SPARK_CLASSPATH)')
        # Minimal scaffolding: read GeoJSON as text + parse geometries, but full Sedona usage requires jars.
        # For now, fallback to geopandas if Sedona not configured.
        raise RuntimeError('PySpark/Sedona path not fully implemented in this scaffold; using fallback')
    except Exception as e:
        print('PySpark/Sedona not used:', e)
        geopandas_fallback(inp, out)

if __name__ == '__main__':
    main()
