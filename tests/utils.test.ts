import { deepFreeze } from '../src/utils/deepFreeze';
import { jsonStringifySafe } from '../src/utils/jsonStringifySafe';

test('freezing cyclic configuration terminates and prevents nested mutations', () => {
  const child = { enabled: true };
  const config: { child: typeof child; again: typeof child; self?: unknown } = {
    child,
    again: child,
  };
  config.self = config;

  expect(deepFreeze(config)).toBe(config);
  expect(() => {
    config.child.enabled = false;
  }).toThrow(TypeError);
  expect(() => {
    config.self = null;
  }).toThrow(TypeError);
  expect(config.again.enabled).toBe(true);
});

test('freezing includes symbol and hidden metadata without evaluating getters', () => {
  const key = Symbol('policy');
  const metadata = { enabled: true };
  const handler = Object.assign(() => 'handled', { [key]: { retries: 2 } });
  let reads = 0;
  Object.defineProperties(handler, {
    metadata: { value: metadata, enumerable: false },
    computed: {
      get: () => {
        reads++;
        return {};
      },
    },
  });

  deepFreeze(handler);

  expect(reads).toBe(0);
  expect(handler()).toBe('handled');
  expect(() => {
    handler[key].retries = 3;
  }).toThrow(TypeError);
  expect(() => {
    metadata.enabled = false;
  }).toThrow(TypeError);
});

test('diagnostic serialization omits repeated references without losing scalar values', () => {
  const shared: { label: string; self?: unknown } = { label: 'child' };
  shared.self = shared;
  const input = {
    first: shared,
    second: shared,
    list: [shared, null],
    ok: false,
  };

  expect(jsonStringifySafe(input)).toBe(
    '{"first":{"label":"child"},"list":[null,null],"ok":false}',
  );
  expect(jsonStringifySafe(shared, 2)).toBe('{\n  "label": "child"\n}');
});
