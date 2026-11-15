/**
 * CareSaathi - Family Health & Care Coordination Platform
 * Single Page Application (SPA) Controller & Dashboard Manager
 */

// Configuration
// Automatically detect local environment vs production hosting (e.g. Vercel)
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '0.0.0.0');

// In production, all API calls use relative paths ('/api/*') which Vercel proxies to Railway.
// In local development, direct calls to the local FastAPI backend (http://127.0.0.1:8000).
const resolvedBaseUrl =
  (typeof window !== 'undefined' && window.CARESAATHI_API_URL) ||
  (isLocalhost && typeof window !== 'undefined' && window.location.port !== '8000'
    ? 'http://127.0.0.1:8000'
    : '');

const CONFIG = {
  API_BASE_URL: resolvedBaseUrl,
  HEALTH_ENDPOINT: '/api/health',
  POLL_INTERVAL_MS: 30000,
  TIMEOUT_MS: 5000,
};

// Application State
const appState = {
  currentView: 'dashboard',
  currentTheme: 'dark', // 'dark' is default for modern healthcare SaaS
  privacyMode: true,     // true = masked, false = revealed
  backendStatus: 'checking', // 'online' | 'offline' | 'checking'
  backendLatency: null,
  pendingTasksCount: 2,
  medsDueCount: 1,
  unreadNotifsCount: 3,

  // RBAC & Authentication State
  activeUserId: 'user_anil_01',
  activeToken: null,
  currentUser: null,
  demoTokens: [],
  familyProfiles: [],

  // AI Assistant State
  aiChatHistory: [],
  isAIGenerating: false,
};

