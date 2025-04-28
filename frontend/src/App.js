import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import Players from "./pages/Players";
import Matches from "./pages/Matches";
import QuadMap from "./pages/QuadMap";

function App() {
  return (
    <Router>
      <nav style={{ padding: 16, background: "#eee" }}>
        <Link to="/" style={{ marginRight: 16 }}>Dashboard</Link>
        <Link to="/players" style={{ marginRight: 16 }}>Players</Link>
        <Link to="/matches" style={{ marginRight: 16 }}>Matches</Link>
        <Link to="/quadmap">Quad Map</Link>
      </nav>
      <Routes>
        <Route path="/players" element={<Players />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/quadmap" element={<QuadMap />} />
        <Route path="/" element={<div style={{ padding: 24 }}><h2>Dashboard</h2><p>Welcome to the World Chase Tag Stats App!</p></div>} />
      </Routes>
    </Router>
  );
}

export default App;
