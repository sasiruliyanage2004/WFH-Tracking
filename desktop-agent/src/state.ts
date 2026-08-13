import { BrowserWindow, Tray } from 'electron';

export const BACKEND_URL = process.env.REACT_APP_API_URL || 'https://wfh-tracking.onrender.com';

export const GlobalState = {
  mainWindow: null as BrowserWindow | null,
  splashWindow: null as BrowserWindow | null,
  sessionToken: null as string | null,
  tray: null as Tray | null,

  trackingInterval: null as NodeJS.Timeout | null,
  trackingActive: false,
  sleepBlockerId: null as number | null,
  totalTrackedSeconds: 0,
  usageBuffer: {} as Record<string, any>,
  tickCount: 0,

  activityProcess: null as any,
  localKeyboardCount: 0,
  localMouseCount: 0,
  activeSecondsInTick: 0,
  idleSecondsInTick: 0,
  isSuspiciousTick: false,
  lastInputTime: Date.now(),
  currentActiveAppType: 'Neutral',

  wasIdleBefore: false,
  maxIdleTimeSecs: 0,
  idleCheckInterval: null as NodeJS.Timeout | null,

  breakInterval: null as NodeJS.Timeout | null,
  activeMinutesOnBreak: 0,
  
  isCheckingOut: false
};
