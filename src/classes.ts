import type { IVertex, ITreeTypeParameters } from './types';

interface VertexProps<TreeTypeParameters extends ITreeTypeParameters> {
  data: TreeTypeParameters['VertexData'];
  childrenHints: TreeTypeParameters['VertexHint'][];
}

export class Vertex<TreeTypeParameters extends ITreeTypeParameters>
  implements IVertex<TreeTypeParameters>
{
  readonly $d: TreeTypeParameters['VertexData'];
  readonly $c: TreeTypeParameters['VertexHint'][];

  constructor(vertexProps: VertexProps<TreeTypeParameters>) {
    this.$d = vertexProps.data;
    this.$c = vertexProps.childrenHints;
  }

  static fromPlain<TreeTypeParameters extends ITreeTypeParameters>(
    vertexPlain: IVertex<TreeTypeParameters>,
  ): Vertex<TreeTypeParameters> {
    return new Vertex<TreeTypeParameters>({
      data: vertexPlain.$d,
      childrenHints: vertexPlain.$c,
    });
  }

  static makePlain<TreeTypeParameters extends ITreeTypeParameters>(
    vertexProps: VertexProps<TreeTypeParameters>,
  ): IVertex<TreeTypeParameters> {
    return {
      $d: vertexProps.data,
      $c: vertexProps.childrenHints,
    };
  }

  static getData<TreeTypeParameters extends ITreeTypeParameters>(
    vertex: IVertex<TreeTypeParameters>,
  ): TreeTypeParameters['VertexData'] {
    return vertex.$d;
  }

  static getChildrenHints<TreeTypeParameters extends ITreeTypeParameters>(
    vertex: IVertex<TreeTypeParameters>,
  ): TreeTypeParameters['VertexHint'][] {
    return vertex.$c;
  }

  getChildrenHints() {
    return Vertex.getChildrenHints<TreeTypeParameters>(this);
  }

  getData() {
    return Vertex.getData<TreeTypeParameters>(this);
  }

  toPlain(): IVertex<TreeTypeParameters> {
    return {
      $d: this.$d,
      $c: this.$c,
    };
  }
}
