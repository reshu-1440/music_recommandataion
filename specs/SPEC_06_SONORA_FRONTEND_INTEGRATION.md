# Spec Document: SPEC-06 Sonora Frontend Integration

## 1. Overview
Integrate the React/Vite Sonora frontend (`sonora-frontend`) with the FastAPI backend (`backend/app/main.py`), replacing static mock data (`familiarTracks`, `exploreTracks`) with live AI recommendations, GLIDE mode switching, Semantic ID inspection, interactive preference flywheel feedback (Save/Skip/Play), and DPO fine-tuning telemetry.
Preserves Sonora's minimalist dark aesthetic (`#101010`, `#181818`), DM Sans/Manrope typography, lime accent (`#c6ee7a`), player bar, and responsive layout.

---

## 2. Depends on
- `specs/SPEC_01_DATASET_AND_SEMANTIC_IDS.md` (Dataset and RQ-KMeans tokens `SID-xx-xx-xx-xx`)
- `specs/SPEC_02_VECTOR_STORE_AND_GLIDE.md` (FAISS vector store and GLIDE MMR diversity)
- `specs/SPEC_03_LANGGRAPH_GEMINI_AGENT.md` (LangGraph agent, intent extraction, and reasoning)
- `specs/SPEC_04_PREFERENCE_FLYWHEEL_AND_DPO.md` (SQLite preference store, online reranking, and DPO training)
- `specs/SPEC_05_FASTAPI_BACKEND_API.md` (FastAPI REST endpoints: `/api/recommend`, `/api/feedback`, `/api/preferences/{user_id}`, `/api/dpo/pairs`, `/api/dpo/train`, `/api/health`)

---

## 3. Endpoints Utilized
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status check & indexed tracks telemetry |
| `POST` | `/api/recommend` | Natural-language query + discovery mode (`familiar` vs `explore`) $\rightarrow$ tracks with Semantic IDs & reasoning |
| `POST` | `/api/feedback` | Real-time Save, Skip, Replay, Play feedback logging to SQLite preference flywheel |
| `GET` | `/api/preferences/{user_id}` | User preference statistics (saved, skipped, played counts and interaction log) |
| `GET` | `/api/dpo/pairs` | Mined preference pairs for DPO training inspection |
| `POST` | `/api/dpo/train` | Trigger DPO model fine-tuning (with dry-run support) |

---

## 4. Component Architecture & Data Flow

```
+---------------------------------------------------------------------------------+
|                                 App.jsx                                         |
|                                                                                 |
|  +-----------------------+  +------------------------------------------------+  |
|  |       Sidebar         |  |                   Main Content                 |  |
|  | - Discover / Library  |  |  +-------------------------------------------+ |  |
|  | - Preference status   |  |  | SearchPanel (Mood prompt + example chips) | |  |
|  +-----------------------+  |  +-------------------------------------------+ |  |
|                             |  | MixHeading (Familiar vs Explore Switch)   | |  |
|                             |  +-------------------------------------------+ |  |
|                             |  | Tabs: [Tracks | Why these? | Signals]     | |  |
|                             |  | - Tracks: TrackGrid (TrackCards with SIDs)| |  |
|                             |  | - Why these?: Live Intent Dimensions & LLM| |  |
|                             |  | - Signals: Preference Counters & DPO Train| |  |
|                             |  +-------------------------------------------+ |  |
|                             |  | SemanticPanel (Vector Matching Telemetry) | |  |
|                             |  +-------------------------------------------+ |  |
|  +-----------------------+--+------------------------------------------------+  |
|  |                               PlayerBar                                      |  |
|  | - Current track, Unsplash cover, play/pause, timeline, heart button          |  |
|  +------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
                                       |
                   useSonoraDiscovery hook (React Query/State)
                                       |
                   services/api.js (fetch client to http://127.0.0.1:8000)
```

---

