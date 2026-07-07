import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { authSuccess } from '../redux/store';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/* ─── Shared style tokens ─────────────────────────────────────── */
const C = {
  bg: '#060913',
  paper: 'rgba(7,11,20,0.85)',
  border: 'rgba(255,255,255,0.07)',
  green: '#10b981',
  greenDim: 'rgba(16,185,129,0.15)',
  greenGlow: '0 0 40px rgba(16,185,129,0.18)',
  text: '#f8fafc',
  muted: '#94a3b8',
  font: "'Plus Jakarta Sans', system-ui, sans-serif",
  headFont: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
};

/* ─── Inject Google Fonts once ────────────────────────────────── */
function useFonts() {
  useEffect(() => {
    if (!document.getElementById('wfh-fonts')) {
      const l = document.createElement('link');
      l.id = 'wfh-fonts';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(l);
    }
  }, []);
}

/* ─── Inject keyframe animations ─────────────────────────────── */
const KEYFRAMES = `
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
@keyframes spin3d { from{transform:rotateY(0deg) rotateX(15deg)} to{transform:rotateY(360deg) rotateX(15deg)} }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes slide-up { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
@keyframes glow-ring { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 50%{box-shadow:0 0 0 16px rgba(16,185,129,0)} }
@keyframes orbit { from{transform:rotate(0deg) translateX(90px)} to{transform:rotate(360deg) translateX(90px)} }
@keyframes orbit2 { from{transform:rotate(120deg) translateX(60px)} to{transform:rotate(480deg) translateX(60px)} }
@keyframes orbit3 { from{transform:rotate(240deg) translateX(120px)} to{transform:rotate(600deg) translateX(120px)} }
@keyframes typing { 0%,90%,100%{opacity:1} 45%{opacity:0} }
@keyframes bar { 0%{width:0%} 100%{width:var(--w)} }
@keyframes shutter { 0%{clip-path:inset(0 50% 0 50%)} 50%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 0 0 0)} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
`;

function StyleInject() {
  useEffect(() => {
    if (!document.getElementById('wfh-landing-css')) {
      const s = document.createElement('style');
      s.id = 'wfh-landing-css';
      s.textContent = KEYFRAMES;
      document.head.appendChild(s);
    }
  }, []);
  return null;
}

/* ─── Glowing Button ─────────────────────────────────────────── */
function GlowButton({ children, onClick, outline = false, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '13px 30px',
        borderRadius: 50,
        border: `1.5px solid ${C.green}`,
        background: outline
          ? hov ? C.greenDim : 'transparent'
          : hov
            ? 'linear-gradient(135deg,#34d399,#059669)'
            : 'linear-gradient(135deg,#10b981,#059669)',
        color: '#fff',
        fontFamily: C.font,
        fontWeight: 700,
        fontSize: 15,
        cursor: 'pointer',
        boxShadow: hov ? '0 8px 32px rgba(16,185,129,0.45)' : '0 4px 16px rgba(16,185,129,0.25)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'all .25s',
        letterSpacing: '.02em',
        ...style,
      }}
    >{children}</button>
  );
}

/* ─── 3D Particle Sphere (CSS only) ──────────────────────────── */
function ParticleSphere({ mouse }) {
  const rx = (mouse.y - 0.5) * 20;
  const ry = (mouse.x - 0.5) * 20;
  const dots = Array.from({ length: 18 }, (_, i) => i);

  return (
    <div style={{
      width: 260, height: 260,
      position: 'relative',
      transformStyle: 'preserve-3d',
      transform: `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`,
      transition: 'transform .15s ease-out',
    }}>
      {/* Core glow */}
      <div style={{
        position: 'absolute', inset: '30%',
        borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(16,185,129,0.35) 0%,transparent 70%)',
        boxShadow: '0 0 80px rgba(16,185,129,0.3)',
        animation: 'pulse 3s ease-in-out infinite',
      }} />
      {/* Orbit rings */}
      {[0, 60, 120].map((deg, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '1px solid rgba(16,185,129,0.15)',
          transform: `rotateX(${deg}deg)`,
        }} />
      ))}
      {/* Orbiting dots */}
      {dots.map((d, i) => {
        const ang = (360 / dots.length) * i;
        const r = 90 + (i % 3) * 18;
        const delay = (i * 0.2) % 3;
        return (
          <div key={d} style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: i % 4 === 0 ? 7 : 4,
            height: i % 4 === 0 ? 7 : 4,
            borderRadius: '50%',
            background: i % 4 === 0 ? C.green : 'rgba(16,185,129,0.5)',
            boxShadow: i % 4 === 0 ? `0 0 10px ${C.green}` : 'none',
            transform: `rotate(${ang}deg) translateX(${r}px)`,
            animation: `orbit${(i % 3) + 1} ${3 + (i % 3)}s linear infinite`,
            animationDelay: `${delay}s`,
          }} />
        );
      })}
    </div>
  );
}

