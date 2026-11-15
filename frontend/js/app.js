/**
 * CareSaathi — Family Health & Care Coordination Platform
 * Frontend Application Controller & Monthly Calendar Engine
 *
 * Implements login-first flow, monthly interactive calendar,
 * family profiles, medication schedules, care continuity, and Gemini AI.
 */

'use strict';

// --- Environment & API Configuration ---
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '');

const resolvedBaseUrl =
  (typeof window !== 'undefined' && window.CARESAATHI_API_URL) ||
  (isLocalhost && typeof window !== 'undefined' && window.location.port !== '8000'
    ? 'http://127.0.0.1:8000'
    : '');

const CONFIG = {
  API_BASE_URL: resolvedBaseUrl,
  HEALTH_ENDPOINT: '/api/health',
  POLL_INTERVAL_MS: 30000,
  TIMEOUT_MS: 10000,
};

// --- Application State ---
const todayObj = new Date();
const todayDateStr = todayObj.toISOString().split('T')[0];

const appState = {
  currentView: 'dashboard',
  currentTheme: 'light',
  backendStatus: 'checking',
  activeToken: null,
  currentUser: null,
  demoTokens: [],
  familyProfiles: [],
  medications: [],
  appointments: [],
  aiChatHistory: [],
  isAIGenerating: false,

  // Calendar State
  calendar: {
    year: todayObj.getFullYear(),
    month: todayObj.getMonth(), // 0-indexed (10 = November)
    selectedDateStr: todayDateStr,
  },
};

// --- DOM Cache ---
const dom = {
  // Navigation & Shell
  appShell: document.getElementById('app-shell'),
  loginScreen: document.getElementById('login-screen'),
  sidebar: document.getElementById('app-sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
  sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
  navLinks: document.querySelectorAll('.nav-link'),
  views: document.querySelectorAll('.app-view'),

  // Topbar & Profile
  userProfilePill: document.getElementById('user-profile-pill'),
  userProfileDropdown: document.getElementById('user-profile-dropdown'),
  currentUserAvatar: document.getElementById('current-user-avatar'),
  currentUserName: document.getElementById('current-user-name'),
  currentUserRoleBadge: document.getElementById('current-user-role-badge'),
  dropdownUserName: document.getElementById('dropdown-user-name'),
  dropdownUserEmail: document.getElementById('dropdown-user-email'),
  dropdownLogoutBtn: document.getElementById('dropdown-logout-btn'),
  sidebarUserAvatar: document.getElementById('sidebar-user-avatar'),
  sidebarUserName: document.getElementById('sidebar-user-name'),
  sidebarUserRole: document.getElementById('sidebar-user-role'),
  sidebarLogoutBtn: document.getElementById('sidebar-logout-btn'),
  globalSearchInput: document.getElementById('global-search-input'),

  // Auth Elements
  authTabLogin: document.getElementById('auth-tab-login'),
  authTabSignup: document.getElementById('auth-tab-signup'),
  emailLoginForm: document.getElementById('email-login-form'),
  emailSignupForm: document.getElementById('email-signup-form'),
  loginEmailInput: document.getElementById('login-email'),
  loginPasswordInput: document.getElementById('login-password'),
  signupFullNameInput: document.getElementById('signup-fullname'),
  signupEmailInput: document.getElementById('signup-email'),
  signupPasswordInput: document.getElementById('signup-password'),
  signupFamilyInput: document.getElementById('signup-family'),
  quickDemoBtn: document.getElementById('quick-demo-btn'),

  // Dashboard Elements
  welcomeUserName: document.getElementById('welcome-user-name'),
  welcomeSubtext: document.getElementById('welcome-subtext'),
  todayDateDisplay: document.getElementById('today-date-display'),
  metricFamilyCount: document.getElementById('metric-family-count'),
  metricMedsCount: document.getElementById('metric-meds-count'),
  metricAptsCount: document.getElementById('metric-apts-count'),
  dashProfileName: document.getElementById('dash-profile-name'),
  dashProfileAge: document.getElementById('dash-profile-age'),
  dashProfileBlood: document.getElementById('dash-profile-blood'),
  dashProfileContact: document.getElementById('dash-profile-contact'),
  dashProfileAllergies: document.getElementById('dash-profile-allergies'),
  dashProfileNotes: document.getElementById('dash-profile-notes'),
  chipProfileStatus: document.getElementById('chip-profile-status'),
  dashboardMedTimeline: document.getElementById('dashboard-med-timeline'),
  chipMedsCount: document.getElementById('chip-meds-count'),
  dashboardAppointmentsList: document.getElementById('dashboard-appointments-list'),
  chipAptsCount: document.getElementById('chip-apts-count'),
  dashboardActivityList: document.getElementById('dashboard-activity-list'),
  dashAiQuickForm: document.getElementById('dash-ai-quick-form'),
  dashAiQuickInput: document.getElementById('dash-ai-quick-input'),

  // Views & Sections
  familyMembersGrid: document.getElementById('family-members-grid'),
  medicationsFullList: document.getElementById('medications-full-list'),
  medStatTotal: document.getElementById('med-stat-total'),
  medStatTaken: document.getElementById('med-stat-taken'),
  medStatRefill: document.getElementById('med-stat-refill'),

  // Calendar Elements
  calendarMonthYear: document.getElementById('calendar-month-year'),
  calendarDaysGrid: document.getElementById('calendar-days-grid'),
  calPrevMonthBtn: document.getElementById('cal-prev-month-btn'),
  calNextMonthBtn: document.getElementById('cal-next-month-btn'),
  calTodayBtn: document.getElementById('cal-today-btn'),
  selectedDateTitle: document.getElementById('selected-date-title'),
  selectedDateSubtitle: document.getElementById('selected-date-subtitle'),
  selectedDateAptsContainer: document.getElementById('selected-date-apts-container'),
  calQuickAddBtn: document.getElementById('cal-quick-add-btn'),

  // AI Assistant Elements
  aiChatMessages: document.getElementById('ai-chat-messages'),
  aiChatForm: document.getElementById('ai-chat-form'),
  aiChatInput: document.getElementById('ai-chat-input'),
  aiChatSendBtn: document.getElementById('ai-chat-send-btn'),
  aiTypingIndicator: document.getElementById('ai-typing-indicator'),
  aiEmptyState: document.getElementById('ai-empty-state'),
  aiClearChatBtn: document.getElementById('ai-clear-chat-btn'),
  aiNewChatBtn: document.getElementById('ai-new-chat-btn'),

  // Settings Elements
  settingsUserName: document.getElementById('settings-user-name'),
  settingsUserEmail: document.getElementById('settings-user-email'),
  settingsUserAvatar: document.getElementById('settings-user-avatar'),
  settingsHealthBlood: document.getElementById('settings-health-blood'),
  settingsHealthAge: document.getElementById('settings-health-age'),
  settingsHealthEmergency: document.getElementById('settings-health-emergency'),
  settingsHealthAllergies: document.getElementById('settings-health-allergies'),
  settingsLogoutBtn: document.getElementById('settings-logout-btn'),

  // Modals
  onboardingModal: document.getElementById('onboarding-modal'),
  onboardProfileForm: document.getElementById('onboard-profile-form'),
  scheduleAptModal: document.getElementById('schedule-apt-modal'),
  scheduleAptForm: document.getElementById('schedule-apt-form'),
  addPrescriptionModal: document.getElementById('add-prescription-modal'),
  addPrescriptionForm: document.getElementById('add-prescription-form'),
  addMemberModal: document.getElementById('add-member-modal'),
  addMemberForm: document.getElementById('add-member-form'),
  logoutConfirmModal: document.getElementById('logout-confirm-modal'),
  confirmLogoutBtn: document.getElementById('confirm-logout-btn'),
  cancelLogoutBtn: document.getElementById('cancel-logout-btn'),
  privacyPolicyModal: document.getElementById('privacy-policy-modal'),
  termsModal: document.getElementById('terms-modal'),
  linkOpenPrivacy: document.getElementById('link-open-privacy'),
  linkOpenTerms: document.getElementById('link-open-terms'),
};

// --- Helper Utilities ---

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showNotificationToast(msg, durationMs = 3500) {
  let toast = document.getElementById('care-saathi-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'care-saathi-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background-color: #111827;
      color: #FFFFFF;
      padding: 0.75rem 1.5rem;
      border-radius: 9999px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.18);
      font-size: 0.875rem;
      font-weight: 600;
      z-index: 99999;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>${escapeHTML(msg)}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, durationMs);
}

