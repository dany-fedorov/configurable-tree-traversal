import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';

export type VertexContent<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  $vertexData: InputVertexTypes['VertexData'];
  $childDiscoveryHints: InputVertexTypes['ChildHint'][];
};

/** Canonical content only; retired spellings are rejected, including mixed inputs. */
export type VertexContentInput<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  $vertexData: InputVertexTypes['VertexData'];
  $childDiscoveryHints: readonly InputVertexTypes['ChildHint'][];
  $d?: never;
  $c?: never;
  $data?: never;
  $childHints?: never;
};

export type VertexContentOverridesForShallowClone<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = Partial<VertexContentInput<InputVertexTypes>>;

function assertCanonicalContent(content: object): void {
  if (
    '$d' in content ||
    '$c' in content ||
    '$data' in content ||
    '$childHints' in content
  ) {
    throw new TypeError(
      'Legacy vertex content fields are unsupported; use canonical $vertexData and $childDiscoveryHints',
    );
  }
}

/** Copy owned hint membership; retain opaque data and individual hint identity. */
export function normalizeVertexContent<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  content: VertexContentInput<InputVertexTypes>,
): VertexContent<InputVertexTypes> {
  assertCanonicalContent(content);
  return {
    $vertexData: content.$vertexData,
    $childDiscoveryHints: Array.from(content.$childDiscoveryHints),
  };
}

export class Vertex<InputVertexTypes extends VertexDataAndChildHintTypes>
  implements VertexContent<InputVertexTypes>
{
  readonly $vertexData: InputVertexTypes['VertexData'];
  readonly $childDiscoveryHints: InputVertexTypes['ChildHint'][];

  constructor(vertexContent: VertexContentInput<InputVertexTypes>) {
    const content = normalizeVertexContent(vertexContent);
    this.$vertexData = content.$vertexData;
    this.$childDiscoveryHints = content.$childDiscoveryHints;
  }

  getVertexData(): InputVertexTypes['VertexData'] {
    return this.$vertexData;
  }

  getMutableChildDiscoveryHints(): InputVertexTypes['ChildHint'][] {
    return this.$childDiscoveryHints;
  }

  getDetachedChildDiscoveryHints(): readonly InputVertexTypes['ChildHint'][] {
    return Object.freeze(this.$childDiscoveryHints.slice());
  }

  hasChildDiscoveryHints(): boolean {
    return this.getMutableChildDiscoveryHints().length > 0;
  }

  createEditableShallowCloneWithContentOverrides(
    content?: VertexContentOverridesForShallowClone<InputVertexTypes>,
  ): Vertex<InputVertexTypes> {
    if (content instanceof Vertex) return new Vertex<InputVertexTypes>(content);
    if (content !== undefined) assertCanonicalContent(content);
    let data = this.$vertexData;
    if (content !== undefined) {
      if (Object.prototype.hasOwnProperty.call(content, '$vertexData')) {
        data = content.$vertexData as InputVertexTypes['VertexData'];
      }
    }
    return new Vertex<InputVertexTypes>({
      $vertexData: data,
      $childDiscoveryHints:
        content?.$childDiscoveryHints ?? this.$childDiscoveryHints,
    });
  }
}

/** Read-only observation of CTT-owned vertex state; caller payloads remain shallow. */
export interface VertexView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> {
  readonly $vertexData: InputVertexTypes['VertexData'];
  readonly $childDiscoveryHints: readonly InputVertexTypes['ChildHint'][];
  getVertexData(): InputVertexTypes['VertexData'];
  getDetachedChildDiscoveryHints(): readonly InputVertexTypes['ChildHint'][];
  hasChildDiscoveryHints(): boolean;
  /** Creates an independent editable vertex and hint collection. */
  createEditableShallowCloneWithContentOverrides(
    content?: VertexContentOverridesForShallowClone<InputVertexTypes>,
  ): Vertex<InputVertexTypes>;
}
