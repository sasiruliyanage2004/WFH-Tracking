"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalState = exports.BACKEND_URL = void 0;
exports.BACKEND_URL = process.env.REACT_APP_API_URL || 'https://wfh-tracking.onrender.com';
exports.GlobalState = {
    mainWindow: null,
    splashWindow: null,
    sessionToken: null,
    tray: null,
    trackingInterval: null,
    trackingActive: false,
    sleepBlockerId: null,
    totalTrackedSeconds: 0,
    usageBuffer: {},
    tickCount: 0,
    activityProcess: null,
    localKeyboardCount: 0,
    localMouseCount: 0,
    activeSecondsInTick: 0,
    idleSecondsInTick: 0,
    isSuspiciousTick: false,
    lastInputTime: Date.now(),
    currentActiveAppType: 'Neutral',
    wasIdleBefore: false,
    maxIdleTimeSecs: 0,
    idleCheckInterval: null,
    breakInterval: null,
    activeMinutesOnBreak: 0,
    isCheckingOut: false
};
