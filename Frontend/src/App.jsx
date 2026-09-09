import './App.css'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import CircuitMateDashboard from "./CircuitMateDashboard.jsx";
import CircuitMateAuth from "./CircuitMateAuth.connected.jsx";
import CircuitMateResults from "./CircuitMateResults.jsx";
import SuccessScreen from "./SuccessScreen.jsx";

function ProtectedRoute({ children }) {
  return localStorage.getItem("circuitmate_token")
    ? children
    : <Navigate to="/auth" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<CircuitMateAuth />} />
        <Route path="/dashboard" element={<ProtectedRoute><CircuitMateDashboard /></ProtectedRoute>} />
        <Route path="/success" element={<ProtectedRoute><SuccessScreen /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><CircuitMateResults /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
