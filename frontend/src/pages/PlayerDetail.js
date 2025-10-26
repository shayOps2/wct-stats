import React, { useState, useEffect, useCallback } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Spin, 
  Alert, 
  Select, 
  DatePicker, 
  Button, 
  Divider, 
  Statistic,
  Tooltip,
  Empty,
  Collapse,
  List
} from "antd";
import { BACKEND_URL } from "../config"; // Import the constant

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

function PlayerDetail() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [matchType, setMatchType] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [playerPins, setPlayerPins] = useState([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [showChaserPins, setShowChaserPins] = useState(true);
  const [showEvaderPins, setShowEvaderPins] = useState(true);
  const [tips, setTips] = useState(null);
  const [loadingTips, setLoadingTips] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all players
      const response = await fetch(`${BACKEND_URL}/players/`);
      const playerList = await response.json();
      setPlayers(playerList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching players:', err);
      setError("Failed to load players. Please try again later.");
      setLoading(false);
    }
  };

  const fetchPlayerStats = useCallback(async () => {
    if (!selectedPlayer) return;

    try {
      setLoadingPlayerStats(true);
      setStatsError(null);
      
      let url;
      let statsResponse;
      
      // If opponent is selected, use the head-to-head endpoint
      if (selectedOpponent) {
        url = `${BACKEND_URL}/players/${selectedPlayer}/versus/${selectedOpponent}?`;
        
        // Add date filters if provided
        if (dateRange) {
          // If dateRange has at least a start date
          if (dateRange[0]) {
            const startDate = dateRange[0].toISOString();
            url += `start_date=${startDate}&`;
            
            // If end date is also provided, use it; otherwise default to today
            if (dateRange[1]) {
              const endDate = dateRange[1].toISOString();
              url += `end_date=${endDate}&`;
            }
          }
        }
        
        statsResponse = await fetch(url);
      } else {
        // Otherwise use the regular stats endpoint
        url = `${BACKEND_URL}/players/${selectedPlayer}/stats?`;
        
        // Add date filters if provided
        if (dateRange) {
          // If dateRange has at least a start date
          if (dateRange[0]) {
            const startDate = dateRange[0].toISOString();
            url += `start_date=${startDate}&`;
            
            // If end date is also provided, use it; otherwise default to today
            if (dateRange[1]) {
              const endDate = dateRange[1].toISOString();
              url += `end_date=${endDate}&`;
            }
          }
        }
        
        // Add match type filter if provided
        if (matchType) {
          url += `match_type=${matchType}&`;
        }
        
        statsResponse = await fetch(url);
      }
      
      if (!statsResponse.ok) {
        throw new Error(`Error fetching stats: ${statsResponse.status} ${statsResponse.statusText}`);
      }
      
      const stats = await statsResponse.json();
      setPlayerStats(stats);
      setLoadingPlayerStats(false);
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setStatsError("Failed to load player statistics. Please try again later.");
      setLoadingPlayerStats(false);
      setPlayerStats(null);
    }
  }, [selectedPlayer, selectedOpponent, dateRange, matchType]);

  const fetchPlayerTips = useCallback(async () => {
    if (!selectedPlayer) return;
    try {
      setLoadingTips(true);
      setTips(null);
      let url = `${BACKEND_URL}/players/${selectedPlayer}/tips?`;
      if (dateRange) {
        if (dateRange[0]) {
          const startDate = dateRange[0].toISOString();
          url += `start_date=${startDate}&`;
          if (dateRange[1]) {
            const endDate = dateRange[1].toISOString();
            url += `end_date=${endDate}&`;
          }
        }
      }
      if (matchType) {
        url += `match_type=${matchType}&`;
      }
      const resp = await fetch(url, { method: 'POST' });
      if (!resp.ok) {
        throw new Error(`Failed to generate tips: ${resp.status}`);
      }
      const json = await resp.json();
      setTips(json);
    } catch (e) {
      setTips({ summary: 'Failed to generate tips. Please try again later.' });
    } finally {
      setLoadingTips(false);
    }
  }, [selectedPlayer, dateRange, matchType]);

  // Reset player stats when filters change
  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerStats();
    }
  }, [selectedPlayer, fetchPlayerStats]);
  
  // Clear match type when opponent is selected
  useEffect(() => {
    if (selectedOpponent) {
      setMatchType(null);
    }
  }, [selectedOpponent]);

