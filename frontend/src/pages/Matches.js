import React, { useEffect, useState } from "react";
import { Alert } from "antd";
import { BACKEND_URL } from "../config";
import { extractTimeFromVideoURL, formatDateForInput, formatDateForDisplay, formatDateForAPI } from "../utils/matchUtils";
import MatchCard from "../components/MatchCard";
import RoundPanel from "../components/RoundPanel";

function Matches() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [backupRunning, setBackupRunning] = useState(false);
  const [matchType, setMatchType] = useState("1v1");
  const [formData, setFormData] = useState({
    date: formatDateForInput(new Date()),
    team1_name: "",
    team2_name: "",
    team1_player_ids: [],
    team2_player_ids: [],
    player1_id: "",
    player2_id: "",
    video_url: ""
  });
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [roundData, setRoundData] = useState({
    chaser_id: "",
    evader_id: "",
    tag_made: false,
    tag_time: 0,
    evading_team: "",
    pinLocation: null
  });
  const [showRounds, setShowRounds] = useState(true);
  const [editingRound, setEditingRound] = useState(null);
  const [currentMatchPins, setCurrentMatchPins] = useState([]);
  const [editingRoundTime, setEditingRoundTime] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvDetectedMatches, setCsvDetectedMatches] = useState([]);
  const [csvSelectedMatches, setCsvSelectedMatches] = useState([]);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState("");

  const triggerBackup = async () => {
    if (!window.confirm("Trigger backup? Admin only.")) return;
    const token = localStorage.getItem("token");
    setBackupRunning(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/admin/backup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        alert("Backup started.");
      } else {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        alert("Backup failed: " + (err.detail || resp.statusText));
      }
    } catch (e) {
      console.error("Backup error", e);
      alert("Backup error: " + e.message);
    } finally {
      setBackupRunning(false);
    }
  };

  const handleCsvFileChange = async (e) => {
    setCsvError("");
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setCsvFile(file);
    setCsvDetectedMatches([]);
    setCsvSelectedMatches([]);
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const ids = new Set();
      for (const line of lines) {
        const [matchId] = line.split(",");
        const n = parseInt(matchId, 10);
        if (!isNaN(n)) ids.add(n);
      }
      const arr = Array.from(ids).sort((a, b) => a - b);
      setCsvDetectedMatches(arr);
      setCsvSelectedMatches(arr);
    } catch (err) {
      setCsvError("Failed to read CSV file");
    }
  };

  const toggleCsvMatchSelection = (id) => {
    setCsvSelectedMatches(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submitCsvImport = async () => {
    setCsvError("");
    if (!csvFile || csvSelectedMatches.length === 0) {
      setCsvError("Select a CSV and at least one match number");
      return;
    }
    setCsvBusy(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("match_numbers", JSON.stringify(csvSelectedMatches));
      const resp = await fetch(`${BACKEND_URL}/matches/import_csv`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        setCsvError(err.detail || "Import failed");
        return;
      }
      await fetchMatches();
      setCsvFile(null);
      setCsvDetectedMatches([]);
      setCsvSelectedMatches([]);
      alert("Import complete");
    } catch (e) {
      setCsvError(e.message || "Import failed");
    } finally {
      setCsvBusy(false);
    }
  };

  // Fetch matches and players on component mount
  useEffect(() => {
    fetchMatches();
    fetchPlayers();
  }, []);

  // Step 2: Fetch pins when selectedMatch changes
  useEffect(() => {
    if (selectedMatch && selectedMatch.id) {
      const fetchPinsForMatch = async () => {
        try {
          const token = localStorage.getItem("token");
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const response = await fetch(`${BACKEND_URL}/pins/?match_id=${selectedMatch.id}`, { headers });
          if (response.ok) {
            const pins = await response.json();
            setCurrentMatchPins(pins);
          } else {
            console.error("Failed to fetch pins for match:", selectedMatch.id);
            setCurrentMatchPins([]); // Reset if fetch fails
          }
        } catch (error) {
          console.error("Error fetching pins:", error);
          setCurrentMatchPins([]);
        }
      };
      fetchPinsForMatch();
    } else {
      setCurrentMatchPins([]); // Clear pins if no match is selected
    }
  }, [selectedMatch]);

  const fetchMatches = async () => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`${BACKEND_URL}/matches/`, { headers });
    if (response.ok) {
      const data = await response.json();
      setMatches(data);
    }
  };

  const fetchPlayers = async () => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`${BACKEND_URL}/players/`, { headers });
    if (response.ok) {
      const data = await response.json();
      setPlayers(data);
    }
  };

  const generateTeamName = (playerIds) => {
    if (!playerIds || playerIds.length === 0) return "";
    const teamPlayers = playerIds
      .map(id => players.find(p => p.id === id))
      .filter(p => p) // Remove any undefined players
      .map(p => p.name);
    return teamPlayers.join('-');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      if (!window.confirm("You are in PRODUCTION. Are you sure you want to save this match?")) {
        return;
      }
    }
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
    }

    // Generate team names if empty
    const submissionData = {
      match_type: matchType,
      date: formatDateForAPI(formData.date),
      video_url: formData.video_url,
      ...(matchType === "team"
        ? {
          team1_name: formData.team1_name || generateTeamName(formData.team1_player_ids),
          team2_name: formData.team2_name || generateTeamName(formData.team2_player_ids),
          team1_player_ids: formData.team1_player_ids,
          team2_player_ids: formData.team2_player_ids,
        }
        : {
          player1_id: formData.player1_id,
          player2_id: formData.player2_id,
        }),
    };

    const response = await fetch(`${BACKEND_URL}/matches/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(submissionData),
    });

    if (response.ok) {
      fetchMatches();
      // Reset form
      setFormData({
        date: formatDateForInput(new Date()),
        team1_name: "",
        team2_name: "",
        team1_player_ids: [],
        team2_player_ids: [],
        player1_id: "",
        player2_id: "",
        video_url: ""
      });
    }
  };

  const handleEditDate = async (matchId, newDate) => {
    try {
      const response = await fetch(`${BACKEND_URL}/matches/${matchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formatDateForAPI(newDate)
        }),
      });

      if (response.ok) {
        const updatedMatch = await response.json();
        setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
        if (selectedMatch?.id === updatedMatch.id) {
          setSelectedMatch(updatedMatch);
        }
      } else {
        console.error("Failed to update match date");
      }
    } catch (error) {
      console.error("Error updating match date:", error);
    }
  };

  const handleEditMatchVideoURL = async (matchId, newVideoURL) => {
    try {
      const response = await fetch(`${BACKEND_URL}/matches/${matchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_url: newVideoURL
        }),
      });

      if (response.ok) {
        const updatedMatch = await response.json();
        setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
        if (selectedMatch?.id === updatedMatch.id) {
          setSelectedMatch(updatedMatch);
        }
      } else {
        console.error("Failed to update match video URL");
      }
    } catch (error) {
      console.error("Error updating match video URL:", error);
    }
  };

  // Add a handler for updating the video URL
  const handleUpdateVideoURL = async (matchId, newVideoURL) => {
    try {
      const response = await fetch(`${BACKEND_URL}/matches/${matchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ video_url: newVideoURL }),
      });

      if (response.ok) {
        const updatedMatch = await response.json();
        setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
        if (selectedMatch?.id === updatedMatch.id) {
          setSelectedMatch(updatedMatch);
        }
        alert("Video URL updated successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to update video URL: ${error.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating video URL:", error);
      alert("An error occurred while updating the video URL.");
    }
  };

  const handleDelete = async (matchId) => {
    // Find the match to show details in confirmation
    const matchToDelete = matches.find(m => m.id === matchId);
    if (!matchToDelete) return;
    const token = localStorage.getItem("token");

    const roundCount = matchToDelete.rounds.length;
    const matchType = matchToDelete.match_type;
    const participants = matchType === "team"
      ? `${matchToDelete.team1_name} vs ${matchToDelete.team2_name}`
      : `${matchToDelete.player1.name} vs ${matchToDelete.player2.name}`;

    // Show confirmation dialog with match details
    const confirmMessage = `Are you sure you want to delete this match?\n\n` +
      `Type: ${matchType}\n` +
      `Participants: ${participants}\n` +
      `Date: ${formatDateForDisplay(matchToDelete.date)}\n` +
      `Rounds: ${roundCount}\n\n` +
      `This action cannot be undone.`;

    const userConfirmed = window.confirm(confirmMessage);
    if (!userConfirmed) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/matches/${matchId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirm: userConfirmed })
      });

      if (response.ok) {
        fetchMatches();
        if (selectedMatch?.id === matchId) {
          setSelectedMatch(null);
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to delete match: ${errorData.detail || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Failed to delete match: Network or server error');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Matches</h2>
        <button onClick={triggerBackup} disabled={backupRunning} style={{ padding: "6px 10px" }}>
          {backupRunning ? "Starting..." : "Trigger Backup"}
        </button>
      </div>

      {process.env.NODE_ENV === 'production' && (
        <div style={{ marginBottom: 16 }}>
          <Alert message="Production Environment - Proceed with Caution" type="warning" showIcon />
        </div>
      )}

      {/* Match Creation Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 16 }}>
            Match Type:
            <select
              value={matchType}
              onChange={(e) => {
                setMatchType(e.target.value);
                // Reset form when changing match type
                setFormData({
                  date: formatDateForInput(new Date()),
                  team1_name: "",
                  team2_name: "",
                  team1_player_ids: [],
                  team2_player_ids: [],
                  player1_id: "",
                  player2_id: "",
                  video_url: ""
                });
              }}
              style={{ marginLeft: 8 }}
            >
              <option value="1v1">1v1</option>
              <option value="team">Team</option>
            </select>
          </label>

          <label style={{ marginRight: 16 }}>
            Date:
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{ marginLeft: 8 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ marginRight: 16 }}>
            Video URL:
            <input
              type="url"
              value={formData.video_url || ""}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="Enter video URL"
              style={{ marginLeft: 8, width: "100%" }}
            />
          </label>
        </div>

        {matchType === "team" ? (
          // Team match fields
          <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
              {/* Team 1 */}
              <div style={{ flex: 1, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Team 1 Name"
                    value={formData.team1_name}
                    onChange={(e) => setFormData({ ...formData, team1_name: e.target.value })}
                    style={{ width: '100%', marginBottom: 8, padding: 4 }}
                  />
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {players.map(player => (
                    <div key={player.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 0',
                      opacity: formData.team2_player_ids.includes(player.id) ? 0.5 : 1,
                      cursor: formData.team2_player_ids.includes(player.id) ? 'not-allowed' : 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        id={`team1-${player.id}`}
                        checked={formData.team1_player_ids.includes(player.id)}
                        onChange={(e) => {
                          if (formData.team2_player_ids.includes(player.id)) return;
                          setFormData({
                            ...formData,
                            team1_player_ids: e.target.checked
                              ? [...formData.team1_player_ids, player.id]
                              : formData.team1_player_ids.filter(id => id !== player.id)
                          });
                        }}
                        disabled={formData.team2_player_ids.includes(player.id)}
                        style={{ marginRight: 8 }}
                      />
                      <label
                        htmlFor={`team1-${player.id}`}
                        style={{
                          cursor: formData.team2_player_ids.includes(player.id) ? 'not-allowed' : 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        {player.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team 2 */}
              <div style={{ flex: 1, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Team 2 Name"
                    value={formData.team2_name}
                    onChange={(e) => setFormData({ ...formData, team2_name: e.target.value })}
                    style={{ width: '100%', marginBottom: 8, padding: 4 }}
                  />
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {players.map(player => (
                    <div key={player.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 0',
                      opacity: formData.team1_player_ids.includes(player.id) ? 0.5 : 1,
                      cursor: formData.team1_player_ids.includes(player.id) ? 'not-allowed' : 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        id={`team2-${player.id}`}
                        checked={formData.team2_player_ids.includes(player.id)}
                        onChange={(e) => {
                          if (formData.team1_player_ids.includes(player.id)) return;
                          setFormData({
                            ...formData,
                            team2_player_ids: e.target.checked
                              ? [...formData.team2_player_ids, player.id]
                              : formData.team2_player_ids.filter(id => id !== player.id)
                          });
                        }}
                        disabled={formData.team1_player_ids.includes(player.id)}
                        style={{ marginRight: 8 }}
                      />
                      <label
                        htmlFor={`team2-${player.id}`}
                        style={{
                          cursor: formData.team1_player_ids.includes(player.id) ? 'not-allowed' : 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        {player.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 1v1 match fields
          <div style={{ marginBottom: 16 }}>
            <select
              value={formData.player1_id}
              onChange={(e) => setFormData({ ...formData, player1_id: e.target.value })}
              style={{ marginRight: 16 }}
            >
              <option value="">Select Player 1</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={formData.player2_id}
              onChange={(e) => setFormData({ ...formData, player2_id: e.target.value })}
            >
              <option value="">Select Player 2</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <button type="submit">Create Match</button>
      </form>

      {/* CSV Import */}
      <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Import Matches from CSV</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFileChange}
          />
          <button type="button" disabled={!csvFile || csvBusy || csvSelectedMatches.length === 0} onClick={submitCsvImport}>
            {csvBusy ? "Importing..." : "Import Selected"}
          </button>
          {csvError && (<span style={{ color: 'red' }}>{csvError}</span>)}
        </div>
        {csvDetectedMatches.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setCsvSelectedMatches(csvDetectedMatches)}>Select All</button>
              <button type="button" onClick={() => setCsvSelectedMatches([])}>Clear</button>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {csvDetectedMatches.map(id => (
                <label key={id} style={{ border: '1px solid #eee', borderRadius: 6, padding: '4px 8px' }}>
                  <input
                    type="checkbox"
                    checked={csvSelectedMatches.includes(id)}
                    onChange={() => toggleCsvMatchSelection(id)}
                    style={{ marginRight: 6 }}
                  />
                  Match #{id}
                </label>
              ))}
            </div>
          </div>
        )}
        {csvFile && csvDetectedMatches.length === 0 && (
          <div style={{ marginTop: 8, color: '#666' }}>
            No match numbers detected in CSV.
          </div>
        )}
      </div>

      {/* Matches List */}
      <div style={{ display: "flex", gap: 24 }}>
        {/* Matches Grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, flex: 2 }}>
          {matches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              selected={selectedMatch?.id === match.id}
              onClick={() => {
                setSelectedMatch(match);
                // (Preserve roundData logic as before, omitted for brevity)
              }}
              onDelete={() => handleDelete(match.id)}
              onEditDate={{
                value: formatDateForInput(match.date),
                onChange: (e) => handleEditDate(match.id, e.target.value),
                display: formatDateForDisplay(match.date)
              }}
              onEditVideoURL={{
                value: selectedMatch?.id === match.id ? selectedMatch.video_url || "" : match.video_url || "",
                onChange: (e) => {
                  if (selectedMatch?.id === match.id) {
                    setSelectedMatch({ ...selectedMatch, video_url: e.target.value });
                  } else {
                    setMatches(matches.map(m => m.id === match.id ? { ...m, video_url: e.target.value } : m));
                  }
                }
              }}
              onUpdateVideoURL={() => handleUpdateVideoURL(match.id, selectedMatch?.id === match.id ? selectedMatch.video_url : match.video_url)}
              generateTeamName={generateTeamName}
              setSelectedMatch={setSelectedMatch}
              setMatches={setMatches}
              matches={matches}
              selectedMatch={selectedMatch}
            />
          ))}
        </div>

        {/* Round Management Panel */}
        {selectedMatch && (
          <RoundPanel
            selectedMatch={selectedMatch}
            generateTeamName={generateTeamName}
            matches={matches}
            setMatches={setMatches}
            setSelectedMatch={setSelectedMatch}
            roundData={roundData}
            setRoundData={setRoundData}
            editingRound={editingRound}
            setEditingRound={setEditingRound}
            editingRoundTime={editingRoundTime}
            setEditingRoundTime={setEditingRoundTime}
            showRounds={showRounds}
            setShowRounds={setShowRounds}
            currentMatchPins={currentMatchPins}
            setCurrentMatchPins={setCurrentMatchPins}
            extractTimeFromVideoURL={extractTimeFromVideoURL}
            players={players}
          />
        )}
      </div>
    </div>
  );
}
export default Matches;


