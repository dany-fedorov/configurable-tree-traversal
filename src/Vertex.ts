import type { TreeTypeParameters } from './TreeTypeParameters';
import type { CTTAbstractParent } from './CTTAbstractParent';

export type VertexContent<TTP extends TreeTypeParameters> = CTTAbstractParent<
  TTP['VertexData'],
  TTP['VertexHint']
>;

export class Vertex<TTP extends TreeTypeParameters>
  implements VertexContent<TTP>
{
  readonly $d: TTP['VertexData'];
  readonly $c: TTP['VertexHint'][];

  constructor(vertexContent: VertexContent<TTP>) {
    this.$d = vertexContent.$d;
    this.$c = vertexContent.$c;
  }

  getData(): TTP['VertexData'] {
    return this.$d;
  }

  getChildrenHints(): TTP['VertexHint'][] {
    return this.$c;
  }

  isLeafVertex(): boolean {
    return this.getChildrenHints().length === 0;
  }

  clone(vertexContent?: Partial<VertexContent<TTP>>): Vertex<TTP> {
    return new Vertex<TTP>({
      $d: vertexContent?.$d || this.$d,
      $c: vertexContent?.$c || this.$c,
    });
  }
}
