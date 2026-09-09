import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { CTTAbstractParent } from '@core/CTTAbstractParent';

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

  clone(content?: Partial<VertexContent<TTP>>): Vertex<TTP> {
    const data =
      content !== undefined &&
      Object.prototype.hasOwnProperty.call(content, '$d')
        ? (content.$d as TTP['VertexData'])
        : this.$d;
    return new Vertex<TTP>({
      $d: data,
      $c: content?.$c ?? this.$c,
    });
  }
}