// DOM Cache
const dom = {
  sidebar: document.getElementById('app-sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
  sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
  navLinks: document.querySelectorAll('.nav-link'),
  views: document.querySelectorAll('.app-view'),

  // RBAC & User Identity Controls
  authRoleSelect: document.getElementById('auth-role-select'),
  currentUserAvatar: document.getElementById('current-user-avatar'),
  currentUserName: document.getElementById('current-user-name'),
  currentUserRoleBadge: document.getElementById('current-user-role-badge'),
  rbacForbiddenBanner: document.getElementById('rbac-forbidden-banner'),
  dashboardFamilyCardsGrid: document.getElementById('dashboard-family-cards-grid'),
  modalMemberError: document.getElementById('modal-member-error'),

  // Theme & Privacy Controls
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  themeToggleIcon: document.getElementById('theme-toggle-icon'),
  privacyToggleBtn: document.getElementById('privacy-toggle-btn'),
  privacyToggleIcon: document.getElementById('privacy-toggle-icon'),
  privacyToggleText: document.getElementById('privacy-toggle-text'),
  privacyMasterSwitch: document.getElementById('privacy-master-switch'),
  settingsThemeStatus: document.getElementById('settings-theme-status'),
  settingsThemeLightBtn: document.getElementById('settings-theme-light-btn'),
  settingsThemeDarkBtn: document.getElementById('settings-theme-dark-btn'),

  // Backend Status Indicators
  sidebarBackendPill: document.getElementById('sidebar-backend-pill'),
  sidebarBackendText: document.getElementById('sidebar-backend-text'),
  topnavHealthBtn: document.getElementById('topnav-health-btn'),
  topnavHealthText: document.getElementById('topnav-health-text'),
  dashApiStatusText: document.getElementById('dash-api-status-text'),
  dashApiLatency: document.getElementById('dash-api-latency'),
  refreshApiBtn: document.getElementById('refresh-api-btn'),

  // Filters & Search
  memberFocusSelect: document.getElementById('member-focus-select'),
  globalSearchInput: document.getElementById('global-search-input'),

  // Tasks & Counts
  taskList: document.getElementById('dashboard-task-list'),
  taskPendingCount: document.getElementById('task-pending-count'),
  chipTasks: document.getElementById('chip-tasks'),
  inlineAddTaskForm: document.getElementById('inline-add-task-form'),
  newTaskInput: document.getElementById('new-task-input'),

  // Notifications
  unreadSidebarBadge: document.getElementById('unread-sidebar-badge'),
  topnavNotifDot: document.getElementById('topnav-notif-dot'),
  markAllReadBtn: document.getElementById('mark-all-read-btn'),
  quickNotifBtn: document.getElementById('quick-notifications-btn'),

  // Modals
  scheduleAptModal: document.getElementById('schedule-apt-modal'),
  openScheduleAptBtn: document.getElementById('open-schedule-apt-btn'),
  scheduleAptViewBtn: document.getElementById('schedule-apt-view-btn'),
  scheduleAptForm: document.getElementById('schedule-apt-form'),

  addMemberModal: document.getElementById('add-member-modal'),
  addMemberBtn: document.getElementById('add-member-btn'),
  addMemberForm: document.getElementById('add-member-form'),
  familyTableBody: document.getElementById('family-table-body'),

  // AI Assistant Interface Controls
  aiChatMessages: document.getElementById('ai-chat-messages'),
  aiEmptyState: document.getElementById('ai-empty-state'),
  aiChatForm: document.getElementById('ai-chat-form'),
  aiChatInput: document.getElementById('ai-chat-input'),
  aiChatSendBtn: document.getElementById('ai-chat-send-btn'),
  aiClearChatBtn: document.getElementById('ai-clear-chat-btn'),
  aiTypingIndicator: document.getElementById('ai-typing-indicator'),
  aiContextUserName: document.getElementById('ai-context-user-name'),
  aiContextRoleBadge: document.getElementById('ai-context-role-badge'),
  aiContextMemberCount: document.getElementById('ai-context-member-count'),

  // Collaborative Care Modals
  addHandoffModal: document.getElementById('add-handoff-modal'),
  openAddHandoffBtn: document.getElementById('open-add-handoff-btn'),
  addHandoffForm: document.getElementById('add-handoff-form'),
  handoffNotesList: document.getElementById('handoff-notes-list'),

  addNoticeModal: document.getElementById('add-notice-modal'),
  openPostNoticeBtn: document.getElementById('open-post-notice-btn'),
  addNoticeForm: document.getElementById('add-notice-form'),
  familyNoticesFeed: document.getElementById('family-notices-feed'),

  doctorBriefModal: document.getElementById('doctor-brief-modal'),
  printHealthSummaryBtn: document.getElementById('print-health-summary-btn'),

  consultationChecklistModal: document.getElementById('consultation-checklist-modal'),
  checklistDoctorName: document.getElementById('checklist-doctor-name'),

  // Timelines
  dashboardActivityList: document.getElementById('dashboard-activity-list'),
  fullActivityTimeline: document.getElementById('full-activity-timeline'),
};

/**
 * Switch Active View
 * @param {string} viewId - ID of the target view (without 'view-')
 */
function switchView(viewId) {
  if (!viewId) return;

  const targetId = viewId.replace(/^view-/, '').replace(/^#/, '');
  const targetViewEl = document.getElementById(`view-${targetId}`);

  if (!targetViewEl) {
    console.warn(`View not found: view-${targetId}`);
    return;
  }

  dom.views.forEach((v) => v.classList.remove('active'));
  targetViewEl.classList.add('active');

  dom.navLinks.forEach((link) => {
    if (link.dataset.view === targetId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (window.location.hash !== `#${targetId}`) {
    history.pushState(null, '', `#${targetId}`);
  }

  appState.currentView = targetId;
}

/**
 * Toggle Mobile Sidebar
 */
function openMobileSidebar() {
  if (dom.sidebar) dom.sidebar.classList.add('open');
  if (dom.sidebarOverlay) dom.sidebarOverlay.classList.add('active');
}

function closeMobileSidebar() {
  if (dom.sidebar) dom.sidebar.classList.remove('open');
  if (dom.sidebarOverlay) dom.sidebarOverlay.classList.remove('active');
}

/**
 * Initialize Light / Dark Theme
 */
function initTheme() {
  const savedTheme = localStorage.getItem('careSaathi_theme') || 'dark';
  setTheme(savedTheme, false);
}

/**
 * Set Application Theme
 * @param {'light'|'dark'} theme
 * @param {boolean} [log=true]
 */
function setTheme(theme, log = true) {
  const selectedTheme = theme === 'dark' ? 'dark' : 'light';
  appState.currentTheme = selectedTheme;
  document.documentElement.setAttribute('data-theme', selectedTheme);
  localStorage.setItem('careSaathi_theme', selectedTheme);

  // Update Topbar Theme Toggle Button Icon & Label
  if (dom.themeToggleBtn && dom.themeToggleIcon) {
    dom.themeToggleIcon.textContent = selectedTheme === 'dark' ? '☀️' : '🌙';
    const label = selectedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    dom.themeToggleBtn.setAttribute('title', label);
    dom.themeToggleBtn.setAttribute('aria-label', label);
  }

  // Update Settings View Status
  if (dom.settingsThemeStatus) {
    dom.settingsThemeStatus.textContent = selectedTheme === 'dark' ? 'Current: Dark Mode (High Contrast)' : 'Current: Light Mode (Default)';
  }

  if (log) {
    logActivity(`Theme changed to ${selectedTheme.toUpperCase()} mode`, 'Just now • Visual Appearance', '🎨');
  }
}

/**
 * Toggle Application Theme
 */
function toggleTheme() {
  const newTheme = appState.currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme, true);
}

/**
 * Initialize Privacy Mode
 */
function initPrivacyMode() {
  const savedPrivacy = localStorage.getItem('careSaathi_privacy');
  // Default to enabled (privacy on) for safety
  const isEnabled = savedPrivacy !== 'disabled';
  setPrivacyMode(isEnabled, false);
}

/**
 * Set Global Privacy Mode
 * @param {boolean} isEnabled
 * @param {boolean} [log=true]
 */
function setPrivacyMode(isEnabled, log = true) {
  appState.privacyMode = isEnabled;
  localStorage.setItem('careSaathi_privacy', isEnabled ? 'enabled' : 'disabled');

  // Update Topbar Button
  if (dom.privacyToggleBtn) {
    dom.privacyToggleBtn.className = `privacy-toggle-btn ${isEnabled ? 'active' : ''}`;
  }
  if (dom.privacyToggleText) {
    dom.privacyToggleText.textContent = isEnabled ? 'Privacy: ON' : 'Privacy: OFF';
  }
  if (dom.privacyToggleIcon) {
    dom.privacyToggleIcon.textContent = isEnabled ? '🛡️' : '👁️';
  }

  // Update Settings Switch
  if (dom.privacyMasterSwitch) {
    dom.privacyMasterSwitch.checked = isEnabled;
  }

  // Apply to all sensitive data elements
  document.querySelectorAll('.sensitive-data').forEach((el) => {
    const valDisplay = el.querySelector('.val-display');
    const maskBtn = el.querySelector('.privacy-mask-btn');
    const maskedVal = el.dataset.maskedValue;
    const fullVal = el.dataset.fullValue;

    if (isEnabled) {
      el.classList.add('masked');
      if (valDisplay && maskedVal) valDisplay.textContent = maskedVal;
      if (maskBtn) maskBtn.textContent = '👁️';
    } else {
      el.classList.remove('masked');
      if (valDisplay && fullVal) valDisplay.textContent = fullVal;
      if (maskBtn) maskBtn.textContent = '🔒';
    }
  });

  if (log) {
    logActivity(
      isEnabled ? 'Privacy Shield activated (Sensitive data masked)' : 'Privacy Shield deactivated (Full data visible)',
      'Just now • Privacy Controls',
      '🛡️'
    );
  }
}

/**
 * Toggle Individual Sensitive Data Item
 * @param {HTMLElement} sensitiveEl
 */
function toggleIndividualSensitiveItem(sensitiveEl) {
  if (!sensitiveEl) return;
  const isMasked = sensitiveEl.classList.contains('masked');
  const valDisplay = sensitiveEl.querySelector('.val-display');
  const maskBtn = sensitiveEl.querySelector('.privacy-mask-btn');
  const maskedVal = sensitiveEl.dataset.maskedValue;
  const fullVal = sensitiveEl.dataset.fullValue;

  if (isMasked) {
    sensitiveEl.classList.remove('masked');
    if (valDisplay && fullVal) valDisplay.textContent = fullVal;
    if (maskBtn) maskBtn.textContent = '🔒';
  } else {
    sensitiveEl.classList.add('masked');
    if (valDisplay && maskedVal) valDisplay.textContent = maskedVal;
    if (maskBtn) maskBtn.textContent = '👁️';
  }
}

/**
 * Perform Backend Health Check
 */
async function pingBackendHealth() {
  const fullUrl = `${CONFIG.API_BASE_URL}${CONFIG.HEALTH_ENDPOINT}`;
  const startTime = performance.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);
    appState.backendLatency = latency;

    if (response.ok) {
      appState.backendStatus = 'online';
      updateBackendStatusUI(true, latency);
    } else {
      appState.backendStatus = 'offline';
      updateBackendStatusUI(false);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    appState.backendStatus = 'offline';
    appState.backendLatency = null;
    updateBackendStatusUI(false);
  }
}

/**
 * Update Health Indicators across the UI
 * @param {boolean} isOnline
 * @param {number} [latency]
 */
function updateBackendStatusUI(isOnline, latency = 0) {
  if (dom.sidebarBackendPill) {
    dom.sidebarBackendPill.className = `backend-pill ${isOnline ? 'online' : 'offline'}`;
  }
  if (dom.sidebarBackendText) {
    dom.sidebarBackendText.textContent = isOnline ? `FastAPI Online (${latency}ms)` : 'FastAPI Offline';
  }

  if (dom.topnavHealthBtn) {
    dom.topnavHealthBtn.className = `topnav-health ${isOnline ? 'online' : 'offline'}`;
  }
  if (dom.topnavHealthText) {
    dom.topnavHealthText.textContent = isOnline ? `API Online (${latency}ms)` : 'API Offline';
  }

  if (dom.dashApiStatusText) {
    dom.dashApiStatusText.textContent = isOnline ? 'Connected & Operational' : 'Unreachable';
    dom.dashApiStatusText.style.color = isOnline ? 'var(--color-success-text)' : 'var(--color-error-text)';
  }
  if (dom.dashApiLatency) {
    dom.dashApiLatency.textContent = isOnline ? `${latency} ms` : 'Timeout';
  }
}

/**
 * Log action into Activity Timelines
 * @param {string} title
 * @param {string} subtitle
 * @param {string} icon
 */
function logActivity(title, subtitle, icon = '🩺') {
  const itemHtml = `
    <li class="activity-widget-item">
      <span class="activity-dot" aria-hidden="true">${icon}</span>
      <div class="activity-widget-content">
        <div class="activity-title">${escapeHTML(title)}</div>
        <div class="activity-time">${escapeHTML(subtitle)}</div>
      </div>
    </li>
  `;

  if (dom.dashboardActivityList) {
    dom.dashboardActivityList.insertAdjacentHTML('afterbegin', itemHtml);
  }
  if (dom.fullActivityTimeline) {
    dom.fullActivityTimeline.insertAdjacentHTML('afterbegin', itemHtml);
  }
}

/**
 * Simple HTML Escaping for Safety
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Update Task Counters
 */
function updateTaskCounter() {
  const uncheckedTasks = document.querySelectorAll('#dashboard-task-list .task-checkbox:not(:checked)').length;
  appState.pendingTasksCount = uncheckedTasks;

  if (dom.taskPendingCount) dom.taskPendingCount.textContent = uncheckedTasks;
  if (dom.chipTasks) dom.chipTasks.textContent = uncheckedTasks;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // 1. Navigation clicks
  dom.navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.dataset.view;
      switchView(targetView);
    });
  });

  // Jump buttons (data-jump="view-name")
  document.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-jump]');
    if (jumpBtn) {
      e.preventDefault();
      const targetView = jumpBtn.dataset.jump;
      switchView(targetView);

      if (jumpBtn.dataset.memberTarget && dom.memberFocusSelect) {
        dom.memberFocusSelect.value = jumpBtn.dataset.memberTarget;
        filterDashboardByMember(jumpBtn.dataset.memberTarget);
      }
    }
  });

  // 2. Mobile Sidebar Toggle
  if (dom.sidebarToggleBtn) dom.sidebarToggleBtn.addEventListener('click', openMobileSidebar);
  if (dom.sidebarCloseBtn) dom.sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
  if (dom.sidebarOverlay) dom.sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // 3. Theme Toggle Actions
  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener('click', toggleTheme);
  }
  if (dom.settingsThemeLightBtn) {
    dom.settingsThemeLightBtn.addEventListener('click', () => setTheme('light'));
  }
  if (dom.settingsThemeDarkBtn) {
    dom.settingsThemeDarkBtn.addEventListener('click', () => setTheme('dark'));
  }

  // 4. Privacy Mode Actions
  if (dom.privacyToggleBtn) {
    dom.privacyToggleBtn.addEventListener('click', () => {
      setPrivacyMode(!appState.privacyMode);
    });
  }
  if (dom.privacyMasterSwitch) {
    dom.privacyMasterSwitch.addEventListener('change', (e) => {
      setPrivacyMode(e.target.checked);
    });
  }

  // Delegated click for individual sensitive field toggle button
  document.addEventListener('click', (e) => {
    const maskBtn = e.target.closest('.privacy-mask-btn');
    if (maskBtn) {
      e.preventDefault();
      e.stopPropagation();
      const sensitiveContainer = maskBtn.closest('.sensitive-data');
      toggleIndividualSensitiveItem(sensitiveContainer);
    }
  });

  // 5. Backend Health Manual Refresh
  if (dom.refreshApiBtn) dom.refreshApiBtn.addEventListener('click', pingBackendHealth);
  if (dom.topnavHealthBtn) {
    dom.topnavHealthBtn.addEventListener('click', () => {
      pingBackendHealth();
      switchView('settings');
    });
  }

  // 6. Quick Notification Bell click jumps to notifications view
  if (dom.quickNotifBtn) {
    dom.quickNotifBtn.addEventListener('click', () => {
      switchView('notifications');
    });
  }

  // 7. Mark All Notifications as Read
  if (dom.markAllReadBtn) {
    dom.markAllReadBtn.addEventListener('click', () => {
      document.querySelectorAll('.notification-item.unread').forEach((item) => {
        item.classList.remove('unread');
      });
      if (dom.unreadSidebarBadge) dom.unreadSidebarBadge.style.display = 'none';
      if (dom.topnavNotifDot) dom.topnavNotifDot.style.display = 'none';
      alert('All notifications marked as read.');
    });
  }

  // 8. Care Tasks Checklist Interaction
  if (dom.taskList) {
    dom.taskList.addEventListener('change', (e) => {
      if (e.target.classList.contains('task-checkbox')) {
        const item = e.target.closest('.task-item');
        const taskTitle = item.querySelector('.task-title').textContent;

        if (e.target.checked) {
          item.classList.add('completed');
          logActivity(`Completed task: ${taskTitle}`, 'Just now • Anil Sharma', '✅');
        } else {
          item.classList.remove('completed');
          logActivity(`Reopened task: ${taskTitle}`, 'Just now • Anil Sharma', '📝');
        }
        updateTaskCounter();
      }
    });
  }

  // 9. Inline Quick Add Task Form
  if (dom.inlineAddTaskForm && dom.newTaskInput) {
    dom.inlineAddTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const taskText = dom.newTaskInput.value.trim();
      if (!taskText) return;

      const newId = `task-${Date.now()}`;
      const taskHtml = `
        <li class="task-item" data-task-id="${newId}">
          <label class="task-label-group">
            <input type="checkbox" class="task-checkbox" data-task-id="${newId}">
            <span class="task-title">${escapeHTML(taskText)}</span>
          </label>
          <span class="task-assignee">Assigned: Anil</span>
        </li>
      `;

      dom.taskList.insertAdjacentHTML('afterbegin', taskHtml);
      dom.newTaskInput.value = '';
      updateTaskCounter();
      logActivity(`Created care task: ${taskText}`, 'Just now • Anil Sharma', '📋');
    });
  }

  // 10. Medication Schedule "Mark Taken" Interaction
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-med-btn')) {
      const btn = e.target;
      const medItem = btn.closest('.med-item');
      const medName = medItem.querySelector('.med-name').textContent;

      if (medItem.classList.contains('taken')) {
        medItem.classList.remove('taken');
        btn.textContent = 'Mark Taken';
        btn.className = 'btn btn-sm btn-primary toggle-med-btn';
        logActivity(`Marked ${medName} as pending`, 'Just now • Medication Center', '💊');
      } else {
        medItem.classList.add('taken');
        btn.textContent = 'Taken ✅';
        btn.className = 'btn btn-sm btn-secondary toggle-med-btn';
        logActivity(`Confirmed dose taken: ${medName}`, 'Just now • Adherence Verified', '💊');
      }
    }
  });

  // 11. Family Member Focus Filter
  if (dom.memberFocusSelect) {
    dom.memberFocusSelect.addEventListener('change', (e) => {
      filterDashboardByMember(e.target.value);
    });
  }

  // 12. Global Search Input
  if (dom.globalSearchInput) {
    dom.globalSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      filterBySearchQuery(query);
    });
  }

  // 13. Role-Based Access Control Identity Switcher
  if (dom.authRoleSelect) {
    dom.authRoleSelect.addEventListener('change', (e) => {
      switchUserSession(e.target.value);
    });
  }

  // 14. Delegated clicks for Caregiver Assign / Revoke Actions
  document.addEventListener('click', (e) => {
    const assignBtn = e.target.closest('.assign-caregiver-btn');
    if (assignBtn) {
      e.preventDefault();
      const profileId = assignBtn.dataset.profileId;
      assignCaregiver(profileId);
      return;
    }

    const revokeBtn = e.target.closest('.revoke-caregiver-btn');
    if (revokeBtn) {
      e.preventDefault();
      const profileId = revokeBtn.dataset.profileId;
      revokeCaregiver(profileId);
      return;
    }
  });

  // 15. Simulate Cross-Family IDOR Penetration Test
  const idorBtn = document.getElementById('simulate-idor-btn');
  if (idorBtn) {
    idorBtn.addEventListener('click', async () => {
      await simulateIdorAttack();
    });
  }

  // 16. AI Assistant Chat Submission & Clear Actions
  if (dom.aiChatForm) {
    dom.aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = dom.aiChatInput ? dom.aiChatInput.value.trim() : '';
      if (query) {
        sendAIMessage(query);
      }
    });
  }

  if (dom.aiClearChatBtn) {
    dom.aiClearChatBtn.addEventListener('click', () => {
      clearAIChat();
    });
  }

  // 17. AI Prompt Suggestions & Quick Action Delegation
  document.addEventListener('click', (e) => {
    const promptBtn = e.target.closest('[data-ai-prompt]');
    if (promptBtn) {
      e.preventDefault();
      const promptText = promptBtn.dataset.aiPrompt;
      switchView('ai-assistant');
      if (promptText) {
        if (dom.aiChatInput) dom.aiChatInput.value = promptText;
        sendAIMessage(promptText);
      }
    }
  });

  // 18. Connected Health Devices Synchronization
  const syncAllBtn = document.getElementById('sync-all-devices-btn');
  if (syncAllBtn) {
    syncAllBtn.addEventListener('click', () => {
      syncAllBtn.disabled = true;
      syncAllBtn.textContent = 'Syncing... ⏳';
      setTimeout(() => {
        document.querySelectorAll('.device-sync-time').forEach((el) => {
          el.textContent = 'Just now';
        });
        syncAllBtn.disabled = false;
        syncAllBtn.textContent = '🔄 Sync All Devices Now';
        logActivity('Synchronized all connected health devices', 'Just now • Health Connect', '📡');
        alert('All connected health devices and wearables synchronized successfully.');
      }, 700);
    });
  }

  document.addEventListener('click', (e) => {
    const singleSync = e.target.closest('.single-sync-btn');
    if (singleSync) {
      e.preventDefault();
      const devName = singleSync.dataset.device || 'Device';
      singleSync.disabled = true;
      singleSync.textContent = '⏳';
      setTimeout(() => {
        const timeEl = singleSync.closest('.device-card')?.querySelector('.device-sync-time');
        if (timeEl) timeEl.textContent = 'Just now';
        singleSync.disabled = false;
        singleSync.textContent = 'Sync Now';
        logActivity(`Synced ${devName}`, 'Just now • Device Sync', '📡');
      }, 500);
    }
  });

  // 19. Doctor Consultation Checklist Modal Trigger
  document.addEventListener('click', (e) => {
    const checklistBtn = e.target.closest('.open-checklist-btn');
    if (checklistBtn) {
      e.preventDefault();
      const drName = checklistBtn.dataset.doctor || 'Attending Physician';
      if (dom.checklistDoctorName) dom.checklistDoctorName.textContent = drName;
      if (dom.consultationChecklistModal) dom.consultationChecklistModal.classList.add('active');
    }
  });

  // 20. External API Integrations Event Handlers
  const refreshIntegBtn = document.getElementById('refresh-integrations-btn');
  if (refreshIntegBtn) {
    refreshIntegBtn.addEventListener('click', () => {
      fetchAPIIntegrationsStatus(true);
    });
  }

  // Google OAuth Login Buttons
  const loginGoogleBtn = document.getElementById('login-google-btn');
  if (loginGoogleBtn) {
    loginGoogleBtn.addEventListener('click', () => initiateGoogleLogin());
  }
  const googleLoginBtn = document.getElementById('google-login-btn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => initiateGoogleLogin());
  }

  // Instant Demo Sign-In Buttons
  document.querySelectorAll('.btn-demo-account').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const demoId = btn.dataset.demoId;
      if (demoId) selectDemoAccount(demoId);
    });
  });

  // Topbar User Profile Dropdown Toggle
  const userProfilePill = document.getElementById('user-profile-pill');
  const userProfileDropdown = document.getElementById('user-profile-dropdown');
  if (userProfilePill && userProfileDropdown) {
    userProfilePill.addEventListener('click', (e) => {
      e.stopPropagation();
      userProfileDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!userProfileDropdown.contains(e.target) && !userProfilePill.contains(e.target)) {
        userProfileDropdown.classList.remove('open');
      }
    });
  }

  // Dropdown Theme Toggle
  const dropdownThemeToggle = document.getElementById('dropdown-theme-toggle');
  if (dropdownThemeToggle) {
    dropdownThemeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }

  // Logout Buttons & Modal Handlers
  const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
  const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
  const settingsLogoutBtn = document.getElementById('settings-logout-btn');
  const confirmLogoutBtn = document.getElementById('confirm-logout-btn');
  const cancelLogoutBtn = document.getElementById('cancel-logout-btn');

  if (dropdownLogoutBtn) {
    dropdownLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (userProfileDropdown) userProfileDropdown.classList.remove('open');
      openLogoutModal();
    });
  }
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openLogoutModal();
    });
  }
  if (settingsLogoutBtn) {
    settingsLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openLogoutModal();
    });
  }
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performLogout();
    });
  }
  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeLogoutModal();
    });
  }

  // Family Invitations Modal & Form
  const topnavInviteBtn = document.getElementById('topnav-invite-btn');
  const openInviteFamilyBtn = document.getElementById('open-invite-family-btn');
  const openInviteModalSubBtn = document.getElementById('open-invite-modal-sub-btn');
  const inviteFamilyModal = document.getElementById('invite-family-modal');
  const inviteFamilyForm = document.getElementById('invite-family-form');
  const btnCopyInviteLink = document.getElementById('btn-copy-invite-link');

  const openInviteDialog = () => {
    if (inviteFamilyModal) {
      inviteFamilyModal.classList.add('active');
      const resBox = document.getElementById('invite-result-box');
      if (resBox) resBox.style.display = 'none';
    }
  };

  if (topnavInviteBtn) topnavInviteBtn.addEventListener('click', openInviteDialog);
  if (openInviteFamilyBtn) openInviteFamilyBtn.addEventListener('click', openInviteDialog);
  if (openInviteModalSubBtn) openInviteModalSubBtn.addEventListener('click', openInviteDialog);

  if (inviteFamilyForm) {
    inviteFamilyForm.addEventListener('submit', (e) => {
      handleCreateInvitation(e);
    });
  }

  if (btnCopyInviteLink) {
    btnCopyInviteLink.addEventListener('click', () => {
      const copyInput = document.getElementById('invite-link-copy-input');
      if (copyInput && copyInput.value) {
        navigator.clipboard.writeText(copyInput.value);
        showNotificationToast('Invitation link copied to clipboard!');
      }
    });
  }

  // Floating AI Quick Panel Controls
  const floatingAiLauncher = document.getElementById('floating-ai-launcher');
  const floatingAiDrawer = document.getElementById('floating-ai-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerExpandBtn = document.getElementById('drawer-expand-btn');
  const drawerChatForm = document.getElementById('drawer-chat-form');

  if (floatingAiLauncher && floatingAiDrawer) {
    floatingAiLauncher.addEventListener('click', () => {
      floatingAiDrawer.classList.toggle('hidden');
      if (!floatingAiDrawer.classList.contains('hidden')) {
        const inp = document.getElementById('drawer-chat-input');
        if (inp) inp.focus();
      }
    });
  }

  if (drawerCloseBtn && floatingAiDrawer) {
    drawerCloseBtn.addEventListener('click', () => {
      floatingAiDrawer.classList.add('hidden');
    });
  }

  if (drawerExpandBtn) {
    drawerExpandBtn.addEventListener('click', () => {
      if (floatingAiDrawer) floatingAiDrawer.classList.add('hidden');
      switchView('ai-assistant');
    });
  }

  if (drawerChatForm) {
    drawerChatForm.addEventListener('submit', (e) => {
      handleDrawerChatSubmit(e);
    });
  }

  // Drawer Prompt Chips
  document.querySelectorAll('.chip-prompt').forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      const inp = document.getElementById('drawer-chat-input');
      if (inp && prompt) {
        inp.value = prompt;
        if (drawerChatForm) drawerChatForm.dispatchEvent(new Event('submit'));
      }
    });
  });

  // Legal Modal Triggers (Privacy Policy & Terms of Service)
  const linkOpenTerms = document.getElementById('link-open-terms');
  const btnSettingsOpenTerms = document.getElementById('btn-settings-open-terms');
  const termsModal = document.getElementById('terms-modal');
  const linkOpenPrivacy = document.getElementById('link-open-privacy');
  const btnSettingsOpenPrivacy = document.getElementById('btn-settings-open-privacy');
  const privacyPolicyModal = document.getElementById('privacy-policy-modal');

  const openTerms = (e) => {
    if (e) e.preventDefault();
    if (termsModal) termsModal.classList.add('active');
  };
  const openPrivacy = (e) => {
    if (e) e.preventDefault();
    if (privacyPolicyModal) privacyPolicyModal.classList.add('active');
  };

  if (linkOpenTerms) linkOpenTerms.addEventListener('click', openTerms);
  if (btnSettingsOpenTerms) btnSettingsOpenTerms.addEventListener('click', openTerms);
  if (linkOpenPrivacy) linkOpenPrivacy.addEventListener('click', openPrivacy);
  if (btnSettingsOpenPrivacy) btnSettingsOpenPrivacy.addEventListener('click', openPrivacy);

  // Health Center Quick Buttons
  const hcAddRxBtn = document.getElementById('hc-add-rx-btn');
  const hcOpenRxModalBtn = document.getElementById('hc-open-rx-modal-btn');
  const addPrescriptionModal = document.getElementById('add-prescription-modal');
  if ((hcAddRxBtn || hcOpenRxModalBtn) && addPrescriptionModal) {
    const openRx = () => addPrescriptionModal.classList.add('active');
    if (hcAddRxBtn) hcAddRxBtn.addEventListener('click', openRx);
    if (hcOpenRxModalBtn) hcOpenRxModalBtn.addEventListener('click', openRx);
  }

  const hcExportBriefBtn = document.getElementById('hc-export-brief-btn');
  const doctorBriefModal = document.getElementById('doctor-brief-modal');
  if (hcExportBriefBtn && doctorBriefModal) {
    hcExportBriefBtn.addEventListener('click', () => doctorBriefModal.classList.add('active'));
  }

  // Health Center Member Filter Tabs
  document.querySelectorAll('.hc-member-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.hc-member-tab').forEach((t) => {
        t.className = 'btn btn-sm btn-secondary hc-member-tab';
      });
      tab.className = 'btn btn-sm btn-primary hc-member-tab active';
      const member = tab.dataset.member;
      filterHealthCenterMember(member);
    });
  });

  const googleLogoutBtn = document.getElementById('google-logout-btn');
  if (googleLogoutBtn) {
    googleLogoutBtn.addEventListener('click', () => {
      logoutGoogleUser();
    });
  }

  // Auth Tabs (Sign In vs Sign Up)
  const authTabLogin = document.getElementById('auth-tab-login');
  const authTabSignup = document.getElementById('auth-tab-signup');
  const emailLoginForm = document.getElementById('email-login-form');
  const emailSignupForm = document.getElementById('email-signup-form');

  if (authTabLogin && authTabSignup && emailLoginForm && emailSignupForm) {
    authTabLogin.addEventListener('click', () => {
      emailLoginForm.style.display = 'block';
      emailSignupForm.style.display = 'none';
      authTabLogin.className = 'auth-tab-btn active';
      authTabSignup.className = 'auth-tab-btn';
    });
    authTabSignup.addEventListener('click', () => {
      emailLoginForm.style.display = 'none';
      emailSignupForm.style.display = 'block';
      authTabLogin.className = 'auth-tab-btn';
      authTabSignup.className = 'auth-tab-btn active';
    });
  }

  if (emailLoginForm) {
    emailLoginForm.addEventListener('submit', (e) => {
      handleEmailLogin(e);
    });
  }

  if (emailSignupForm) {
    emailSignupForm.addEventListener('submit', (e) => {
      handleEmailSignup(e);
    });
  }

  // Delegated Click Handlers for Live Interactive Actions
  document.addEventListener('click', (e) => {
    // Medication status toggle
    const medToggleBtn = e.target.closest('.btn-toggle-med-status');
    if (medToggleBtn) {
      e.preventDefault();
      const medId = medToggleBtn.dataset.medId;
      const targetStatus = medToggleBtn.dataset.status;
      if (medId && targetStatus) {
        markMedicationStatus(medId, targetStatus);
      }
      return;
    }

    // Medication details alert
    const medDetailsBtn = e.target.closest('.btn-med-details');
    if (medDetailsBtn) {
      e.preventDefault();
      const name = medDetailsBtn.dataset.medName || 'Medication';
      const instructions = medDetailsBtn.dataset.instructions || 'Follow physician directions';
      alert(`💊 ${name} Prescription Details:\n\nInstructions: ${instructions}\n\nClinical Disclaimer: CareSaathi records adherence based on user reporting and does not verify physical ingestion.`);
      return;
    }

    // Escort confirmation
    const escortBtn = e.target.closest('.btn-assign-escort');
    if (escortBtn) {
      e.preventDefault();
      const aptId = escortBtn.dataset.aptId;
      if (aptId) {
        confirmAppointmentEscort(aptId);
      }
      return;
    }

    // Google Calendar Sync
    const calSyncBtn = e.target.closest('.btn-sync-cal');
    if (calSyncBtn) {
      e.preventDefault();
      const aptId = calSyncBtn.dataset.aptId;
      if (aptId) {
        syncAppointmentToCalendar(aptId);
      }
      return;
    }

    // Care gap resolution
    const resolveGapBtn = e.target.closest('.btn-resolve-gap');
    if (resolveGapBtn) {
      e.preventDefault();
      const gapId = resolveGapBtn.dataset.gapId;
      if (gapId) {
        resolveCareGap(gapId);
      }
      return;
    }

    // Consultation checklist modal open
    const checklistBtn = e.target.closest('.open-checklist-btn');
    if (checklistBtn) {
      e.preventDefault();
      const doctor = checklistBtn.dataset.doctor || 'Attending Physician';
      const patient = checklistBtn.dataset.patient || 'Family Member';
      const doctorEl = document.getElementById('checklist-doctor-name');
      if (doctorEl) {
        doctorEl.textContent = `${doctor} (Patient: ${patient})`;
      }
      const modal = document.getElementById('consultation-checklist-modal');
      if (modal) modal.classList.add('active');
      return;
    }
  });

  const testEmailBtn = document.getElementById('send-test-email-btn');
  if (testEmailBtn) {
    testEmailBtn.addEventListener('click', () => {
      triggerTestEmail();
    });
  }

  // 21. Modal Handlers
  setupModals();

  // 22. Hash navigation listener
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) switchView(hash);
  });
}

