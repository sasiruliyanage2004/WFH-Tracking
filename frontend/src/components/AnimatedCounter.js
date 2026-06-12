// frontend/src/components/AnimatedCounter.js
import React, { useEffect, useRef, useState } from 'react';
import { Typography } from '@mui/material';

/**
 * Animated number count-up component.
 * Props:
 *   value    – final number to count to
 *   duration – animation duration in ms (default 1200)
 *   suffix   – string appended after number (e.g. '%', ' hrs')
 *   prefix   – string prepended before number
 *   variant  – MUI Typography variant
 *   sx       – MUI sx styles
 */
function AnimatedCounter({ value = 0, duration = 1200, suffix = '', prefix = '', variant = 'h4', sx = {} }) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const targetValue = parseFloat(value) || 0;
  const isFloat = String(value).includes('.');
  const decimals = isFloat ? String(value).split('.')[1]?.length || 1 : 0;

  useEffect(() => {
    if (targetValue === 0) {
      setDisplayValue(0);
      return;
    }

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = easedProgress * targetValue;

      setDisplayValue(isFloat ? parseFloat(current.toFixed(decimals)) : Math.floor(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetValue, duration, isFloat, decimals]);

  return (
    <Typography variant={variant} sx={sx}>
      {prefix}{isFloat ? displayValue.toFixed(decimals) : displayValue}{suffix}
    </Typography>
  );
}

export default AnimatedCounter;
