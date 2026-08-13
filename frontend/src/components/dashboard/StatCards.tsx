import React from 'react';
import { Card, Box, Typography, LinearProgress, Chip } from '@mui/material';
import { AccessTime as AccessTimeIcon, TrendingUp as TrendingUpIcon, TaskAlt as CheckIcon } from '@mui/icons-material';
import AnimatedCounter from '../AnimatedCounter';

interface StatCardsProps {
  attendance: any;
  liveHours: string;
  shiftProgressPercent: number;
  productivity: number;
  completedTasksCount: number;
  totalTasksCount: number;
  taskProgressPercent: number;
}

const StatCards: React.FC<StatCardsProps> = ({
  attendance,
  liveHours,
  shiftProgressPercent,
  productivity,
  completedTasksCount,
  totalTasksCount,
  taskProgressPercent
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: { xs: 'auto', md: '100%' } }}>
      {/* 1. Shift Progress Card */}
      <Card 
        sx={{ 
          borderRadius: 4, 
          p: 3, 
          flex: '1 1 auto', 
          minHeight: 140, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              Shift Progress
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: attendance ? 'primary.main' : 'text.primary', fontFamily: 'monospace' }}>
              {attendance ? liveHours : '00:00:00'}
            </Typography>
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: attendance ? 'rgba(79, 142, 247, 0.15)' : 'action.selected', color: attendance ? 'primary.main' : 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccessTimeIcon sx={{ fontSize: 24 }} />
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={shiftProgressPercent} 
            sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {attendance ? `Completed ${shiftProgressPercent}% of 8 hrs target` : 'Not Checked-In'}
            </Typography>
          </Box>
          
          {/* Break History Section */}
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1, fontSize: '0.65rem' }}>
              Today's Breaks
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {attendance && Array.isArray(attendance.breakHistory) && attendance.breakHistory.length > 0 ? (
                attendance.breakHistory.map((brk: any, i: number) => {
                  const start = new Date(brk?.startTime || brk?.start_time);
                  const end = (brk?.endTime || brk?.end_time) ? new Date(brk.endTime || brk.end_time) : new Date();
                  const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
                  return (
                    <Chip 
                      key={i} 
                      label={`${brk?.breakType || brk?.break_type || brk?.type || 'Break'} Break (${diffMins}m)`} 
                      size="small" 
                      icon={<AccessTimeIcon sx={{ fontSize: '0.8rem !important' }} />}
                      sx={{ 
                        fontSize: '0.7rem', 
                        height: 24, 
                        bgcolor: 'rgba(245, 158, 11, 0.1)', 
                        color: '#fbbf24',
                        fontWeight: 600,
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        '& .MuiChip-icon': { color: 'inherit' }
                      }} 
                    />
                  );
                })
              ) : (
                <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', fontWeight: 500 }}>
                  No breaks recorded today.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Card>

      {/* 2. Productivity Level Card */}
      <Card 
        sx={{ 
          borderRadius: 4, 
          p: 3, 
          flex: '1 1 auto', 
          minHeight: 140, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              Productivity Level
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: productivity >= 70 ? 'success.main' : 'warning.main' }}>
              <AnimatedCounter value={productivity} suffix="%" />
            </Typography>
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: productivity >= 70 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)', color: productivity >= 70 ? 'success.main' : 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUpIcon sx={{ fontSize: 24 }} />
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={productivity} 
            color={productivity >= 70 ? 'success' : 'warning'}
            sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
            {productivity >= 70 ? '🛡️ Privacy Auto-Delete Enabled' : '⚠️ Full Telemetry Audit Mode'}
          </Typography>
        </Box>
      </Card>

      {/* 3. Tasks Completed Card */}
      <Card 
        sx={{ 
          borderRadius: 4, 
          p: 3, 
          flex: '1 1 auto', 
          minHeight: 140, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              Tasks Completed
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#a78bfa', display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <AnimatedCounter value={completedTasksCount} />
              <Typography component="span" variant="h5" color="text.secondary" sx={{ fontWeight: 600 }}>
                / {totalTasksCount}
              </Typography>
            </Typography>
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(167, 139, 250, 0.15)', color: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckIcon sx={{ fontSize: 24 }} />
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={taskProgressPercent} 
            sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: '#a78bfa', borderRadius: 3 } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
            {totalTasksCount > 0 ? `${taskProgressPercent}% of assigned tasks completed` : 'No tasks assigned'}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default StatCards;
