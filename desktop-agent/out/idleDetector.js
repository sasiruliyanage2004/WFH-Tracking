"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startIdleDetection = startIdleDetection;
const electron_1 = require("electron");
const state_1 = require("./state");
const tracker_1 = require("./tracker");
function startIdleDetection() {
    if (state_1.GlobalState.idleCheckInterval)
        clearInterval(state_1.GlobalState.idleCheckInterval);
    state_1.GlobalState.idleCheckInterval = setInterval(() => {
        try {
            if (!state_1.GlobalState.trackingActive) {
                state_1.GlobalState.wasIdleBefore = false;
                state_1.GlobalState.maxIdleTimeSecs = 0;
                return;
            }
            const idleTimeSecs = electron_1.powerMonitor.getSystemIdleTime();
            if (idleTimeSecs >= 900) {
                if (idleTimeSecs >= 7200) { // 2 hours
                    console.log(`Desktop Agent: User idle for >= 2 hours. Auto-checkout triggered.`);
                    if (state_1.GlobalState.mainWindow && !state_1.GlobalState.mainWindow.isDestroyed()) {
                        state_1.GlobalState.mainWindow.webContents.send('idle:auto-checkout');
                    }
                    state_1.GlobalState.wasIdleBefore = false;
                    state_1.GlobalState.maxIdleTimeSecs = 0;
                    (0, tracker_1.stopTracking)();
                }
                else {
                    state_1.GlobalState.wasIdleBefore = true;
                    if (idleTimeSecs > state_1.GlobalState.maxIdleTimeSecs) {
                        state_1.GlobalState.maxIdleTimeSecs = idleTimeSecs;
                    }
                }
            }
            else {
                if (state_1.GlobalState.wasIdleBefore) {
                    const idleMins = Math.round(state_1.GlobalState.maxIdleTimeSecs / 60);
                    console.log(`Desktop Agent: User returned after being idle for ${idleMins} minutes. Sending prompt to frontend.`);
                    if (state_1.GlobalState.mainWindow && !state_1.GlobalState.mainWindow.isDestroyed()) {
                        state_1.GlobalState.mainWindow.webContents.send('idle:prompt-break', {
                            durationMinutes: idleMins
                        });
                    }
                    state_1.GlobalState.wasIdleBefore = false;
                    state_1.GlobalState.maxIdleTimeSecs = 0;
                }
            }
        }
        catch (err) {
            console.error('Idle detection error:', err.message);
        }
    }, 5000);
}
