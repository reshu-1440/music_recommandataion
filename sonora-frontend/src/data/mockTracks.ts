/**
 * Realistic Mock Tracks & Telemetry matching user's reference screenshot.
 * Includes both concise 1-line human explanations (<80 chars) and full technical internals.
 */

export interface Track {
  id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: string;
  duration_s?: number;
  score: string;
  match_pct: number;
  image_url: string;
  preview_url: string;
  reason: string; // Concise human-friendly reason (< 80 chars)
  technical_reason?: string; // Deep algorithmic telemetry
  semantic_id: string;
  energy?: number;
  acousticness?: number;
  valence?: number;
  bpm?: number;
}

export const SEED_PLAYER_TRACK: Track = {
  id: 'SID-28-11-03-13',
  track_id: '39uLYYZytVUwcjgeYLI409',
  title: "Merry-Go-Round of Life - from 'Howl's Moving Castle'",
  artist: 'Joe Hisaishi',
  album: 'FREEDOM PIANO STORIES 4',
  genre: 'Classical · Piano',
  duration: '5:11',
  duration_s: 54, // Preview duration
  score: '99%',
  match_pct: 99,
  image_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0233ea9fb3fd69bca55a015229',
  preview_url: '/audio/classical.wav',
  reason: 'Gentle waltz piano with whimsical orchestral strings.',
  technical_reason: 'Gentle low energy (28%), acoustic instrumentation, reflective and melancholic mood, 71 BPM. Cluster SID-28-11-03-13.',
  semantic_id: 'SID-28-11-03-13',
  energy: 0.28,
  acousticness: 0.88,
  valence: 0.18,
  bpm: 71
};

export const MOCK_RECOMMENDED_TRACKS: Track[] = [
  {
    id: 'SID-05-18-30-16',
    track_id: '7H7NyZ3G075GqPx2evsfeb',
    title: 'Chamber Of Reflection',
    artist: 'Mac DeMarco',
    album: 'Salad Days',
    genre: 'Indie · Curated',
    duration: '3:51',
    duration_s: 231,
    score: '100%',
    match_pct: 100,
    image_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02ec6e9c13eeed14eedbd5f7c9',
    preview_url: '/audio/indie.wav',
    reason: 'Warm vintage synth chords with a dreamy, introspective pace.',
    technical_reason: 'Relaxed indie textures with melodic warmth, aligning with your request for general listening (fingerprint: SID-05-18-30-16). 131 BPM, 55% energy, 50% valence.',
    semantic_id: 'SID-05-18-30-16',
    energy: 0.55,
    acousticness: 0.26,
    valence: 0.50,
    bpm: 131
  },
  {
    id: 'SID-29-10-21-07',
    track_id: '458EaCXcB9TRBoJEDVcdcr',
    title: 'Strawberry Skies',
    artist: 'Kid Travis',
    album: 'Strawberry Skies',
    genre: 'Chill · Curated',
    duration: '2:45',
    duration_s: 165,
    score: '100%',
    match_pct: 100,
    image_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f90069d469c945ccb62b33b7',
    preview_url: '/audio/chill.wav',
    reason: 'Sunlit chillhop groove with smooth, warm vocal harmonies.',
    technical_reason: 'Relaxed chill textures with melodic warmth, aligning with your request for general listening (fingerprint: SID-29-10-21-07). 89 BPM, 46% energy, 64% valence.',
    semantic_id: 'SID-29-10-21-07',
    energy: 0.46,
    acousticness: 0.36,
    valence: 0.64,
    bpm: 89
  },
  {
    id: 'SID-22-09-07-21',
    track_id: '4LEt6hyaGn4scwUsimBeXt',
    title: 'Cherry Blossoms',
    artist: 'Shady Moon',
    album: 'Cherry Blossoms',
    genre: 'Chill · Curated',
    duration: '2:10',
    duration_s: 138,
    score: '100%',
    match_pct: 100,
    image_url: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02c0336215f8dd54f5218090d1',
    preview_url: '/audio/chill.wav',
    reason: 'Delicate acoustic guitar with gentle, uninterrupted calm.',
    technical_reason: 'Minimal chill arrangement with gentle acoustic dynamics (80% acousticness) and cluster SID-22-09-07-21, sustaining uninterrupted focus.',
    semantic_id: 'SID-22-09-07-21',
    energy: 0.34,
    acousticness: 0.74,
    valence: 0.46,
    bpm: 117
  },
  {
    id: 'SID-05-07-05-02',
    track_id: '65r94rVdiMwqXyQFEr3tqT',
    title: 'Resonance',
    artist: 'Home',
    album: 'Odyssey',
    genre: 'Chill · Curated',
    duration: '3:32',
    duration_s: 212,
    score: '100%',
    match_pct: 100,
    image_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02fae65e5717bdab6ec896cc15',
    preview_url: '/audio/chill.wav',
    reason: 'Hypnotic synthwave pulse with lush, nostalgic tape warmth.',
    technical_reason: 'High-tempo chill groove featuring pulsing rhythm (74% energy) to power up general listening. 170 BPM, 41% valence.',
    semantic_id: 'SID-05-07-05-02',
    energy: 0.74,
    acousticness: 0.03,
    valence: 0.41,
    bpm: 170
  },
  {
    id: 'SID-06-02-25-19',
    track_id: '02MWAaffLxlfxAUY7c5dvx',
    title: 'Heat Waves',
    artist: 'Glass Animals',
    album: 'Dreamland (+ Bonus Levels)',
    genre: 'Indie · Curated',
    duration: '3:58',
    duration_s: 238,
    score: '98%',
    match_pct: 98,
    image_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e029e495fb707973f3390850eea',
    preview_url: '/audio/indie.wav',
    reason: 'Dreamy indie pop beats with rich, uplifting vocal reverb.',
    technical_reason: 'Balanced indie textures with melodic warmth, aligning with your request for general listening (fingerprint: SID-06-02-25-19). 80 BPM, 52% energy.',
    semantic_id: 'SID-06-02-25-19',
    energy: 0.52,
    acousticness: 0.44,
    valence: 0.53,
    bpm: 80
  },
  {
    id: 'SID-01-31-06-05',
    track_id: '7pnQ23WgZca9jEfMts9qsR',
    title: 'Latest Trends',
    artist: 'A1 x J1',
    album: 'Latest Trends',
    genre: 'Chill · Curated',
    duration: '2:38',
    duration_s: 158,
    score: '96%',
    match_pct: 96,
    image_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028efd0b0127b0f0e917331319',
    preview_url: '/audio/chill.wav',
    reason: 'Breezy melodic cadence with warm, relaxed acoustic backing.',
    technical_reason: 'Balanced chill textures with melodic warmth, aligning with your request for general listening (fingerprint: SID-01-31-06-05). 141 BPM, 51% energy, 80% valence.',
    semantic_id: 'SID-01-31-06-05',
    energy: 0.51,
    acousticness: 0.08,
    valence: 0.80,
    bpm: 141
  },
  {
    id: 'SID-00-06-07-03',
    track_id: '3JvKfv6T31zO0ini8iNItO',
    title: 'Another Love',
    artist: 'Tom Odell',
    album: 'Long Way Down (Deluxe)',
    genre: 'Chill · Curated',
    duration: '4:04',
    duration_s: 244,
    score: '93%',
    match_pct: 93,
    image_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e021917a0f3f4152622a040913f',
    preview_url: '/audio/chill.wav',
    reason: 'Heartfelt piano chords swelling into an emotive vocal chorus.',
    technical_reason: 'Balanced chill textures with acoustic warmth, aligning with your request for general listening (fingerprint: SID-00-06-07-03). 122 BPM, 53% energy, 13% valence.',
    semantic_id: 'SID-00-06-07-03',
    energy: 0.53,
    acousticness: 0.69,
    valence: 0.13,
    bpm: 122
  },
  {
    id: 'SID-20-06-02-15',
    track_id: '69oebUHeibzbgcD1MUsSsl',
    title: 'Night Blue Skies',
    artist: 'Midnight Smoothie',
    album: 'Night Blue Skies',
    genre: 'Study · Curated',
    duration: '2:01',
    duration_s: 121,
    score: '81%',
    match_pct: 81,
    image_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0233ae81a5ee105f59b869dd96',
    preview_url: '/audio/lo-fi.wav',
    reason: 'Mellow lo-fi study textures with gentle twilight rain atmosphere.',
    technical_reason: 'Balanced study textures with melodic warmth, aligning with your request for general listening (fingerprint: SID-20-06-02-15). 84 BPM, 60% energy, 52% valence.',
    semantic_id: 'SID-20-06-02-15',
    energy: 0.60,
    acousticness: 0.01,
    valence: 0.52,
    bpm: 84
  }
];

