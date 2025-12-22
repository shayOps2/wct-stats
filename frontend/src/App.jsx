import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import PlayerStats from "./pages/PlayerStats";
import PlayerDetail from "./pages/PlayerDetail";
import QuadPins from "./pages/QuadPins";
import Home from "./pages/Home";
import Players from "./pages/Players";
import Matches from "./pages/Matches";
import Layout from "./components/Layout";
import { ConfigProvider } from 'antd';
import { getTheme } from './theme';
import 'antd/dist/reset.css';
import Login from "./pages/login";
import Register from "./pages/Register";

function App() {
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("isDarkMode");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("isDarkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <ConfigProvider theme={getTheme(isDarkMode)}>
      <Router>
        <Layout isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
          <Routes>
            <Route path="/" element={<Home setUser={setUser} />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                user ? <PlayerStats /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/dashboard/players"
              element={
                user ? <PlayerDetail /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/dashboard/quadPins"
              element={
                user ? <QuadPins /> : <Navigate to="/login" replace />
              }
            />
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
    </ConfigProvider>
  );
}

export default App;
