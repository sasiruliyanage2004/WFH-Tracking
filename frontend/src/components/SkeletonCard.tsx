// frontend/src/components/SkeletonCard.js
import React from 'react';
import { Box, Card, CardContent, Skeleton } from '@mui/material';

/**
 * Reusable shimmer skeleton card shown while data is loading.
 * Props:
 *   height   – card height (default 140)
 *   variant  – 'stat' | 'chart' | 'list' | 'full'
 */
function SkeletonCard({ height = 140, variant = 'stat', count = 1 }) {
  if (variant === 'stat') {
    return (
      <Card sx={{ borderRadius: 4, height }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="55%" height={14} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="45%" height={40} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="70%" height={12} />
            </Box>
            <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 3, ml: 2 }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'chart') {
    return (
      <Card sx={{ borderRadius: 4, height }}>
        <CardContent sx={{ p: 3 }}>
          <Skeleton variant="text" width="40%" height={16} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" width="100%" height={height - 80} sx={{ borderRadius: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (variant === 'list') {
    return (
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          {Array.from({ length: count }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="40%" height={12} />
              </Box>
              <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: 2 }} />
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  // 'full' — full placeholder block
  return (
    <Card sx={{ borderRadius: 4 }}>
      <CardContent sx={{ p: 3 }}>
        <Skeleton variant="text" width="45%" height={24} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" width="100%" height={height} sx={{ borderRadius: 2 }} />
      </CardContent>
    </Card>
  );
}

export default SkeletonCard;
