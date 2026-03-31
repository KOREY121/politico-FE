import { useState, useEffect, useRef, useCallback } from 'react';
import { electionsAPI, votesAPI }                   from '../api/api';
import Navbar                                        from '../components/Navbar';

const COLORS = ['#c8a84b','#2d7a4f','#2980b9','#8e44ad','#e67e22','#c0392b','#1abc9c'];

export default function ResultsPage() {
  const [elections,  setElections]  = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [results,    setResults]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [animated,  setAnimated]   = useState(false);
  const refreshRef                  = useRef(null);

  const fetchResults = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await votesAPI.results(id);
      const data = await res.json();
      setResults(data);
      setTimeout(() => setAnimated(true), 100);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function fetchElections() {
      try {
        const res  = await electionsAPI.list();
        const data = await res.json();
        setElections(data);
        if (data.length) setSelectedId(data[0].election_id);
      } catch (e) { console.error(e); }
    }
    fetchElections();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setAnimated(false);
    fetchResults(selectedId);
    refreshRef.current = setInterval(() => fetchResults(selectedId), 10000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [selectedId, fetchResults]);

  function selectElection(id) {
    if (id === selectedId) return;
    setResults(null);
    setAnimated(false);
    setSelectedId(id);
  }

  function buildDonut(resultsList, total) {
    if (!total) return null;
    const parties = {};
    resultsList.forEach(c => { parties[c.party] = (parties[c.party] || 0) + c.vote_count; });
    const sorted = Object.entries(parties).sort((a, b) => b[1] - a[1]);
    let cumPct = 0;
    const cx = 50, cy = 50, r = 38;
    const arcs = sorted.map(([party, count], i) => {
      const pct   = count / total;
      const start = cumPct * 2 * Math.PI;
      const end   = (cumPct + pct) * 2 * Math.PI;
      cumPct     += pct;
      const x1 = cx + r * Math.sin(start), y1 = cy - r * Math.cos(start);
      const x2 = cx + r * Math.sin(end),   y2 = cy - r * Math.cos(end);
      return (
        <path key={party}
          d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${pct > 0.5 ? 1 : 0},1 ${x2},${y2} Z`}
          fill={COLORS[i % COLORS.length]} stroke="var(--card)" strokeWidth="2" />
      );
    });
    return { arcs, sorted };
  }

  function getConstBreakdowns() {
    if (!results) return [];
    const constMap = {};
    results.results.forEach(c => {
      const key = c.constituency_name;
      if (!constMap[key]) constMap[key] = { name: key, candidates: [], total: 0 };
      constMap[key].candidates.push(c);
      constMap[key].total += c.vote_count;
    });
    return Object.values(constMap);
  }

  const donut      = results?.total_votes > 0 ? buildDonut(results.results, results.total_votes) : null;
  const breakdowns = getConstBreakdowns();

  return (
    <>
      <Navbar />
      <div className="page-wrap">

        {/* HEADER */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Election Results</h1>
            <div className="sub">Live counts · Auto-refreshes every 10s</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                        fontFamily: "'DM Mono',monospace", fontSize: '.65rem',
                        color: 'var(--success)' }}>
            <span className="dot-live"></span> LIVE
          </div>
        </div>

        {/* ELECTION PILLS */}
        <div className="election-selector">
          {elections.map(e => (
            <button key={e.election_id}
              className={`elec-pill ${selectedId === e.election_id ? 'active' : ''}`}
              onClick={() => selectElection(e.election_id)}>
              Election #{e.election_id}
              <span className={`badge badge-${e.status}`}>{e.status}</span>
            </button>
          ))}
        </div>

        {loading && !results && (
          <div className="empty-state">Loading results...</div>
        )}

        {results && (
          <div className="results-layout">

            {/* ── LEFT ── */}
            <div>

              {results.total_votes === 0 && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
                              borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem',
                              fontFamily: "'DM Mono',monospace", fontSize: '.72rem',
                              color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  ⚡ No votes have been cast yet. Results will appear here once voting begins.
                </div>
              )}

              {/* WINNER CARD */}
              {results.winner && results.total_votes > 0 && (
                <div className="winner-card" style={{ marginBottom: '1.5rem' }}>
                  <div className="winner-label">Current Leader</div>
                  <div className="winner-name">{results.winner.full_name}</div>
                  <div className="winner-party">{results.winner.party}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <div className="winner-pct">{results.winner.percentage}%</div>
                    <div className="winner-votes" style={{ paddingBottom: '8px' }}>
                      {results.winner.total_votes} of {results.total_votes} votes
                    </div>
                  </div>
                </div>
              )}

              {/* ALL CANDIDATES */}
              <div className="section-title">All Candidates</div>
              {results.results.map((c, i) => {
                const isWinner = i === 0 && c.vote_count > 0;
                return (
                  <div key={c.candidate_id} className="result-row">
                    <div className="result-top">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="result-name">{c.full_name}</span>
                          {isWinner && <span style={{ fontSize: '.9rem' }}>🏆</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{
                            fontFamily: "'DM Mono',monospace", fontSize: '.6rem',
                            letterSpacing: '1px', textTransform: 'uppercase',
                            background: 'var(--gold-dim)', color: 'var(--ink)',
                            padding: '2px 8px', borderRadius: '2px', fontWeight: '600'
                          }}>{c.party}</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.6rem',
                                         color: 'var(--muted)' }}>
                            {c.constituency_name}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="result-pct">{c.percentage}%</span>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.6rem',
                                       color: 'var(--muted)', marginTop: '2px' }}>
                          {c.vote_count} vote{c.vote_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="result-bar-wrap" style={{ marginTop: '8px' }}>
                      <div className={`result-bar ${isWinner ? 'winner' : ''}`}
                           style={{ width: animated ? `${c.percentage}%` : '0%',
                                    transition: 'width 1s cubic-bezier(.25,.46,.45,.94)' }}>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* CONSTITUENCY BREAKDOWN */}
              {breakdowns.length > 1 && (
                <div className="breakdown-section">
                  <div className="section-title">Constituency Breakdown</div>
                  <div className="breakdown-grid">
                    {breakdowns.map(({ name, candidates, total }) => (
                      <div key={name} className="breakdown-card">
                        <div className="bk-title">
                          <span>{name}</span>
                          <span className="badge badge-pending">{total} votes</span>
                        </div>
                        {candidates.map(c => {
                          const p = total ? Math.round(c.vote_count / total * 100) : 0;
                          return (
                            <div key={c.candidate_id} style={{ marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', marginBottom: '5px' }}>
                                <div>
                                  <div style={{ fontSize: '.82rem', fontWeight: '600' }}>{c.full_name}</div>
                                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.6rem',
                                                color: 'var(--muted)' }}>{c.party}</div>
                                </div>
                                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.72rem',
                                               color: 'var(--gold)', fontWeight: '600' }}>{p}%</span>
                              </div>
                              <div className="result-bar-wrap">
                                <div className="result-bar"
                                     style={{ width: animated ? `${p}%` : '0%',
                                              transition: 'width 1s ease' }}>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div>

              {/* TOTAL VOTES */}
              <div className="turnout-card">
                <div className="turnout-title">Total Votes Cast</div>
                <div className="turnout-pct">{results.total_votes}</div>
                <div className="turnout-bar-wrap">
                  <div className="turnout-bar" style={{ width: results.total_votes > 0 ? '100%' : '0%' }}></div>
                </div>
                <div className="turnout-nums">
                  <span>{results.total_candidates} candidates</span>
                  <span className={`badge badge-${results.election_status}`}>{results.election_status}</span>
                </div>
              </div>

              {/* PARTY SHARE DONUT */}
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="section-title" style={{ fontSize: '1rem' }}>Party Share</div>
                {!donut
                  ? <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.65rem',
                                  color: 'var(--muted)', padding: '1rem 0' }}>
                      No votes cast yet
                    </div>
                  : <>
                      {/* DONUT WITH SPIN ANIMATION */}
                      <div className="donut-wrap">
                        <svg viewBox="0 0 100 100" width="110" height="110"
                             style={{
                               transform: 'rotate(-90deg)',
                               animation: animated ? 'spinIn .8s cubic-bezier(.25,.46,.45,.94) forwards' : 'none'
                             }}>
                          {donut.arcs}
                          <circle cx="50" cy="50" r="24" fill="var(--card)" />
                        </svg>
                        <div className="donut-pct" style={{ fontSize: '1rem', fontWeight: '700' }}>
                          {results.total_votes}
                        </div>
                      </div>

                      {/* LEGEND */}
                      <div className="legend" style={{ marginTop: '1rem' }}>
                        {donut.sorted.map(([party, count], i) => (
                          <div key={party} className="legend-item"
                               style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                            <span className="legend-dot"
                                  style={{ background: COLORS[i % COLORS.length],
                                           width: '12px', height: '12px' }}></span>
                            <span style={{ fontWeight: '500' }}>{party}</span>
                            <div style={{ marginLeft: 'auto', display: 'flex',
                                          flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.72rem',
                                             color: 'var(--gold)', fontWeight: '600' }}>
                                {Math.round(count / results.total_votes * 100)}%
                              </span>
                              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.6rem',
                                             color: 'var(--muted)' }}>
                                {count} votes
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                }
              </div>

              {/* ELECTION INFO */}
              <div className="card">
                <div className="section-title" style={{ fontSize: '1rem' }}>Election Info</div>
                {[
                  ['Status',     <span key="s" className={`badge badge-${results.election_status}`}>{results.election_status}</span>],
                  ['Start Date', results.start_date],
                  ['End Date',   results.end_date],
                  ['Candidates', results.total_candidates],
                  ['Total Votes', results.total_votes],
                ].map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between',
                                          alignItems: 'center', padding: '8px 0',
                                          borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--muted)', fontFamily: "'DM Mono',monospace",
                                   fontSize: '.62rem', textTransform: 'uppercase',
                                   letterSpacing: '1px' }}>{key}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.72rem',
                                   fontWeight: '600' }}>{val}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* SPIN ANIMATION */}
      <style>{`
        @keyframes spinIn {
          from { transform: rotate(-90deg) scale(0.8); opacity: 0; }
          to   { transform: rotate(-90deg) scale(1);   opacity: 1; }
        }
      `}</style>
    </>
  );
}