function showToast(msg) {
  showNotificationToast(msg);
}

function logActivity(title, subtitle = 'Just now • CareSaathi') {
  if (!dom.dashboardActivityList) return;
  const empty = dom.dashboardActivityList.querySelector('.empty-state-box');
  if (empty) empty.remove();

  const itemHtml = `
    <li class="activity-item" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid #E5E7EB;">
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #F0FDFA; color: #0F766E; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0; font-weight: 700;">✓</div>
      <div>
        <div style="font-size: 0.875rem; font-weight: 600; color: #111827;">${escapeHTML(title)}</div>
        <div style="font-size: 0.75rem; color: #64748B;">${escapeHTML(subtitle)}</div>
      </div>
    </li>
  `;
  dom.dashboardActivityList.insertAdjacentHTML('afterbegin', itemHtml);
}

// --- Navigation & View Management ---

function switchView(viewId) {
  const targetView = document.getElementById(`view-${viewId}`);
  if (!targetView) return;

  dom.views.forEach((v) => v.classList.remove('active'));
  targetView.classList.add('active');

  dom.navLinks.forEach((link) => {
    if (link.dataset.view === viewId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  appState.currentView = viewId;
  if (window.location.hash !== `#${viewId}`) {
    window.history.replaceState(null, '', `#${viewId}`);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMobileSidebar();

  // If switching to calendar view, ensure calendar is rendered
  if (viewId === 'appointments') {
    renderMonthlyCalendar();
  }
}

function openMobileSidebar() {
  if (dom.sidebar) dom.sidebar.classList.add('open');
  if (dom.sidebarOverlay) dom.sidebarOverlay.classList.add('active');
}

function closeMobileSidebar() {
  if (dom.sidebar) dom.sidebar.classList.remove('open');
  if (dom.sidebarOverlay) dom.sidebarOverlay.classList.remove('active');
}

// --- Authentication & Session Flow ---

function revealAppShell() {
  if (dom.loginScreen) dom.loginScreen.classList.add('hidden');
  if (dom.appShell) dom.appShell.classList.remove('hidden');
}

function showLoginScreen() {
  if (dom.loginScreen) dom.loginScreen.classList.remove('hidden');
  if (dom.appShell) dom.appShell.classList.add('hidden');
  if (window.location.hash !== '#login') {
    window.location.hash = '#login';
  }
}

function openLogoutModal() {
  if (dom.logoutConfirmModal) dom.logoutConfirmModal.classList.add('active');
}

function closeLogoutModal() {
  if (dom.logoutConfirmModal) dom.logoutConfirmModal.classList.remove('active');
}

async function performLogout() {
  if (appState.activeToken) {
    try {
      await fetch(`${CONFIG.API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appState.activeToken}`,
        },
      });
    } catch (e) {
      console.warn('Backend logout warning:', e);
    }
  }

  sessionStorage.removeItem('careSaathi_token');
  sessionStorage.removeItem('careSaathi_user');
  sessionStorage.removeItem('caresaathi_google_session');
  localStorage.removeItem('careSaathi_token');
  localStorage.removeItem('careSaathi_user');

  appState.activeToken = null;
  appState.currentUser = null;

  closeLogoutModal();
  document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));

  showLoginScreen();
  showNotificationToast('You have been logged out successfully.');
}

