import type { Vertex, TreeTypeParameters } from './types';

interface VertexProps<TTP extends TreeTypeParameters> {
  data: TTP['VertexData'];
  childrenHints: TTP['VertexHint'][];
}

export class WVertex<TTP extends TreeTypeParameters> implements Vertex<TTP> {
  readonly $d: TTP['VertexData'];
  readonly $c: TTP['VertexHint'][];

  constructor(vertexProps: VertexProps<TTP>) {
    this.$d = vertexProps.data;
    this.$c = vertexProps.childrenHints;
  }

  static fromPlain<TTP extends TreeTypeParameters>(
    vertexPlain: Vertex<TTP>,
  ): WVertex<TTP> {
    return new WVertex<TTP>({
      data: vertexPlain.$d,
      childrenHints: vertexPlain.$c,
    });
  }

  static makePlain<TTP extends TreeTypeParameters>(
    vertexProps: VertexProps<TTP>,
  ): Vertex<TTP> {
    return {
      $d: vertexProps.data,
      $c: vertexProps.childrenHints,
    };
  }

  static getData<TTP extends TreeTypeParameters>(
    vertex: Vertex<TTP>,
  ): TTP['VertexData'] {
    return vertex.$d;
  }

  static getChildrenHints<TTP extends TreeTypeParameters>(
    vertex: Vertex<TTP>,
  ): TTP['VertexHint'][] {
    return vertex.$c;
  }

  getChildrenHints() {
    return WVertex.getChildrenHints<TTP>(this);
  }

  getData() {
    return WVertex.getData<TTP>(this);
  }

  toPlain(): Vertex<TTP> {
    return {
      $d: this.$d,
      $c: this.$c,
    };
  }
}
