import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing_Page"
import CampaignUI from "./pages/CampaignUI";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/campaigns" element={<CampaignUI />} />
      </Routes>
    </Router>
  );
}