function getProxyPhotoUrl(url) {
  if (!url) return '';
  if (url.startsWith('/api/') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return '/api/photo-proxy?url=' + encodeURIComponent(url);
}

/**
 * MICRO BANKING REG V/JAK 3 BIRTHDAY TRACKER - APP LOGIC
 * Clean Corporate Bank Mandiri Aesthetic
 * Real Google Sheets Live Data Integration (488+ Employees)
 * Automated WhatsApp Alerts, Draggable Timeline, Cards & Twibbon Maker
 */

const state = {
  employees: [],
  config: {
    sheetUrl: 'https://docs.google.com/spreadsheets/d/15TjmyZchHyxWYbwwCpWn_ID9WC9Jzei7niitac6r8ho/edit?usp=sharing',
    alertRecipients: [
      { name: "Yodha", phone: "+62 85779132226", active: true },
      { name: "Yodha 2", phone: "+62 878-9610-8664", active: true }
    ],
    h0AlertHour: 7,
    h0AlertMinute: 0,
    h1AlertHour: 17,
    h1AlertMinute: 0
  },
  activeView: 'timeline',
  selectedRole: 'ALL',
  searchQuery: '',
  timelineScope: 'window', // 'window' (±60 days) or 'all' (all 365 days)
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  waStatus: {
    connectionStatus: 'disconnected',
    qrCodeData: null,
    connectedUser: null
  },
  selectedGreetingEmployee: null,
  selectedGreetingTemplateIdx: 0,
  cardModal: {
    employee: null,
    format: 'vertical',
    customPhoto: null,
    customMessage: ''
  },
  twibbonModal: {
    employee: null,
    frameSource: 'default',
    customFrameImg: null,
    customPhotoImg: null,
    x: 0,
    y: 0,
    scale: 1.0,
    rotation: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
  }
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function parseBirthday(dateStr) {
  if (!dateStr) return { day: 1, month: 1 };
  let parts = [];
  if (dateStr.includes('/')) parts = dateStr.split('/');
  else if (dateStr.includes('-')) parts = dateStr.split('-');
  
  const day = parseInt(parts[0]) || 1;
  const month = parseInt(parts[1]) || 1;
  return { day, month };
}

function getDayOffset(day, month) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const today = new Date(currentYear, now.getMonth(), now.getDate());

  let targetDate = new Date(currentYear, month - 1, day);
  let diffTime = targetDate.getTime() - today.getTime();
  let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < -180) {
    targetDate = new Date(currentYear + 1, month - 1, day);
    diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } else if (diffDays > 185) {
    targetDate = new Date(currentYear - 1, month - 1, day);
    diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return diffDays;
}

document.addEventListener('DOMContentLoaded', () => {
  updateCurrentDateDisplay();
  setupTimelineDrag();
  initTwibbonCanvasEvents();
  fetchInitialData();
  startStatusPolling();
});

function updateCurrentDateDisplay() {
  const now = new Date();
  const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
  const display = `${dayName}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const el = document.getElementById('currentDateDisplay');
  if (el) el.textContent = `Hari Ini: ${display}`;
}

// -------------------------------------------------------------
// API FETCH & SYNC
// -------------------------------------------------------------
async function fetchInitialData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('Gagal memuat data dari server');
    const data = await res.json();
    state.employees = data.employees || [];
    state.config = { ...state.config, ...(data.config || {}) };
    
    updateRoleChipsCount();
    renderAllViews();
    renderRecipientsList();
    loadConfigIntoInputs();

    // Auto snap to today on initial load
    setTimeout(jumpToTodayTimeline, 200);
  } catch (err) {
    console.error('Error fetching initial data:', err);
    showToast('Gagal memuat data pegawai', 'danger');
  }
}

async function startStatusPolling() {
  let prevSyncTime = null;

  const poll = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        state.waStatus = data;
        updateWAStatusUI();

        // If backend auto-synced new data from Google Sheet, refresh client view automatically!
        if (data.lastSyncTime && prevSyncTime && data.lastSyncTime !== prevSyncTime) {
          console.log('🔄 Mendeteksi pembaruan data Google Sheet dari server, memperbarui tampilan...');
          await fetchInitialData();
          showToast('Data otomatis diperbarui dari Google Sheet!', 'info');
        }
        if (data.lastSyncTime) prevSyncTime = data.lastSyncTime;
      }
    } catch (_) {}
    setTimeout(poll, 6000);
  };
  poll();

  // Auto-refresh when user switches back to this browser tab after editing Google Sheets
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchInitialData();
    }
  });

  window.addEventListener('focus', () => {
    fetchInitialData();
  });
}

function updateWAStatusUI() {
  const dot = document.getElementById('waStatusDot');
  const label = document.getElementById('waStatusLabel');
  const boxDot = document.getElementById('waBoxDot');
  const boxText = document.getElementById('waBoxStatusText');
  const btnConnect = document.getElementById('btnConnectWA');
  const btnDisconnect = document.getElementById('btnDisconnectWA');
  const qrContainer = document.getElementById('waQrContainer');
  const qrImage = document.getElementById('waQrImage');

  const status = state.waStatus.connectionStatus;
  const user = state.waStatus.connectedUser;

  if (dot && label) {
    dot.className = `status-dot ${status}`;
    if (status === 'connected') {
      const phone = user?.id ? user.id.split(':')[0] : 'Aktif';
      label.textContent = `WA: Terhubung (+${phone})`;
    } else if (status === 'qr') {
      label.textContent = 'WA: Scan QR Diperlukan';
    } else if (status === 'connecting') {
      label.textContent = 'WA: Menghubungkan...';
    } else {
      label.textContent = 'WA: Terputus';
    }
  }

  if (boxDot && boxText) {
    boxDot.className = `status-dot ${status}`;
    if (status === 'connected') {
      boxText.innerHTML = `<strong>WhatsApp Terhubung!</strong> Pengingat otomatis aktif untuk nomor tujuan.`;
      if (btnConnect) btnConnect.style.display = 'none';
      if (btnDisconnect) btnDisconnect.style.display = 'inline-flex';
      if (qrContainer) qrContainer.style.display = 'none';
    } else if (status === 'qr') {
      boxText.innerHTML = `<strong>Menunggu Pemindaian QR Code:</strong> Buka WhatsApp di ponsel Anda.`;
      if (btnConnect) btnConnect.style.display = 'none';
      if (btnDisconnect) btnDisconnect.style.display = 'none';
      if (qrContainer) qrContainer.style.display = 'flex';
      if (qrImage && state.waStatus.qrCodeData) {
        qrImage.src = state.waStatus.qrCodeData;
      }
    } else {
      boxText.innerHTML = `<strong>WhatsApp Belum Terhubung.</strong> Klik tombol di samping untuk memindai QR Code.`;
      if (btnConnect) btnConnect.style.display = 'inline-flex';
      if (btnDisconnect) btnDisconnect.style.display = 'none';
      if (qrContainer) qrContainer.style.display = 'none';
    }
  }
}

async function connectWhatsApp() {
  try {
    showToast('Menginisialisasi WhatsApp...', 'info');
    const res = await fetch('/api/connect', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Silakan scan QR code jika diminta.', 'info');
    }
  } catch (err) {
    showToast('Gagal memulai koneksi: ' + err.message, 'danger');
  }
}

async function disconnectWhatsApp() {
  if (!confirm('Apakah Anda yakin ingin memutuskan sesi WhatsApp?')) return;
  try {
    const res = await fetch('/api/disconnect', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('WhatsApp telah diputus.', 'info');
    }
  } catch (err) {
    showToast('Gagal memutuskan WhatsApp: ' + err.message, 'danger');
  }
}

async function triggerGoogleSheetSync() {
  const btn = document.getElementById('btnQuickSync');
  if (btn) btn.classList.add('loading');
  try {
    showToast('Menghubungi Google Sheet...', 'info');
    const res = await fetch('/api/sync-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl: state.config.sheetUrl })
    });
    const data = await res.json();
    if (data.success) {
      state.employees = data.employees;
      updateRoleChipsCount();
      renderAllViews();
      showToast(`Berhasil sinkronisasi ${data.count} pegawai dari Google Sheet!`, 'success');
    } else {
      showToast(data.error || 'Gagal sinkronisasi data', 'danger');
    }
  } catch (err) {
    showToast('Kesalahan koneksi ke server: ' + err.message, 'danger');
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

// -------------------------------------------------------------
// FILTERING & METRICS
// -------------------------------------------------------------
function updateRoleChipsCount() {
  const counts = { ALL: state.employees.length };
  state.employees.forEach(emp => {
    const r = emp.jabatan || 'Lainnya';
    counts[r] = (counts[r] || 0) + 1;
    // Map prefix like MBM
    if (r.startsWith('MBM')) counts['MBM / Penyelia Unit'] = (counts['MBM / Penyelia Unit'] || 0) + 1;
  });

  document.querySelectorAll('.role-chip').forEach(chip => {
    const role = chip.getAttribute('data-role');
    const baseText = chip.textContent.split(' (')[0];
    const c = counts[role] || 0;
    if (role === 'ALL') {
      chip.textContent = `Semua Jabatan (${state.employees.length})`;
    } else {
      chip.textContent = `${baseText} (${c})`;
    }
  });
}

function getFilteredEmployees() {
  return state.employees.filter(emp => {
    if (state.selectedRole !== 'ALL') {
      const matchExact = emp.jabatan === state.selectedRole;
      const matchPartial = emp.jabatan && emp.jabatan.toLowerCase().includes(state.selectedRole.toLowerCase().split(' ')[0]);
      if (!matchExact && !matchPartial) return false;
    }
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchName = emp.nama && emp.nama.toLowerCase().includes(q);
      const matchNip = emp.nip && emp.nip.toLowerCase().includes(q);
      const matchRole = emp.jabatan && emp.jabatan.toLowerCase().includes(q);
      if (!matchName && !matchNip && !matchRole) return false;
    }
    return true;
  });
}

function updateMetrics() {
  let todayCount = 0;
  let tomorrowCount = 0;
  let weekCount = 0;
  const todayNames = [];
  const tomorrowNames = [];

  state.employees.forEach(emp => {
    const { day, month } = parseBirthday(emp.tanggalLahir);
    const offset = getDayOffset(day, month);

    if (offset === 0) {
      todayCount++;
      todayNames.push(emp.nama);
    } else if (offset === 1) {
      tomorrowCount++;
      tomorrowNames.push(emp.nama);
    }

    if (offset >= 0 && offset <= 7) {
      weekCount++;
    }
  });

  const kpiTodayCount = document.getElementById('kpiTodayCount');
  const kpiTodayNames = document.getElementById('kpiTodayNames');
  const kpiTomorrowCount = document.getElementById('kpiTomorrowCount');
  const kpiTomorrowNames = document.getElementById('kpiTomorrowNames');
  const kpiWeekCount = document.getElementById('kpiWeekCount');
  const kpiTotalEmployees = document.getElementById('kpiTotalEmployees');

  if (kpiTodayCount) kpiTodayCount.textContent = `${todayCount} Pegawai`;
  if (kpiTodayNames) {
    kpiTodayNames.textContent = todayNames.length > 0
      ? todayNames.join(', ')
      : 'Tidak ada ulang tahun hari ini';
  }

  if (kpiTomorrowCount) kpiTomorrowCount.textContent = `${tomorrowCount} Pegawai`;
  if (kpiTomorrowNames) {
    kpiTomorrowNames.textContent = tomorrowNames.length > 0
      ? tomorrowNames.join(', ')
      : 'Tidak ada pengingat H-1 untuk esok';
  }

  if (kpiWeekCount) kpiWeekCount.textContent = `${weekCount} Pegawai`;
  if (kpiTotalEmployees) kpiTotalEmployees.textContent = `${state.employees.length} Pegawai Terdaftar`;
}

function renderAllViews() {
  updateMetrics();
  renderTimelineView();
  renderCalendarView();
  renderTableView();
}

// -------------------------------------------------------------
// VIEW 1: DRAGGABLE HORIZONTAL TIMELINE
// -------------------------------------------------------------
function renderTimelineView() {
  const track = document.getElementById('timelineTrack');
  if (!track) return;

  const filtered = getFilteredEmployees();

  if (filtered.length === 0) {
    track.innerHTML = `<div class="loading-state">Tidak ada pegawai yang sesuai filter pencarian.</div>`;
    return;
  }

  const withOffset = filtered.map(emp => {
    const { day, month } = parseBirthday(emp.tanggalLahir);
    const offset = getDayOffset(day, month);
    return { ...emp, offset, parsedDay: day, parsedMonth: month };
  });

  withOffset.sort((a, b) => a.offset - b.offset);

  // If in 'window' mode and no search query, filter to -45 to +75 days for smooth scrolling
  let displayList = withOffset;
  if (state.timelineScope === 'window' && !state.searchQuery && state.selectedRole === 'ALL') {
    displayList = withOffset.filter(item => item.offset >= -45 && item.offset <= 75);
  }

  const pastItems = displayList.filter(item => item.offset < 0);
  const todayItems = displayList.filter(item => item.offset === 0);
  const futureItems = displayList.filter(item => item.offset > 0);

  let html = '';

  pastItems.forEach(emp => {
    html += renderTimelineCardHtml(emp, 'past');
  });

  const now = new Date();
  const todayDateStr = `${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  
  html += `
    <div class="timeline-today-marker" id="todayTimelineMarker">
      <div class="marker-stem"></div>
      <div class="marker-pin">
        <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <span>HARI INI (${todayDateStr})</span>
      </div>
    </div>
  `;

  todayItems.forEach(emp => {
    html += renderTimelineCardHtml(emp, 'today');
  });

  futureItems.forEach(emp => {
    const isTomorrow = emp.offset === 1;
    html += renderTimelineCardHtml(emp, isTomorrow ? 'tomorrow' : 'upcoming');
  });

  track.innerHTML = html;
}

function renderTimelineCardHtml(emp, type) {
  let statusText = '';
  let statusClass = type;
  let cardClass = '';

  if (type === 'today') {
    statusText = '🎉 HARI INI!';
    cardClass = 'card-today';
  } else if (type === 'tomorrow') {
    statusText = '⏰ Besok (H-1)';
    cardClass = 'card-tomorrow';
  } else if (type === 'past') {
    const daysAgo = Math.abs(emp.offset);
    statusText = daysAgo === 1 ? 'Kemarin' : `${daysAgo} Hari Lalu`;
  } else {
    statusText = `Dalam ${emp.offset} Hari`;
  }

  const rolePrefix = (emp.jabatan || 'SGP').split(' ')[0].replace(/[^a-zA-Z]/g, '');
  const roleClass = `role-${rolePrefix}`;

  return `
    <div class="timeline-card ${cardClass}" data-id="${emp.id}">
      <div class="card-top-row">
        <span class="date-badge">${emp.tanggalLahir}</span>
        <span class="status-pill ${statusClass}">${statusText}</span>
      </div>

      <div class="card-emp-info">
        <div class="emp-details" style="width:100%;">
          <div class="emp-name" title="${emp.nama}">${emp.nama}</div>
          <div class="emp-nip">NIP: <code>${emp.nip || '-'}</code></div>
          <span class="emp-role-tag ${roleClass}">${emp.jabatan}</span>
        </div>
      </div>

      <div class="card-actions">
        <button class="card-btn btn-primary-action" onclick="openGreetingModal('${emp.id}')" title="Salin Teks Ucapan WA">
          <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Salin Ucapan</span>
        </button>
        <button class="card-btn btn-gold" onclick="openTwibbonModal('${emp.id}')" title="Buka Studio Kartu Ucapan">
          <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <span>Kartu Ucapan</span>
        </button>
      </div>
    </div>
  `;
}

function getInitials(name) {
  if (!name) return 'MB';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function setupTimelineDrag() {
  const viewport = document.getElementById('timelineViewport');
  if (!viewport) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('.card-btn')) return;
    isDown = true;
    startX = e.pageX - viewport.offsetLeft;
    scrollLeft = viewport.scrollLeft;
  });

  viewport.addEventListener('mouseleave', () => { isDown = false; });
  viewport.addEventListener('mouseup', () => { isDown = false; });

  viewport.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - viewport.offsetLeft;
    const walk = (x - startX) * 1.5;
    viewport.scrollLeft = scrollLeft - walk;
  });
}

