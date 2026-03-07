'use strict';

function noop() {}

function createAbortError() {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

function spread(emitter, name, options = {}) {
  const { signal } = options;
  let cancel = noop;

  const promise = new Promise((resolve, reject) => {
    function cleanup() {
      if (signal && typeof signal.removeEventListener === 'function') {
        signal.removeEventListener('abort', onAbort);
      }

      emitter.removeListener(name, onEvent);
      emitter.removeListener('error', onError);
      cancel = noop;
    }

    function onEvent(...args) {
      cleanup();
      resolve(args);
    }

    function onError(error) {
      cleanup();
      reject(error);
    }

    function onAbort() {
      cleanup();
      reject(createAbortError());
    }

    cancel = cleanup;

    if (signal && signal.aborted) {
      onAbort();
      return;
    }

    if (signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    emitter.on(name, onEvent);
    emitter.on('error', onError);
  });

  promise.cancel = () => cancel();
  return promise;
}

function once(emitter, name, options) {
  const promise = spread(emitter, name, options);
  const result = promise.then((args) => args[0]);
  result.cancel = promise.cancel;
  return result;
}

once.spread = spread;

module.exports = once;
module.exports.default = once;
module.exports.spread = spread;
