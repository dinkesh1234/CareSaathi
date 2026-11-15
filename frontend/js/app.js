/**
 * CareSaathi - Family Health & Care Coordination Platform
 * Single Page Application (SPA) Controller & Dashboard Manager
 */

// Configuration
const CONFIG = {
  API_BASE_URL: 'http://127.0.0.1:8000',
  HEALTH_ENDPOINT: '/api/health',
  POLL_INTERVAL_MS: 30000,
  TIMEOUT_MS: 5000,
};

// Application State
const appState = {
  currentView: 'dashboard',
  currentTheme: 'light', // 'light' | 'dark'
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
  const savedTheme = localStorage.getItem('careSaathi_theme') || 'light';
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

  const googleLoginBtn = document.getElementById('google-login-btn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      initiateGoogleLogin();
    });
  }

  const googleLogoutBtn = document.getElementById('google-logout-btn');
  if (googleLogoutBtn) {
    googleLogoutBtn.addEventListener('click', () => {
      logoutGoogleUser();
    });
  }

  const emailLoginForm = document.getElementById('email-login-form');
  if (emailLoginForm) {
    emailLoginForm.addEventListener('submit', (e) => {
      handleEmailLogin(e);
    });
  }

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
    dom.scheduleAptForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const member = document.getElementById('modal-apt-member').value;
      const title = document.getElementById('modal-apt-title').value;
      const doctor = document.getElementById('modal-apt-doctor').value;
      const dateVal = document.getElementById('modal-apt-date').value;

      logActivity(`Scheduled appointment: ${title} for ${member} with ${doctor} (${dateVal})`, 'Just now • Care Coordinator', '📅');
      dom.scheduleAptModal.classList.remove('active');
      dom.scheduleAptForm.reset();
      alert(`Appointment scheduled successfully for ${member}!`);
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
    dom.addHandoffForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const caregiver = document.getElementById('handoff-caregiver-name').value;
      const shift = document.getElementById('handoff-shift-type').value;
      const member = document.getElementById('handoff-member-target').value;
      const priority = document.getElementById('handoff-priority').value;
      const notes = document.getElementById('handoff-notes').value.trim();

      const cardHtml = `
        <div class="handoff-card" style="border-left: 4px solid var(--color-${priority === 'high' ? 'danger' : 'teal'}-border); margin-bottom: 0.75rem;">
          <div class="handoff-header">
            <div>
              <span class="handoff-author">👩‍⚕️ ${escapeHTML(caregiver)}</span>
              <span class="badge ${priority === 'high' ? 'badge-urgent' : 'badge-routine'}">${priority.toUpperCase()}</span>
            </div>
            <span class="handoff-time">Just now • ${escapeHTML(shift)}</span>
          </div>
          <p class="handoff-body"><strong>Patient: ${escapeHTML(member)}:</strong> ${escapeHTML(notes)}</p>
        </div>
      `;

      if (dom.handoffNotesList) {
        dom.handoffNotesList.insertAdjacentHTML('afterbegin', cardHtml);
      }
      if (dom.addHandoffModal) dom.addHandoffModal.classList.remove('active');
      dom.addHandoffForm.reset();
      logActivity(`Logged caregiver handoff note for ${member}`, 'Just now • Care Continuity', '📋');
      alert('Caregiver shift handoff note saved successfully.');
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
    const metaNote = `Model: ${data.model} (Verified mock) • Authorized profiles consulted: ${data.authorized_profiles_consulted?.join(', ') || 'None'}`;

    appendChatMessage('assistant', formattedHtml, metaNote, data.safety_disclaimer);
    appState.aiChatHistory.push({ role: 'assistant', content: data.response });

    logActivity(`AI Query: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`, 'Just now • AI Assistant', '✨');
  } catch (err) {
    if (dom.aiTypingIndicator) dom.aiTypingIndicator.style.display = 'none';
    console.error('AI Chat Error:', err);
    appendChatMessage(
      'assistant',
      `<p style="color: var(--color-danger-text);">⚠️ Unable to connect to CareSaathi AI service. Please verify that the backend is running at <code>${CONFIG.API_BASE_URL}</code>.</p>`,
      `Error: ${err.message}`
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
 * Handle Google OAuth Redirect Return Parameters
 */
function handleOAuthRedirectCallback() {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  // Also check hash query params if any
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
    const role = searchParams.get('role') || hashParams.get('role') || 'adult_member';

    if (token) {
      const googleUser = {
        label: `${fullName} (Google: ${role.replace('_', ' ')})`,
        user_id: userId,
        email: email,
        role: role,
        family_id: 'fam_sharma_101',
        token: token,
      };

      // Add to demoTokens array so role-selector includes the user
      const existingIdx = appState.demoTokens.findIndex((u) => u.user_id === userId);
      if (existingIdx >= 0) {
        appState.demoTokens[existingIdx] = googleUser;
      } else {
        appState.demoTokens.unshift(googleUser);
      }
      populateRoleSelector(appState.demoTokens);

      // Apply User Session
      applyUserSession(googleUser);

      // Persist Google Session in sessionStorage
      sessionStorage.setItem('caresaathi_google_session', JSON.stringify(googleUser));

      logActivity(`Authenticated via Google OAuth (${email})`, 'Just now • Google Identity', '🌐');
      alert(`🎉 Google OAuth Successful!\n\nWelcome, ${fullName}!\nLinked Account: ${email}\nCareSaathi session activated with role: ${role}.`);

      // Clean the URL without reloading
      window.history.replaceState(null, '', window.location.pathname + '#settings');
      updateGoogleAuthUI();
      fetchAPIIntegrationsStatus();
    }
  } else if (oauthError) {
    const errorDescriptions = {
      access_denied: 'You cancelled the Google sign-in consent request.',
      invalid_csrf_state: 'Security verification failed (invalid CSRF state). Please try again.',
      missing_code: 'Google did not return an authorization code.',
      token_exchange_failed: 'Failed to exchange authorization code with Google OAuth servers.',
      no_email_returned: 'Your Google profile did not share an email address.',
    };
    const desc = errorDescriptions[oauthError] || oauthError;
    alert(`Google Authentication Notice: ${desc}`);
    window.history.replaceState(null, '', window.location.pathname + '#settings');
  }
}

/**
 * Update Google OAuth UI Card and Profile Buttons
 */
function updateGoogleAuthUI() {
  const loginBtn = document.getElementById('google-login-btn');
  const logoutBtn = document.getElementById('google-logout-btn');
  const statusBadge = document.getElementById('integ-status-google-oauth');
  const descText = document.getElementById('integ-desc-google-oauth');

  const isGoogleUser = appState.currentUser && (
    (appState.currentUser.user_id && appState.currentUser.user_id.startsWith('user_google_')) ||
    (appState.currentUser.label && appState.currentUser.label.includes('Google:')) ||
    (sessionStorage.getItem('caresaathi_google_session') !== null)
  );

  if (isGoogleUser && logoutBtn) {
    logoutBtn.style.display = 'inline-flex';
    if (loginBtn) {
      loginBtn.innerHTML = `<span>🔄 Switch Google Account</span>`;
    }
    if (statusBadge) {
      statusBadge.textContent = 'Signed In ✅';
      statusBadge.className = 'badge badge-routine';
    }
    if (descText && appState.currentUser && appState.currentUser.email) {
      descText.textContent = `Signed in as ${appState.currentUser.email}. Linked to Sharma Family Care Circle.`;
    }
  } else {
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (loginBtn) {
      loginBtn.innerHTML = `<span>🌐 Sign in with Google</span>`;
    }
  }
}

/**
 * Sign out of Google Session
 */
async function logoutGoogleUser() {
  if (appState.activeToken) {
    try {
      await fetch(`${CONFIG.API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${appState.activeToken}`,
        },
      });
    } catch (e) {
      console.warn('Backend logout call failed:', e);
    }
  }
  sessionStorage.removeItem('caresaathi_google_session');

  // Remove google user from demoTokens
  appState.demoTokens = appState.demoTokens.filter((u) => !u.user_id.startsWith('user_google_'));
  populateRoleSelector(appState.demoTokens);

  // Switch to default Anil Sharma
  const defaultUser = appState.demoTokens.find((u) => u.user_id === 'user_anil_01') || appState.demoTokens[0];
  if (defaultUser) {
    applyUserSession(defaultUser);
  }
  updateGoogleAuthUI();
  alert('You have been signed out of your Google session. Reverted to Anil Sharma (Family Owner).');
  logActivity('Signed out of Google session', 'Just now • Auth', '🔒');
  fetchAPIIntegrationsStatus();
}

