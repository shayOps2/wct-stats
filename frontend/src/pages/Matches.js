import React, { useEffect, useState } from "react";

function Matches() {
  const [matches, setMatches] = useState([]);
  const [date, setDate] = useState("");
  const [chasers, setChasers] = useState("");
  const [evaders, setEvaders] = useState("");

  const fetchMatches = () => {
    fetch("/matches/")
      .then(res => res.json())
      .then(setMatches);
  };
  useEffect(fetchMatches, []);

  const handleAddMatch = async e => {
    e.preventDefault();
    const body = {
      date: new Date(date).toISOString(),
      team_chaser: chasers.split(",").map(s => s.trim()).filter(Boolean),
      team_evader: evaders.split(",").map(s => s.trim()).filter(Boolean),
      chases: [],
    };
    await fetch("/matches/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setDate("");
    setChasers("");
    setEvaders("");
    fetchMatches();
  };

  const handleDelete = async id => {
    await fetch(`/matches/${id}`, { method: "DELETE" });
    fetchMatches();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Matches</h2>
      <form onSubmit={handleAddMatch} style={{ marginBottom: 24 }}>
        <input
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          style={{ marginRight: 8 }}
        />
        <input
          type="text"
          placeholder="Chasers (comma separated)"
          value={chasers}
          onChange={e => setChasers(e.target.value)}
          required
          style={{ marginRight: 8 }}
        />
        <input
          type="text"
          placeholder="Evaders (comma separated)"
          value={evaders}
          onChange={e => setEvaders(e.target.value)}
          required
          style={{ marginRight: 8 }}
        />
        <button type="submit">Add Match</button>
      </form>
      <ul>
        {matches.map(m => (
          <li key={m.id} style={{ marginBottom: 8 }}>
            <span>{m.date ? new Date(m.date).toLocaleString() : "No date"}</span>
            <span style={{ marginLeft: 16 }}>
              Chasers: {m.team_chaser && m.team_chaser.join(", ")}
            </span>
            <span style={{ marginLeft: 16 }}>
              Evaders: {m.team_evader && m.team_evader.join(", ")}
            </span>
            <button
              onClick={() => handleDelete(m.id)}
              style={{ marginLeft: 16, background: "#f55", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Matches;