function applyUserSession(user) {
  if (!user) return;
  appState.currentUser = user;
  appState.activeToken = user.token;

  const rawName = user.full_name || (user.label ? user.label.split(' (')[0] : 'User');
  const email = user.email || 'user@example.com';
  const role = (user.role || 'family_owner').replace('_', ' ').toUpperCase();

  const initials =
    rawName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'CS';

  // Topbar
  if (dom.currentUserAvatar) dom.currentUserAvatar.textContent = initials;
  if (dom.currentUserName) dom.currentUserName.textContent = rawName;
  if (dom.currentUserRoleBadge) dom.currentUserRoleBadge.textContent = role;
  if (dom.dropdownUserName) dom.dropdownUserName.textContent = rawName;
  if (dom.dropdownUserEmail) dom.dropdownUserEmail.textContent = email;

  // Sidebar
  if (dom.sidebarUserAvatar) dom.sidebarUserAvatar.textContent = initials;
  if (dom.sidebarUserName) dom.sidebarUserName.textContent = rawName;
  if (dom.sidebarUserRole) dom.sidebarUserRole.textContent = role;

  // Settings View
  if (dom.settingsUserName) dom.settingsUserName.textContent = rawName;
  if (dom.settingsUserEmail) dom.settingsUserEmail.textContent = email;
  if (dom.settingsUserAvatar) dom.settingsUserAvatar.textContent = initials;

  // Welcome Banner
  if (dom.welcomeUserName) dom.welcomeUserName.textContent = rawName;
  if (dom.welcomeSubtext) {
    dom.welcomeSubtext.textContent = `Family healthcare coordination dashboard for ${rawName}.`;
  }

  // Today's Date
  if (dom.todayDateDisplay) {
    const today = new Date();
    dom.todayDateDisplay.textContent = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Load all application data
  loadFamilyProfiles();
  loadMedications();
  loadAppointments();
}

async function selectDemoAccount(demoId = 'user_anil_01') {
  let token = null;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/demo-tokens`);
    if (res.ok) {
      const data = await res.json();
      appState.demoTokens = data.demo_tokens || [];
      const matched = appState.demoTokens.find((t) => t.user_id === demoId);
      if (matched) token = matched.token;
    }
  } catch (e) {
    console.warn('Could not fetch dynamic demo tokens:', e);
  }

  const selected = {
    label: 'Anil Sharma (Family Owner)',
    full_name: 'Anil Sharma',
    user_id: 'user_anil_01',
    email: 'anil.sharma@example.com',
    role: 'family_owner',
    family_id: 'fam_sharma_101',
    token: token || 'demo_token_anil',
  };

  sessionStorage.setItem('careSaathi_token', selected.token);
  sessionStorage.setItem('careSaathi_user', JSON.stringify(selected));

  applyUserSession(selected);
  revealAppShell();
  switchView('dashboard');
  showNotificationToast('Signed in as Anil Sharma (Demo Account)');
  logActivity('Signed in with Demo Account', 'Just now • Demo Auth');
}

async function handleEmailLogin(e) {
  if (e) e.preventDefault();
  const email = dom.loginEmailInput ? dom.loginEmailInput.value.trim() : '';
  const password = dom.loginPasswordInput ? dom.loginPasswordInput.value : '';

  if (!email || !password) {
    alert('Please enter both email address and password.');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(`Login failed: ${data?.error?.message || data?.detail || 'Invalid email or password'}`);
      return;
    }

    const authUser = {
      full_name: data.user.full_name,
      label: `${data.user.full_name} (${data.user.role.replace('_', ' ')})`,
      user_id: data.user.user_id,
      email: data.user.email,
      role: data.user.role,
      family_id: data.user.family_id,
      token: data.access_token,
    };

    sessionStorage.setItem('careSaathi_token', data.access_token);
    sessionStorage.setItem('careSaathi_user', JSON.stringify(authUser));

    applyUserSession(authUser);
    revealAppShell();
    switchView('dashboard');
    showNotificationToast(`Welcome back, ${data.user.full_name}!`);
    logActivity(`Signed in with email (${data.user.email})`, 'Just now • Auth');
  } catch (err) {
    alert(`Login error: ${err.message}`);
  }
}

async function handleEmailSignup(e) {
  if (e) e.preventDefault();
  const fullName = dom.signupFullNameInput ? dom.signupFullNameInput.value.trim() : '';
  const email = dom.signupEmailInput ? dom.signupEmailInput.value.trim() : '';
  const password = dom.signupPasswordInput ? dom.signupPasswordInput.value : '';
  const familyName = dom.signupFamilyInput ? dom.signupFamilyInput.value.trim() : 'Family Care Circle';

  if (!fullName || !email || !password) {
    alert('Please complete all required fields.');
    return;
  }

  const payload = {
    full_name: fullName,
    email: email,
    password: password,
    family_name: familyName || 'Family Care Circle',
  };

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(`Signup failed: ${data?.error?.message || data?.detail || 'Registration error'}`);
      return;
    }

    const authUser = {
      full_name: data.user.full_name,
      label: `${data.user.full_name} (Family Owner)`,
      user_id: data.user.user_id,
      email: data.user.email,
      role: data.user.role,
      family_id: data.user.family_id,
      token: data.access_token,
    };

    sessionStorage.setItem('careSaathi_token', data.access_token);
    sessionStorage.setItem('careSaathi_user', JSON.stringify(authUser));

    applyUserSession(authUser);
    revealAppShell();
    switchView('dashboard');
    showNotificationToast(`Account created! Welcome to CareSaathi, ${data.user.full_name}!`);
    logActivity(`Registered new family account (${data.user.email})`, 'Just now • Auth');
  } catch (err) {
    alert(`Registration error: ${err.message}`);
  }
}

function handleOAuthRedirectCallback() {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  let hashParams = new URLSearchParams();
  if (url.hash && url.hash.includes('?')) {
    hashParams = new URLSearchParams(url.hash.split('?')[1]);
  }

  const oauthStatus = searchParams.get('oauth') || hashParams.get('oauth');
  const oauthError = searchParams.get('oauth_error') || hashParams.get('oauth_error');

  if (oauthStatus === 'success') {
    const token = searchParams.get('token') || hashParams.get('token');
    const email = searchParams.get('email') || hashParams.get('email');
    const userId = searchParams.get('user_id') || hashParams.get('user_id');
    const fullName = searchParams.get('name') || hashParams.get('name') || email;
    const role = searchParams.get('role') || hashParams.get('role') || 'family_owner';

    if (token) {
      const googleUser = {
        full_name: fullName,
        label: `${fullName} (Google)`,
        user_id: userId,
        email: email,
        role: role,
        family_id: 'fam_sharma_101',
        token: token,
      };

      sessionStorage.setItem('careSaathi_token', token);
      sessionStorage.setItem('careSaathi_user', JSON.stringify(googleUser));

      applyUserSession(googleUser);
      revealAppShell();
      window.history.replaceState(null, '', window.location.pathname + '#dashboard');
      switchView('dashboard');
      showNotificationToast(`Welcome to CareSaathi, ${fullName}!`);
      return true;
    }
  } else if (oauthError) {
    alert(`Authentication Error: ${oauthError}`);
    window.history.replaceState(null, '', window.location.pathname + '#login');
    showLoginScreen();
    return false;
  }
  return false;
}

// --- Data Operations: Profiles, Medications, Appointments ---

async function loadFamilyProfiles() {
  if (!appState.activeToken) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/family/profiles`, {
      headers: {
        Authorization: `Bearer ${appState.activeToken}`,
      },
    });

    if (!res.ok) return;
    const profiles = await res.json();
    appState.familyProfiles = profiles;

    if (dom.metricFamilyCount) {
      dom.metricFamilyCount.textContent = `${profiles.length} Member${profiles.length === 1 ? '' : 's'}`;
    }

    const primaryProfile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (primaryProfile) {
      if (dom.dashProfileName) dom.dashProfileName.textContent = primaryProfile.full_name;
      if (dom.dashProfileAge) dom.dashProfileAge.textContent = `${primaryProfile.age} yrs (${primaryProfile.age_group})`;
      if (dom.dashProfileBlood) dom.dashProfileBlood.textContent = primaryProfile.blood_group || 'Not recorded';
      if (dom.dashProfileContact) dom.dashProfileContact.textContent = primaryProfile.emergency_contact || 'None';
      if (dom.dashProfileAllergies) dom.dashProfileAllergies.textContent = primaryProfile.allergies || 'None reported';
      if (dom.dashProfileNotes) dom.dashProfileNotes.textContent = primaryProfile.care_notes || 'Stable';
      if (dom.chipProfileStatus) dom.chipProfileStatus.textContent = 'Profile Complete';

      if (dom.settingsHealthBlood) dom.settingsHealthBlood.textContent = primaryProfile.blood_group || 'Not recorded';
      if (dom.settingsHealthAge) dom.settingsHealthAge.textContent = `${primaryProfile.age} yrs (${primaryProfile.age_group})`;
      if (dom.settingsHealthEmergency) dom.settingsHealthEmergency.textContent = primaryProfile.emergency_contact || 'None listed';
      if (dom.settingsHealthAllergies) dom.settingsHealthAllergies.textContent = primaryProfile.allergies || 'None reported';
    }

    // Populate modal member selectors
    const aptMemberSelect = document.getElementById('modal-apt-member');
    const rxMemberSelect = document.getElementById('modal-rx-member');

    if (aptMemberSelect && profiles.length > 0) {
      aptMemberSelect.innerHTML = profiles
        .map((p) => `<option value="${p.profile_id}">${escapeHTML(p.full_name)} (${p.relationship})</option>`)
        .join('');
    }
    if (rxMemberSelect && profiles.length > 0) {
      rxMemberSelect.innerHTML = profiles
        .map((p) => `<option value="${p.profile_id}">${escapeHTML(p.full_name)} (${p.relationship})</option>`)
        .join('');
    }

    // Render Family Members Full Grid
    renderFamilyMembersGrid(profiles);
  } catch (err) {
    console.warn('Could not load family profiles:', err);
  }
}