/**
 * Filter Dashboard Items by Member Focus
 */
function filterDashboardByMember(memberId) {
  const cards = document.querySelectorAll('.family-card');
  cards.forEach((card) => {
    if (memberId === 'all' || card.dataset.member === memberId) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

/**
 * Global Real-Time Search Filter
 */
function filterBySearchQuery(query) {
  if (!query) {
    document.querySelectorAll('.family-card, .med-item, .appointment-item').forEach((el) => {
      el.style.display = '';
    });
    return;
  }

  document.querySelectorAll('.family-card, .med-item, .appointment-item').forEach((el) => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(query) ? '' : 'none';
  });
}

/**
 * ============================================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) & FAMILY PROFILES MANAGEMENT
 * ============================================================================
 */

/**
 * Fetch Demo Authentication Tokens from Backend
 */
async function fetchDemoTokens() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/demo-tokens`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    appState.demoTokens = data.demo_tokens || [];

    // Check if an active Google OAuth session was saved in sessionStorage
    const savedGoogleSession = sessionStorage.getItem('caresaathi_google_session');
    if (savedGoogleSession) {
      try {
        const parsed = JSON.parse(savedGoogleSession);
        if (parsed && parsed.token) {
          if (!appState.demoTokens.some((u) => u.user_id === parsed.user_id)) {
            appState.demoTokens.unshift(parsed);
          }
          populateRoleSelector(appState.demoTokens);
          applyUserSession(parsed);
          updateGoogleAuthUI();
          return;
        }
      } catch (e) {
        sessionStorage.removeItem('caresaathi_google_session');
      }
    }

    populateRoleSelector(appState.demoTokens);

    // If an active user was already set (e.g. from handleOAuthRedirectCallback)
    if (appState.currentUser && appState.currentUser.user_id && appState.currentUser.user_id.startsWith('user_google_')) {
      applyUserSession(appState.currentUser);
      updateGoogleAuthUI();
      return;
    }

    // Default to Anil Sharma (Family Owner) on load
    const defaultUser = appState.demoTokens.find((u) => u.user_id === 'user_anil_01') || appState.demoTokens[0];
    if (defaultUser) {
      applyUserSession(defaultUser);
    }
    updateGoogleAuthUI();
  } catch (err) {
    console.error('Failed to load demo tokens from backend:', err);
  }
}

/**
 * Switch Authenticated User Session
 * @param {string} userId
 */
function switchUserSession(userId) {
  const targetUser = appState.demoTokens.find((u) => u.user_id === userId);
  if (!targetUser) {
    console.warn(`User ${userId} not found in available demo tokens.`);
    return;
  }
  applyUserSession(targetUser);
}

/**
 * Apply Authenticated User Session & Update Interface
 * @param {Object} user
 */
function applyUserSession(user) {
  appState.activeUserId = user.user_id;
  appState.activeToken = user.token;
  appState.currentUser = user;

  // Update Topbar Profile Pill
  const initials = user.label.split(' ')[0][0] + (user.label.split(' ')[1] ? user.label.split(' ')[1][0] : '');
  if (dom.currentUserAvatar) dom.currentUserAvatar.textContent = initials;
  if (dom.currentUserName) dom.currentUserName.textContent = user.label.split(' (')[0];
  if (dom.currentUserRoleBadge) {
    const roleLabels = {
      family_owner: 'Family Owner',
      parent_guardian: 'Parent / Guardian',
      caregiver: 'Caregiver',
      adult_member: 'Adult Member',
    };
    dom.currentUserRoleBadge.textContent = roleLabels[user.role] || user.role;
  }

  // Sync role select element if changed programmatically
  if (dom.authRoleSelect && dom.authRoleSelect.value !== user.user_id) {
    dom.authRoleSelect.value = user.user_id;
  }

  // Synchronize AI Assistant Context Panel
  syncAIContextUI();

  logActivity(`Switched session to ${user.label}`, 'Just now • Auth RBAC', '🔑');

  // Trigger backend-enforced profile load
  loadFamilyProfiles();
  loadMedications();
  loadAppointments();
  loadCareContinuityOverview();
}

/**
 * Fetch and Render Family Profiles from Backend
 */
async function loadFamilyProfiles() {
  if (!appState.activeToken) {
    console.warn('Cannot load profiles: No active Bearer token.');
    return;
  }

  const banner = dom.rbacForbiddenBanner || document.getElementById('rbac-forbidden-banner');
  const tableBody = dom.familyTableBody;
  const dashboardCards = dom.dashboardFamilyCardsGrid || document.getElementById('dashboard-family-cards-grid');

  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--color-navy-500);">Fetching family profiles from secure CareSaathi backend...</td></tr>`;
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/family/profiles`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
    });

    if (response.status === 403) {
      appState.familyProfiles = [];
      syncAIContextUI();
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || errData?.detail || 'Access forbidden by backend Role-Based Access Control policy.';

      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `<strong>⛔ Access Denied (HTTP 403 Forbidden):</strong> ${escapeHTML(msg)}`;
      }

      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2.5rem 1rem; color: var(--color-danger-text);">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;" aria-hidden="true">🔒</div>
              <strong style="font-size: 1.05rem;">Access Denied by Backend RBAC</strong>
              <p style="font-size: 0.875rem; color: var(--color-navy-600); margin-top: 0.35rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                ${escapeHTML(msg)}
              </p>
            </td>
          </tr>
        `;
      }

      if (dashboardCards) {
        dashboardCards.innerHTML = `
          <div class="card" style="grid-column: 1 / -1; border-left: 4px solid var(--color-danger-border); background-color: var(--color-danger-bg); padding: 1.5rem;">
            <h4 style="color: var(--color-danger-text); margin-bottom: 0.5rem;">⛔ Family Profiles Restricted (HTTP 403)</h4>
            <p style="color: var(--color-navy-700); font-size: 0.9rem;">${escapeHTML(msg)}</p>
          </div>
        `;
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const profiles = await response.json();
    appState.familyProfiles = profiles;
    syncAIContextUI();

    if (banner) {
      banner.style.display = 'none';
      banner.innerHTML = '';
    }

    renderFamilyTable(profiles);
    renderDashboardFamilyCards(profiles);
  } catch (err) {
    appState.familyProfiles = [];
    syncAIContextUI();
    console.error('Failed to load profiles:', err);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--color-danger-text);">Error communicating with backend: ${escapeHTML(err.message)}</td></tr>`;
    }
  }
}

