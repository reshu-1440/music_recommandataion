import React from 'react';

export default function SemanticSnapshot({ retrievalSnapshot }) {
  if (!retrievalSnapshot) return null;

  return (
    <section className="semantic-panel">
      <div className="semantic-head">
        <div>
          <b>Semantic retrieval snapshot</b>
          <small>Live telemetry · Spotify Tracks Catalog</small>
        </div>
        <span className="tag">RQ-KMEANS + FAISS</span>
      </div>
      <div className="semantic-grid">
        {[
          ['INTENT ID', retrievalSnapshot.intent_id],
          ['CATALOG ID', retrievalSnapshot.catalog_id],
          ['RANKING MODE', retrievalSnapshot.ranking_mode],
          ['RETRIEVAL', retrievalSnapshot.retrieval]
        ].map(([a, b]) => (
          <div key={a}>
            <small>{a}</small>
            <strong>{b}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