function scrollTimeline(distance) {
  const viewport = document.getElementById('timelineViewport');
  if (viewport) {
    viewport.scrollBy({ left: distance, behavior: 'smooth' });
  }
}

function jumpToTodayTimeline() {
  const viewport = document.getElementById('timelineViewport');
  const marker = document.getElementById('todayTimelineMarker') || document.querySelector('.card-today');
  if (viewport && marker) {
    const markerOffset = marker.offsetLeft;
    const viewportHalfWidth = viewport.clientWidth / 2;
    viewport.scrollTo({
      left: Math.max(0, markerOffset - viewportHalfWidth + 100),
      behavior: 'smooth'
    });
  }
}

function jumpToTomorrowTimeline() {
  const viewport = document.getElementById('timelineViewport');
  const tomorrowCard = document.querySelector('.card-tomorrow');
  if (viewport && tomorrowCard) {
    const cardOffset = tomorrowCard.offsetLeft;
    const viewportHalfWidth = viewport.clientWidth / 2;
    viewport.scrollTo({
      left: Math.max(0, cardOffset - viewportHalfWidth + 120),
      behavior: 'smooth'
    });
  } else {
    jumpToTodayTimeline();
  }
}

// -------------------------------------------------------------
// VIEW 2: MONTHLY CALENDAR
// -------------------------------------------------------------
function renderCalendarView() {
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('calendarMonthTitle');
  if (!grid || !title) return;

  const year = state.calendarYear;
  const month = state.calendarMonth;

  title.textContent = `${MONTH_NAMES[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const dayHeaders = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  let html = dayHeaders.map(h => `<div class="cal-day-header">${h}</div>`).join('');

  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="cal-day-cell other-month"></div>`;
  }

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const currentDay = now.getDate();

  const filtered = getFilteredEmployees();

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === currentDay;
    const cellClass = isToday ? 'cal-day-cell is-today' : 'cal-day-cell';

    const bdays = filtered.filter(emp => {
      const { day, month: bMonth } = parseBirthday(emp.tanggalLahir);
      return day === d && bMonth === (month + 1);
    });

    let bdayBadgesHtml = '';
    bdays.forEach(emp => {
      const badgeClass = isToday ? 'cal-emp-badge bday-today' : 'cal-emp-badge';
      bdayBadgesHtml += `
        <div class="${badgeClass}" onclick="openGreetingModal('${emp.id}')" title="${emp.nama} (${emp.jabatan})">
          <span>🎂 ${emp.nama}</span>
        </div>
      `;
    });

    html += `
      <div class="${cellClass}">
        <div class="cal-day-num">${d}</div>
        ${bdayBadgesHtml}
      </div>
    `;
  }

  grid.innerHTML = html;
}