/**
 * Render Family Members Table with Role Badges, Masked Health Data, and Caregiver Controls
 * @param {Array} profiles
 */
function renderFamilyTable(profiles) {
  if (!dom.familyTableBody) return;

  if (!profiles || profiles.length === 0) {
    dom.familyTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--color-navy-500);">
          No family profiles are accessible under your current role credentials.
        </td>
      </tr>
    `;
    return;
  }

  const currentUserRole = appState.currentUser?.role;
  const canManageCaregivers = currentUserRole === 'family_owner' || currentUserRole === 'parent_guardian';

  const rowsHtml = profiles.map((p) => {
    const ageGroupBadge = `<span class="age-group-badge ${p.age_group}">${escapeHTML(p.age_group.toUpperCase())}</span>`;

    // Privacy masked blood group
    const maskedBlood = appState.privacyMode ? '••' : escapeHTML(p.blood_group || 'N/A');
    const bloodHtml = `
      <span class="sensitive-data ${appState.privacyMode ? 'masked' : ''}" data-masked-value="••" data-full-value="${escapeHTML(p.blood_group || 'N/A')}">
        <span class="val-display">${maskedBlood}</span>
        <button type="button" class="privacy-mask-btn" aria-label="Toggle blood group visibility">${appState.privacyMode ? '👁️' : '🔒'}</button>
      </span>
    `;

    // Privacy masked emergency contact
    const contactRaw = p.emergency_contact || 'None reported';
    const contactMasked = appState.privacyMode ? contactRaw.replace(/\d{5}$/, '•••••') : contactRaw;
    const contactHtml = `
      <span class="sensitive-data ${appState.privacyMode ? 'masked' : ''}" data-masked-value="${escapeHTML(contactMasked)}" data-full-value="${escapeHTML(contactRaw)}">
        <span class="val-display">${escapeHTML(contactMasked)}</span>
        <button type="button" class="privacy-mask-btn" aria-label="Toggle contact visibility">${appState.privacyMode ? '👁️' : '🔒'}</button>
      </span>
    `;

    // Caregiver assignment status & action controls
    const hasNursePriya = (p.assigned_caregiver_ids || []).includes('user_caregiver_priya_03');
    let caregiverHtml = '';
    if (hasNursePriya) {
      caregiverHtml = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-teal-700);">🩺 Nurse Priya</span>
          ${canManageCaregivers ? `<button class="btn btn-sm btn-secondary revoke-caregiver-btn" data-profile-id="${p.profile_id}" title="Revoke Caregiver Access" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">Revoke</button>` : ''}
        </div>
      `;
    } else {
      caregiverHtml = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span style="font-size: 0.8rem; color: var(--color-navy-500);">None assigned</span>
          ${canManageCaregivers ? `<button class="btn btn-sm btn-secondary assign-caregiver-btn" data-profile-id="${p.profile_id}" title="Assign Nurse Priya as Caregiver" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">+ Assign Caregiver</button>` : ''}
        </div>
      `;
    }

    const shortName = p.full_name.split(' ')[0].toLowerCase();

    return `
      <tr data-profile-id="${p.profile_id}">
        <td><strong>${escapeHTML(p.full_name)}</strong></td>
        <td>${escapeHTML(p.relationship)}</td>
        <td>${p.age} yrs ${ageGroupBadge}</td>
        <td>${bloodHtml}</td>
        <td>${caregiverHtml}</td>
        <td>${contactHtml}</td>
        <td>
          <button class="btn btn-sm btn-secondary" data-jump="health-profiles" data-member-target="${escapeHTML(shortName)}">Health Profile</button>
        </td>
      </tr>
    `;
  }).join('');

  dom.familyTableBody.innerHTML = rowsHtml;
}

/**
 * Render Dashboard Overview Cards Dynamically based on Backend Permissions
 * @param {Array} profiles
 */
function renderDashboardFamilyCards(profiles) {
  const container = dom.dashboardFamilyCardsGrid || document.getElementById('dashboard-family-cards-grid');
  if (!container) return;

  if (!profiles || profiles.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-navy-500);">
        No family member profiles available under current permissions.
      </div>
    `;
    return;
  }

  const cardsHtml = profiles.map((p) => {
    const initials = p.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
    const shortName = p.full_name.split(' ')[0].toLowerCase();
    const ageGroupBadge = `<span class="age-group-badge ${p.age_group}">${escapeHTML(p.age_group.toUpperCase())}</span>`;

    let statusNote = p.care_notes || 'All vitals normal';
    let statusClass = p.age >= 65 ? 'due' : 'stable';

    return `
      <article class="family-card" data-member="${escapeHTML(shortName)}">
        <div class="family-card-top">
          <div class="member-avatar" aria-hidden="true">${initials}</div>
          <div class="member-meta">
            <h3 class="member-name">${escapeHTML(p.full_name)}</h3>
            <div class="member-relation-age">${escapeHTML(p.relationship)} • ${p.age} yrs ${ageGroupBadge}</div>
            <span class="status-tag ${statusClass}">Allergies: ${escapeHTML(p.allergies || 'None')}</span>
          </div>
        </div>
        <div class="family-card-metrics">
          <span class="card-vital-label">Care Notes</span>
          <span class="card-vital-value" style="font-size: 0.8rem; font-weight: 500;">${escapeHTML(statusNote)}</span>
        </div>
        <div class="family-card-footer">
          <span style="font-size: 0.725rem; color: var(--color-navy-500);">${(p.assigned_caregiver_ids && p.assigned_caregiver_ids.length > 0) ? '🩺 Caregiver Assigned' : 'Family Care Circle'}</span>
          <button class="btn btn-sm btn-secondary" data-jump="health-profiles" data-member-target="${escapeHTML(shortName)}">View Profile</button>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = cardsHtml;
}

/**
 * Assign Nurse Priya as Caregiver via Backend API
 * @param {string} profileId
 */
async function assignCaregiver(profileId) {
  if (!appState.activeToken) return;

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/family/profiles/${profileId}/assign-caregiver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        caregiver_user_id: 'user_caregiver_priya_03',
      }),
    });

    if (response.status === 403) {
      const err = await response.json().catch(() => ({}));
      alert(`⛔ Permission Denied (HTTP 403): ${err?.error?.message || err?.detail || 'You do not have permission to assign caregivers.'}`);
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed with HTTP ${response.status}`);
    }

    logActivity(`Assigned Nurse Priya to profile ${profileId}`, 'Just now • Access Control', '🔑');
    await loadFamilyProfiles();
    alert('Nurse Priya successfully assigned as caregiver for this profile.');
  } catch (err) {
    console.error('Assign caregiver error:', err);
    alert(`Error: ${err.message}`);
  }
}

/**
 * Revoke Nurse Priya Caregiver Access via Backend API
 * @param {string} profileId
 */
async function revokeCaregiver(profileId) {
  if (!appState.activeToken) return;

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/family/profiles/${profileId}/revoke-caregiver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        caregiver_user_id: 'user_caregiver_priya_03',
      }),
    });

    if (response.status === 403) {
      const err = await response.json().catch(() => ({}));
      alert(`⛔ Permission Denied (HTTP 403): ${err?.error?.message || err?.detail || 'You do not have permission to revoke caregiver access.'}`);
      return;
    }

    if (!response.ok) {
      throw new Error(`Failed with HTTP ${response.status}`);
    }

    logActivity(`Revoked Nurse Priya caregiver access for profile ${profileId}`, 'Just now • Access Control', '🔒');
    await loadFamilyProfiles();
    alert('Caregiver access revoked successfully.');
  } catch (err) {
    console.error('Revoke caregiver error:', err);
    alert(`Error: ${err.message}`);
  }
}

/**
 * Simulate Cross-Family IDOR Penetration Attack to Verify Backend RBAC
 */
async function simulateIdorAttack() {
  const isVerma = appState.activeUserId === 'user_rajesh_99';
  const targetProfileId = isVerma ? 'prof_ramesh_101' : 'prof_kavita_201';
  const targetLabel = isVerma ? 'Ramesh Sharma (Sharma Family)' : 'Kavita Verma (Verma Family)';

  const banner = dom.rbacForbiddenBanner || document.getElementById('rbac-forbidden-banner');

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/family/profiles/${targetProfileId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
    });

    if (response.status === 403) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || errData?.detail || 'Cross-family access forbidden.';
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `<strong>⛔ IDOR Attack Blocked by Backend (HTTP 403 Forbidden):</strong> Target: <code>${targetLabel}</code>. Policy enforcement message: ${escapeHTML(msg)}`;
      }
      logActivity(`Simulated IDOR attempt on ${targetLabel} blocked by backend`, 'Just now • Security Audit', '🛡️');
      alert(`🛡️ IDOR Attack Blocked by Backend RBAC!\n\nTarget: ${targetLabel}\nResponse: HTTP 403 Forbidden\n\nBackend message: "${msg}"`);
    } else if (response.ok) {
      const data = await response.json();
      alert(`Warning: Profile was accessible: ${data.full_name}`);
    } else {
      alert(`Server returned HTTP ${response.status}`);
    }
  } catch (err) {
    alert(`Network request error: ${err.message}`);
  }
}

/**
 * Display a Non-Intrusive Floating Toast Notification
 * @param {string} message
 */
