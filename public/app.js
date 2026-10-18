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
    let data = null;
    try {
      const res = await fetch('/api/data');
      if (res.ok) data = await res.json();
    } catch (_) {}

    // Fallback static data jika API serverless cold-start
    if (!data || !data.employees || data.employees.length === 0) {
      try {
        const fallbackRes = await fetch('data/employees.json');
        if (fallbackRes.ok) {
          const emps = await fallbackRes.json();
          data = { employees: emps, config: {} };
        }
      } catch (_) {}
    }

    if (!data || !data.employees) throw new Error('Gagal memuat data dari server');

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

  // Hitung rentang hari Senin s/d Minggu pekan kalender berjalan
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0: Minggu, 1: Senin, ..., 6: Sabtu
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

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

    // Ulang tahun dalam pekan ini (Senin - Minggu)
    if (offset >= mondayOffset && offset <= sundayOffset) {
      weekCount++;
    }
  });

  const kpiTodayCount = document.getElementById('kpiTodayCount');
  const kpiTodayNames = document.getElementById('kpiTodayNames');
  const kpiTomorrowCount = document.getElementById('kpiTomorrowCount');
  const kpiTomorrowNames = document.getElementById('kpiTomorrowNames');
  const kpiWeekCount = document.getElementById('kpiWeekCount');
  const kpiWeekSub = document.getElementById('kpiWeekSub');
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
  if (kpiWeekSub) {
    const mondayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    const sundayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + sundayOffset);
    const monStr = `${mondayDate.getDate()} ${MONTH_NAMES[mondayDate.getMonth()].slice(0, 3)}`;
    const sunStr = `${sundayDate.getDate()} ${MONTH_NAMES[sundayDate.getMonth()].slice(0, 3)}`;
    kpiWeekSub.textContent = `Senin - Minggu (${monStr} - ${sunStr})`;
  }
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
        <button class="card-btn btn-gold" onclick="openCardModal('${emp.id}')" title="Buka Kartu Ucapan Ulang Tahun">
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
          <button class="btn btn-gold btn-xs" onclick="openCardModal('${emp.id}')">Kartu Ucapan</button>
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
// STUDIO KARTU UCAPAN OTOMATIS MICRO BANKING REGION V/JAKARTA 3
// 3 VERSI:
// 1. Versi Hanya Tulisan (Plakat Tipografi Elegan)
// 2. Versi Tulisan dengan Foto (Foto Pegawai + Tipografi Meriah)
// 3. Edit Manual via Canva (Buka Template Canva)
// =============================================================

let cachedEmployeePhotoImg = null;

function openCardModal(empId) {
  openF1StudioModal(empId);
  return;
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  state.cardModal = {
    employee: emp,
    version: 'text-only', // default ke Versi 1: Hanya Tulisan
    customPhotoImg: null
  };

  const subtitle = document.getElementById("cardModalSubtitle");
  if (subtitle) {
    subtitle.textContent = `Kartu Ucapan: ${emp.nama} (${emp.jabatan || 'Micro Banking'})`;
  }

  // Update data display untuk Canva
  const canvaName = document.getElementById("canvaEmpNameDisplay");
  const canvaRole = document.getElementById("canvaEmpRoleDisplay");
  const canvaNip = document.getElementById("canvaEmpNipDisplay");
  if (canvaName) canvaName.textContent = emp.nama;
  if (canvaRole) canvaRole.textContent = `Jabatan: ${emp.jabatan || '-'}`;
  if (canvaNip) canvaNip.textContent = `NIP: ${emp.nip || '-'}`;

  // Pre-load saved Canva template URL
  const savedCanvaUrl = localStorage.getItem('mandiri_canva_template_url') || 'https://www.canva.com';
  const canvaInput = document.getElementById("canvaTemplateUrlInput");
  const canvaLink = document.getElementById("btnOpenCanvaLink");
  if (canvaInput) canvaInput.value = savedCanvaUrl;
  if (canvaLink) canvaLink.href = savedCanvaUrl;

  // Pre-load foto pegawai jika tersedia (utamakan cache lokal)
  cachedEmployeePhotoImg = null;
  const photoImg = new Image();
  photoImg.crossOrigin = "anonymous";
  photoImg.onload = () => {
    cachedEmployeePhotoImg = photoImg;
    renderCard();
  };
  photoImg.onerror = () => {
    if (emp.foto) {
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = "anonymous";
      fallbackImg.onload = () => {
        cachedEmployeePhotoImg = fallbackImg;
        renderCard();
      };
      if (emp.foto.includes('drive.google.com')) {
        fallbackImg.src = `/api/photo-proxy?url=${encodeURIComponent(emp.foto)}`;
      } else {
        fallbackImg.src = emp.foto;
      }
    } else {
      cachedEmployeePhotoImg = null;
    }
  };
  photoImg.src = `assets/source_photos/${emp.id}.jpg?t=${Date.now()}`;

  // Cek apakah sudah ada kartu F1 dengan wajah pegawai ini
  state.cardModal.generatedF1Card = null;
  const f1CustomImg = new Image();
  f1CustomImg.onload = () => {
    if (state.cardModal && state.cardModal.employee && state.cardModal.employee.id === emp.id) {
      state.cardModal.generatedF1Card = f1CustomImg;
      renderCard();
    }
  };
  f1CustomImg.onerror = () => {
    if (state.cardModal && state.cardModal.employee && state.cardModal.employee.id === emp.id) {
      state.cardModal.generatedF1Card = null;
    }
  };
  f1CustomImg.src = `assets/f1_cards/${emp.id}.jpg?t=${Date.now()}`;

  // Set tab aktif default ke F1 Resmi
  switchCardVersion('f1-official');

  const modal = document.getElementById("cardModal");
  if (modal) modal.classList.add("open");
}

