import React, { useEffect, useState } from "react";
import { Alert, Card, Button, Form, Input, Select, DatePicker, Checkbox, Upload, message, Modal, Space, Typography, Row, Col, Divider } from "antd";
import { UploadOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, ImportOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { BACKEND_URL } from "../config";
import { extractTimeFromVideoURL, formatDateForInput, formatDateForDisplay, formatDateForAPI } from "../utils/matchUtils";
import MatchCard from "../components/MatchCard";
import RoundPanel from "../components/RoundPanel";

const { Title, Text } = Typography;
const { Option } = Select;

function Matches() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [backupRunning, setBackupRunning] = useState(false);
  const [matchType, setMatchType] = useState("1v1");
  const [form] = Form.useForm();

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

  // CSV State
  const [csvFile, setCsvFile] = useState(null);
  const [csvDetectedMatches, setCsvDetectedMatches] = useState([]);
  const [csvSelectedMatches, setCsvSelectedMatches] = useState([]);
  const [csvBusy, setCsvBusy] = useState(false);

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
        message.success("Backup started.");
      } else {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        message.error("Backup failed: " + (err.detail || resp.statusText));
      }
    } catch (e) {
      console.error("Backup error", e);
      message.error("Backup error: " + e.message);
    } finally {
      setBackupRunning(false);
    }
  };

  const handleCsvFileChange = async (info) => {
    const file = info.file.originFileObj;
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
      message.error("Failed to read CSV file");
    }
  };

  const submitCsvImport = async () => {
    if (!csvFile || csvSelectedMatches.length === 0) {
      message.error("Select a CSV and at least one match number");
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
        message.error(err.detail || "Import failed");
        return;
      }
      await fetchMatches();
      setCsvFile(null);
      setCsvDetectedMatches([]);
      setCsvSelectedMatches([]);
      message.success("Import complete");
    } catch (e) {
      message.error(e.message || "Import failed");
    } finally {
      setCsvBusy(false);
    }
  };

  const generateTeamName = (playerIds) => {
    if (!playerIds || playerIds.length === 0) return "";
    const teamPlayers = playerIds
      .map(id => players.find(p => p.id === id))
      .filter(p => p)
      .map(p => p.name);
    return teamPlayers.join('-');
  };

  const handleSubmit = async (values) => {
    const isProd = import.meta.env.PROD;
    if (isProd) {
      if (!window.confirm("You are in PRODUCTION. Are you sure you want to save this match?")) {
        return;
      }
    }
    const token = localStorage.getItem("token");

    const submissionData = {
      match_type: matchType,
      date: values.date ? values.date.format('YYYY-MM-DD') : formatDateForAPI(new Date()),
      video_url: values.video_url,
      ...(matchType === "team"
        ? {
          team1_name: values.team1_name || generateTeamName(values.team1_player_ids),
          team2_name: values.team2_name || generateTeamName(values.team2_player_ids),
          team1_player_ids: values.team1_player_ids || [],
          team2_player_ids: values.team2_player_ids || [],
        }
        : {
          player1_id: values.player1_id,
          player2_id: values.player2_id,
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
      form.resetFields();
      form.setFieldsValue({ date: dayjs() });
      message.success("Match created successfully");
    } else {
      message.error("Failed to create match");
    }
  };

  const handleEditDate = async (matchId, newDate) => {
    try {
      const response = await fetch(`${BACKEND_URL}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate }),
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

  const handleUpdateVideoURL = async (matchId, newVideoURL) => {
    try {
      const response = await fetch(`${BACKEND_URL}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: newVideoURL }),
      });

      if (response.ok) {
        const updatedMatch = await response.json();
        setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
        if (selectedMatch?.id === updatedMatch.id) {
          setSelectedMatch(updatedMatch);
        }
        message.success("Video URL updated successfully!");
      } else {
        const error = await response.json();
        message.error(`Failed to update video URL: ${error.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating video URL:", error);
      message.error("An error occurred while updating the video URL.");
    }
  };

  const handleDelete = async (matchId) => {
    const matchToDelete = matches.find(m => m.id === matchId);
    if (!matchToDelete) return;
    const token = localStorage.getItem("token");

    const roundCount = matchToDelete.rounds.length;
    const participants = matchToDelete.match_type === "team"
      ? `${matchToDelete.team1_name} vs ${matchToDelete.team2_name}`
      : `${matchToDelete.player1.name} vs ${matchToDelete.player2.name}`;

    Modal.confirm({
      title: 'Are you sure you want to delete this match?',
      content: (
        <div>
          <p>Type: {matchToDelete.match_type}</p>
          <p>Participants: {participants}</p>
          <p>Date: {formatDateForDisplay(matchToDelete.date)}</p>
          <p>Rounds: {roundCount}</p>
          <p>This action cannot be undone.</p>
        </div>
      ),
      onOk: async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/matches/${matchId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ confirm: true })
          });

          if (response.ok) {
            fetchMatches();
            if (selectedMatch?.id === matchId) {
              setSelectedMatch(null);
            }
            message.success("Match deleted");
          } else {
            const errorData = await response.json();
            message.error(`Failed to delete match: ${errorData.detail || 'Unknown error occurred'}`);
          }
        } catch (error) {
          console.error('Error deleting match:', error);
          message.error('Failed to delete match: Network or server error');
        }
      }
    });
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Matches</Title>
        <Button onClick={triggerBackup} loading={backupRunning}>
          Trigger Backup
        </Button>
      </div>

      {import.meta.env.PROD && (
        <Alert message="Production Environment - Proceed with Caution" type="warning" showIcon style={{ marginBottom: 24 }} />
      )}

      <Row gutter={24}>
        <Col span={24} lg={12}>
          <Card title="Create Match" style={{ marginBottom: 24 }}>
            <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ date: dayjs(), match_type: '1v1' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="match_type" label="Match Type">
                    <Select onChange={(val) => {
                      setMatchType(val);
                      form.resetFields(['player1_id', 'player2_id', 'team1_name', 'team2_name', 'team1_player_ids', 'team2_player_ids']);
                    }}>
                      <Option value="1v1">1v1</Option>
                      <Option value="team">Team</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="date" label="Date">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="video_url" label="Video URL">
                <Input placeholder="Enter video URL" />
              </Form.Item>

              {matchType === '1v1' ? (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="player1_id" label="Player 1" rules={[{ required: true }]}>
                      <Select placeholder="Select Player 1" showSearch optionFilterProp="children">
                        {players.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="player2_id" label="Player 2" rules={[{ required: true }]}>
                      <Select placeholder="Select Player 2" showSearch optionFilterProp="children">
                        {players.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              ) : (
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title="Team 1">
                      <Form.Item name="team1_name" noStyle>
                        <Input placeholder="Team 1 Name" style={{ marginBottom: 8 }} />
                      </Form.Item>
                      <Form.Item name="team1_player_ids">
                        <Checkbox.Group style={{ display: 'flex', flexDirection: 'column' }}>
                          {players.map(p => (
                            <Checkbox key={p.id} value={p.id} style={{ marginLeft: 0 }}>{p.name}</Checkbox>
                          ))}
                        </Checkbox.Group>
                      </Form.Item>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="Team 2">
                      <Form.Item name="team2_name" noStyle>
                        <Input placeholder="Team 2 Name" style={{ marginBottom: 8 }} />
                      </Form.Item>
                      <Form.Item name="team2_player_ids">
                        <Checkbox.Group style={{ display: 'flex', flexDirection: 'column' }}>
                          {players.map(p => (
                            <Checkbox key={p.id} value={p.id} style={{ marginLeft: 0 }}>{p.name}</Checkbox>
                          ))}
                        </Checkbox.Group>
                      </Form.Item>
                    </Card>
                  </Col>
                </Row>
              )}

              <Form.Item style={{ marginTop: 16 }}>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>Create Match</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={24} lg={12}>
          <Card title="Import Matches from CSV" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Upload maxCount={1} beforeUpload={() => false} onChange={handleCsvFileChange} accept=".csv">
                  <Button icon={<UploadOutlined />}>Select CSV</Button>
                </Upload>
                <Button
                  type="primary"
                  icon={<ImportOutlined />}
                  disabled={!csvFile || csvBusy || csvSelectedMatches.length === 0}
                  onClick={submitCsvImport}
                  loading={csvBusy}
                >
                  Import Selected
                </Button>
              </Space>

              {csvDetectedMatches.length > 0 && (
                <>
                  <Space>
                    <Button size="small" onClick={() => setCsvSelectedMatches(csvDetectedMatches)}>Select All</Button>
                    <Button size="small" onClick={() => setCsvSelectedMatches([])}>Clear</Button>
                  </Space>
                  <Checkbox.Group
                    value={csvSelectedMatches}
                    onChange={setCsvSelectedMatches}
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                  >
                    {csvDetectedMatches.map(id => (
                      <Checkbox key={id} value={id}>Match #{id}</Checkbox>
                    ))}
                  </Checkbox.Group>
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={24} xl={16}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {matches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                selected={selectedMatch?.id === match.id}
                onClick={() => setSelectedMatch(match)}
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
        </Col>
        <Col span={24} xl={8}>
          {selectedMatch && (
            <div style={{ position: 'sticky', top: 24 }}>
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
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
}
export default Matches;