function showToast(message) {
  let toastContainer = document.getElementById('app-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'app-toast-container';
    toastContainer.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; max-width: 440px; pointer-events: none;';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = 'background: var(--color-navy-900); color: white; padding: 0.85rem 1.15rem; border-radius: var(--radius-md); border-left: 4px solid var(--color-teal-400); box-shadow: var(--shadow-lg); font-size: 0.85rem; line-height: 1.4; pointer-events: auto; animation: fadeIn 0.25s ease; transition: opacity 0.3s ease;';
  toast.innerHTML = escapeHTML(message);
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/**
 * Fetch and Render Prescription Medications across Family Care Circle
 */
async function loadMedications() {
  if (!appState.activeToken) return;
  const tbody = document.getElementById('medication-table-body');
  const timeline = document.getElementById('dashboard-med-timeline');

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/medications`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 403) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-danger-text); padding: 1.5rem;">Access restricted by RBAC credentials.</td></tr>`;
        if (timeline) timeline.innerHTML = `<div style="padding: 1rem; color: var(--color-navy-500); text-align: center;">Medication schedule restricted for current role.</div>`;
      }
      return;
    }

    const meds = await res.json();
    if (!Array.isArray(meds)) return;

    // Render Medication Table
    if (tbody) {
      if (meds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-navy-500); padding: 1.5rem;">No scheduled prescriptions for this care circle.</td></tr>`;
      } else {
        tbody.innerHTML = meds.map((m) => {
          const isTaken = m.status_today === 'reported_taken';
          const isSkipped = m.status_today === 'skipped';
          let statusBadge = '<span class="status-tag due">Due Dose</span>';
          if (isTaken) statusBadge = '<span class="status-tag stable">Taken Today ✅</span>';
          else if (isSkipped) statusBadge = '<span class="status-tag scheduled">Skipped</span>';

          const refillAlert = m.refill_days_left <= 8 ? '<span class="status-tag due" style="margin-left: 0.35rem; font-size: 0.72rem;">Low Supply</span>' : '';

          return `
            <tr>
              <td><strong>${escapeHTML(m.name)}</strong> <span style="font-size: 0.85rem; color: var(--color-navy-600);">${escapeHTML(m.dosage)}</span></td>
              <td>${escapeHTML(m.patient_name)}</td>
              <td>${escapeHTML(m.schedule_time)}</td>
              <td>${escapeHTML(m.frequency)}</td>
              <td>${m.refill_days_left} Days ${refillAlert}</td>
              <td>${statusBadge}</td>
              <td>
                <div style="display: flex; gap: 0.35rem;">
                  <button class="btn btn-sm ${isTaken ? 'btn-secondary' : 'btn-primary'} btn-toggle-med-status" data-med-id="${m.medication_id}" data-status="${isTaken ? 'pending' : 'reported_taken'}">
                    ${isTaken ? 'Mark Pending' : 'Mark Taken'}
                  </button>
                  <button class="btn btn-sm btn-secondary btn-med-details" data-med-name="${escapeHTML(m.name)}" data-instructions="${escapeHTML(m.instructions || 'Take as directed')}">Details</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Dashboard Medication Timeline
    if (timeline) {
      if (meds.length === 0) {
        timeline.innerHTML = `<div style="padding: 1rem; color: var(--color-navy-500); text-align: center;">No scheduled medications for today.</div>`;
      } else {
        timeline.innerHTML = meds.map((m) => {
          const isTaken = m.status_today === 'reported_taken';
          return `
            <div class="med-item ${isTaken ? 'taken' : ''}" data-med-id="${m.medication_id}">
              <div class="med-info">
                <span class="med-pill-icon" aria-hidden="true">💊</span>
                <div>
                  <div class="med-name">${escapeHTML(m.name)} ${escapeHTML(m.dosage)}</div>
                  <div class="med-sub">${escapeHTML(m.patient_name)} • ${escapeHTML(m.instructions || m.frequency)}</div>
                </div>
              </div>
              <div class="med-action">
                <span class="time-badge" style="${!isTaken ? 'color: var(--color-warning-text); background-color: var(--color-warning-bg);' : ''}">${escapeHTML(m.schedule_time)} ${!isTaken ? '(Due)' : ''}</span>
                <button class="btn btn-sm ${isTaken ? 'btn-secondary' : 'btn-primary'} btn-toggle-med-status" data-med-id="${m.medication_id}" data-status="${isTaken ? 'pending' : 'reported_taken'}">
                  ${isTaken ? 'Taken ✅' : 'Mark Taken'}
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load medications:', err);
  }
}

/**
 * Record User-Reported Medication Status
 * @param {string} medId
 * @param {string} targetStatus
 */
async function markMedicationStatus(medId, targetStatus) {
  if (!appState.activeToken) return;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/medications/${medId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        status: targetStatus,
        confirmation_notes: `Marked as ${targetStatus} by ${appState.currentUser?.label || 'user'}`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Could not update medication status: ${err?.detail || err?.error?.message || res.statusText}`);
      return;
    }

    const data = await res.json();
    logActivity(`Recorded ${data.name} dose as ${targetStatus}`, 'Just now • Adherence Verified', '💊');
    showToast(`Adherence Logged: ${data.name} marked as ${targetStatus}. (${data.clinical_disclaimer})`);
    await loadMedications();
    await loadCareContinuityOverview();
  } catch (err) {
    console.error('Error marking medication:', err);
  }
}

/**
 * Fetch and Render Family Appointments
 */
async function loadAppointments() {
  if (!appState.activeToken) return;
  const container = document.getElementById('appointments-grid-container');
  const dashList = document.getElementById('dashboard-appointments-list');

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/appointments`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
    });

    if (!res.ok) return;
    const apts = await res.json();
    if (!Array.isArray(apts)) return;

    if (container) {
      if (apts.length === 0) {
        container.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-navy-500);">No appointments scheduled.</div>`;
      } else {
        container.innerHTML = apts.map((apt) => {
          const hasEscort = Boolean(apt.escort_name);
          return `
            <div class="card">
              <div class="card-header">
                <h3>${escapeHTML(apt.specialty)}</h3>
                <span class="status-tag ${apt.status === 'scheduled' ? 'due' : 'stable'}">${escapeHTML(apt.status.toUpperCase())}</span>
              </div>
              <p><strong>Patient:</strong> ${escapeHTML(apt.patient_name)}</p>
              <p><strong>Doctor:</strong> ${escapeHTML(apt.doctor_name)}</p>
              <p><strong>Location:</strong> ${escapeHTML(apt.location)}</p>
              <p><strong>Date &amp; Time:</strong> ${escapeHTML(apt.appointment_date)}</p>
              <div style="margin: 0.75rem 0; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); background: var(--color-surface-alt); font-size: 0.825rem;">
                <strong>Family Escort:</strong>
                ${hasEscort 
                  ? `<span class="status-tag stable" style="margin-left: 0.4rem;">🛡️ ${escapeHTML(apt.escort_name)} (Confirmed)</span>` 
                  : `<span class="status-tag due" style="margin-left: 0.4rem;">⚠️ Unassigned Escort</span> <button class="btn btn-sm btn-outline btn-assign-escort" data-apt-id="${apt.appointment_id}" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; margin-left: 0.5rem;">Confirm Escort</button>`
                }
              </div>
              <div style="margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--color-border); display: flex; flex-wrap: wrap; gap: 0.5rem;">
                <button class="btn btn-sm btn-primary btn-sync-cal" data-apt-id="${apt.appointment_id}">📅 Add to Calendar</button>
                <button class="btn btn-sm btn-secondary open-checklist-btn" data-doctor="${escapeHTML(apt.doctor_name)}" data-patient="${escapeHTML(apt.patient_name)}">Consultation Checklist</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (dashList) {
      if (apts.length === 0) {
        dashList.innerHTML = `<div style="padding: 1rem; color: var(--color-navy-500); text-align: center;">No upcoming appointments.</div>`;
      } else {
        dashList.innerHTML = apts.slice(0, 3).map((apt) => {
          const dateParts = apt.appointment_date.split(' ')[0].split('-');
          const day = dateParts[2] || '16';
          const month = 'Nov';
          return `
            <div class="appointment-item">
              <div class="appointment-date-badge">
                <span class="apt-day">${day}</span>
                <span class="apt-month">${month}</span>
              </div>
              <div class="appointment-details">
                <div class="apt-title">${escapeHTML(apt.specialty)}</div>
                <div class="apt-doctor">${escapeHTML(apt.doctor_name)} • ${escapeHTML(apt.location)}</div>
                <span class="apt-for">Patient: ${escapeHTML(apt.patient_name)} • ${escapeHTML(apt.appointment_date)}</span>
              </div>
              <button class="btn btn-sm btn-secondary open-checklist-btn" data-doctor="${escapeHTML(apt.doctor_name)}" data-patient="${escapeHTML(apt.patient_name)}">Prep Notes</button>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load appointments:', err);
  }
}

/**
 * Confirm Escort for an Appointment
 * @param {string} aptId
 */
async function confirmAppointmentEscort(aptId) {
  if (!appState.activeToken || !appState.currentUser) return;
  const escortName = appState.currentUser.label.split(' (')[0];
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/appointments/${aptId}/confirm-escort`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        escort_user_id: appState.activeUserId,
        escort_name: escortName,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Could not assign escort: ${err?.detail || err?.error?.message || res.statusText}`);
      return;
    }

    const apt = await res.json();
    logActivity(`Confirmed family escort (${escortName}) for ${apt.patient_name}'s appointment`, 'Just now • Appointments', '🛡️');
    showToast(`✅ Escort Confirmed: ${escortName} assigned for ${apt.patient_name}.`);
    await loadAppointments();
    await loadCareContinuityOverview();
  } catch (err) {
    console.error('Error confirming escort:', err);
  }
}

/**
 * Sync Appointment to Google Calendar
 * @param {string} aptId
 */
async function syncAppointmentToCalendar(aptId) {
  if (!appState.activeToken) return;
  try {
    const aptRes = await fetch(`${CONFIG.API_BASE_URL}/api/appointments`, {
      headers: { 'Authorization': `Bearer ${appState.activeToken}` },
    });
    const apts = await aptRes.json();
    const apt = Array.isArray(apts) ? apts.find(a => a.appointment_id === aptId) : null;

    const res = await fetch(`${CONFIG.API_BASE_URL}/api/integrations/calendar/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        appointment_id: aptId,
        event_title: apt ? `${apt.specialty} - ${apt.patient_name}` : 'Family Medical Appointment',
        start_time: apt?.appointment_date || new Date().toISOString(),
        location: apt?.location || 'Apollo Heart Center',
        description: apt?.notes || 'CareSaathi Scheduled Healthcare Consultation',
      }),
    });

    const data = await res.json();
    if (res.ok) {
      showToast(`📅 Calendar Sync: ${data.message || 'Appointment queued for calendar sync.'}`);
      logActivity(`Synced appointment ${aptId} to Google Calendar`, 'Just now • Integrations', '📅');
    } else {
      showToast(`Calendar Sync: ${data?.error?.message || data?.detail || 'Google Calendar connection required. Connect Google Account via Integrations panel.'}`);
    }
  } catch (err) {
    showToast(`Calendar sync error: ${err.message}`);
  }
}

/**
 * Fetch and Render Care Continuity Overview (Active Care Gaps & Shift Handoffs)
 */
async function loadCareContinuityOverview() {
  if (!appState.activeToken) return;
  const gapsContainer = document.getElementById('continuity-gaps-container');
  const handoffsList = document.getElementById('handoff-notes-list');

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/continuity/overview`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
    });

    if (!res.ok) return;
    const overview = await res.json();

    // Render Care Gaps
    if (gapsContainer) {
      const gaps = overview.detected_care_gaps || [];
      if (gaps.length === 0) {
        gapsContainer.innerHTML = `
          <div style="background: var(--color-success-bg); border: 1px solid var(--color-success-border); color: var(--color-success-text); padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem;">
            ✅ <strong>All Care Protocols Up to Date:</strong> Zero active safety risks or unconfirmed tasks detected for senior patient Ramesh Sharma.
          </div>
        `;
      } else {
        gapsContainer.innerHTML = gaps.map((gap) => {
          const isHigh = gap.severity === 'high';
          const borderColor = isHigh ? 'var(--color-error)' : 'var(--color-warning)';
          const badgeClass = isHigh ? 'badge-urgent' : 'badge-routine';

          return `
            <div class="care-gap-item" style="display: flex; justify-content: space-between; align-items: center; background: var(--color-surface); padding: 0.85rem 1rem; border-radius: var(--radius-md); border-left: 4px solid ${borderColor}; box-shadow: var(--shadow-xs); flex-wrap: wrap; gap: 0.75rem;">
              <div style="max-width: 680px;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                  <span class="badge ${badgeClass}" style="font-size: 0.72rem;">${escapeHTML(gap.severity.toUpperCase())}</span>
                  <strong style="color: var(--color-navy-900); font-size: 0.88rem;">${escapeHTML(gap.title)}</strong>
                </div>
                <p style="font-size: 0.8rem; color: var(--color-navy-600); margin: 0.2rem 0;">${escapeHTML(gap.description)}</p>
                <div style="font-size: 0.75rem; color: var(--color-teal-700);">💡 Recommendation: ${escapeHTML(gap.recommended_action)}</div>
              </div>
              <button class="btn btn-sm btn-secondary btn-resolve-gap" data-gap-id="${escapeHTML(gap.alert_id)}" style="font-size: 0.75rem; white-space: nowrap;">
                Resolve Gap &check;
              </button>
            </div>
          `;
        }).join('');
      }
    }

    // Render Handoffs Feed
    if (handoffsList && overview.active_handoffs) {
      if (overview.active_handoffs.length > 0) {
        handoffsList.innerHTML = overview.active_handoffs.map((h) => {
          return `
            <div class="handoff-note-item" style="border-left: 3px solid var(--color-teal-500); padding-left: 1rem; margin-bottom: 0.75rem;">
              <p style="font-size: 0.875rem; color: var(--color-navy-700); line-height: 1.6; margin-bottom: 0.35rem;">
                <strong>${escapeHTML(h.patient_name)} (${escapeHTML(h.shift_type)}):</strong> ${escapeHTML(h.handoff_notes)}
              </p>
              <div style="font-size: 0.775rem; color: var(--color-navy-500);">
                From: ${escapeHTML(h.from_caregiver_name)} &bull; To: ${escapeHTML(h.to_caregiver_name)} &bull; ${escapeHTML(h.status.toUpperCase())}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load care continuity overview:', err);
  }
}

/**
 * Resolve Care Gap via Backend API
 * @param {string} gapId
 */
async function resolveCareGap(gapId) {
  if (!appState.activeToken) return;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/continuity/gaps/${gapId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        resolution_notes: `Resolved by ${appState.currentUser?.label || 'care circle'}`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Could not resolve gap: ${err?.detail || err?.error?.message || res.statusText}`);
      return;
    }

    showToast(`✅ Care gap resolved.`);
    logActivity(`Resolved care gap: ${gapId}`, 'Just now • Care Continuity Engine', '🛡️');
    await loadCareContinuityOverview();
    await loadMedications();
  } catch (err) {
    console.error('Error resolving care gap:', err);
  }
}

/**
 * Setup Modal Triggers & Form Submissions
 */
function setupModals() {
  const openAptModal = () => {
    if (dom.scheduleAptModal) dom.scheduleAptModal.classList.add('active');
  };
  if (dom.openScheduleAptBtn) dom.openScheduleAptBtn.addEventListener('click', openAptModal);
  if (dom.scheduleAptViewBtn) dom.scheduleAptViewBtn.addEventListener('click', openAptModal);

  if (dom.addMemberBtn) {
    dom.addMemberBtn.addEventListener('click', () => {
      const errBanner = document.getElementById('modal-member-error');
      if (errBanner) {
        errBanner.style.display = 'none';
        errBanner.innerHTML = '';
      }
      if (dom.addMemberModal) dom.addMemberModal.classList.add('active');
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.closeModal;
      const modalEl = document.getElementById(modalId);
      if (modalEl) modalEl.classList.remove('active');
    });
  });

  if (dom.scheduleAptForm) {
    dom.scheduleAptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const member = document.getElementById('modal-apt-member')?.value || 'Ramesh Sharma';
      const title = document.getElementById('modal-apt-title')?.value.trim();
      const doctor = document.getElementById('modal-apt-doctor')?.value.trim();
      const dateVal = document.getElementById('modal-apt-date')?.value;

      if (!title || !doctor || !dateVal) {
        alert('Please complete all appointment fields.');
        return;
      }

      const profile = appState.familyProfiles.find(p => p.full_name === member) || appState.familyProfiles[0];
      const profileId = profile ? profile.profile_id : 'prof_ramesh_101';

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/appointments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appState.activeToken}`,
          },
          body: JSON.stringify({
            profile_id: profileId,
            doctor_name: doctor,
            specialty: title,
            appointment_date: dateVal,
            location: 'Apollo Heart Center, Block C',
            notes: `Booked by ${appState.currentUser?.label || 'Family'}`,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to schedule: ${err?.detail || err?.error?.message || res.statusText}`);
          return;
        }

        const apt = await res.json();
        logActivity(`Scheduled appointment: ${title} for ${member} with ${doctor} (${dateVal})`, 'Just now • Care Coordinator', '📅');
        dom.scheduleAptModal.classList.remove('active');
        dom.scheduleAptForm.reset();
        showToast(`✅ Consultation scheduled successfully for ${member} with ${doctor}.`);
        await loadAppointments();
        await loadCareContinuityOverview();
      } catch (err) {
        alert(`Error booking appointment: ${err.message}`);
      }
    });
  }

  // Prescription Modal Handler
  const addRxBtn = document.getElementById('add-prescription-btn');
  const addRxModal = document.getElementById('add-prescription-modal');
  const addRxForm = document.getElementById('add-prescription-form');

  if (addRxBtn && addRxModal) {
    addRxBtn.addEventListener('click', () => {
      addRxModal.classList.add('active');
    });
  }

  if (addRxForm) {
    addRxForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const profileId = document.getElementById('modal-rx-member')?.value || 'prof_ramesh_101';
      const name = document.getElementById('modal-rx-name')?.value.trim();
      const dosage = document.getElementById('modal-rx-dosage')?.value.trim();
      const time = document.getElementById('modal-rx-time')?.value.trim();
      const frequency = document.getElementById('modal-rx-frequency')?.value || 'Once Daily';
      const refill = parseInt(document.getElementById('modal-rx-refill')?.value, 10) || 30;
      const instructions = document.getElementById('modal-rx-instructions')?.value.trim();

      if (!name || !dosage || !time) {
        alert('Please fill out medication name, dosage and timing.');
        return;
      }

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/medications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appState.activeToken}`,
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
          alert(`Failed to schedule prescription: ${err?.detail || err?.error?.message || res.statusText}`);
          return;
        }

        const med = await res.json();
        logActivity(`Scheduled new prescription: ${name} (${dosage}) for ${med.patient_name}`, 'Just now • Prescriptions', '💊');
        addRxModal.classList.remove('active');
        addRxForm.reset();
        showToast(`✅ Prescription ${name} scheduled for ${med.patient_name}.`);
        await loadMedications();
        await loadCareContinuityOverview();
      } catch (err) {
        alert(`Error adding medication: ${err.message}`);
      }
    });
  }

  if (dom.addMemberForm) {
    dom.addMemberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBanner = document.getElementById('modal-member-error');
      if (errorBanner) {
        errorBanner.style.display = 'none';
        errorBanner.innerHTML = '';
      }

      const name = document.getElementById('modal-member-name').value.trim();
      const relation = document.getElementById('modal-member-relation').value.trim();
      const age = parseInt(document.getElementById('modal-member-age').value, 10);
      const blood = document.getElementById('modal-member-blood').value;
      const allergies = (document.getElementById('modal-member-allergies')?.value || '').trim();
      const careNotes = (document.getElementById('modal-member-notes')?.value || '').trim();

      if (!name || !relation || isNaN(age)) {
        if (errorBanner) {
          errorBanner.style.display = 'block';
          errorBanner.textContent = 'Please fill in all required fields.';
        }
        return;
      }

      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/family/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appState.activeToken}`,
          },
          body: JSON.stringify({
            full_name: name,
            relationship: relation,
            age: age,
            blood_group: blood,
            allergies: allergies,
            care_notes: careNotes,
          }),
        });

        if (response.status === 403) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData?.error?.message || errData?.detail || 'You do not have permission to add family profiles.';
          if (errorBanner) {
            errorBanner.style.display = 'block';
            errorBanner.innerHTML = `<strong>⛔ Permission Denied (HTTP 403):</strong> ${escapeHTML(msg)}`;
          } else {
            alert(`⛔ Permission Denied (HTTP 403): ${msg}`);
          }
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData?.error?.message || errData?.detail || `Server returned HTTP ${response.status}`;
          if (errorBanner) {
            errorBanner.style.display = 'block';
            errorBanner.textContent = `Error: ${msg}`;
          }
          return;
        }

        const newProfile = await response.json();
        logActivity(`Created family profile: ${newProfile.full_name} (${newProfile.age_group.toUpperCase()})`, 'Just now • Family Coordinator', '👤');

        if (dom.addMemberModal) dom.addMemberModal.classList.remove('active');
        dom.addMemberForm.reset();
        await loadFamilyProfiles();
        alert(`Family member ${newProfile.full_name} added successfully!`);
      } catch (err) {
        console.error('Error creating profile:', err);
        if (errorBanner) {
          errorBanner.style.display = 'block';
          errorBanner.textContent = `Network error: ${err.message}`;
        }
      }
    });
  }

  // Caregiver Handoff Modal
  if (dom.openAddHandoffBtn) {
    dom.openAddHandoffBtn.addEventListener('click', () => {
      if (dom.addHandoffModal) dom.addHandoffModal.classList.add('active');
    });
  }

  if (dom.addHandoffForm) {
    dom.addHandoffForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const member = document.getElementById('modal-handoff-member')?.value || 'Ramesh Sharma';
      const shift = document.getElementById('modal-handoff-shift')?.value.trim() || 'Caregiver Shift';
      const notes = document.getElementById('modal-handoff-note')?.value.trim();

      if (!notes) {
        alert('Please enter shift handoff notes.');
        return;
      }

      const profile = appState.familyProfiles.find(p => p.full_name.includes(member.split(' ')[0])) || appState.familyProfiles[0];
      const profileId = profile ? profile.profile_id : 'prof_ramesh_101';
      const authorName = appState.currentUser?.label?.split(' (')[0] || 'Caregiver';

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/continuity/handoffs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appState.activeToken}`,
          },
          body: JSON.stringify({
            profile_id: profileId,
            shift_type: shift,
            from_caregiver_name: authorName,
            to_caregiver_name: 'Care Circle',
            priority: 'routine',
            handoff_notes: notes,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to save handoff: ${err?.detail || err?.error?.message || res.statusText}`);
          return;
        }

        const handoff = await res.json();
        logActivity(`Logged caregiver handoff note for ${member}`, 'Just now • Care Continuity', '📋');
        if (dom.addHandoffModal) dom.addHandoffModal.classList.remove('active');
        dom.addHandoffForm.reset();
        showToast(`✅ Caregiver shift handoff saved for ${member}.`);
        await loadCareContinuityOverview();
      } catch (err) {
        alert(`Error saving handoff note: ${err.message}`);
      }
    });
  }

  // Refresh Continuity Gaps
  const refreshContinuityBtn = document.getElementById('refresh-continuity-btn');
  if (refreshContinuityBtn) {
    refreshContinuityBtn.addEventListener('click', async () => {
      await loadCareContinuityOverview();
      showToast('🔄 Care Continuity Engine re-scanned active records.');
    });
  }

  // Family Bulletin Notice Modal
  if (dom.openPostNoticeBtn) {
    dom.openPostNoticeBtn.addEventListener('click', () => {
      if (dom.addNoticeModal) dom.addNoticeModal.classList.add('active');
    });
  }

  if (dom.addNoticeForm) {
    dom.addNoticeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('notice-title').value.trim();
      const category = document.getElementById('notice-category').value;
      const message = document.getElementById('notice-message').value.trim();
      const author = appState.currentUser ? appState.currentUser.label.split(' (')[0] : 'Family Member';

      const itemHtml = `
        <div class="bulletin-item" style="border-left: 4px solid var(--color-teal-500); padding: 1rem; margin-bottom: 0.75rem; background-color: var(--color-card-bg); border-radius: var(--radius-md);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <strong style="color: var(--color-navy-900); font-size: 0.95rem;">📢 ${escapeHTML(title)}</strong>
            <span class="badge badge-routine">${escapeHTML(category.toUpperCase())}</span>
          </div>
          <p style="font-size: 0.875rem; color: var(--color-navy-700); margin-bottom: 0.5rem;">${escapeHTML(message)}</p>
          <span style="font-size: 0.75rem; color: var(--color-navy-500);">Posted by ${escapeHTML(author)} • Just now</span>
        </div>
      `;

      if (dom.familyNoticesFeed) {
        dom.familyNoticesFeed.insertAdjacentHTML('afterbegin', itemHtml);
      }
      if (dom.addNoticeModal) dom.addNoticeModal.classList.remove('active');
      dom.addNoticeForm.reset();
      logActivity(`Posted family notice: "${title}"`, 'Just now • Family Hub', '📌');
      alert('Family notice posted to board!');
    });
  }

  // Doctor Health Summary Brief Modal
  if (dom.printHealthSummaryBtn) {
    dom.printHealthSummaryBtn.addEventListener('click', () => {
      if (dom.doctorBriefModal) dom.doctorBriefModal.classList.add('active');
    });
  }
}

