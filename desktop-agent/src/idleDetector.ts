import { powerMonitor } from 'electron';
import { GlobalState } from './state';
import { stopTracking } from './tracker';

export function startIdleDetection() {
  if (GlobalState.idleCheckInterval) clearInterval(GlobalState.idleCheckInterval);
  
  GlobalState.idleCheckInterval = setInterval(() => {
    try {
      if (!GlobalState.trackingActive) {
        GlobalState.wasIdleBefore = false;
        GlobalState.maxIdleTimeSecs = 0;
        return;
      }

      const idleTimeSecs = powerMonitor.getSystemIdleTime();
      
      if (idleTimeSecs >= 900) {
        if (idleTimeSecs >= 7200) { // 2 hours
          console.log(`Desktop Agent: User idle for >= 2 hours. Auto-checkout triggered.`);
          if (GlobalState.mainWindow && !GlobalState.mainWindow.isDestroyed()) {
             GlobalState.mainWindow.webContents.send('idle:auto-checkout');
          }
          GlobalState.wasIdleBefore = false;
          GlobalState.maxIdleTimeSecs = 0;
          stopTracking();
        } else {
          GlobalState.wasIdleBefore = true;
          if (idleTimeSecs > GlobalState.maxIdleTimeSecs) {
            GlobalState.maxIdleTimeSecs = idleTimeSecs;
          }
        }
      } else {
        if (GlobalState.wasIdleBefore) {
          const idleMins = Math.round(GlobalState.maxIdleTimeSecs / 60);
          console.log(`Desktop Agent: User returned after being idle for ${idleMins} minutes. Sending prompt to frontend.`);
          if (GlobalState.mainWindow && !GlobalState.mainWindow.isDestroyed()) {
            GlobalState.mainWindow.webContents.send('idle:prompt-break', {
              durationMinutes: idleMins
            });
          }
          GlobalState.wasIdleBefore = false;
          GlobalState.maxIdleTimeSecs = 0;
        }
      }
    } catch (err: any) {
      console.error('Idle detection error:', err.message);
    }
  }, 5000);
}
