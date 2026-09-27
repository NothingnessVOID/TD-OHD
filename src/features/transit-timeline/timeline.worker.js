import { calculateTimeline } from './core.js';
import { snapshot, stateAt, catalog } from './provider.js';

self.onmessage = ({ data }) => {
  try {
    const eventLevel = data.eventLevel || 'gate';
    const selectedSnapshot = data.planet && data.planet !== 'all'
      ? instant => ({ [data.planet]: snapshot(instant)[data.planet] }) : snapshot;
    const result = calculateTimeline({
      start: data.start, end: data.end, snapshot: selectedSnapshot, catalog: catalog(eventLevel), eventLevel,
      states: activations => stateAt(data.natal, activations, data.mode, eventLevel),
      onProgress: progress => self.postMessage({ type: 'progress', progress })
    });
    self.postMessage({ type: 'result', result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};
