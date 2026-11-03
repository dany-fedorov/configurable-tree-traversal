import {
  assertOwnKeys,
  assertOptionalCallbacks,
  OBJECT_SOURCE_OPTION_KEYS,
  definedOptions,
} from '@core/assertPublicOptions';
import type { LiveObjectPropertyVertexTypes } from '@traversable-object-tree/lib/ObjectCurrentVertexTypes';
import {
  assertNoTreeMetadata,
  normalizeSourceResult,
} from '@core/drivers/normalizeSourceResult';
import type {
  TreeDiscoverySource,
  TreeVertexResolutionFound,
  TreeChildResolverContext,
  TreeVertexResolution,
} from '@core/TraversableTree';
import { normalizeVertexContent } from '@core/Vertex';
import { enumerateOwnEnumerableChildProperties } from '@traversable-object-tree/lib/getChildrenOfPropertyDefault';
import { createInputValueToRootPropertyMapper } from '@traversable-object-tree/lib/createRootPropertyMapper';
import { createObjectPropertyMutationHelperBinder } from '@traversable-object-tree/lib/makeMutationCommandFactory';
import type { NestedObjectOrArray } from '@traversable-object-tree/lib/TraversableObject';
import type { ObjectPropertyKey } from '@traversable-object-tree/lib/TraversableObjectPropKey';
import type {
  ObjectPropertyTreeSourceOptions,
  ObjectPropertyTreeBaseOptions,
  ObjectPropertyTreeAdapters,
  NormalizedObjectPropertyTreeSourceOptions,
} from '@traversable-object-tree/lib/TraversableObjectTreeInstanceConfig';
import type { ObjectPropertyTreeVertexTypes } from '@traversable-object-tree/lib/ObjectTreeVertexTypes';

type ObjectCycleState = {
  seenIdentities: WeakSet<object>;
  originalIdentityByVertexRef: WeakMap<object, object | null>;
};

export class ObjectPropertyTreeSource<
  InputValue = NestedObjectOrArray<ObjectPropertyKey, unknown>,
  InputPropertyKey extends ObjectPropertyKey = ObjectPropertyKey,
  InputPropertyValue = unknown,
  RewrittenPropertyKey extends ObjectPropertyKey = InputPropertyKey,
  RewrittenPropertyValue = InputPropertyValue,