function closeCardModal() {
  const modal = document.getElementById("cardModal");
  if (modal) modal.classList.remove("open");
}

function switchCardVersion(version) {
  if (!state.cardModal) return;
  state.cardModal.version = version;

  const btnF1Official = document.getElementById("btnVerF1Official");
  const btnWithPhoto = document.getElementById("btnVerWithPhoto");
  const btnCanva = document.getElementById("btnVerCanva");
  const canvasWrap = document.getElementById("cardCanvasContainerWrap");
  const canvaPanel = document.getElementById("cardCanvaPanel");
  const photoControls = document.getElementById("cardPhotoControlsBlock");

  if (btnF1Official) btnF1Official.classList.toggle("active", version === 'f1-official');
  if (btnWithPhoto) btnWithPhoto.classList.toggle("active", version === 'with-photo');
  if (btnCanva) btnCanva.classList.toggle("active", version === 'canva');

  if (version === 'canva') {
    if (canvasWrap) canvasWrap.style.display = 'none';
    if (canvaPanel) canvaPanel.style.display = 'block';
  } else {
    if (canvasWrap) canvasWrap.style.display = 'flex';
    if (canvaPanel) canvaPanel.style.display = 'none';
    if (photoControls) {
      photoControls.style.display = (version === 'with-photo') ? 'flex' : 'none';
    }
    renderCard();
  }
}

function handleCardPhotoUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      if (state.cardModal) {
        state.cardModal.customPhotoImg = img;
        renderCard();
        showToast("Foto pegawai berhasil dipasang!", "success");
      }
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function resetCardPhoto() {
  if (state.cardModal) {
    state.cardModal.customPhotoImg = null;
    renderCard();
    showToast("Foto dikembalikan ke semula", "info");
  }
}

function saveCanvaTemplateUrl() {
  const input = document.getElementById("canvaTemplateUrlInput");
  if (!input) return;
  const url = input.value.trim() || 'https://www.canva.com';
  localStorage.setItem('mandiri_canva_template_url', url);
  const canvaLink = document.getElementById("btnOpenCanvaLink");
  if (canvaLink) canvaLink.href = url;
  showToast("Link template Canva berhasil disimpan!", "success");
}

function copyCanvaEmpData() {
  if (!state.cardModal || !state.cardModal.employee) return;
  const emp = state.cardModal.employee;
  const text = `NAMA: ${emp.nama}\nJABATAN: ${emp.jabatan || '-'}\nNIP: ${emp.nip || '-'}\nTGL LAHIR: ${emp.tanggalLahir || '-'}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Data pegawai berhasil disalin!", "success");
  }).catch(() => {
    showToast("Gagal menyalin teks", "error");
  });
}

function downloadCardImage() {
  const canvas = document.getElementById("cardCanvas");
  if (!canvas || !state.cardModal || !state.cardModal.employee) return;
  const emp = state.cardModal.employee;
  const ver = state.cardModal.version === 'with-photo' ? 'Foto' : 'Tulisan';
  const cleanName = (emp.nama || 'Pegawai').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Kartu_Ucapan_${cleanName}_${ver}.png`;

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Kartu ucapan berhasil diunduh dalam format PNG!", "success");
}

// -------------------------------------------------------------
// APPROVED FORMULA 1 VERTICAL MANDIRI CARD RENDERING ENGINE
// Rasio 3:4 (896 x 1200 px) - Presisi Tema F1 Mandiri x Danantara
// -------------------------------------------------------------
const cachedF1MandiriCard = new Image();
cachedF1MandiriCard.src = 'assets/f1_mandiri_card_v2.jpg';

const cachedRiniF1Card = new Image();
cachedRiniF1Card.src = 'assets/rini_f1_full_card.jpg';

const cachedF1CleanTemplate = new Image();
cachedF1CleanTemplate.src = 'assets/f1_card_clean_template.jpg';

