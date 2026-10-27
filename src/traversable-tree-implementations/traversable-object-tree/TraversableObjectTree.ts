import {
  assertNoTreeMetadata,
  normalizeSourceResult,
} from '@core/drivers/normalizeSourceResult';
import {
  AbstractTreeSource,
  TreeVertexFound,
  TreeChildResolutionContext,
  TreeVertexResolution,
} from '@core/TraversableTree';
import { normalizeVertexContent } from '@core/Vertex';
import { getChildrenOfPropertyDefault } from '@traversable-object-tree/lib/getChildrenOfPropertyDefault';
import { getRootPropertyFromInputObjectDefault } from '@traversable-object-tree/lib/getRootPropertyFromInputObjectDefault';
import { createObjectMutationBinder } from '@traversable-object-tree/lib/makeMutationCommandFactory';
import type { TraversableObject } from '@traversable-object-tree/lib/TraversableObject';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type {
  ObjectTreeOptions,
  ObjectTreeResolvedOptions,
} from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';

type ObjectCycleState = {
  seenIdentities: WeakSet<object>;
  originalIdentityByVertexRef: WeakMap<object, object | null>;
};

export class ObjectTreeSource<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = TraversableObject<TraversableObjectPropKey, unknown> | unknown,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
> extends AbstractTreeSource<
  TraversableObjectTTP<InK, InV>,
  TraversableObjectTTP<OutK, OutV>