/* ─── Isometric Dashboard Preview Card ───────────────────────── */
function DashboardPreview() {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', maxWidth: 460,
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: 24,
        backdropFilter: 'blur(20px)',
        boxShadow: hov ? '0 30px 80px rgba(16,185,129,0.15), 0 0 0 1px rgba(16,185,129,0.1)' : '0 20px 60px rgba(0,0,0,0.4)',
        transform: hov ? 'perspective(800px) rotateX(-4deg) rotateY(4deg) scale(1.02)' : 'perspective(800px) rotateX(-6deg) rotateY(8deg) scale(1)',
        transition: 'all .4s cubic-bezier(.4,0,.2,1)',
        animation: 'float 6s ease-in-out infinite',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        {['#ef4444','#f59e0b','#10b981'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
        ))}
        <div style={{ flex: 1, height: 1, background: C.border, marginLeft: 8 }} />
        <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font }}>WorkforceOS Manager Console</div>
      </div>
      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Active Now', val: '12', col: C.green },
          { label: 'On Break', val: '3', col: '#f59e0b' },
          { label: 'Offline', val: '2', col: '#ef4444' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 12,
            border: `1px solid ${C.border}`, padding: '12px 8px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.col, fontFamily: C.headFont }}>{m.val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: C.font }}>{m.label}</div>
          </div>
        ))}
      </div>
      {/* Employee bars */}
      {[
        { name: 'Amal S.', prog: 88, col: C.green },
        { name: 'Nimal P.', prog: 62, col: '#f59e0b' },
        { name: 'Saman K.', prog: 95, col: C.green },
      ].map(e => (
        <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${C.green},#059669)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: C.font, flexShrink: 0 }}>
            {e.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.text, fontFamily: C.font }}>{e.name}</span>
              <span style={{ fontSize: 12, color: e.col, fontWeight: 700, fontFamily: C.font }}>{e.prog}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${e.prog}%`, background: e.col, borderRadius: 4, transition: 'width 1s' }} />
            </div>
          </div>
        </div>
      ))}
      {/* Screenshot strip */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        {['18:32','18:42','18:52'].map((t, i) => (
          <div key={t} style={{
            flex: 1, aspectRatio: '16/9',
            background: `linear-gradient(135deg, rgba(16,185,129,${0.05 + i * 0.03}), rgba(5,150,105,${0.1 + i * 0.04}))`,
            borderRadius: 8, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 2
          }}>
            <div style={{ width: 16, height: 12, borderRadius: 2, background: 'rgba(16,185,129,0.3)' }} />
            <div style={{ fontSize: 9, color: C.muted, fontFamily: C.font }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feature card ───────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, anim, bars, color = C.green }: { icon: any, title: any, desc: any, anim?: any, bars?: any, color?: string }) {
  const [hov, setHov] = useState(false);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const ref = useRef<any>(null);

  const onMove = e => {
    const r = ref.current.getBoundingClientRect();
    setMx(((e.clientX - r.left) / r.width - 0.5) * 18);
    setMy(-((e.clientY - r.top) / r.height - 0.5) * 18);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setMx(0); setMy(0); }}
      onMouseMove={onMove}
      style={{
        background: C.paper,
        border: `1px solid ${hov ? 'rgba(16,185,129,0.25)' : C.border}`,
        borderRadius: 20,
        padding: 28,
        backdropFilter: 'blur(16px)',
        boxShadow: hov ? `0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.1), ${C.greenGlow}` : '0 4px 20px rgba(0,0,0,0.2)',
        transform: `perspective(700px) rotateX(${my}deg) rotateY(${mx}deg) ${hov ? 'scale(1.03)' : 'scale(1)'}`,
        transition: hov ? 'box-shadow .3s, border .3s, transform .1s' : 'all .4s',
        cursor: 'default',
      }}
    >
      {/* Icon zone */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: `linear-gradient(135deg, ${color}22, ${color}11)`,
        border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: 18,
        boxShadow: hov ? `0 0 20px ${color}33` : 'none',
        transition: 'box-shadow .3s',
      }}>
        {icon}
      </div>

      <div style={{ fontFamily: C.headFont, fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: C.font, fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>{desc}</div>

      {/* Activity bars animation */}
      {bars && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
          {bars.map((h, i) => (
            <div key={i} style={{
              flex: 1,
              height: `${hov ? h : 20}%`,
              background: `linear-gradient(180deg, ${color} 0%, ${color}66 100%)`,
              borderRadius: 3,
              transition: `height ${0.3 + i * 0.05}s ease`,
              boxShadow: hov ? `0 0 6px ${color}66` : 'none',
            }} />
          ))}
        </div>
      )}

      {/* Shutter animation */}
      {anim === 'shutter' && (
        <div style={{
          width: '100%', height: 40, borderRadius: 8,
          background: `linear-gradient(135deg, ${color}22, ${color}11)`,
          border: `1px solid ${color}22`,
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: `2px solid ${color}`,
            boxShadow: hov ? `0 0 16px ${color}` : 'none',
            animation: hov ? 'glow-ring 1.5s ease-in-out infinite' : 'none',
            transition: 'box-shadow .3s',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(90deg, transparent, ${color}22, transparent)`,
            transform: hov ? 'translateX(100%)' : 'translateX(-100%)',
            transition: 'transform .8s ease-in-out',
          }} />
        </div>
      )}

      {/* Ring animation */}
      {anim === 'ring' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {['KB','MS'].map((label, i) => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px',
                border: `3px solid ${i === 0 ? color : '#f59e0b'}`,
                boxShadow: hov ? `0 0 16px ${i === 0 ? color : '#f59e0b'}66` : 'none',
                transition: 'box-shadow .3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: C.muted, fontFamily: C.font,
              }}>
                {hov ? (i === 0 ? '94%' : '87%') : label}
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: C.font }}>{i === 0 ? 'Keyboard' : 'Mouse'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── OS Download Card ────────────────────────────────────────── */
function OSCard({ icon, os, ext, desc, steps, href }: { icon: any, os: any, ext: any, desc?: any, steps: any, href: any }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.paper,
        border: `1px solid ${hov ? 'rgba(16,185,129,0.3)' : C.border}`,
        borderRadius: 22,
        padding: 32,
        backdropFilter: 'blur(16px)',
        boxShadow: hov ? `0 24px 60px rgba(0,0,0,0.4), ${C.greenGlow}` : '0 4px 24px rgba(0,0,0,0.2)',
        transform: hov ? 'translateY(-6px)' : 'none',
        transition: 'all .35s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontFamily: C.headFont, fontWeight: 800, fontSize: 22, color: C.text, marginBottom: 4 }}>{os}</div>
      <div style={{ fontFamily: C.font, fontSize: 13, color: '#64748b', marginBottom: 20 }}>Agent v2.1.0 · {ext}</div>

      <div style={{ marginBottom: 24 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: C.greenDim, border: `1px solid ${C.green}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: C.green, fontFamily: C.font,
              flexShrink: 0, marginTop: 1,
            }}>{i + 1}</div>
            <div style={{ fontSize: 13, color: C.muted, fontFamily: C.font, lineHeight: 1.5 }}>{s}</div>
          </div>
        ))}
      </div>

      <a href={href} download style={{ textDecoration: 'none' }}>
        <div style={{
          padding: '13px 0',
          borderRadius: 12,
          background: hov ? 'linear-gradient(135deg,#34d399,#059669)' : 'linear-gradient(135deg,#10b981,#059669)',
          color: '#fff', textAlign: 'center',
          fontFamily: C.font, fontWeight: 700, fontSize: 14,
          boxShadow: hov ? '0 8px 28px rgba(16,185,129,0.5)' : '0 4px 16px rgba(16,185,129,0.25)',
          transition: 'all .3s', cursor: 'pointer',
        }}>
          ⬇️ Download for {os}
        </div>
      </a>

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'center' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 11, color: '#4ade80', fontFamily: C.font }}>Service Online · 99.9% Uptime</span>
      </div>
    </div>
  );
}

/* ─── Console Login Tab ───────────────────────────────────────── */
function ConsoleLogin({ onNavigate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [focusedEmail, setFocusedEmail] = useState(false);
  const [focusedPass, setFocusedPass] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async e => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    setDenied(false);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email: email.trim(), password });
      const u = res.data.user;
      if (u.role === 'Employee') {
        setDenied(true);
        setLoading(false);
        return;
      }
      // Store token and redirect
      localStorage.setItem('wfh_token', res.data.token);
      localStorage.setItem('wfh_user', JSON.stringify(u));
      dispatch(authSuccess({ token: res.data.token, user: u }));
      
      // Use standard react-router navigation instead of hash hacking
      navigate(u.role === 'SystemAdmin' ? '/system-admin' : '/manager/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (focused: boolean): any => ({
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${focused ? C.green : C.border}`,
    borderRadius: 12,
    color: C.text, fontFamily: C.font, fontSize: 15,
    outline: 'none',
    boxShadow: focused ? `0 0 0 3px rgba(16,185,129,0.1), ${C.greenGlow}` : 'none',
    transition: 'all .2s',
    boxSizing: 'border-box',
  });

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '80vh', padding: '40px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420, animation: 'slide-up .5s ease' }}>

        {/* Warning banner */}
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 14, padding: '14px 18px', marginBottom: 28,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ fontFamily: C.font, fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>
            <strong>Employees</strong> must use the Desktop Agent to track work time.
            Web Console login is restricted to <strong>Managers</strong> and <strong>System Admins</strong> only.
          </div>
        </div>

        {/* Login card */}
        <div style={{
          background: C.paper,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: '36px 32px',
          backdropFilter: 'blur(24px)',
          boxShadow: `0 30px 80px rgba(0,0,0,0.5), ${C.greenGlow}`,
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: C.greenDim, border: `1px solid rgba(16,185,129,0.2)`,
              borderRadius: 50, padding: '8px 16px', marginBottom: 16,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, animation: 'pulse 2s infinite' }} />
              <span style={{ fontFamily: C.font, fontSize: 12, color: C.green, fontWeight: 600 }}>SECURE CONSOLE</span>
            </div>
            <div style={{ fontFamily: C.headFont, fontSize: 26, fontWeight: 800, color: C.text }}>Welcome back</div>
            <div style={{ fontFamily: C.font, fontSize: 14, color: C.muted, marginTop: 4 }}>Sign in to your workspace</div>
          </div>

          {/* Access denied popup */}
          {denied && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 20,
              animation: 'slide-up .3s ease',
            }}>
              <div style={{ fontFamily: C.font, fontWeight: 700, color: '#ef4444', marginBottom: 6, fontSize: 14 }}>
                🚫 Access Denied
              </div>
              <div style={{ fontFamily: C.font, fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>
                Employees cannot access the Web Console. Please download and use the Desktop Agent.
              </div>
              <button
                onClick={() => onNavigate('download')}
                style={{
                  marginTop: 12, padding: '8px 16px', borderRadius: 8,
                  background: C.greenDim, border: `1px solid ${C.green}44`,
                  color: C.green, fontFamily: C.font, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⬇️ Go to Download Center
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontFamily: C.font, fontSize: 13, color: '#fca5a5',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: C.font, fontSize: 13, color: C.muted, display: 'block', marginBottom: 6 }}>Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedEmail(true)} onBlur={() => setFocusedEmail(false)}
                placeholder="manager@company.com"
                style={inputStyle(focusedEmail)}
              />
            </div>
            <div style={{ marginBottom: 24, position: 'relative' }}>
              <label style={{ fontFamily: C.font, fontSize: 13, color: C.muted, display: 'block', marginBottom: 6 }}>Password</label>
              <input
                type={showPassword ? 'text' : 'password'} 
                value={password} onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedPass(true)} onBlur={() => setFocusedPass(false)}
                placeholder="••••••••••"
                style={{ ...inputStyle(focusedPass), paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: 38,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.muted, fontSize: 16, padding: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg,#10b981,#059669)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontFamily: C.font, fontWeight: 700, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 28px rgba(16,185,129,0.35)',
                transition: 'all .2s',
              }}
            >
              {loading ? '⏳ Signing in...' : '→ Sign In to Console'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="#/forgot-password" style={{ fontFamily: C.font, fontSize: 13, color: C.green, textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── HOME tab ────────────────────────────────────────────────── */
function HomeTab({ onNavigate }) {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  useEffect(() => {
    const h = e => setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section style={{
        minHeight: '92vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column',
        padding: '60px 24px', textAlign: 'center', position: 'relative',
      }}>
        {/* BG ambient */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 60% at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(16,185,129,0.06) 0%, transparent 70%)`,
          transition: 'background .5s',
        }} />

        <ParticleSphere mouse={mouse} />

        <div style={{ marginTop: 40, animation: 'slide-up .7s ease' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.greenDim, border: `1px solid rgba(16,185,129,0.2)`,
            borderRadius: 50, padding: '6px 16px', marginBottom: 24,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: C.font, fontSize: 12, color: C.green, fontWeight: 600, letterSpacing: '.05em' }}>
              LIVE MONITORING ACTIVE
            </span>
          </div>

          <h1 style={{
            fontFamily: C.headFont, fontSize: 'clamp(36px,6vw,72px)',
            fontWeight: 900, color: C.text, margin: '0 0 20px',
            lineHeight: 1.1, letterSpacing: '-.03em',
          }}>
            The Future of<br />
            <span style={{
              background: 'linear-gradient(135deg,#10b981,#34d399,#059669)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Remote Team Synchronization.
            </span>
          </h1>

          <p style={{
            fontFamily: C.font, fontSize: 18, color: C.muted,
            maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7,
          }}>
            Real-time activity analytics, privacy-first smart monitoring, and seamless team synchronization — all in one enterprise platform.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <GlowButton onClick={() => onNavigate('login')}>🚀 Launch Console</GlowButton>
            <GlowButton outline onClick={() => onNavigate('download')}>⬇️ Download Desktop Agent</GlowButton>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 56, flexWrap: 'wrap' }}>
            {[
              { val: '10K+', label: 'Teams Monitored' },
              { val: '99.9%', label: 'Platform Uptime' },
              { val: '< 50ms', label: 'Activity Latency' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: C.headFont, fontWeight: 800, fontSize: 28, color: C.green }}>{s.val}</div>
                <div style={{ fontFamily: C.font, fontSize: 13, color: C.muted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section style={{ padding: '40px 24px 80px', display: 'flex', justifyContent: 'center' }}>
        <DashboardPreview />
      </section>
    </div>
  );
}

/* ─── FEATURES tab ────────────────────────────────────────────── */
function FeaturesTab() {
  const features = [
    {
      icon: '📊', title: 'Real-Time App Tracking', color: C.green,
      desc: 'Monitor which applications employees are actively using with per-minute granularity. Classify Productive, Neutral, and Non-productive usage automatically.',
      bars: [40,75,55,90,65,80,45,95,70,85,60,92],
    },
    {
      icon: '📸', title: 'Privacy-Smart Screenshots', color: '#818cf8',
      desc: 'Periodic screen captures with frequency dynamically adjusted to employee productivity score. Fully compliant and privacy-respecting.',
      anim: 'shutter',
    },
    {
      icon: '🤳', title: 'Selfie Attendance Check-In', color: '#f59e0b',
      desc: 'Webcam verification at punch-in to confirm physical presence. Photos stored securely with timestamp and geolocation metadata.',
      anim: 'shutter',
    },
    {
      icon: '⌨️', title: 'Silent Activity Telemetry', color: '#34d399',
      desc: 'Keyboard and mouse activity counts measured every 10 seconds to calculate live Active/Idle percentages without capturing private content.',
      anim: 'ring',
    },
  ];

  return (
    <section style={{ padding: '60px 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <h2 style={{ fontFamily: C.headFont, fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: C.text, margin: '0 0 14px', letterSpacing: '-.02em' }}>
          Enterprise-Grade <span style={{ color: C.green }}>Tracking Suite</span>
        </h2>
        <p style={{ fontFamily: C.font, fontSize: 16, color: C.muted, maxWidth: 500, margin: '0 auto' }}>
          Every feature built for trust, transparency, and peak remote team performance.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
        {features.map(f => <FeatureCard key={f.title} {...f} />)}
      </div>
    </section>
  );
}

/* ─── DOWNLOAD tab ────────────────────────────────────────────── */
function DownloadTab() {
  return (
    <section style={{ padding: '60px 24px 80px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <h2 style={{ fontFamily: C.headFont, fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: C.text, margin: '0 0 14px', letterSpacing: '-.02em' }}>
          Download <span style={{ color: C.green }}>Desktop Agent</span>
        </h2>
        <p style={{ fontFamily: C.font, fontSize: 16, color: C.muted, maxWidth: 500, margin: '0 auto' }}>
          Install the lightweight background agent to start tracking. No technical expertise needed.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
        <OSCard
          icon="🪟" os="Windows" ext="NSIS Installer (.exe)"
          href={`${API_URL}/uploads/WorkforceOS-Agent-Setup.exe`}
          steps={[
            'Run the downloaded Setup.exe installer.',
            'Follow installation wizard — click Next.',
            'Launch WorkforceOS from the Start Menu or Taskbar.',
            'Sign in with your employee credentials and punch in!',
          ]}
        />
        <OSCard
          icon="🍎" os="macOS" ext="Disk Image (.dmg)"
          href={`${API_URL}/uploads/WorkforceOS-Agent-Mac.dmg`}
          steps={[
            'Open the .dmg file and drag the app to Applications.',
            'Go to System Settings → Privacy → Screen Recording — enable WorkforceOS.',
            'Go to Privacy → Accessibility — enable WorkforceOS.',
            'Launch the app, sign in and start tracking.',
          ]}
        />
        <OSCard
          icon="🐧" os="Linux" ext="AppImage (.AppImage)"
          href={`${API_URL}/uploads/WorkforceOS-Agent.AppImage`}
          steps={[
            'Download the .AppImage file.',
            'Open terminal: chmod +x WorkforceOS*.AppImage',
            'Run: ./WorkforceOS*.AppImage',
            'Ensure xdotool is installed: sudo apt install xdotool',
          ]}
        />
      </div>
    </section>
  );
}

/* ─── Navigation ──────────────────────────────────────────────── */
function Nav({ active, onNavigate }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const tabs = [
    { id: 'home', label: '🏠 Home' },
    { id: 'features', label: '⚡ Features' },
    { id: 'download', label: '⬇️ Download' },
    { id: 'login', label: '🔐 Console Login' },
  ];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 1000,
      background: scrolled ? 'rgba(6,9,19,0.95)' : 'rgba(6,9,19,0.6)',
      backdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
      transition: 'all .3s',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>
        {/* Logo */}
        <div
          onClick={() => onNavigate('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <img src="/logo192.png" alt="WorkforceOS Logo" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <span style={{ fontFamily: C.headFont, fontWeight: 800, fontSize: 18, color: C.text }}>WorkforceOS</span>
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => onNavigate(t.id)}
              style={{
                padding: '7px 16px',
                borderRadius: 10,
                border: 'none',
                background: active === t.id ? C.greenDim : 'transparent',
                color: active === t.id ? C.green : C.muted,
                fontFamily: C.font, fontWeight: active === t.id ? 700 : 500, fontSize: 14,
                cursor: 'pointer',
                borderBottom: active === t.id ? `2px solid ${C.green}` : '2px solid transparent',
                transition: 'all .2s',
              }}
            >{t.label}</button>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ─── Main Export ─────────────────────────────────────────────── */
export default function LandingPage() {
  useFonts();
  const [tab, setTab] = useState('home');

  const navigate = id => {
    setTab(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: C.font }}>
      <StyleInject />
      <Nav active={tab} onNavigate={navigate} />

      <main key={tab} style={{ animation: 'slide-up .4s ease' }}>
        {tab === 'home'     && <HomeTab onNavigate={navigate} />}
        {tab === 'features' && <FeaturesTab />}
        {tab === 'download' && <DownloadTab />}
        {tab === 'login'    && <ConsoleLogin onNavigate={navigate} />}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: '24px',
        textAlign: 'center', fontFamily: C.font, fontSize: 13, color: '#475569',
      }}>
        © 2025 WorkforceOS · Built by <span style={{ color: C.green, fontWeight: 700 }}>Sasiru</span> · Enterprise Remote Team Intelligence
      </footer>
    </div>
  );
}
