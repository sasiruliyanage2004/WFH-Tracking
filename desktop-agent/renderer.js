// DOM Elements
const loginView = document.getElementById('login-view');
const trackingView = document.getElementById('tracking-view');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const errorMsg = document.getElementById('error-msg');

const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userDept = document.getElementById('user-dept');
const stopwatch = document.getElementById('stopwatch');
const trackingSwitch = document.getElementById('tracking-switch');
const controlStatus = document.getElementById('control-status');
const telemetryDot = document.getElementById('telemetry-dot');
const telemetryStatusText = document.getElementById('telemetry-status-text');
const telemetryAppInfo = document.getElementById('telemetry-app-info');
const btnLogout = document.getElementById('btn-logout');

const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');

// Window controls
btnMinimize.addEventListener('click', () => {
  window.api.minimizeWindow();
});

btnClose.addEventListener('click', () => {
  window.api.closeWindow();
});

// Login button handler
btnLogin.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please enter both email and password.');
    return;
  }

  btnLogin.disabled = true;
  btnLogin.innerText = 'Signing In...';
  errorMsg.style.display = 'none';

  window.api.login(email, password);
});

// Logout handler
btnLogout.addEventListener('click', () => {
  window.api.logout();
});

// Tracking Toggle Switch handler
trackingSwitch.addEventListener('change', (e) => {
  const active = e.target.checked;
  window.api.toggleTracking(active);

  if (active) {
    controlStatus.innerText = 'Tracking Active';
    controlStatus.style.color = 'var(--text-main)';
  } else {
    controlStatus.innerText = 'Tracking Inactive';
    controlStatus.style.color = 'var(--text-muted)';
    resetTelemetryDisplay();
  }
});

// Listeners from IPC
window.api.onAuthResult((data) => {
  btnLogin.disabled = false;
  btnLogin.innerText = 'Sign In';

  if (data.success) {
    // Show dashboard
    loginView.style.display = 'none';
    trackingView.style.display = 'flex';
    trackingView.classList.add('fade-in');

    // Populate user profile
    const user = data.user;
    userAvatar.innerText = user.name ? user.name[0].toUpperCase() : 'U';
    userName.innerText = user.name || 'Employee';
    userDept.innerText = `${user.department || 'Operations'} Department`;

    // Reset switch state
    trackingSwitch.checked = false;
    controlStatus.innerText = 'Tracking Inactive';
    stopwatch.innerText = '00:00:00';
    resetTelemetryDisplay();
  } else {
    // Check if it was a logout event
    if (data.loggedOut) {
      trackingView.style.display = 'none';
      loginView.style.display = 'flex';
      loginView.classList.add('fade-in');
      passwordInput.value = '';
    } else {
      showError(data.message || 'Login failed.');
    }
  }
});

window.api.onTrackingTick((timeStr) => {
  stopwatch.innerText = timeStr;
});

window.api.onStatusUpdate((status) => {
  if (status.inactive) {
    resetTelemetryDisplay();
    return;
  }

  telemetryDot.className = 'status-dot active';
  telemetryStatusText.innerText = 'Active';
  telemetryStatusText.style.color = 'var(--productive)';

  const badgeClass = `badge-${status.type.toLowerCase()}`;
  
  telemetryAppInfo.innerHTML = `
    <div class="app-name-row fade-in">
      <span class="app-process">${escapeHtml(status.appName)}</span>
      <span class="app-badge ${badgeClass}">${status.type}</span>
    </div>
    <div class="app-title-text fade-in" title="${escapeHtml(status.windowTitle)}">
      ${escapeHtml(status.windowTitle)}
    </div>
  `;
});

// Helper Functions
function showError(message) {
  errorMsg.innerText = message;
  errorMsg.style.display = 'block';
  errorMsg.classList.add('fade-in');
}

function resetTelemetryDisplay() {
  telemetryDot.className = 'status-dot';
  telemetryStatusText.innerText = 'Stopped';
  telemetryStatusText.style.color = 'var(--text-muted)';
  telemetryAppInfo.innerHTML = `
    <div style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 10px;">
      Turn tracking ON to monitor app usage.
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
