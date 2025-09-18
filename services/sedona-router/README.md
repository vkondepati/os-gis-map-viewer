# sedona-router

Simple FastAPI service that loads `nodes.csv` and `edges.csv` from a graph directory and serves a POST /route endpoint.

Example POST payload:
{
"origin": [lon, lat],
"destination": [lon, lat]
}

This service uses a naive in-memory nearest-node snapping and Dijkstra on an undirected graph. It's intended as a small, testable router. For large production graphs, consider a persistent graph database or specialized router.
