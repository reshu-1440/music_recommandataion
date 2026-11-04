import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchRecommendations,
  sendFeedback,
  fetchUserPreferences,
  triggerDPOTraining,
  checkHealth
} from '../services/api';
import { webllmService } from '../services/webllmService';
import { LLMRouter, ENGINE_MODES } from '../services/llmRouter';

const DEFAULT_PROMPT = 'Something calm for a 3 a.m. study session, with soft vocals and no distracting beats';

export function useSonoraDiscovery(userId = 'listener_01') {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [mode, setModeState] = useState('familiar');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [geminiActive, setGeminiActive] = useState(false);

  // Dual-Engine LLM State
  const [enginePreference, setEnginePreference] = useState(ENGINE_MODES.AUTO);
  const [activeEngineInfo, setActiveEngineInfo] = useState({
    engine: 'hybrid',
    label: 'Auto (Fast Semantic Engine)',
    fallbackReason: null
  });
  const [webllmProgress, setWebllmProgress] = useState(null); // { progress, text }

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
    retrieval: 'FAISS IndexFlatIP (Cosine) + Gemini/Heuristic Reasoning'
  });

  // User preference flywheel states
  const [saved, setSaved] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [played, setPlayed] = useState([]);
  const [history, setHistory] = useState([]);
  const [dpoTraining, setDpoTraining] = useState(false);
  const [dpoResult, setDpoResult] = useState(null);

  // Native HTML5 Audio Engine State
  const audioRef = useRef(null);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize native HTML5 audio controller once
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      audio.volume = volume;
      audio.preload = 'auto';

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        // Auto-advance to next track in recommendation mix
        setTracks(currTracks => {
          if (currTracks && currTracks.length > 0) {
            const curId = audio.__currentTrackId;
            const idx = currTracks.findIndex(t => t.id === curId);
            if (idx >= 0 && idx < currTracks.length - 1) {
              const nextTrack = currTracks[idx + 1];
              setTimeout(() => handlePlay(nextTrack), 350);
            }
          }
          return currTracks;
        });
      };

      audio.onerror = e => {
        console.warn('Audio playback notice on stream:', e);
        setIsPlaying(false);
      };

      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Synchronize backend health and Gemini status
  const updateBackendTelemetry = useCallback(async () => {
    try {
      const h = await checkHealth();
      if (h) {
        setBackendHealthy(true);
        setGeminiActive(Boolean(h.gemini_active));
      }
    } catch (err) {
      setBackendHealthy(false);
      setGeminiActive(false);
    }
  }, []);

  // Synchronize user preferences from backend SQLite store
  const syncPreferences = useCallback(async () => {
    try {
      const stats = await fetchUserPreferences(userId);
      if (stats && stats.history) {
        setHistory(stats.history);
      }
    } catch (err) {
      console.warn('Could not fetch preferences:', err.message);
    }
  }, [userId]);

  // Main recommendation discovery handler with Dual-Engine support
  const discover = useCallback(
    async (customPrompt = null, customMode = null, overrideEngine = null) => {
      const activePrompt = (customPrompt !== null ? customPrompt : prompt).trim();
      const activeMode = customMode !== null ? customMode : mode;
      const targetPref = overrideEngine !== null ? overrideEngine : enginePreference;

      if (!activePrompt) return { success: false, message: 'Please enter a listening mood.' };

      setLoading(true);

      // 1. Resolve active LLM engine
      const resolved = LLMRouter.resolveEngine({
        preference: targetPref,
        backendHealthy,
        geminiActive
      });
      setActiveEngineInfo(resolved);

      let preparsedIntent = null;

      // 2. If WebLLM engine explicitly resolved, execute via background Web Worker
      if (resolved.engine === 'webllm') {
        try {
          if (!webllmService.isReady) {
            setWebllmProgress({ progress: 10, text: 'Initializing background WebGPU engine...' });
            await webllmService.initEngine(progress => {
              setWebllmProgress(progress);
            });
            setWebllmProgress(null);
          }

          preparsedIntent = await webllmService.parseIntent(activePrompt);
        } catch (webllmErr) {
          console.warn('WebLLM offline inference notice, using backend semantic parser:', webllmErr);
          setWebllmProgress(null);
          setActiveEngineInfo({
            engine: 'hybrid',
            label: 'Auto (Fast Semantic Engine)',
            fallbackReason: webllmErr.message
          });
        }
      }

      // 3. Query Recommendation API with optional pre-parsed intent
      try {
        const resp = await fetchRecommendations({
          query: activePrompt,
          discoveryMode: activeMode,
          userId,
          limit: 8,
          preparsedIntent
        });

        if (resp && resp.tracks && resp.tracks.length > 0) {
          let finalTracks = resp.tracks;

          // If WebLLM is active, enhance track explanations in worker
          if (resolved.engine === 'webllm' && webllmService.isReady && finalTracks.length > 0) {
            try {
              const localExplanation = await webllmService.explainTrack(finalTracks[0], activePrompt);
              if (localExplanation) {
                finalTracks[0] = { ...finalTracks[0], reason: localExplanation };
              }
            } catch (err) {
              // Retain backend explanations
            }
          }

          setTracks(finalTracks);
          setGeneratedPrompt(activePrompt);
          setModeState(activeMode);
          if (resp.intent_dimensions) setIntentDimensions(resp.intent_dimensions);
          if (resp.overall_reasoning) setOverallReasoning(resp.overall_reasoning);
          if (resp.retrieval_snapshot) {
            setRetrievalSnapshot({
              intent_id: resp.retrieval_snapshot.intent_id || 'INT-ACT',
              catalog_id: resp.retrieval_snapshot.catalog_id || 'CAT-1200',
              ranking_mode:
                resp.retrieval_snapshot.ranking_mode ||
                (activeMode === 'explore' ? 'GLIDE (MMR λ=0.45)' : 'Familiar'),
              retrieval:
                resolved.engine === 'webllm'
                  ? 'FAISS + WebLLM Llama-3.2 (WebGPU)'
                  : resp.retrieval_snapshot.retrieval || 'FAISS IndexFlatIP + Gemini'
            });
          }
          setBackendHealthy(true);
          return { success: true, count: finalTracks.length, engine: resolved.label };
        }
        return { success: false, message: 'No tracks matched your criteria.' };
      } catch (err) {
        console.error('Discovery error:', err);
        setBackendHealthy(false);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [prompt, mode, userId, enginePreference, backendHealthy, geminiActive]
  );

  // GLIDE mode switch handler
  const setMode = useCallback(
    newMode => {
      setModeState(newMode);
      discover(prompt, newMode);
    },
    [discover, prompt]
  );

  // Switch LLM engine preference
  const setEngineMode = useCallback(
    newPref => {
      setEnginePreference(newPref);
      discover(prompt, mode, newPref);
    },
    [discover, prompt, mode]
  );

  // Play audio preview handler
  const handlePlay = useCallback(
    async track => {
      if (!track) return;

      const isSameTrack = playingTrack && playingTrack.id === track.id;

      if (isSameTrack && isPlaying) {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      setPlayingTrack(track);
      setPlayed(prev => (prev.includes(track.id) ? prev : [...prev, track.id]));
      setHistory(h => [`Played '${track.title}' by ${track.artist}`, ...h].slice(0, 10));

      if (audioRef.current) {
        audioRef.current.__currentTrackId = track.id;
        const rawPreview = track.preview_url || '/audio/ambient.wav';
        const audioSrc = rawPreview.startsWith('http')
          ? rawPreview
          : `http://127.0.0.1:8000${rawPreview.startsWith('/') ? '' : '/'}${rawPreview}`;

        if (audioRef.current.src !== audioSrc) {
          audioRef.current.src = audioSrc;
          audioRef.current.load();
        }

        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playErr) {
          console.warn('Playback play() was blocked or interrupted:', playErr);
          setIsPlaying(false);
        }
      }

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
    },
    [playingTrack, isPlaying, userId, generatedPrompt, prompt, syncPreferences]
  );

  // Toggle play / pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (playingTrack) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else if (tracks.length > 0) {
        handlePlay(tracks[0]);
      }
    }
  }, [isPlaying, playingTrack, tracks, handlePlay]);

  // Seek within track
  const handleSeek = useCallback(targetSeconds => {
    if (audioRef.current && !isNaN(targetSeconds)) {
      audioRef.current.currentTime = targetSeconds;
      setCurrentTime(targetSeconds);
    }
  }, []);

  // Adjust volume
  const handleVolumeChange = useCallback(newVol => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      audioRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  }, []);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      audioRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  }, [isMuted]);

  // Save / Liked feedback handler
  const handleToggleSave = useCallback(
    async track => {
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
    },
    [saved, userId, generatedPrompt, prompt, syncPreferences]
  );

  // Skip feedback handler
  const handleSkip = useCallback(
    async track => {
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
    },
    [userId, generatedPrompt, prompt, syncPreferences]
  );

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
      updateBackendTelemetry();
      discover(DEFAULT_PROMPT, 'familiar');
      syncPreferences();
    }
  }, [discover, syncPreferences, updateBackendTelemetry]);

  return {
    prompt,
    setPrompt,
    generatedPrompt,
    mode,
    setMode,
    enginePreference,
    setEngineMode,
    activeEngineInfo,
    webllmProgress,
    tracks,
    loading,
    backendHealthy,
    geminiActive,
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
    // Real Audio state & controls
    playingTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    handlePlay,
    togglePlayPause,
    handleSeek,
    handleVolumeChange,
    handleToggleMute,
    handleToggleSave,
    handleSkip,
    handleTrainDPO
  };
}
