import type { GraphWalkVertex } from '../GraphWalkSource';
import type { GraphWalkEdge, GraphWalkPathEvent } from '../GraphWalkEvent';
import type { GraphWalkStrategy } from '../GraphWalkOptions';

export type WalkRoute<Data, Edge, ID> = {
  vertex: GraphWalkVertex<Data, ID>;
  via: GraphWalkEdge<Edge, ID> | null;
  depth: number;
  parent: WalkRoute<Data, Edge, ID> | null;
};
export type WalkFrame<Data, Edge, ID> = {
  route: WalkRoute<Data, Edge, ID>;
  index: number;
};

/** FIFO uses a moving head, DFS retains suspended frames on the stack. */
export class WalkFrontier<Data, Edge, ID> {
  private frames: WalkFrame<Data, Edge, ID>[] = [];
  private head = 0;
  constructor(private readonly strategy: GraphWalkStrategy) {}
  get size(): number {
    return this.frames.length - this.head;
  }
  push(route: WalkRoute<Data, Edge, ID>): void {
    this.frames.push({ route, index: 0 });
  }
  peek(): WalkFrame<Data, Edge, ID> {
    return this.frames[
      this.strategy === 'breadthFirst' ? this.head : this.frames.length - 1
    ]!;
  }
  remove(): void {
    if (this.strategy === 'depthFirst') this.frames.pop();
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

/** Only requested path records pay for materializing a prefix. */
export function projectPath<Data, Edge, ID>(
  route: WalkRoute<Data, Edge, ID>,
): GraphWalkPathEvent<Data, Edge, ID> {
  const vertices: GraphWalkVertex<Data, ID>[] = [];
  const edges: GraphWalkEdge<Edge, ID>[] = [];
  let current: WalkRoute<Data, Edge, ID> | null = route;
  while (current !== null) {
    vertices.push({ ...current.vertex });
    if (current.via !== null) edges.push({ ...current.via });
    current = current.parent;
  }
  return {
    kind: 'path',
    vertices: vertices.reverse(),
    edges: edges.reverse(),
    depth: route.depth,
  };
}
