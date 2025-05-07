import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  // Redirect to the new dashboard page
  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return null;
}

export default Dashboard;
