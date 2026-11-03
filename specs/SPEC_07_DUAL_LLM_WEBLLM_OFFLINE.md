# Spec Document: SPEC-07 Dual-Engine LLM (Gemini Cloud API + WebLLM Offline)

## 1. Overview
Implement a dual-engine language intelligence layer for Sonora:
- **Online Engine**: **Google Gemini 2.0 Flash** via FastAPI backend for high-nuance, cloud-scale semantic intent extraction, dynamic acoustic bounding, and creative grounded explanations.
- **Offline Engine**: **WebLLM** (`@mlc-ai/web-llm`) running client-side via **WebGPU** in the browser, providing 100% offline, privacy-first, zero-cloud-cost intent parsing and explanation generation.
- **Adaptive Router & Fallback Ladder**:
  1. *Online + Gemini API Key present* $\rightarrow$ Cloud Gemini 2.0 Flash.
  2. *Offline / Network Disconnected / No Gemini Key* $\rightarrow$ WebLLM (WebGPU client-side).
  3. *WebGPU Unsupported / Older Device* $\rightarrow$ Deterministic Heuristic Acoustic Parser & Rule Explainer.
- **UI Engine Switcher & Telemetry**:
  - Topbar engine status pill with interactive dropdown: `Auto`, `Gemini 2.0 Flash (Cloud)`, `WebLLM (Offline WebGPU)`.
  - Non-intrusive model download progress bar when caching WebLLM weights into browser IndexedDB / Cache API.

---

## 2. Depends on
- `specs/SPEC_03_LANGGRAPH_GEMINI_AGENT.md` (Intent schema contract and prompt definitions)
- `specs/SPEC_05_FASTAPI_BACKEND_API.md` (FastAPI `/api/recommend` and `/api/health`)
- `specs/SPEC_06_SONORA_FRONTEND_INTEGRATION.md` (Sonora React UI and `useSonoraDiscovery` hook)

---

## 3. Architecture & Data Flow

```
                                +---------------------------+
                                |  User Prompt / Discovery  |
                                +---------------------------+
                                              |
                                              v
                                +---------------------------+
                                |     LLM Router (Client)   |
                                |  Mode: Auto / Gemini /    |
                                |        WebLLM             |
                                +---------------------------+
                                 /                         \
                [Online / Cloud] /                           \ [Offline / WebGPU]
                                v                             v
             +----------------------------+        +---------------------------+
             | FastAPI Backend Agent      |        | In-Browser WebLLM         |
             | (LangGraph + Gemini Flash) |        | (Llama-3.2-1B via WebGPU) |
             +----------------------------+        +---------------------------+
                            |                                     |
                            +-----------------+-------------------+
                                              |
                                              v
                              +-------------------------------+
                              | Common Intent Schema (JSON)   |
                              | - mood, energy, valence       |
                              | - acousticness, tempo, genres |
                              | - dense_query                 |
                              +-------------------------------+
                                              |
                                              v
                              +-------------------------------+
                              | Vector Retrieval & GLIDE MMR  |
                              | (FAISS IndexFlatIP + SIDs)    |
                              +-------------------------------+
                                              |
                                              v
                              +-------------------------------+
                              | Grounded Explanations (NEO)   |
                              | (Cloud Gemini or Local WebLLM)|
                              +-------------------------------+
```

---

## 4. Models & Quantization
| Engine | Model Identifier | Format / Quant | Storage Footprint | Requirements |
|---|---|---|---|---|
| **Online** | `gemini-2.0-flash` | Cloud API | 0 MB client | Valid `GEMINI_API_KEY`, HTTPS |
| **Offline** | `Llama-3.2-1B-Instruct-q4f16_1-MLC` | Wasm + WebGPU (4-bit) | ~800 MB (IndexedDB cache) | WebGPU (Chrome/Edge 113+, Safari 18+) |
| **Offline Lightweight** | `SmolLM2-1.7B-Instruct-q4f16_1-MLC` | Wasm + WebGPU (4-bit) | ~1.0 GB (IndexedDB cache) | Alternative fallback model |

