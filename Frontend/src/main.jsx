import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import CircuitMateLanding from "./CircuitMateLanding.jsx";
import CircuitMateDashboard from "./CircuitMateDashboard.jsx";
// import CircuitMateAuth from "./CircuitMateAuth.jsx";
import CircuitMateAuth from "./CircuitMateAuth.connected.jsx"
import ClarificationScreen from "./ClarificationScreen.jsx";
import CircuitMateResults from "./CircuitMateResults.jsx";
import SuccessScreen from "./SuccessScreen.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CircuitMateLanding />} />
        <Route path="/dashboard" element={<CircuitMateDashboard />} />
        <Route path="/auth" element={<CircuitMateAuth />} />
        <Route path="/result" element={<CircuitMateResults />} />
        <Route path="/clarification" element={<ClarificationScreen />} />
        <Route path="/success" element={<SuccessScreen />} />
        {/* Redirect unknown URLs to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
