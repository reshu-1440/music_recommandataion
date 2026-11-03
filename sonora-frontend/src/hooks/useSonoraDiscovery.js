import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchRecommendations,
  sendFeedback,
  fetchUserPreferences,
  triggerDPOTraining,
  checkHealth
} from '../services/api';

const DEFAULT_PROMPT = 'Something calm for a 3 a.m. study session, with soft vocals and no distracting beats';

export function useSonoraDiscovery(userId = 'listener_01') {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [mode, setModeState] = useState('familiar');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);

  // Telemetry & reasoning states
  const [intentDimensions, setIntentDimensions] = useState([
    { label: 'Calm', sub: 'Emotional tone' },
    { label: 'Low energy', sub: 'Energy profile' },
    { label: 'Ambient / Acoustic', sub: 'Genre affinity' },
    { label: 'Deep Focus', sub: 'Listening context' }
  ]);
  const [overallReasoning, setOverallReasoning] = useState(
    'Acoustic piano and atmospheric textures selected for deep focus and late-night study.'
  );
  const [retrievalSnapshot, setRetrievalSnapshot] = useState({
    intent_id: 'INT-INIT',
    catalog_id: 'CAT-1200',
    ranking_mode: 'Hybrid (Semantic + Preference)',
    retrieval: 'FAISS IndexFlatIP (Cosine) + Gemini Reasoning'
  });

  // User preference flywheel states
  const [saved, setSaved] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [played, setPlayed] = useState([]);
  const [history, setHistory] = useState([]);
  const [dpoTraining, setDpoTraining] = useState(false);
  const [dpoResult, setDpoResult] = useState(null);

  // Synchronize user preferences from backend SQLite store
  const syncPreferences = useCallback(async () => {
    try {
      const stats = await fetchUserPreferences(userId);
      if (stats) {
        if (stats.history) setHistory(stats.history);
      }
    } catch (err) {
      console.warn('Could not fetch preferences:', err.message);
    }
  }, [userId]);

  // Main recommendation discovery handler
  const discover = useCallback(async (customPrompt = null, customMode = null) => {
    const activePrompt = (customPrompt !== null ? customPrompt : prompt).trim();
    const activeMode = customMode !== null ? customMode : mode;

    if (!activePrompt) return { success: false, message: 'Please enter a listening mood.' };

    setLoading(true);
    try {
      const resp = await fetchRecommendations({
        query: activePrompt,
        discoveryMode: activeMode,
        userId,
        limit: 8
      });

      if (resp && resp.tracks && resp.tracks.length > 0) {
        setTracks(resp.tracks);
        setGeneratedPrompt(activePrompt);
        setModeState(activeMode);
        if (resp.intent_dimensions) setIntentDimensions(resp.intent_dimensions);
        if (resp.overall_reasoning) setOverallReasoning(resp.overall_reasoning);
        if (resp.retrieval_snapshot) {
          setRetrievalSnapshot({
            intent_id: resp.retrieval_snapshot.intent_id || 'INT-ACT',
            catalog_id: resp.retrieval_snapshot.catalog_id || 'CAT-1200',
            ranking_mode: resp.retrieval_snapshot.ranking_mode || (activeMode === 'explore' ? 'GLIDE (MMR)' : 'Familiar'),
            retrieval: resp.retrieval_snapshot.retrieval || 'FAISS IndexFlatIP + Gemini'
          });
        }
        setBackendHealthy(true);
        return { success: true, count: resp.tracks.length };
      }
      return { success: false, message: 'No tracks matched your criteria.' };
    } catch (err) {
      console.error('Discovery error:', err);
      setBackendHealthy(false);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [prompt, mode, userId]);

  // GLIDE mode switch handler
  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    discover(prompt, newMode);
  }, [discover, prompt]);

  // Play feedback handler
  const handlePlay = useCallback(async (track) => {
    setPlayed(prev => (prev.includes(track.id) ? prev : [...prev, track.id]));
    setHistory(h => [`Played ${track.title} by ${track.artist}`, ...h].slice(0, 10));

    try {
      await sendFeedback({
        userId,
        trackId: track.track_id || track.id,
        trackName: track.title,
        artists: track.artist,
        query: generatedPrompt || prompt,
        action: 'play',
        semanticId: track.semantic_id || track.id
      });
      syncPreferences();
    } catch (err) {
      console.warn('Feedback play log failed:', err.message);
    }
  }, [userId, generatedPrompt, prompt, syncPreferences]);

  // Save / Liked feedback handler
  const handleToggleSave = useCallback(async (track) => {
    const isSaved = saved.includes(track.id);
    if (isSaved) {
      setSaved(prev => prev.filter(id => id !== track.id));
      setHistory(h => [`Removed '${track.title}' from saved`, ...h].slice(0, 10));
      return { saved: false };
    } else {
      setSaved(prev => [...prev, track.id]);
      setHistory(h => [`Saved '${track.title}' by ${track.artist}`, ...h].slice(0, 10));

      try {
        await sendFeedback({
          userId,
          trackId: track.track_id || track.id,
          trackName: track.title,
          artists: track.artist,
          query: generatedPrompt || prompt,
          action: 'save',
          semanticId: track.semantic_id || track.id
        });
        syncPreferences();
      } catch (err) {
        console.warn('Feedback save log failed:', err.message);
      }
      return { saved: true };
    }
  }, [saved, userId, generatedPrompt, prompt, syncPreferences]);

  // Skip feedback handler
  const handleSkip = useCallback(async (track) => {
    setSkipped(prev => (prev.includes(track.id) ? prev : [...prev, track.id]));
    setHistory(h => [`Skipped '${track.title}' by ${track.artist}`, ...h].slice(0, 10));

    try {
      await sendFeedback({
        userId,
        trackId: track.track_id || track.id,
        trackName: track.title,
        artists: track.artist,
        query: generatedPrompt || prompt,
        action: 'skip',
        semanticId: track.semantic_id || track.id
      });
      syncPreferences();
    } catch (err) {
      console.warn('Feedback skip log failed:', err.message);
    }
  }, [userId, generatedPrompt, prompt, syncPreferences]);

  // DPO fine-tuning trigger
  const handleTrainDPO = useCallback(async (dryRun = true) => {
    setDpoTraining(true);
    setDpoResult(null);
    try {
      const res = await triggerDPOTraining({ epochs: 2, beta: 0.1, dryRun });
      setDpoResult(res);
      return res;
    } catch (err) {
      console.error('DPO training trigger error:', err);
      setDpoResult({ status: 'error', message: err.message });
      return null;
    } finally {
      setDpoTraining(false);
    }
  }, []);

  // Initial mount load
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      discover(DEFAULT_PROMPT, 'familiar');
      syncPreferences();
    }
  }, [discover, syncPreferences]);

  return {
    prompt,
    setPrompt,
    generatedPrompt,
    mode,
    setMode,
    tracks,
    loading,
    backendHealthy,
    intentDimensions,
    overallReasoning,
    retrievalSnapshot,
    saved,
    skipped,
    played,
    history,
    dpoTraining,
    dpoResult,
    discover,
    handlePlay,
    handleToggleSave,
    handleSkip,
    handleTrainDPO
  };
}
