import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/Landing_Page";
import CampaignUI from "./pages/CampaignUI";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "@clerk/clerk-react";
import CustomersIngestPage from "./pages/CustomerIngestPage";

function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  // Show nothing (or a loader) until Clerk finishes loading the session
  if (!isLoaded) return null; // or a spinner component

  return isSignedIn ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ingest"
          element={
            <ProtectedRoute>
              <CustomersIngestPage/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <CampaignUI />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