/**
 * ============================================================================
 * AI ASSISTANT CONTROLLER (CareSaathi AI Care Coordinator)
 * ============================================================================
 */

/**
 * Synchronize AI Context UI Badge & Member Count
 */
function syncAIContextUI() {
  if (dom.aiContextUserName) {
    dom.aiContextUserName.textContent = appState.currentUser ? appState.currentUser.label.split(' (')[0] : 'Family Member';
  }
  if (dom.aiContextRoleBadge) {
    const roleLabels = {
      family_owner: 'Family Owner',
      parent_guardian: 'Parent / Guardian',
      caregiver: 'Caregiver',
      adult_member: 'Adult Member',
    };
    dom.aiContextRoleBadge.textContent = appState.currentUser ? (roleLabels[appState.currentUser.role] || appState.currentUser.role) : 'Guest';
  }
  if (dom.aiContextMemberCount) {
    const count = (appState.familyProfiles || []).length;
    dom.aiContextMemberCount.textContent = `${count} ${count === 1 ? 'member' : 'members'}`;
  }
}

/**
 * Format AI Markdown & Lists into Clean Accessible HTML
 * @param {string} text
 * @returns {string}
 */
function formatAIMarkdown(text) {
  if (!text) return '';
  const escaped = escapeHTML(text);

  const lines = escaped.split('\n');
  const processedLines = [];
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      if (inList) { processedLines.push('</ul>'); inList = false; }
      processedLines.push(`<h4 style="margin: 0.75rem 0 0.35rem 0; color: var(--color-teal-700); font-size: 1rem;">${trimmed.replace(/^### /, '')}</h4>`);
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        processedLines.push('<ul style="margin: 0.35rem 0 0.5rem 1.25rem; padding: 0;">');
        inList = true;
      }
      const itemContent = trimmed.replace(/^[-*]\s+/, '');
      const formattedItem = itemContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      processedLines.push(`<li style="margin-bottom: 0.25rem;">${formattedItem}</li>`);
      continue;
    }

    if (inList) {
      processedLines.push('</ul>');
      inList = false;
    }

    if (trimmed === '') {
      processedLines.push('<div style="height: 0.5rem;"></div>');
      continue;
    }

    // Paragraph with bold styling
    const formattedParagraph = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedLines.push(`<p style="margin: 0 0 0.4rem 0;">${formattedParagraph}</p>`);
  }

  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('');
}

/**
 * Clear AI Chat History
 */
function clearAIChat() {
  appState.aiChatHistory = [];
  if (dom.aiChatMessages) {
    dom.aiChatMessages.innerHTML = '';
  }
  if (dom.aiEmptyState) {
    dom.aiEmptyState.style.display = 'block';
  }
  if (dom.aiChatInput) {
    dom.aiChatInput.value = '';
    dom.aiChatInput.focus();
  }
  logActivity('Cleared AI Assistant conversation', 'Just now • AI Assistant', '🧹');
}

/**
 * Append Message Bubble to AI Chat
 * @param {'user'|'assistant'|'system'} role
 * @param {string} contentHtml
 * @param {string} [metaInfo]
 * @param {string} [disclaimer]
 */
function appendChatMessage(role, contentHtml, metaInfo = '', disclaimer = '') {
  if (!dom.aiChatMessages) return;

  if (dom.aiEmptyState) {
    dom.aiEmptyState.style.display = 'none';
  }

  const isUser = role === 'user';
  const roleLabel = isUser
    ? (appState.currentUser ? appState.currentUser.label.split(' (')[0] : 'You')
    : 'CareSaathi Assistant';
  const avatarLetter = isUser ? '👤' : '🤖';

  const msgEl = document.createElement('div');
  msgEl.className = `ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-assistant'}`;

  let disclaimerHtml = '';
  if (disclaimer) {
    disclaimerHtml = `
      <div style="margin-top: 0.75rem; padding: 0.5rem 0.75rem; background-color: var(--color-navy-100); border-left: 3px solid var(--color-teal-500); border-radius: 4px; font-size: 0.75rem; color: var(--color-navy-700);">
        ⚖️ <em>${escapeHTML(disclaimer)}</em>
      </div>
    `;
  }

  let metaHtml = '';
  if (metaInfo) {
    metaHtml = `<div style="font-size: 0.725rem; color: var(--color-navy-500); margin-top: 0.35rem;">${escapeHTML(metaInfo)}</div>`;
  }

  msgEl.innerHTML = `
    <div class="ai-msg-avatar" aria-hidden="true">${avatarLetter}</div>
    <div class="ai-msg-bubble">
      <div class="ai-msg-sender" style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--color-teal-700);">
        ${escapeHTML(roleLabel)}
      </div>
      <div class="ai-msg-text">
        ${contentHtml}
      </div>
      ${disclaimerHtml}
      ${metaHtml}
    </div>
  `;

  dom.aiChatMessages.appendChild(msgEl);
  dom.aiChatMessages.scrollTop = dom.aiChatMessages.scrollHeight;
}

