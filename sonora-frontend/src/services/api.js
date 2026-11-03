/**
 * Sonora Discovery API Client
 * Connects to the FastAPI backend with proxy or fallback to http://127.0.0.1:8000
 */

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody || response.statusText}`);
  }

  return response.json();
}

/**
 * Health check
 */
export async function checkHealth() {
  return request('/api/health');
}

/**
 * Fetch personalized, language-steerable recommendations
 * @param {Object} params
 * @param {string} params.query - Natural language intent
 * @param {string} [params.discoveryMode='familiar'] - 'familiar' or 'explore' (GLIDE switch)
 * @param {string} [params.userId='listener_01'] - User identifier for flywheel tuning
 * @param {number} [params.limit=8] - Number of recommendations
 */
export async function fetchRecommendations({
  query,
  discoveryMode = 'familiar',
  userId = 'listener_01',
  limit = 8
}) {
  return request('/api/recommend', {
    method: 'POST',
    body: JSON.stringify({
      query,
      discovery_mode: discoveryMode,
      user_id: userId,
      limit
    })
  });
}

/**
 * Record user feedback interaction (Save, Skip, Play, Replay)
 * @param {Object} feedback
 */
export async function sendFeedback({
  userId = 'listener_01',
  trackId,
  trackName,
  artists,
  query,
  action,
  semanticId
}) {
  return request('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      track_id: trackId,
      track_name: trackName,
      artists: artists,
      query: query || '',
      action,
      semantic_id: semanticId
    })
  });
}

/**
 * Fetch user preference profile and interaction history
 * @param {string} userId
 */
export async function fetchUserPreferences(userId = 'listener_01') {
  return request(`/api/preferences/${encodeURIComponent(userId)}`);
}

/**
 * Retrieve mined preference pairs for DPO training
 * @param {string} [userId]
 */
export async function fetchDPOPairs(userId = null) {
  const endpoint = userId ? `/api/dpo/pairs?user_id=${encodeURIComponent(userId)}` : '/api/dpo/pairs';
  return request(endpoint);
}

/**
 * Trigger DPO preference tuning pipeline
 * @param {Object} params
 */
export async function triggerDPOTraining({ epochs = 2, beta = 0.1, dryRun = true } = {}) {
  return request('/api/dpo/train', {
    method: 'POST',
    body: JSON.stringify({
      epochs,
      beta,
      dry_run: dryRun
    })
  });
}