function changeCalendarMonth(delta) {
  state.calendarMonth += delta;
  if (state.calendarMonth > 11) {
    state.calendarMonth = 0;
    state.calendarYear++;
  } else if (state.calendarMonth < 0) {
    state.calendarMonth = 11;
    state.calendarYear--;
  }
  renderCalendarView();
}

// -------------------------------------------------------------
// VIEW 3: TABLE VIEW
// -------------------------------------------------------------
function renderTableView() {
  const tbody = document.getElementById('employeeTableBody');
  const countBadge = document.getElementById('tableCountBadge');
  if (!tbody) return;

  const filtered = getFilteredEmployees();
  if (countBadge) countBadge.textContent = `${filtered.length} Pegawai`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:2rem;">Tidak ada pegawai ditemukan.</td></tr>`;
    return;
  }

  let html = '';
  filtered.forEach(emp => {
    const { day, month } = parseBirthday(emp.tanggalLahir);
    const offset = getDayOffset(day, month);

    let statusText = '';
    let statusClass = 'upcoming';

    if (offset === 0) {
      statusText = '🎉 HARI INI!';
      statusClass = 'today';
    } else if (offset === 1) {
      statusText = '⏰ Besok (H-1)';
      statusClass = 'tomorrow';
    } else if (offset < 0) {
      statusText = `${Math.abs(offset)} Hari Lalu`;
      statusClass = 'past';
    } else {
      statusText = `Dalam ${offset} Hari`;
    }

    const rolePrefix = (emp.jabatan || 'SGP').split(' ')[0].replace(/[^a-zA-Z]/g, '');
    const roleClass = `role-${rolePrefix}`;

    html += `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--text-main); font-size:0.92rem;">${emp.nama}</div>
        </td>
        <td><code>${emp.nip || '-'}</code></td>
        <td><span class="emp-role-tag ${roleClass}">${emp.jabatan}</span></td>
        <td><strong>${emp.tanggalLahir}</strong></td>
        <td><span class="status-pill ${statusClass}">${statusText}</span></td>
        <td class="text-right">
          <button class="btn btn-secondary btn-xs" onclick="openGreetingModal('${emp.id}')">Salin Ucapan</button>
          <button class="btn btn-gold btn-xs" onclick="openTwibbonModal('${emp.id}')">Kartu Ucapan</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// -------------------------------------------------------------
// CONTROLS & INTERACTIONS
// -------------------------------------------------------------
function switchView(viewName) {
  state.activeView = viewName;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const activePanel = document.getElementById(`${viewName}View`);
  if (activePanel) activePanel.classList.add('active');

  if (viewName === 'timeline') {
    setTimeout(jumpToTodayTimeline, 50);
  }
}

function handleSearch(query) {
  state.searchQuery = query.trim();
  renderAllViews();
}

function filterByRole(role) {
  state.selectedRole = role;
  document.querySelectorAll('.role-chip').forEach(chip => {
    chip.classList.toggle('active', chip.getAttribute('data-role') === role);
  });
  renderAllViews();
}

// -------------------------------------------------------------
// MODAL 1: SALIN TEKS UCAPAN
// -------------------------------------------------------------
const GREETING_TEMPLATES = [
  (emp) => `Selamat Ulang Tahun kepada Rekan ${emp.nama} (${emp.jabatan}).\n\nSemoga senantiasa diberikan limpahan kesehatan, keberkahan, kemudahan dalam menjalankan amanah, serta kesuksesan bersama keluarga besar Micro Banking Region V / Jakarta 3.\n\nTerima kasih atas dedikasi dan kerja sama luar biasanya! 🎉🙏`,
  (emp) => `Barakallahu fii umrik Rekan ${emp.nama}! 🎂\n\nSelamat bertambah usia. Terima kasih atas kekompakan, kerja sama, dan dedikasi solidnya di Micro Banking Reg V/Jak 3. Sukses selalu dalam karir, diberikan kesehatan lahir batin, dan berkah rezekinya bersama keluarga tercinta! 🥳🙌`,
  (emp) => `Selamat ulang tahun untuk Rekan ${emp.nama} (${emp.jabatan}).\n\nSemoga senantiasa dalam lindungan Tuhan Yang Maha Esa, dipanjangkan usia dalam kebaikan, dilapangkan rezeki yang halal, serta dimudahkan segala hajat dan rencana karir ke depan. Aamiin yaa robbal 'aalamiin. ✨🤲`,
  (emp) => `Happy Birthday Rekan ${emp.nama} (${emp.jabatan})! 🎂🎉 Sehat, bahagia, dan makin gemilang karirnya bersama tim Micro Banking Reg V/Jak 3!`
];

function openGreetingModal(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  state.selectedGreetingEmployee = emp;
  state.selectedGreetingTemplateIdx = 0;

  const subtitle = document.getElementById('greetingModalSubtitle');
  if (subtitle) subtitle.textContent = `Untuk Rekan: ${emp.nama} (${emp.jabatan})`;

  updateGreetingModalContent();
  document.getElementById('greetingModal').classList.add('open');
}

function closeGreetingModal() {
  document.getElementById('greetingModal').classList.remove('open');
}

function selectGreetingTemplate(idx) {
  state.selectedGreetingTemplateIdx = idx;
  document.querySelectorAll('.template-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === idx);
  });
  updateGreetingModalContent();
}

