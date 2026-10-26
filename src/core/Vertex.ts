import type { VertexTypes } from '@core/TreeTypeParameters';
import type { CTTAbstractParent } from '@core/CTTAbstractParent';

export type VertexContent<TTP extends VertexTypes> = {
  $data: TTP['VertexData'];
  $childHints: TTP['VertexHint'][];
};

/** @deprecated Use VertexContent with $data and $childHints. */
export type LegacyVertexContent<TTP extends VertexTypes> =
  CTTAbstractParent<TTP['VertexData'], TTP['VertexHint']>;

type CanonicalContentInput<TTP extends VertexTypes> = VertexContent<TTP> & {
  $d?: never;
  $c?: never;
};
type LegacyContentInput<TTP extends VertexTypes> = LegacyVertexContent<TTP> & {
  $data?: never;
  $childHints?: never;
};

/** Input accepts either spelling, but never a mixture of the two. */
export type VertexContentInput<TTP extends VertexTypes> =
  | CanonicalContentInput<TTP>
  | LegacyContentInput<TTP>
  | Vertex<TTP>;

export type VertexCloneContent<TTP extends VertexTypes> =
  | Partial<CanonicalContentInput<TTP>>
  | Partial<LegacyContentInput<TTP>>
  | Vertex<TTP>;

function assertUnmixedContent(content: object): void {
  if (
    ('$data' in content || '$childHints' in content) &&
    ('$d' in content || '$c' in content)
  ) {
    throw new TypeError(
      'Cannot mix canonical and legacy vertex content fields',
    );
  }
}

/** Normalize source content without interpreting or copying caller data/hints. */
export function normalizeVertexContent<TTP extends VertexTypes>(
  content: VertexContentInput<TTP>,
): VertexContent<TTP> {
  // Vertex exposes legacy getters as aliases, rather than conflicting inputs.
  if (content instanceof Vertex) return content;
  assertUnmixedContent(content);
  if ('$data' in content) {
    return content as VertexContent<TTP>;
  }
  return { $data: content.$d, $childHints: content.$c };
}

export class Vertex<TTP extends VertexTypes>
  implements VertexContent<TTP>
{
  readonly $data: TTP['VertexData'];
  readonly $childHints: TTP['VertexHint'][];

  constructor(vertexContent: VertexContentInput<TTP>) {
    const content = normalizeVertexContent(vertexContent);
    this.$data = content.$data;
    this.$childHints = content.$childHints;
  }

  /** @deprecated Use $data or getData(). */
  get $d(): TTP['VertexData'] {
    return this.$data;
  }

  /** @deprecated Use $childHints or getChildrenHints(). */
  get $c(): TTP['VertexHint'][] {
    return this.$childHints;
  }

  getData(): TTP['VertexData'] {
    return this.$data;
  }

  getChildrenHints(): TTP['VertexHint'][] {
    return this.$childHints;
  }

  hasNoChildHints(): boolean {
    return this.getChildrenHints().length === 0;
  }

  clone(content?: VertexCloneContent<TTP>): Vertex<TTP> {
    if (content instanceof Vertex) return new Vertex<TTP>(content);
    if (content !== undefined) assertUnmixedContent(content);
    let data = this.$data;
    if (content !== undefined) {
      if (Object.prototype.hasOwnProperty.call(content, '$data')) {
        data = content.$data as TTP['VertexData'];
      } else if (Object.prototype.hasOwnProperty.call(content, '$d')) {
        data = content.$d as TTP['VertexData'];
      }
    }
    return new Vertex<TTP>({
      $data: data,
      $childHints: content?.$childHints ?? content?.$c ?? this.$childHints,
    });
  }
}