function renderFamilyMembersGrid(profiles) {
  if (!dom.familyMembersGrid) return;

  if (!Array.isArray(profiles) || profiles.length === 0) {
    dom.familyMembersGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #F8FAFC; border: 1px dashed #E5E7EB; border-radius: 12px;">
        <h4 style="color: #111827; margin-bottom: 0.5rem;">No family profiles recorded yet</h4>
        <p style="color: #64748B; font-size: 0.875rem; margin-bottom: 1rem;">Add elderly parents, children, or family members to begin coordinated care.</p>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('add-member-modal').classList.add('active')">+ Add First Family Member</button>
      </div>
    `;
    return;
  }

  dom.familyMembersGrid.innerHTML = profiles
    .map((p) => {
      const isSenior = p.age >= 60;
      return `
        <div class="card family-member-card" style="border-radius: 12px; border: 1px solid #E5E7EB; background: #FFFFFF; padding: 1.25rem;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: ${isSenior ? '#FEF3C7' : '#F0FDFA'}; color: ${isSenior ? '#B45309' : '#0F766E'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem;">
                ${p.full_name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 style="font-size: 1rem; font-weight: 700; color: #111827; margin: 0;">${escapeHTML(p.full_name)}</h4>
                <span style="font-size: 0.75rem; color: #64748B;">${escapeHTML(p.relationship)} • ${p.age} yrs</span>
              </div>
            </div>
            <span class="badge ${isSenior ? 'badge-warning' : 'badge-teal'}" style="font-size: 0.7rem;">
              ${p.age_group ? p.age_group.toUpperCase() : 'MEMBER'}
            </span>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 8px; padding: 0.75rem; font-size: 0.8rem; margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="color: #64748B;">Blood Group:</span>
              <strong style="color: #111827;">${escapeHTML(p.blood_group || 'Not recorded')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="color: #64748B;">Emergency Contact:</span>
              <strong style="color: #111827; text-align: right; max-width: 60%;">${escapeHTML(p.emergency_contact || 'None')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Allergies:</span>
              <strong style="color: ${p.allergies ? '#B91C1C' : '#111827'};">${escapeHTML(p.allergies || 'None')}</strong>
            </div>
          </div>

          <p style="font-size: 0.8rem; color: #4B5563; margin: 0 0 0.85rem 0; line-height: 1.4;">
            <strong>Care Notes:</strong> ${escapeHTML(p.care_notes || 'Stable routine care.')}
          </p>

          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button type="button" class="btn btn-sm btn-outline edit-member-btn" data-profile-id="${p.profile_id}" onclick="document.getElementById('onboarding-modal').classList.add('active')">Edit Profile</button>
          </div>
        </div>
      `;
    })
    .join('');
}

async function loadMedications() {
  if (!appState.activeToken) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/medications`, {
      headers: {
        Authorization: `Bearer ${appState.activeToken}`,
      },
    });

    if (!res.ok) return;
    const meds = await res.json();
    appState.medications = meds;

    if (dom.chipMedsCount) {
      dom.chipMedsCount.textContent = `${meds.length} Prescribed`;
    }
    if (dom.metricMedsCount) {
      dom.metricMedsCount.textContent = `${meds.length} Scheduled`;
    }

    // Update Medication View Metrics
    if (dom.medStatTotal) dom.medStatTotal.textContent = `${meds.length} Meds`;
    const takenCount = meds.filter((m) => m.status_today === 'reported_taken').length;
    if (dom.medStatTaken) dom.medStatTaken.textContent = `${takenCount} of ${meds.length}`;
    const lowRefillCount = meds.filter((m) => m.refill_days_left <= 7).length;
    if (dom.medStatRefill) dom.medStatRefill.textContent = `${lowRefillCount} Refill Alert${lowRefillCount === 1 ? '' : 's'}`;

    // Render Dashboard Snapshot
    renderDashboardMedications(meds);

    // Render Full Medication Screen
    renderFullMedicationsList(meds);
  } catch (err) {
    console.warn('Could not load medications:', err);
  }
}

function renderDashboardMedications(meds) {
  if (!dom.dashboardMedTimeline) return;

  if (!Array.isArray(meds) || meds.length === 0) {
    dom.dashboardMedTimeline.innerHTML = `
      <div class="empty-state-box" style="text-align: center; padding: 2rem 1rem; border: 1px dashed #E5E7EB; border-radius: 8px;">
        <p style="color: #64748B; font-size: 0.875rem; margin-bottom: 0.75rem;">No active medications scheduled yet.</p>
        <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('add-prescription-modal').classList.add('active')">+ Add First Prescription</button>
      </div>
    `;
    return;
  }

  dom.dashboardMedTimeline.innerHTML = meds
    .map((med) => {
      const isTaken = med.status_today === 'reported_taken';
      return `
        <div class="med-schedule-item ${isTaken ? 'taken' : ''}" data-med-id="${med.medication_id}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #E5E7EB;">
          <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
            <div style="width: 32px; height: 32px; border-radius: 6px; background: ${isTaken ? '#F0FDF4' : '#F0FDFA'}; color: ${isTaken ? '#166534' : '#0F766E'}; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0;">
              ${isTaken ? '✓' : 'Rx'}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 0.875rem; color: #111827;">${escapeHTML(med.name)} <span style="font-weight: 400; color: #64748B;">(${escapeHTML(med.dosage)})</span></div>
              <div style="font-size: 0.75rem; color: #64748B;">For: <strong>${escapeHTML(med.patient_name)}</strong> • ${escapeHTML(med.schedule_time)} (${escapeHTML(med.frequency)})</div>
              ${med.instructions ? `<div style="font-size: 0.725rem; color: #0F766E; margin-top: 2px;">Note: ${escapeHTML(med.instructions)}</div>` : ''}
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <button type="button" class="btn btn-sm ${isTaken ? 'btn-secondary' : 'btn-primary'} toggle-med-status-btn" data-med-id="${med.medication_id}" data-current-status="${med.status_today}">
              ${isTaken ? 'Taken ✓' : 'Mark Taken'}
            </button>
            <div style="font-size: 0.7rem; color: #64748B; margin-top: 4px;">Supply: ${med.refill_days_left}d left</div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderFullMedicationsList(meds) {
  if (!dom.medicationsFullList) return;

  if (!Array.isArray(meds) || meds.length === 0) {
    dom.medicationsFullList.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #64748B;">No prescriptions recorded.</div>
    `;
    return;
  }

  dom.medicationsFullList.innerHTML = meds
    .map((med) => {
      const isTaken = med.status_today === 'reported_taken';
      const isLowRefill = med.refill_days_left <= 7;
      return `
        <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 42px; height: 42px; border-radius: 8px; background: ${isTaken ? '#F0FDF4' : '#F0FDFA'}; color: ${isTaken ? '#166534' : '#0F766E'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem;">
              Rx
            </div>
            <div>
              <h4 style="font-size: 1rem; font-weight: 700; color: #111827; margin: 0 0 2px 0;">${escapeHTML(med.name)} <span style="font-weight: 500; color: #64748B;">${escapeHTML(med.dosage)}</span></h4>
              <div style="font-size: 0.8rem; color: #64748B;">Patient: <strong>${escapeHTML(med.patient_name)}</strong> • Scheduled: <strong>${escapeHTML(med.schedule_time)}</strong> (${escapeHTML(med.frequency)})</div>
              <div style="font-size: 0.75rem; color: #4B5563; margin-top: 4px;">Instructions: ${escapeHTML(med.instructions || 'Take as directed')}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="text-align: right;">
              <span class="badge ${isLowRefill ? 'badge-warning' : 'badge-teal'}" style="font-size: 0.75rem;">
                ${med.refill_days_left} Days Supply
              </span>
              <div style="font-size: 0.7rem; color: #64748B; margin-top: 4px;">Status: ${isTaken ? 'Reported Taken' : 'Pending Dose'}</div>
            </div>
            <button type="button" class="btn ${isTaken ? 'btn-secondary' : 'btn-primary'} toggle-med-status-btn" data-med-id="${med.medication_id}" data-current-status="${med.status_today}" style="min-width: 110px;">
              ${isTaken ? 'Taken ✓' : 'Mark Taken'}
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

async function markMedicationStatus(medId, currentStatus) {
  if (!appState.activeToken) return;
  const targetStatus = currentStatus === 'reported_taken' ? 'pending' : 'reported_taken';

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/medications/${medId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        status: targetStatus,
        confirmation_notes: `Status updated by ${appState.currentUser?.full_name || 'Family'} via CareSaathi`,
      }),
    });

    if (res.ok) {
      showToast(targetStatus === 'reported_taken' ? 'Medication marked as taken!' : 'Medication reset to pending.');
      logActivity(
        targetStatus === 'reported_taken' ? 'Confirmed medication taken' : 'Reset medication to pending',
        'Just now • Medication Tracker'
      );
      await loadMedications();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Could not update status: ${err?.detail || res.statusText}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// --- Appointments & Monthly Calendar Engine (PHASE 3) ---

async function loadAppointments() {
  if (!appState.activeToken) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/appointments`, {
      headers: {
        Authorization: `Bearer ${appState.activeToken}`,
      },
    });

    if (!res.ok) return;
    const apts = await res.json();
    appState.appointments = apts;

    if (dom.chipAptsCount) {
      dom.chipAptsCount.textContent = `${apts.length} Scheduled`;
    }
    if (dom.metricAptsCount) {
      dom.metricAptsCount.textContent = `${apts.length} Consultations`;
    }

    // Render Dashboard Upcoming Consultations
    renderDashboardAppointments(apts);

    // Render Monthly Calendar & Selected Date Consultations
    renderMonthlyCalendar();
  } catch (err) {
    console.warn('Could not load appointments:', err);
  }
}

function renderDashboardAppointments(apts) {
  if (!dom.dashboardAppointmentsList) return;

  if (!Array.isArray(apts) || apts.length === 0) {
    dom.dashboardAppointmentsList.innerHTML = `
      <div class="empty-state-box" style="text-align: center; padding: 2rem 1rem; border: 1px dashed #E5E7EB; border-radius: 8px;">
        <p style="color: #64748B; font-size: 0.875rem; margin-bottom: 0.75rem;">No consultations scheduled yet.</p>
        <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('schedule-apt-modal').classList.add('active')">+ Book Consultation</button>
      </div>
    `;
    return;
  }

  dom.dashboardAppointmentsList.innerHTML = apts
    .map((apt) => {
      const hasEscort = !!apt.escort_name;
      return `
        <div class="appointment-card-item" data-apt-id="${apt.appointment_id}" style="padding: 0.85rem 0; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-weight: 600; font-size: 0.875rem; color: #111827;">${escapeHTML(apt.specialty)} • ${escapeHTML(apt.doctor_name)}</div>
            <div style="font-size: 0.75rem; color: #64748B; margin-top: 2px;">Patient: <strong>${escapeHTML(apt.patient_name)}</strong> • 📅 ${escapeHTML(apt.appointment_date)}</div>
            <div style="font-size: 0.725rem; color: #64748B; margin-top: 2px;">📍 ${escapeHTML(apt.location)}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <span class="badge" style="background: ${hasEscort ? '#F0FDF4' : '#FEF3C7'}; color: ${hasEscort ? '#166534' : '#92400E'}; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.725rem; font-weight: 600;">
              ${hasEscort ? `Escort: ${escapeHTML(apt.escort_name)}` : 'Escort Needed'}
            </span>
            ${
              !hasEscort
                ? `<div style="margin-top: 4px;"><button type="button" class="btn btn-sm btn-outline confirm-escort-btn" data-apt-id="${apt.appointment_id}" style="font-size: 0.7rem; padding: 2px 6px;">Accompany</button></div>`
                : ''
            }
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Monthly Calendar Renderer
 * Calculates days for current month, highlights today, marks appointments, and binds selection.
 */
function renderMonthlyCalendar() {
  if (!dom.calendarDaysGrid || !dom.calendarMonthYear) return;

  const year = appState.calendar.year;
  const month = appState.calendar.month;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  dom.calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = totalDaysPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const mStr = String(prevMonthIdx + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const cellDateStr = `${prevYear}-${mStr}-${dStr}`;

    cells.push({
      dateStr: cellDateStr,
      dayNum: dayNum,
      isOtherMonth: true,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const cellDateStr = `${year}-${mStr}-${dStr}`;

    cells.push({
      dateStr: cellDateStr,
      dayNum: d,
      isOtherMonth: false,
    });
  }

  // Next month leading days (to complete grid to 35 or 42 cells)
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const mStr = String(nextMonthIdx + 1).padStart(2, '0');
    const dStr = String(n).padStart(2, '0');
    const cellDateStr = `${nextYear}-${mStr}-${dStr}`;

    cells.push({
      dateStr: cellDateStr,
      dayNum: n,
      isOtherMonth: true,
    });
  }

  // Map appointments to date strings
  const aptsByDate = {};
  (appState.appointments || []).forEach((apt) => {
    // extract YYYY-MM-DD from appointment_date
    const dateMatch = apt.appointment_date.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      const dKey = dateMatch[0];
      if (!aptsByDate[dKey]) aptsByDate[dKey] = [];
      aptsByDate[dKey].push(apt);
    }
  });

  // Render day cells
  dom.calendarDaysGrid.innerHTML = cells
    .map((c) => {
      const isToday = c.dateStr === todayDateStr;
      const isSelected = c.dateStr === appState.calendar.selectedDateStr;
      const dayApts = aptsByDate[c.dateStr] || [];
      const hasApt = dayApts.length > 0;

      let aptBadges = '';
      if (hasApt) {
        aptBadges = `
          <div class="cal-day-badges">
            ${dayApts.map((a) => `<span class="cal-apt-pill" title="${escapeHTML(a.specialty)}">${escapeHTML(a.doctor_name.split(' ')[1] || a.doctor_name)}</span>`).join('')}
          </div>
        `;
      }

      return `
        <div class="calendar-day-cell ${c.isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${c.dateStr}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="cal-day-num">${c.dayNum}</span>
            ${hasApt ? '<span class="cal-apt-dot" title="Consultation scheduled"></span>' : ''}
          </div>
          ${aptBadges}
        </div>
      `;
    })
    .join('');

  // Bind day cell click handlers
  dom.calendarDaysGrid.querySelectorAll('.calendar-day-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      const dateStr = cell.dataset.date;
      appState.calendar.selectedDateStr = dateStr;
      renderMonthlyCalendar();
      renderSelectedDateAppointments(dateStr);
    });
  });

  // Render appointments for currently selected date
  renderSelectedDateAppointments(appState.calendar.selectedDateStr);
}

function renderSelectedDateAppointments(dateStr) {
  if (!dom.selectedDateAptsContainer || !dom.selectedDateTitle) return;

  const dObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  dom.selectedDateTitle.textContent = `Consultations for ${formattedDate}`;

  // Find matching appointments
  const matched = (appState.appointments || []).filter((apt) =>
    apt.appointment_date.startsWith(dateStr)
  );

  if (dom.selectedDateSubtitle) {
    dom.selectedDateSubtitle.textContent =
      matched.length === 0
        ? 'No consultations scheduled for this date'
        : `${matched.length} consultation${matched.length === 1 ? '' : 's'} scheduled`;
  }

  if (matched.length === 0) {
    dom.selectedDateAptsContainer.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; border: 1px dashed #E5E7EB; border-radius: 8px;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: #F8FAFC; color: #64748B; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto;">
          📅
        </div>
        <h4 style="font-size: 0.95rem; font-weight: 600; color: #111827; margin-bottom: 0.25rem;">No Appointments</h4>
        <p style="font-size: 0.8rem; color: #64748B; margin-bottom: 1rem;">No doctor visits or clinic consultations recorded for this date.</p>
        <button type="button" class="btn btn-sm btn-primary" onclick="openAptModalWithDate('${dateStr}')">+ Book for ${formattedDate}</button>
      </div>
    `;
    return;
  }

  dom.selectedDateAptsContainer.innerHTML = matched
    .map((apt) => {
      const hasEscort = !!apt.escort_name;
      return `
        <div style="background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 8px; padding: 1rem; margin-bottom: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0;">${escapeHTML(apt.specialty)}</h4>
              <div style="font-size: 0.8rem; color: #0F766E; font-weight: 600;">${escapeHTML(apt.doctor_name)}</div>
            </div>
            <span class="badge ${hasEscort ? 'badge-teal' : 'badge-warning'}" style="font-size: 0.7rem;">
              ${hasEscort ? `Escort: ${escapeHTML(apt.escort_name)}` : 'Escort Needed'}
            </span>
          </div>

          <div style="font-size: 0.775rem; color: #64748B; line-height: 1.5; margin-bottom: 0.5rem;">
            <div>Patient: <strong>${escapeHTML(apt.patient_name)}</strong></div>
            <div>Time: <strong>${escapeHTML(apt.appointment_date)}</strong></div>
            <div>Location: ${escapeHTML(apt.location || 'Clinic')}</div>
            ${apt.notes ? `<div style="margin-top: 4px; color: #374151;">Note: ${escapeHTML(apt.notes)}</div>` : ''}
          </div>

          ${
            !hasEscort
              ? `<button type="button" class="btn btn-sm btn-outline confirm-escort-btn" data-apt-id="${apt.appointment_id}" style="width: 100%; font-size: 0.75rem;">Confirm Family Escort</button>`
              : ''
          }
        </div>
      `;
    })
    .join('');
}

window.openAptModalWithDate = function (dateStr) {
  const modal = document.getElementById('schedule-apt-modal');
  const dateInput = document.getElementById('modal-apt-date');
  if (dateInput) {
    dateInput.value = `${dateStr}T10:00`;
  }
  if (modal) modal.classList.add('active');
};

async function confirmAppointmentEscort(aptId) {
  if (!appState.activeToken) return;
  const user = appState.currentUser;
  const escortName = user ? user.full_name || user.label.split(' (')[0] : 'Family Member';

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/appointments/${aptId}/confirm-escort`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        escort_user_id: user ? user.user_id : 'user_self',
        escort_name: escortName,
      }),
    });

    if (res.ok) {
      showToast(`Confirmed escort accompaniment for appointment.`);
      logActivity(`Confirmed appointment accompaniment: ${escortName}`, 'Just now • Care Continuity');
      await loadAppointments();
    }
  } catch (err) {
    alert(`Could not confirm escort: ${err.message}`);
  }
}

// --- AI Assistant Integration ---

function formatAIMarkdown(text) {
  if (!text) return '';
  return escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^-\s+(.*)$/gm, '<li style="margin-left: 1rem; list-style-type: disc;">$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul style="margin: 0.5rem 0; padding-left: 0.5rem;">$1</ul>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function clearAIChat() {
  appState.aiChatHistory = [];
  if (dom.aiChatMessages) {
    dom.aiChatMessages.innerHTML = '';
  }
  if (dom.aiEmptyState) {
    dom.aiEmptyState.style.display = 'block';
  }
}

function appendChatMessage(role, contentHtml, metaInfo = '', disclaimer = '') {
  if (!dom.aiChatMessages) return;
  if (dom.aiEmptyState) dom.aiEmptyState.style.display = 'none';

  const isUser = role === 'user';
  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${isUser ? 'user' : 'bot'}`;
  msgEl.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: ${isUser ? 'flex-end' : 'flex-start'};
    margin-bottom: 1rem;
    max-width: 85%;
    align-self: ${isUser ? 'flex-end' : 'flex-start'};
  `;

  msgEl.innerHTML = `
    <div style="font-size: 0.7rem; font-weight: 700; color: ${isUser ? '#0F766E' : '#64748B'}; margin-bottom: 0.25rem;">
      ${isUser ? 'You' : 'CareSaathi AI'}
    </div>
    <div class="message-content" style="
      background-color: ${isUser ? '#0F766E' : '#F8FAFC'};
      color: ${isUser ? '#FFFFFF' : '#111827'};
      border: 1px solid ${isUser ? '#0F766E' : '#E5E7EB'};
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      line-height: 1.5;
    ">
      <div>${contentHtml}</div>
      ${
        disclaimer
          ? `<div style="margin-top: 0.5rem; padding-top: 0.35rem; border-top: 1px solid rgba(0,0,0,0.08); font-size: 0.725rem; color: #64748B;">
              ${escapeHTML(disclaimer)}
            </div>`
          : ''
      }
    </div>
  `;

  dom.aiChatMessages.appendChild(msgEl);
  dom.aiChatMessages.scrollTop = dom.aiChatMessages.scrollHeight;
}

async function sendAIMessage(queryText) {
  if (!queryText || appState.isAIGenerating) return;
  if (!appState.activeToken) {
    alert('Please sign in to communicate with CareSaathi AI.');
    return;
  }

  if (appState.currentView !== 'ai-assistant') {
    switchView('ai-assistant');
  }

  appendChatMessage('user', escapeHTML(queryText));

  if (dom.aiChatInput) dom.aiChatInput.value = '';
  if (dom.dashAiQuickInput) dom.dashAiQuickInput.value = '';

  appState.isAIGenerating = true;
  if (dom.aiChatSendBtn) dom.aiChatSendBtn.disabled = true;
  if (dom.aiTypingIndicator) dom.aiTypingIndicator.style.display = 'flex';

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        message: queryText,
        history: appState.aiChatHistory.slice(-8),
      }),
    });

    if (dom.aiTypingIndicator) dom.aiTypingIndicator.style.display = 'none';

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      appendChatMessage(
        'bot',
        `CareSaathi AI could not complete this request: ${escapeHTML(err?.detail || err?.error?.message || res.statusText)}`
      );
      return;
    }

    const data = await res.json();
    const formatted = formatAIMarkdown(data.response);
    appendChatMessage('bot', formatted, '', data.disclaimer);

    appState.aiChatHistory.push({ role: 'user', content: queryText });
    appState.aiChatHistory.push({ role: 'assistant', content: data.response });
  } catch (err) {
    if (dom.aiTypingIndicator) dom.aiTypingIndicator.style.display = 'none';
    appendChatMessage(
      'bot',
      `Connection error with AI service: ${escapeHTML(err.message)}. Please verify your network and try again.`
    );
  } finally {
    appState.isAIGenerating = false;
    if (dom.aiChatSendBtn) dom.aiChatSendBtn.disabled = false;
  }
}

// --- Modals & Modal Form Handling ---

function setupModals() {
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.closeModal;
      const modalEl = document.getElementById(modalId);
      if (modalEl) modalEl.classList.remove('active');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Open modals
  const btnOpenAddMember = document.getElementById('btn-open-add-member-modal');
  if (btnOpenAddMember && dom.addMemberModal) {
    btnOpenAddMember.addEventListener('click', () => dom.addMemberModal.classList.add('active'));
  }

  const btnOpenAddMed = document.getElementById('btn-open-add-med-modal');
  if (btnOpenAddMed && dom.addPrescriptionModal) {
    btnOpenAddMed.addEventListener('click', () => dom.addPrescriptionModal.classList.add('active'));
  }

  const btnOpenScheduleApt = document.getElementById('btn-open-schedule-apt-modal');
  if (btnOpenScheduleApt && dom.scheduleAptModal) {
    btnOpenScheduleApt.addEventListener('click', () => {
      openAptModalWithDate(appState.calendar.selectedDateStr);
    });
  }

  if (dom.calQuickAddBtn) {
    dom.calQuickAddBtn.addEventListener('click', () => {
      openAptModalWithDate(appState.calendar.selectedDateStr);
    });
  }

  const dashAddAptBtn = document.getElementById('dash-quick-add-apt-btn');
  if (dashAddAptBtn) {
    dashAddAptBtn.addEventListener('click', () => {
      openAptModalWithDate(todayDateStr);
    });
  }

  const dashAddMedBtn = document.getElementById('dash-quick-add-med-btn');
  if (dashAddMedBtn && dom.addPrescriptionModal) {
    dashAddMedBtn.addEventListener('click', () => dom.addPrescriptionModal.classList.add('active'));
  }

  const editProfileBtns = ['dash-edit-profile-btn', 'settings-edit-health-btn'];
  editProfileBtns.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn && dom.onboardingModal) {
      btn.addEventListener('click', () => {
        const profile = appState.familyProfiles && appState.familyProfiles.length > 0 ? appState.familyProfiles[0] : null;
        const user = appState.currentUser;
        const nameInput = document.getElementById('onboard-fullname');
        const ageInput = document.getElementById('onboard-age');
        const bloodInput = document.getElementById('onboard-blood');
        const emergencyInput = document.getElementById('onboard-emergency');
        const allergiesInput = document.getElementById('onboard-allergies');
        const conditionsInput = document.getElementById('onboard-conditions');

        if (nameInput) nameInput.value = (profile && profile.full_name) || (user ? user.full_name : '');
        if (ageInput) ageInput.value = (profile && profile.age) || '';
        if (bloodInput) bloodInput.value = (profile && profile.blood_group) || '';
        if (emergencyInput) emergencyInput.value = (profile && profile.emergency_contact) || '';
        if (allergiesInput) allergiesInput.value = (profile && profile.allergies) || '';
        if (conditionsInput) conditionsInput.value = (profile && profile.care_notes) || '';

        dom.onboardingModal.classList.add('active');
      });
    }
  });

  // Terms and Privacy links
  if (dom.linkOpenTerms && dom.termsModal) {
    dom.linkOpenTerms.addEventListener('click', (e) => {
      e.preventDefault();
      dom.termsModal.classList.add('active');
    });
  }
  if (dom.linkOpenPrivacy && dom.privacyPolicyModal) {
    dom.linkOpenPrivacy.addEventListener('click', (e) => {
      e.preventDefault();
      dom.privacyPolicyModal.classList.add('active');
    });
  }

  // Onboarding / Profile Form Submission
  if (dom.onboardProfileForm) {
    dom.onboardProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!appState.activeToken) return;

      const profile = appState.familyProfiles && appState.familyProfiles.length > 0 ? appState.familyProfiles[0] : null;
      if (!profile) {
        alert('No active health profile record found to update.');
        return;
      }

      const fullName = document.getElementById('onboard-fullname')?.value.trim();
      const ageVal = parseInt(document.getElementById('onboard-age')?.value, 10);
      const blood = document.getElementById('onboard-blood')?.value;
      const emergency = document.getElementById('onboard-emergency')?.value.trim();
      const allergies = document.getElementById('onboard-allergies')?.value.trim();
      const careNotes = document.getElementById('onboard-conditions')?.value.trim();

      const payload = {
        full_name: fullName || profile.full_name,
        age: !isNaN(ageVal) && ageVal > 0 ? ageVal : profile.age,
        blood_group: blood || profile.blood_group,
        emergency_contact: emergency || profile.emergency_contact,
        allergies: allergies || profile.allergies,
        care_notes: careNotes || profile.care_notes,
      };

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/family/profiles/${profile.profile_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${appState.activeToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to save health profile: ${err?.detail || res.statusText}`);
          return;
        }

        if (dom.onboardingModal) dom.onboardingModal.classList.remove('active');
        showToast('Personal health profile updated successfully!');
        logActivity('Updated health profile details', 'Just now • Health Records');
        await loadFamilyProfiles();
      } catch (err) {
        alert(`Error saving profile: ${err.message}`);
      }
    });
  }

  // Appointment Form Submission (Calendar & DB Integration)
  if (dom.scheduleAptForm) {
    dom.scheduleAptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!appState.activeToken) return;

      const profileId = document.getElementById('modal-apt-member')?.value || appState.familyProfiles[0]?.profile_id;
      const title = document.getElementById('modal-apt-title')?.value.trim();
      const doctor = document.getElementById('modal-apt-doctor')?.value.trim();
      const dateVal = document.getElementById('modal-apt-date')?.value;
      const location = document.getElementById('modal-apt-location')?.value.trim() || 'Apollo Clinic, Consulting Suite';
      const notes = document.getElementById('modal-apt-notes')?.value.trim();

      if (!title || !doctor || !dateVal) {
        alert('Please fill out all appointment details.');
        return;
      }

      // Convert dateVal to formatted string if needed
      const normalizedDate = dateVal.replace('T', ' ');

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/appointments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${appState.activeToken}`,
          },
          body: JSON.stringify({
            profile_id: profileId,
            doctor_name: doctor,
            specialty: title,
            appointment_date: normalizedDate,
            location: location,
            notes: notes || 'Scheduled via CareSaathi Calendar',
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to schedule appointment: ${err?.detail || res.statusText}`);
          return;
        }

        if (dom.scheduleAptModal) dom.scheduleAptModal.classList.remove('active');
        dom.scheduleAptForm.reset();
        showToast(`Consultation with ${doctor} scheduled!`);
        logActivity(`Scheduled appointment with ${doctor}`, 'Just now • Appointments');

        // Select the date of the new appointment on the calendar
        const newDateStr = normalizedDate.split(' ')[0];
        appState.calendar.selectedDateStr = newDateStr;
        const newD = new Date(newDateStr + 'T00:00:00');
        appState.calendar.year = newD.getFullYear();
        appState.calendar.month = newD.getMonth();

        await loadAppointments();
      } catch (err) {
        alert(`Error scheduling: ${err.message}`);
      }
    });
  }

  // Prescription Form Submission
  if (dom.addPrescriptionForm) {
    dom.addPrescriptionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!appState.activeToken) return;

      const profileId = document.getElementById('modal-rx-member')?.value || appState.familyProfiles[0]?.profile_id;
      const name = document.getElementById('modal-rx-name')?.value.trim();
      const dosage = document.getElementById('modal-rx-dosage')?.value.trim();
      const time = document.getElementById('modal-rx-time')?.value.trim();
      const frequency = document.getElementById('modal-rx-frequency')?.value || 'Once Daily';
      const refill = parseInt(document.getElementById('modal-rx-refill')?.value, 10) || 30;
      const instructions = document.getElementById('modal-rx-instructions')?.value.trim();

      if (!name || !dosage || !time) {
        alert('Please enter medication name, dosage and timing.');
        return;
      }

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/medications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${appState.activeToken}`,
          },
          body: JSON.stringify({
            profile_id: profileId,
            name: name,
            dosage: dosage,
            schedule_time: time,
            frequency: frequency,
            refill_days_left: refill,
            instructions: instructions || 'Take as directed',
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to schedule prescription: ${err?.detail || res.statusText}`);
          return;
        }

        if (dom.addPrescriptionModal) dom.addPrescriptionModal.classList.remove('active');
        dom.addPrescriptionForm.reset();
        showToast(`Prescription ${name} scheduled successfully!`);
        logActivity(`Scheduled prescription: ${name} (${dosage})`, 'Just now • Prescriptions');
        await loadMedications();
      } catch (err) {
        alert(`Error adding medication: ${err.message}`);
      }
    });
  }

  // Add Member Form Submission
  if (dom.addMemberForm) {
    dom.addMemberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!appState.activeToken) return;

      const name = document.getElementById('member-name')?.value.trim();
      const relation = document.getElementById('member-relation')?.value.trim();
      const ageVal = parseInt(document.getElementById('member-age')?.value, 10);
      const blood = document.getElementById('member-blood')?.value;
      const emergency = document.getElementById('member-emergency')?.value.trim();
      const notes = document.getElementById('member-notes')?.value.trim();

      if (!name || !relation || isNaN(ageVal)) {
        alert('Please complete all required fields.');
        return;
      }

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/family/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${appState.activeToken}`,
          },
          body: JSON.stringify({
            full_name: name,
            relationship: relation,
            age: ageVal,
            blood_group: blood,
            emergency_contact: emergency,
            care_notes: notes || 'Family coordination member',
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to add family member: ${err?.detail || res.statusText}`);
          return;
        }

        if (dom.addMemberModal) dom.addMemberModal.classList.remove('active');
        dom.addMemberForm.reset();
        showToast(`Family member ${name} added successfully!`);
        logActivity(`Added family member: ${name}`, 'Just now • Family Circle');
        await loadFamilyProfiles();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    });
  }
}