function updateGreetingModalContent() {
  const emp = state.selectedGreetingEmployee;
  if (!emp) return;

  const fn = GREETING_TEMPLATES[state.selectedGreetingTemplateIdx];
  const text = fn(emp);
  const ta = document.getElementById('greetingTextArea');
  if (ta) ta.value = text;
}

async function copyGreetingToClipboard() {
  const ta = document.getElementById('greetingTextArea');
  if (!ta) return;

  try {
    await navigator.clipboard.writeText(ta.value);
    showToast('Teks ucapan berhasil disalin ke clipboard! Siap di-paste ke grup WA.', 'success');
    closeGreetingModal();
  } catch (err) {
    ta.select();
    document.execCommand('copy');
    showToast('Teks ucapan berhasil disalin!', 'success');
    closeGreetingModal();
  }
}

// -------------------------------------------------------------
// MODAL 2: GREETING CARD GENERATOR (2 FORMAT)
// -------------------------------------------------------------
function openCardModal(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  state.cardModal.employee = emp;
  state.cardModal.format = 'vertical';
  state.cardModal.customPhoto = null;
  state.cardModal.customMessage = 'Semoga senantiasa diberikan kesehatan, keberkahan, kemudahan dalam menjalankan amanah, serta kesuksesan bersama Micro Banking Region V / Jakarta 3.';

  const subtitle = document.getElementById('cardModalSubtitle');
  if (subtitle) subtitle.textContent = `Kartu Ucapan: ${emp.nama} (${emp.jabatan})`;

  const msgArea = document.getElementById('cardCustomMessage');
  if (msgArea) msgArea.value = state.cardModal.customMessage;

  setCardFormat('vertical');
  document.getElementById('cardGeneratorModal').classList.add('open');
}

function closeCardModal() {
  document.getElementById('cardGeneratorModal').classList.remove('open');
}

function setCardFormat(fmt) {
  state.cardModal.format = fmt;
  const btnV = document.getElementById('btnFormatVertical');
  const btnH = document.getElementById('btnFormatHorizontal');
  if (btnV && btnH) {
    btnV.classList.toggle('active', fmt === 'vertical');
    btnH.classList.toggle('active', fmt === 'horizontal');
  }
  renderCardPreview();
}

function handleCardPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.cardModal.customPhoto = img;
      renderCardPreview();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function resetCardPhoto() {
  state.cardModal.customPhoto = null;
  const input = document.getElementById('cardPhotoInput');
  if (input) input.value = '';
  renderCardPreview();
}

