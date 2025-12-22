import React, { useEffect } from "react";
import { BACKEND_URL } from "../config";
import { Card, Form, Select, Input, InputNumber, Button, Checkbox, Typography, Space, Row, Col, Divider, List, Tag, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CloseOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;

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

  const handleAddRound = async () => {
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

  const handleEditTagTime = async () => {
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

  return (
    <Card
      title="Manage Rounds"
      style={{ flex: 1, minWidth: 300 }}
      extra={
        <Space>
          <Button
            type="text"
            icon={showRounds ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowRounds(!showRounds)}
          >
            {showRounds ? 'Hide Rounds' : 'Show Rounds'}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteLastRound}
            disabled={!selectedMatch.rounds || selectedMatch.rounds.length === 0}
          >
            Delete Last
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          {selectedMatch.match_type === "team"
            ? `${selectedMatch.team1_name || generateTeamName(selectedMatch.team1_players.map(p => p.id))} vs ${selectedMatch.team2_name || generateTeamName(selectedMatch.team2_players.map(p => p.id))}`
            : `${selectedMatch.player1?.name} vs ${selectedMatch.player2?.name}`}
        </Title>
      </div>

      <Form layout="vertical" onFinish={handleAddRound}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Evader" required>
              {selectedMatch.match_type === '1v1' ? (
                <Select
                  value={roundData.evader_id}
                  onChange={(id) => {
                    setRoundData({
                      ...roundData,
                      evader_id: id,
                      chaser_id: id === selectedMatch.player1.id ? selectedMatch.player2.id : selectedMatch.player1.id,
                    });
                  }}
                  placeholder="Select Evader"
                >
                  <Option value={selectedMatch.player1.id}>{selectedMatch.player1.name}</Option>
                  <Option value={selectedMatch.player2.id}>{selectedMatch.player2.name}</Option>
                </Select>
              ) : (
                <Select
                  value={roundData.evader_id}
                  onChange={(id) => setRoundData({ ...roundData, evader_id: id, chaser_id: '' })}
                  placeholder="Select Evader"
                  disabled={(selectedMatch.rounds || []).length > 0}
                >
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
                          <Option key={p.id} value={p.id}>
                            {`${p.name} (${!lastRound.tag_made ? 'must continue after evasion' : 'must evade after successful tag'})`}
                          </Option>
                        ));
                      }
                    }
                    return ([...(selectedMatch.team1_players || []), ...(selectedMatch.team2_players || [])].map(p => (
                      <Option key={p.id} value={p.id}>{p.name}</Option>
                    )));
                  })()}
                </Select>
              )}
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Chaser" required>
              {selectedMatch.match_type === '1v1' ? (
                <Input
                  value={roundData.chaser_id ? (roundData.chaser_id === selectedMatch.player1.id ? selectedMatch.player1.name : selectedMatch.player2.name) : ''}
                  placeholder={roundData.evader_id ? '' : 'Select evader first'}
                  disabled
                />
              ) : (
                <Select
                  value={roundData.chaser_id}
                  onChange={(id) => setRoundData({ ...roundData, chaser_id: id })}
                  placeholder="Select Chaser"
                  disabled={!roundData.evader_id}
                >
                  {(() => {
                    if (!roundData.evader_id) return null;
                    const evaderInTeam1 = (selectedMatch.team1_players || []).some(p => p.id === roundData.evader_id);
                    const options = evaderInTeam1 ? (selectedMatch.team2_players || []) : (selectedMatch.team1_players || []);
                    return options.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>);
                  })()}
                </Select>
              )}
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Checkbox
            checked={!!roundData.tag_made}
            onChange={(e) => setRoundData({ ...roundData, tag_made: e.target.checked, pinLocation: e.target.checked ? roundData.pinLocation : null })}
          >
            Tag Made
          </Checkbox>
        </Form.Item>

        {roundData.tag_made && (
          <>
            <Form.Item label="Tag Time (seconds)" required>
              <InputNumber
                min={0}
                step={0.1}
                value={roundData.tag_time}
                onChange={(val) => setRoundData({ ...roundData, tag_time: val })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="Tag Location">
              <div style={{ position: 'relative', width: '100%', maxWidth: 400, margin: '0 auto' }}>
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 100">
                  {roundData.pinLocation && (
                    <circle cx={roundData.pinLocation.x} cy={roundData.pinLocation.y} r="2" fill="red" stroke="white" strokeWidth="0.5" />
                  )}
                </svg>
                <img
                  src="/images/quad.jpg"
                  alt="Quad Map"
                  style={{ width: '100%', height: 'auto', cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4 }}
                  onClick={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    setRoundData({ ...roundData, pinLocation: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 } });
                  }}
                />
              </div>
              {roundData.pinLocation ? (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Button size="small" onClick={() => setRoundData({ ...roundData, pinLocation: null })}>Clear Pin</Button>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Position: {roundData.pinLocation.x.toFixed(1)}%, {roundData.pinLocation.y.toFixed(1)}%
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' }}>Click on the map to mark the tag location.</div>
              )}
            </Form.Item>
          </>
        )}

        <Form.Item label="Timestamp">
          <Space>
            <InputNumber
              value={roundData.round_hour || 0}
              onChange={(val) => setRoundData({ ...roundData, round_hour: val || 0 })}
              min={0}
              placeholder="HH"
              style={{ width: 70 }}
            />
            <InputNumber
              value={roundData.round_minute || 0}
              onChange={(val) => setRoundData({ ...roundData, round_minute: val || 0 })}
              min={0} max={59}
              placeholder="MM"
              style={{ width: 70 }}
            />
            <InputNumber
              value={roundData.round_second || 0}
              onChange={(val) => setRoundData({ ...roundData, round_second: val || 0 })}
              min={0} max={59}
              placeholder="SS"
              style={{ width: 70 }}
            />
          </Space>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            disabled={!roundData.evader_id || !roundData.chaser_id || (roundData.tag_made && !roundData.tag_time)}
            block
          >
            Add Round
          </Button>
        </Form.Item>
      </Form>

      {showRounds && (
        <>
          <Divider orientation="left">Rounds ({selectedMatch.rounds?.length || 0})</Divider>
          <List
            dataSource={selectedMatch.rounds || []}
            renderItem={(r, idx) => {
              const existingPin = (currentMatchPins || []).find(p => p.match_id === selectedMatch.id && p.round_index === idx);
              const isEditingThis = editingRound && editingRound.index === idx;
              const isTimeEditing = editingRoundTime && editingRoundTime.index === idx;

              return (
                <List.Item>
                  <Card size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <Text strong>Round {idx + 1}</Text>
                        <br />
                        <Text type="secondary">
                          {r.evader?.name} (E) vs {r.chaser?.name} (C)
                        </Text>
                        <br />
                        {r.tag_made ? <Tag color="red">Tagged: {r.tag_time}s</Tag> : <Tag color="green">No Tag</Tag>}
                      </div>
                      <Space>
                        {r.tag_made ? (
                          <Button
                            size="small"
                            icon={<EditOutlined />}
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
                            Edit
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setEditingRoundTime({ index: idx, hour: r.round_hour || 0, minute: r.round_minute || 0, second: r.round_second || 0 })}
                          >
                            Time
                          </Button>
                        )}
                      </Space>
                    </div>

                    {isEditingThis && (
                      <Card type="inner" title="Edit Tag/Pin" size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <InputNumber
                            min={0}
                            step={0.1}
                            value={editingRound.tag_time}
                            onChange={(val) => setEditingRound({ ...editingRound, tag_time: val })}
                            addonBefore="Tag Time"
                            style={{ width: '100%' }}
                          />
                          <div style={{ position: 'relative', width: '100%', maxWidth: 400, margin: '0 auto' }}>
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 100">
                              {editingRound.pinLocation && (
                                <circle cx={editingRound.pinLocation.x} cy={editingRound.pinLocation.y} r="2" fill="red" stroke="white" strokeWidth="0.5" />
                              )}
                            </svg>
                            <img
                              src="/images/quad.jpg"
                              alt="Quad Map"
                              style={{ width: '100%', height: 'auto', cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4 }}
                              onClick={(e) => {
                                const rect = e.target.getBoundingClientRect();
                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                setEditingRound({ ...editingRound, pinLocation: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 } });
                              }}
                            />
                          </div>
                          <Space>
                            <Button size="small" onClick={() => setEditingRound({ ...editingRound, pinLocation: null })}>Clear Pin</Button>
                            <Button size="small" type="primary" onClick={handleUpdatePinLocation}>Save Pin</Button>
                          </Space>
                          <Space style={{ marginTop: 8 }}>
                            <Button type="primary" onClick={handleEditTagTime}>Save Tag Time</Button>
                            <Button onClick={() => setEditingRound(null)}>Cancel</Button>
                          </Space>
                        </Space>
                      </Card>
                    )}

                    {isTimeEditing && (
                      <Card type="inner" title="Edit Timestamp" size="small">
                        <Space>
                          <InputNumber value={editingRoundTime.hour || 0} onChange={(val) => setEditingRoundTime({ ...editingRoundTime, hour: val || 0 })} min={0} placeholder="HH" style={{ width: 60 }} />
                          <InputNumber value={editingRoundTime.minute || 0} onChange={(val) => setEditingRoundTime({ ...editingRoundTime, minute: val || 0 })} min={0} max={59} placeholder="MM" style={{ width: 60 }} />
                          <InputNumber value={editingRoundTime.second || 0} onChange={(val) => setEditingRoundTime({ ...editingRoundTime, second: val || 0 })} min={0} max={59} placeholder="SS" style={{ width: 60 }} />
                          <Button type="primary" onClick={() => handleUpdateRoundTime(selectedMatch.id, idx, editingRoundTime)}>Save</Button>
                          <Button onClick={() => setEditingRoundTime(null)}>Cancel</Button>
                        </Space>
                      </Card>
                    )}
                  </Card>
                </List.Item>
              );
            }}
          />
        </>
      )}
    </Card>
  );
}
