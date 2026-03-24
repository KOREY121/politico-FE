import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../context/useAuth';
import { authAPI, electionsAPI } from '../api/api';

export default function LoginPage() {
  const { login, voter } = useAuth();
  const navigate         = useNavigate();

  const [tab,             setTab]             = useState('login');
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);
  const [isAdminLogin,    setIsAdminLogin]    = useState(false);
  const [isAdminRegister, setIsAdminRegister] = useState(false);
  const [heroElections,   setHeroElections]   = useState('—');

  const [loginData, setLoginData] = useState({ national_id: '', password: '' });

  const [adminRegData, setAdminRegData] = useState({
    national_id: '', full_name: '', email: '',
    dob: '', password: '', password2: ''
  });

  const [regData, setRegData] = useState({
    full_name: '', national_id: '', dob: '',
    email: '', password: '', password2: ''
  });

  const [pwdWidth, setPwdWidth] = useState('0%');
  const [pwdColor, setPwdColor] = useState('');

  useEffect(() => {
    document.body.style.background = 'var(--ink)';
    return () => { document.body.style.background = ''; };
  }, []);

  useEffect(() => {
    if (voter) navigate(voter.is_staff ? '/admin' : '/vote');
  }, [voter, navigate]);

  useEffect(() => {
    async function loadStats() {
      try {
        const res  = await electionsAPI.active();
        const data = await res.json();
        setHeroElections(data.length);
      } catch (e) { console.error(e); setHeroElections(0); }
    }
    loadStats();
  }, []);

  // ── LOGIN ──
  async function handleLogin(e) {
    e.preventDefault();
    if (!loginData.national_id || !loginData.password) return setError('Please enter your credentials.');
    setLoading(true); setError('');
    try {
      const res  = await authAPI.login(loginData.national_id, loginData.password);
      const data = await res.json();
      if (res.ok) {
        login(data.voter, data.tokens);
        navigate(data.voter.is_staff ? '/admin' : '/vote');
      } else {
        setError(data.non_field_errors?.[0] || 'Invalid National ID or password.');
      }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  // ── ADMIN REGISTER ──
  async function handleAdminRegister(e) {
    e.preventDefault();
    const { national_id, full_name, email, dob, password, password2 } = adminRegData;
    if (!national_id || !full_name || !email || !dob || !password) return setError('Please complete all fields.');
    if (!national_id.startsWith('ADMIN-')) return setError('Admin ID must start with ADMIN- (e.g. ADMIN-001)');
    if (password !== password2) return setError('Passwords do not match.');
    setLoading(true); setError('');
    try {
      const res  = await authAPI.adminRegister(adminRegData);
      const data = await res.json();
      if (res.ok) {
        setIsAdminRegister(false);
        setAdminRegData({ national_id: '', full_name: '', email: '', dob: '', password: '', password2: '' });
        setError('Admin registered! Please login.');
      } else {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? first[0] : first);
      }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  // ── VOTER REGISTER ──
  async function handleRegister(e) {
    e.preventDefault();
    const { full_name, national_id, dob, email, password, password2 } = regData;
    if (!full_name || !national_id || !dob || !email || !password) return setError('Please complete all fields.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== password2) return setError('Passwords do not match.');
    setLoading(true); setError('');
    try {
      const res  = await authAPI.register(regData);
      const data = await res.json();
      if (res.ok) {
        setTab('login');
        setRegData({ full_name: '', national_id: '', dob: '', email: '', password: '', password2: '' });
        setError('Registration successful! Please login with your credentials.');
      } else {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? first[0] : first);
      }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  // ── PASSWORD STRENGTH ──
  function checkStrength(value) {
    let score = 0;
    if (value.length >= 6)  score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value) && /[0-9]/.test(value)) score++;
    setPwdWidth(['0%','33%','66%','100%'][score]);
    setPwdColor(['','#c0392b','#e67e22','#2d7a4f'][score]);
  }

  return (
    <div className="login-layout">

      {/* ── LEFT HERO ── */}
      <div className="hero-panel">
        <div className="ring ring-1"></div>
        <div className="ring ring-2"></div>
        <div className="hero-overline">INEC E-Voting Platform</div>
        <h1 className="hero-title">
          Your Voice.<br />Your Future.
          <span className="accent">Vote.</span>
        </h1>
        <p className="hero-body">
          A secure, transparent, and accessible electronic voting system built
          to empower Nigeria's citizens and safeguard the democratic process.
        </p>
        <div className="hero-stats">
          <div>
            <div className="hero-stat-val">--</div>
            <div className="hero-stat-label">Registered Voters</div>
          </div>
          <div>
            <div className="hero-stat-val">{heroElections}</div>
            <div className="hero-stat-label">Active Elections</div>
          </div>
          <div>
            <div className="hero-stat-val">-</div>
            <div className="hero-stat-label">Votes Cast</div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM ── */}
      <div className="form-panel">
        <div className="form-logo">Vote<span>Secure</span></div>

        {!isAdminLogin ? (
          /* ════ VOTER SECTION ════ */
          <>
            <div className="form-headline">Welcome Back</div>
            <div className="form-sub">Sign in to access your ballot</div>

            <div className="form-tabs">
              <button className={`form-tab ${tab === 'login' ? 'active' : ''}`}
                onClick={() => { setTab('login'); setError(''); }}>Login</button>
              <button className={`form-tab ${tab === 'register' ? 'active' : ''}`}
                onClick={() => { setTab('register'); setError(''); }}>Register</button>
            </div>

            {error && (
              <div style={{
                color:        error.includes('successful') ? 'var(--success)' : 'var(--danger)',
                fontSize:     '.82rem', marginBottom: '1rem', padding: '8px 12px',
                background:   error.includes('successful') ? 'rgba(45,122,79,.08)' : 'rgba(192,57,43,.08)',
                border:       `1px solid ${error.includes('successful') ? 'rgba(45,122,79,.2)' : 'rgba(192,57,43,.2)'}`,
                borderRadius: '3px'
              }}>{error}</div>
            )}

            {/* VOTER LOGIN */}
            {tab === 'login' && (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>National ID (NIN)</label>
                  <input type="text" placeholder="e.g. NID001" autoComplete="username"
                    value={loginData.national_id}
                    onChange={e => setLoginData({ ...loginData, national_id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="••••••••" autoComplete="current-password"
                    value={loginData.password}
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
                </div>
                <button className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
                <div className="divider-row">or</div>
                <div className="admin-btn-wrap">
                  <span className="admin-link" onClick={() => {
                    setIsAdminLogin(true); setError('');
                    setLoginData({ national_id: '', password: '' });
                  }}>⚙ Admin Portal</span>
                </div>
              </form>
            )}

            {/* VOTER REGISTER */}
            {tab === 'register' && (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="First & Last Name"
                    value={regData.full_name}
                    onChange={e => setRegData({ ...regData, full_name: e.target.value })} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>National ID (NIN)</label>
                    <input type="text" placeholder="NID Number"
                      value={regData.national_id}
                      onChange={e => setRegData({ ...regData, national_id: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" value={regData.dob}
                      onChange={e => setRegData({ ...regData, dob: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="voter@email.com"
                    value={regData.email}
                    onChange={e => setRegData({ ...regData, email: e.target.value })} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" placeholder="••••••••"
                      value={regData.password}
                      onChange={e => { setRegData({ ...regData, password: e.target.value }); checkStrength(e.target.value); }} />
                    <div className="pwd-strength">
                      <div className="pwd-bar" style={{ width: pwdWidth, background: pwdColor }}></div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="••••••••"
                      value={regData.password2}
                      onChange={e => setRegData({ ...regData, password2: e.target.value })} />
                  </div>
                </div>
                <button className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account →'}
                </button>
              </form>
            )}
          </>
        ) : (
          /* ════ ADMIN SECTION ════ */
          <>
            <div className="form-headline" style={{ color: 'var(--ink)' }}>
              {isAdminRegister ? 'Admin Registration' : 'Admin Portal'}
            </div>
            <div className="form-sub">
              {isAdminRegister ? 'Create a new admin account' : 'Restricted access — administrators only'}
            </div>

            <div style={{
              padding: '1rem', marginBottom: '1.5rem',
              background: 'rgba(200,168,75,.07)', border: '1px solid rgba(200,168,75,.3)',
              borderRadius: '3px', fontFamily: "'DM Mono',monospace",
              fontSize: '.7rem', letterSpacing: '1px', color: 'var(--muted)'
            }}>
              ⚙ ADMINISTRATOR ACCESS ONLY
            </div>

            {error && (
              <div style={{
                color:        error.includes('registered') ? 'var(--success)' : 'var(--danger)',
                fontSize:     '.82rem', marginBottom: '1rem', padding: '8px 12px',
                background:   error.includes('registered') ? 'rgba(45,122,79,.08)' : 'rgba(192,57,43,.08)',
                border:       `1px solid ${error.includes('registered') ? 'rgba(45,122,79,.2)' : 'rgba(192,57,43,.2)'}`,
                borderRadius: '3px'
              }}>{error}</div>
            )}

            {/* ADMIN LOGIN */}
            {!isAdminRegister && (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Admin ID</label>
                  <input type="text" placeholder="e.g. ADMIN-001" autoComplete="username"
                    value={loginData.national_id}
                    onChange={e => setLoginData({ ...loginData, national_id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Admin Password</label>
                  <input type="password" placeholder="••••••••" autoComplete="current-password"
                    value={loginData.password}
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
                </div>
                <button className="btn btn-dark btn-full" disabled={loading} style={{ marginBottom: '1rem' }}>
                  {loading ? 'Authenticating...' : '⚙ Access Admin Dashboard →'}
                </button>
                <div className="divider-row">or</div>
                <button type="button" className="btn btn-outline btn-full"
                  onClick={() => { setIsAdminRegister(true); setError(''); }}>
                  + Register New Admin
                </button>
              </form>
            )}

            {/* ADMIN REGISTER */}
            {isAdminRegister && (
              <form onSubmit={handleAdminRegister}>
                <div className="form-group">
                  <label>Admin ID</label>
                  <input type="text" placeholder="e.g. ADMIN-001"
                    value={adminRegData.national_id}
                    onChange={e => setAdminRegData({ ...adminRegData, national_id: e.target.value })} />
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.6rem', color: 'var(--muted)', marginTop: '4px' }}>
                    Must start with ADMIN- (e.g. ADMIN-001)
                  </div>
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="Administrator name"
                    value={adminRegData.full_name}
                    onChange={e => setAdminRegData({ ...adminRegData, full_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="admin@politico.com"
                    value={adminRegData.email}
                    onChange={e => setAdminRegData({ ...adminRegData, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" value={adminRegData.dob}
                    onChange={e => setAdminRegData({ ...adminRegData, dob: e.target.value })} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" placeholder="••••••••"
                      value={adminRegData.password}
                      onChange={e => setAdminRegData({ ...adminRegData, password: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="••••••••"
                      value={adminRegData.password2}
                      onChange={e => setAdminRegData({ ...adminRegData, password2: e.target.value })} />
                  </div>
                </div>
                <button className="btn btn-dark btn-full" disabled={loading} style={{ marginBottom: '1rem' }}>
                  {loading ? 'Registering...' : 'Register Admin →'}
                </button>
                <button type="button" className="btn btn-outline btn-full"
                  onClick={() => { setIsAdminRegister(false); setError(''); }}>
                  ← Back to Admin Login
                </button>
              </form>
            )}

            <div style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline btn-full"
                onClick={() => { setIsAdminLogin(false); setIsAdminRegister(false); setError(''); }}>
                ← Back to Voter Login
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
