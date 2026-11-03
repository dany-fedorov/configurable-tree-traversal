import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type {
  TreeOrDagDeletionCommandName,
  TreeVertexPhaseVisitorCallback,
  TraversalVisitorCommand,
} from '@core/TraversalVisitor';
import type { TraversalVisitorCommandName } from '@core/TraversalVisitor';

export type VertexDataReplacementOrDeletionRequest<ReplacementDataInput> =
  | {
      kind: 'replaceData';
      replacementData: ReplacementDataInput;
      patch?: never;
    }
  | { kind: 'delete'; replacementData?: never; patch?: never }
  | { kind: 'keep'; replacementData?: never; patch?: never };

export type VertexDataReplacementOrDeletionCommand<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  Delete extends TreeOrDagDeletionCommandName = TreeOrDagDeletionCommandName,
> = TraversalVisitorCommand<
  InputVertexTypes,
  | Delete
  | TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA
  | TraversalVisitorCommandName.NO_OPERATION
>;

export type VertexDataMutationCommandTools<
  OutputVertexTypes extends VertexDataAndChildHintTypes,
  ReplacementDataInput = OutputVertexTypes['VertexData'],
  Delete extends TreeOrDagDeletionCommandName = TreeOrDagDeletionCommandName,
> = {
  makeVertexDataMutationCommand: VertexDataMutationCommandBuilder<
    OutputVertexTypes,
    ReplacementDataInput,
    Delete
  >;
};

/** Generic builders replace complete output data; adapters can name another input. */
export type VertexDataMutationCommandBuilder<
  OutputVertexTypes extends VertexDataAndChildHintTypes,
  ReplacementDataInput = OutputVertexTypes['VertexData'],
  Delete extends TreeOrDagDeletionCommandName = TreeOrDagDeletionCommandName,
> = (
  request?: VertexDataReplacementOrDeletionRequest<ReplacementDataInput>,
) => VertexDataReplacementOrDeletionCommand<OutputVertexTypes, Delete>;

export type TreeVisitorVertexDataMutationToolsBinder<
  Phase extends string,
  InputVertexTypes extends VertexDataAndChildHintTypes,
  OutputVertexTypes extends VertexDataAndChildHintTypes,
  ReplacementDataInput = OutputVertexTypes['VertexData'],
> = (
  ...visitorArguments: Parameters<
    TreeVertexPhaseVisitorCallback<InputVertexTypes, OutputVertexTypes, Phase>
  >
) => VertexDataMutationCommandTools<
  OutputVertexTypes,
  ReplacementDataInput,
  TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS
>;

export type TreeVisitorVertexDataMutationToolsBinderFactory<
  BinderOptions = unknown,
> = <
  Phase extends string,
  InputVertexTypes extends VertexDataAndChildHintTypes,
  OutputVertexTypes extends VertexDataAndChildHintTypes,
  ReplacementDataInput = OutputVertexTypes['VertexData'],
>(
  options?: BinderOptions,
) => TreeVisitorVertexDataMutationToolsBinder<
  Phase,
  InputVertexTypes,
  OutputVertexTypes,
  ReplacementDataInput
>;
