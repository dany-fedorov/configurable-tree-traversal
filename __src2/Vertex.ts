import type { VertexContent, TreeTypeParameters } from './types';
import { Ref } from './Ref';

interface VertexContentProps<TTP extends TreeTypeParameters> {
  data: TTP['VertexData'];
  childrenHints: TTP['VertexHint'][];
}

export class Vertex<TTP extends TreeTypeParameters> {
  private readonly content: VertexContent<TTP>;

  constructor(vertexProps: VertexContentProps<TTP>) {
    this.content = Vertex.makeContent({
      data: vertexProps.data,
      childrenHints: vertexProps.childrenHints,
    });
  }

  static fromContent<TTP extends TreeTypeParameters>(
    vertexContent: VertexContent<TTP>,
  ): Vertex<TTP> {
    return new Vertex<TTP>({
      data: vertexContent.$d,
      childrenHints: vertexContent.$c,
    });
  }

  static makeContent<TTP extends TreeTypeParameters>(
    vertexProps: VertexContentProps<TTP>,
  ): VertexContent<TTP> {
    return {
      $d: vertexProps.data,
      $c: vertexProps.childrenHints,
    };
  }

  static getDataFromContent<TTP extends TreeTypeParameters>(
    vertex: VertexContent<TTP>,
  ): TTP['VertexData'] {
    return vertex.$d;
  }

  static getChildrenHintsFromContent<TTP extends TreeTypeParameters>(
    vertex: VertexContent<TTP>,
  ): TTP['VertexHint'][] {
    return vertex.$c;
  }

  getChildrenHints() {
    return Vertex.getChildrenHintsFromContent<TTP>(this.content);
  }

  getData() {
    return Vertex.getDataFromContent<TTP>(this.content);
  }

  getContent(): VertexContent<TTP> {
    return this.content;
  }

  isLeafVertex(): boolean {
    return this.getChildrenHints().length === 0;
  }
}
