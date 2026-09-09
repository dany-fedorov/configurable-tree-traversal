import {
  AbstractTraversableTree,
  MakeVertexOptions,
  MakeVertexResult,
} from '@core/TraversableTree';
import type { TraversableObject } from '@traversable-object-tree/lib/TraversableObject';
import type { TraversableObjectPropKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObjectTTP } from '@traversable-object-tree/lib/TraversableObjectTTP';
import type {
  TraversableObjectTreeInstanceConfig,
  TraversableObjectTreeInstanceConfigInput,
} from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import { getChildrenOfPropertyDefault } from '@traversable-object-tree/lib/getChildrenOfPropertyDefault';
import { getRootPropertyFromInputObjectDefault } from '@traversable-object-tree/lib/getRootPropertyFromInputObjectDefault';
import { makeMutationCommandFactory } from '@traversable-object-tree/lib/makeMutationCommandFactory';

type ObjectCycleState = {
  seenIdentities: WeakSet<object>;
  originalIdentityByVertexRef: WeakMap<object, object | null>;
};

export class TraversableObjectTree<
  In = TraversableObject<TraversableObjectPropKey, unknown>,
  InK extends TraversableObjectPropKey = TraversableObjectPropKey,
  InV = TraversableObject<TraversableObjectPropKey, unknown> | unknown,
  OutK extends TraversableObjectPropKey = InK,
  OutV = InV,
> extends AbstractTraversableTree<
  TraversableObjectTTP<InK, InV>,
  TraversableObjectTTP<OutK, OutV>
> {
  private readonly icfg: TraversableObjectTreeInstanceConfig<
    In,
    InK,
    InV,
    OutK,
    OutV
  >;
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
    icfgInput?: TraversableObjectTreeInstanceConfigInput<
      In,
      InK,
      InV,
      OutK,
      OutV
    >,
  ) {
    super();
    this.rootObject = rootObject;
    this.icfg = {
      makeVertexHook: null,
      getChildrenOfProperty:
        icfgInput?.getChildrenOfProperty ??
        TraversableObjectTree.getChildrenOfPropertyDefault,
      getRootPropertyFromInputObject:
        icfgInput?.getRootPropertyFromInputObject ??
        TraversableObjectTree.getRootPropertyFromInputObjectDefault(),
      ...(icfgInput || {}),
    };
  }

  static makeMutationCommandFactory = makeMutationCommandFactory;

  makeRoot(): MakeVertexResult<TraversableObjectTTP<InK, InV>> {
    const { getChildrenOfProperty, getRootPropertyFromInputObject } = this.icfg;
    const rootProp = getRootPropertyFromInputObject(this.rootObject);
    this.originalIdentityByVertexData.set(
      rootProp,
      getObjectIdentity(rootProp.value),
    );
    const children = getChildrenOfProperty(rootProp);
    return {
      vertexContent: {
        $d: rootProp,
        $c: children,
      },
    };
  }

  makeVertex(
    vertexHint: TraversableObjectTTP<InK, InV>['VertexHint'],
    options: MakeVertexOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ): MakeVertexResult<TraversableObjectTTP<InK, InV>> {
    const res = this.icfg.makeVertexHook?.(vertexHint, options);
    if (res?.returnMe !== undefined) {
      if (res.returnMe === null) {
        return { vertexContent: null };
      }
      this.assertNoObjectIdentityCycle(res.returnMe.$d, options);
      return { vertexContent: res.returnMe };
    }
    const { getChildrenOfProperty } = this.icfg;
    this.assertNoObjectIdentityCycle(vertexHint, options);
    const hints = getChildrenOfProperty(vertexHint);
    return {
      vertexContent: {
        $d: vertexHint,
        $c: hints,
      },
    };
  }

  private assertNoObjectIdentityCycle(
    prop: TraversableObjectTTP<InK, InV>['VertexData'],
    options: MakeVertexOptions<
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
    vertexRef: MakeVertexOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >['resolutionContext']['parentVertexRef'],
    state: ObjectCycleState,
    options: MakeVertexOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
  ): object | null {
    if (state.originalIdentityByVertexRef.has(vertexRef)) {
      return state.originalIdentityByVertexRef.get(vertexRef) ?? null;
    }

    const vertexData = vertexRef.unref().getData();
    let identity = this.originalIdentityByVertexData.get(vertexData);
    if (identity === undefined) {
      const context = options.resolvedTree.getResolutionContextOf(vertexRef);
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
    vertexRef: MakeVertexOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >['resolutionContext']['parentVertexRef'],
    options: MakeVertexOptions<
      TraversableObjectTTP<InK, InV>,
      TraversableObjectTTP<OutK, OutV>
    >,
    finalKey?: TraversableObjectPropKey,
  ): string {
    const keys: TraversableObjectPropKey[] = options.resolvedTree
      .getPathTo(vertexRef, { noRoot: true })
      .map((ref) => {
        const context = options.resolvedTree.getResolutionContextOf(ref);
        return context?.vertexHint.key ?? ref.unref().getData().key;
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
