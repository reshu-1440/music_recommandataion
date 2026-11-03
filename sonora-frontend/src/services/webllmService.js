/**
 * WebLLM In-Browser Inference Service
 * Powered by @mlc-ai/web-llm and WebGPU for 100% offline language intelligence.
 */

let webllmModule = null;

export const DEFAULT_OFFLINE_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

class WebLLMService {
  constructor() {
    this.engine = null;
    this.modelId = DEFAULT_OFFLINE_MODEL;
    this.isLoading = false;
    this.isReady = false;
    this.initError = null;
    this.loadProgress = 0;
    this.loadText = '';
  }

  /**
   * Check if the user's browser environment supports WebGPU
   */
  isWebGPUSupported() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
  }

  /**
   * Initialize WebLLM engine and download/cache model weights
   * @param {Function} [onProgress] Callback receiving ({ progress, text })
   */
  async initEngine(onProgress = null) {
    if (this.isReady && this.engine) {
      return this.engine;
    }

    if (this.isLoading) {
      // Wait for existing initialization promise
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (this.isReady) {
            clearInterval(interval);
            resolve(this.engine);
          } else if (this.initError) {
            clearInterval(interval);
            reject(this.initError);
          }
        }, 300);
      });
    }

    if (!this.isWebGPUSupported()) {
      const err = new Error('WebGPU is not supported on this browser or GPU.');
      this.initError = err;
      throw err;
    }

    this.isLoading = true;
    this.initError = null;

    try {
      if (!webllmModule) {
        webllmModule = await import('@mlc-ai/web-llm');
      }

      const initProgressCallback = report => {
        this.loadProgress = Math.round((report.progress || 0) * 100);
        this.loadText = report.text || 'Loading WebLLM...';
        if (onProgress) {
          onProgress({
            progress: this.loadProgress,
            text: this.loadText
          });
        }
      };

      this.engine = await webllmModule.CreateMLCEngine(this.modelId, {
        initProgressCallback,
        logLevel: 'WARN'
      });

      this.isReady = true;
      this.isLoading = false;
      return this.engine;
    } catch (err) {
      this.isLoading = false;
      this.isReady = false;
      this.initError = err;
      console.error('Failed to initialize WebLLM engine:', err);
      throw err;
    }
  }

  /**
   * Parse user mood intent into structured acoustic bounds using WebLLM
   * @param {string} userPrompt
   */
  async parseIntent(userPrompt) {
    if (!this.engine || !this.isReady) {
      throw new Error('WebLLM engine is not initialized.');
    }

    const systemPrompt = `You are the Music Intent Parser for Sonora.
Translate the user's musical listening request into structured JSON matching these exact keys:
{
  "mood": ["string"],
  "energy_range": [min_float, max_float],
  "valence_range": [min_float, max_float],
  "acousticness_min": min_float,
  "tempo_range": [min_bpm, max_bpm],
  "preferred_genres": ["genre"],
  "listening_context": "context description",
  "dense_query": "expanded descriptive query for vector search"
}
Output valid JSON only without markdown formatting.`;

    const response = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 350
    });

    const raw = response.choices[0]?.message?.content || '{}';
    return this.cleanAndParseJSON(raw);
  }

  /**
   * Generate 1-2 sentence grounded explanation for why a track matches the prompt
   * @param {Object} track
   * @param {string} userPrompt
   */
  async explainTrack(track, userPrompt) {
    if (!this.engine || !this.isReady) {
      return `Matches your request for ${userPrompt} with cluster ${track.id}.`;
    }

    const systemPrompt = `You are the Music Explainer for Sonora, inspired by Spotify NEO.
Provide a 1-sentence grounded explanation for why this song matches the user's request.
Song: "${track.title}" by ${track.artist} (Genre: ${track.genre}, Semantic ID: ${track.id}).
Tone: Warm, concise, and focused on acoustic characteristics. Keep under 25 words.`;

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User requested: "${userPrompt}"` }
        ],
        temperature: 0.2,
        max_tokens: 60
      });
      return response.choices[0]?.message?.content?.trim() || track.reason;
    } catch (err) {
      console.warn('WebLLM explanation fallback:', err);
      return track.reason;
    }
  }

  cleanAndParseJSON(text) {
    try {
      const trimmed = text.trim();
      const firstBrace = trimmed.indexOf('{');
      const lastBrace = trimmed.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      }
      return JSON.parse(trimmed);
    } catch (err) {
      console.warn('Could not parse WebLLM JSON response:', text);
      return null;
    }
  }
}

export const webllmService = new WebLLMService();
