// frontend/src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  CircularProgress,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Monitor as MonitorIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { authStart, authSuccess, authFail } from '../redux/store';

/* ── Left panel feature bullets ─────────────────────── */
const features = [
  { icon: '🛡️', title: 'Verified Check-In', desc: 'GPS + Selfie identity verification for every shift start.' },
  { icon: '📊', title: 'Live Analytics',     desc: 'Real-time productivity tracking and team heatmaps.' },
  { icon: '📸', title: 'Screen Monitoring',  desc: 'Scheduled screenshot captures with privacy controls.' },
  { icon: '📋', title: 'Smart Reports',      desc: 'Auto-generated daily work reports and manager approvals.' },
];

/* ── Animated floating orb ────────────────────────── */
const Orb = ({ size, top, left, right, bottom, color, delay = 0, dur = 7 }) => (
  <Box
    sx={{
      position: 'absolute',
      width: size, height: size,
      top, left, right, bottom,
      borderRadius: '50%',
      background: color,
      filter: 'blur(70px)',
      opacity: 0.5,
      animation: `orbFloat ${dur}s ease-in-out ${delay}s infinite alternate`,
      '@keyframes orbFloat': {
        '0%':   { transform: 'translateY(0) scale(1)' },
        '100%': { transform: 'translateY(-28px) scale(1.08)' },
      },
      pointerEvents: 'none',
    }}
  />
);