// --- Global Event Listeners Setup ---

function setupEventListeners() {
  // Navigation Links
  dom.navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.dataset.view;
      switchView(targetView);
    });
  });

  // Jump buttons (data-jump="view-id")
  document.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-jump]');
    if (jumpBtn) {
      e.preventDefault();
      const targetView = jumpBtn.dataset.jump;
      if (dom.userProfileDropdown) dom.userProfileDropdown.classList.remove('open');
      switchView(targetView);
    }
  });

  // Mobile sidebar controls
  if (dom.sidebarToggleBtn) dom.sidebarToggleBtn.addEventListener('click', openMobileSidebar);
  if (dom.sidebarCloseBtn) dom.sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
  if (dom.sidebarOverlay) dom.sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Auth Tabs (Sign In / Create Account)
  if (dom.authTabLogin && dom.authTabSignup) {
    dom.authTabLogin.addEventListener('click', () => {
      dom.authTabLogin.classList.add('active');
      dom.authTabSignup.classList.remove('active');
      if (dom.emailLoginForm) dom.emailLoginForm.style.display = 'block';
      if (dom.emailSignupForm) dom.emailSignupForm.style.display = 'none';
    });

    dom.authTabSignup.addEventListener('click', () => {
      dom.authTabSignup.classList.add('active');
      dom.authTabLogin.classList.remove('active');
      if (dom.emailLoginForm) dom.emailLoginForm.style.display = 'none';
      if (dom.emailSignupForm) dom.emailSignupForm.style.display = 'block';
    });
  }

  // Auth Form Submissions
  if (dom.emailLoginForm) dom.emailLoginForm.addEventListener('submit', handleEmailLogin);
  if (dom.emailSignupForm) dom.emailSignupForm.addEventListener('submit', handleEmailSignup);

  // Quick Demo Button
  if (dom.quickDemoBtn) {
    dom.quickDemoBtn.addEventListener('click', () => selectDemoAccount('user_anil_01'));
  }

  // Topbar Profile Pill Dropdown
  if (dom.userProfilePill && dom.userProfileDropdown) {
    dom.userProfilePill.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.userProfileDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!dom.userProfileDropdown.contains(e.target) && !dom.userProfilePill.contains(e.target)) {
        dom.userProfileDropdown.classList.remove('open');
      }
    });
  }

  // Logout Trigger Buttons
  const logoutButtons = [dom.dropdownLogoutBtn, dom.sidebarLogoutBtn, dom.settingsLogoutBtn];
  logoutButtons.forEach((btn) => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (dom.userProfileDropdown) dom.userProfileDropdown.classList.remove('open');
        openLogoutModal();
      });
    }
  });

  if (dom.confirmLogoutBtn) dom.confirmLogoutBtn.addEventListener('click', performLogout);
  if (dom.cancelLogoutBtn) dom.cancelLogoutBtn.addEventListener('click', closeLogoutModal);

  // Calendar Month Navigation Buttons (PHASE 3)
  if (dom.calPrevMonthBtn) {
    dom.calPrevMonthBtn.addEventListener('click', () => {
      if (appState.calendar.month === 0) {
        appState.calendar.month = 11;
        appState.calendar.year -= 1;
      } else {
        appState.calendar.month -= 1;
      }
      renderMonthlyCalendar();
    });
  }

  if (dom.calNextMonthBtn) {
    dom.calNextMonthBtn.addEventListener('click', () => {
      if (appState.calendar.month === 11) {
        appState.calendar.month = 0;
        appState.calendar.year += 1;
      } else {
        appState.calendar.month += 1;
      }
      renderMonthlyCalendar();
    });
  }

  if (dom.calTodayBtn) {
    dom.calTodayBtn.addEventListener('click', () => {
      const now = new Date();
      appState.calendar.year = now.getFullYear();
      appState.calendar.month = now.getMonth();
      appState.calendar.selectedDateStr = todayDateStr;
      renderMonthlyCalendar();
    });
  }

  // AI Prompt Chips
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.ai-prompt-chip');
    if (chip) {
      e.preventDefault();
      const query = chip.dataset.query || chip.textContent.trim();
      if (query) {
        sendAIMessage(query);
      }
    }
  });

  // AI Assistant Forms & Buttons
  if (dom.aiChatForm) {
    dom.aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = dom.aiChatInput ? dom.aiChatInput.value.trim() : '';
      if (q) sendAIMessage(q);
    });
  }

  if (dom.dashAiQuickForm) {
    dom.dashAiQuickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = dom.dashAiQuickInput ? dom.dashAiQuickInput.value.trim() : '';
      if (q) sendAIMessage(q);
    });
  }

  if (dom.aiClearChatBtn) dom.aiClearChatBtn.addEventListener('click', clearAIChat);
  if (dom.aiNewChatBtn) {
    dom.aiNewChatBtn.addEventListener('click', () => {
      clearAIChat();
      showToast('Started a fresh AI consultation.');
    });
  }

  // Delegated Clicks: Medication Status & Appointment Escort
  document.addEventListener('click', (e) => {
    const medBtn = e.target.closest('.toggle-med-status-btn');
    if (medBtn) {
      e.preventDefault();
      const medId = medBtn.dataset.medId;
      const status = medBtn.dataset.currentStatus;
      if (medId) markMedicationStatus(medId, status);
      return;
    }

    const escortBtn = e.target.closest('.confirm-escort-btn');
    if (escortBtn) {
      e.preventDefault();
      const aptId = escortBtn.dataset.aptId;
      if (aptId) confirmAppointmentEscort(aptId);
      return;
    }
  });

  // Setup Modals
  setupModals();
}