function renderCardPreview() {
  const canvas = document.getElementById('greetingCardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const emp = state.cardModal.employee;
  if (!emp) return;

  const isVertical = state.cardModal.format === 'vertical';

  const width = isVertical ? 1080 : 1920;
  const height = isVertical ? 1920 : 1080;

  canvas.width = width;
  canvas.height = height;

  const customMsg = document.getElementById('cardCustomMessage')?.value || state.cardModal.customMessage;

  // Background Gradient (Mandiri Deep Navy)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#061220');
  bgGrad.addColorStop(0.4, '#0A192F');
  bgGrad.addColorStop(1, '#002D5A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle Corporate Geometric Pattern (Crisp Vector Lines)
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 183, 0, 0.12)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(80, 80);
  ctx.lineTo(width - 80, 80);
  ctx.moveTo(80, height - 80);
  ctx.lineTo(width - 80, height - 80);
  ctx.stroke();

  const cornerSize = 40;
  ctx.strokeStyle = '#FFB700';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(70, 70 + cornerSize);
  ctx.lineTo(70, 70);
  ctx.lineTo(70 + cornerSize, 70);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 70 - cornerSize, 70);
  ctx.lineTo(width - 70, 70);
  ctx.lineTo(width - 70, 70 + cornerSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(70, height - 70 - cornerSize);
  ctx.lineTo(70, height - 70);
  ctx.lineTo(70 + cornerSize, height - 70);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 70 - cornerSize, height - 70);
  ctx.lineTo(width - 70, height - 70);
  ctx.lineTo(width - 70, height - 70 - cornerSize);
  ctx.stroke();
  ctx.restore();

  // Corporate Header Text
  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BANK MANDIRI • MICRO BANKING REGION V / JAKARTA 3', width / 2, 135);

  if (isVertical) {
    const photoY = 620;
    const photoRadius = 240;

    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, photoY, photoRadius + 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFB700';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(255, 183, 0, 0.5)';
    ctx.shadowBlur = 25;
    ctx.stroke();
    ctx.restore();

    const photoImg = state.cardModal.customPhoto || (emp.foto ? emp._cachedImg : null);

    const drawPhotoContent = (imgObj) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, photoY, photoRadius, 0, Math.PI * 2);
      ctx.clip();
      if (imgObj) {
        ctx.drawImage(imgObj, (width / 2) - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
      } else {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect((width / 2) - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 90px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getInitials(emp.nama), width / 2, photoY);
      }
      ctx.restore();
    };

    if (photoImg && photoImg.complete) {
      drawPhotoContent(photoImg);
    } else if (emp.foto && !emp._cachedImg) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        emp._cachedImg = img;
        renderCardPreview();
      };
      img.onerror = () => { drawPhotoContent(null); };
      img.src = getProxyPhotoUrl(emp.foto);
      drawPhotoContent(null);
    } else {
      drawPhotoContent(null);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFB700';
    ctx.font = '800 68px "Outfit", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('HAPPY BIRTHDAY', width / 2, 980);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 58px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(emp.nama, width / 2, 1080);

    const roleText = `${emp.jabatan} • NIP: ${emp.nip || '-'}`;
    ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
    const textWidth = ctx.measureText(roleText).width;
    const badgeW = textWidth + 60;
    const badgeH = 54;
    const badgeY = 1140;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 183, 0, 0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, (width / 2) - (badgeW / 2), badgeY, badgeW, badgeH, 27);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(roleText, width / 2, badgeY + 36);

    ctx.font = '400 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    wrapText(ctx, `"${customMsg}"`, width / 2, 1300, 840, 48);

    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Semoga Sukses, Sehat & Bahagia Selalu', width / 2, 1720);

    ctx.fillStyle = '#FFB700';
    ctx.font = '700 26px "Outfit", sans-serif';
    ctx.fillText('Keluarga Besar Micro Banking Region V / Jakarta 3', width / 2, 1770);

  } else {
    const photoX = 480;
    const photoY = 540;
    const photoRadius = 260;

    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX, photoY, photoRadius + 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFB700';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(255, 183, 0, 0.5)';
    ctx.shadowBlur = 25;
    ctx.stroke();
    ctx.restore();

    const photoImg = state.cardModal.customPhoto || (emp.foto ? emp._cachedImg : null);

    const drawPhotoContentH = (imgObj) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoX, photoY, photoRadius, 0, Math.PI * 2);
      ctx.clip();
      if (imgObj) {
        ctx.drawImage(imgObj, photoX - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
      } else {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(photoX - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 100px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getInitials(emp.nama), photoX, photoY);
      }
      ctx.restore();
    };

    if (photoImg && photoImg.complete) {
      drawPhotoContentH(photoImg);
    } else if (emp.foto && !emp._cachedImg) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        emp._cachedImg = img;
        renderCardPreview();
      };
      img.onerror = () => { drawPhotoContentH(null); };
      img.src = getProxyPhotoUrl(emp.foto);
      drawPhotoContentH(null);
    } else {
      drawPhotoContentH(null);
    }

    const textStartX = 860;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFB700';
    ctx.font = '800 60px "Outfit", sans-serif';
    ctx.fillText('HAPPY BIRTHDAY', textStartX, 380);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 56px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(emp.nama, textStartX, 460);

    const roleText = `${emp.jabatan} • NIP: ${emp.nip || '-'}`;
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    const textWidth = ctx.measureText(roleText).width;
    const badgeW = textWidth + 50;
    const badgeH = 46;
    const badgeY = 500;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 183, 0, 0.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, textStartX, badgeY, badgeW, badgeH, 23);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(roleText, textStartX + 25, badgeY + 32);

    ctx.font = '400 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#CBD5E1';
    wrapText(ctx, `"${customMsg}"`, textStartX, 630, 880, 44);

    ctx.font = '700 24px "Outfit", sans-serif';
    ctx.fillStyle = '#FFB700';
    ctx.fillText('Keluarga Besar Micro Banking Region V / Jakarta 3', textStartX, 840);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