const fetchPlayerPins = useCallback(async () => {
  if (!selectedPlayer) return;

  try {
    setLoadingPins(true);
    
    // Build query parameters for the enriched pins endpoint
    const params = new URLSearchParams();
    params.append('player_id', selectedPlayer);

    // Add optional filters if they exist
    if (selectedOpponent) {
      params.append('opponent_id', selectedOpponent);
    }
    if (matchType) {
      params.append('match_type', matchType);
    }
    if (dateRange && dateRange[0]) {
      params.append('start_date', dateRange[0].toISOString());
    }
    if (dateRange && dateRange[1]) {
      params.append('end_date', dateRange[1].toISOString());
    }

    const response = await fetch(`${BACKEND_URL}/pins/enriched?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch pins');
    }

    const enrichedPins = await response.json();
    
  // Update the transformation in fetchPlayerPins function:

  const transformedPins = enrichedPins.map(pin => ({
    ...pin,
    // Map chaser_id and evader_id from the backend response
    chaser_id: players.find(p => p.name === pin.matchDetails.chaser)?.id,
    evader_id: players.find(p => p.name === pin.matchDetails.evader)?.id,
    matchDetails: {
      ...pin.matchDetails,
      playerRole: pin.matchDetails.chaser === players.find(p => p.id === selectedPlayer)?.name 
        ? 'chaser' 
        : 'evader',
      opponent: pin.matchDetails.chaser === players.find(p => p.id === selectedPlayer)?.name
        ? pin.matchDetails.evader
        : pin.matchDetails.chaser,
      type: pin.matchDetails.type || 'Unknown'
    }
  }));

    setPlayerPins(transformedPins);
  } catch (err) {
    console.error('Error fetching pins:', err);
  } finally {
    setLoadingPins(false);
  }
}, [selectedPlayer, selectedOpponent, matchType, dateRange]);

  // Fetch pins when a player is selected
  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerPins();
    } else {
      setPlayerPins([]);
    }
  }, [selectedPlayer, fetchPlayerPins]);

  // Add a function to filter pins based on current filters
  const getFilteredPins = useCallback(() => {
    return playerPins.filter(pin => {
      // Filter by role toggles
      if (!showChaserPins && pin.chaser_id === selectedPlayer) return false;
      if (!showEvaderPins && pin.evader_id === selectedPlayer) return false;
  
      return true;
    });
  }, [playerPins, showChaserPins, showEvaderPins, selectedPlayer]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Player Details</h2>
      
      <Card bordered={false}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Player"
              onChange={setSelectedPlayer}
              allowClear
            >
              {players.map(player => (
                <Option key={player.id} value={player.id}>{player.name}</Option>
              ))}
            </Select>
          </Col>
          
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Played Against"
              onChange={setSelectedOpponent}
              allowClear
              disabled={!selectedPlayer}
            >
              {players
                .filter(player => player.id !== selectedPlayer)
                .map(player => (
                  <Option key={player.id} value={player.id}>{player.name}</Option>
                ))
              }
            </Select>
          </Col>
          
          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Match Type"
              onChange={setMatchType}
              allowClear
              disabled={!selectedPlayer || selectedOpponent}
            >
              <Option value="1v1">1v1</Option>
              <Option value="team">Team</Option>
            </Select>
          </Col>
          
          <Col xs={24} sm={6}>
            <RangePicker 
              style={{ width: '100%' }}
              onChange={value => {
                // Value will be null when user clears the picker
                if (!value) {
                  setDateRange(null);
                  return;
                }
                
                // If both dates are set or none, use value directly
                if ((value[0] && value[1]) || (!value[0] && !value[1])) {
                  setDateRange(value);
                } 
                // If only one date is set, treat it as the start date
                else if (value[0] && !value[1]) {
                  setDateRange([value[0], null]);
                }
              }}
              allowEmpty={[false, true]} 
              placeholder={['Start Date', 'End Date (optional)']}
              disabled={!selectedPlayer}
            />
          </Col>
          
          <Col xs={24}>
            <Button 
              type="primary" 
              onClick={fetchPlayerStats}
              disabled={!selectedPlayer}
              loading={loadingPlayerStats}
              style={{ marginTop: '8px', marginRight: '8px' }}
            >
              Apply Filters
            </Button>

            <Button
              onClick={fetchPlayerTips}
              disabled={!selectedPlayer}
              loading={loadingTips}
              style={{ marginTop: '8px' }}
              type="default"
            >
              Generate Tips
            </Button>

            {/* Clear filters button */}
            {(dateRange || matchType || selectedOpponent) && (
              <Button
                onClick={() => {
                  setDateRange(null);
                  setMatchType(null);
                  setSelectedOpponent(null);
                  // If player is still selected, fetch stats without filters
                  if (selectedPlayer) {
                    setTimeout(fetchPlayerStats, 0);
                  }
                }}
                style={{ marginTop: '8px' }}
              >
                Clear Filters
              </Button>
            )}
          </Col>
          
          {/* Show active filters summary */}
          {selectedPlayer && (dateRange || matchType || selectedOpponent) && (
            <Col xs={24}>
              <div style={{ marginTop: '16px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Active Filters:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {dateRange && dateRange[0] && (
                    <li>
                      Date Range: {dateRange[0].format('MMM D, YYYY')}
                      {dateRange[1] ? ` to ${dateRange[1].format('MMM D, YYYY')}` : ' to Today'}
                    </li>
                  )}
                  {matchType && (
                    <li>Match Type: {matchType === '1v1' ? '1v1 Matches' : 'Team Matches'}</li>
                  )}
                  {selectedOpponent && (
                    <li>Opponent: {players.find(p => p.id === selectedOpponent)?.name}</li>
                  )}
                </ul>
              </div>
            </Col>
          )}
        </Row>
        
        {!selectedPlayer && (
          <Row style={{ marginTop: 24 }}>
            <Col xs={24} style={{ textAlign: 'center' }}>
              <Alert 
                message="Select a player to view their statistics" 
                type="info" 
                showIcon 
              />
            </Col>
          </Row>
        )}
        
        {statsError && (
          <Row style={{ marginTop: 24 }}>
            <Col xs={24} style={{ textAlign: 'center' }}>
              <Alert 
                message={statsError}
                type="error" 
                showIcon 
              />
            </Col>
          </Row>
        )}
        
        {loadingPlayerStats && (
          <Row style={{ marginTop: 24 }}>
            <Col xs={24} style={{ textAlign: 'center' }}>
              <Spin size="large" />
            </Col>
          </Row>
        )}
        
        {playerStats && selectedPlayer && !loadingPlayerStats && (
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            {tips && (
              <Col xs={24}>
                <Card title="AI Tips" bordered={false}>
                  {tips.summary && <p>{tips.summary}</p>}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <h4>Strengths</h4>
                      <ul>
                        {(tips.strengths || []).map((s, i) => (<li key={i}>{s}</li>))}
                      </ul>
                    </Col>
                    <Col xs={24} md={12}>
                      <h4>Weaknesses</h4>
                      <ul>
                        {(tips.weaknesses || []).map((w, i) => (<li key={i}>{w}</li>))}
                      </ul>
                    </Col>
                    <Col xs={24} md={12}>
                      <h4>Improvements</h4>
                      <ul>
                        {(tips.improvements || []).map((it, i) => (<li key={i}>{it}</li>))}
                      </ul>
                    </Col>
                    <Col xs={24} md={12}>
                      <h4>Drills</h4>
                      <ul>
                        {(tips.drills || []).map((d, i) => (<li key={i}>{d}</li>))}
                      </ul>
                    </Col>
                    <Col xs={24}>
                      <h4>Risks</h4>
                      <ul>
                        {(tips.risks || []).map((r, i) => (<li key={i}>{r}</li>))}
                      </ul>
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}
            <Col xs={24}>
              <Card>
                <h2 style={{ margin: 0, marginBottom: 8 }}>
                  {players.find(p => p.id === selectedPlayer)?.name}'s Statistics
                  {selectedOpponent && (
                    <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '8px' }}>
                      vs {players.find(p => p.id === selectedOpponent)?.name}
                    </span>
                  )}
                </h2>
                {matchType && !selectedOpponent && (
                  <p style={{ margin: 0, color: '#666' }}>
                    Match type: {matchType === '1v1' ? '1v1 Matches' : 'Team Matches'}
                  </p>
                )}
              </Card>
            </Col>
            
            {/* Match Statistics Card */}
            <Col xs={24}>
              <Card title="Match Statistics" bordered={false}>
                <Row gutter={[16, 16]}>
                  <Col xs={8}>
                    <Statistic 
                      title="Matches Played" 
                      value={playerStats.overall.matches_played} 
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={8}>
                    <Statistic 
                      title="Matches Won" 
                      value={playerStats.overall.matches_won} 
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col xs={8}>
                    <Statistic 
                      title="Win Percentage" 
                      value={playerStats.overall.win_percentage} 
                      suffix="%" 
                      valueStyle={{ 
                        color: playerStats.overall.win_percentage > 50 ? '#3f8600' : 
                               playerStats.overall.win_percentage === 0 ? '#cf1322' : '#faad14'
                      }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title="Offense (as Evader)" bordered={false}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic 
                      title="Total Evasion Attempts" 
                      value={playerStats.offense.total_evasion_attempts} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Successful Evasions" 
                      value={playerStats.offense.successful_evasions} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Success Rate" 
                      value={playerStats.offense.evasion_success_rate} 
                      suffix="%" 
                      valueStyle={{ color: playerStats.offense.evasion_success_rate > 50 ? '#3f8600' : '#cf1322' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Average Evasion Time" 
                      value={playerStats.offense.average_evasion_time} 
                      suffix="s" 
                    />
                  </Col>
                </Row>
                {/* Collapsible view for evasion rounds */}
                <Collapse style={{ marginTop: 16 }}>
                  <Panel header="Evasion Rounds" key="1">
                    <List
                      dataSource={playerStats.offense.evasion_rounds} // Now populated by the backend
                      renderItem={(round) => (
                        <List.Item>
                          <List.Item.Meta
                            title={`Date: ${new Date(round.date).toLocaleDateString()}`}
                            description={`Against: ${round.opponent}`}
                          />
                          {round.video_url && (
                            <Button
                              type="link"
                              href={round.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Watch Video
                            </Button>
                          )}
                        </List.Item>
                      )}
                    />
                  </Panel>
                </Collapse>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="Defense (as Chaser)" bordered={false}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic 
                      title="Total Chase Attempts" 
                      value={playerStats.defense.total_chase_attempts} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Successful Tags" 
                      value={playerStats.defense.successful_tags} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Success Rate" 
                      value={playerStats.defense.tagging_success_rate} 
                      suffix="%" 
                      valueStyle={{ color: playerStats.defense.tagging_success_rate > 50 ? '#3f8600' : '#cf1322' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Average Tag Time" 
                      value={playerStats.defense.average_tag_time} 
                      suffix="s" 
                    />
                  </Col>
                </Row>
                {/* Collapsible view for got evaded rounds */}
                <Collapse style={{ marginTop: 16 }}>
                  <Panel header="Got Evaded Rounds" key="2">
                    <List
                      dataSource={playerStats.defense.got_evaded_rounds} // Now populated by the backend
                      renderItem={(round) => (
                        <List.Item>
                          <List.Item.Meta
                            title={`Date: ${new Date(round.date).toLocaleDateString()}`}
                            description={`Against: ${round.opponent}`}
                          />
                          {round.video_url && (
                            <Button
                              type="link"
                              href={round.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Watch Video
                            </Button>
                          )}
                        </List.Item>
                      )}
                    />
                  </Panel>
                </Collapse>
              </Card>
            </Col>
            
            <Col xs={24}>
              <Card bordered={false}>
                <Statistic 
                  title="Total Rounds" 
                  value={playerStats.overall.total_rounds} 
                  valueStyle={{ fontSize: '24px' }}
                />
              </Card>
            </Col>
            
            {/* Quad Map with Player Pins */}
            <Col xs={24}>
              <Card 
                title={`Tag Locations for ${players.find(p => p.id === selectedPlayer)?.name}`} 
                bordered={false}
                style={{ marginBottom: 24 }}
              >
                {loadingPins ? (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <Spin size="large" />
                  </div>
                ) : playerPins.length > 0 ? (
                  <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={showChaserPins}
                            onChange={(e) => setShowChaserPins(e.target.checked)}
                            style={{ marginRight: 8 }}
                          />
                          <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: 'red', borderRadius: '50%', marginRight: 8 }}></span>
                          As Chaser
                        </label>
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={showEvaderPins}
                            onChange={(e) => setShowEvaderPins(e.target.checked)}
                            style={{ marginRight: 8 }}
                          />
                          <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: 'blue', borderRadius: '50%', marginRight: 8 }}></span>
                          As Evader
                        </label>
                      </div>
                    </div>

                    <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
                      <img 
                        src="/images/quad.jpg" 
                        alt="Quad Map" 
                        style={{ width: '100%', height: 'auto', border: '1px solid #ccc' }}
                      />
                      
                      {/* Map pins */}
                      {getFilteredPins().map((pin, index) => (
                        <Tooltip 
                          key={index} 
                          title={
                            <div>
                              <div>Date: {pin.matchDetails.date}</div>
                              <div>Against: {pin.matchDetails.opponent}</div>
                              <div>Role: {pin.matchDetails.playerRole}</div>
                              {pin.matchDetails?.video_url && (
                                <div>
                                  <a href={pin.matchDetails.video_url} target="_blank" rel="noopener noreferrer">
                                    Watch Video
                                  </a>
                                </div>
                              )}                              
                              <div style={{ fontSize: '0.8em', color: '#888' }}>
                                Position: ({pin.location.x.toFixed(1)}%, {pin.location.y.toFixed(1)}%)
                              </div>
                            </div>
                          }
                        >
                          <div 
                            style={{
                              position: 'absolute',
                              left: `${pin.location.x}%`,
                              top: `${pin.location.y}%`,
                              width: '12px',
                              height: '12px',
                              backgroundColor: pin.chaser_id === selectedPlayer ? 'red' : 'blue',
                              borderRadius: '50%',
                              border: '2px solid white',
                              cursor: 'pointer',
                              transform: 'translate(-50%, -50%)',
                              zIndex: 1000,
                              boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                              opacity: 0.8
                            }}
                          />
                        </Tooltip>
                      ))}
                    </div>
                    
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                      <div>Total Tags Displayed: {getFilteredPins().length}</div>
                      {getFilteredPins().length !== playerPins.length && (
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          (Filtered from {playerPins.length} total tags)
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <Empty description="No tag locations recorded for this player" />
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Card>
    </div>
  );
}

export default PlayerDetail;