const { fetch, Headers, Request, Response, FormData, File, Blob } = globalThis;

module.exports = {
  fetch: (...args) => {
    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is not available in this environment.');
    }
    return fetch(...args);
  },
  Headers,
  Request,
  Response,
  FormData,
  File,
  Blob
};
