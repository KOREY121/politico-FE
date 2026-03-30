import { useState, useEffect, useRef, useCallback } from 'react';
import { electionsAPI, votesAPI }                   from '../api/api';
import Navbar                                        from '../components/Navbar';

const COLORS = ['#c8a84b','#2d7a4f','#2980b9','#8e44ad','#e67e22','#c0392b','#1abc9c'];

export default function ResultsPage() {
  const [elections,  setElections]  = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [results,    setResults]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const refreshRef                  = useRef(null);

  // ── FETCH RESULTS ──
  const fetchResults = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await votesAPI.results(id);
      const data = await res.json();
      setResults(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  // ── FETCH ELECTIONS ONCE ──
  useEffect(() => {
    async function fetchElections() {
      try {
        const res  = await electionsAPI.list();
        const data = await res.json();
        setElections(data);
        if (data.length) {
          setSelectedId(data[0].election_id);
        }
      } catch (e) { console.error(e); }
    }
    fetchElections();
  }, []);

  // ── FETCH RESULTS WHEN selectedId CHANGES ──
  useEffect(() => {
    if (!selectedId) return;

    fetchResults(selectedId);

    // Auto refresh every 10 seconds
    refreshRef.current = setInterval(() => {
      fetchResults(selectedId);
    }, 10000);

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [selectedId, fetchResults]);

  // ── SELECT ELECTION ──
  function selectElection(id) {
    if (id === selectedId) return;
    setResults(null);
    setSelectedId(id);
  }

  // ── BUILD DONUT SVG ──
  function buildDonut(resultsList, total) {
    if (!total) return null;
    const parties = {};
    resultsList.forEach(c => {
      parties[c.party] = (parties[c.party] || 0) + c.vote_count;
    });
    const sorted  = Object.entries(parties).sort((a, b) => b[1] - a[1]);
    let cumPct    = 0;
    const cx = 50, cy = 50, r = 40;
    const arcs = sorted.map(([party, count], i) => {
      const pct   = count / total;
      const start = cumPct * 2 * Math.PI;
      const end   = (cumPct + pct) * 2 * Math.PI;
      cumPct     += pct;
      const x1    = cx + r * Math.sin(start);
      const y1    = cy - r * Math.cos(start);
      const x2    = cx + r * Math.sin(end);
      const y2    = cy - r * Math.cos(end);
      const large = pct > 0.5 ? 1 : 0;
      return (
        <path key={party}
          d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
          fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1" />
      );
    });
    return { arcs, sorted };
  }

  // ── CONSTITUENCY BREAKDOWN ──
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

        {/* PAGE HEADER */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Election Results</h1>
            <div className="sub">Live counts · Updated every 10 seconds</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                        fontFamily: "'DM Mono',monospace", fontSize: '.65rem',
                        color: 'var(--success)' }}>
            <span className="dot-live"></span> LIVE
          </div>
        </div>

        {/* ── ELECTION SELECTOR ── */}
        <div className="election-selector">
          {elections.map(e => (
            <button
              key={e.election_id}
              className={`elec-pill ${selectedId === e.election_id ? 'active' : ''}`}
              onClick={() => selectElection(e.election_id)}>
              Election #{e.election_id}&nbsp;
              <span className={`badge badge-${e.status}`}>{e.status}</span>
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading && !results && (
          <div className="empty-state">Loading results...</div>
        )}

        {/* RESULTS */}
        {results && (
          <div className="results-layout">

            {/* ── LEFT ── */}
            <div>

              {/* NO VOTES YET */}
              {results.total_votes === 0 && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
                              borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem',
                              fontFamily: "'DM Mono',monospace", fontSize: '.72rem',
                              color: 'var(--muted)' }}>
                  ⚡ No votes have been cast yet. Results will appear here once voting begins.
                </div>
              )}

              {/* WINNER CARD */}
              {results.winner && results.total_votes > 0 && (
                <div className="winner-card">
                  <div className="winner-label">Current Leader</div>
                  <div className="winner-name">{results.winner.full_name}</div>
                  <div className="winner-party">{results.winner.party}</div>
                  <div className="winner-pct">{results.winner.percentage}%</div>
                  <div className="winner-votes">
                    {results.winner.total_votes} of {results.total_votes} votes
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
                      <div>
                        <span className="result-name">{c.full_name}</span>
                        <span className="result-party"> · {c.party}</span>
                        {isWinner && ' 🏆'}
                      </div>
                      <span className="result-pct">{c.percentage}%</span>
                    </div>
                    <div className="result-bar-wrap">
                      <div className={`result-bar ${isWinner ? 'winner' : ''}`}
                           style={{ width: `${c.percentage}%` }}>
                      </div>
                    </div>
                    <div className="result-votes">
                      {c.vote_count} vote{c.vote_count !== 1 ? 's' : ''} · {c.constituency_name}
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
                          <span>{total} votes</span>
                        </div>
                        {candidates.map(c => {
                          const p = total ? Math.round(c.vote_count / total * 100) : 0;
                          return (
                            <div key={c.candidate_id} style={{ marginBottom: '.8rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between',
                                            fontSize: '.78rem', marginBottom: '4px' }}>
                                <span>{c.full_name}</span>
                                <span style={{ fontFamily: "'DM Mono',monospace",
                                               fontSize: '.68rem', color: 'var(--muted)' }}>
                                  {p}%
                                </span>
                              </div>
                              <div className="result-bar-wrap">
                                <div className="result-bar" style={{ width: `${p}%` }}></div>
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
                  <div className="turnout-bar"
                       style={{ width: results.total_votes > 0 ? '100%' : '0%' }}>
                  </div>
                </div>
                <div className="turnout-nums">
                  <span>{results.total_candidates} candidates</span>
                  <span className={`badge badge-${results.election_status}`}>
                    {results.election_status}
                  </span>
                </div>
              </div>

              {/* PARTY SHARE DONUT */}
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="section-title" style={{ fontSize: '1rem' }}>Party Share</div>
                {!donut
                  ? <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.65rem',
                                  color: 'var(--muted)' }}>No votes yet</div>
                  : <>
                      <div className="donut-wrap">
                        <svg viewBox="0 0 100 100" width="100" height="100"
                             style={{ transform: 'rotate(-90deg)' }}>
                          {donut.arcs}
                          <circle cx="50" cy="50" r="22" fill="var(--card)" />
                        </svg>
                        <div className="donut-pct">{results.total_votes}</div>
                      </div>
                      <div className="legend">
                        {donut.sorted.map(([party, count], i) => (
                          <div key={party} className="legend-item">
                            <span className="legend-dot"
                                  style={{ background: COLORS[i % COLORS.length] }}></span>
                            <span>{party}</span>
                            <span style={{ marginLeft: 'auto', fontFamily: "'DM Mono',monospace",
                                           fontSize: '.65rem', color: 'var(--muted)' }}>
                              {Math.round(count / results.total_votes * 100)}%
                            </span>
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
                  ['Start',      results.start_date],
                  ['End',        results.end_date],
                  ['Candidates', results.total_candidates],
                ].map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between',
                                          padding: '6px 0', borderBottom: '1px solid var(--border)',
                                          fontSize: '.82rem' }}>
                    <span style={{ color: 'var(--muted)', fontFamily: "'DM Mono',monospace",
                                   fontSize: '.62rem', textTransform: 'uppercase',
                                   letterSpacing: '1px' }}>{key}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.72rem' }}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}
