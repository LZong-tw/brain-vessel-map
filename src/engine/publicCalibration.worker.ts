import { calibratePublicM1 } from './publicCalibration';

self.onmessage = () => {
  try { self.postMessage({ result: calibratePublicM1() }); }
  catch { self.postMessage({ error: true }); }
};
