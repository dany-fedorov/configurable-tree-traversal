import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { ObjectPropertyTreeVertexTypes } from './ObjectTreeVertexTypes';
import type { ObjectPropertyRecord } from './TraversableObjectProp';
import type { ObjectPropertyKey } from './TraversableObjectPropKey';

// Distribute over metadata alternatives without retaining their old correlations
// to key/value: either property field can change independently of that metadata.
type PropertyMetadata<Data> = Data extends unknown
  ? Omit<Data, 'propertyKey' | 'propertyValue'>
  : never;

/** Live keys/metadata survive patches; arbitrary reconstructed values are unknown. */
export type LiveObjectPropertyVertexTypes<
  InputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
  OutputTypes extends ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>,
> = VertexDataAndChildHintTypes<
  // Explicit original members also let generic implementations prove that
  // unchanged/replaced data belongs to this domain. Each metadata alternative
  // is additionally present below with independently widened key/value fields.
  | InputTypes['VertexData']
  | OutputTypes['VertexData']
  | (PropertyMetadata<InputTypes['VertexData'] | OutputTypes['VertexData']> &
      ObjectPropertyRecord<
        | InputTypes['VertexData']['propertyKey']
        | OutputTypes['VertexData']['propertyKey'],
        unknown
      >),
  InputTypes['ChildHint'] | OutputTypes['ChildHint']
>;
