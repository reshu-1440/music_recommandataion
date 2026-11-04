import React from 'react';

export default function IntentBreakdown({ activeEngineInfo, intentDimensions, overallReasoning }) {
  return (
    <section className="info-panel">
      <div className="eyebrow">
        {(activeEngineInfo?.label || 'GEMINI').toUpperCase()} EXPLANATION AGENT
      </div>
      <h2>From words to sound</h2>
      <p>
        Your prompt is parsed by Google Gemini into high-dimensional audio constraints and a dense
        semantic vector. FAISS matches tracks in continuous vector space, while RQ-KMeans generates
        discrete Semantic IDs. Finally, the agent crafts grounded explanations for every song.
      </p>
      <div className="thin-divider" />
      <h3>Detected intent dimensions</h3>
      <div className="metrics">
        {intentDimensions && intentDimensions.map((item, idx) => (
          <div className="metric" key={idx}>
            <b>{item.label}</b>
            <small>{item.sub}</small>
          </div>
        ))}
      </div>
      <div className="thin-divider" />
      <h3>Agent reasoning breakdown</h3>
      <p>{overallReasoning}</p>
    </section>
  );
}
