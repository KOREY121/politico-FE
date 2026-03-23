import { useState, useEffect, useRef } from 'react';
import { useNavigate }                 from 'react-router-dom';
import { useAuth }                     from '../context/useAuth';
import { electionsAPI, candidatesAPI, votesAPI } from '../api/api';
import Navbar from '../components/Navbar';
import Modal  from '../components/Modal';
import Toast  from '../components/Toast';

export default function VotePage() {
  const { voter }  = useAuth();
  const navigate   = useNavigate();
  const toastRef   = useRef();

  const [step,              setStep]              = useState(1);
  const [elections,         setElections]         = useState([]);
  const [selectedElection,  setSelectedElection]  = useState(null);
  const [candidates,        setCandidates]        = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeConst,       setActiveConst]       = useState('all');
  const [votedElections,    setVotedElections]    = useState({});
  const [confirmOpen,       setConfirmOpen]       = useState(false);
  const [alreadyVotedOpen,  setAlreadyVotedOpen]  = useState(false);
  const [receipt,           setReceipt]           = useState(null);
  const [loading,           setLoading]           = useState(false);

  useEffect(() => { fetchElections(); }, []);

  // ── FETCH ACTIVE ELECTIONS ──
  async function fetchElections() {
    try {
      const res  = await electionsAPI.active();
      const data = await res.json();
      setElections(data);

      // Check has-voted for each election
      const voted = {};
      for (const e of data) {
        const r = await votesAPI.hasVoted(e.election_id);
        const d = await r.json();
        voted[e.election_id] = d.has_voted;
      }
      setVotedElections(voted);
    } catch {
      toastRef.current?.show('Failed to load elections.', 'error');
    }
  }

  // ── SELECT ELECTION → STEP 2 ──
  async function selectElection(election) {
    setSelectedElection(election);
    setSelectedCandidate(null);
    setActiveConst('all');
    setStep(2);
    try {
      const res  = await candidatesAPI.list(election.election_id);
      const data = await res.json();
      setCandidates(data);
    } catch {
      toastRef.current?.show('Failed to load candidates.', 'error');
    }
  }

  // Unique constituencies from candidates list
  const constituencies = [...new Map(
    candidates.map(c => [c.constituency, {
      id:   c.constituency,
      name: c.constituency_name
    }])
  ).values()];

  // Filter candidates by active constituency
  const filteredCandidates = activeConst === 'all'
    ? candidates
    : candidates.filter(c => c.constituency == activeConst);

  // ── SUBMIT VOTE ──
  async function submitVote() {
    setLoading(true);
    try {
      const res  = await votesAPI.cast(
        selectedElection.election_id,
        selectedCandidate.candidate_id
      );
      const data = await res.json();

      if (res.ok) {
        setReceipt(data.receipt);
        setConfirmOpen(false);
        setStep(4);
        fetchElections();
      } else {
        setConfirmOpen(false);
        toastRef.current?.show(data.error || 'Failed to cast vote.', 'error');
      }
    } catch {
      toastRef.current?.show('Network error. Please try again.', 'error');
    }
    setLoading(false);
  }

  // ── HELPERS ──
  function initials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function stepClass(n) {
    if (step > n) return 'done';
    if (step === n) return 'active';
    return '';
  }

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* ── STEP PROGRESS ── */}
        {step < 4 && (
          <div className="vote-progress">
            <div className={`progress-step ${stepClass(1)}`}>
              <span className="progress-num">1</span> Select Election
            </div>
            <div className={`progress-line ${step > 1 ? 'done' : ''}`}></div>
            <div className={`progress-step ${stepClass(2)}`}>
              <span className="progress-num">2</span> Choose Candidate
            </div>
            <div className={`progress-line ${step > 2 ? 'done' : ''}`}></div>
            <div className={`progress-step ${stepClass(3)}`}>
              <span className="progress-num">3</span> Confirm
            </div>
          </div>
        )}

        {/* ══════════ STEP 1 — SELECT ELECTION ══════════ */}
        {step === 1 && (
          <>
            <div className="page-header">
              <div className="page-header-left">
                <h1>Active Elections</h1>
                <div className="sub">Select an election to cast your vote</div>
              </div>
              <span className="voter-chip">
                <span className="dot-live"></span>
                {voter?.full_name} · {voter?.national_id}
              </span>
            </div>

            <div className="elections-list">
              {elections.length === 0 && (
                <div className="empty-state">
                  <span className="icon">🗳</span>
                  No active elections at this time. Check back soon.
                </div>
              )}
              {elections.map(e => {
                const hasVoted = votedElections[e.election_id];
                return (
                  <div
                    key={e.election_id}
                    className={`election-card ${hasVoted ? 'voted' : ''}`}
                    onClick={() => hasVoted
                      ? setAlreadyVotedOpen(true)
                      : selectElection(e)
                    }>
                    <div className="election-card-top">
                      <h3>General Election #{e.election_id}</h3>
                      {hasVoted
                        ? <span className="badge badge-active">Voted ✓</span>
                        : <span className="badge badge-pending">Open</span>
                      }
                    </div>
                    <div className="meta">📅 {e.start_date} → {e.end_date}</div>
                    <div className="meta">👥 {e.total_candidates} Candidates registered</div>
                    {hasVoted
                      ? <div className="voted-banner">
                          <span className="icon">✅</span>
                          You have already voted in this election.
                        </div>
                      : <div className="cta">Tap to vote →</div>
                    }
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══════════ STEP 2 — CHOOSE CANDIDATE ══════════ */}
        {step === 2 && (
          <>
            <button className="step-back" onClick={() => setStep(1)}>
              ← Back to Elections
            </button>
            <div className="page-header">
              <div className="page-header-left">
                <h1>Election #{selectedElection?.election_id} — Choose Candidate</h1>
                <div className="sub">
                  {selectedElection?.start_date} → {selectedElection?.end_date}
                </div>
              </div>
            </div>

            {/* CONSTITUENCY FILTER */}
            <div style={{ marginBottom: '.7rem', fontFamily: "'DM Mono',monospace", fontSize: '.62rem', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Filter by Constituency
            </div>
            <div className="constituency-filter">
              <button
                className={`filter-pill ${activeConst === 'all' ? 'active' : ''}`}
                onClick={() => setActiveConst('all')}>
                All
              </button>
              {constituencies.map(c => (
                <button
                  key={c.id}
                  className={`filter-pill ${activeConst === c.id ? 'active' : ''}`}
                  onClick={() => setActiveConst(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>

            {/* CANDIDATES GRID */}
            <div className="candidates-grid">
              {filteredCandidates.length === 0 && (
                <div className="empty-state">
                  <span className="icon">🔍</span>No candidates found for this filter.
                </div>
              )}
              {filteredCandidates.map(c => (
                <div
                  key={c.candidate_id}
                  className={`candidate-card ${selectedCandidate?.candidate_id === c.candidate_id ? 'selected' : ''}`}
                  onClick={() => setSelectedCandidate(c)}>
                  <span className="check">✓</span>
                  <div className="candidate-avatar">{initials(c.full_name)}</div>
                  <div className="candidate-name">{c.full_name}</div>
                  <div className="candidate-party">{c.party}</div>
                  <div className="candidate-constituency">
                    {c.constituency_name}, {c.constituency_region}
                  </div>
                </div>
              ))}
            </div>

            {/* CONFIRM AREA */}
            {selectedCandidate && (
              <div className="confirm-area">
                <div className="sel-info">
                  <div className="sel-name">{selectedCandidate.full_name}</div>
                  <div className="sel-party">{selectedCandidate.party}</div>
                </div>
                <button className="btn btn-primary" onClick={() => setStep(3)}>
                  Proceed to Confirm →
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════ STEP 3 — CONFIRM ══════════ */}
        {step === 3 && (
          <>
            <button className="step-back" onClick={() => setStep(2)}>
              ← Change Selection
            </button>
            <div className="page-header">
              <div className="page-header-left">
                <h1>Confirm Your Vote</h1>
                <div className="sub">Review before submitting — this action is final</div>
              </div>
            </div>

            <div style={{ maxWidth: '520px' }}>
              <div className="card" style={{ borderTop: '4px solid var(--gold)' }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.2rem', letterSpacing: '2px', marginBottom: '1.4rem' }}>
                  Vote Summary
                </div>

                {[
                  ['Election',     `Election #${selectedElection?.election_id}`],
                  ['Candidate',    selectedCandidate?.full_name],
                  ['Party',        selectedCandidate?.party],
                  ['Constituency', selectedCandidate?.constituency_name],
                  ['Voter',        `${voter?.full_name} · ${voter?.national_id}`],
                  ['Timestamp',    new Date().toLocaleString()],
                ].map(([key, val]) => (
                  <div key={key} className="receipt-row">
                    <span className="receipt-key">{key}</span>
                    <span className="receipt-val">{val}</span>
                  </div>
                ))}

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(192,57,43,.05)', border: '1px solid rgba(192,57,43,.2)', borderRadius: '3px', fontSize: '.8rem', color: 'var(--danger)' }}>
                  ⚠ Once submitted, your vote cannot be changed or recalled.
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    className="btn btn-success"
                    style={{ flex: 1 }}
                    onClick={() => setConfirmOpen(true)}>
                    ✓ Submit Vote
                  </button>
                  <button className="btn btn-outline" onClick={() => setStep(1)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════ STEP 4 — SUCCESS ══════════ */}
        {step === 4 && receipt && (
          <div className="success-screen" style={{ display: 'block' }}>
            <div className="success-icon">✓</div>
            <div className="success-title">Vote Submitted!</div>
            <p style={{ color: 'var(--muted)', maxWidth: '380px', margin: '0 auto', fontSize: '.9rem' }}>
              Your vote has been securely recorded. Thank you for participating in the democratic process.
            </p>

            <div className="receipt-card">
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.62rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.8rem' }}>
                Vote Receipt
              </div>
              {[
                ['Receipt ID', receipt.receipt_id],
                ['Candidate',  receipt.candidate_name],
                ['Election',   `Election #${receipt.election_id}`],
                ['Time',       new Date(receipt.time).toLocaleString()],
              ].map(([key, val]) => (
                <div key={key} className="receipt-row">
                  <span className="receipt-key">{key}</span>
                  <span className="receipt-val">{val}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-dark" onClick={() => navigate('/results')}>
                View Results →
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setStep(1); setReceipt(null); fetchElections(); }}>
                Vote in Another Election
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── MODALS ── */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Your Vote"
        subtitle={`You are voting for ${selectedCandidate?.full_name} (${selectedCandidate?.party}). This action is final and cannot be undone.`}>
        <div className="modal-actions">
          <button className="btn btn-success" onClick={submitVote} disabled={loading}>
            {loading ? 'Submitting...' : 'Confirm & Submit'}
          </button>
          <button className="btn btn-outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </button>
        </div>
      </Modal>

      <Modal
        open={alreadyVotedOpen}
        onClose={() => setAlreadyVotedOpen(false)}
        title="Already Voted"
        subtitle="You have already cast your vote in this election. Each voter may only vote once per election.">
        <div className="modal-actions">
          <button className="btn btn-dark" onClick={() => setAlreadyVotedOpen(false)}>OK</button>
          <button className="btn btn-outline" onClick={() => navigate('/results')}>
            See Results
          </button>
        </div>
      </Modal>

      <Toast ref={toastRef} />
    </>
  );
}
