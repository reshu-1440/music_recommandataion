import React from 'react';

export default function SignalsPanel({
  saved = [],
  skipped = [],
  played = [],
  history = [],
  dpoTraining = false,
  dpoResult = null,
  onTrainDPO
}) {
  return (
    <section className="info-panel">
      <div className="eyebrow">PREFERENCE FLYWHEEL (RLHF / DPO)</div>
      <h2>Your feedback shapes the next mix.</h2>
      <p>
        Every Save (+1.0), Skip (-1.0), and Play (+0.2) action updates your Tier 1 real-time taste
        centroid. Accumulated sessions are mined into preference triplets (Prompt, Chosen, Rejected)
        to fine-tune the model with Direct Preference Optimization.
      </p>

      <div className="metrics three">
        {[
          ['Saved', saved.length],
          ['Skipped', skipped.length],
          ['Played', played.length]
        ].map(([label, count]) => (
          <div className="metric" key={label}>
            <b>{count}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <div className="dpo-action-card">
        <div>
          <b>Direct Preference Optimization (DPO Flywheel)</b>
          <p>Mines (Prompt, Chosen, Rejected) triplets from your feedback to align recommendations.</p>
          {dpoResult && (
            <span className="dpo-res-badge">
              Status: {dpoResult.status} · Pairs: {dpoResult.pairs_trained || 0} ({dpoResult.mode})
            </span>
          )}
        </div>
        <button
          className="dpo-button"
          onClick={() => onTrainDPO && onTrainDPO(true)}
          disabled={dpoTraining}
        >
          {dpoTraining ? 'Aligning DPO...' : 'Run DPO Flywheel (Simulate)'}
        </button>
      </div>

      <div className="thin-divider" />
      <h3>Recent preference signals</h3>
      {history.length ? (
        <div className="history">
          {history.map((h, i) => (
            <div key={i}>{h}</div>
          ))}
        </div>
      ) : (
        <p>No interactions yet. Save, play or skip a track to start building your taste profile.</p>
      )}
    </section>
  );
}
