import type { GraphWalkResolvedVertex } from '../GraphWalkSource';
import type {
  GraphWalkEdge,
  GraphWalkRoutePrefixEvent,
} from '../GraphWalkEvent';
import type { GraphWalkExpansionOrder } from '../GraphWalkOptions';

export type WalkRoute<VertexData, EdgeData, VertexId> = {
  vertex: GraphWalkResolvedVertex<VertexData, VertexId>;
  via: GraphWalkEdge<EdgeData, VertexId> | null;
  depth: number;
  parent: WalkRoute<VertexData, EdgeData, VertexId> | null;
};
export type WalkFrame<VertexData, EdgeData, VertexId> = {
  route: WalkRoute<VertexData, EdgeData, VertexId>;
  index: number;
};

/** FIFO uses a moving head, DFS retains suspended frames on the stack. */
export class WalkFrontier<VertexData, EdgeData, VertexId> {
  private frames: WalkFrame<VertexData, EdgeData, VertexId>[] = [];
  private head = 0;
  constructor(private readonly expansionOrder: GraphWalkExpansionOrder) {}
  get size(): number {
    return this.frames.length - this.head;
  }
  clear(): void {
    this.frames = [];
    this.head = 0;
  }
  push(route: WalkRoute<VertexData, EdgeData, VertexId>): void {
    this.frames.push({ route, index: 0 });
  }
  peek(): WalkFrame<VertexData, EdgeData, VertexId> {
    return this.frames[
      this.expansionOrder === 'breadthFirst'
        ? this.head
        : this.frames.length - 1
    ]!;
  }
  remove(): void {
    if (this.expansionOrder === 'depthFirst') this.frames.pop();
    else {
      this.head++;
      // Release completed roots/frames without shifting on every expansion.
      if (this.head * 2 >= this.frames.length) {
        this.frames = this.frames.slice(this.head);
        this.head = 0;
      }
    }
  }
}

/** Route-local cycle membership, including NaN and signed-zero identities. */
export function routeContains<VertexData, EdgeData, VertexId>(
  route: WalkRoute<VertexData, EdgeData, VertexId>,
  vertexId: VertexId,
): boolean {
  let current: WalkRoute<VertexData, EdgeData, VertexId> | null = route;
  while (current !== null) {
    const id = current.vertex.vertexId;
    if (id === vertexId || (id !== id && vertexId !== vertexId)) return true;
    current = current.parent;
  }
  return false;
}

/** Only requested path records pay for materializing a prefix. */
export function projectPath<VertexData, EdgeData, VertexId>(
  route: WalkRoute<VertexData, EdgeData, VertexId>,
): GraphWalkRoutePrefixEvent<VertexData, EdgeData, VertexId> {
  const vertices: GraphWalkResolvedVertex<VertexData, VertexId>[] = [];
  const edges: GraphWalkEdge<EdgeData, VertexId>[] = [];
  let current: WalkRoute<VertexData, EdgeData, VertexId> | null = route;
  while (current !== null) {
    vertices.push({ ...current.vertex });
    if (current.via !== null) edges.push({ ...current.via });
    current = current.parent;
  }
  return {
    eventKind: 'routePrefix',
    verticesInRootToTargetOrder: vertices.reverse(),
    edgesInRootToTargetOrder: edges.reverse(),
    routeHopLength: route.depth,
  };
}
