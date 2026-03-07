import path from 'path';
import { EventEmitter } from 'events';

const requireNestedPackage = (packageName, nestedPackageName) => {
  const packageDir = path.dirname(require.resolve(`${packageName}/package.json`));
  return require(path.join(packageDir, 'node_modules', nestedPackageName, 'package.json'));
};

describe('dependency security resolutions', () => {
  test('pins patched vulnerable transitive dependencies', () => {
    expect(require('serialize-javascript/package.json').version).toBe('7.0.3');
    expect(require('minimatch/package.json').version).toBe('3.1.3');
    expect(requireNestedPackage('filelist', 'minimatch').version).toBe('5.1.8');
    expect(requireNestedPackage('postcss-svgo', 'svgo').version).toBe('2.8.1');
    expect(require('@tootallnate/once/package.json').version).toBe('3.0.1');
  });

  test('patched @tootallnate/once rejects aborted waits instead of hanging', async () => {
    const once = require('@tootallnate/once');
    const emitter = new EventEmitter();
    const controller = new AbortController();

    const waiting = once(emitter, 'done', { signal: controller.signal });
    controller.abort();

    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
  });
});