## 5. Files to Create
1. `sonora-frontend/src/services/api.js`: Clean asynchronous HTTP client wrapping `fetch` with error handling, timeout, and base URL fallback (`http://127.0.0.1:8000`).
2. `sonora-frontend/src/hooks/useSonoraDiscovery.js`: Custom React hook orchestrating recommendation state, loading indicators, GLIDE mode switching, feedback logging, and preference synchronization.

---

## 6. Files to Change
1. `sonora-frontend/src/App.jsx`:
   - Replace static track arrays with state from `useSonoraDiscovery`.
   - Wire search input and example chips to backend `recommend` call.
   - Connect "Familiar" / "Explore" toggle to reload or steer recommendations via GLIDE MMR.
   - Wire TrackCard "▶", "♥", and "Not for me" to live `feedback` API.
   - Wire "Why these?" tab to live `intentDimensions` and `overallReasoning`.
   - Wire "Preference signals" tab to live user preference counters, history, and DPO train trigger button.
   - Wire `SemanticPanel` to live `retrievalSnapshot` (Intent ID, Catalog ID, Ranking Mode, Retrieval).
   - Display non-intrusive loading skeleton while fetching new recommendations.
2. `sonora-frontend/src/styles.css`:
   - Add minimal utility styles for loading spinner/skeleton and DPO trigger button without disrupting existing aesthetics.

---

## 7. Dependencies
- No new external npm packages required (utilizes native `fetch`, standard React hooks `useState`, `useEffect`, `useCallback`, `useMemo`).
- Vite configuration: Add proxy to `http://127.0.0.1:8000` in `vite.config.js` for clean local development.

---

## 8. Rules for Implementation
1. **Preserve Exact Sonora Visual Design**:
   - Background `#101010`, card backgrounds `#181818`, borders `#262626`.
   - Accent lime `#c6ee7a`.
   - Font family: `DM Sans`, `Manrope`, system-ui.
2. **Resilient Offline Fallback**:
   - If the FastAPI backend is not yet started or temporarily unreachable, gracefully fall back to cached / curated seed recommendations with a subtle status toast, ensuring the UI remains 100% interactive and crash-free.
3. **Optimistic UI Updates**:
   - Clicking "♥" (Save) or "Not for me" (Skip) immediately reflects in the UI state and then dispatches the asynchronous API call in the background.
4. **Clean Semantic ID Presentation**:
   - Track cards display discrete cluster tokens (`SID-xx-xx-xx-xx`) in code tags, exactly as designed.

---

## 9. Expected Behavior & UI Telemetry
- On page load, auto-fetches initial recommendations for default prompt `"Something calm for a 3 a.m. study session, with soft vocals and no distracting beats"`.
- Clicking "Explore" switches mode to GLIDE non-habitual listening ($\lambda=0.45$) and fetches serendipitous tracks.
- Clicking "Not for me" logs a `skip` interaction (weight -1.0), updating Tier 1 taste centroids.
- Switching to "Why these?" tab displays live LLM intent dimensions (e.g. `Calm`, `35% Max`, `Ambient`, `Late-Night Study`).
- Switching to "Preference signals" displays live SQLite counts (`Saved`, `Skipped`, `Played`), interaction history, and allows triggering DPO training.
- Player bar synchronizes with selected track and allows playback toggling.

---

## 10. Error Handling Expectations
- Network errors or backend connection timeouts: surface clear toast `"Backend offline - using local catalog preview"` and retain current recommendations.
- Empty search queries: trigger warning toast `"Describe the mood you want to hear first"`.
- DPO training failure: display informative error toast without blocking UI interaction.

---

## 11. Definition of Done
- [ ] `sonora-frontend/src/services/api.js` implemented with full endpoint coverage.
- [ ] `sonora-frontend/src/hooks/useSonoraDiscovery.js` implemented with state and optimistic feedback.
- [ ] `sonora-frontend/src/App.jsx` connected to live recommendations and telemetry.
- [ ] `npm run build` in `sonora-frontend` builds with zero errors.
- [ ] Both Familiar and Explore mode switches retrieve real tracks from catalog.
- [ ] Save, Skip, and Play feedback triggers live backend updates.
- [ ] DPO training trigger executes cleanly from UI.