function downloadGreetingCard() {
  const canvas = document.getElementById('greetingCardCanvas');
  const emp = state.cardModal.employee;
  if (!canvas || !emp) return;

  const fmt = state.cardModal.format;
  const link = document.createElement('a');
  link.download = `Kartu_Ucapan_${emp.nama.replace(/\s+/g, '_')}_${fmt}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Gambar kartu ucapan berhasil diunduh!', 'success');
}

// -------------------------------------------------------------
// MODAL 3: STUDIO KARTU & TWIBBON UCAPAN (3 VERSI)
// 1. Kartu AI / Otomatis Dengan Foto
// 2. Kartu AI / Otomatis Tanpa Foto (Plakat Tipografi Elegan)
// 3. Edit Manual via Canva (Buka Link Canva)
// -------------------------------------------------------------
// -------------------------------------------------------------
// NUSANTARA & DANANTARA MANDIRI LUXURY CARD GENERATOR
// Based on official Mandiri + Danantara certificate aesthetic
// With Logo Danantara (top left), Logo Mandiri (top right),
// Batik Mega Mendung watermark, gold foil accents, and floral motifs
// -------------------------------------------------------------

let cachedNusantaraTemplate = null;
let isNusantaraLoading = false;
const nusantaraCallbacks = [];

function getNusantaraTemplateImg(callback) {
  if (cachedNusantaraTemplate && cachedNusantaraTemplate.complete && cachedNusantaraTemplate.naturalWidth > 0) {
    return callback(cachedNusantaraTemplate);
  }
  nusantaraCallbacks.push(callback);
  if (isNusantaraLoading) return;
  isNusantaraLoading = true;

  const img = new Image();
  img.onload = () => {
    cachedNusantaraTemplate = img;
    isNusantaraLoading = false;
    while (nusantaraCallbacks.length > 0) {
      const cb = nusantaraCallbacks.shift();
      try { cb(img); } catch (e) { console.error(e); }
    }
  };
  img.onerror = () => {
    console.error("Gagal memuat template nusantara");
    isNusantaraLoading = false;
    while (nusantaraCallbacks.length > 0) {
      const cb = nusantaraCallbacks.shift();
      try { cb(null); } catch (e) { console.error(e); }
    }
  };
  img.src = "/assets/template_nusantara_clean.png";
}

// Preload template immediately
getNusantaraTemplateImg(() => {
  console.log("Template Nusantara Danantara Mandiri siap di memori");
});

function renderTwibbon() {
  const canvas = document.getElementById("twibbonCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const emp = state.twibbonModal.employee;

  const width = 1150;
  const height = 858;
  canvas.width = width;
  canvas.height = height;

  // Draw initial warm parchment backdrop so canvas is never blank
  ctx.fillStyle = "#FAF8F2";
  ctx.fillRect(0, 0, width, height);

  getNusantaraTemplateImg((baseImg) => {
    if (baseImg) {
      ctx.drawImage(baseImg, 0, 0, width, height);
    }

    if (state.twibbonModal.version === 'with-photo') {
      renderNusantaraCardWithPhoto(ctx, width, height, emp);
    } else {
      // Default: no-photo (exact match to user reference image 2)
      renderNusantaraCardNoPhoto(ctx, width, height, emp);
    }
  });
}

// -------------------------------------------------------------
// VERSI 2: TANPA FOTO (EXACT MATCH DENGAN GAMBAR 2 USER)
// -------------------------------------------------------------
function renderNusantaraCardNoPhoto(ctx, width, height, emp) {
  const cx = width / 2; // 575

  const rawName = emp ? emp.nama : "Insan Mandiri";
  const nameUpper = rawName.toUpperCase();
  const jabatan = emp?.jabatan || "Micro Banking";
  const nip = emp?.nip || "-";

  ctx.save();
  ctx.textAlign = "center";

  // 1. Employee Name inside the gold ornate bracket
  // Bracket is centered at y = 295
  let fontSize = 28;
  ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
  let textWidth = ctx.measureText(nameUpper).width;
  while (textWidth > 460 && fontSize > 18) {
    fontSize -= 1.5;
    ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    textWidth = ctx.measureText(nameUpper).width;
  }

  // Elegant gold gradient for employee name
  const goldTextGrad = ctx.createLinearGradient(0, 275, 0, 310);
  goldTextGrad.addColorStop(0, "#8C6514");
  goldTextGrad.addColorStop(0.4, "#B8860B");
  goldTextGrad.addColorStop(1, "#8C6514");
  ctx.fillStyle = goldTextGrad;
  ctx.shadowColor = "rgba(184, 134, 11, 0.25)";
  ctx.shadowBlur = 4;
  ctx.fillText(nameUpper, cx, 298);
  ctx.shadowBlur = 0;

  // 2. Job Title & NIP
  ctx.fillStyle = "#1E293B";
  ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Job Title: ${jabatan} (NIP: ${nip})`, cx, 368);

  // 3. Heartfelt Personalized Congratulatory Body Text
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#1E293B";
  ctx.fillText("Dengan penuh rasa syukur, kami segenap keluarga besar Bank Mandiri", cx, 436);
  ctx.fillText(`mengucapkan Selamat Ulang Tahun kepada Bapak/Ibu ${rawName}.`, cx, 464);

  ctx.fillText("Semoga senantiasa diberkahi kesehatan, kebahagiaan, kesuksesan yang", cx, 520);
  ctx.fillText("berkelanjutan, dan keberkahan dalam setiap langkah perjalanan hidup serta karir.", cx, 546);

  ctx.fillText("Terima kasih atas dedikasi dan kontribusi luar biasa yang Bapak/Ibu berikan.", cx, 604);

  // 4. Closing Celebration Wish
  ctx.font = '700 16.5px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#0F172A";
  ctx.fillText("Semoga Hari Anda Luar Biasa!", cx, 664);

  ctx.restore();
}

