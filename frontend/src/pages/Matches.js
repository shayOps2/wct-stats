import React, { useEffect, useState } from "react";

function Matches() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matchType, setMatchType] = useState("1v1");
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    team1_name: "",
    team2_name: "",
    team1_player_ids: [],
    team2_player_ids: [],
    player1_id: "",
    player2_id: ""
  });
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [roundData, setRoundData] = useState({
    chaser_id: "",
    evader_id: "",
    tag_made: false,
    tag_time: 0,
    evading_team: ""
  });
  const [showRounds, setShowRounds] = useState(true);
  const [editingRoundIndex, setEditingRoundIndex] = useState(null);

  // Fetch matches and players on component mount
  useEffect(() => {
    fetchMatches();
    fetchPlayers();
  }, []);

  const fetchMatches = async () => {
    const response = await fetch("/matches/");
    const data = await response.json();
    setMatches(data);
  };

  const fetchPlayers = async () => {
    const response = await fetch("/players/");
    const data = await response.json();
    setPlayers(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch("/matches/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        match_type: matchType,
        date: new Date(formData.date).toISOString(),
        ...(matchType === "team"
          ? {
              team1_name: formData.team1_name,
              team2_name: formData.team2_name,
              team1_player_ids: formData.team1_player_ids,
              team2_player_ids: formData.team2_player_ids,
            }
          : {
              player1_id: formData.player1_id,
              player2_id: formData.player2_id,
            }),
      }),
    });

    if (response.ok) {
    fetchMatches();
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        team1_name: "",
        team2_name: "",
        team1_player_ids: [],
        team2_player_ids: [],
        player1_id: "",
        player2_id: ""
      });
    }
  };

  const handleDelete = async (matchId) => {
    const response = await fetch(`/matches/${matchId}`, {
      method: "DELETE",
    });
    if (response.ok) {
    fetchMatches();
      if (selectedMatch?.id === matchId) {
        setSelectedMatch(null);
      }
    }
  };

  const handleAddRound = async (e) => {
    e.preventDefault();
    if (!selectedMatch || !canAddMoreRounds(selectedMatch)) return;

    const response = await fetch(`/matches/${selectedMatch.id}/rounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chaser_id: roundData.chaser_id,
        evader_id: roundData.evader_id,
        tag_made: roundData.tag_made,
        tag_time: roundData.tag_made ? parseFloat(roundData.tag_time) : null,
        video_url: null,
        tag_location: null,
        quad_map_id: null
      }),
    });

    if (response.ok) {
      const updatedMatch = await response.json();
      setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      setSelectedMatch(updatedMatch);
      // Reset round form
      setRoundData({
        chaser_id: "",
        evader_id: "",
        tag_made: false,
        tag_time: 0
      });
    }
  };

  const handleEditRound = async (matchId, roundIndex, editedRound) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const updatedRounds = [...match.rounds];
    updatedRounds[roundIndex] = {
      ...updatedRounds[roundIndex],
      ...editedRound,
      tag_time: editedRound.tag_made ? parseFloat(editedRound.tag_time) : null
    };

    const response = await fetch(`/matches/${matchId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...match,
        rounds: updatedRounds
      }),
    });

    if (response.ok) {
      const updatedMatch = await response.json();
      setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      setSelectedMatch(updatedMatch);
      setEditingRoundIndex(null);
    }
  };

  // Get available players for round based on match type
  const getAvailablePlayers = () => {
    if (!selectedMatch) return [];
    
    if (selectedMatch.match_type === "team") {
      return [
        ...(selectedMatch.team1_players || []),
        ...(selectedMatch.team2_players || [])
      ];
    } else {
      return [selectedMatch.player1, selectedMatch.player2].filter(Boolean);
    }
  };

  // Helper function to check if match can accept more rounds
  const canAddMoreRounds = (match) => {
    if (!match) return false;
    if (match.is_completed) return false;
    
    const roundCount = match.rounds?.length || 0;
    
    if (match.match_type === "team") {
      const maxRegularRounds = 16;
      
      // If in sudden death, can always add rounds until someone scores
      if (match.is_sudden_death) {
        return true;
      }
      
      // If reached max rounds and scores are tied, should transition to sudden death
      if (roundCount >= maxRegularRounds) {
        return match.team1_score === match.team2_score;
      }
      
      // Check if match is already decided in regular rounds
      const remainingRounds = maxRegularRounds - roundCount;
      const team1Potential = match.team1_score + remainingRounds;
      const team2Potential = match.team2_score + remainingRounds;
      return team1Potential >= match.team2_score && team2Potential >= match.team1_score;
    } else { // 1v1
      if (match.is_sudden_death) {
        return roundCount < 6;  // 4 regular rounds + 2 sudden death rounds
      }
      return roundCount < 4;  // Regular 1v1 has 4 rounds
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Matches</h2>
      
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
                  date: new Date().toISOString().split('T')[0],
                  team1_name: "",
                  team2_name: "",
                  team1_player_ids: [],
                  team2_player_ids: [],
                  player1_id: "",
                  player2_id: ""
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

      {/* Matches List */}
      <div style={{ display: "flex", gap: 24 }}>
        {/* Matches Grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, flex: 2 }}>
          {matches.map(match => (
            <div 
              key={match.id} 
              style={{ 
                border: `1px solid ${selectedMatch?.id === match.id ? '#007bff' : '#ccc'}`,
                borderRadius: 8, 
                padding: 12, 
                width: 300,
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedMatch(match);
                // Initialize roundData based on match type and state
                if (match.match_type === "1v1") {
                  const isEvenRound = match.rounds.length % 2 === 0;
                  setRoundData({
                    chaser_id: isEvenRound ? match.player2.id : match.player1.id,
                    evader_id: isEvenRound ? match.player1.id : match.player2.id,
                    tag_made: false,
                    tag_time: 0,
                    evading_team: ""
                  });
                } else {
                  // For team matches
                  const lastRound = match.rounds[match.rounds.length - 1];
                  
                  if (match.is_sudden_death) {
                    if (match.rounds.length === 16) {
                      // First sudden death round - allow team selection
                      setRoundData({
                        chaser_id: "",
                        evader_id: "",
                        tag_made: false,
                        tag_time: 0,
                        evading_team: ""
                      });
                    } else if (match.rounds.length === 17) {
                      // Second sudden death round - set evading team to previous chasing team
                      const firstSuddenDeathRound = match.rounds[16];
                      const chaserInTeam1 = match.team1_players.some(p => p.id === firstSuddenDeathRound.chaser.id);
                      setRoundData({
                        chaser_id: "",
                        evader_id: "",
                        tag_made: false,
                        tag_time: 0,
                        evading_team: chaserInTeam1 ? "team1" : "team2"
                      });
                    }
                  } else if (match.rounds.length === 0) {
                    // First round - allow team selection
                    setRoundData({
                      chaser_id: "",
                      evader_id: "",
                      tag_made: false,
                      tag_time: 0,
                      evading_team: ""
                    });
                  } else {
                    // Regular rounds - follow standard rules
                    setRoundData({
                      chaser_id: "",
                      evader_id: lastRound ? (
                        !lastRound.tag_made ? lastRound.evader.id : // After successful evasion, same evader continues
                        lastRound.chaser.id  // After successful tag, chaser becomes evader
                      ) : "",
                      tag_made: false,
                      tag_time: 0,
                      evading_team: ""
                    });
                  }
                }
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>Type:</strong> {match.match_type}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Date:</strong> {new Date(match.date).toLocaleDateString()}
              </div>
              {match.match_type === "team" ? (
                <>
                  <div style={{ marginBottom: 4 }}><strong>{match.team1_name}</strong> vs <strong>{match.team2_name}</strong></div>
                  <div style={{ marginBottom: 8 }}>Score: {match.team1_score} - {match.team2_score}</div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 4 }}><strong>{match.player1?.name}</strong> vs <strong>{match.player2?.name}</strong></div>
                  <div style={{ marginBottom: 8 }}>Score: {match.team1_score} - {match.team2_score}</div>
                </>
              )}
              {match.is_completed && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Winner:</strong> {match.winner}
                </div>
              )}
              {match.is_sudden_death && (
                <div style={{ marginBottom: 8, color: "#f55" }}>
                  SUDDEN DEATH
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <strong>Rounds:</strong> {match.rounds?.length || 0}
              </div>
            <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(match.id);
                }}
                style={{ background: "#f55", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}
            >
              Delete
            </button>
            </div>
          ))}
        </div>

        {/* Round Management Panel */}
        {selectedMatch && (
          <div style={{ flex: 1, padding: 16, border: "1px solid #ccc", borderRadius: 8, minWidth: 300 }}>
            <h3>Manage Rounds</h3>
            <div style={{ marginBottom: 16 }}>
              <strong>{selectedMatch.match_type === "team" 
                ? `${selectedMatch.team1_name} vs ${selectedMatch.team2_name}`
                : `${selectedMatch.player1?.name} vs ${selectedMatch.player2?.name}`}
              </strong>
            </div>

            {/* Round Creation Form */}
            {canAddMoreRounds(selectedMatch) ? (
              <form onSubmit={handleAddRound} style={{ marginBottom: 16 }}>
                {selectedMatch.match_type === "team" && (selectedMatch.rounds.length === 0 || selectedMatch.is_sudden_death) ? (
                  // Team match first round or sudden death logic (unchanged)
                  <>
                    {/* Step 1: Select evading team (only for first round or first sudden death round) */}
                    {(selectedMatch.rounds.length === 0 || 
                      (selectedMatch.is_sudden_death && selectedMatch.rounds.length === 16)) && (
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', marginBottom: 4 }}>
                          Evading Team:
                          <select
                            value={roundData.evading_team}
                            onChange={(e) => {
                              setRoundData({
                                ...roundData,
                                evading_team: e.target.value,
                                evader_id: "",
                                chaser_id: ""
                              });
                            }}
                            style={{ marginLeft: 8 }}
                            required
                          >
                            <option value="">Select Team</option>
                            <option value="team1">{selectedMatch.team1_name}</option>
                            <option value="team2">{selectedMatch.team2_name}</option>
                          </select>
                        </label>
                      </div>
                    )}

                    {/* For second sudden death round, automatically set evading team */}
                    {selectedMatch.is_sudden_death && selectedMatch.rounds.length === 17 && (() => {
                      // Get the chasing team from the first sudden death round
                      const firstSuddenDeathRound = selectedMatch.rounds[16];
                      const chaserInTeam1 = selectedMatch.team1_players.some(p => p.id === firstSuddenDeathRound.chaser.id);
                      // Set the evading team to the team that chased in the first sudden death round
                      if (!roundData.evading_team) {
                        setTimeout(() => {
                          setRoundData(prev => ({
                            ...prev,
                            evading_team: chaserInTeam1 ? 'team1' : 'team2'
                          }));
                        }, 0);
                      }
                      return (
                        <div style={{ marginBottom: 8 }}>
                          <strong>Evading Team: {chaserInTeam1 ? selectedMatch.team1_name : selectedMatch.team2_name}</strong>
                          <div style={{ fontSize: '0.9em', color: '#666' }}>
                            (Team that chased in first sudden death round must evade)
                          </div>
                        </div>
                      );
                    })()}

                    {/* Step 2: Select evader from chosen team */}
                    {roundData.evading_team && (
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', marginBottom: 4 }}>
                          Evader:
                          <select
                            value={roundData.evader_id}
                            onChange={(e) => {
                              setRoundData({
                                ...roundData,
                                evader_id: e.target.value,
                                chaser_id: ""
                              });
                            }}
                            style={{ marginLeft: 8 }}
                            required
                          >
                            <option value="">Select Evader</option>
                            {(roundData.evading_team === "team1" ? selectedMatch.team1_players : selectedMatch.team2_players).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    {/* Step 3: Select chaser from opposing team */}
                    {roundData.evader_id && (
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', marginBottom: 4 }}>
                          Chaser:
                          <select
                            value={roundData.chaser_id}
                            onChange={(e) => setRoundData({ ...roundData, chaser_id: e.target.value })}
                            style={{ marginLeft: 8 }}
                            required
                          >
                            <option value="">Select Chaser</option>
                            {(roundData.evading_team === "team1" ? selectedMatch.team2_players : selectedMatch.team1_players).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    {/* Add sudden death round indicator */}
                    {selectedMatch.is_sudden_death && (
                      <div style={{ marginTop: 8, padding: 8, backgroundColor: '#fff3f3', borderRadius: 4 }}>
                        <strong style={{ color: '#d32f2f' }}>
                          Sudden Death Round {selectedMatch.rounds.length - 15} of 2
                        </strong>
                        <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>
                          Winner will be determined by longest evasion time
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Regular round selection and 1v1 sudden death
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>
                        Evader:
                        {selectedMatch.match_type === "1v1" ? (
                          <>
                            {selectedMatch.is_sudden_death ? (
                              // 1v1 Sudden Death Logic
                              <>
                                {selectedMatch.rounds.length === 4 ? (
                                  // First sudden death round - allow evader selection
                                  <select
                                    value={roundData.evader_id}
                                    onChange={(e) => {
                                      setRoundData({
                                        ...roundData,
                                        evader_id: e.target.value,
                                        // Set chaser automatically to the other player
                                        chaser_id: e.target.value === selectedMatch.player1.id ? 
                                          selectedMatch.player2.id : selectedMatch.player1.id
                                      });
                                    }}
                                    style={{ marginLeft: 8 }}
                                    required
                                  >
                                    <option value="">Select Evader</option>
                                    <option value={selectedMatch.player1.id}>{selectedMatch.player1.name}</option>
                                    <option value={selectedMatch.player2.id}>{selectedMatch.player2.name}</option>
                                  </select>
                                ) : (
                                  // Second sudden death round - evader is previous chaser
                                  (() => {
                                    const firstSuddenDeathRound = selectedMatch.rounds[4];
                                    const previousChaser = firstSuddenDeathRound.chaser;
                                    // Auto-set the evader and chaser if not set
                                    if (!roundData.evader_id) {
                                      setTimeout(() => {
                                        setRoundData(prev => ({
                                          ...prev,
                                          evader_id: previousChaser.id,
                                          chaser_id: previousChaser.id === selectedMatch.player1.id ? 
                                            selectedMatch.player2.id : selectedMatch.player1.id
                                        }));
                                      }, 0);
                                    }
                                    return (
                                      <input
                                        type="text"
                                        value={previousChaser.name}
                                        disabled
                                        style={{ marginLeft: 8 }}
                                      />
                                    );
                                  })()
                                )}
                                {/* Add sudden death round indicator */}
                                <div style={{ marginTop: 8, padding: 8, backgroundColor: '#fff3f3', borderRadius: 4 }}>
                                  <strong style={{ color: '#d32f2f' }}>
                                    Sudden Death Round {selectedMatch.rounds.length - 3} of 2
                                  </strong>
                                  <div style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>
                                    Winner will be determined by longest evasion time
                                  </div>
                                </div>
                              </>
                            ) : (
                              // Regular 1v1 rounds
                              <>
                                <input
                                  type="text"
                                  value={selectedMatch.rounds.length % 2 === 0 ? selectedMatch.player1.name : selectedMatch.player2.name}
                                  disabled
                                  style={{ marginLeft: 8 }}
                                />
                                {/* Hidden input and auto-set logic for regular rounds */}
                                {(() => {
                                  if (roundData.evader_id === "") {
                                    setTimeout(() => {
                                      setRoundData(prev => ({
                                        ...prev,
                                        evader_id: selectedMatch.rounds.length % 2 === 0 ? selectedMatch.player1.id : selectedMatch.player2.id,
                                        chaser_id: selectedMatch.rounds.length % 2 === 0 ? selectedMatch.player2.id : selectedMatch.player1.id
                                      }));
                                    }, 0);
                                  }
                                  return null;
                                })()}
                              </>
                            )}
                          </>
                        ) : (
                          // Team match regular rounds (unchanged)
                          <select
                            value={roundData.evader_id}
                            onChange={(e) => {
                              setRoundData({ 
                                ...roundData, 
                                evader_id: e.target.value,
                                chaser_id: "" 
                              });
                            }}
                            style={{ marginLeft: 8 }}
                            required
                            disabled={selectedMatch.rounds.length > 0}
                          >
                            <option value="">Select Evader</option>
                            {(() => {
                              const lastRound = selectedMatch.rounds[selectedMatch.rounds.length - 1];
                              if (lastRound) {
                                const nextEvader = !lastRound.tag_made ? lastRound.evader : lastRound.chaser;
                                if (!roundData.evader_id) {
                                  setTimeout(() => {
                                    setRoundData(prev => ({
                                      ...prev,
                                      evader_id: nextEvader.id
                                    }));
                                  }, 0);
                                }
                                return [nextEvader].map(p => (
                                  <option key={p.id} value={p.id}>
                                    {`${p.name} (${!lastRound.tag_made ? 'must continue after evasion' : 'must evade after successful tag'})`}
                                  </option>
                                ));
                              }
                              return null;
                            })()}
                          </select>
                        )}
                      </label>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>
                        Chaser:
                        {selectedMatch.match_type === "1v1" ? (
                          <>
                            {selectedMatch.is_sudden_death ? (
                              // 1v1 Sudden Death - chaser is automatically set
                              <input
                                type="text"
                                value={roundData.chaser_id ? 
                                  (roundData.chaser_id === selectedMatch.player1.id ? selectedMatch.player1.name : selectedMatch.player2.name) 
                                  : "Select evader first"}
                                disabled
                                style={{ marginLeft: 8 }}
                              />
                            ) : (
                              // Regular 1v1 rounds
                              <input
                                type="text"
                                value={selectedMatch.rounds.length % 2 === 0 ? selectedMatch.player2.name : selectedMatch.player1.name}
                                disabled
                                style={{ marginLeft: 8 }}
                              />
                            )}
                          </>
                        ) : (
                          // Team match regular rounds (unchanged)
                          <select
                            value={roundData.chaser_id}
                            onChange={(e) => setRoundData({ ...roundData, chaser_id: e.target.value })}
                            style={{ marginLeft: 8 }}
                            required
                          >
                            <option value="">Select Chaser</option>
                            {(() => {
                              if (!roundData.evader_id) return [];
                              const evaderInTeam1 = selectedMatch.team1_players.some(p => p.id === roundData.evader_id);
                              return (evaderInTeam1 ? selectedMatch.team2_players : selectedMatch.team1_players).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ));
                            })()}
                          </select>
                        )}
                      </label>
                    </div>
                  </>
                )}

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>
                    Tag Made:
                    <input
                      type="checkbox"
                      checked={roundData.tag_made}
                      onChange={(e) => setRoundData({ ...roundData, tag_made: e.target.checked })}
                      style={{ marginLeft: 8 }}
                    />
                  </label>
                </div>

                {roundData.tag_made && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: 'block', marginBottom: 4 }}>
                      Tag Time (seconds):
                      <input
                        type="number"
                        value={roundData.tag_time}
                        onChange={(e) => setRoundData({ ...roundData, tag_time: e.target.value })}
                        min="0"
                        max="20"
                        step="0.1"
                        style={{ marginLeft: 8 }}
                        required
                      />
                    </label>
                  </div>
                )}

                <button type="submit">Add Round</button>
              </form>
            ) : (
              <div style={{ marginBottom: 16, color: '#f55' }}>
                {selectedMatch.is_completed 
                  ? `Match is completed. Winner: ${selectedMatch.winner}`
                  : selectedMatch.match_type === "team"
                    ? "Match is in progress but no more rounds can be added (score difference too high)."
                    : "Match is in progress but no more rounds can be added."
                }
              </div>
            )}

            {/* Rounds List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0 }}>Rounds:</h4>
                <button 
                  onClick={() => setShowRounds(!showRounds)}
                  style={{ marginLeft: 8, padding: '2px 8px' }}
                >
                  {showRounds ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showRounds && selectedMatch.rounds?.map((round, index) => (
                <div key={index} style={{ marginBottom: 8, padding: 8, border: "1px solid #eee", borderRadius: 4 }}>
                  {editingRoundIndex === index ? (
                    // Edit form
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleEditRound(selectedMatch.id, index, roundData);
                    }}>
                      <div style={{ marginBottom: 4 }}>
                        <label>
                          Chaser:
                          <select
                            value={roundData.chaser_id}
                            onChange={(e) => setRoundData({ ...roundData, chaser_id: e.target.value })}
                            required
                          >
                            {getAvailablePlayers().map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <label>
                          Evader:
                          <select
                            value={roundData.evader_id}
                            onChange={(e) => setRoundData({ ...roundData, evader_id: e.target.value })}
                            required
                          >
                            {getAvailablePlayers().map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <label>
                          Tag Made:
                          <input
                            type="checkbox"
                            checked={roundData.tag_made}
                            onChange={(e) => setRoundData({ ...roundData, tag_made: e.target.checked })}
                          />
                        </label>
                      </div>
                      {roundData.tag_made && (
                        <div style={{ marginBottom: 4 }}>
                          <label>
                            Tag Time:
                            <input
                              type="number"
                              value={roundData.tag_time}
                              onChange={(e) => setRoundData({ ...roundData, tag_time: e.target.value })}
                              min="0"
                              max="20"
                              step="0.1"
                              required
                            />
                          </label>
                        </div>
                      )}
                      <div>
                        <button type="submit">Save</button>
                        <button type="button" onClick={() => setEditingRoundIndex(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    // Round display
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>Round {index + 1} {selectedMatch.is_sudden_death && index >= (selectedMatch.match_type === "team" ? 16 : 4) && "(Sudden Death)"}</div>
                        <button 
                          onClick={() => {
                            setRoundData({
                              chaser_id: round.chaser.id,
                              evader_id: round.evader.id,
                              tag_made: round.tag_made,
                              tag_time: round.tag_time || 0
                            });
                            setEditingRoundIndex(index);
                          }}
                          style={{ padding: '2px 8px' }}
                        >
                          Edit
                        </button>
                      </div>
                      <div>Chaser: {round.chaser.name}</div>
                      <div>Evader: {round.evader.name}</div>
                      <div>Result: {round.tag_made 
                        ? `Tagged at ${round.tag_time}s` 
                        : "Evaded (20s)"}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Matches;
