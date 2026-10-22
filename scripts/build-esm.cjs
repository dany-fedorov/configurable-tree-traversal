const fs = require('node:fs');
const path = require('node:path');

// Facades share both runtime values and declaration origins with the CJS build.
const reservedBindings = new Set(
  (
    'await break case catch class const continue debugger default delete do else enum ' +
    'export extends false finally for function if implements import in instanceof ' +
    'interface let new null package private protected public return static super ' +
    'switch this throw true try typeof var void while with yield eval arguments'
  ).split(' '),
);

function generateFacades(directory) {
  for (const entry of fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      generateFacades(filename);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const names = Object.keys(require(filename))
        .filter((name) => name !== '__esModule' && name !== 'default')
        .sort();
      for (const name of names) {
        if (
          !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ||
          reservedBindings.has(name)
        ) {
          throw new Error(
            `Unsupported ESM export ${JSON.stringify(name)} in ${filename}`,
          );
        }
      }
      const sibling = JSON.stringify('./' + entry.name);
      fs.writeFileSync(
        filename.slice(0, -3) + '.mjs',
        [
          "import { createRequire } from 'node:module';",
          `const cjs = createRequire(import.meta.url)(${sibling});`,
          'export default cjs;',
          // Export aliases keep valid public names from colliding with facade locals.
          ...names.map(
            (name, index) =>
              `const value${index} = cjs.${name};\nexport { value${index} as ${name} };`,
          ),
          '',
        ].join('\n'),
      );
      fs.writeFileSync(
        filename.slice(0, -3) + '.d.mts',
        [
          `export * from ${sibling};`,
          `import cjs = require(${sibling});`,
          'export default cjs;',
          '',
        ].join('\n'),
      );
    }
  }
}

if (require.main === module)
  generateFacades(path.resolve(__dirname, '../dist'));
module.exports = { generateFacades };