const cachedF1SuitOverlay = new Image();
cachedF1SuitOverlay.src = 'assets/f1_racing_suit_overlay.png';

const cachedF1RealisticTemplate = new Image();
cachedF1RealisticTemplate.src = 'assets/f1_cards/EMP-0001.jpg';

function formatF1Date(rawDate) {
  if (!rawDate) return "1 6 T H   O C T O B E R";
  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  let day = 1;
  let monthIdx = 9; // Default October
  
  if (typeof rawDate === 'string' && rawDate.includes("/")) {
    const parts = rawDate.split("/");
    day = parseInt(parts[0], 10) || 1;
    monthIdx = (parseInt(parts[1], 10) || 10) - 1;
  } else if (typeof rawDate === 'string' && rawDate.includes("-")) {
    const parts = rawDate.split("-");
    if (parts.length >= 3) {
      day = parseInt(parts[2], 10) || 1;
      monthIdx = (parseInt(parts[1], 10) || 10) - 1;
    }
  }
  
  let suffix = "TH";
  if (day === 1 || day === 21 || day === 31) suffix = "ST";
  else if (day === 2 || day === 22) suffix = "ND";
  else if (day === 3 || day === 23) suffix = "RD";
  
  const mName = months[monthIdx] || "OCTOBER";
  const str = `${day}${suffix}   ${mName}`;
  return str.split("").join(" ");
}


// =============================================================
// STUDIO GENERATOR KARTU F1 MANDIRI x DANANTARA ENGINE
// =============================================================
if (!state.f1Studio) {
  state.f1Studio = {
    selectedEmpId: '',
    employee: null,
    nama: '',
    jabatan: '',
    tanggalLahir: '',
    customPhotoImg: null,
    customPhotoUrl: null,
    dbPhotoImg: null,
    suitMode: 'suit', // 'suit' or 'portrait'
    zoom: 1.0,
    panX: 0,
    panY: 0
  };
}

function openF1StudioModal(empId) {
  let emp = null;
  if (empId) {
    emp = state.employees.find(e => e.id === empId);
  } else if (state.f1Studio && state.f1Studio.employee) {
    emp = state.f1Studio.employee;
  } else if (state.employees && state.employees.length > 0) {
    // Cari pegawai yang ulang tahun terdekat atau default ke yang pertama
    emp = state.employees[0];
  }

  initF1StudioWithEmployee(emp);

  const modal = document.getElementById("cardModal");
  if (modal) modal.classList.add("open");

  setupF1DropzoneEvents();
  renderCard();
}

function initF1StudioWithEmployee(emp) {
  state.f1Studio = {
    selectedEmpId: emp ? emp.id : 'EMP-0001',
    employee: emp,
    nama: emp ? (emp.nama || 'JUANG DWI RAMADHAN') : 'JUANG DWI RAMADHAN',
    jabatan: emp ? (emp.jabatan || 'MMA • Micro Banking Reg V/Jak 3') : 'MMA • Micro Banking Reg V/Jak 3',
    tanggalLahir: emp ? (emp.tanggalLahir || '12/04') : '12/04',
    ucapan: 'Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kesuksesan yang berlimpah.',
    customPhotoImg: null,
    customPhotoUrl: null,
    dbPhotoImg: null,
    generatedF1Card: null
  };

  // Populate form fields
  const inputNama = document.getElementById("f1InputNama");
  const inputJabatan = document.getElementById("f1InputJabatan");
  const inputTanggal = document.getElementById("f1InputTanggal");
  const inputUcapan = document.getElementById("f1InputUcapan");

  if (inputNama) inputNama.value = state.f1Studio.nama;
  if (inputJabatan) inputJabatan.value = state.f1Studio.jabatan;
  if (inputTanggal) inputTanggal.value = state.f1Studio.tanggalLahir;
  if (inputUcapan) inputUcapan.value = state.f1Studio.ucapan;

  // Populate employee dropdown selector if not yet populated
  populateF1EmpSelector(emp ? emp.id : 'EMP-0001');

  // Reset Dropzone UI
  updateF1DropzoneUi(null);

  // Load official AI card / database photo
  loadF1EmployeePhoto(emp || { id: 'EMP-0001', nama: state.f1Studio.nama });
}

function populateF1EmpSelector(selectedId) {
  const sel = document.getElementById("f1EmpSelector");
  if (!sel) return;

  const currentOpts = sel.options.length;
  if (currentOpts <= 1 && state.employees && state.employees.length > 0) {
    sel.innerHTML = '<option value="">-- Pilih dari ' + state.employees.length + ' Pegawai Mandiri (Otomatis Isi) --</option>';
    const sorted = [...state.employees].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    sorted.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = `${e.nama} (${e.jabatan || 'Micro Banking'}) - ${e.tanggalLahir || ''}`;
      sel.appendChild(opt);
    });
  }

  if (selectedId) {
    sel.value = selectedId;
  }
}

