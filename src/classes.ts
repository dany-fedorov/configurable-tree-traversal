import type { Vertex, TreeTypeParameters } from './types';

interface CVertexProps<TTP extends TreeTypeParameters> {
  data: TTP['VertexData'];
  childrenHints: TTP['VertexHint'][];
}

export class CVertex<TTP extends TreeTypeParameters> implements Vertex<TTP> {
  readonly $d: TTP['VertexData'];
  readonly $c: TTP['VertexHint'][];

  constructor(vertexProps: CVertexProps<TTP>) {
    this.$d = vertexProps.data;
    this.$c = vertexProps.childrenHints;
  }

  static fromPlain<TTP extends TreeTypeParameters>(
    vertexPlain: Vertex<TTP>,
  ): CVertex<TTP> {
    return new CVertex<TTP>({
      data: vertexPlain.$d,
      childrenHints: vertexPlain.$c,
    });
  }

  static makePlain<TTP extends TreeTypeParameters>(
    vertexProps: CVertexProps<TTP>,
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
    return CVertex.getChildrenHints<TTP>(this);
  }

  getData() {
    return CVertex.getData<TTP>(this);
  }

  toPlain(): Vertex<TTP> {
    return {
      $d: this.$d,
      $c: this.$c,
    };
  }
}
