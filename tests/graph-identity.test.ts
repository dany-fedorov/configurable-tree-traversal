import { CTTRef } from '../src/core/CTTRef';
import {
  createVertexIdLabeler,
  hasVertexId,
  sameVertexId,
} from '../src/core/graph/identity';

test('compares vertex ids with SameValueZero semantics', () => {
  const first = { key: 'same shape' };
  const second = { key: 'same shape' };

  expect(sameVertexId(NaN, NaN)).toBe(true);
  expect(sameVertexId(0, -0)).toBe(true);
  expect(sameVertexId(first, first)).toBe(true);
  expect(sameVertexId(first, second)).toBe(false);
});

test('distinguishes an absent vertex id from an explicit undefined id', () => {
  expect(hasVertexId({})).toBe(false);
  expect(hasVertexId({ vertexId: undefined })).toBe(true);
});

test('new references generate independent UUID ids', () => {
  const first = new CTTRef({});
  const second = new CTTRef({});

  expect(first.getId()).not.toBe(second.getId());
});

test('diagnostic labels are literal for primitives and stable for references', () => {
  const label = createVertexIdLabeler();
  const dangerous = {
    toString: () => {
      throw new Error('must not stringify an id');
    },
    toJSON: () => {
      throw new Error('must not serialize an id');
    },
  };
  const other = {};

  expect(label(undefined)).toBe('undefined');
  expect(label(null)).toBe('null');
  expect(label('vertex')).toBe('"vertex"');
  expect(label(NaN)).toBe('NaN');
  expect(label(dangerous)).toBe('reference#1');
  expect(label(dangerous)).toBe('reference#1');
  expect(label(other)).toBe('reference#2');
});