/**
 * Send Message to CareSaathi AI Assistant API
 * @param {string} queryText
 */
async function sendAIMessage(queryText) {
  const text = queryText.trim();
  if (!text || appState.isAIGenerating) return;

  if (!appState.activeToken) {
    alert('Please select an authenticated user session in the top-right before asking the AI Assistant.');
    return;
  }

  // Switch to AI Assistant view if not currently active
  switchView('ai-assistant');

  // Render User Message
  appendChatMessage('user', `<p style="margin: 0;">${escapeHTML(text)}</p>`);
  appState.aiChatHistory.push({ role: 'user', content: text });

  // Clear input
  if (dom.aiChatInput) dom.aiChatInput.value = '';

  // Show Typing Indicator
  if (dom.aiTypingIndicator) dom.aiTypingIndicator.style.display = 'flex';
  if (dom.aiChatSendBtn) dom.aiChatSendBtn.disabled = true;
  appState.isAIGenerating = true;

  if (dom.aiChatMessages) {
    dom.aiChatMessages.scrollTop = dom.aiChatMessages.scrollHeight;
  }

  try {
    const historyPayload = appState.aiChatHistory
      .slice(0, -1)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        message: text,
        conversation_history: historyPayload,
      }),
    });

    if (dom.aiTypingIndicator) dom.aiTypingIndicator.style.display = 'none';

    if (response.status === 401) {
      appendChatMessage(
        'assistant',
        '<p style="color: var(--color-danger-text);">⛔ Authentication required. Your session token has expired or is invalid.</p>',
        'Status: HTTP 401 Unauthorized'
      );
      return;
    }

    if (response.status === 403) {
      const err = await response.json().catch(() => ({}));
      appendChatMessage(
        'assistant',
        `<p style="color: var(--color-danger-text);">⛔ Access Denied: ${escapeHTML(err?.error?.message || err?.detail || 'Unauthorized to access AI service under this role.')}</p>`,
        'Status: HTTP 403 Forbidden'
      );
      return;
    }

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const formattedHtml = formatAIMarkdown(data.response);
    const metaNote = `Provider: ${data.provider || 'CareSaathi AI'} • Authorized profiles: ${data.authorized_member_names?.join(', ') || data.authorized_members_count + ' member(s)'}`;

    appendChatMessage('assistant', formattedHtml, metaNote, data.disclaimer || data.safety_disclaimer);
    appState.aiChatHistory.push({ role: 'assistant', content: data.response });

    logActivity(`AI Query: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`, 'Just now • AI Assistant', '✨');
  } catch (err) {
    if (dom.aiTypingIndicator) dom.aiTypingIndicator.style.display = 'none';
    console.error('AI Chat Error:', err);
    appendChatMessage(
      'assistant',
      `<p style="color: var(--color-danger-text); margin: 0;">⚠️ CareSaathi AI is temporarily unavailable. Please check your internet connection or try again shortly.</p>`,
      `Status: Connection Unavailable`
    );
  } finally {
    appState.isAIGenerating = false;
    if (dom.aiChatSendBtn) dom.aiChatSendBtn.disabled = false;
    if (dom.aiChatInput) dom.aiChatInput.focus();
    if (dom.aiChatMessages) {
      dom.aiChatMessages.scrollTop = dom.aiChatMessages.scrollHeight;
    }
  }
}

/**
 * ============================================================================
 * EXTERNAL API INTEGRATIONS CONTROLLER
 * ============================================================================
 */

/**
 * Fetch and Render Live Status of All 6 External APIs
 * @param {boolean} [showFeedback=false]
 */
async function fetchAPIIntegrationsStatus(showFeedback = false) {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/integrations/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const svcs = data.services || {};

    // 1. Supabase
    const spBadge = document.getElementById('integ-status-supabase');
    const spDesc = document.getElementById('integ-desc-supabase');
    const spCard = document.getElementById('integ-card-supabase');
    if (spBadge && spDesc) {
      if (svcs.supabase?.connected) {
        spBadge.textContent = 'Connected ✅';
        spBadge.className = 'badge badge-routine';
        if (spCard) spCard.style.borderLeftColor = 'var(--color-teal-500)';
      } else if (svcs.supabase?.configured) {
        spBadge.textContent = 'Disconnected ⚠️';
        spBadge.className = 'badge badge-urgent';
        if (spCard) spCard.style.borderLeftColor = 'var(--color-danger-border)';
      } else {
        spBadge.textContent = 'Not Configured ⚠️';
        spBadge.className = 'badge';
        if (spCard) spCard.style.borderLeftColor = 'var(--color-navy-300)';
      }
      spDesc.textContent = svcs.supabase?.message || 'Database status reported';
    }

    // 2. Google OAuth
    const goBadge = document.getElementById('integ-status-google-oauth');
    const goDesc = document.getElementById('integ-desc-google-oauth');
    const goCard = document.getElementById('integ-card-google-oauth');
    if (goBadge && goDesc) {
      if (svcs.google_oauth?.configured) {
        goBadge.textContent = 'Configured ✅';
        goBadge.className = 'badge badge-routine';
        if (goCard) goCard.style.borderLeftColor = 'var(--color-teal-500)';
      } else {
        goBadge.textContent = 'Not Configured ⚠️';
        goBadge.className = 'badge';
        if (goCard) goCard.style.borderLeftColor = 'var(--color-navy-300)';
      }
      goDesc.textContent = svcs.google_oauth?.message || 'OAuth status reported';
    }

    // 3. Google Calendar
    const gcBadge = document.getElementById('integ-status-google-calendar');
    const gcDesc = document.getElementById('integ-desc-google-calendar');
    const gcCard = document.getElementById('integ-card-google-calendar');
    if (gcBadge && gcDesc) {
      if (svcs.google_calendar?.connected) {
        gcBadge.textContent = 'Connected ✅';
        gcBadge.className = 'badge badge-routine';
        if (gcCard) gcCard.style.borderLeftColor = 'var(--color-teal-500)';
      } else if (svcs.google_calendar?.configured) {
        gcBadge.textContent = 'Ready (Awaiting Auth) ⏳';
        gcBadge.className = 'badge badge-routine';
        if (gcCard) gcCard.style.borderLeftColor = 'var(--color-teal-500)';
      } else {
        gcBadge.textContent = 'Not Configured ⚠️';
        gcBadge.className = 'badge';
        if (gcCard) gcCard.style.borderLeftColor = 'var(--color-navy-300)';
      }
      gcDesc.textContent = svcs.google_calendar?.message || 'Calendar status reported';
    }

    // 4. Gemini AI
    const gmBadge = document.getElementById('integ-status-gemini');
    const gmDesc = document.getElementById('integ-desc-gemini');
    const gmCard = document.getElementById('integ-card-gemini');
    if (gmBadge && gmDesc) {
      if (svcs.gemini?.configured && !svcs.gemini?.is_mock) {
        gmBadge.textContent = 'Connected (Gemini 2.5) ✨';
        gmBadge.className = 'badge badge-routine';
        if (gmCard) gmCard.style.borderLeftColor = 'var(--color-teal-500)';
      } else {
        gmBadge.textContent = 'Mock Active (Fallback) 🤖';
        gmBadge.className = 'badge';
        if (gmCard) gmCard.style.borderLeftColor = 'var(--color-navy-400)';
      }
      gmDesc.textContent = svcs.gemini?.message || 'AI model status reported';
    }

    // 5. Resend
    const rsBadge = document.getElementById('integ-status-resend');
    const rsDesc = document.getElementById('integ-desc-resend');
    const rsCard = document.getElementById('integ-card-resend');
    if (rsBadge && rsDesc) {
      if (svcs.resend?.configured) {
        rsBadge.textContent = 'Configured ✅';
        rsBadge.className = 'badge badge-routine';
        if (rsCard) rsCard.style.borderLeftColor = 'var(--color-teal-500)';
      } else {
        rsBadge.textContent = 'Not Configured ⚠️';
        rsBadge.className = 'badge';
        if (rsCard) rsCard.style.borderLeftColor = 'var(--color-navy-300)';
      }
      rsDesc.textContent = svcs.resend?.message || 'Email delivery status reported';
    }

    // 6. Google Health Connect Adapter
    const ghBadge = document.getElementById('integ-status-google-health');
    const ghDesc = document.getElementById('integ-desc-google-health');
    const ghCard = document.getElementById('integ-card-google-health');
    if (ghBadge && ghDesc) {
      ghBadge.textContent = 'Adapter Ready (Awaiting Bridge) ⏳';
      ghBadge.className = 'badge';
      if (ghCard) ghCard.style.borderLeftColor = 'var(--color-teal-700)';
      ghDesc.textContent = svcs.google_health?.message || 'Health Connect adapter active';
    }

    if (showFeedback) {
      alert('Integration statuses refreshed from CareSaathi backend.');
    }
  } catch (err) {
    console.error('Failed to fetch integrations status:', err);
    if (showFeedback) {
      alert(`Could not retrieve integration status: ${err.message}`);
    }
  }
}

/**
 * Initiate Google OAuth 2.0 Login Flow
 */
async function initiateGoogleLogin() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/google/url`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Google OAuth Error: ${err?.detail || 'OAuth service unavailable.'}`);
      return;
    }
    const data = await res.json();
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
  } catch (err) {
    alert(`Failed to start Google sign-in: ${err.message}`);
  }
}

/**
 * Trigger Test Email Notification via Resend API
 */
async function triggerTestEmail() {
  const recipient = prompt(
    'Enter destination email for CareSaathi test alert:',
    appState.currentUser ? appState.currentUser.email : 'test@example.com'
  );
  if (!recipient) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/integrations/test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({
        recipient_email: recipient.trim(),
        notification_type: 'medication',
      }),
    });

    const data = await res.json();
    if (data.success) {
      alert(`✅ Sample Alert Dispatched!\n\nEmail ID: ${data.email_id || 'N/A'}\nRecipient: ${data.recipient}`);
      logActivity(`Dispatched test email to ${recipient}`, 'Just now • Resend Integration', '📧');
    } else {
      alert(`Resend Notification Status:\n\n${data.message || data.error || 'Delivery failed'}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

/**
 * Floating Toast Notification Helper
 */
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
      background-color: var(--color-navy-900);
      color: #FFFFFF;
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius-full);
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
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
  toast.innerHTML = `<span>ℹ️</span> <span>${escapeHTML(msg)}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, durationMs);
}

/**
 * Reveal Application Shell (Authenticated)
 */
function revealAppShell() {
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (appShell) appShell.classList.remove('hidden');
}

/**
 * Show Login Screen (Unauthenticated Gate)
 */
function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (appShell) appShell.classList.add('hidden');
  if (window.location.hash !== '#login') {
    window.location.hash = '#login';
  }
}

/**
 * Open Logout Confirmation Dialog
 */
function openLogoutModal() {
  const modal = document.getElementById('logout-confirm-modal');
  if (modal) modal.classList.add('active');
}

/**
 * Close Logout Confirmation Dialog
 */
function closeLogoutModal() {
  const modal = document.getElementById('logout-confirm-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Perform Secure Logout
 */
async function performLogout() {
  if (appState.activeToken) {
    try {
      await fetch(`${CONFIG.API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appState.activeToken}`,
        },
      });
    } catch (e) {
      console.warn('Backend logout call notification:', e);
    }
  }

  // Clear Session & Local Storage Auth Data
  sessionStorage.removeItem('careSaathi_token');
  sessionStorage.removeItem('careSaathi_user');
  sessionStorage.removeItem('caresaathi_google_session');
  localStorage.removeItem('careSaathi_token');
  localStorage.removeItem('careSaathi_user');

  // Reset State
  appState.activeToken = null;
  appState.currentUser = null;

  // Close modals
  closeLogoutModal();
  document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));

  // Switch to Login Screen
  showLoginScreen();
  showNotificationToast('You have been logged out successfully.');
  logActivity('Logged out of CareSaathi session', 'Just now • Auth', '🚪');
}

/**
 * Select & Activate an Instant Demo Account
 */