// -------------------------------------------------------------
// VERSI 1: DENGAN FOTO (NUSANTARA DANANTARA + FOTO BADGE EMAS)
// -------------------------------------------------------------
function renderNusantaraCardWithPhoto(ctx, width, height, emp) {
  const cx = width / 2;

  const rawName = emp ? emp.nama : "Insan Mandiri";
  const nameUpper = rawName.toUpperCase();
  const jabatan = emp?.jabatan || "Micro Banking";
  const nip = emp?.nip || "-";

  // Center Photo Badge
  const photoCy = 232;
  const photoRadius = 52;

  ctx.save();
  // Outer Gold Glow & Double Ring for Portrait
  ctx.beginPath();
  ctx.arc(cx, photoCy, photoRadius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "#B8860B";
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "rgba(184, 134, 11, 0.4)";
  ctx.shadowBlur = 12;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, photoCy, photoRadius + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.stroke();

  // Clip Circle & Draw Photo
  ctx.beginPath();
  ctx.arc(cx, photoCy, photoRadius, 0, Math.PI * 2);
  ctx.clip();

  const photo = state.twibbonModal.customPhotoImg;
  if (photo && photo.complete && photo.naturalWidth > 0) {
    ctx.translate(cx + state.twibbonModal.x, photoCy + state.twibbonModal.y);
    ctx.rotate((state.twibbonModal.rotation * Math.PI) / 180);
    ctx.scale(state.twibbonModal.scale, state.twibbonModal.scale);
    const pW = photo.naturalWidth || photo.width;
    const pH = photo.naturalHeight || photo.height;
    const scaleCover = Math.max((photoRadius * 2) / pW, (photoRadius * 2) / pH);
    const drawW = pW * scaleCover;
    const drawH = pH * scaleCover;
    ctx.drawImage(photo, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    // Ivory / Gold Monogram Crest
    const crestGrad = ctx.createLinearGradient(cx, photoCy - photoRadius, cx, photoCy + photoRadius);
    crestGrad.addColorStop(0, "#152D4F");
    crestGrad.addColorStop(1, "#0A182E");
    ctx.fillStyle = crestGrad;
    ctx.fillRect(cx - photoRadius, photoCy - photoRadius, photoRadius * 2, photoRadius * 2);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFB700";
    ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(getInitials(rawName), cx, photoCy + 2);
  }
  ctx.restore();

  // Draw Name inside bracket
  ctx.save();
  ctx.textAlign = "center";

  let fontSize = 28;
  ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
  let textWidth = ctx.measureText(nameUpper).width;
  while (textWidth > 460 && fontSize > 18) {
    fontSize -= 1.5;
    ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    textWidth = ctx.measureText(nameUpper).width;
  }

  const goldTextGrad = ctx.createLinearGradient(0, 275, 0, 310);
  goldTextGrad.addColorStop(0, "#8C6514");
  goldTextGrad.addColorStop(0.4, "#B8860B");
  goldTextGrad.addColorStop(1, "#8C6514");
  ctx.fillStyle = goldTextGrad;
  ctx.shadowColor = "rgba(184, 134, 11, 0.25)";
  ctx.shadowBlur = 4;
  ctx.fillText(nameUpper, cx, 305);
  ctx.shadowBlur = 0;

  // Job Title & NIP
  ctx.fillStyle = "#1E293B";
  ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Job Title: ${jabatan} (NIP: ${nip})`, cx, 370);

  // Congratulatory Body Text
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#1E293B";
  ctx.fillText("Dengan penuh rasa syukur, kami segenap keluarga besar Bank Mandiri", cx, 436);
  ctx.fillText(`mengucapkan Selamat Ulang Tahun kepada Bapak/Ibu ${rawName}.`, cx, 464);

  ctx.fillText("Semoga senantiasa diberkahi kesehatan, kebahagiaan, kesuksesan yang", cx, 520);
  ctx.fillText("berkelanjutan, dan keberkahan dalam setiap langkah perjalanan hidup serta karir.", cx, 546);

  ctx.fillText("Terima kasih atas dedikasi dan kontribusi luar biasa yang Bapak/Ibu berikan.", cx, 604);

  // Closing Wish
  ctx.font = '700 16.5px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#0F172A";
  ctx.fillText("Semoga Hari Anda Luar Biasa!", cx, 664);

  ctx.restore();
}

function openTwibbonModal(empId) {
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  state.twibbonModal.employee = emp;
  state.twibbonModal.version = 'with-photo'; // default version
  state.twibbonModal.customPhotoImg = null;
  state.twibbonModal.x = 0;
  state.twibbonModal.y = 0;
  state.twibbonModal.scale = 1.0;
  state.twibbonModal.rotation = 0;

  const subtitle = document.getElementById("twibbonModalSubtitle");
  if (subtitle) subtitle.textContent = "Kartu Ucapan: " + emp.nama + " (" + emp.jabatan + ")";

  // Set Canva displays
  const cName = document.getElementById("canvaEmpNameDisplay");
  const cRole = document.getElementById("canvaEmpRoleDisplay");
  if (cName) cName.textContent = emp.nama;
  if (cRole) cRole.textContent = emp.jabatan + " (NIP: " + (emp.nip || "-") + ")";

  const canvaInput = document.getElementById("canvaTemplateUrlInput");
  const canvaUrl = state.config.canvaTemplateUrl || "https://www.canva.com";
  if (canvaInput) canvaInput.value = canvaUrl;

  const canvaLink = document.getElementById("btnOpenCanvaLink");
  if (canvaLink) canvaLink.href = canvaUrl;

  // Open modal & set version
  document.getElementById("twibbonModal").classList.add("open");
  switchCardVersion('with-photo');

  // Render card
  renderTwibbon();

  // Load employee photo in background if available
  if (emp.foto) {
    const img = new Image();
    img.onload = () => {
      state.twibbonModal.customPhotoImg = img;
      renderTwibbon();
    };
    img.onerror = () => {
      state.twibbonModal.customPhotoImg = null;
      renderTwibbon();
    };
    img.src = getProxyPhotoUrl(emp.foto);
  }
}

function closeTwibbonModal() {
  document.getElementById("twibbonModal").classList.remove("open");
}

function handleTwibbonPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.twibbonModal.customPhotoImg = img;
      state.twibbonModal.x = 0;
      state.twibbonModal.y = 0;
      state.twibbonModal.scale = 1.0;
      state.twibbonModal.rotation = 0;
      renderTwibbon();
      showToast("Foto pegawai berhasil diunggah!", "success");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function resetTwibbonPhoto() {
  state.twibbonModal.customPhotoImg = null;
  state.twibbonModal.x = 0;
  state.twibbonModal.y = 0;
  state.twibbonModal.scale = 1.0;
  state.twibbonModal.rotation = 0;
  renderTwibbon();
  showToast("Foto kartu direset", "info");
}

function initTwibbonCanvasEvents() {
  const canvas = document.getElementById("twibbonCanvas");
  if (!canvas) return;
  canvas.addEventListener("mousedown", (e) => {
    if (state.twibbonModal.version !== 'with-photo') return;
    state.twibbonModal.isDragging = true;
    state.twibbonModal.dragStartX = e.clientX - state.twibbonModal.x;
    state.twibbonModal.dragStartY = e.clientY - state.twibbonModal.y;
    canvas.style.cursor = "grabbing";
  });
  window.addEventListener("mouseup", () => {
    if (state.twibbonModal.isDragging) {
      state.twibbonModal.isDragging = false;
      canvas.style.cursor = "grab";
    }
  });
  window.addEventListener("mousemove", (e) => {
    if (state.twibbonModal.isDragging) {
      state.twibbonModal.x = e.clientX - state.twibbonModal.dragStartX;
      state.twibbonModal.y = e.clientY - state.twibbonModal.dragStartY;
      renderTwibbon();
    }
  });
}


function downloadTwibbon() {
  const canvas = document.getElementById("twibbonCanvas");
  const emp = state.twibbonModal.employee;
  if (!canvas) return;
  const link = document.createElement("a");
  const name = emp ? emp.nama.replace(/\s+/g, "_") : "Pegawai";
  const ver = state.twibbonModal.version || "card";
  link.download = "Kartu_" + name + "_" + ver + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast("Kartu ucapan berhasil diunduh dalam format PNG!", "success");
}

// -------------------------------------------------------------
// MODAL 4: SETTINGS
// -------------------------------------------------------------
function openSettingsModal(defaultTab) {
  if (defaultTab === 'wa-tab') {
    switchSettingsTab('wa');
  } else {
    switchSettingsTab('sheet');
  }
  loadConfigIntoInputs();
  renderRecipientsList();
  fetchLogs();
  document.getElementById('settingsModal').classList.add('open');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('open');
}

function switchSettingsTab(tabName) {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.remove('active'));

  if (tabName === 'sheet') {
    document.getElementById('tabBtnSheet')?.classList.add('active');
    document.getElementById('settingsSheetPanel')?.classList.add('active');
  } else if (tabName === 'wa') {
    document.getElementById('tabBtnWA')?.classList.add('active');
    document.getElementById('settingsWAPanel')?.classList.add('active');
  } else if (tabName === 'log') {
    document.getElementById('tabBtnLog')?.classList.add('active');
    document.getElementById('settingsLogPanel')?.classList.add('active');
    fetchLogs();
  }
}

function loadConfigIntoInputs() {
  const sheetInput = document.getElementById('settingSheetUrl');
  if (sheetInput) sheetInput.value = state.config.sheetUrl || '';

  const h0 = document.getElementById('timeH0');
  const h1 = document.getElementById('timeH1');

  if (h0) {
    const h = String(state.config.h0AlertHour ?? 7).padStart(2, '0');
    const m = String(state.config.h0AlertMinute ?? 0).padStart(2, '0');
    h0.value = `${h}:${m}`;
  }
  if (h1) {
    const h = String(state.config.h1AlertHour ?? 17).padStart(2, '0');
    const m = String(state.config.h1AlertMinute ?? 0).padStart(2, '0');
    h1.value = `${h}:${m}`;
  }
}

async function saveAndSyncGoogleSheet() {
  const input = document.getElementById('settingSheetUrl');
  if (!input) return;

  const url = input.value.trim();
  if (!url) {
    showToast('Masukkan URL Google Sheet terlebih dahulu', 'warning');
    return;
  }

  try {
    showToast('Menyimpan & sinkronisasi Google Sheet...', 'info');
    const res = await fetch('/api/sync-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl: url })
    });
    const data = await res.json();
    if (data.success) {
      state.config.sheetUrl = url;
      state.employees = data.employees;
      updateRoleChipsCount();
      renderAllViews();
      showToast(`Berhasil sinkronisasi ${data.count} pegawai dari Google Sheet!`, 'success');
      closeSettingsModal();
    } else {
      showToast(data.error || 'Gagal sinkronisasi Google Sheet', 'danger');
    }
  } catch (err) {
    showToast('Kesalahan jaringan: ' + err.message, 'danger');
  }
}

function renderRecipientsList() {
  const container = document.getElementById('recipientList');
  if (!container) return;

  const recipients = state.config.alertRecipients || [];
  if (recipients.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">Belum ada nomor tujuan tersimpan.</p>';
    return;
  }

  let html = '';
  recipients.forEach((r, idx) => {
    html += `
      <div class="recipient-item">
        <div class="recipient-info">
          <input type="checkbox" ${r.active ? 'checked' : ''} onchange="toggleRecipient(${idx})">
          <div>
            <strong>${r.name || 'Nomor'}</strong>
            <div class="recipient-phone">${r.phone}</div>
          </div>
        </div>
        <button class="btn btn-text btn-xs text-danger" onclick="deleteRecipient(${idx})">Hapus</button>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function addNewRecipient() {
  const nameInput = document.getElementById('newRecipientName');
  const phoneInput = document.getElementById('newRecipientPhone');

  const name = nameInput?.value.trim() || 'Penerima';
  const phone = phoneInput?.value.trim();

  if (!phone) {
    showToast('Nomor WhatsApp wajib diisi', 'warning');
    return;
  }

  if (!state.config.alertRecipients) state.config.alertRecipients = [];
  state.config.alertRecipients.push({ name, phone, active: true });

  await saveConfigToServer();
  renderRecipientsList();

  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  showToast('Nomor penerima alert berhasil ditambahkan!', 'success');
}

async function toggleRecipient(idx) {
  if (!state.config.alertRecipients[idx]) return;
  state.config.alertRecipients[idx].active = !state.config.alertRecipients[idx].active;
  await saveConfigToServer();
  renderRecipientsList();
}

async function deleteRecipient(idx) {
  if (!confirm('Hapus nomor ini dari daftar alert otomatis?')) return;
  state.config.alertRecipients.splice(idx, 1);
  await saveConfigToServer();
  renderRecipientsList();
  showToast('Nomor telah dihapus.', 'info');
}

async function updateAlertTimes() {
  const h0 = document.getElementById('timeH0')?.value;
  const h1 = document.getElementById('timeH1')?.value;

  if (h0) {
    const [h, m] = h0.split(':').map(Number);
    state.config.h0AlertHour = h;
    state.config.h0AlertMinute = m;
  }
  if (h1) {
    const [h, m] = h1.split(':').map(Number);
    state.config.h1AlertHour = h;
    state.config.h1AlertMinute = m;
  }

  await saveConfigToServer();
  showToast('Jadwal jam kirim alert berhasil diperbarui.', 'success');
}

async function saveConfigToServer() {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.config)
    });
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

async function triggerTestRobotAlert() {
  try {
    showToast('Mengirimkan pesan uji coba notifikasi robot ke nomor tujuan...', 'info');
    const res = await fetch('/api/send-test-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'HARI_H' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Pesan robot otomatis BERHASIL terkirim ke WhatsApp tujuan!', 'success');
      fetchLogs();
    } else {
      const msg = data.results?.map(r => `${r.phone}: ${r.error || 'Gagal'}`).join(', ') || 'Pengiriman gagal';
      showToast('Hasil kirim: ' + msg, 'warning');
    }
  } catch (err) {
    showToast('Kesalahan saat mengirim: ' + err.message, 'danger');
  }
}

