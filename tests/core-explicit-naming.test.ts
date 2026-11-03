import { MutableValueReference } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';
import {
  createVertexHandleFacet,
  vertexView,
} from '../src/core/observationFacets';

test('explicit vertex observations preserve shallow identity and detached hint membership', () => {
  const data = { marker: Symbol('data') };
  const hint = { marker: Symbol('hint') };
  const vertex = new Vertex({
    $vertexData: data,
    $childDiscoveryHints: [hint],
  });
  expect(vertex.hasChildDiscoveryHints()).toBe(true);
  expect(
    new Vertex({
      $vertexData: data,
      $childDiscoveryHints: [],
    }).hasChildDiscoveryHints(),
  ).toBe(false);
  const view = vertexView(vertex);
  expect(view.getDetachedChildDiscoveryHints()).toEqual([hint]);
  expect(view.getDetachedChildDiscoveryHints()).not.toBe(
    vertex.getMutableChildDiscoveryHints(),
  );
  expect(Object.isFrozen(view.getDetachedChildDiscoveryHints())).toBe(true);
  const clone = view.createEditableShallowCloneWithContentOverrides();
  expect(clone.getVertexData()).toBe(data);
  expect(clone.getMutableChildDiscoveryHints()[0]).toBe(hint);
  clone.getMutableChildDiscoveryHints().length = 0;
  expect(view.getDetachedChildDiscoveryHints()).toEqual([hint]);
});

test('mutable value references and vertex handles expose distinct reading authority', () => {
  const first = new Vertex({ $vertexData: 'first', $childDiscoveryHints: [] });
  const ref = new MutableValueReference(first);
  const handle = createVertexHandleFacet(ref);
  const before = handle.getCurrentVertexView();
  ref.replaceReferencedValue(
    new Vertex({ $vertexData: 'second', $childDiscoveryHints: [] }),
  );
  expect(ref.getReferencedValue().getVertexData()).toBe('second');
  expect(handle.getCurrentVertexView().getVertexData()).toBe('second');
  expect(before.getVertexData()).toBe('first');
  expect('getValue' in handle).toBe(false);
  expect('getValue' in ref).toBe(false);
});