export const MOCK_RETRIEVAL_SNAPSHOT = {
  intent_id: 'INT-BAL-8',
  catalog_id: 'CAT-800',
  ranking_mode: 'Hybrid (Semantic + Preference)',
  retrieval: 'FAISS IndexFlatIP (Cosine) + Gemini Reasoning',
  latency_ms: 42,
  vector_dimension: 768,
  rq_codebooks: 4,
  cluster_entropy: 0.84,
  lambda: 1.0
};

export const MOCK_INTENT_DIMENSIONS = [
  { label: 'Calm & Dreamy', sub: 'Emotional Tone (Valence 0.48)' },
  { label: 'Low-to-Mid Dynamic', sub: 'Energy Profile (52% max)' },
  { label: 'Acoustic & Synth Warmth', sub: 'Harmonic Texture Affinity' },
  { label: 'Sunset & Late Night', sub: 'Listening Context Mode' }
];

export const MOCK_OVERALL_REASONING =
  'Selected melodic indie, chillhop, and atmospheric acoustic compositions characterized by mellow tempos (80-140 BPM) and rich harmonic warmth. Excluded aggressive percussive elements to preserve seamless listening continuity.';

/**
 * Format track reasoning into a clean, human-friendly 1-liner under 80 characters.
 */
export function formatHumanReason(track: Track): string {
  if (track.reason && track.reason.length <= 80 && !track.reason.includes('fingerprint') && !track.reason.includes('SID-')) {
    return track.reason;
  }
  // Fallbacks if reason is mechanical
  const raw = track.reason || track.technical_reason || '';
  if (raw.includes('aligning with your request')) {
    const clean = raw.split('aligning with your request')[0].trim().replace(/,$/, '');
    if (clean.length > 0 && clean.length <= 80) return clean + '.';
  }
  return `${track.genre.replace(' · Curated', '')} textures tailored to your listening mood.`;
}