async function fetchLogs() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/logs');
    if (!res.ok) return;
    const data = await res.json();
    const logs = data.logs || [];

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada aktivitas pengiriman tercatat.</td></tr>';
      return;
    }

    let html = '';
    logs.forEach(l => {
      const d = new Date(l.timestamp);
      const timeStr = `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID')}`;
      const badge = l.status === 'SUCCESS'
        ? '<span class="status-pill today" style="background:#DCFCE7;color:#166534;">BERHASIL</span>'
        : '<span class="status-pill past" style="background:#FEE2E2;color:#991B1B;">GAGAL</span>';

      html += `
        <tr>
          <td>${timeStr}</td>
          <td><code>${l.recipient}</code></td>
          <td>${l.employee}</td>
          <td>${l.type}</td>
          <td>${badge}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (_) {}
}

function exportSampleCsv() {
  const headers = ['Nama Lengkap', 'NIP', 'Jabatan', 'Alamat domisili', 'Tanggal lahir', 'Foto terbaru'];
  const sampleRows = [
    ['Achmad Baehaqi', '1084401048', 'SGP', 'Nagra gunung putri', '10/15/1984', 'https://drive.google.com/open?id=1L--_Fmh8rnCpsIOfAg7EaoMJdhv7_kPo'],
    ['Subakti prihastono', '1289449530', 'MKA', 'Bogor', '10/15/1989', 'https://drive.google.com/open?id=1wUe1J8Z9y2k4l9'],
    ['Ernawati', '1288190083', 'SGP', 'Bekasi', '10/18/1988', 'https://drive.google.com/open?id=1L--_Fmh8rnCpsIOfAg7EaoMJdhv7_kPo']
  ];

  const csvContent = [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'Template_Pegawai_MicroBanking.csv';
  link.click();
  showToast('Template spreadsheet CSV berhasil diunduh!', 'success');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'danger') toast.style.borderLeftColor = 'var(--danger)';
  if (type === 'success') toast.style.borderLeftColor = 'var(--success)';

  toast.innerHTML = `
    <span style="font-size:1rem;">${type === 'success' ? '✓' : (type === 'danger' ? '✕' : 'ℹ')}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}
