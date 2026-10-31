import type { VertexTypes } from '@core/TreeTypeParameters';

export type VertexContent<TTP extends VertexTypes> = {
  $data: TTP['VertexData'];
  $childHints: TTP['VertexHint'][];
};

/** Canonical content only; retired spellings are rejected, including mixed inputs. */
export type VertexContentInput<TTP extends VertexTypes> = {
  $data: TTP['VertexData'];
  $childHints: readonly TTP['VertexHint'][];
  $d?: never;
  $c?: never;
};

export type VertexCloneContent<TTP extends VertexTypes> = Partial<
  VertexContentInput<TTP>
>;

function assertCanonicalContent(content: object): void {
  if ('$d' in content || '$c' in content) {
    throw new TypeError(
      'Legacy vertex content fields are unsupported; use canonical $data and $childHints',
    );
  }
}

/** Copy owned hint membership; retain opaque data and individual hint identity. */
export function normalizeVertexContent<TTP extends VertexTypes>(
  content: VertexContentInput<TTP>,
): VertexContent<TTP> {
  assertCanonicalContent(content);
  return { $data: content.$data, $childHints: Array.from(content.$childHints) };
}

export class Vertex<TTP extends VertexTypes> implements VertexContent<TTP> {
  readonly $data: TTP['VertexData'];
  readonly $childHints: TTP['VertexHint'][];

  constructor(vertexContent: VertexContentInput<TTP>) {
    const content = normalizeVertexContent(vertexContent);
    this.$data = content.$data;
    this.$childHints = content.$childHints;
  }

  getData(): TTP['VertexData'] {
    return this.$data;
  }

  getChildHints(): TTP['VertexHint'][] {
    return this.$childHints;
  }

  hasNoChildHints(): boolean {
    return this.getChildHints().length === 0;
  }

  clone(content?: VertexCloneContent<TTP>): Vertex<TTP> {
    if (content instanceof Vertex) return new Vertex<TTP>(content);
    if (content !== undefined) assertCanonicalContent(content);
    let data = this.$data;
    if (content !== undefined) {
      if (Object.prototype.hasOwnProperty.call(content, '$data')) {
        data = content.$data as TTP['VertexData'];
      }
    }
    return new Vertex<TTP>({
      $data: data,
      $childHints: content?.$childHints ?? this.$childHints,
    });
  }
}

/** Read-only observation of CTT-owned vertex state; caller payloads remain shallow. */
export interface VertexView<T extends VertexTypes> {
  readonly $data: T['VertexData'];
  readonly $childHints: readonly T['VertexHint'][];
  getData(): T['VertexData'];
  getChildHints(): readonly T['VertexHint'][];
  hasNoChildHints(): boolean;
  /** Creates an independent editable vertex and hint collection. */
  clone(content?: VertexCloneContent<T>): Vertex<T>;
}
