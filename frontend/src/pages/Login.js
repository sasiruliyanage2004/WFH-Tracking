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
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { authStart, authSuccess, authFail } from '../redux/store';
import DeveloperSignature from '../components/DeveloperSignature';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/* ── Left panel feature bullets ─────────────────────── */
const features = [
  { icon: '🛡️', title: 'Verified Check-in', desc: 'GPS + identity verification for secure site attendance.' },
  { icon: '📈', title: 'Live Analytics',     desc: 'Real-time productivity tracking and workload balancing.' },
  { icon: '📸', title: 'Screen Monitoring',  desc: 'Privacy-controlled screenshots and activity metrics.' },
  { icon: '📋', title: 'Smart Reports',      desc: 'Automated reporting systems with AI-driven insights.' },
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
      filter: 'blur(80px)',
      opacity: 0.5,
      animation: `orbFloat ${dur}s ease-in-out ${delay}s infinite alternate`,
      '@keyframes orbFloat': {
        '0%':   { transform: 'translateY(0) scale(1)' },
        '100%': { transform: 'translateY(-35px) scale(1.1)' },
      },
      pointerEvents: 'none',
    }}
  />
);

/* ── Circuit Board Line Vector Background ──────────── */
const CircuitBackground = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 1000 1000"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      opacity: 0.12,
      pointerEvents: 'none',
      zIndex: 0
    }}
  >
    {/* Microchip tracks branching outward from the center area */}
    <path d="M 500 250 L 500 120 L 350 120" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
    <path d="M 500 550 L 500 680 L 650 680" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
    <path d="M 350 400 L 220 400 L 120 300" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
    <path d="M 650 400 L 780 400 L 880 500" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
    <path d="M 380 270 L 280 170 L 180 170" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 620 270 L 720 170 L 820 170" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 380 530 L 280 630 L 180 630" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 620 530 L 720 630 L 820 630" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />

    {/* Terminal Connector Nodes */}
    <circle cx="350" cy="120" r="4" fill="#4ade80" />
    <circle cx="650" cy="680" r="4" fill="#34d399" />
    <circle cx="120" cy="300" r="4" fill="#10b981" />
    <circle cx="880" cy="500" r="4" fill="#10b981" />
    <circle cx="180" cy="170" r="4" fill="#4ade80" />
    <circle cx="820" cy="170" r="4" fill="#4ade80" />
    <circle cx="180" cy="630" r="4" fill="#34d399" />
    <circle cx="820" cy="630" r="4" fill="#34d399" />
  </svg>
);