> implements
    TreeDiscoverySource<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >
{
  private readonly icfg: NormalizedObjectPropertyTreeSourceOptions<
    InputValue,
    InputPropertyKey,
    InputPropertyValue,
    RewrittenPropertyKey,
    RewrittenPropertyValue
  >;
  public readonly inputRootValue: InputValue;
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

  static enumerateOwnEnumerableChildProperties =
    enumerateOwnEnumerableChildProperties;
  static createInputValueToRootPropertyMapper =
    createInputValueToRootPropertyMapper;

  static fromPropertyAdapters<
    InputValue,
    InputPropertyKey extends ObjectPropertyKey,
    InputPropertyValue,
    RewrittenPropertyKey extends ObjectPropertyKey = InputPropertyKey,
    RewrittenPropertyValue = InputPropertyValue,
  >(
    inputRootValue: InputValue,
    options: ObjectPropertyTreeBaseOptions<
      InputValue,
      InputPropertyKey,
      InputPropertyValue,
      RewrittenPropertyKey,
      RewrittenPropertyValue
    > &
      ObjectPropertyTreeAdapters<
        InputValue,
        InputPropertyKey,
        InputPropertyValue
      >,
  ): ObjectPropertyTreeSource<
    InputValue,
    InputPropertyKey,
    InputPropertyValue,
    RewrittenPropertyKey,
    RewrittenPropertyValue
  > {
    assertOwnKeys(options, OBJECT_SOURCE_OPTION_KEYS);
    const {
      mapInputToRootProperty,
      enumerateChildPropertyHints,
      ...otherOptions
    } = definedOptions(options);
    if (
      typeof mapInputToRootProperty !== 'function' ||
      typeof enumerateChildPropertyHints !== 'function'
    ) {
      throw new TypeError(
        'fromProperties requires root and child property adapters',
      );
    }
    return new ObjectPropertyTreeSource<
      InputValue,
      InputPropertyKey,
      InputPropertyValue,
      RewrittenPropertyKey,
      RewrittenPropertyValue
    >(inputRootValue, {
      ...otherOptions,
      mapInputToRootProperty,
      enumerateChildPropertyHints,
    });
  }

  constructor(
    inputRootValue: InputValue,
    options: ObjectPropertyTreeBaseOptions<
      InputValue,
      InputPropertyKey,
      InputPropertyValue,
      RewrittenPropertyKey,
      RewrittenPropertyValue
    > &
      ObjectPropertyTreeAdapters<
        InputValue,
        InputPropertyKey,
        InputPropertyValue
      >,
  );

  constructor(
    inputRootValue: InputValue,
    ...args: [ObjectPropertyKey, unknown] extends [
      InputPropertyKey,
      InputPropertyValue,
    ]
      ? [
          options?: ObjectPropertyTreeSourceOptions<
            InputValue,
            InputPropertyKey,
            InputPropertyValue,
            RewrittenPropertyKey,
            RewrittenPropertyValue
          >,
        ]
      : [
          options: ObjectPropertyTreeSourceOptions<
            InputValue,
            InputPropertyKey,
            InputPropertyValue,
            RewrittenPropertyKey,
            RewrittenPropertyValue
          >,
        ]
  );
  constructor(
    inputRootValue: InputValue,
    options?: ObjectPropertyTreeBaseOptions<
      InputValue,
      InputPropertyKey,
      InputPropertyValue,
      RewrittenPropertyKey,
      RewrittenPropertyValue
    >,
  ) {
    if (options !== undefined) {
      assertOwnKeys(options, OBJECT_SOURCE_OPTION_KEYS);
      options = definedOptions(options);
      assertOptionalCallbacks(options, OBJECT_SOURCE_OPTION_KEYS);
    }
    this.inputRootValue = inputRootValue;
    const { resolveChildPropertyOrUseDefault, ...otherOptions } = options ?? {};
    // The public signature requires both adapters for narrow domains. Default
    // adapters are used only for PropertyKey/unknown discovery.
    this.icfg = {
      enumerateChildPropertyHints:
        otherOptions.enumerateChildPropertyHints ??
        ObjectPropertyTreeSource.enumerateOwnEnumerableChildProperties,
      mapInputToRootProperty:
        otherOptions.mapInputToRootProperty ??
        ObjectPropertyTreeSource.createInputValueToRootPropertyMapper(),
      ...definedOptions(otherOptions),
      resolveChildPropertyOrUseDefault,
    } as NormalizedObjectPropertyTreeSourceOptions<
      InputValue,
      InputPropertyKey,
      InputPropertyValue,
      RewrittenPropertyKey,
      RewrittenPropertyValue
    >;
  }

  static createObjectPropertyMutationHelperBinder =
    createObjectPropertyMutationHelperBinder;

  resolveRootVertex(): TreeVertexResolutionFound<
    ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>
  > {
    const { enumerateChildPropertyHints, mapInputToRootProperty } = this.icfg;
    const rootProp = mapInputToRootProperty(this.inputRootValue);
    this.originalIdentityByVertexData.set(
      rootProp,
      getObjectIdentity(rootProp.propertyValue),
    );
    const children = enumerateChildPropertyHints(rootProp);
    return {
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: rootProp,
          $childDiscoveryHints: children,
        },
      },
    };
  }

  resolveChildVertexFromHint(
    childDiscoveryHint: ObjectPropertyTreeVertexTypes<
      InputPropertyKey,
      InputPropertyValue
    >['ChildHint'],
    options: TreeChildResolverContext<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >,
  ): TreeVertexResolution<
    ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>
  > {
    const canonicalHook = this.icfg.resolveChildPropertyOrUseDefault;
    let result:
      | TreeVertexResolution<
          ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>
        >
      | undefined;
    if (canonicalHook !== undefined) {
      const resolved = canonicalHook(childDiscoveryHint, options);
      if (resolved === null || typeof resolved !== 'object') {
        throw new TypeError('Invalid object resolution hook result');
      }
      assertNoTreeMetadata(resolved);
      if (resolved.kind !== 'useDefaultChildPropertyResolution') {
        if (
          resolved.kind !== 'vertexResolved' &&
          resolved.kind !== 'vertexIntentionallyOmitted'
        ) {
          throw new TypeError('Invalid object resolution hook kind');
        }
        result = resolved;
      }
    }
    if (result !== undefined) {
      const normalized = normalizeSourceResult(result, false, 'Tree source')!;
      if (normalized.vertexContent === null)
        return { kind: 'vertexIntentionallyOmitted' };
      const content = normalizeVertexContent(normalized.vertexContent);
      this.assertNoObjectIdentityCycle(content.$vertexData, options);
      return {
        kind: 'vertexResolved',
        resolvedVertexInput: { vertexContentInput: content },
      };
    }
    const { enumerateChildPropertyHints } = this.icfg;
    this.assertNoObjectIdentityCycle(childDiscoveryHint, options);
    const hints = enumerateChildPropertyHints(childDiscoveryHint);
    return {
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: childDiscoveryHint,
          $childDiscoveryHints: hints,
        },
      },
    };
  }

  private assertNoObjectIdentityCycle(
    prop: ObjectPropertyTreeVertexTypes<
      InputPropertyKey,
      InputPropertyValue
    >['VertexData'],
    options: TreeChildResolverContext<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >,
  ): void {
    const valueIdentity = getObjectIdentity(prop.propertyValue);
    this.originalIdentityByVertexData.set(prop, valueIdentity);
    this.originalIdentityByResolutionContext.set(
      options.childDiscoveryContext,
      valueIdentity,
    );

    let state = this.cycleStateByResolvedTree.get(options.liveResolvedTreeView);
    if (state === undefined) {
      state = {
        seenIdentities: new WeakSet(),
        originalIdentityByVertexRef: new WeakMap(),
      };
      this.cycleStateByResolvedTree.set(options.liveResolvedTreeView, state);
    }

    const parentRef = options.childDiscoveryContext.parentVertexHandle;
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
              prop.propertyKey,
            )}; value repeats ancestor at ${this.formatPathTo(
              ancestorRef,
              options,
            )}`,
          );
        }
        ancestorRef =
          options.liveResolvedTreeView.getParentVertexHandleOrNull(ancestorRef);
      }
    }
    state.seenIdentities.add(valueIdentity);
  }

  private getOriginalIdentityOf(
    vertexHandle: TreeChildResolverContext<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >['childDiscoveryContext']['parentVertexHandle'],
    state: ObjectCycleState,
    options: TreeChildResolverContext<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >,
  ): object | null {
    if (state.originalIdentityByVertexRef.has(vertexHandle)) {
      return state.originalIdentityByVertexRef.get(vertexHandle) ?? null;
    }

    const vertexData = vertexHandle.getCurrentVertexView().getVertexData();
    let identity = this.originalIdentityByVertexData.get(vertexData);
    if (identity === undefined) {
      // This cache tracks the identity of the accepted resolution context.
      const context =
        options.liveResolvedTreeView.getChildDiscoveryContextOrNull(
          vertexHandle,
        );
      identity =
        context !== null &&
        this.originalIdentityByResolutionContext.has(context)
          ? this.originalIdentityByResolutionContext.get(context)
          : getObjectIdentity(
              context === null
                ? vertexData.propertyValue
                : context.childDiscoveryHint.propertyValue,
            );
    }

    const result = identity ?? null;
    state.originalIdentityByVertexRef.set(vertexHandle, result);
    return result;
  }

  private formatPathTo(
    vertexHandle: TreeChildResolverContext<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >['childDiscoveryContext']['parentVertexHandle'],
    options: TreeChildResolverContext<
      ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
      LiveObjectPropertyVertexTypes<
        ObjectPropertyTreeVertexTypes<InputPropertyKey, InputPropertyValue>,
        ObjectPropertyTreeVertexTypes<
          RewrittenPropertyKey,
          RewrittenPropertyValue
        >
      >
    >,
    finalKey?: ObjectPropertyKey,
  ): string {
    const keys: ObjectPropertyKey[] = options.liveResolvedTreeView
      .requireStructuralAncestorPathTo(vertexHandle, {
        includeDesignatedRoot: false,
      })
      .map((ref) => {
        const context =
          options.liveResolvedTreeView.getChildDiscoveryContextOrNull(ref);
        return (
          context?.childDiscoveryHint.propertyKey ??
          ref.getCurrentVertexView().getVertexData().propertyKey
        );
      });
    if (finalKey !== undefined) {
      keys.push(finalKey);
    }
    return `$${keys.map(formatObjectPathKey).join('')}`;
  }
}

function getObjectIdentity(propertyValue: unknown): object | null {
  return propertyValue !== null &&
    (typeof propertyValue === 'object' || typeof propertyValue === 'function')
    ? (propertyValue as object)
    : null;
}

function formatObjectPathKey(propertyKey: ObjectPropertyKey): string {
  if (typeof propertyKey === 'number') {
    return `[${propertyKey}]`;
  }
  if (typeof propertyKey === 'symbol') {
    return `[${String(propertyKey)}]`;
  }
  return /^[A-Za-z_$][\w$]*$/.test(propertyKey)
    ? `.${propertyKey}`
    : `[${JSON.stringify(propertyKey)}]`;
}