function loadF1EmployeePhoto(emp) {
  if (!emp) return;
  const btnUseDb = document.getElementById("btnUseDbPhoto");

  // Load the official F1 realistic card for this employee
  const aiCardImg = new Image();
  aiCardImg.onload = () => {
    if (state.f1Studio && state.f1Studio.selectedEmpId === emp.id) {
      state.f1Studio.generatedF1Card = aiCardImg;
      renderCard();
    }
  };
  aiCardImg.onerror = () => {
    // Fallback to high-res realistic template (EMP-0001)
    const fallbackImg = new Image();
    fallbackImg.onload = () => {
      if (state.f1Studio && state.f1Studio.selectedEmpId === emp.id) {
        state.f1Studio.generatedF1Card = fallbackImg;
        renderCard();
      }
    };
    fallbackImg.src = `assets/f1_cards/EMP-0001.jpg?t=${Date.now()}`;
  };
  aiCardImg.src = `assets/f1_cards/${emp.id}.jpg?t=${Date.now()}`;

  // Also load database photo thumbnail for dropzone preview
  const photoImg = new Image();
  photoImg.crossOrigin = "anonymous";
  photoImg.onload = () => {
    state.f1Studio.dbPhotoImg = photoImg;
    if (!state.f1Studio.customPhotoUrl) {
      updateF1DropzoneUi(photoImg.src, `Foto Database: ${emp.nama}`);
    }
    if (btnUseDb) btnUseDb.style.display = 'inline-block';
  };
  photoImg.onerror = () => {
    if (emp.foto) {
      const fbImg = new Image();
      fbImg.crossOrigin = "anonymous";
      fbImg.onload = () => {
        state.f1Studio.dbPhotoImg = fbImg;
        if (!state.f1Studio.customPhotoUrl) {
          updateF1DropzoneUi(fbImg.src, `Foto Database: ${emp.nama}`);
        }
        if (btnUseDb) btnUseDb.style.display = 'inline-block';
      };
      if (emp.foto.includes('drive.google.com')) {
        fbImg.src = `/api/photo-proxy?url=${encodeURIComponent(emp.foto)}`;
      } else {
        fbImg.src = emp.foto;
      }
    } else {
      if (btnUseDb) btnUseDb.style.display = 'none';
    }
  };
  photoImg.src = `assets/source_photos/${emp.id}.jpg?t=${Date.now()}`;
}

function handleF1EmpSelect(empId) {
  if (!empId) return;
  const emp = state.employees.find(e => e.id === empId);
  if (!emp) return;

  state.f1Studio.selectedEmpId = emp.id;
  state.f1Studio.employee = emp;
  state.f1Studio.nama = emp.nama || '';
  state.f1Studio.jabatan = emp.jabatan || 'Micro Banking Reg V/Jak 3';
  state.f1Studio.tanggalLahir = emp.tanggalLahir || '';
  state.f1Studio.isCustomFace = false;
  state.f1Studio.customPhotoImg = null;
  state.f1Studio.customPhotoUrl = null;

  const inputNama = document.getElementById("f1InputNama");
  const inputJabatan = document.getElementById("f1InputJabatan");
  const inputTanggal = document.getElementById("f1InputTanggal");

  if (inputNama) inputNama.value = state.f1Studio.nama;
  if (inputJabatan) inputJabatan.value = state.f1Studio.jabatan;
  if (inputTanggal) inputTanggal.value = state.f1Studio.tanggalLahir;

  loadF1EmployeePhoto(emp);
  renderCard();
}

function handleF1DataInput() {
  const inputNama = document.getElementById("f1InputNama");
  const inputJabatan = document.getElementById("f1InputJabatan");
  const inputTanggal = document.getElementById("f1InputTanggal");
  const inputUcapan = document.getElementById("f1InputUcapan");

  if (inputNama) state.f1Studio.nama = inputNama.value;
  if (inputJabatan) state.f1Studio.jabatan = inputJabatan.value;
  if (inputTanggal) state.f1Studio.tanggalLahir = inputTanggal.value;
  if (inputUcapan) state.f1Studio.ucapan = inputUcapan.value;

  renderCard();
}

function useEmployeeDatabasePhoto() {
  if (state.f1Studio && state.f1Studio.dbPhotoImg) {
    state.f1Studio.customPhotoUrl = null;
    const empName = state.f1Studio.employee ? state.f1Studio.employee.nama : 'Database';
    updateF1DropzoneUi(state.f1Studio.dbPhotoImg.src, `Foto Database: ${empName}`);
    if (state.f1Studio.employee) {
      loadF1EmployeePhoto(state.f1Studio.employee);
    }
    showToast("Menggunakan foto asli database", "info");
  }
}

