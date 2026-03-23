import { useState, useEffect, useRef } from 'react';
import { electionsAPI, candidatesAPI, constituenciesAPI, votesAPI, adminAPI } from '../api/api';
import Navbar from '../components/Navbar';
import Modal  from '../components/Modal';
import Toast  from '../components/Toast';

function initials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

export default function AdminPage() {
  const toastRef = useRef();

  const [activeTab,      setActiveTab]      = useState('elections');
  const [elections,      setElections]      = useState([]);
  const [candidates,     setCandidates]     = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [voters,         setVoters]         = useState([]);
  const [voteLog,        setVoteLog]        = useState([]);
  const [voteLogTotal,   setVoteLogTotal]   = useState(0);
  const [candFilter,     setCandFilter]     = useState('');
  const [voteFilter,     setVoteFilter]     = useState('');
  const [voterSearch,    setVoterSearch]    = useState('');

  // Modal states
  const [elecModal,   setElecModal]   = useState(false);
  const [candModal,   setCandModal]   = useState(false);
  const [constModal,  setConstModal]  = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, type: '', id: null, msg: '' });

  // Form states
  const [elecForm,  setElecForm]  = useState({ start_date: '', end_date: '', status: 'pending' });
  const [candForm,  setCandForm]  = useState({ full_name: '', party: '', election: '', constituency: '' });
  const [constForm, setConstForm] = useState({ name: '', region: '' });

  useEffect(() => { loadAll(); }, []);

  // ── LOAD ALL DATA ──
  async function loadAll() {
    try {
      const [e, ca, co, v] = await Promise.all([
        electionsAPI.list().then(r => r.json()),
        candidatesAPI.list().then(r => r.json()),
        constituenciesAPI.list().then(r => r.json()),
        adminAPI.voters().then(r => r.json()),
      ]);
      setElections(e);
      setCandidates(ca);
      setConstituencies(co);
      setVoters(v);

      const logRes  = await votesAPI.auditLog();
      const logData = await logRes.json();
      setVoteLog(logData.votes || []);
      setVoteLogTotal(logData.total || 0);
    } catch {
      toastRef.current?.show('Failed to load data.', 'error');
    }
  }

  // ── STATS ──
  const stats = {
    voters:          voters.length,
    activeVoters:    voters.filter(v => v.status === 'active').length,
    elections:       elections.length,
    activeElections: elections.filter(e => e.status === 'active').length,
    candidates:      candidates.length,
    constituencies:  constituencies.length,
    votes:           voteLogTotal,
    turnout:         voters.filter(v => v.status === 'active').length > 0
      ? Math.round([...new Set(voteLog.map(v => v.voter_national_id))].length /
          voters.filter(v => v.status === 'active').length * 100)
      : 0,
  };

  // ── FILTERED DATA ──
  const filteredCandidates = candFilter
    ? candidates.filter(c => c.election == candFilter)
    : candidates;

  const filteredVoteLog = voteFilter
    ? voteLog.filter(v => v.election_id == voteFilter)
    : voteLog;

  const filteredVoters = voterSearch
    ? voters.filter(v =>
        v.full_name.toLowerCase().includes(voterSearch.toLowerCase()) ||
        v.national_id.toLowerCase().includes(voterSearch.toLowerCase())
      )
    : voters;

  // ── ELECTION CRUD ──
  async function saveElection() {
    if (!elecForm.start_date || !elecForm.end_date) {
      return toastRef.current?.show('Please fill all fields', 'error');
    }
    const res = await electionsAPI.create(elecForm);
    if (res.ok) {
      toastRef.current?.show('Election created');
      setElecModal(false);
      setElecForm({ start_date: '', end_date: '', status: 'pending' });
      loadAll();
    } else {
      const d = await res.json();
      toastRef.current?.show(Object.values(d)[0] || 'Error', 'error');
    }
  }

  async function updateElectionStatus(id, status) {
    await electionsAPI.updateStatus(id, status);
    toastRef.current?.show('Status updated');
    loadAll();
  }

  // ── CANDIDATE CRUD ──
  async function saveCandidate() {
    if (!candForm.full_name || !candForm.party || !candForm.election || !candForm.constituency) {
      return toastRef.current?.show('Please fill all fields', 'error');
    }
    const res = await candidatesAPI.create(candForm);
    if (res.ok) {
      toastRef.current?.show('Candidate added');
      setCandModal(false);
      setCandForm({ full_name: '', party: '', election: '', constituency: '' });
      loadAll();
    } else {
      const d = await res.json();
      toastRef.current?.show(Object.values(d)[0] || 'Error', 'error');
    }
  }

  // ── CONSTITUENCY CRUD ──
  async function saveConstituency() {
    if (!constForm.name || !constForm.region) {
      return toastRef.current?.show('Please fill all fields', 'error');
    }
    const res = await constituenciesAPI.create(constForm);
    if (res.ok) {
      toastRef.current?.show('Constituency created');
      setConstModal(false);
      setConstForm({ name: '', region: '' });
      loadAll();
    } else {
      const d = await res.json();
      toastRef.current?.show(Object.values(d)[0] || 'Error', 'error');
    }
  }

  // ── VOTER ACTIONS ──
  async function toggleVoter(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await adminAPI.toggleVoter(id, newStatus);
    toastRef.current?.show(`Voter ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    loadAll();
  }

  // ── DELETE ──
  async function confirmDelete() {
    const { type, id } = deleteModal;
    try {
      if (type === 'election')     await electionsAPI.delete(id);
      if (type === 'candidate')    await candidatesAPI.delete(id);
      if (type === 'constituency') await constituenciesAPI.delete(id);
      setDeleteModal({ open: false, type: '', id: null, msg: '' });
      toastRef.current?.show('Deleted successfully');
      loadAll();
    } catch {
      toastRef.current?.show('Delete failed.', 'error');
    }
  }

  const TABS = [
    { key: 'elections',      label: '🗳 Elections',      count: elections.length },
    { key: 'candidates',     label: '👤 Candidates',     count: candidates.length },
    { key: 'voters',         label: '🏛 Voters',         count: voters.length },
    { key: 'constituencies', label: '📍 Constituencies', count: constituencies.length },
    { key: 'votelog',        label: '📋 Vote Log',       count: voteLogTotal },
  ];

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* PAGE HEADER */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Admin Dashboard</h1>
            <div className="sub">Manage elections, voters, candidates & constituencies</div>
          </div>
          <span className="badge badge-active" style={{ fontSize: '.72rem', padding: '6px 14px' }}>
            ⚙ Admin Access
          </span>
        </div>

        {/* STATS GRID */}
        <div className="stats-grid">
          {[
            ['Total Voters',     stats.voters],
            ['Active Voters',    stats.activeVoters],
            ['Elections',        stats.elections],
            ['Active Elections', stats.activeElections],
            ['Candidates',       stats.candidates],
            ['Constituencies',   stats.constituencies],
            ['Votes Cast',       stats.votes],
            ['Turnout Rate',     `${stats.turnout}%`],
          ].map(([label, val]) => (
            <div key={label} className="stat-card">
              <div className="stat-value">{val ?? '—'}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ADMIN LAYOUT */}
        <div className="admin-layout">

          {/* ── SIDEBAR ── */}
          <div className="sidebar">
            <div className="sidebar-title">Management</div>
            {TABS.map(t => (
              <button
                key={t.key}
                className={`sidebar-item ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
                <span className="count">{t.count}</span>
              </button>
            ))}
          </div>

          {/* ── MAIN PANEL ── */}
          <div>

            {/* ════ ELECTIONS ════ */}
            {activeTab === 'elections' && (
              <>
                <div className="action-bar">
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', letterSpacing: '2px' }}>Elections</div>
                  <div className="spacer"></div>
                  <button className="btn btn-primary" onClick={() => setElecModal(true)}>+ New Election</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Candidates</th><th>Votes</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {elections.length === 0
                        ? <tr><td colSpan="7"><div className="empty-state">No elections created yet.</div></td></tr>
                        : elections.map(e => (
                          <tr key={e.election_id}>
                            <td className="mono">#{e.election_id}</td>
                            <td>{e.start_date}</td>
                            <td>{e.end_date}</td>
                            <td>
                              <select
                                className="editable-select"
                                value={e.status}
                                onChange={ev => updateElectionStatus(e.election_id, ev.target.value)}>
                                <option value="pending">Pending</option>
                                <option value="active">Active</option>
                                <option value="closed">Closed</option>
                              </select>
                            </td>
                            <td className="mono">{e.total_candidates}</td>
                            <td className="mono">{e.total_votes}</td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setDeleteModal({ open: true, type: 'election', id: e.election_id, msg: 'Delete this election?' })}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ════ CANDIDATES ════ */}
            {activeTab === 'candidates' && (
              <>
                <div className="action-bar">
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', letterSpacing: '2px' }}>Candidates</div>
                  <div className="spacer"></div>
                  <select
                    value={candFilter}
                    onChange={e => setCandFilter(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '.78rem', border: '1.5px solid var(--border)', borderRadius: '3px', background: 'var(--paper)' }}>
                    <option value="">All Elections</option>
                    {elections.map(e => (
                      <option key={e.election_id} value={e.election_id}>
                        Election #{e.election_id} — {e.status}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={() => setCandModal(true)}>+ Add Candidate</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Name</th><th>Party</th><th>Election</th><th>Constituency</th><th>Votes</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.length === 0
                        ? <tr><td colSpan="7"><div className="empty-state">No candidates found.</div></td></tr>
                        : filteredCandidates.map(c => (
                          <tr key={c.candidate_id}>
                            <td className="mono">#{c.candidate_id}</td>
                            <td><strong>{c.full_name}</strong></td>
                            <td>{c.party}</td>
                            <td className="mono">#{c.election}</td>
                            <td>{c.constituency_name}</td>
                            <td className="mono">{c.total_votes}</td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setDeleteModal({ open: true, type: 'candidate', id: c.candidate_id, msg: `Remove ${c.full_name}?` })}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ════ VOTERS ════ */}
            {activeTab === 'voters' && (
              <>
                <div className="action-bar">
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', letterSpacing: '2px' }}>Voters</div>
                  <div className="spacer"></div>
                  <input
                    type="text"
                    placeholder="Search name or NID…"
                    value={voterSearch}
                    onChange={e => setVoterSearch(e.target.value)}
                    style={{ maxWidth: '240px' }}
                  />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Full Name</th><th>National ID</th><th>Email</th><th>DOB</th><th>Status</th><th>Votes Cast</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredVoters.length === 0
                        ? <tr><td colSpan="8"><div className="empty-state">No voters found.</div></td></tr>
                        : filteredVoters.map(v => (
                          <tr key={v.voter_id}>
                            <td className="mono">#{v.voter_id}</td>
                            <td>
                              <span className="voter-avatar">{initials(v.full_name)}</span>
                              <strong>{v.full_name}</strong>
                            </td>
                            <td className="mono">{v.national_id}</td>
                            <td>{v.email}</td>
                            <td className="mono">{v.dob}</td>
                            <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                            <td className="mono">{v.votes_cast}</td>
                            <td>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => toggleVoter(v.voter_id, v.status)}>
                                {v.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ════ CONSTITUENCIES ════ */}
            {activeTab === 'constituencies' && (
              <>
                <div className="action-bar">
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', letterSpacing: '2px' }}>Constituencies</div>
                  <div className="spacer"></div>
                  <button className="btn btn-primary" onClick={() => setConstModal(true)}>+ Add Constituency</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Name</th><th>Region</th><th>Candidates</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {constituencies.length === 0
                        ? <tr><td colSpan="5"><div className="empty-state">No constituencies found.</div></td></tr>
                        : constituencies.map(c => (
                          <tr key={c.constituency_id}>
                            <td className="mono">#{c.constituency_id}</td>
                            <td><strong>{c.name}</strong></td>
                            <td>{c.region}</td>
                            <td className="mono">{c.total_candidates}</td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setDeleteModal({ open: true, type: 'constituency', id: c.constituency_id, msg: `Remove ${c.name}?` })}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ════ VOTE LOG ════ */}
            {activeTab === 'votelog' && (
              <>
                <div className="action-bar">
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.4rem', letterSpacing: '2px' }}>Vote Audit Log</div>
                  <div className="spacer"></div>
                  <select
                    value={voteFilter}
                    onChange={e => setVoteFilter(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '.78rem', border: '1.5px solid var(--border)', borderRadius: '3px', background: 'var(--paper)' }}>
                    <option value="">All Elections</option>
                    {elections.map(e => (
                      <option key={e.election_id} value={e.election_id}>Election #{e.election_id}</option>
                    ))}
                  </select>
                </div>
                <div className="alert alert-success">
                  🔒 Votes are shown for administrative purposes only.
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Receipt</th><th>Voter</th><th>Candidate</th><th>Party</th><th>Election</th><th>Constituency</th><th>Timestamp</th></tr>
                    </thead>
                    <tbody>
                      {filteredVoteLog.length === 0
                        ? <tr><td colSpan="7"><div className="empty-state">No votes recorded yet.</div></td></tr>
                        : filteredVoteLog.map(v => (
                          <tr key={v.vote_id} className="vote-log-row">
                            <td className="mono">{v.receipt_id}</td>
                            <td>{v.voter_name}</td>
                            <td>{v.candidate_name}</td>
                            <td>{v.candidate_party}</td>
                            <td className="mono">#{v.election_id}</td>
                            <td>{v.constituency_name}</td>
                            <td className="mono" style={{ fontSize: '.7rem' }}>
                              {new Date(v.time).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* NEW ELECTION */}
      <Modal open={elecModal} onClose={() => setElecModal(false)} title="New Election" subtitle="Configure the election event details.">
        <div className="form-grid">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" value={elecForm.start_date}
              onChange={e => setElecForm({ ...elecForm, start_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" value={elecForm.end_date}
              onChange={e => setElecForm({ ...elecForm, end_date: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={elecForm.status} onChange={e => setElecForm({ ...elecForm, status: e.target.value })}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={saveElection}>Save Election</button>
          <button className="btn btn-outline" onClick={() => setElecModal(false)}>Cancel</button>
        </div>
      </Modal>

      {/* ADD CANDIDATE */}
      <Modal open={candModal} onClose={() => setCandModal(false)} title="Add Candidate" subtitle="Register a new candidate for an election.">
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" placeholder="Candidate's full name" value={candForm.full_name}
            onChange={e => setCandForm({ ...candForm, full_name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Party</label>
          <input type="text" placeholder="Political party name" value={candForm.party}
            onChange={e => setCandForm({ ...candForm, party: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Election</label>
          <select value={candForm.election} onChange={e => setCandForm({ ...candForm, election: e.target.value })}>
            <option value="">Select Election</option>
            {elections.map(e => (
              <option key={e.election_id} value={e.election_id}>
                Election #{e.election_id} ({e.status})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Constituency</label>
          <select value={candForm.constituency} onChange={e => setCandForm({ ...candForm, constituency: e.target.value })}>
            <option value="">Select Constituency</option>
            {constituencies.map(c => (
              <option key={c.constituency_id} value={c.constituency_id}>
                {c.name}, {c.region}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={saveCandidate}>Save Candidate</button>
          <button className="btn btn-outline" onClick={() => setCandModal(false)}>Cancel</button>
        </div>
      </Modal>

      {/* ADD CONSTITUENCY */}
      <Modal open={constModal} onClose={() => setConstModal(false)} title="Add Constituency" subtitle="Define a new voting constituency.">
        <div className="form-group">
          <label>Constituency Name</label>
          <input type="text" placeholder="e.g. Central Lagos" value={constForm.name}
            onChange={e => setConstForm({ ...constForm, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Region / State</label>
          <input type="text" placeholder="e.g. Lagos" value={constForm.region}
            onChange={e => setConstForm({ ...constForm, region: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={saveConstituency}>Save Constituency</button>
          <button className="btn btn-outline" onClick={() => setConstModal(false)}>Cancel</button>
        </div>
      </Modal>

      {/* CONFIRM DELETE */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ ...deleteModal, open: false })}
        title="Confirm Deletion"
        subtitle={deleteModal.msg}>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
          <button className="btn btn-outline" onClick={() => setDeleteModal({ ...deleteModal, open: false })}>Cancel</button>
        </div>
      </Modal>

      <Toast ref={toastRef} />
    </>
  );
}
