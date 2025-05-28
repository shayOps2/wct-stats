import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import PlayerStats from "./pages/PlayerStats";
import PlayerDetail from "./pages/PlayerDetail";
import QuadPins from "./pages/QuadPins";
import Home from "./pages/Home";
import Players from "./pages/Players";
import Matches from "./pages/Matches";
import Layout from "./components/Layout";
import 'antd/dist/reset.css';
import Login from "./pages/login";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else {
      setUser(null);
    }
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home setUser={setUser} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/dashboard" element={<PlayerStats />} />
          <Route path="/dashboard/players" element={<PlayerDetail />} />
          <Route path="/dashboard/quadPins" element={<QuadPins />} />
          {/* Management routes */}
          <Route
            path="/players"
            element={
              user && user.role === "Admin" ? (
                <Players />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/matches"
            element={
              user && user.role === "Admin" ? (
                <Matches />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          {/* Catch all other routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
