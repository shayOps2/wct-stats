import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Spin,
  Alert,
  DatePicker,
  Button,
  Tooltip,
  Empty,
  Select
} from "antd";
import { BACKEND_URL } from "../config"; // Import the constant
const { RangePicker } = DatePicker;
const { Option } = Select;

function QuadPins() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allPins, setAllPins] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [matchType, setMatchType] = useState(null);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Load players first
    fetchPlayers();
    // Then fetch all pins
    fetchAllPins();
  }, []);

  const fetchPlayers = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${BACKEND_URL}/players/`, { headers });
      if (response.status === 401) return;
      const playerList = await response.json();
      setPlayers(playerList);
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const fetchAllPins = async (startDate = null, endDate = null, player = null, type = null) => {
    try {
      setLoading(true);
      setError(null);

      // Build the filter query
      let pinsUrl = `${BACKEND_URL}/pins/enriched?`;
      if (startDate) {
        pinsUrl += `start_date=${startDate.toISOString()}&`;
      }
      if (endDate) {
        pinsUrl += `end_date=${endDate.toISOString()}&`;
      }
      if (player) {
        pinsUrl += `player_id=${player}&`;
      }
      if (type) {
        pinsUrl += `match_type=${type}&`;
      }

      console.log('Fetching enriched pins from:', pinsUrl);

      console.log('Fetching enriched pins from:', pinsUrl);

      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(pinsUrl, { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch enriched pins');
      }

      const enrichedPins = await response.json();
      console.log('Received enriched pins:', enrichedPins);
      setAllPins(enrichedPins);
      setLoading(false);
      setApplyingFilters(false);
    } catch (err) {
      console.error('Error fetching enriched pins:', err);
      setError("Failed to load tag locations. Please try again later.");
      setLoading(false);
      setApplyingFilters(false);
    }
  };

  const applyFilters = () => {
    setApplyingFilters(true);
    fetchAllPins(
      dateRange && dateRange[0] ? dateRange[0] : null,
      dateRange && dateRange[1] ? dateRange[1] : null,
      selectedPlayer,
      matchType
    );
  };

  const clearFilters = () => {
    setDateRange(null);
    setSelectedPlayer(null);
    setMatchType(null);
    fetchAllPins();
  };

  if (loading && !applyingFilters) {
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
      <h2>All Tag Locations</h2>

      <Card bordered={false} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={value => setDateRange(value)}
              allowEmpty={[false, true]}
              placeholder={['Start Date', 'End Date (optional)']}
            />
          </Col>

          <Col xs={24} sm={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Player"
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
              placeholder="Match Type"
              onChange={setMatchType}
              allowClear
            >
              <Option value="1v1">1v1</Option>
              <Option value="team">Team</Option>
            </Select>
          </Col>

          <Col xs={24} sm={6}>
            <Button
              type="primary"
              onClick={applyFilters}
              loading={applyingFilters}
              style={{ marginRight: 8 }}
            >
              Apply Filters
            </Button>

            {(dateRange || selectedPlayer || matchType) && (
              <Button onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </Col>

          {/* Active filters display */}
          {(dateRange || selectedPlayer || matchType) && (
            <Col xs={24}>
              <div style={{ marginTop: '8px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                <b>Active Filters:</b>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {dateRange && dateRange[0] && (
                    <li>
                      Date Range: {dateRange[0].format('MMM D, YYYY')}
                      {dateRange[1] ? ` to ${dateRange[1].format('MMM D, YYYY')}` : ' to Today'}
                    </li>
                  )}
                  {selectedPlayer && (
                    <li>
                      Player: {players.find(p => p.id === selectedPlayer)?.name}
                    </li>
                  )}
                  {matchType && (
                    <li>
                      Match Type: {matchType === '1v1' ? '1v1 Matches' : 'Team Matches'}
                    </li>
                  )}
                </ul>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* Quad Map with All Pins */}
      <Card
        title="Tag Locations on Quad Map"
        bordered={false}
      >
        {applyingFilters ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin size="large" />
          </div>
        ) : allPins.length > 0 ? (
          <div>
            <div
              style={{
                position: 'relative',
                maxWidth: '800px',
                margin: '0 auto',
                border: '1px solid #ccc'
              }}
            >
              <img
                src="/images/quad.jpg"
                alt="Quad Map"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
                onLoad={() => setImageLoaded(true)}
              />

              {/* Map pins */}
              {imageLoaded && allPins.map((pin, index) => {
                if (!pin.location) return null;

                // Pin coordinates are now already in percentages
                const position = {
                  x: pin.location.x,
                  y: pin.location.y
                };

                console.log('Pin data:', {
                  position,
                  details: pin.matchDetails
                });

                return (
                  <Tooltip
                    key={index}
                    title={
                      <div>
                        <div>Date: {pin.matchDetails?.date || 'N/A'}</div>
                        <div>Chaser: {pin.matchDetails?.chaser || 'N/A'}</div>
                        <div>Evader: {pin.matchDetails?.evader || 'N/A'}</div>
                        {pin.matchDetails?.video_url && (
                          <div>
                            <a href={pin.matchDetails.video_url} target="_blank" rel="noopener noreferrer">
                              Watch Video
                            </a>
                          </div>
                        )}
                        <div style={{ fontSize: '0.8em', color: '#888' }}>
                          Position: ({position.x.toFixed(1)}%, {position.y.toFixed(1)}%)
                        </div>
                      </div>
                    }
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        width: '12px',
                        height: '12px',
                        backgroundColor: 'rgba(128, 0, 128, 0.8)',
                        borderRadius: '50%',
                        border: '2px solid white',
                        cursor: 'pointer',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                      }}
                    />
                  </Tooltip>
                );
              })}
            </div>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div>Total Tags Displayed: {allPins.length}</div>
              {allPins.length > 0 && (
                <div style={{ marginTop: 8, fontSize: '0.9em', color: '#666' }}>
                  Hover over pins to see tag details
                </div>
              )}
            </div>
          </div>
        ) : (
          <Empty description="No tag locations recorded for the selected filters" />
        )}
      </Card>
    </div>
  );
}

export default QuadPins; 