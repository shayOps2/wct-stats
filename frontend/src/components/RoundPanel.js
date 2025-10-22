import React, { useEffect } from "react";
import { BACKEND_URL } from "../config";

export default function RoundPanel(props) {
  const {
    selectedMatch,
    generateTeamName,
    matches,
    setMatches,
    setSelectedMatch,
    roundData,
    setRoundData,
    editingRound,
    setEditingRound,
    editingRoundTime,
    setEditingRoundTime,
    showRounds,
    setShowRounds,
    currentMatchPins,
    setCurrentMatchPins,
    extractTimeFromVideoURL,
    players,
  } = props;

  // Auto-select evader/chaser based on previous rounds
  useEffect(() => {
    if (!selectedMatch) return;
    // Do not override if evader already chosen in the form
    if (roundData.evader_id) return;

    // 1v1: follow first-round alternation pattern for rounds > 0
    if (selectedMatch.match_type === '1v1') {
      const rounds = selectedMatch.rounds || [];
      if (rounds.length > 0 && selectedMatch.player1 && selectedMatch.player2) {
        const firstRound = rounds[0];
        if (!firstRound?.evader?.id) return;
        const firstEvaderWasPlayer1 = firstRound.evader.id === selectedMatch.player1.id;
        const currentRound = rounds.length; // next index
        let nextEvader = null;
        if (currentRound % 2 === 0) {
          nextEvader = firstEvaderWasPlayer1 ? selectedMatch.player1 : selectedMatch.player2;
        } else {
          nextEvader = firstEvaderWasPlayer1 ? selectedMatch.player2 : selectedMatch.player1;
        }
        if (nextEvader) {
          setRoundData({
            ...roundData,
            evader_id: nextEvader.id,
            chaser_id: nextEvader.id === selectedMatch.player1.id ? selectedMatch.player2.id : selectedMatch.player1.id,
          });
        }
      }
      return;
    }

    // Team: next evader depends on last round outcome
    if (selectedMatch.match_type === 'team') {
      const rounds = selectedMatch.rounds || [];
      if (rounds.length === 0) return; // first round remains manual
      const lastRound = rounds[rounds.length - 1];
      if (!lastRound) return;
      const nextEvader = !lastRound.tag_made ? lastRound.evader : lastRound.chaser;
      if (nextEvader?.id) {
        setRoundData(prev => ({ ...prev, evader_id: nextEvader.id }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch, roundData.evader_id]);

  const canAddMoreRounds = (match) => {
    if (!match) return false;
    if (match.is_completed) return false;
    const roundCount = match.rounds?.length || 0;
    if (match.match_type === "team") {
      const maxRegularRounds = 16;
      if (match.is_sudden_death) return true;
      if (roundCount >= maxRegularRounds) {
        return match.team1_score === match.team2_score;
      }
      const remainingRounds = maxRegularRounds - roundCount;
      const team1Potential = match.team1_score + remainingRounds;
      const team2Potential = match.team2_score + remainingRounds;
      return team1Potential >= match.team2_score && team2Potential >= match.team1_score;
    } else {
      if (match.is_sudden_death) return roundCount < 6;
      if (roundCount === 3) {
        const scoreDiff = Math.abs(match.team1_score - match.team2_score);
        if (scoreDiff > 1) return false;
      }
      return roundCount < 4;
    }
  };

  const handleAddRound = async (e) => {
    e.preventDefault();
    if (!selectedMatch || !canAddMoreRounds(selectedMatch)) return;
    const token = localStorage.getItem("token");
    const response = await fetch(`${BACKEND_URL}/matches/${selectedMatch.id}/rounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        chaser_id: roundData.chaser_id,
        evader_id: roundData.evader_id,
        tag_made: roundData.tag_made,
        tag_time: roundData.tag_made ? parseFloat(roundData.tag_time) : null,
        round_hour: roundData.round_hour || 0,
        round_minute: roundData.round_minute || 0,
        round_second: roundData.round_second || 0,
      }),
    });
    if (response.ok) {
      const updatedMatch = await response.json();
      setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      setSelectedMatch(updatedMatch);
      if (roundData.tag_made && roundData.pinLocation) {
        const newPin = {
          location: roundData.pinLocation,
          chaser_id: roundData.chaser_id,
          evader_id: roundData.evader_id,
          match_id: updatedMatch.id,
          round_index: updatedMatch.rounds.length - 1,
        };
        try {
          const pinResponse = await fetch(`${BACKEND_URL}/pins/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPin),
          });
          if (!pinResponse.ok) {
            const pinError = await pinResponse.json();
            console.error("Failed to save pin location:", pinError.detail || pinResponse.statusText);
          }
        } catch (pinError) {
          console.error("Error saving pin:", pinError);
        }
      }
      setRoundData({
        chaser_id: "",
        evader_id: "",
        tag_made: false,
        tag_time: 0,
        evading_team: "",
        round_hour: 0,
        round_minute: 0,
        round_second: 0,
        pinLocation: null,
      });
    }
  };

  const handleEditTagTime = async (e) => {
    e.preventDefault();
    if (!selectedMatch || !editingRound || !editingRound.tag_made) {
      setEditingRound(null);
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const tagTimeUpdatePayload = {
        tag_time: parseFloat(editingRound.tag_time),
        tag_made: editingRound.tag_made,
      };
      const matchRoundUpdateResponse = await fetch(`${BACKEND_URL}/matches/${selectedMatch.id}/rounds/${editingRound.index}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(tagTimeUpdatePayload),
      });
      if (!matchRoundUpdateResponse.ok) {
        const error = await matchRoundUpdateResponse.json();
        alert(`Error updating tag time: ${error.detail || 'Failed to update tag time'}`);
        return;
      }
      const updatedMatch = await matchRoundUpdateResponse.json();
      setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      setSelectedMatch(updatedMatch);
      setEditingRound(null);
      alert("Tag time updated successfully!");
    } catch (error) {
      console.error("Error in handleEditTagTime:", error);
      alert("An error occurred while saving tag time changes.");
    }
  };

  const handleUpdatePinLocation = async () => {
    if (!selectedMatch || !editingRound) return;
    try {
      const pinIdToManage = editingRound.existingPinId;
      const newPinLocation = editingRound.pinLocation;
      const chaserId = editingRound.originalChaserId;
      const evaderId = editingRound.originalEvaderId;
      const matchId = selectedMatch.id;
      const roundIndex = editingRound.index;
      if (currentMatchPins.length > 0) {
        const pinsForThisRound = currentMatchPins.filter(p => p.match_id === matchId && p.round_index === roundIndex);
        if (pinsForThisRound.length > 1) {
          for (const pin of pinsForThisRound) {
            if (pinIdToManage && pin.id === pinIdToManage) continue;
            try {
              await fetch(`${BACKEND_URL}/pins/${pin.id}`, { method: 'DELETE' });
            } catch (error) {
              console.error(`Error deleting duplicate pin ${pin.id}:`, error);
            }
          }
        }
      }
      if (editingRound.tag_made) {
        if (pinIdToManage) {
          try {
            const pinUpdateResponse = await fetch(`${BACKEND_URL}/pins/${pinIdToManage}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ location: newPinLocation }),
            });
            if (!pinUpdateResponse.ok) {
              const error = await pinUpdateResponse.json();
              alert(`Failed to update pin location: ${error.detail || pinUpdateResponse.statusText}`);
              return;
            }
          } catch (error) {
            console.error("Error during pin update PUT request:", error);
            alert("An error occurred while updating pin location.");
            return;
          }
        } else if (newPinLocation) {
          const pinToCreate = { location: newPinLocation, chaser_id: chaserId, evader_id: evaderId, match_id: matchId, round_index: roundIndex };
          try {
            const pinCreateResponse = await fetch(`${BACKEND_URL}/pins/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pinToCreate),
            });
            if (!pinCreateResponse.ok) {
              const error = await pinCreateResponse.json();
              alert(`Failed to create new pin: ${error.detail || pinCreateResponse.statusText}`);
              return;
            }
          } catch (error) {
            console.error("Error during pin create POST request:", error);
            alert("An error occurred while creating pin.");
            return;
          }
        }
      } else if (pinIdToManage) {
        try {
          const pinDeleteResponse = await fetch(`${BACKEND_URL}/pins/${pinIdToManage}`, { method: 'DELETE' });
          if (!pinDeleteResponse.ok && pinDeleteResponse.status !== 204) {
            const error = await pinDeleteResponse.text();
            alert(`Failed to delete pin: ${error}`);
            return;
          }
        } catch (error) {
          console.error("Error during pin delete DELETE request:", error);
          alert("An error occurred while deleting pin.");
          return;
        }
      }
      if (selectedMatch && selectedMatch.id) {
        const pinsResponse = await fetch(`${BACKEND_URL}/pins/?match_id=${selectedMatch.id}`);
        if (pinsResponse.ok) {
          setCurrentMatchPins(await pinsResponse.json());
          alert("Pin location updated successfully!");
        } else {
          console.error("Failed to refetch pins after edit.");
          alert("Pin updated but failed to refresh pin data.");
        }
      }
    } catch (error) {
      console.error("Error in handleUpdatePinLocation:", error);
      alert("An error occurred while saving pin location changes.");
    }
  };

  const handleUpdateRoundTime = async (matchId, roundIndex, roundTime) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/matches/${matchId}/rounds/${roundIndex}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          round_hour: roundTime.hour || 0,
          round_minute: roundTime.minute || 0,
          round_second: roundTime.second || 0,
        }),
      });
      if (response.ok) {
        const updatedMatch = await response.json();
        setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
        setSelectedMatch(updatedMatch);
        alert("Round time updated successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to update round time: ${error.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating round time:", error);
      alert("An error occurred while updating the round time.");
    }
  };

  const handleDeleteLastRound = async () => {
    if (!selectedMatch || !selectedMatch.rounds || selectedMatch.rounds.length === 0) return;
    if (!window.confirm("Are you sure you want to delete the last round?")) return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${BACKEND_URL}/matches/${selectedMatch.id}/rounds/last`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.ok) {
        const updatedMatch = await response.json();
        setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
        setSelectedMatch(updatedMatch);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to delete round'}`);
      }
    } catch (error) {
      console.error("Error deleting round:", error);
      alert("An error occurred while deleting the round");
    }
  };
  // All props are passed from Matches.js for now for minimal disruption.
  // This is a direct extraction of the round management panel for further modularization.
  return (
    <div style={{ flex: 1, padding: 16, border: "1px solid #ccc", borderRadius: 8, minWidth: 300 }}>
      <h3>Manage Rounds</h3>
      <div style={{ marginBottom: 16 }}>
        <strong>{selectedMatch.match_type === "team"
          ? `${selectedMatch.team1_name || generateTeamName(selectedMatch.team1_players.map(p => p.id))} vs ${selectedMatch.team2_name || generateTeamName(selectedMatch.team2_players.map(p => p.id))}`
          : `${selectedMatch.player1?.name} vs ${selectedMatch.player2?.name}`}
        </strong>
      </div>

      <form onSubmit={handleAddRound} style={{ display: 'grid', gap: 8 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Evader:</label>
          {selectedMatch.match_type === '1v1' ? (
            <select
              value={roundData.evader_id}
              onChange={(e) => {
                const id = e.target.value;
                setRoundData({
                  ...roundData,
                  evader_id: id,
                  chaser_id: id === selectedMatch.player1.id ? selectedMatch.player2.id : selectedMatch.player1.id,
                });
              }}
              required
            >
              <option value="">Select Evader</option>
              <option value={selectedMatch.player1.id}>{selectedMatch.player1.name}</option>
              <option value={selectedMatch.player2.id}>{selectedMatch.player2.name}</option>
            </select>
          ) : (
            <select
              value={roundData.evader_id}
              onChange={(e) => {
                setRoundData({ ...roundData, evader_id: e.target.value, chaser_id: '' });
              }}
              required
              disabled={(selectedMatch.rounds || []).length > 0}
            >
              <option value="">Select Evader</option>
              {(() => {
                const rounds = selectedMatch.rounds || [];
                if (rounds.length > 0) {
                  const lastRound = rounds[rounds.length - 1];
                  if (lastRound) {
                    const nextEvader = !lastRound.tag_made ? lastRound.evader : lastRound.chaser;
                    if (!roundData.evader_id && nextEvader?.id) {
                      setTimeout(() => setRoundData(prev => ({ ...prev, evader_id: nextEvader.id })), 0);
                    }
                    return [nextEvader].filter(Boolean).map(p => (
                      <option key={p.id} value={p.id}>
                        {`${p.name} (${!lastRound.tag_made ? 'must continue after evasion' : 'must evade after successful tag'})`}
                      </option>
                    ));
                  }
                }
                return ([...(selectedMatch.team1_players || []), ...(selectedMatch.team2_players || [])].map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                )));
              })()}
            </select>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Chaser:</label>
          {selectedMatch.match_type === '1v1' ? (
            <input
              type="text"
              value={roundData.chaser_id ? (roundData.chaser_id === selectedMatch.player1.id ? selectedMatch.player1.name : selectedMatch.player2.name) : ''}
              placeholder={roundData.evader_id ? '' : 'Select evader first'}
              disabled
            />
          ) : (
            <select
              value={roundData.chaser_id}
              onChange={(e) => setRoundData({ ...roundData, chaser_id: e.target.value })}
              required
              disabled={!roundData.evader_id}
            >
              <option value="">Select Chaser</option>
              {(() => {
                if (!roundData.evader_id) return null;
                const evaderInTeam1 = (selectedMatch.team1_players || []).some(p => p.id === roundData.evader_id);
                const options = evaderInTeam1 ? (selectedMatch.team2_players || []) : (selectedMatch.team1_players || []);
                return options.map(p => <option key={p.id} value={p.id}>{p.name}</option>);
              })()}
            </select>
          )}
        </div>

        <div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>Tag Made:</span>
            <input
              type="checkbox"
              checked={!!roundData.tag_made}
              onChange={(e) => setRoundData({ ...roundData, tag_made: e.target.checked, pinLocation: e.target.checked ? roundData.pinLocation : null })}
            />
          </label>
        </div>

        {roundData.tag_made && (
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Tag Time (seconds):</label>
            <input
              type="number"
              value={roundData.tag_time}
              onChange={(e) => setRoundData({ ...roundData, tag_time: e.target.value })}
              min="0"
              step="0.1"
              style={{ width: 120 }}
              required
            />
          </div>
        )}

        {roundData.tag_made && (
          <div style={{ marginTop: 8 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 100">
                {roundData.pinLocation && (
                  <circle cx={roundData.pinLocation.x} cy={roundData.pinLocation.y} r="2" fill="red" stroke="white" strokeWidth="0.5" />
                )}
              </svg>
              <img
                src="/images/quad.jpg"
                alt="Quad Map"
                style={{ width: '100%', height: 'auto', cursor: 'pointer', border: '1px solid #ccc' }}
                onClick={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setRoundData({ ...roundData, pinLocation: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 } });
                }}
              />
            </div>
            {roundData.pinLocation ? (
              <div style={{ marginTop: 6 }}>
                <button type="button" onClick={() => setRoundData({ ...roundData, pinLocation: null })}>Clear Pin Location</button>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Pin position: {roundData.pinLocation.x.toFixed(1)}%, {roundData.pinLocation.y.toFixed(1)}%
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Click on the map to mark the tag location.</div>
            )}
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>Timestamp:</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" value={roundData.round_hour || 0} onChange={(e) => setRoundData({ ...roundData, round_hour: parseInt(e.target.value) || 0 })} min="0" placeholder="Hours" style={{ width: 60 }} />
            <input type="number" value={roundData.round_minute || 0} onChange={(e) => setRoundData({ ...roundData, round_minute: parseInt(e.target.value) || 0 })} min="0" max="59" placeholder="Minutes" style={{ width: 60 }} />
            <input type="number" value={roundData.round_second || 0} onChange={(e) => setRoundData({ ...roundData, round_second: parseInt(e.target.value) || 0 })} min="0" max="59" placeholder="Seconds" style={{ width: 60 }} />
          </div>
        </div>

        <div>
          <button type="submit" disabled={!roundData.evader_id || !roundData.chaser_id || (roundData.tag_made && !roundData.tag_time)}>Add Round</button>
        </div>
      </form>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Rounds ({selectedMatch.rounds?.length || 0})</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setShowRounds(!showRounds)}>{showRounds ? 'Hide' : 'Show'}</button>
            <button type="button" onClick={handleDeleteLastRound} disabled={!selectedMatch.rounds || selectedMatch.rounds.length === 0}>Delete Last Round</button>
          </div>
        </div>
        {showRounds && (
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            {(selectedMatch.rounds || []).map((r, idx) => {
              const existingPin = (currentMatchPins || []).find(p => p.match_id === selectedMatch.id && p.round_index === idx);
              const isEditingThis = editingRound && editingRound.index === idx;
              const isTimeEditing = editingRoundTime && editingRoundTime.index === idx;
              return (
                <div key={idx} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Round {idx + 1}</strong>{' '}
                      <span>Evader: {r.evader?.name} | Chaser: {r.chaser?.name}</span>{' '}
                      <span>{r.tag_made ? `| Tagged at ${r.tag_time}s` : '| No Tag'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r.tag_made ? (
                        <button
                          type="button"
                          onClick={() => setEditingRound({
                            index: idx,
                            tag_made: true,
                            tag_time: r.tag_time,
                            pinLocation: existingPin ? existingPin.location : null,
                            existingPinId: existingPin ? existingPin.id : null,
                            originalChaserId: r.chaser?.id,
                            originalEvaderId: r.evader?.id,
                          })}
                        >
                          Edit Tag/Pin
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingRoundTime({ index: idx, hour: r.round_hour || 0, minute: r.round_minute || 0, second: r.round_second || 0 })}
                        >
                          Edit Timestamp
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditingThis && (
                    <form onSubmit={handleEditTagTime} style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4 }}>Tag Time (seconds):</label>
                        <input type="number" min="0" step="0.1" value={editingRound.tag_time} onChange={(e) => setEditingRound({ ...editingRound, tag_time: e.target.value })} required />
                      </div>
                      <div>
                        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 100">
                            {editingRound.pinLocation && (
                              <circle cx={editingRound.pinLocation.x} cy={editingRound.pinLocation.y} r="2" fill="red" stroke="white" strokeWidth="0.5" />
                            )}
                          </svg>
                          <img
                            src="/images/quad.jpg"
                            alt="Quad Map"
                            style={{ width: '100%', height: 'auto', cursor: 'pointer', border: '1px solid #ccc' }}
                            onClick={(e) => {
                              const rect = e.target.getBoundingClientRect();
                              const x = ((e.clientX - rect.left) / rect.width) * 100;
                              const y = ((e.clientY - rect.top) / rect.height) * 100;
                              setEditingRound({ ...editingRound, pinLocation: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 } });
                            }}
                          />
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                          <button type="button" onClick={() => setEditingRound({ ...editingRound, pinLocation: null })}>Clear Pin</button>
                          <button type="button" onClick={handleUpdatePinLocation}>Save Pin</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit">Save Tag Time</button>
                        <button type="button" onClick={() => setEditingRound(null)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {isTimeEditing && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="number" value={editingRoundTime.hour || 0} onChange={(e) => setEditingRoundTime({ ...editingRoundTime, hour: parseInt(e.target.value) || 0 })} min="0" placeholder="Hours" style={{ width: 60 }} />
                        <input type="number" value={editingRoundTime.minute || 0} onChange={(e) => setEditingRoundTime({ ...editingRoundTime, minute: parseInt(e.target.value) || 0 })} min="0" max="59" placeholder="Minutes" style={{ width: 60 }} />
                        <input type="number" value={editingRoundTime.second || 0} onChange={(e) => setEditingRoundTime({ ...editingRoundTime, second: parseInt(e.target.value) || 0 })} min="0" max="59" placeholder="Seconds" style={{ width: 60 }} />
                        <button type="button" onClick={() => handleUpdateRoundTime(selectedMatch.id, idx, editingRoundTime)}>Save</button>
                        <button type="button" onClick={() => setEditingRoundTime(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
