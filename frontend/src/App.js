import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import PlayerStats from "./pages/PlayerStats";
import PlayerDetail from "./pages/PlayerDetail";
import QuadPins from "./pages/QuadPins";
import Home from "./pages/Home";
import Players from "./pages/Players";
import Matches from "./pages/Matches";
import Layout from "./components/Layout";
import 'antd/dist/reset.css';

function App() {
  return (
    <Router>
      <Layout>
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<PlayerStats />} />
          <Route path="/dashboard/players" element={<PlayerDetail />} />
          <Route path="/dashboard/quadPins" element={<QuadPins />} />
          {/* Management routes */}
        <Route path="/players" element={<Players />} />
        <Route path="/matches" element={<Matches />} />
          {/* Catch all other routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Layout>
    </Router>
  );
}

export default App;
