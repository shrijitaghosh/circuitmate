const express = require("express");
const router = express.Router();
const store = require("../data/store");

const VALID_FILTERS = ["all", "pass", "fail", "low"];
const VALID_RESULTS = ["pass", "fail", "low"];

/**
 * GET /api/results
 * Full payload — same shape as the RESULTS constant ResultsScreen.jsx
 * currently hardcodes. Point the frontend here to remove the mock object
 * entirely.
 */
router.get("/", (req, res) => {
  res.json({
    ...store.getSummary(),
    testCases: store.getTestCases(),
  });
});

/** GET /api/results/metrics — the four top metric cards */
router.get("/metrics", (req, res) => {
  res.json(store.getMetrics());
});

/** GET /api/results/accuracy — feeds the radial accuracy gauge */
router.get("/accuracy", (req, res) => {
  res.json(store.getAccuracy());
});

/** GET /api/results/breakdown — the "Test Results" key/value card */
router.get("/breakdown", (req, res) => {
  res.json(store.getBreakdown());
});

/** GET /api/results/latency — feeds the response-latency bar chart */
router.get("/latency", (req, res) => {
  res.json(store.getLatency());
});

/** GET /api/results/voice-engine — the "Rime TTS Status" card */
router.get("/voice-engine", (req, res) => {
  res.json(store.getVoiceEngine());
});

/**
 * GET /api/results/test-cases?filter=pass|fail|low|all
 * Backs the filter buttons above the test-case table. Filtering happens
 * server-side so the frontend can drop its local .filter() logic too.
 */
router.get("/test-cases", (req, res) => {
  const filter = req.query.filter || "all";
  if (!VALID_FILTERS.includes(filter)) {
    return res.status(400).json({ error: `filter must be one of: ${VALID_FILTERS.join(", ")}` });
  }
  res.json(store.getTestCases(filter));
});

/**
 * POST /api/results/test-cases
 * Lets a live test run (or a CI pipeline exercising the correction-
 * detection model) push a new result row onto the table in real time.
 *
 * Body: { spoken: [string, string], expected: string, detected: string,
 *          result: "pass" | "fail" | "low", latencyMs?: number }
 */
router.post("/test-cases", (req, res) => {
  const { spoken, expected, detected, result, latencyMs } = req.body || {};

  if (!Array.isArray(spoken) || spoken.length !== 2 || spoken.some((s) => typeof s !== "string")) {
    return res.status(400).json({ error: "spoken must be an array of two strings: [original, correction]" });
  }
  if (!expected || !detected) {
    return res.status(400).json({ error: "expected and detected are required" });
  }
  if (!VALID_RESULTS.includes(result)) {
    return res.status(400).json({ error: `result must be one of: ${VALID_RESULTS.join(", ")}` });
  }
  if (latencyMs !== undefined && typeof latencyMs !== "number") {
    return res.status(400).json({ error: "latencyMs must be a number if provided" });
  }

  const testCase = store.addTestCase({ spoken, expected, detected, result, latencyMs });
  res.status(201).json(testCase);
});

module.exports = router;