function Login() {
  const isElectron = window.api !== undefined;
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [errorMsg,        setErrorMsg]        = useState('');
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [savedAccounts,   setSavedAccounts]   = useState(() => {
    const saved = localStorage.getItem('wfh_saved_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { loading, isAuthenticated, user } = useSelector((s) => s.auth);

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
      ];
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
        height: isElectron ? 'calc(100vh - 32px)' : '100vh',
        display: 'flex',
        bgcolor: '#060913',
        overflow: 'hidden',
        position: 'relative',
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
          px:             { xs: 4, lg: 8 },
          py:             { xs: 4, lg: 6 },
          '@media (max-height: 850px)': {
            py: 4,
            px: 6,
          },
          '@media (max-height: 720px)': {
            py: 3,
            px: 4,
          },
          position:       'relative',
          overflow:       'hidden',
          background: 'radial-gradient(ellipse at 30% 30%, #0a1945 0%, #060913 70%)',
          animation: 'leftPanelIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
          '@keyframes leftPanelIn': {
            from: { opacity: 0, transform: 'translateX(-40px)' },
            to:   { opacity: 1, transform: 'translateX(0)' },
          },
        }}
      >
        {/* Left Side Glow Orbs */}
        <Orb size="400px" top="-100px" left="-120px" color="rgba(16,185,129,0.3)" delay={0} dur={9} />
        <Orb size="300px" bottom="-80px" right="-40px" color="rgba(9,79,165,0.25)" delay={2} dur={10} />

        {/* Dotted pattern overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Brand logo */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: { xs: 4, lg: 6 },
          '@media (max-height: 850px)': { mb: 3 },
          '@media (max-height: 720px)': { mb: 2 },
          zIndex: 2
        }}>
          <Box
            sx={{
              width: { xs: 40, lg: 52 },
              height: { xs: 40, lg: 52 },
              borderRadius: { xs: '12px', lg: '16px' },
              '@media (max-height: 850px)': { width: 44, height: 44, borderRadius: '14px' },
              '@media (max-height: 720px)': { width: 38, height: 38, borderRadius: '10px' },
              background: 'linear-gradient(135deg, #10b981 0%, #060913 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(16,185,129,0.4)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <MonitorIcon sx={{
              color: '#fff',
              fontSize: { xs: 22, lg: 28 },
              '@media (max-height: 850px)': { fontSize: 24 },
              '@media (max-height: 720px)': { fontSize: 20 }
            }} />
          </Box>
          <Box>
            <Typography sx={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: { xs: '1.25rem', lg: '1.45rem' },
              '@media (max-height: 850px)': { fontSize: '1.3rem' },
              '@media (max-height: 720px)': { fontSize: '1.15rem' },
              color: '#fff',
              letterSpacing: '1px',
            }}>
              WorkforceOS
            </Typography>
            <Typography sx={{
              fontSize: { xs: '0.62rem', lg: '0.68rem' },
              '@media (max-height: 720px)': { fontSize: '0.58rem' },
              color: 'rgba(16,185,129,0.7)',
              fontWeight: 700,
              letterSpacing: '3px',
              textTransform: 'uppercase'
            }}>
              Remote Work Management
            </Typography>
          </Box>
        </Box>

        {/* Headline */}
        <Box sx={{ zIndex: 2 }}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 900,
              lineHeight: 1.15,
              mb: { xs: 2, lg: 3 },
              fontSize: { md: '2.4rem', lg: '3.4rem' },
              '@media (max-height: 850px)': { fontSize: '2.5rem', mb: 2 },
              '@media (max-height: 720px)': { fontSize: '2.0rem', mb: 1.5 },
              color: '#ffffff',
            }}
          >
            Monitor your team, <br />
            <Box component="span" sx={{
              background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              from anywhere.
            </Box>
          </Typography>

          <Typography sx={{
            color: 'rgba(148,163,184,0.7)',
            mb: { xs: 3, lg: 5 },
            lineHeight: 1.7,
            maxWidth: 440,
            fontSize: { xs: '0.95rem', lg: '1.05rem' },
            '@media (max-height: 850px)': { mb: 3, fontSize: '0.95rem' },
            '@media (max-height: 720px)': { mb: 2, fontSize: '0.88rem', lineHeight: 1.5 }
          }}>
            The complete remote work management platform built for modern distributed teams.
          </Typography>

          {/* Feature bullets */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.8, lg: 2.5 },
            '@media (max-height: 850px)': { gap: 1.5 },
            '@media (max-height: 720px)': { gap: 1 }
          }}>
            {features.map((f, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1.8, lg: 2.5 },
                  p: { xs: 1.5, lg: 2 },
                  borderRadius: { xs: 3, lg: 4 },
                  '@media (max-height: 850px)': { p: 1.5, gap: 1.5, borderRadius: 3 },
                  '@media (max-height: 720px)': { p: 1.1, gap: 1.2, borderRadius: 2.5 },
                  bgcolor: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(16,185,129,0.04)',
                    borderColor: 'rgba(16,185,129,0.15)',
                    transform: 'translateX(4px)',
                  },
                  animation: `featureIn 0.5s ease ${0.3 + i * 0.1}s both`,
                  '@keyframes featureIn': {
                    from: { opacity: 0, transform: 'translateX(-20px)' },
                    to:   { opacity: 1, transform: 'translateX(0)' },
                  },
                }}
              >
                <Box sx={{
                  width: { xs: 36, lg: 44 },
                  height: { xs: 36, lg: 44 },
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: 'rgba(16,185,129,0.08)',
                  border: '1.5px solid rgba(16,185,129,0.25)',
                  boxShadow: '0 0 15px rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: { xs: '1.1rem', lg: '1.25rem' },
                  '@media (max-height: 850px)': {
                    width: 38,
                    height: 38,
                    fontSize: '1.15rem'
                  },
                  '@media (max-height: 720px)': {
                    width: 32,
                    height: 32,
                    fontSize: '0.95rem'
                  },
                }}>
                  {f.icon}
                </Box>
                <Box>
                  <Typography sx={{
                    color: '#f8fafc',
                    fontWeight: 800,
                    fontSize: { xs: '0.85rem', lg: '0.92rem' },
                    '@media (max-height: 850px)': { fontSize: '0.88rem' },
                    '@media (max-height: 720px)': { fontSize: '0.8rem', mb: 0 },
                    mb: 0.2
                  }}>
                    {f.title}
                  </Typography>
                  <Typography sx={{
                    color: 'rgba(148,163,184,0.6)',
                    fontSize: { xs: '0.78rem', lg: '0.82rem' },
                    '@media (max-height: 850px)': { fontSize: '0.78rem' },
                    '@media (max-height: 720px)': { fontSize: '0.72rem', lineHeight: 1.3 },
                    lineHeight: 1.5
                  }}>
                    {f.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
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
          py: { xs: 4, lg: 6 },
          '@media (max-height: 850px)': { py: 4 },
          '@media (max-height: 720px)': { py: 3 },
          bgcolor: '#070b14',
          position: 'relative',
          overflow: 'hidden',
          animation: 'rightPanelIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both',
          '@keyframes rightPanelIn': {
            from: { opacity: 0, transform: 'translateX(30px)' },
            to:   { opacity: 1, transform: 'translateX(0)' },
          },
        }}
      >
        {/* Glow Ambient Orbs behind Card */}
        <Orb size="380px" top="10%" right="-50px" color="rgba(16,185,129,0.25)" delay={0} dur={8} />
        <Orb size="300px" bottom="15%" left="50px" color="rgba(13,148,136,0.2)" delay={1} dur={7} />

        {/* Circuit Vector Lines Background */}
        <CircuitBackground />


        {/* Glassmorphism Card */}
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 440,
            p: { xs: 3, sm: 5 },
            borderRadius: { xs: 4, lg: 6 },
            '@media (max-height: 850px)': {
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: 5
            },
            '@media (max-height: 720px)': {
              p: { xs: 2, sm: 3 },
              borderRadius: 4
            },
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(35px)',
            WebkitBackdropFilter: 'blur(35px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.55)',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Subtle top edge glow on card */}
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px',
            background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)',
          }} />

          {/* Mobile brand branding */}
          <Box sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1.5,
            mb: { xs: 3, md: 4 },
            '@media (max-height: 850px)': { mb: 2 },
            '@media (max-height: 720px)': { mb: 1.5 }
          }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #060913)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
            }}>
              <MonitorIcon sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: '#fff', fontSize: '1.35rem' }}>
              WorkforceOS
            </Typography>
          </Box>

          {/* Heading */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: '#f8fafc',
              mb: 0.8,
              letterSpacing: '-0.5px',
              fontSize: { xs: '1.8rem', lg: '2.125rem' },
              '@media (max-height: 850px)': { fontSize: '1.8rem' },
              '@media (max-height: 720px)': { fontSize: '1.5rem', mb: 0.4 }
            }}
          >
            Welcome back
          </Typography>
          <Typography sx={{
            color: 'rgba(148,163,184,0.7)',
            mb: { xs: 3, lg: 4.5 },
            fontSize: { xs: '0.88rem', lg: '0.95rem' },
            '@media (max-height: 850px)': { mb: 3, fontSize: '0.88rem' },
            '@media (max-height: 720px)': { mb: 2, fontSize: '0.82rem' }
          }}>
            Sign in to your workspace to continue.
          </Typography>

          {/* Error message */}
          {errorMsg && (
            <Alert
              severity="error"
              sx={{
                mb: 3.5,
                '@media (max-height: 850px)': { mb: 2 },
                '@media (max-height: 720px)': { mb: 1.5 },
                borderRadius: 3,
                bgcolor: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5'
              }}
            >
              {errorMsg}
            </Alert>
          )}

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, lg: 3 },
              '@media (max-height: 850px)': { gap: 2 },
              '@media (max-height: 720px)': { gap: 1.5 }
            }}
          >

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
                onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'rgba(148,163,184,0.45)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    bgcolor: 'rgba(255,255,255,0.02)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(16,185,129,0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#10b981', boxShadow: '0 0 15px rgba(16,185,129,0.15)' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.55)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
                  '& input': { color: '#f8fafc' },
                }}
              />
              {/* Quick-select saved accounts dropdown */}
              {showDropdown && savedAccounts.length > 0 && (
                <Paper
                  elevation={12}
                  sx={{
                    position: 'absolute',
                    top: '100%', left: 0, right: 0,
                    mt: 1, zIndex: 20,
                    borderRadius: 3.5,
                    maxHeight: 220,
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.08)',
                    bgcolor: 'rgba(9,13,22,0.96)',
                    backdropFilter: 'blur(30px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    '&::-webkit-scrollbar': { width: '5px' },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '3px' },
                    '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
                  }}
                >
                  {savedAccounts.map((acc, idx) => (
                    <Box
                      key={idx}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setEmail(acc.email); setPassword(acc.password); setShowDropdown(false); }}
                      sx={{
                        px: 2.5, py: 1.8,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: idx < savedAccounts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        transition: 'background 0.2s',
                        '&:hover': { bgcolor: 'rgba(16,185,129,0.06)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 30, height: 30, borderRadius: '8px',
                          background: 'linear-gradient(135deg, #10b981, #060913)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 800, color: '#fff',
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
                          fontSize: '0.7rem', fontWeight: 700, color: 'rgba(148,163,184,0.4)',
                          px: 1, py: 0.5, borderRadius: 1,
                          '&:hover': { bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171' },
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
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'rgba(148,163,184,0.45)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(v => !v)}
                        edge="end"
                        sx={{ color: 'rgba(148,163,184,0.45)', '&:hover': { color: '#10b981' } }}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '14px',
                  bgcolor: 'rgba(255,255,255,0.02)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                  '&:hover fieldset': { borderColor: 'rgba(16,185,129,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981', boxShadow: '0 0 15px rgba(16,185,129,0.15)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(148,163,184,0.55)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
                '& input': { color: '#f8fafc' },
              }}
            />

            {/* Forgot password */}
            <Box sx={{ textAlign: 'right', mt: -1 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                sx={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, textDecoration: 'none',
                      '&:hover': { color: '#34d399' } }}
              >
                Forgot password?
              </Link>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              endIcon={loading ? null : <ArrowIcon />}
              sx={{
                py: { xs: 1.5, lg: 1.8 },
                '@media (max-height: 850px)': { py: 1.5 },
                '@media (max-height: 720px)': { py: 1.2 },
                borderRadius: '30px',
                fontWeight: 750,
                fontSize: '0.98rem',
                textTransform: 'none',
                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 8px 25px rgba(16,185,129,0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
                  boxShadow: '0 12px 30px rgba(16,185,129,0.5)',
                  transform: 'translateY(-2.5px)',
                },
                '&:active': { transform: 'translateY(0)' },
                '&.Mui-disabled': { opacity: 0.6 },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign In'}
            </Button>
          </Box>

          {/* Register Link */}
          <Box sx={{
            mt: { xs: 3, lg: 4.5 },
            textAlign: 'center',
            '@media (max-height: 850px)': { mt: 3 },
            '@media (max-height: 720px)': { mt: 2 }
          }}>
            <Typography sx={{ color: 'rgba(148,163,184,0.55)', fontSize: '0.88rem' }}>
              New to WorkforceOS?{' '}
              <Link
                component={RouterLink}
                to="/register"
                sx={{ color: '#10b981', fontWeight: 800, textDecoration: 'none', '&:hover': { color: '#34d399' } }}
              >
                Create one
              </Link>
            </Typography>
          </Box>

          {/* Security badge footer */}
          <Box sx={{
            mt: { xs: 3.5, lg: 5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.2,
            '@media (max-height: 850px)': { mt: 3 },
            '@media (max-height: 720px)': { mt: 2 }
          }}>
            <Box sx={{
              width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981',
              animation: 'pingGreen 2.5s ease-in-out infinite',
              '@keyframes pingGreen': {
                '0%,100%': { opacity: 1, transform: 'scale(1)' },
                '50%':     { opacity: 0.5, transform: 'scale(1.4)' },
              },
            }} />
            <Typography sx={{ color: 'rgba(100,116,139,0.65)', fontSize: '0.75rem', fontWeight: 600 }}>
              256-bit TLS encrypted · SOC 2 compliant
            </Typography>
          </Box>
          <Box sx={{
            mt: { xs: 2, lg: 3 },
            display: 'flex',
            justifyContent: 'center',
            '@media (max-height: 850px)': { mt: 2 },
            '@media (max-height: 720px)': { mt: 1.5 }
          }}>
            <DeveloperSignature />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default Login;