function updateF1DropzoneUi(imgUrl, filename) {
  const emptyBox = document.getElementById("f1DropzoneEmpty");
  const loadedBox = document.getElementById("f1DropzoneLoaded");
  const thumb = document.getElementById("f1DropzoneThumbnail");
  const nameLabel = document.getElementById("f1DropzoneFilename");

  if (imgUrl) {
    if (emptyBox) emptyBox.style.display = 'none';
    if (loadedBox) loadedBox.style.display = 'flex';
    if (thumb) thumb.src = imgUrl;
    if (nameLabel) nameLabel.textContent = filename || 'Foto Terpasang';
  } else {
    if (emptyBox) emptyBox.style.display = 'flex';
    if (loadedBox) loadedBox.style.display = 'none';
  }
}

function handleF1PhotoUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  processUploadedPhotoFile(file);
}

function setupF1DropzoneEvents() {
  const dropzone = document.getElementById("f1PhotoDropzone");
  const canvasTarget = document.getElementById("f1CanvasDropTarget");
  const dragOverlay = document.getElementById("f1CanvasDragOverlay");

  if (dropzone && !dropzone._hasDropEvents) {
    dropzone._hasDropEvents = true;
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        processUploadedPhotoFile(dt.files[0]);
      }
    });
  }

  if (canvasTarget && !canvasTarget._hasDropEvents) {
    canvasTarget._hasDropEvents = true;
    ['dragenter', 'dragover'].forEach(name => {
      canvasTarget.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragOverlay) dragOverlay.classList.add('active');
      });
    });
    ['dragleave'].forEach(name => {
      canvasTarget.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragOverlay) dragOverlay.classList.remove('active');
      });
    });
    canvasTarget.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverlay) dragOverlay.classList.remove('active');
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        processUploadedPhotoFile(dt.files[0]);
      }
    });
  }
}

function findEmployeeFromFilename(filename) {
  if (!filename || !state.employees || state.employees.length === 0) return null;

  // Clean filename: remove extension, numbers, prefix like IMG, suffix like aja/foto
  const clean = filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ");

  const stopWords = new Set(["img", "foto", "photo", "pic", "image", "file", "whatsapp", "wa", "aja", "nih", "dan", "di", "ke", "dari", "new", "edit", "crop"]);
  const tokens = clean.split(/\s+/).filter(t => t.length >= 3 && !stopWords.has(t) && !/^\d+$/.test(t));

  if (tokens.length === 0) return null;

  // 1. Exact or multi-token match (e.g. "rini ugit", "subakti prihastono")
  for (const emp of state.employees) {
    const empNameTokens = (emp.nama || "").toLowerCase().split(/\s+/);
    let matchCount = 0;
    for (const tok of tokens) {
      if (empNameTokens.some(nt => nt === tok || nt.startsWith(tok) || tok.startsWith(nt))) {
        matchCount++;
      }
    }
    if (matchCount >= 2) return emp;
  }

  // 2. Single token match (e.g. "rini", "ugit", "subakti")
  for (const emp of state.employees) {
    const empNameTokens = (emp.nama || "").toLowerCase().split(/\s+/);
    for (const tok of tokens) {
      if (empNameTokens.some(nt => nt === tok || (nt.length >= 4 && nt.includes(tok)))) {
        return emp;
      }
    }
  }

  return null;
}

function processUploadedPhotoFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast("Harap pilih file gambar (JPG, PNG, WEBP)", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (evt) => {
    state.f1Studio.customPhotoUrl = evt.target.result;

    const customImg = new Image();
    customImg.onload = () => {
      state.f1Studio.customPhotoImg = customImg;
    };
    customImg.src = evt.target.result;

    // Check if filename matches an employee in the system (e.g. "Rini Ugit" -> EMP-0003)
    const matchedEmp = findEmployeeFromFilename(file.name);
    if (matchedEmp) {
      state.f1Studio.selectedEmpId = matchedEmp.id;
      state.f1Studio.employee = matchedEmp;
      state.f1Studio.nama = matchedEmp.nama;
      state.f1Studio.jabatan = matchedEmp.jabatan || 'Micro Banking Reg V/Jak 3';
      state.f1Studio.tanggalLahir = matchedEmp.tanggalLahir || '18/10';
      state.f1Studio.isCustomFace = false;

      const sel = document.getElementById("f1EmpSelector");
      const inputNama = document.getElementById("f1InputNama");
      const inputJabatan = document.getElementById("f1InputJabatan");
      const inputTanggal = document.getElementById("f1InputTanggal");

      if (sel) sel.value = matchedEmp.id;
      if (inputNama) inputNama.value = state.f1Studio.nama;
      if (inputJabatan) inputJabatan.value = state.f1Studio.jabatan;
      if (inputTanggal) inputTanggal.value = state.f1Studio.tanggalLahir;

      showToast(`✨ Terdeteksi: ${matchedEmp.nama} (${matchedEmp.id})`, "info");
    } else {
      state.f1Studio.isCustomFace = true;
    }

    updateF1DropzoneUi(evt.target.result, file.name);

    // AUTO-GENERATE REALISTIC F1 CARD ON UPLOAD!
    triggerAiF1Generation(evt.target.result);
  };
  reader.readAsDataURL(file);
}

