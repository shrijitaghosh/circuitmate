/**
 * In-memory data store for CircuitMate's voice-correction testing results.
 *
 * This mirrors the `RESULTS` object shape that ResultsScreen.jsx already
 * expects, so the frontend's local mock object can be deleted and replaced
 * with fetch() calls against this API without touching any render logic.
 *
 * Swap this file for a real database (Postgres, Mongo, a test-run log
 * table, etc.) later — every route in src/routes/results.js only calls the
 * functions exported here, so the HTTP layer never needs to change.
 */

// Aggregate stats for the full evaluation batch (currently: 50 scripted
// voice-correction scenarios). In a real system these would usually be
// computed from a full test-run log rather than hand-set, but they're
// kept as an explicit summary here so the dashboard has stable numbers
// to show even before individual test-case rows are wired up.
let summary = {
  metrics: {
    correctionAccuracy: { value: 94, unit: "%", sub: "Correctly detected corrections" },
    testsCompleted: { value: 50, sub: "Voice correction scenarios" },
    successRate: { value: "46 / 50", sub: "Successful tests" },
    avgLatency: { value: 420, unit: " ms", sub: "Speech \u2192 response" },
  },
  accuracy: { correct: 47, incorrect: 3 },
  breakdown: {
    totalTests: 50,
    successful: 47,
    failed: 3,
    correctionDetected: 48,
    falseCorrections: 1,
    lowConfidenceCases: 4,
  },
  latency: { average: 420, best: 280, worst: 780 },
  voiceEngine: {
    provider: "Rime",
    status: "Operational",
    successfulResponses: "48/50",
    ttsFailures: 2,
  },
};

// Individual, inspectable test-case rows — the sample the "Correction Test
// Cases" table on the dashboard renders. New rows can be appended by a
// live test run or CI pipeline via POST /api/results/test-cases.
let testCases = [
  { id: 1, spoken: ["GPIO 13", "\u2026 wait, GPIO 12"], expected: "12", detected: "12", result: "pass", latencyMs: 390 },
  { id: 2, spoken: ["Use pin 5", "\u2026 actually pin 6"], expected: "6", detected: "6", result: "pass", latencyMs: 340 },
  { id: 3, spoken: ["GPIO 18", "\u2026 sorry, GPIO 19"], expected: "19", detected: "18", result: "fail", latencyMs: 610 },
  { id: 4, spoken: ["Pin 7", "\u2026 no, pin 8"], expected: "8", detected: "8", result: "pass", latencyMs: 355 },
  { id: 5, spoken: ["GPIO 21", "\u2026 maybe GPIO 22?"], expected: "22", detected: "22", result: "low", latencyMs: 480 },
];

let nextId = testCases.length + 1;

function getSummary() {
  return summary;
}

function getMetrics() {
  return summary.metrics;
}

function getAccuracy() {
  return summary.accuracy;
}

function getBreakdown() {
  return summary.breakdown;
}

function getLatency() {
  return summary.latency;
}

function getVoiceEngine() {
  return summary.voiceEngine;
}

function getTestCases(filter = "all") {
  if (filter === "all") return testCases;
  return testCases.filter((t) => t.result === filter);
}

function addTestCase({ spoken, expected, detected, result, latencyMs }) {
  const testCase = {
    id: nextId++,
    spoken,
    expected,
    detected,
    result,
    latencyMs: typeof latencyMs === "number" ? latencyMs : null,
  };
  testCases.push(testCase);
  return testCase;
}

module.exports = {
  getSummary,
  getMetrics,
  getAccuracy,
  getBreakdown,
  getLatency,
  getVoiceEngine,
  getTestCases,
  addTestCase,
};
