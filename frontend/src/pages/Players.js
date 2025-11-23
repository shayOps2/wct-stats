import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "../config"; // Import the constant


function Players() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [error, setError] = useState(""); // State to manage error messages

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user && user.role === "Admin";

  const fetchPlayers = () => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${BACKEND_URL}/players/`, { headers })
      .then(res => {
        if (res.status === 401) {
          setError("Unauthorized. Please log in.");
          return [];
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setPlayers(data);
      })
      .catch(err => setError("Failed to fetch players"));
  };
  const fetchTeams = () => {
    fetch(`${BACKEND_URL}/teams/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeams(data);
      })
      .catch(err => console.error("Failed to fetch teams", err));
  };

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  const handleAddPlayer = async e => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    if (selectedTeam) formData.append("team_id", selectedTeam);
    if (image) formData.append("image", image);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${BACKEND_URL}/players/`, {
        method: "POST",
        body: formData,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.message || "Failed to add player. Please check the input.");
        return;
      }

      console.log("Response status:", response.status); // Log the response status for debugging

      setName("");
      setSelectedTeam("");
      setImage(null);
      setError(""); // Clear any previous error
      fetchPlayers();
    } catch (err) {
      console.error("Error adding player:", err); // Log the error for debugging
      alert(err.message || "An unexpected error occurred"); // Use alert for error message
    }
  };

  const handleDelete = async id => {
    const token = localStorage.getItem("token");
    await fetch(`${BACKEND_URL}/players/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    fetchPlayers();
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/teams/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newTeamName }),
      });
      if (res.ok) {
        setNewTeamName("");
        fetchTeams();
      } else {
        alert("Failed to add team");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Delete this team?")) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${BACKEND_URL}/teams/${id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      fetchTeams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/players/${editingPlayer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: editingPlayer.name,
          team_id: editingPlayer.team_id || null,
        }),
      });
      if (res.ok) {
        setEditingPlayer(null);
        fetchPlayers();
      } else {
        alert("Failed to update player");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Players</h2>
      {error && ( // Conditionally render the error message
        <div style={{ color: "red", marginBottom: 16 }}>
          {error}
        </div>
      )}
      {isAdmin && (
        <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3>Manage Teams</h3>
          <form onSubmit={handleAddTeam} style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="New Team Name"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              required
              style={{ marginRight: 8 }}
            />
            <button type="submit">Add Team</button>
          </form>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {teams.map(t => (
              <li key={t.id} style={{ marginBottom: 4 }}>
                {t.name}
                <button onClick={() => handleDeleteTeam(t.id)} style={{ marginLeft: 8, color: "red" }}>x</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && (
        <form onSubmit={handleAddPlayer} style={{ marginBottom: 24 }}>
          <h3>Add Player</h3>
          <input
            type="text"
            placeholder="Player name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ marginRight: 8 }}
          />
          <select
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            style={{ marginRight: 8, padding: 2 }}
          >
            <option value="">Select Team (Optional)</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={e => setImage(e.target.files[0])}
            style={{ marginRight: 8 }}
          />
          <button type="submit">Add Player</button>
        </form>
      )}

      {editingPlayer && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 8, minWidth: 300 }}>
            <h3>Edit Player</h3>
            <form onSubmit={handleUpdatePlayer}>
              <div style={{ marginBottom: 12 }}>
                <label>Name:</label>
                <input
                  type="text"
                  value={editingPlayer.name}
                  onChange={e => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                  style={{ width: "100%", display: "block" }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Team:</label>
                <select
                  value={editingPlayer.team_id || ""}
                  onChange={e => setEditingPlayer({ ...editingPlayer, team_id: e.target.value })}
                  style={{ width: "100%", display: "block" }}
                >
                  <option value="">No Team</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setEditingPlayer(null)}>Cancel</button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {players.map(p => (
          <div key={p.id} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, width: 180, position: "relative" }}>
            {p.image_id && (
              <div style={{ width: "100%", paddingTop: "100%", position: "relative", marginBottom: 8 }}>
                <img
                  src={`${BACKEND_URL}/players/${p.id}/image`}
                  alt={p.name}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 6
                  }}
                />
              </div>
            )}
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            {p.team_id && <div style={{ fontSize: "0.8em", color: "#666" }}>{teams.find(t => t.id === p.team_id)?.name}</div>}
            {isAdmin && (
              <>
                <button
                  onClick={() => setEditingPlayer(p)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 60,
                    background: "#2196F3",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "2px 8px",
                    cursor: "pointer",
                    zIndex: 1
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "#f55",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "2px 8px",
                    cursor: "pointer",
                    zIndex: 1
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Players;