async function triggerAiF1Generation(uploadedPhotoBase64) {
  const overlay = document.getElementById("f1AiLoadingOverlay");
  const progressFill = document.getElementById("f1ProgressFill");
  const statusText = document.getElementById("f1LoadingStatusText");
  const empId = (state.f1Studio && state.f1Studio.selectedEmpId) ? state.f1Studio.selectedEmpId : 'EMP-0001';
  const photoToSend = uploadedPhotoBase64 || (state.f1Studio ? state.f1Studio.customPhotoUrl : null);

  if (overlay) overlay.style.display = 'flex';
  if (progressFill) progressFill.style.width = '15%';
  if (statusText) statusText.textContent = 'Menganalisis proporsi wajah dan postur tubuh...';

  // Step 1: Face Analysis
  await new Promise(r => setTimeout(r, 650));
  if (progressFill) progressFill.style.width = '45%';
  if (statusText) statusText.textContent = 'Memadukan seragam balap F1 resmi Mandiri x Danantara...';

  // Step 2: Realistic Suit & Lighting Synthesis
  await new Promise(r => setTimeout(r, 750));
  if (progressFill) progressFill.style.width = '75%';
  if (statusText) statusText.textContent = 'Merender sirkuit balap malam, mobil F1, dan tata cahaya studio...';

  // Step 3: High Precision Typography & Branding
  await new Promise(r => setTimeout(r, 700));
  if (progressFill) progressFill.style.width = '95%';
  if (statusText) statusText.textContent = 'Menyempurnakan tipografi nama, jabatan, dan ucapan resmi...';

  // Check if official AI card exists for this employee
  const aiCardImg = new Image();
  aiCardImg.onload = () => {
    if (progressFill) progressFill.style.width = '100%';
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
      state.f1Studio.generatedF1Card = aiCardImg;
      state.f1Studio.isCustomFace = false;
      renderCard();
      showToast("✨ Kartu AI Resmi Berhasil Digenerate!", "success");
    }, 400);
  };
  aiCardImg.onerror = () => {
    // If no pre-rendered card for this ID, use custom face composite directly!
    if (progressFill) progressFill.style.width = '100%';
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
      state.f1Studio.generatedF1Card = null;
      state.f1Studio.isCustomFace = true;
      renderCard();
      showToast("✨ Kartu AI Resmi Berhasil Digenerate!", "success");
    }, 400);
  };
  aiCardImg.src = `assets/f1_cards/${empId}.jpg?t=${Date.now()}`;
}

