/**
 * LLM Router & Fallback Dispatcher
 * Dynamically resolves between Cloud Gemini, Fast Backend Semantic Agent, and In-Browser WebLLM.
 */

import { webllmService } from './webllmService';

export const ENGINE_MODES = {
  AUTO: 'auto',
  GEMINI: 'gemini',
  WEBLLM: 'webllm'
};

export class LLMRouter {
  /**
   * Determine the optimal execution engine without blocking the browser UI thread
   * @param {string} preference - 'auto' | 'gemini' | 'webllm'
   * @param {boolean} backendHealthy - whether FastAPI backend is responsive
   * @param {boolean} geminiActive - whether Gemini API key is configured on backend
   */
  static resolveEngine({
    preference = 'auto',
    backendHealthy = true,
    geminiActive = true
  } = {}) {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    const hasWebGPU = webllmService.isWebGPUSupported();

    if (preference === ENGINE_MODES.GEMINI) {
      if (!isOnline || !backendHealthy) {
        return {
          engine: hasWebGPU ? 'webllm' : 'heuristic',
          label: hasWebGPU ? 'WebLLM (Offline WebGPU)' : 'Heuristic Engine',
          fallbackReason: 'Network offline or backend unavailable.'
        };
      }
      return {
        engine: 'gemini',
        label: 'Gemini 2.0 Flash (Cloud)',
        fallbackReason: null
      };
    }

    if (preference === ENGINE_MODES.WEBLLM) {
      if (!hasWebGPU) {
        return {
          engine: backendHealthy && isOnline ? 'gemini' : 'heuristic',
          label: backendHealthy && isOnline ? 'Gemini 2.0 Flash (Cloud)' : 'Heuristic Engine',
          fallbackReason: 'WebGPU unsupported on this device.'
        };
      }
      return {
        engine: 'webllm',
        label: 'WebLLM Llama-3.2 (WebGPU)',
        fallbackReason: null
      };
    }

    // AUTO mode: Prioritize cloud Gemini if active; otherwise use FastAPI backend semantic engine
    // Never freezes the UI thread by forcing heavy WebGPU weights download on initial search.
    if (isOnline && backendHealthy && geminiActive) {
      return {
        engine: 'gemini',
        label: 'Gemini 2.0 Flash (Cloud)',
        fallbackReason: null
      };
    }

    if (backendHealthy) {
      return {
        engine: 'hybrid',
        label: 'Auto (Fast Semantic Engine)',
        fallbackReason: null
      };
    }

    if (webllmService.isReady && hasWebGPU) {
      return {
        engine: 'webllm',
        label: 'WebLLM Llama-3.2 (Offline WebGPU)',
        fallbackReason: isOnline ? 'Gemini API not configured' : 'Device is offline'
      };
    }

    return {
      engine: 'heuristic',
      label: 'Local Heuristic Engine',
      fallbackReason: 'Offline mode active'
    };
  }
}
