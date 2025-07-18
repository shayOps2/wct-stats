import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "../config"; // Import the constant

function extractTimeFromVideoURL(videoURL) {
  const timeRegex = /[?&]t=(\d+)h(\d+)m(\d+)s/;
  const match = videoURL.match(timeRegex);
  if (match) {
    return {
      hour: parseInt(match[1], 10),
      minute: parseInt(match[2], 10),
      second: parseInt(match[3], 10),
    };
  }
  return { hour: 0, minute: 0, second: 0 };
}

function formatDateForInput(dateString) {
  // Create a date object in local timezone
  const date = new Date(dateString);
  // Get the local date string in YYYY-MM-DD format
  return date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
}

function formatDateForDisplay(dateString) {
  // Create a date object and format it for display
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateForAPI(dateString) {
  // Create a date object at noon UTC to avoid timezone issues
  const date = new Date(dateString);
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString();
}

function Matches() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
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
          const response = await fetch(`${BACKEND_URL}/pins/?match_id=${selectedMatch.id}`);
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
    const response = await fetch(`${BACKEND_URL}/matches/`);
    const data = await response.json();
    setMatches(data);
  };

  const fetchPlayers = async () => {
    const response = await fetch(`${BACKEND_URL}/players/`);
    const data = await response.json();
    setPlayers(data);
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

      // Save pin if location is set
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

      // Reset round form
      setRoundData({
        chaser_id: "",
        evader_id: "",
        tag_made: false,
        tag_time: 0,
        evading_team: "",
        round_hour: 0,
        round_minute: 0,
        round_second: 0,        
        pinLocation: null
      });
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
      
      // Early termination check after round 3
      if (roundCount === 3) {
        // If score difference is greater than 1, match is already decided
        const scoreDiff = Math.abs(match.team1_score - match.team2_score);
        if (scoreDiff > 1) {
          return false; // Match should be completed
        }
      }
      
      return roundCount < 4;  // Regular 1v1 has 4 rounds
    }
  };

  const handleEditTagTime = async (e) => {
    e.preventDefault();
  
    // Ensure editing is only allowed for valid rounds
    if (!selectedMatch || !editingRound || !editingRound.tag_made) {
      console.warn("handleEditTagTime called inappropriately or tag_made is false.");
      setEditingRound(null);
      return;
    }
    const token = localStorage.getItem("token");
  
    try {
      // Prepare the payload for updating the tag time
      const tagTimeUpdatePayload = {
        tag_time: parseFloat(editingRound.tag_time),
        tag_made: editingRound.tag_made,
      };
  
      // Send the update request to the backend
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
  
      // Update the match state with the updated round
      const updatedMatch = await matchRoundUpdateResponse.json();
      setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
      setSelectedMatch(updatedMatch);
      setEditingRound(null); // Clear editing state

      // Show success alert
      alert("Tag time updated successfully!");      
    } catch (error) {
      console.error("Error in handleEditTagTime:", error);
      alert("An error occurred while saving tag time changes.");
    }
  };

  const handleUpdatePinLocation = async () => {
    if (!selectedMatch || !editingRound) {
      console.warn("handleUpdatePinLocation called inappropriately.");
      return;
    }

    try {
      const pinIdToManage = editingRound.existingPinId;
      const newPinLocation = editingRound.pinLocation;
      const chaserId = editingRound.originalChaserId;
      const evaderId = editingRound.originalEvaderId;
      const matchId = selectedMatch.id;
      const roundIndex = editingRound.index;

      // First, cleanup any potential duplicate pins for this match and round
      if (currentMatchPins.length > 0) {
        const pinsForThisRound = currentMatchPins.filter(
          p => p.match_id === matchId && p.round_index === roundIndex
        );
        
        // If we found multiple pins for this round, clean them up (keep only the one we're managing)
        if (pinsForThisRound.length > 1) {
          console.log(`Found ${pinsForThisRound.length} pins for match ${matchId}, round ${roundIndex}. Cleaning up duplicates...`);
          
          // Delete all pins for this round except the one we're currently managing (if it exists)
          for (const pin of pinsForThisRound) {
            if (pinIdToManage && pin.id === pinIdToManage) {
              continue; // Skip the pin we're currently managing
            }
            
            try {
              console.log(`Deleting duplicate pin ${pin.id}`);
              await fetch(`${BACKEND_URL}/pins/${pin.id}`, { method: 'DELETE' });
            } catch (error) {
              console.error(`Error deleting duplicate pin ${pin.id}:`, error);
            }
          }
        }
      }

      if (editingRound.tag_made) {
        if (pinIdToManage) {
          // User wants a pin, and one existed: UPDATE IT
          console.log(`Updating pin ${pinIdToManage} with location:`, newPinLocation);
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
          // User wants a pin, but none existed: CREATE IT
          const pinToCreate = {
            location: newPinLocation,
            chaser_id: chaserId, 
            evader_id: evaderId,
            match_id: matchId,
            round_index: roundIndex,
          };
          console.log("Creating new pin:", pinToCreate);
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
        // No pin wanted, but one existed: DELETE IT
        console.log(`Deleting pin ${pinIdToManage}`);
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

      // After successful pin operation, refetch pins for consistency
      if (selectedMatch && selectedMatch.id) {
        const pinsResponse = await fetch(`${BACKEND_URL}/pins/?match_id=${selectedMatch.id}`);
        if (pinsResponse.ok) {
          setCurrentMatchPins(await pinsResponse.json());
          alert("Pin location updated successfully!");
        }
        else {
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
    
    if (!window.confirm("Are you sure you want to delete the last round?")) {
      return;
    }
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
                  if (match.rounds.length === 0) {
                    // For first round, let the user choose
                    setRoundData({
                      chaser_id: "",
                      evader_id: "",
                      tag_made: false,
                      tag_time: 0,
                      evading_team: "",
                      pinLocation: null
                    });
                  } else if (match.is_sudden_death) {
                    if (match.rounds.length === 4) {
                      // First sudden death round - allow player selection
                      setRoundData({
                        chaser_id: "",
                        evader_id: "",
                        tag_made: false,
                        tag_time: 0,
                        evading_team: "",
                        pinLocation: null
                      });
                    } else if (match.rounds.length === 5) {
                      // Second sudden death round - previous chaser becomes evader
                      const firstSuddenDeathRound = match.rounds[4];
                      setRoundData({
                        evader_id: firstSuddenDeathRound.chaser.id,
                        chaser_id: firstSuddenDeathRound.evader.id,
                        tag_made: false,
                        tag_time: 0,
                        evading_team: "",
                        pinLocation: null
                      });
                    }
                  } else {
                    // Regular rounds - determine based on first round pattern
                    const firstRound = match.rounds[0];
                    const firstEvaderWasPlayer1 = firstRound.evader.id === match.player1.id;
                    const currentRound = match.rounds.length;
                    let nextEvader;
                    
                    if (currentRound % 2 === 0) { // Even rounds (2, 4) - same as first round
                      nextEvader = firstEvaderWasPlayer1 ? match.player1 : match.player2;
                    } else { // Odd rounds (1, 3) - opposite of first round
                      nextEvader = firstEvaderWasPlayer1 ? match.player2 : match.player1;
                    }
                    
                    setRoundData({
                      evader_id: nextEvader.id,
                      chaser_id: nextEvader.id === match.player1.id ? match.player2.id : match.player1.id,
                      tag_made: false,
                      tag_time: 0,
                      evading_team: "",
                      pinLocation: null
                    });
                  }
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
                        evading_team: "",
                        pinLocation: null
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
                        evading_team: chaserInTeam1 ? "team1" : "team2",
                        pinLocation: null
                      });
                    }
                  } else if (match.rounds.length === 0) {
                    // First round - allow team selection
                    setRoundData({
                      chaser_id: "",
                      evader_id: "",
                      tag_made: false,
                      tag_time: 0,
                      evading_team: "",
                      pinLocation: null
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
                      evading_team: "",
                      pinLocation: null
                    });
                  }
                }
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>Type:</strong> {match.match_type}
              </div>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong>Date:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <input
                    type="date"
                    value={formatDateForInput(match.date)}
                    onChange={(e) => handleEditDate(match.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()} // Prevent card click when editing date
                    style={{ 
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      padding: '2px 4px'
                    }}
                  />
                  <span style={{ fontSize: '0.8em', color: '#666' }}>
                    {formatDateForDisplay(match.date)}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong>Video URL:</strong>
                <input
                  type="url"
                  value={selectedMatch?.id === match.id ? selectedMatch.video_url || "" : match.video_url || ""}
                  onChange={(e) => {
                    if (selectedMatch?.id === match.id) {
                      setSelectedMatch({ ...selectedMatch, video_url: e.target.value });
                    } else {
                      setMatches(matches.map(m => m.id === match.id ? { ...m, video_url: e.target.value } : m));
                    }
                  }}
                  placeholder="Edit video URL"
                  style={{ border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px', width: '100%' }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateVideoURL(match.id, selectedMatch?.id === match.id ? selectedMatch.video_url : match.video_url);
                  }}
                  style={{ padding: '4px 8px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Update
                </button>
              </div>
              {match.match_type === "team" ? (
                <>
                  <div style={{ marginBottom: 4 }}>
                    <strong>{match.team1_name || generateTeamName(match.team1_players.map(p => p.id))}</strong> 
                    vs 
                    <strong>{match.team2_name || generateTeamName(match.team2_players.map(p => p.id))}</strong>
                  </div>
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
                ? `${selectedMatch.team1_name || generateTeamName(selectedMatch.team1_players.map(p => p.id))} vs ${selectedMatch.team2_name || generateTeamName(selectedMatch.team2_players.map(p => p.id))}`
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
                            <option value="team1">{selectedMatch.team1_name || generateTeamName(selectedMatch.team1_players.map(p => p.id))}</option>
                            <option value="team2">{selectedMatch.team2_name || generateTeamName(selectedMatch.team2_players.map(p => p.id))}</option>
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
                          <strong>Evading Team: {chaserInTeam1 ? selectedMatch.team1_name || generateTeamName(selectedMatch.team1_players.map(p => p.id)) : selectedMatch.team2_name || generateTeamName(selectedMatch.team2_players.map(p => p.id))}</strong>
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
                                {selectedMatch.rounds.length === 0 ? (
                                  // First round - allow user to select who evades first
                                  <select
                                    value={roundData.evader_id}
                                    onChange={(e) => {
                                      const evaderId = e.target.value;
                                      setRoundData({
                                        ...roundData,
                                        evader_id: evaderId,
                                        // Set chaser automatically to the other player
                                        chaser_id: evaderId === selectedMatch.player1.id ? 
                                          selectedMatch.player2.id : selectedMatch.player1.id
                                      });
                                    }}
                                    style={{ marginLeft: 8 }}
                                    required
                                  >
                                    <option value="">Select First Evader</option>
                                    <option value={selectedMatch.player1.id}>{selectedMatch.player1.name}</option>
                                    <option value={selectedMatch.player2.id}>{selectedMatch.player2.name}</option>
                                  </select>
                                ) : (
                                  // Subsequent rounds - determine based on first round pattern
                                  (() => {
                                    const firstRound = selectedMatch.rounds[0];
                                    const firstEvaderWasPlayer1 = firstRound.evader.id === selectedMatch.player1.id;
                                    const currentRound = selectedMatch.rounds.length;
                                    
                                    // Determine current evader based on round number and first evader
                                    let currentEvader;
                                    if (currentRound % 2 === 0) { // Even rounds (2, 4) - same as first round
                                      currentEvader = firstEvaderWasPlayer1 ? selectedMatch.player1 : selectedMatch.player2;
                                    } else { // Odd rounds (1, 3) - opposite of first round
                                      currentEvader = firstEvaderWasPlayer1 ? selectedMatch.player2 : selectedMatch.player1;
                                    }
                                    
                                    // Auto-set the evader and chaser if not set
                                    if (roundData.evader_id === "") {
                                      setTimeout(() => {
                                        setRoundData({
                                          ...roundData,
                                          evader_id: currentEvader.id,
                                          chaser_id: currentEvader.id === selectedMatch.player1.id ? 
                                            selectedMatch.player2.id : selectedMatch.player1.id
                                        });
                                      }, 0);
                                    }
                                    
                                    return (
                                      <input
                                        type="text"
                                        value={currentEvader.name}
                                        disabled
                                        style={{ marginLeft: 8 }}
                                      />
                                    );
                                  })()
                                )}
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
                                value={
                                  roundData.chaser_id ? 
                                    (roundData.chaser_id === selectedMatch.player1.id ? 
                                      selectedMatch.player1.name : selectedMatch.player2.name)
                                    : "Select evader first"
                                }
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
                      onChange={(e) => setRoundData({ ...roundData, tag_made: e.target.checked, pinLocation: e.target.checked ? roundData.pinLocation : null })}
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
                        step="0.1"
                        style={{ marginLeft: 8, width: 80 }}
                        required
                      />
                    </label>
                  </div>
                )}

                {/* PIN LOCATION LOGIC - START */}
                {roundData.tag_made && (
                  <div style={{ marginBottom: 16, marginTop: 8, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                      Tag Location (Optional):
                    </label>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                      <svg 
                        style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%',
                          pointerEvents: 'none'
                        }}
                        preserveAspectRatio="none"
                        viewBox="0 0 100 100"
                      >
                        {roundData.pinLocation && (
                          <circle
                            cx={roundData.pinLocation.x}
                            cy={roundData.pinLocation.y}
                            r="2"
                            fill="red"
                            stroke="white"
                            strokeWidth="0.5"
                          />
                        )}
                      </svg>
                      <img 
                        src="/images/quad.jpg" 
                        alt="Quad Map" 
                        style={{ width: '100%', height: 'auto', cursor: 'pointer', border: '1px solid #ccc' }}
                        onClick={(e) => {
                          const rect = e.target.getBoundingClientRect();
                          // Calculate position as percentage of image dimensions
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          setRoundData({ 
                            ...roundData, 
                            pinLocation: { 
                              x: Math.round(x * 100) / 100, // Round to 2 decimal places
                              y: Math.round(y * 100) / 100
                            } 
                          });
                        }}
                      />
                    </div>
                    {roundData.pinLocation && (
                      <div>
                        <button 
                          type="button" 
                          onClick={() => setRoundData({ ...roundData, pinLocation: null })}
                          style={{ marginTop: 8, fontSize: '0.9em' }}
                        >
                          Clear Pin Location
                        </button>
                        <div style={{ fontSize: '0.8em', color: '#666', marginTop: 4 }}>
                          Pin position: {roundData.pinLocation.x.toFixed(1)}%, {roundData.pinLocation.y.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {!roundData.pinLocation && (
                      <p style={{ fontSize: '0.9em', color: '#666', margin: '4px 0 0 0' }}>
                        Click on the map to mark the tag location.
                      </p>
                    )}
                  </div>
                )}
                {/* PIN LOCATION LOGIC - END */}

                {/* Time Inputs for Round */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>
                    Timestamp:
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        value={roundData.round_hour || 0}
                        onChange={(e) => setRoundData({ ...roundData, round_hour: parseInt(e.target.value) || 0 })}
                        min="0"
                        placeholder="Hours"
                        style={{ width: 60 }}
                      />
                      <input
                        type="number"
                        value={roundData.round_minute || 0}
                        onChange={(e) => setRoundData({ ...roundData, round_minute: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="59"
                        placeholder="Minutes"
                        style={{ width: 60 }}
                      />
                      <input
                        type="number"
                        value={roundData.round_second || 0}
                        onChange={(e) => setRoundData({ ...roundData, round_second: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="59"
                        placeholder="Seconds"
                        style={{ width: 60 }}
                      />
                    </div>
                  </label>
                </div>

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
                {showRounds && selectedMatch?.rounds?.length > 0 && !selectedMatch.is_completed && !selectedMatch.is_sudden_death && (
                  <button 
                    onClick={handleDeleteLastRound}
                    style={{ marginLeft: 8, padding: '2px 8px', background: '#f55', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    Delete Last Round
                  </button>
                )}
              </div>
              
              {showRounds && selectedMatch.rounds?.map((round, index) => (
                <div key={index} style={{ marginBottom: 8, padding: 8, border: "1px solid #eee", borderRadius: 4 }}>
                  {editingRound && editingRound.index === index ? (
                    // Editing form for round - REVISED to separate pin editing
                    <form onSubmit={handleEditTagTime}>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Round {index + 1} {selectedMatch.is_sudden_death && index >= (selectedMatch.match_type === "team" ? 16 : 4) && "(Sudden Death)"}</strong>
                      </div>
                      <div style={{ marginBottom: 4, fontSize: '0.9em', color: '#333' }}>
                        Chaser: {editingRound.chaserName}, Evader: {editingRound.evaderName}
                      </div>
                      <div style={{ marginBottom: 8, fontSize: '0.9em', color: '#333' }}>
                        Original Result: Tagged {/* Since tag_made must be true to edit */}
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', marginBottom: 4 }}>
                          Tag Time (seconds):
                          <input
                            type="number"
                            value={editingRound.tag_time}
                            onChange={(e) => setEditingRound({ ...editingRound, tag_time: e.target.value })}
                            min="0"
                            step="0.1"
                            style={{ marginLeft: 8, width: 80 }}
                            required
                          />
                        </label>
                      </div>

                      {/* PIN LOCATION LOGIC FOR EDIT FORM */}
                      <div style={{ marginBottom: 16, marginTop: 8, padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                          Tag Location (Optional):
                        </label>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                          <svg 
                            style={{ 
                              position: 'absolute', 
                              top: 0, 
                              left: 0, 
                              width: '100%', 
                              height: '100%',
                              pointerEvents: 'none'
                            }}
                            preserveAspectRatio="none"
                            viewBox="0 0 100 100"
                          >
                            {editingRound.pinLocation && (
                              <circle
                                cx={editingRound.pinLocation.x}
                                cy={editingRound.pinLocation.y}
                                r="2"
                                fill="red"
                                stroke="white"
                                strokeWidth="0.5"
                              />
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
                              setEditingRound({ 
                                ...editingRound, 
                                pinLocation: { 
                                  x: Math.round(x * 100) / 100,
                                  y: Math.round(y * 100) / 100 
                                } 
                              });
                            }}
                          />
                        </div>
                        {editingRound.pinLocation && (
                          <div>
                            <button 
                              type="button" 
                              onClick={() => setEditingRound({ ...editingRound, pinLocation: null })}
                              style={{ marginTop: 8, fontSize: '0.9em' }}
                            >
                              Clear Pin Location
                            </button>
                            <div style={{ fontSize: '0.8em', color: '#666', marginTop: 4 }}>
                              Pin position: {editingRound.pinLocation.x.toFixed(1)}%, {editingRound.pinLocation.y.toFixed(1)}%
                            </div>
                          </div>
                        )}
                        {!editingRound.pinLocation && (
                          <p style={{ fontSize: '0.9em', color: '#666', margin: '4px 0 0 0' }}>
                            Click on the map to mark the tag location.
                          </p>
                        )}
                      </div>


                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="submit">Update Tag Time</button>
                        <button 
                          type="button" 
                          onClick={handleUpdatePinLocation}
                          style={{ background: '#4CAF50', color: 'white' }}
                        >
                          Update Pin Location
                        </button>
                        {editingRound && (
                          <form onSubmit={(e) => e.preventDefault()}>
                            <div style={{ marginBottom: 8 }}>
                              <strong>Round {editingRound.index + 1}</strong>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <label style={{ display: 'block', marginBottom: 5 }}>
                                Timestamp:
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input
                                    type="number"
                                    value={editingRound.round_hour || 0}
                                    onChange={(e) => setEditingRound({ ...editingRound, round_hour: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    placeholder="Hours"
                                    style={{ width: 60 }}
                                  />
                                  <input
                                    type="number"
                                    value={editingRound.round_minute || 0}
                                    onChange={(e) => setEditingRound({ ...editingRound, round_minute: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    max="59"
                                    placeholder="Minutes"
                                    style={{ width: 60 }}
                                  />
                                  <input
                                    type="number"
                                    value={editingRound.round_second || 0}
                                    onChange={(e) => setEditingRound({ ...editingRound, round_second: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    max="59"
                                    placeholder="Seconds"
                                    style={{ width: 60 }}
                                  />
                                </div>
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateRoundTime(selectedMatch.id, editingRound.index, {
                                hour: editingRound.round_hour,
                                minute: editingRound.round_minute,
                                second: editingRound.round_second,
                              })}
                              style={{ background: "#007bff", color: "white", padding: "4px 8px", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Update Timestamp
                            </button>
                          </form>
                        )}
                        <button 
                          type="button" 
                          onClick={() => setEditingRound(null)}
                          style={{ background: '#ccc' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Normal round display
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>Round {index + 1} {selectedMatch.is_sudden_death && index >= (selectedMatch.match_type === "team" ? 16 : 4) && "(Sudden Death)"}</div>
                        {round.tag_made && (
                          <button 
                            onClick={() => {
                              const roundToEdit = selectedMatch.rounds[index]; // Already established that round.tag_made is true here
                              const { hour, minute, second } = extractTimeFromVideoURL(round.video_url || "");
                              const existingPin = currentMatchPins.find(
                                (p) => p.match_id === selectedMatch.id && p.round_index === index
                              );
                              setEditingRound({
                                index,
                                chaserName: roundToEdit.chaser.name,
                                evaderName: roundToEdit.evader.name,
                                tag_made: roundToEdit.tag_made, // Will be true
                                tag_time: roundToEdit.tag_time,
                                pinLocation: existingPin ? existingPin.location : null,
                                existingPinId: existingPin ? existingPin.id : null,
                                originalChaserId: roundToEdit.chaser.id,
                                originalEvaderId: roundToEdit.evader.id,
                                round_hour: hour,
                                round_minute: minute,
                                round_second: second,                                
                              });
                            }}
                            style={{ 
                              padding: '2px 8px',
                              fontSize: '0.8em',
                              background: '#f0f0f0',
                              border: '1px solid #ccc',
                              borderRadius: '3px'
                            }}
                          >
                            Edit Round
                          </button>
                        )}
                      </div>
                      <div>Chaser: {round.chaser.name}</div>
                      <div>Evader: {round.evader.name}</div>
                      <div>Result: {round.tag_made 
                        ? `Tagged at ${round.tag_time}s` 
                        : "Evaded (20s)"}</div>
                      {/* Show pin info if one exists for this round */}
                      {currentMatchPins.some(pin => pin.round_index === index) && (
                        <div style={{ fontSize: '0.8em', color: '#666', marginTop: 4 }}>
                          Pin location recorded ⚑
                        </div>
                      )}
                      {!round.tag_made && (
                        <>
                          <button
                            onClick={() => {
                              const { hour, minute, second } = extractTimeFromVideoURL(round.video_url || "");
                              setEditingRoundTime({
                                index,
                                round_hour: hour,
                                round_minute: minute,
                                round_second: second,
                              });
                            }}
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.8em',
                              background: '#f0f0f0',
                              border: '1px solid #ccc',
                              borderRadius: '3px',
                              marginTop: '8px',
                            }}
                          >
                            Edit Timestamp
                          </button>

                          {editingRoundTime && editingRoundTime.index === index && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleUpdateRoundTime(selectedMatch.id, editingRoundTime.index, {
                                  hour: editingRoundTime.round_hour,
                                  minute: editingRoundTime.round_minute,
                                  second: editingRoundTime.round_second,
                                });
                                setEditingRoundTime(null); // Clear editing state after submission
                              }}
                              style={{ marginTop: '8px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            >
                              <div style={{ marginBottom: '8px' }}>
                                <label style={{ display: 'block', marginBottom: '4px' }}>
                                  Timestamp:
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                      type="number"
                                      value={editingRoundTime.round_hour || 0}
                                      onChange={(e) =>
                                        setEditingRoundTime({ ...editingRoundTime, round_hour: parseInt(e.target.value) || 0 })
                                      }
                                      min="0"
                                      placeholder="Hours"
                                      style={{ width: '60px' }}
                                    />
                                    <input
                                      type="number"
                                      value={editingRoundTime.round_minute || 0}
                                      onChange={(e) =>
                                        setEditingRoundTime({ ...editingRoundTime, round_minute: parseInt(e.target.value) || 0 })
                                      }
                                      min="0"
                                      max="59"
                                      placeholder="Minutes"
                                      style={{ width: '60px' }}
                                    />
                                    <input
                                      type="number"
                                      value={editingRoundTime.round_second || 0}
                                      onChange={(e) =>
                                        setEditingRoundTime({ ...editingRoundTime, round_second: parseInt(e.target.value) || 0 })
                                      }
                                      min="0"
                                      max="59"
                                      placeholder="Seconds"
                                      style={{ width: '60px' }}
                                    />
                                  </div>
                                </label>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="submit" style={{ background: '#007bff', color: 'white', padding: '4px 8px', border: 'none', borderRadius: '4px' }}>
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRoundTime(null)}
                                  style={{ background: '#ccc', padding: '4px 8px', border: 'none', borderRadius: '4px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}
                        </>
                      )}
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
