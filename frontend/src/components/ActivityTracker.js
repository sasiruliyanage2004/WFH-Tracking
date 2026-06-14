// frontend/src/components/ActivityTracker.js
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';

function ActivityTracker() {
  const { token, isAuthenticated, user, onBreak } = useSelector((state) => state.auth);
  
  const mouseCount = useRef(0);
  const keyboardCount = useRef(0);
  const activeSeconds = useRef(0);
  const idleSeconds = useRef(0);
  const lastActivityTime = useRef(Date.now());
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Only track if authenticated employee and not on break, and not running in Electron
    if (!isAuthenticated || !token || user?.role !== 'Employee' || onBreak || window.api !== undefined) return;

    // Interaction handlers with mousemove throttling to prevent lag
    let lastMouseMoveRegistered = 0;
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMoveRegistered > 1000) {
        mouseCount.current += 1;
        lastActivityTime.current = now;
        lastMouseMoveRegistered = now;
      }
    };

    const handleKeyDown = () => {
      keyboardCount.current += 1;
      lastActivityTime.current = Date.now();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    // Timer to check active/idle split every second
    const secondInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityTime.current;
      const IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes threshold

      if (timeSinceLastActivity < IDLE_THRESHOLD_MS) {
        activeSeconds.current += 1;
      } else {
        idleSeconds.current += 1;
      }
    }, 1000);

    // Timer to sync logs with the server every 1 minute for interactive demo (5 minutes in standard prod)
    const syncInterval = setInterval(async () => {
      if (activeSeconds.current === 0 && idleSeconds.current === 0) return;

      try {
        await axios.post(
          `${API_URL}/api/monitoring/activity`,
          {
            activeSeconds: activeSeconds.current,
            idleSeconds: idleSeconds.current,
            keyboardCount: keyboardCount.current,
            mouseCount: mouseCount.current
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        // Reset local telemetry metrics after sync
        activeSeconds.current = 0;
        idleSeconds.current = 0;
        keyboardCount.current = 0;
        mouseCount.current = 0;
      } catch (err) {
        console.error('Failed to sync activity telemetry:', err.message);
      }
    }, 60000); // sync every 60 seconds

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(secondInterval);
      clearInterval(syncInterval);
    };
  }, [isAuthenticated, token, user, onBreak, API_URL]);

  return null; // Silent telemetry tracking component
}

export default ActivityTracker;