// --- Application Initialization (Strict Login Gate) ---

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-theme', 'light');

  setupEventListeners();

  const handledOAuth = handleOAuthRedirectCallback();

  const savedToken = sessionStorage.getItem('careSaathi_token') || localStorage.getItem('careSaathi_token');
  const savedUserJson = sessionStorage.getItem('careSaathi_user') || localStorage.getItem('careSaathi_user');

  if (savedToken && savedUserJson) {
    try {
      const user = JSON.parse(savedUserJson);
      user.token = savedToken;
      applyUserSession(user);
      revealAppShell();

      const initialHash = window.location.hash.replace('#', '');
      if (initialHash && initialHash !== 'login' && document.getElementById(`view-${initialHash}`)) {
        switchView(initialHash);
      } else {
        switchView('dashboard');
      }
    } catch {
      showLoginScreen();
    }
  } else if (!handledOAuth) {
    showLoginScreen();
  }

  // Navigation guards
  window.addEventListener('hashchange', () => {
    const token = sessionStorage.getItem('careSaathi_token') || localStorage.getItem('careSaathi_token');
    if (!token && window.location.hash !== '#login') {
      showLoginScreen();
    }
  });

  window.addEventListener('popstate', () => {
    const token = sessionStorage.getItem('careSaathi_token') || localStorage.getItem('careSaathi_token');
    if (!token && window.location.hash !== '#login') {
      showLoginScreen();
    }
  });
});
