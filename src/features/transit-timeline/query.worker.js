import { queryTimeline } from './query.js';

self.onmessage = ({ data }) => {
  try { self.postMessage({ type: 'result', result: queryTimeline(data) }); }
  catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