function selectDemoAccount(demoId) {
  const demoUsers = {
    user_anil_01: {
      label: 'Anil Sharma (Family Owner)',
      user_id: 'user_anil_01',
      email: 'anil.sharma@example.com',
      role: 'family_owner',
      family_id: 'fam_sharma_101',
      token: 'demo_token_anil_sharma_family_owner_secret_2026',
    },
    user_caregiver_priya_03: {
      label: 'Nurse Priya (Caregiver)',
      user_id: 'user_caregiver_priya_03',
      email: 'priya.nair@example.com',
      role: 'caregiver',
      family_id: 'fam_sharma_101',
      token: 'demo_token_priya_caregiver_secret_2026',
    },
    user_sunita_02: {
      label: 'Sunita Sharma (Parent / Guardian)',
      user_id: 'user_sunita_02',
      email: 'sunita.sharma@example.com',
      role: 'parent_guardian',
      family_id: 'fam_sharma_101',
      token: 'demo_token_sunita_parent_secret_2026',
    },
    user_rajesh_99: {
      label: 'Rajesh Verma (Cross-Family Attacker)',
      user_id: 'user_rajesh_99',
      email: 'rajesh.verma@example.com',
      role: 'family_owner',
      family_id: 'fam_verma_202',
      token: 'demo_token_rajesh_verma_isolated_secret_2026',
    },
  };

  const selected = demoUsers[demoId] || demoUsers['user_anil_01'];

  // Persist session
  sessionStorage.setItem('careSaathi_token', selected.token);
  sessionStorage.setItem('careSaathi_user', JSON.stringify(selected));

  applyUserSession(selected);
  revealAppShell();
  switchView('dashboard');
  showNotificationToast(`Signed in as ${selected.label.split(' (')[0]}`);
  logActivity(`Demo login as ${selected.label}`, 'Just now • Demo Auth', '🔑');
  loadFamilyInvitations();
}

/**
 * Handle Family Circle Invitation Creation
 */
async function handleCreateInvitation(e) {
  if (e) e.preventDefault();
  const emailInp = document.getElementById('invite-email');
  const roleInp = document.getElementById('invite-role');
  const relInp = document.getElementById('invite-relationship');
  const resBox = document.getElementById('invite-result-box');
  const resMsg = document.getElementById('invite-result-msg');
  const linkInp = document.getElementById('invite-link-copy-input');

  if (!emailInp || !emailInp.value) return;

  const payload = {
    invitee_email: emailInp.value.trim(),
    role: roleInp ? roleInp.value : 'adult_member',
    relationship: relInp ? relInp.value.trim() : 'Family Member',
  };

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/family/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(`Invitation error: ${data?.detail || data?.error?.message || 'Permission denied'}`);
      return;
    }

    if (resBox && resMsg && linkInp) {
      resBox.style.display = 'block';
      resMsg.textContent = `Invitation token generated for ${data.invitee_email} (${data.role}). Status: ${data.status}.`;
      linkInp.value = data.invitation_link || `${window.location.origin}/#invitation?token=${data.token}`;
    }

    showNotificationToast(`Invitation created for ${data.invitee_email}!`);
    logActivity(`Created family invitation for ${data.invitee_email}`, 'Just now • Invitations', '✉️');
    loadFamilyInvitations();
  } catch (err) {
    alert(`Failed to create invitation: ${err.message}`);
  }
}

/**
 * Load Active Family Circle Invitations
 */
async function loadFamilyInvitations() {
  const tbody = document.getElementById('pending-invitations-table-body');
  if (!tbody || !appState.activeToken) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/family/invitations`, {
      headers: {
        'Authorization': `Bearer ${appState.activeToken}`,
      },
    });

    if (!res.ok) return;
    const invitations = await res.json();
    if (!Array.isArray(invitations) || invitations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-navy-500); padding: 1.5rem;">No pending invitations. Click "+ New Invitation" above to invite family members.</td></tr>`;
      return;
    }

    tbody.innerHTML = invitations
      .map(
        (inv) => `
        <tr>
          <td><strong>${escapeHTML(inv.invitee_email)}</strong></td>
          <td>${escapeHTML(inv.role.replace('_', ' '))}</td>
          <td>${escapeHTML(inv.relationship || 'Family Member')}</td>
          <td><span class="invitation-badge ${inv.status}">${inv.status === 'pending' ? '⏳ Pending' : inv.status}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText('${inv.invitation_link}'); showNotificationToast('Invitation link copied!');">Copy Link</button>
            <button class="btn btn-sm btn-outline" style="color: var(--color-error); margin-left: 0.25rem;" onclick="cancelFamilyInvitation('${inv.invitation_id}')">Cancel</button>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    console.warn('Could not load family invitations:', err);
  }
}

/**
 * Cancel an Invitation
 */
async function cancelFamilyInvitation(invitationId) {
  if (!confirm('Are you sure you want to cancel this pending invitation?')) return;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/family/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${appState.activeToken}`,
      },
    });
    if (res.ok) {
      showNotificationToast('Invitation cancelled.');
      loadFamilyInvitations();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Could not cancel invitation: ${err?.detail || 'Permission denied'}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

/**
 * Handle Floating AI Drawer Chat Submission
 */
async function handleDrawerChatSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('drawer-chat-input');
  const messagesContainer = document.getElementById('drawer-chat-messages');
  if (!input || !messagesContainer) return;

  const userQuery = input.value.trim();
  if (!userQuery) return;

  // Append user message
  const userHtml = `
    <div class="ai-msg user" style="align-self: flex-end; background: var(--color-teal-600); color: white; padding: 0.6rem 0.85rem; border-radius: var(--radius-md); max-width: 85%; font-size: 0.85rem; margin-bottom: 0.5rem;">
      ${escapeHTML(userQuery)}
    </div>
  `;
  messagesContainer.insertAdjacentHTML('beforeend', userHtml);
  input.value = '';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Append thinking bubble
  const typingId = `drawer-typing-${Date.now()}`;
  const typingHtml = `
    <div class="ai-msg bot" id="${typingId}" style="align-self: flex-start; background: var(--color-surface); border: 1px solid var(--color-border); padding: 0.6rem 0.85rem; border-radius: var(--radius-md); max-width: 85%; font-size: 0.85rem; margin-bottom: 0.5rem;">
      <span style="display: inline-flex; align-items: center; gap: 0.4rem; color: var(--color-teal-700);">
        <span>✨</span> <em>CareSaathi AI is thinking...</em>
      </span>
    </div>
  `;
  messagesContainer.insertAdjacentHTML('beforeend', typingHtml);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.activeToken}`,
      },
      body: JSON.stringify({ message: userQuery }),
    });

    const data = await res.json();
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    const responseText = data.response || 'I am ready to assist with your family health schedules.';
    const botHtml = `
      <div class="ai-msg bot" style="align-self: flex-start; background: var(--color-surface); border: 1px solid var(--color-border); padding: 0.65rem 0.85rem; border-radius: var(--radius-md); max-width: 88%; font-size: 0.85rem; line-height: 1.5; margin-bottom: 0.5rem;">
        <div style="font-weight: 700; color: var(--color-teal-700); font-size: 0.75rem; margin-bottom: 0.25rem;">✨ CareSaathi AI</div>
        <div>${escapeHTML(responseText)}</div>
        <div style="font-size: 0.7rem; color: var(--color-navy-500); margin-top: 0.35rem; border-top: 1px solid var(--color-border); padding-top: 0.25rem;">
          <em>${escapeHTML(data.disclaimer || 'Informational only')}</em>
        </div>
      </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', botHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Synchronize to full AI assistant view if open
    if (dom.aiChatMessages) {
      if (dom.aiEmptyState) dom.aiEmptyState.style.display = 'none';
      dom.aiChatMessages.insertAdjacentHTML(
        'beforeend',
        `
        <div class="chat-message user">
          <div class="message-content"><p>${escapeHTML(userQuery)}</p></div>
        </div>
        <div class="chat-message bot">
          <div class="message-content">
            <p>${escapeHTML(responseText)}</p>
            <div class="ai-safety-disclaimer">ℹ️ ${escapeHTML(data.disclaimer || 'Informational only')}</div>
          </div>
        </div>
      `
      );
      dom.aiChatMessages.scrollTop = dom.aiChatMessages.scrollHeight;
    }
  } catch (err) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    messagesContainer.insertAdjacentHTML(
      'beforeend',
      `<div class="ai-msg bot" style="color: var(--color-error); font-size: 0.8rem; background: var(--color-surface); border: 1px solid var(--color-border); padding: 0.5rem 0.75rem; border-radius: var(--radius-md);">CareSaathi AI is temporarily unreachable. Please check your connection and try again.</div>`
    );
  }
}

/**
 * Filter Member in Health Center Spotlight
 */
function filterHealthCenterMember(memberKey) {
  const memberData = {
    ramesh: {
      name: 'Ramesh Sharma',
      age: '74 yrs',
      bp: '128/82 mmHg',
      glucose: '114 mg/dL',
      note: 'Ramesh is adhering consistently to his morning Amlodipine regimen. Doctor Mehta has scheduled an echocardiogram review for tomorrow morning at Apollo Heart Center.',
    },
    sunita: {
      name: 'Sunita Sharma',
      age: '48 yrs',
      bp: '118/76 mmHg',
      glucose: '98 mg/dL',
      note: 'Morning Levothyroxine taken on empty stomach. Thyroid panel check scheduled for next month.',
    },
    anil: {
      name: 'Anil Sharma',
      age: '50 yrs',
      bp: '122/80 mmHg',
      glucose: '102 mg/dL',
      note: 'Executive wellness profile up to date. Acting as primary care coordinator and escort for Ramesh.',
    },
    ananya: {
      name: 'Ananya Sharma',
      age: '17 yrs',
      bp: '110/70 mmHg',
      glucose: '92 mg/dL',
      note: 'Annual vision exam scheduled with Dr. Radhika Iyer. Immunizations fully up to date.',
    },
  };

  const d = memberData[memberKey] || memberData['ramesh'];
  const bpEl = document.getElementById('hc-bp-val');
  const glEl = document.getElementById('hc-glucose-val');
  const noteEl = document.getElementById('hc-care-note');

  if (bpEl) bpEl.innerHTML = `${d.bp} <span style="font-size: 0.75rem; color: var(--color-success-text);">(Stable)</span>`;
  if (glEl) glEl.innerHTML = `${d.glucose} <span style="font-size: 0.75rem; color: var(--color-navy-500);">(Normal)</span>`;
  if (noteEl) noteEl.textContent = d.note;
}

/**
 * Handle Google OAuth Redirect Return Parameters
 */
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
        label: `${fullName} (Google)`,
        user_id: userId,
        email: email,
        role: role,
        family_id: 'fam_sharma_101',
        token: token,
      };

      // Persist session in sessionStorage and localStorage
      sessionStorage.setItem('careSaathi_token', token);
      sessionStorage.setItem('careSaathi_user', JSON.stringify(googleUser));
      sessionStorage.setItem('caresaathi_google_session', JSON.stringify(googleUser));

      applyUserSession(googleUser);
      revealAppShell();

      // Clean the URL to #dashboard
      window.history.replaceState(null, '', window.location.pathname + '#dashboard');
      switchView('dashboard');
      showNotificationToast(`🎉 Welcome to CareSaathi, ${fullName}!`);
      logActivity(`Authenticated via Google OAuth (${email})`, 'Just now • Google Identity', '🌐');
      return true;
    }
  } else if (oauthError) {
    const errorDescriptions = {
      access_denied: 'Google OAuth Access Denied: Google Cloud is currently in Testing Mode. If you are an evaluator, your email address needs to be added to Test Users in Google Cloud Console, or you can use instant demo sign-in.',
      invalid_csrf_state: 'Security verification failed (invalid CSRF state). Please try again.',
      missing_code: 'Google did not return an authorization code.',
      token_exchange_failed: 'Failed to exchange authorization code with Google OAuth servers.',
      no_email_returned: 'Your Google profile did not share an email address.',
    };
    const desc = errorDescriptions[oauthError] || oauthError;
    alert(`Google Authentication: ${desc}`);
    window.history.replaceState(null, '', window.location.pathname + '#login');
    showLoginScreen();
    return false;
  }
  return false;
}

/**
 * Handle Direct Email & Password Sign In
 */
async function handleEmailLogin(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

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
    showNotificationToast(`Signed in as ${data.user.full_name}!`);
    logActivity(`Signed in with email (${data.user.email})`, 'Just now • Auth', '🔑');
  } catch (err) {
    alert(`Login error: ${err.message}`);
  }
}

/**
 * Handle Direct Email & Password Registration
 */
async function handleEmailSignup(e) {
  if (e) e.preventDefault();
  const fullNameInp = document.getElementById('signup-fullname');
  const emailInp = document.getElementById('signup-email');
  const passwordInp = document.getElementById('signup-password');
  const familyInp = document.getElementById('signup-family');

  if (!fullNameInp || !emailInp || !passwordInp) return;

  const payload = {
    full_name: fullNameInp.value.trim(),
    email: emailInp.value.trim(),
    password: passwordInp.value,
    family_name: familyInp ? familyInp.value.trim() : 'Family Care Circle',
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
    showNotificationToast(`Welcome to CareSaathi, ${data.user.full_name}!`);
    logActivity(`Registered new family account (${data.user.email})`, 'Just now • Auth', '🎉');
  } catch (err) {
    alert(`Registration error: ${err.message}`);
  }
}

/**
 * Initialize Application (Strict Login-First Flow)
 */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();

  // Initialize Light/Dark Theme & Privacy Masking
  initTheme();
  initPrivacyMode();

  // Check for Google OAuth callback parameters
  const handledOAuth = handleOAuthRedirectCallback();

  // Enforce Login-First Flow: Verify Session Token
  const savedToken = sessionStorage.getItem('careSaathi_token') || localStorage.getItem('careSaathi_token');
  const savedUserJson = sessionStorage.getItem('careSaathi_user') || localStorage.getItem('careSaathi_user');

  if (savedToken && savedUserJson) {
    try {
      const user = JSON.parse(savedUserJson);
      user.token = savedToken;
      applyUserSession(user);
      revealAppShell();

      // Route to initial view based on URL hash
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

  // Navigation Guard: Prevent unauthenticated users from seeing views via back button
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

  // Load supporting background states
  fetchDemoTokens();
  fetchAPIIntegrationsStatus();
  loadFamilyInvitations();
  pingBackendHealth();
  setInterval(pingBackendHealth, CONFIG.POLL_INTERVAL_MS);
});
