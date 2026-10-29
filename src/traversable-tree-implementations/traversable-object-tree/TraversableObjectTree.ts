import {
  assertOwnKeys,
  assertOptionalCallbacks,
  OBJECT_SOURCE_OPTION_KEYS,
  definedOptions,
} from '@core/assertPublicOptions';
import type { ObjectCurrentVertexTypes } from '@traversable-object-tree/lib/ObjectCurrentVertexTypes';
import {
  assertNoTreeMetadata,
  normalizeSourceResult,
} from '@core/drivers/normalizeSourceResult';
import type {
  TreeSource,
  TreeVertexFound,
  TreeChildResolutionContext,
  TreeVertexResolution,
} from '@core/TraversableTree';
import { normalizeVertexContent } from '@core/Vertex';
import { getChildrenOfPropertyDefault } from '@traversable-object-tree/lib/getChildrenOfPropertyDefault';
import { createRootPropertyMapper } from '@traversable-object-tree/lib/createRootPropertyMapper';
import { createObjectMutationBinder } from '@traversable-object-tree/lib/makeMutationCommandFactory';
import type { TraversableObject } from '@traversable-object-tree/lib/TraversableObject';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type {
  ObjectTreeOptions,
  ObjectTreeBaseOptions,
  ObjectTreePropertyAdapters,
  ObjectTreeResolvedOptions,
} from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type { ObjectTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';

type ObjectCycleState = {
  seenIdentities: WeakSet<object>;
  originalIdentityByVertexRef: WeakMap<object, object | null>;
};

export class ObjectTreeSource<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = unknown,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
> implements
    TreeSource<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
    >
{
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
  static createRootPropertyMapper = createRootPropertyMapper;

  static fromProperties<
    In,
    InK extends TraversableObjectPropKey,
    InV,
    OutK extends TraversableObjectPropKey = InK,
    OutV = InV,
  >(
    rootObject: In,
    options: ObjectTreeBaseOptions<In, InK, InV, OutK, OutV> &
      ObjectTreePropertyAdapters<In, InK, InV>,
  ): ObjectTreeSource<In, InK, InV, OutK, OutV> {
    assertOwnKeys(options, OBJECT_SOURCE_OPTION_KEYS);
    const {
      getRootPropertyFromInputObject,
      getChildrenOfProperty,
      ...otherOptions
    } = definedOptions(options);
    if (
      typeof getRootPropertyFromInputObject !== 'function' ||
      typeof getChildrenOfProperty !== 'function'
    ) {
      throw new TypeError(
        'fromProperties requires root and child property adapters',
      );
    }
    return new ObjectTreeSource<In, InK, InV, OutK, OutV>(rootObject, {
      ...otherOptions,
      getRootPropertyFromInputObject,
      getChildrenOfProperty,
    });
  }

  constructor(
    rootObject: In,
    options: ObjectTreeBaseOptions<In, InK, InV, OutK, OutV> &
      ObjectTreePropertyAdapters<In, InK, InV>,
  );

  constructor(
    rootObject: In,
    ...args: [TraversableObjectPropKey, unknown] extends [InK, InV]
      ? [options?: ObjectTreeOptions<In, InK, InV, OutK, OutV>]
      : [options: ObjectTreeOptions<In, InK, InV, OutK, OutV>]
  );
  constructor(
    rootObject: In,
    options?: ObjectTreeBaseOptions<In, InK, InV, OutK, OutV>,
  ) {
    if (options !== undefined) {
      assertOwnKeys(options, OBJECT_SOURCE_OPTION_KEYS);
      options = definedOptions(options);
      assertOptionalCallbacks(options, OBJECT_SOURCE_OPTION_KEYS);
    }
    this.rootObject = rootObject;
    const { resolveChildHook, ...otherOptions } = options ?? {};
    // The public signature requires both adapters for narrow domains. Default
    // adapters are used only for PropertyKey/unknown discovery.
    this.icfg = {
      getChildrenOfProperty:
        otherOptions.getChildrenOfProperty ??
        ObjectTreeSource.getChildrenOfPropertyDefault,
      getRootPropertyFromInputObject:
        otherOptions.getRootPropertyFromInputObject ??
        ObjectTreeSource.createRootPropertyMapper(),
      ...definedOptions(otherOptions),
      resolveChildHook,
    } as ObjectTreeResolvedOptions<In, InK, InV, OutK, OutV>;
  }

  static createObjectMutationBinder = createObjectMutationBinder;

  resolveRoot(): TreeVertexFound<ObjectTreeVertexTypes<InK, InV>> {
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
    vertexHint: ObjectTreeVertexTypes<InK, InV>['VertexHint'],
    options: TreeChildResolutionContext<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
    >,
  ): TreeVertexResolution<ObjectTreeVertexTypes<InK, InV>> {
    const canonicalHook = this.icfg.resolveChildHook;
    let result:
      | TreeVertexResolution<ObjectTreeVertexTypes<InK, InV>>
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
    prop: ObjectTreeVertexTypes<InK, InV>['VertexData'],
    options: TreeChildResolutionContext<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
    >,
  ): void {
    const valueIdentity = getObjectIdentity(prop.value);
    this.originalIdentityByVertexData.set(prop, valueIdentity);
    this.originalIdentityByResolutionContext.set(
      options.resolutionContext,
      valueIdentity,
    );

    let state = this.cycleStateByResolvedTree.get(options.resolvedTreeView);
    if (state === undefined) {
      state = {
        seenIdentities: new WeakSet(),
        originalIdentityByVertexRef: new WeakMap(),
      };
      this.cycleStateByResolvedTree.set(options.resolvedTreeView, state);
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
        ancestorRef = options.resolvedTreeView.getParentOf(ancestorRef);
      }
    }
    state.seenIdentities.add(valueIdentity);
  }

  private getOriginalIdentityOf(
    vertexRef: TreeChildResolutionContext<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
    >['resolutionContext']['parentVertexRef'],
    state: ObjectCycleState,
    options: TreeChildResolutionContext<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
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
        options.resolvedTreeView.getResolutionContextOf(vertexRef);
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
      ObjectTreeVertexTypes<InK, InV>,
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
    >['resolutionContext']['parentVertexRef'],
    options: TreeChildResolutionContext<
      ObjectTreeVertexTypes<InK, InV>,
      ObjectCurrentVertexTypes<
        ObjectTreeVertexTypes<InK, InV>,
        ObjectTreeVertexTypes<OutK, OutV>
      >
    >,
    finalKey?: TraversableObjectPropKey,
  ): string {
    const keys: TraversableObjectPropKey[] = options.resolvedTreeView
      .getPathTo(vertexRef, { noRoot: true })
      .map((ref) => {
        const context = options.resolvedTreeView.getResolutionContextOf(ref);
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
