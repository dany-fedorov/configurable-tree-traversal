import * as uuid from 'uuid';

export class MutableValueReference<T> {
  private _ref: T;
  private readonly _id: string;

  constructor(ref: T) {
    this._ref = ref;
    this._id = uuid.v4();
  }

  getReferencedValue(): T {
    return this._ref;
  }

  replaceReferencedValue(ref: T): void {
    this._ref = ref;
  }

  getReferenceIdentity(): string {
    return this._id;
  }
}

/** Stable observation identity with no editing authority. */
export interface VertexHandle<
  InputVertexTypes extends import('./TreeTypeParameters').VertexDataAndChildHintTypes,
> {
  getCurrentVertexView(): import('./Vertex').VertexView<InputVertexTypes>;
  getReferenceIdentity(): string;
}