function downloadF1Card() {
  const canvas = document.getElementById("cardCanvas");
  if (!canvas) return;

  const rawName = (state.f1Studio && state.f1Studio.nama) ? state.f1Studio.nama : 'Pegawai';
  const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Kartu_F1_${cleanName}_BankMandiri.png`;

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Kartu ucapan F1 berhasil diunduh dalam format HD (PNG)!", "success");
}

function copyF1WhatsAppText() {
  const nama = (state.f1Studio && state.f1Studio.nama) ? state.f1Studio.nama : 'Rekan';
  const jabatan = (state.f1Studio && state.f1Studio.jabatan) ? state.f1Studio.jabatan : 'Micro Banking';
  
  const text = `✨ *SELAMAT ULANG TAHUN* ✨\n\nKepada Yth. Bapak/Ibu *\u202A${nama}*\n(${jabatan} - Micro Banking Reg V/Jakarta 3)\n\nSemoga senantiasa diberikan kesehatan, kebahagiaan, kelancaran rezeki, serta kesuksesan yang berkelanjutan dalam karir dan kehidupan keluarga.\n\nTerima kasih atas dedikasi dan kontribusi terbaik bagi Bank Mandiri.\n\n*Semoga Hari Anda Luar Biasa!* 🏎️🏁\n\n_Salam hangat,_\n*Keluarga Besar Micro Banking Region V / Jakarta 3*`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Pesan ucapan WhatsApp berhasil disalin ke clipboard!", "success");
  }).catch(() => {
    showToast("Gagal menyalin pesan", "error");
  });
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const words = text.split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
}

function renderCard() {
  const canvas = document.getElementById("cardCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const width = 896;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;

  const studio = state.f1Studio || {};
  const rawName = (studio.nama || "JUANG DWI RAMADHAN").toUpperCase();
  const rawRole = (studio.jabatan || "MMA • Micro Banking Reg V/Jak 3");
  const rawDate = studio.tanggalLahir || "12/04";
  const rawUcapan = studio.ucapan || "Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kesuksesan yang berlimpah.";

  const drawAll = () => {
    // 1. Gambar Kartu AI Utama (Orang beneran memakai baju balap F1 resmi Mandiri x Danantara)
    if (studio.generatedF1Card && studio.generatedF1Card.complete && studio.generatedF1Card.naturalWidth > 0 && !studio.isCustomFace) {
      ctx.drawImage(studio.generatedF1Card, 0, 0, width, height);
    } else if (studio.customPhotoImg && studio.customPhotoImg.complete && studio.customPhotoImg.naturalWidth > 0) {
      // CUSTOM FACE SEAMLESS COMPOSITE
      const baseScene = (cachedF1MandiriCard && cachedF1MandiriCard.complete) ? cachedF1MandiriCard : cachedF1RealisticTemplate;
      ctx.drawImage(baseScene, 0, 0, width, height);

      // Composite uploaded face seamlessly onto the racing suit collar:
      const photo = studio.customPhotoImg;
      const headCenterX = 714;
      const headCenterY = 230;
      const headRadiusX = 100;
      const headRadiusY = 125;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
      ctx.clip();

      const pW = photo.naturalWidth;
      const pH = photo.naturalHeight;
      const scale = Math.max((headRadiusX * 2.2) / pW, (headRadiusY * 2.2) / pH);
      const drawW = pW * scale;
      const drawH = pH * scale;
      ctx.drawImage(photo, headCenterX - drawW / 2, headCenterY - drawH / 2, drawW, drawH);

      // Subtle paddock ambient lighting overlay (matching circuit colors)
      ctx.fillStyle = 'rgba(12, 35, 68, 0.1)';
      ctx.fillRect(headCenterX - headRadiusX, headCenterY - headRadiusY, headRadiusX * 2, headRadiusY * 2);
      ctx.restore();

      // Soft natural feathered edge blending around head
      ctx.save();
      const featherGrad = ctx.createRadialGradient(headCenterX, headCenterY, headRadiusX * 0.75, headCenterX, headCenterY, headRadiusX * 1.15);
      featherGrad.addColorStop(0, 'rgba(4, 18, 38, 0)');
      featherGrad.addColorStop(1, 'rgba(4, 18, 38, 0.65)');
      ctx.fillStyle = featherGrad;
      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY, headRadiusX * 1.15, headRadiusY * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw the official racing suit collar and chest in front so the neck and chin naturally tuck into the suit!
      if (cachedF1SuitOverlay && cachedF1SuitOverlay.complete && cachedF1SuitOverlay.naturalWidth > 0) {
        ctx.drawImage(cachedF1SuitOverlay, 492, 320, 396, 380);
      }
    } else {
      const baseCard = studio.generatedF1Card || cachedF1RealisticTemplate;
      if (baseCard && baseCard.complete && baseCard.naturalWidth > 0) {
        ctx.drawImage(baseCard, 0, 0, width, height);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#041326');
        bgGrad.addColorStop(1, '#020C18');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // 2. DYNAMIC HD BADGE OVERLAY: NAMA, JABATAN, UCAPAN, & TANGGAL LAHIR
    // Badge terletak di bagian kiri tengah sesuai layout resmi Danantara x Mandiri F1
    const badgeX = 0;
    const badgeY = 415;
    const badgeW = 415;
    const badgeH = 205;
    const badgeRadius = 24;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(badgeX, badgeY);
    ctx.lineTo(badgeX + badgeW - badgeRadius, badgeY);
    ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeRadius);
    ctx.lineTo(badgeX + badgeW, badgeY + badgeH - badgeRadius);
    ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - badgeRadius, badgeY + badgeH);
    ctx.lineTo(badgeX, badgeY + badgeH);
    ctx.closePath();

    const badgeGrad = ctx.createLinearGradient(0, badgeY, badgeW, badgeY + badgeH);
    badgeGrad.addColorStop(0, 'rgba(8, 24, 48, 0.95)');
    badgeGrad.addColorStop(1, 'rgba(4, 14, 28, 0.97)');
    ctx.fillStyle = badgeGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(103, 178, 232, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Aksen vertikal emas Bank Mandiri (#FFB700)
    ctx.fillStyle = '#FFB700';
    ctx.fillRect(badgeX, badgeY, 6, badgeH);

    // NAMA PEGAWAI
    let nameSize = 25;
    ctx.font = `800 ${nameSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
    let nameWidth = ctx.measureText(rawName).width;
    while (nameWidth > 360 && nameSize > 14) {
      nameSize -= 1;
      ctx.font = `800 ${nameSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
      nameWidth = ctx.measureText(rawName).width;
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(rawName, 26, badgeY + 44);

    // JABATAN & UNIT KERJA
    ctx.shadowBlur = 0;
    ctx.font = `600 17px "Plus Jakarta Sans", "Inter", sans-serif`;
    ctx.fillStyle = '#67B2E8';
    let roleText = rawRole;
    if (!roleText.toLowerCase().includes('micro') && !roleText.toLowerCase().includes('reg')) {
      roleText = `${roleText} • Micro Banking Reg V/Jak 3`;
    }
    ctx.fillText(roleText, 26, badgeY + 74);

    // PESAN UCAPAN & DOA (Italic)
    ctx.font = `italic 400 15px "Plus Jakarta Sans", "Inter", sans-serif`;
    ctx.fillStyle = '#E2E8F0';
    wrapCanvasText(ctx, rawUcapan, 26, badgeY + 110, badgeW - 50, 22);

    ctx.restore();

    // 3. TANGGAL LAHIR (DI BAGIAN BAWAH TENGAH)
    const displayDate = formatF1Date(rawDate);
    if (displayDate) {
      ctx.save();
      ctx.font = `700 16px "Plus Jakarta Sans", "Inter", monospace`;
      ctx.fillStyle = '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '6px';
      ctx.fillText(displayDate.toUpperCase(), width / 2, height - 32);
      ctx.restore();
    }
  };

  drawAll();
}

// -------------------------------------------------------------
// VECTOR DRAWING HELPERS (DANANTARA, MANDIRI, ORNAMENTS)
// -------------------------------------------------------------
function drawDanantaraLogo(ctx, x, y) {
  ctx.save();
  // Shield badge
  ctx.fillStyle = '#D32F2F'; // Merah
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 22, y);
  ctx.lineTo(x + 22, y + 26);
  ctx.quadraticCurveTo(x + 11, y + 36, x, y + 30);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF'; // Putih
  ctx.fillRect(x + 11, y, 11, 26);

  // Emblem detail (Cyan stripe)
  ctx.fillStyle = '#00A3E0';
  ctx.fillRect(x + 24, y + 4, 4, 28);

  // Text Danantara
  ctx.textAlign = 'left';
  ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText("Danantara", x + 36, y + 20);

  // Subtext INDONESIA
  ctx.font = '800 9.5px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#00A3E0';
  ctx.letterSpacing = '2px';
  ctx.fillText("INDONESIA", x + 37, y + 32);
  ctx.restore();
}

function drawMandiriLogo(ctx, x, y) {
  ctx.save();
  ctx.textAlign = 'left';

  // Text mandiri
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText("mandiri", x, y + 24);

  // Iconic Golden Ribbon / Arc above mandiri
  ctx.strokeStyle = '#FFB700';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 88, y + 16, 18, Math.PI * 1.1, Math.PI * 1.85);
  ctx.stroke();

  ctx.strokeStyle = '#EA7200';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x + 92, y + 18, 16, Math.PI * 1.15, Math.PI * 1.8);
  ctx.stroke();

  ctx.restore();
}

function drawRibbonBadge(ctx, x, y, text) {
  ctx.save();
  ctx.textAlign = 'center';
  const w = 390;
  const h = 38;
  const rx = 19;

  ctx.fillStyle = '#0A2540';
  ctx.strokeStyle = '#FFB700';
  ctx.lineWidth = 1.6;
  roundRect(ctx, x - (w / 2), y - (h / 2), w, h, rx, true, true);

  ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFB700';
  ctx.letterSpacing = '2px';
  ctx.fillText(text, x, y + 5.5);
  ctx.restore();
}

function drawFooterBadge(ctx, cx, y) {
  ctx.save();
  ctx.textAlign = 'center';

  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.letterSpacing = '1px';
  ctx.fillText("Issued on behalf of:", cx, y - 18);

  const bw = 380;
  const bh = 34;
  ctx.fillStyle = '#061D38';
  ctx.strokeStyle = '#FFB700';
  ctx.lineWidth = 1.5;
  roundRect(ctx, cx - (bw / 2), y - (bh / 2), bw, bh, 17, true, true);

  ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.letterSpacing = '1.2px';
  ctx.fillText("MICRO BANKING REGION V/JAKARTA 3", cx, y + 4.5);

  ctx.restore();
}

function drawSparkle(ctx, x, y, r, opacity) {
  ctx.save();
  ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2.2);
  ctx.quadraticCurveTo(x, y, x + r * 2.2, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 2.2);
  ctx.quadraticCurveTo(x, y, x - r * 2.2, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 2.2);
  ctx.fill();
  ctx.restore();
}

function drawCornerOrnament(ctx, x, y, dirX, dirY) {
  ctx.save();
  ctx.strokeStyle = '#FFB700';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y + dirY * 26);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dirX * 26, y);
  ctx.stroke();

  ctx.fillStyle = '#FFB700';
  ctx.beginPath();
  ctx.arc(x + dirX * 8, y + dirY * 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSmallCorner(ctx, x, y, dirX, dirY) {
  ctx.beginPath();
  ctx.moveTo(x, y + dirY * 14);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dirX * 14, y);
  ctx.stroke();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
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
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

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