> {
  private readonly icfg: ObjectTreeResolvedOptions<In, InK, InV, OutK, OutV>;
  public readonly rootObject: In;
  private readonly cycleStateByResolvedTree = new WeakMap<
    object,
    ObjectCycleState
  >();
  private readonly originalIdentityByVertexData = new WeakMap<
    object,
    object | null
  >();
  private readonly originalIdentityByResolutionContext = new WeakMap<
    object,
    object | null
  >();

  static getChildrenOfPropertyDefault = getChildrenOfPropertyDefault;
  static getRootPropertyFromInputObjectDefault =
    getRootPropertyFromInputObjectDefault;

  constructor(
    rootObject: In,
    icfgInput?: ObjectTreeOptions<In, InK, InV, OutK, OutV>,
  ) {
    super();
    this.rootObject = rootObject;
    if (icfgInput && 'makeVertexHook' in icfgInput) {
      throw new TypeError(
        'makeVertexHook is unsupported; use resolveVertexHook',
      );
    }
    const { resolveVertexHook, ...otherOptions } = icfgInput ?? {};
    if (
      resolveVertexHook !== undefined &&
      typeof resolveVertexHook !== 'function'
    ) {
      throw new TypeError('resolveVertexHook must be a function');
    }
    this.icfg = {
      getChildrenOfProperty:
        otherOptions.getChildrenOfProperty ??
        ObjectTreeSource.getChildrenOfPropertyDefault,
      getRootPropertyFromInputObject:
        otherOptions.getRootPropertyFromInputObject ??
        ObjectTreeSource.getRootPropertyFromInputObjectDefault(),
      ...otherOptions,
      resolveVertexHook,
    };
  }

  static createObjectMutationBinder = createObjectMutationBinder;

  resolveRoot(): TreeVertexFound<TraversableObjectTTP<InK, InV>> {
    const { getChildrenOfProperty, getRootPropertyFromInputObject } = this.icfg;
    const rootProp = getRootPropertyFromInputObject(this.rootObject);
    this.originalIdentityByVertexData.set(
      rootProp,
      getObjectIdentity(rootProp.value),
    );
    const children = getChildrenOfProperty(rootProp);
    return {
      kind: 'found',
      vertex: { vertexContent: { $data: rootProp, $childHints: children } },
    };
  }

  resolveChild(
    vertexHint: TraversableObjectTTP<InK, InV>['VertexHint'],
    options: TreeChildResolutionContext<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ): TreeVertexResolution<TraversableObjectTTP<InK, InV>> {
    const canonicalHook = this.icfg.resolveVertexHook;
    let result:
      | TreeVertexResolution<TraversableObjectTTP<InK, InV>>
      | undefined;
    if (canonicalHook !== undefined) {
      const resolved = canonicalHook(vertexHint, options);
      if (resolved === null || typeof resolved !== 'object') {
        throw new TypeError('Invalid object resolution hook result');
      }
      assertNoTreeMetadata(resolved);
      if (resolved.kind !== 'useDefault') {
        if (resolved.kind !== 'found' && resolved.kind !== 'omitted') {
          throw new TypeError('Invalid object resolution hook kind');
        }
        result = resolved;
      }
    }
    if (result !== undefined) {
      const normalized = normalizeSourceResult(result, false, 'Tree source')!;
      if (normalized.vertexContent === null) return { kind: 'omitted' };
      const content = normalizeVertexContent(normalized.vertexContent);
      this.assertNoObjectIdentityCycle(content.$data, options);
      return { kind: 'found', vertex: { vertexContent: content } };
    }
    const { getChildrenOfProperty } = this.icfg;
    this.assertNoObjectIdentityCycle(vertexHint, options);
    const hints = getChildrenOfProperty(vertexHint);
    return {
      kind: 'found',
      vertex: { vertexContent: { $data: vertexHint, $childHints: hints } },
    };
  }

  private assertNoObjectIdentityCycle(
    prop: TraversableObjectTTP<InK, InV>['VertexData'],
    options: TreeChildResolutionContext<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ): void {
    const valueIdentity = getObjectIdentity(prop.value);
    this.originalIdentityByVertexData.set(prop, valueIdentity);
    this.originalIdentityByResolutionContext.set(
      options.resolutionContext,
      valueIdentity,
    );

    let state = this.cycleStateByResolvedTree.get(options.resolvedTree);
    if (state === undefined) {
      state = {
        seenIdentities: new WeakSet(),
        originalIdentityByVertexRef: new WeakMap(),
      };
      this.cycleStateByResolvedTree.set(options.resolvedTree, state);
    }

    const parentRef = options.resolutionContext.parentVertexRef;
    const parentIdentity = this.getOriginalIdentityOf(
      parentRef,
      state,
      options,
    );
    if (parentIdentity !== null) {
      state.seenIdentities.add(parentIdentity);
    }

    if (valueIdentity === null) {
      return;
    }

    if (state.seenIdentities.has(valueIdentity)) {
      let ancestorRef: typeof parentRef | null = parentRef;
      while (ancestorRef !== null) {
        if (
          this.getOriginalIdentityOf(ancestorRef, state, options) ===
          valueIdentity
        ) {
          throw new Error(
            `Object identity cycle detected at ${this.formatPathTo(
              parentRef,
              options,
              prop.key,
            )}; value repeats ancestor at ${this.formatPathTo(
              ancestorRef,
              options,
            )}`,
          );
        }
        ancestorRef = options.resolvedTree.getParentOf(ancestorRef);
      }
    }
    state.seenIdentities.add(valueIdentity);
  }

  private getOriginalIdentityOf(
    vertexRef: TreeChildResolutionContext<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >['resolutionContext']['parentVertexRef'],
    state: ObjectCycleState,
    options: TreeChildResolutionContext<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ): object | null {
    if (state.originalIdentityByVertexRef.has(vertexRef)) {
      return state.originalIdentityByVertexRef.get(vertexRef) ?? null;
    }

    const vertexData = vertexRef.getValue().getData();
    let identity = this.originalIdentityByVertexData.get(vertexData);
    if (identity === undefined) {
      // This cache tracks the identity of the accepted resolution context.
      const context =
        options.resolvedTree.get(vertexRef)?.getResolutionContext() ?? null;
      identity =
        context !== null &&
        this.originalIdentityByResolutionContext.has(context)
          ? this.originalIdentityByResolutionContext.get(context)
          : getObjectIdentity(
              context === null ? vertexData.value : context.vertexHint.value,
            );
    }

    const result = identity ?? null;
    state.originalIdentityByVertexRef.set(vertexRef, result);
    return result;
  }

  private formatPathTo(
    vertexRef: TreeChildResolutionContext<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >['resolutionContext']['parentVertexRef'],
    options: TreeChildResolutionContext<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
    finalKey?: TraversableObjectPropKey,
  ): string {
    const keys: TraversableObjectPropKey[] = options.resolvedTree
      .getPathTo(vertexRef, { noRoot: true })
      .map((ref) => {
        const context = options.resolvedTree.getResolutionContextOf(ref);
        return context?.vertexHint.key ?? ref.getValue().getData().key;
      });
    if (finalKey !== undefined) {
      keys.push(finalKey);
    }
    return `$${keys.map(formatObjectPathKey).join('')}`;
  }
}

function getObjectIdentity(value: unknown): object | null {
  return value !== null &&
    (typeof value === 'object' || typeof value === 'function')
    ? (value as object)
    : null;
}

function formatObjectPathKey(key: TraversableObjectPropKey): string {
  if (typeof key === 'number') {
    return `[${key}]`;
  }
  if (typeof key === 'symbol') {
    return `[${String(key)}]`;
  }
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `.${key}`
    : `[${JSON.stringify(key)}]`;
}