---

## 5. Files to Create & Modify

### Files to Create
1. `sonora-frontend/src/services/webllmService.js`:
   - Singleton client wrapping `@mlc-ai/web-llm` `MLCEngine`.
   - WebGPU compatibility check (`navigator.gpu`).
   - Progress callback stream: `(report: { progress: number, text: string }) => void`.
   - Methods:
     - `initWebLLM(onProgress)`
     - `parseIntentWithWebLLM(userPrompt)`
     - `generateExplanationsWithWebLLM(tracks, userPrompt)`
2. `sonora-frontend/src/services/llmRouter.js`:
   - Unified dispatcher deciding between Gemini Cloud and WebLLM based on network state (`navigator.onLine`), user selection, and engine readiness.
3. `sonora-frontend/tests/webllmRouter.test.js`:
   - Unit tests for routing logic, fallback ladder, and schema validation.

### Files to Modify
1. `sonora-frontend/package.json`:
   - Add `@mlc-ai/web-llm` dependency.
2. `sonora-frontend/src/hooks/useSonoraDiscovery.js`:
   - Integrate `llmRouter`, active engine selection (`auto`, `gemini`, `webllm`), download progress state, and engine switching.
3. `sonora-frontend/src/App.jsx`:
   - Add engine toggle in header top-right next to avatar.
   - Render download progress pill when WebLLM is initializing weights.
   - Surface active inference engine on Track Cards and Semantic Retrieval panel.
4. `sonora-frontend/src/styles.css`:
   - Styling for engine selector dropdown, model download progress bar, and offline indicators.
5. `backend/app/main.py`:
   - Support pre-parsed intent in `/api/recommend` so that when WebLLM runs client-side, the backend vector search and MMR retrieval can directly use the pre-parsed acoustic bounds without calling Gemini.

---

## 6. Prompt Contracts & Schema Parity
Both Gemini and WebLLM will adhere to identical JSON schemas:

### Intent Extraction Output Schema
```json
{
  "mood": ["calm", "focused"],
  "energy_range": [0.05, 0.35],
  "valence_range": [0.15, 0.50],
  "acousticness_min": 0.60,
  "tempo_range": [60.0, 95.0],
  "preferred_genres": ["ambient", "piano", "classical"],
  "listening_context": "late-night study session",
  "dense_query": "peaceful ambient piano music for late-night study"
}
```

---

## 7. Rules for Implementation
1. **Zero Breaking Changes to UI Aesthetic**:
   - Retain Sonora's minimalist dark styling (`#101010`, `#181818`, `#c6ee7a`).
2. **Non-Blocking Lazy Initialization**:
   - WebLLM model weights must NOT block the initial page load. Downloading weights must only begin when the user selects WebLLM or triggers offline mode, or when requested explicitly.
3. **Graceful Degraded Fallback**:
   - If a user's browser lacks WebGPU, WebLLM fails gracefully to the existing resilient heuristic parser with a clear notification toast.
4. **Offline Persistence**:
   - Model weights must be cached persistently in IndexedDB/Cache API so subsequent offline visits require zero downloads.

---

## 8. Definition of Done
- [ ] `@mlc-ai/web-llm` integrated into `sonora-frontend`.
- [ ] `webllmService.js` implemented with WebGPU detection and progress callbacks.
- [ ] `llmRouter.js` implemented with automated fallback ladder.
- [ ] Backend `/api/recommend` supports pre-parsed intents.
- [ ] Engine selector in `App.jsx` topbar allows seamless toggling (`Auto`, `Gemini`, `WebLLM`).
- [ ] WebLLM initialization progress indicator displays during model weight loading.
- [ ] Automated tests pass for router and fallback logic.
- [ ] `npm run build` compiles with zero errors.
- [ ] Changes committed and merged following the SDD Git flow.
