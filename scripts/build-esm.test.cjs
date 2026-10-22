const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');
const { generateFacades } = require('./build-esm.cjs');

function fixture(t, name, source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ctt-esm-build-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, name + '.js');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, source);
  fs.writeFileSync(path.join(directory, name + '.d.ts'), 'export {};\n');
  return { directory, filename };
}

// Catch duplicate values, omitted exports, non-deterministic output and skipped nested modules.
test('facades preserve real runtime values and the default namespace at every depth', async (t) => {
  const { directory, filename } = fixture(
    t,
    'nested/value',
    `
    exports.zebra = Symbol('shared');
    exports.Alpha = class Alpha {};
    exports.cjs = { shared: true };
    exports.createRequire = () => 'public export';
    exports.value0 = 42;
    exports.__esModule = true;
    exports.default = { original: true };
  `,
  );
  generateFacades(directory);
  const facade = filename.slice(0, -3) + '.mjs';
  const imported = await import(pathToFileURL(facade).href);
  const required = require(filename);
  assert.deepEqual(Object.keys(imported).sort(), [
    'Alpha',
    'cjs',
    'createRequire',
    'default',
    'value0',
    'zebra',
  ]);
  assert.equal(imported.default, required);
  assert.equal(imported.zebra, required.zebra);
  assert.equal(imported.cjs, required.cjs);
  assert.equal(imported.createRequire, required.createRequire);
  assert.equal(imported.value0, 42);
  assert(new imported.Alpha() instanceof required.Alpha);
  const before = fs.readFileSync(facade, 'utf8');
  generateFacades(directory);
  assert.equal(fs.readFileSync(facade, 'utf8'), before);
  assert(fs.existsSync(filename.slice(0, -3) + '.d.mts'));
});

test('type-only modules still have an importable default namespace', async (t) => {
  const { directory, filename } = fixture(
    t,
    'types',
    'Object.defineProperty(exports, "__esModule", { value: true });',
  );
  generateFacades(directory);
  const imported = await import(
    pathToFileURL(filename.slice(0, -3) + '.mjs').href
  );
  assert.deepEqual(Object.keys(imported), ['default']);
  assert.equal(imported.default, require(filename));
});

// Invalid names must fail explicitly rather than silently disappearing from the ESM API.
for (const name of ['bad-name', 'class', 'await', 'eval', 'arguments']) {
  test('rejects unsupported named export ' + name, (t) => {
    const { directory } = fixture(
      t,
      'invalid',
      'exports[' + JSON.stringify(name) + '] = 1;',
    );
    assert.throws(() => generateFacades(directory), /Unsupported ESM export/);
  });
}
