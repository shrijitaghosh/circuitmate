# CircuitMate Results API

A small Express backend for the "Voice Correction Performance" dashboard
(`ResultsScreen.jsx`). It serves the exact data shape the component's
`RESULTS` mock object already used, so wiring the frontend to a live
backend is a matter of replacing that constant with a `fetch()` call —
no component logic needs to change.

## Run it

```bash
npm install
cp .env.example .env
npm start        # or: npm run dev  (auto-restarts on file changes)
```

Server starts on `http://localhost:4000` by default.

## Endpoints

| Method | Path                                  | Returns                                    |
|--------|----------------------------------------|---------------------------------------------|
| GET    | `/api/results`                         | Full payload (metrics, accuracy, breakdown, latency, voiceEngine, testCases) |
| GET    | `/api/results/metrics`                 | The four top metric cards                   |
| GET    | `/api/results/accuracy`                | `{ correct, incorrect }` — feeds the radial gauge |
| GET    | `/api/results/breakdown`               | The "Test Results" key/value card            |
| GET    | `/api/results/latency`                 | `{ average, best, worst }` — feeds the bar chart |
| GET    | `/api/results/voice-engine`            | The "Rime TTS Status" card                   |
| GET    | `/api/results/test-cases?filter=`      | `all` \| `pass` \| `fail` \| `low` (default `all`) |
| POST   | `/api/results/test-cases`              | Append a new test-case row (see body below)  |

**POST body:**
```json
{
  "spoken": ["GPIO 13", "\u2026 wait, GPIO 12"],
  "expected": "12",
  "detected": "12",
  "result": "pass",
  "latencyMs": 390
}
```
`result` must be `"pass"`, `"fail"`, or `"low"`. This is the hook a live
test run or CI pipeline would call after each scripted voice-correction
scenario, so the table fills in over time instead of being static.

## Data model

Everything lives in `src/data/store.js` as an in-memory object — swap
that file for a real database (Postgres, Mongo, a test-run log table)
whenever you're ready. The routes never touch storage directly, so
nothing in `src/routes/results.js` or `server.js` needs to change.

`summary` (metrics/accuracy/breakdown/latency/voiceEngine) represents
the aggregate stats for the full evaluation batch. `testCases` is the
inspectable row-level log the table renders, seeded with the same five
sample rows the frontend mock used, plus a `latencyMs` field per row
so the latency chart can eventually be computed live from real
test-case data instead of the static summary numbers.

## Wiring up ResultsScreen.jsx

Replace the local `RESULTS` constant with a fetch on mount:

```jsx
const [results, setResults] = useState(null);

useEffect(() => {
  fetch("http://localhost:4000/api/results")
    .then((r) => r.json())
    .then(setResults);
}, []);

if (!results) return null; // or a loading state
```

For the filter buttons, either keep the client-side `.filter()] as-is
(the full payload already includes every test case), or call
`/api/results/test-cases?filter=...` directly if you'd rather the
server do the filtering.

## CORS

`CORS_ORIGIN` in `.env` controls which origins may call this API from
the browser. Defaults to `*` for local development — lock this down to
your actual frontend origin before deploying.