function Login() {
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [errorMsg,        setErrorMsg]        = useState('');
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [savedAccounts,   setSavedAccounts]   = useState(() => {
    const saved = localStorage.getItem('wfh_saved_accounts');
    if (saved) return JSON.parse(saved);
    const demo = [
      { email: 'employee1@wfh.com', password: 'password123' },
      { email: 'manager@wfh.com',   password: 'password123' },
    ];
    localStorage.setItem('wfh_saved_accounts', JSON.stringify(demo));
    return demo;
  });

  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { loading, isAuthenticated, user } = useSelector((s) => s.auth);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate((user.role === 'Manager' || user.role === 'SuperAdmin') ? '/manager/dashboard' : '/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const loginWithCredentials = async (loginEmail, loginPassword) => {
    try {
      dispatch(authStart());
      setErrorMsg('');
      const res = await axios.post(`${API_URL}/api/auth/login`, { email: loginEmail, password: loginPassword });
      dispatch(authSuccess({ token: res.data.token, user: res.data.user }));

      const updated = [
        { email: loginEmail, password: loginPassword },
        ...savedAccounts.filter(a => a.email !== loginEmail),
      ].slice(0, 5);
      localStorage.setItem('wfh_saved_accounts', JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please verify your credentials.';
      dispatch(authFail(msg));
      setErrorMsg(msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    await loginWithCredentials(email, password);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: '#060913',
        overflow: 'hidden',
      }}
    >
      {/* ══════════════════════════════════════════════
          LEFT PANEL — Brand identity
      ══════════════════════════════════════════════ */}
      <Box
        sx={{
          display:        { xs: 'none', md: 'flex' },
          flex:           '0 0 52%',
          flexDirection:  'column',
          justifyContent: 'center',
          alignItems:     'flex-start',
          px:             8,
          py:             6,
          position:       'relative',
          overflow:       'hidden',
          background: 'radial-gradient(ellipse at 25% 30%, #0f2060 0%, #060913 65%)',
          animation: 'leftPanelIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
          '@keyframes leftPanelIn': {
            from: { opacity: 0, transform: 'translateX(-30px)' },
            to:   { opacity: 1, transform: 'translateX(0)' },
          },
        }}
      >
        {/* Orbs */}
        <Orb size="380px" top="-80px"  left="-100px" color="rgba(26,86,219,0.4)"   delay={0} dur={8} />
        <Orb size="300px" bottom="-60px" right="-60px" color="rgba(124,58,237,0.35)" delay={1} dur={9} />
        <Orb size="220px" top="40%"    left="55%"    color="rgba(16,185,129,0.2)"  delay={2} dur={10}/>

        {/* Dotted pattern (dot matrix) and tech circles instead of boxes */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(91, 156, 246, 0.07) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            border: '1px solid rgba(91, 156, 246, 0.04)',
            pointerEvents: 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: '80px',
              borderRadius: '50%',
              border: '1px solid rgba(167, 139, 250, 0.03)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: '160px',
              borderRadius: '50%',
              border: '1px solid rgba(91, 156, 246, 0.02)',
            }
          }}
        />

        {/* Top accent bar */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, #5b9cf6 40%, #a78bfa 70%, transparent)',
          opacity: 0.7,
        }} />

        {/* Brand logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 5 }}>
          <Box
            sx={{
              width: 48, height: 48,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1a56db 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(26,86,219,0.45)',
            }}
          >
            <MonitorIcon sx={{ color: '#fff', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography sx={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800, fontSize: '1.35rem', color: '#fff', letterSpacing: '1px',
            }}>
              WorkforceOS
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.6)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Enterprise Platform
            </Typography>
          </Box>
        </Box>

        {/* Headline */}
        <Typography
          variant="h2"
          sx={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            lineHeight: 1.15,
            mb: 2.5,
            fontSize: { md: '2.6rem', lg: '3rem' },
            background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Monitor your team,{'\n'}
          <Box component="span" sx={{
            background: 'linear-gradient(135deg, #34d399 0%, #5b9cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            from anywhere.
          </Box>
        </Typography>

        <Typography sx={{ color: 'rgba(148,163,184,0.75)', mb: 5, lineHeight: 1.7, maxWidth: 420, fontSize: '1rem' }}>
          The complete remote work management platform built for modern distributed teams.
        </Typography>

        {/* Feature bullets */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {features.map((f, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex', alignItems: 'flex-start', gap: 2,
                animation: `featureIn 0.5s ease ${0.3 + i * 0.1}s both`,
                '@keyframes featureIn': {
                  from: { opacity: 0, transform: 'translateX(-16px)' },
                  to:   { opacity: 1, transform: 'translateX(0)' },
                },
              }}
            >
              <Box sx={{
                width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
              }}>
                {f.icon}
              </Box>
              <Box>
                <Typography sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem', mb: 0.2 }}>
                  {f.title}
                </Typography>
                <Typography sx={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {f.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Bottom badge */}
        <Box sx={{ mt: 6, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckIcon sx={{ color: '#34d399', fontSize: 16 }} />
          <Typography sx={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.75rem', fontWeight: 500 }}>
            Trusted by 500+ remote teams worldwide
          </Typography>
        </Box>
      </Box>

      {/* ══════════════════════════════════════════════
          RIGHT PANEL — Login form
      ══════════════════════════════════════════════ */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 6 },
          py: 6,
          bgcolor: '#070b14',
          position: 'relative',
          animation: 'rightPanelIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both',
          '@keyframes rightPanelIn': {
            from: { opacity: 0, transform: 'translateX(20px)' },
            to:   { opacity: 1, transform: 'translateX(0)' },
          },
        }}
      >
        {/* Subtle ambient orb */}
        <Orb size="300px" top="-60px" right="-60px" color="rgba(124,58,237,0.2)" delay={0} dur={8} />

        <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

          {/* Mobile brand */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a56db, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MonitorIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#fff', fontSize: '1.2rem' }}>
              WorkforceOS
            </Typography>
          </Box>

          {/* Heading */}
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#e2e8f0', mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography sx={{ color: 'rgba(148,163,184,0.7)', mb: 4, fontSize: '0.95rem' }}>
            Sign in to your workspace to continue.
          </Typography>

          {/* Error */}
          {errorMsg && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 3, bgcolor: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}
            >
              {errorMsg}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

            {/* Email field with quick-select dropdown */}
            <Box sx={{ position: 'relative' }}>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'rgba(148,163,184,0.5)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.04)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(91,156,246,0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#5b9cf6' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.6)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#5b9cf6' },
                  '& input': { color: '#e2e8f0' },
                }}
              />
              {/* Quick-select saved accounts dropdown */}
              {showDropdown && savedAccounts.length > 0 && (
                <Paper
                  elevation={8}
                  sx={{
                    position: 'absolute',
                    top: '100%', left: 0, right: 0,
                    mt: 0.5, zIndex: 20,
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    bgcolor: 'rgba(13,17,23,0.97)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {savedAccounts.map((acc, idx) => (
                    <Box
                      key={idx}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setEmail(acc.email); setPassword(acc.password); setShowDropdown(false); }}
                      sx={{
                        px: 2, py: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: idx < savedAccounts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        transition: 'background 0.15s',
                        '&:hover': { bgcolor: 'rgba(91,156,246,0.08)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: '8px',
                          background: 'linear-gradient(135deg, #1a56db, #7c3aed)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                        }}>
                          {acc.email[0].toUpperCase()}
                        </Box>
                        <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                          {acc.email}
                        </Typography>
                      </Box>
                      <Box
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={e => {
                          e.stopPropagation();
                          const updated = savedAccounts.filter((_, i) => i !== idx);
                          localStorage.setItem('wfh_saved_accounts', JSON.stringify(updated));
                          setSavedAccounts(updated);
                        }}
                        sx={{
                          fontSize: '0.7rem', fontWeight: 600, color: 'rgba(148,163,184,0.5)',
                          px: 1, py: 0.4, borderRadius: 1,
                          '&:hover': { bgcolor: 'rgba(220,38,38,0.15)', color: '#f87171' },
                        }}
                      >
                        ✕
                      </Box>
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>

            {/* Password field */}
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'rgba(148,163,184,0.5)', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(v => !v)}
                      edge="end"
                      sx={{ color: 'rgba(148,163,184,0.5)', '&:hover': { color: '#5b9cf6' } }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.04)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(91,156,246,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#5b9cf6' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.6)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#5b9cf6' },
                '& input': { color: '#e2e8f0' },
              }}
            />

            {/* Forgot password */}
            <Box sx={{ textAlign: 'right', mt: -1 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                sx={{ fontSize: '0.85rem', color: '#5b9cf6', fontWeight: 600, textDecoration: 'none',
                      '&:hover': { color: '#93c5fd' } }}
              >
                Forgot password?
              </Link>
            </Box>

            {/* Submit button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              endIcon={loading ? null : <ArrowIcon />}
              sx={{
                py: 1.6,
                borderRadius: 3,
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '0.03em',
                background: 'linear-gradient(135deg, #1239a5 0%, #1a56db 50%, #5b9cf6 100%)',
                boxShadow: '0 8px 24px rgba(26,86,219,0.5)',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)',
                  boxShadow: '0 12px 32px rgba(26,86,219,0.65)',
                  transform: 'translateY(-2px)',
                },
                '&:active': { transform: 'translateY(0)' },
                '&.Mui-disabled': { opacity: 0.6 },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign In'}
            </Button>
          </Box>

          {/* Register link */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.875rem' }}>
              Don't have an account?{' '}
              <Link
                component={RouterLink}
                to="/register"
                sx={{ color: '#5b9cf6', fontWeight: 700, textDecoration: 'none', '&:hover': { color: '#93c5fd' } }}
              >
                Create one
              </Link>
            </Typography>
          </Box>

          {/* Security badge */}
          <Box sx={{ mt: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Box sx={{
              width: 7, height: 7, borderRadius: '50%', bgcolor: '#34d399',
              animation: 'pingGreen 2s ease-in-out infinite',
              '@keyframes pingGreen': {
                '0%,100%': { opacity: 1, transform: 'scale(1)' },
                '50%':     { opacity: 0.6, transform: 'scale(1.4)' },
              },
            }} />
            <Typography sx={{ color: 'rgba(100,116,139,0.6)', fontSize: '0.72rem', fontWeight: 500 }}>
              256-bit TLS encrypted · SOC 2 compliant
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default Login;
