import * as uuid from 'uuid';

export class CTTRef<T> {
  private _ref: T;
  private _id: string;

  constructor(ref: T) {
    this._ref = ref;
    this._id = uuid.v4();
  }

  unref(): T {
    return this._ref;
  }

  setPointsTo(ref: T): void {
    this._ref = ref;
  }

  getId(): string {
    return this._id;
  }
}
