import type { VertexTypes } from '@core/TreeTypeParameters';
import type { ObjectTreeVertexTypes } from './ObjectTreeVertexTypes';
import type { TraversableObjectProp } from './TraversableObjectProp';
import type { TraversableObjectPropKey } from './TraversableObjectPropKey';

// Distribute over metadata alternatives without retaining their old correlations
// to key/value: either property field can change independently of that metadata.
type PropertyMetadata<Data> = Data extends unknown
  ? Omit<Data, 'key' | 'value'>
  : never;

/** Live object records after any sequence of key-only/value-only patches. */
export type ObjectCurrentVertexTypes<
  InputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
  OutputTypes extends ObjectTreeVertexTypes<TraversableObjectPropKey, unknown>,
> = VertexTypes<
  // Explicit original members also let generic implementations prove that
  // unchanged/replaced data belongs to this domain. Each metadata alternative
  // is additionally present below with independently widened key/value fields.
  | InputTypes['VertexData']
  | OutputTypes['VertexData']
  | (PropertyMetadata<InputTypes['VertexData'] | OutputTypes['VertexData']> &
      TraversableObjectProp<
        InputTypes['VertexData']['key'] | OutputTypes['VertexData']['key'],
        InputTypes['VertexData']['value'] | OutputTypes['VertexData']['value']
      >),
  InputTypes['VertexHint'] | OutputTypes['VertexHint']
>;