/**
 * Handle Direct Email & Password Sign In
 * @param {Event} e
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

    // Update demo tokens dropdown if not present
    const existingIdx = appState.demoTokens.findIndex((u) => u.user_id === authUser.user_id);
    if (existingIdx >= 0) {
      appState.demoTokens[existingIdx] = authUser;
    } else {
      appState.demoTokens.unshift(authUser);
    }
    populateRoleSelector(appState.demoTokens);

    applyUserSession(authUser);
    alert(`🎉 Signed in successfully as ${data.user.full_name} (${data.user.email})!`);
    logActivity(`Signed in with email (${data.user.email})`, 'Just now • Auth', '🔑');
  } catch (err) {
    alert(`Login error: ${err.message}`);
  }
}

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();

  // Initialize Light/Dark Theme & Privacy Masking
  initTheme();
  initPrivacyMode();

  // Check for Google OAuth callback parameters
  handleOAuthRedirectCallback();

  // Load Demo Authentication Tokens and Family Profiles
  fetchDemoTokens();

  // Fetch Live Status of External API Integrations
  fetchAPIIntegrationsStatus();

  // Route to initial view based on URL hash
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && document.getElementById(`view-${initialHash}`)) {
    switchView(initialHash);
  } else {
    switchView('dashboard');
  }

  // Initial backend health check and periodic polling
  pingBackendHealth();
  setInterval(pingBackendHealth, CONFIG.POLL_INTERVAL_MS);
});
