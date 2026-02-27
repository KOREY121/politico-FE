// ══════════════════════════════════════════════
// SHARED DATA STORE & UTILITIES
// ══════════════════════════════════════════════

// ⬆ Bump this number every time you change initDB() data below.
// The browser will discard the old localStorage and load your fresh data.
const DB_VERSION = 3;

function initDB() {
  return {
    voters: [
      { id: 1, nationalId: 'NID001', fullName: 'Amara Osei', dob: '1990-05-14', email: 'amara@email.com', password: 'pass123', status: 'active' },
      { id: 2, nationalId: 'NID002', fullName: 'Kofi Mensah', dob: '1985-11-22', email: 'kofi@email.com', password: 'pass123', status: 'active' },
      { id: 3, nationalId: 'NID003', fullName: 'Yaa Asantewaa', dob: '1995-03-08', email: 'yaa@email.com', password: 'pass123', status: 'inactive' },
    ],
    elections: [
      { id: 1, startDate: '2026-02-01', endDate: '2026-02-28', status: 'active' },
      { id: 2, startDate: '2026-03-15', endDate: '2026-03-25', status: 'pending' },
      { id: 3, startDate: '2025-12-01', endDate: '2025-12-15', status: 'closed' },
    ],
    constituencies: [
      { id: 1, name: 'Central Lagos', region: 'Lagos' },
      { id: 2, name: 'Abuja', region: 'Abj' },
      { id: 3, name: 'Port-Harcot', region: 'Rivers' },
    ],
    candidates: [
      { id: 1, fullName: 'Bola Ahmed Tinubu', party: 'APC', electionId: 1, constituencyId: 1 },
      { id: 2, fullName: 'Atiku Abubakar', party: 'PDP', electionId: 1, constituencyId: 2 },
      { id: 3, fullName: 'Peter Obi', party: 'ADC', electionId: 1, constituencyId: 3 },
      { id: 4, fullName: 'Mohammed Buhari', party: 'CPC', electionId: 1, constituencyId: 2 },
      { id: 5, fullName: 'Nyesome Wike', party: 'SDP', electionId: 1, constituencyId: 2 },
      { id: 6, fullName: 'Aliko Dangote', party: 'NNPC', electionId: 3, constituencyId: 3 },
      { id: 7, fullName: 'Babajide Sanwoolu', party: 'AIT', electionId: 3, constituencyId: 3 },
    ],
    votes: [
      { id: 1, voterId: 2, candidateId: 1, electionId: 1, time: '2026-02-10T09:14:22Z' },
      { id: 2, voterId: 1, candidateId: 6, electionId: 3, time: '2025-12-05T11:30:00Z' },
    ],
    nextVoterId: 4,
    nextElectionId: 4,
    nextCandidateId: 8,
    nextConstituencyId: 4,
    nextVoteId: 3,
  };
}

function getDB() {
  const storedVersion = parseInt(localStorage.getItem('evoteDB_version') || '0');
  const stored = localStorage.getItem('evoteDB');

  // If no data yet, OR version is outdated → load fresh seed data
  if (!stored || storedVersion !== DB_VERSION) {
    const fresh = initDB();
    localStorage.setItem('evoteDB', JSON.stringify(fresh));
    localStorage.setItem('evoteDB_version', String(DB_VERSION));
    return fresh;
  }

  return JSON.parse(stored);
}

function saveDB(db) {
  localStorage.setItem('evoteDB', JSON.stringify(db));
}

function getSession() {
  const s = sessionStorage.getItem('evoteSession');
  return s ? JSON.parse(s) : null;
}

function setSession(data) {
  sessionStorage.setItem('evoteSession', JSON.stringify(data));
}

function clearSession() {
  sessionStorage.removeItem('evoteSession');
}

function requireVoterAuth() {
  const session = getSession();
  if (!session || session.role !== 'voter') {
    window.location.href = 'index.html';
    return null;
  }
  const db = getDB();
  return db.voters.find(v => v.id === session.id) || null;
}

function requireAdminAuth() {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function toast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.borderLeftColor = type === 'error' ? 'var(--danger)' : 'var(--gold)';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

function badgeHTML(status) {
  const map = { active: 'badge-active', inactive: 'badge-inactive', pending: 'badge-pending', closed: 'badge-closed' };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`;
}

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
