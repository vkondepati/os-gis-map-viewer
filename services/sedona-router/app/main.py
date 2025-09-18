from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import csv
from pathlib import Path
import math
import heapq
from typing import Tuple, List
import json

app = FastAPI()


class RouteRequest(BaseModel):
    origin: Tuple[float, float]
    destination: Tuple[float, float]


def load_graph(graph_path):
    nodes = {}
    edges = []
    nodes_csv = Path(graph_path) / 'nodes.csv'
    edges_csv = Path(graph_path) / 'edges.csv'
    if not nodes_csv.exists() or not edges_csv.exists():
        raise RuntimeError('nodes.csv or edges.csv missing in ' + str(graph_path))
    with open(nodes_csv, newline='', encoding='utf8') as f:
        r = csv.DictReader(f)
        for row in r:
            nodes[row['id']] = (float(row['x']), float(row['y']))
    with open(edges_csv, newline='', encoding='utf8') as f:
        r = csv.DictReader(f)
        for row in r:
            u = row['u']
            v = row['v']
            # Keep euclidean length
            length = float(row.get('length', 0))
            edges.append((u, v, length))
    return nodes, edges


def build_adj(edges):
    adj = {}
    for u,v,l in edges:
        adj.setdefault(u, []).append((v,l))
        adj.setdefault(v, []).append((u,l))
    return adj


def euclid(a,b):
    return math.hypot(a[0]-b[0], a[1]-b[1])


def nearest_node(nodes, pt):
    best = None
    bestd = float('inf')
    for nid, coord in nodes.items():
        d = euclid(coord, pt)
        if d < bestd:
            bestd = d
            best = nid
    return best, bestd


def dijkstra(adj, src, dst):
    pq = [(0, src, None)]
    prev = {src: None}
    dist = {src: 0}
    while pq:
        d,u,_ = heapq.heappop(pq)
        if u == dst:
            break
        for v,w in adj.get(u,[]):
            nd = d + w
            if v not in dist or nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v, u))
    if dst not in prev:
        return None
    path = []
    cur = dst
    while cur is not None:
        path.append(cur)
        cur = prev[cur]
    path.reverse()
    return path


# Global graph loaded at startup
GRAPH_PATH = Path('/data/graph')
try:
    NODES, EDGES = load_graph(GRAPH_PATH)
    ADJ = build_adj(EDGES)
    print('loaded graph nodes=%d edges=%d' % (len(NODES), len(EDGES)))
except Exception as e:
    print('failed to load graph at startup:', e)
    NODES, EDGES, ADJ = {}, [], {}


@app.post('/route')
def route(req: RouteRequest):
    if not NODES:
        raise HTTPException(status_code=500, detail='graph not loaded')
    origin = tuple(req.origin)
    destination = tuple(req.destination)
    src, sd = nearest_node(NODES, origin)
    dst, dd = nearest_node(NODES, destination)
    path = dijkstra(ADJ, src, dst)
    if path is None:
        raise HTTPException(status_code=404, detail='no path found')
    # build LineString coordinates
    coords = [list(NODES[n]) for n in path]
    return {'type':'Feature','geometry':{'type':'LineString','coordinates':coords},'properties':{'length':sum([euclid(NODES[path[i]], NODES[path[i+1]]) for i in range(len(path)-1)])}}
