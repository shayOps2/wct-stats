import React, { useState, useEffect } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Spin, 
  Alert, 
  DatePicker, 
  Button, 
  Divider
} from "antd";

const { RangePicker } = DatePicker;

function PlayerStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playersWithStats, setPlayersWithStats] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [applyingFilters, setApplyingFilters] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async (startDate = null, endDate = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with optional date filters
      let url = '/players/';
      if (startDate || endDate) {
        url += '?';
        if (startDate) {
          url += `start_date=${startDate.toISOString()}&`;
        }
        if (endDate) {
          url += `end_date=${endDate.toISOString()}&`;
        }
      }
      
      // Fetch all players
      const response = await fetch(url);
      const playerList = await response.json();

      // Fetch stats for each player
      const playersWithStats = await Promise.all(
        playerList.map(async (player) => {
          // Add date filters to the stats endpoint if provided
          let statsUrl = `/players/${player.id}/stats`;
          if (startDate || endDate) {
            statsUrl += '?';
            if (startDate) {
              statsUrl += `start_date=${startDate.toISOString()}&`;
            }
            if (endDate) {
              statsUrl += `end_date=${endDate.toISOString()}&`;
            }
          }
          
          const statsResponse = await fetch(statsUrl);
          const stats = await statsResponse.json();
          
          // Calculate additional metrics
          const totalChases = stats.offense.total_evasion_attempts + stats.defense.total_chase_attempts;
          const tagRate = stats.defense.tagging_success_rate;
          const evasionRate = stats.offense.evasion_success_rate;
          
          return {
            ...player,
            stats,
            totalRounds: stats.overall.total_rounds,
            totalChases: totalChases,
            tagRate: tagRate,
            evasionRate: evasionRate,
            wins: stats.overall.matches_won,
            matchesPlayed: stats.overall.matches_played,
            winPercentage: stats.overall.win_percentage
          };
        })
      );

      setPlayersWithStats(playersWithStats);
      setLoading(false);
      setApplyingFilters(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError("Failed to load statistics. Please try again later.");
      setLoading(false);
      setApplyingFilters(false);
    }
  };

  const applyFilters = () => {
    setApplyingFilters(true);
    fetchPlayers(
      dateRange && dateRange[0] ? dateRange[0] : null,
      dateRange && dateRange[1] ? dateRange[1] : null
    );
  };

  const clearFilters = () => {
    setDateRange(null);
    fetchPlayers();
  };

  // Player Stats Table Columns
  const playerStatsColumns = [
    { 
      title: 'Player',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Total Rounds',
      dataIndex: 'totalRounds',
      key: 'totalRounds',
      sorter: (a, b) => a.totalRounds - b.totalRounds,
    },
    {
      title: 'Tag %',
      dataIndex: 'tagRate',
      key: 'tagRate',
      render: (rate) => `${rate}%`,
      sorter: (a, b) => a.tagRate - b.tagRate,
    },
    {
      title: 'Evasion %',
      dataIndex: 'evasionRate',
      key: 'evasionRate',
      render: (rate) => `${rate}%`,
      sorter: (a, b) => a.evasionRate - b.evasionRate,
    },
    {
      title: 'Tags',
      dataIndex: ['stats', 'defense', 'successful_tags'],
      key: 'tags',
      sorter: (a, b) => a.stats.defense.successful_tags - b.stats.defense.successful_tags,
    },
    {
      title: 'Tag Attempts',
      dataIndex: ['stats', 'defense', 'total_chase_attempts'],
      key: 'tag_attempts',
      sorter: (a, b) => a.stats.defense.total_chase_attempts - b.stats.defense.total_chase_attempts,
    },
    {
      title: 'Evasions',
      dataIndex: ['stats', 'offense', 'successful_evasions'],
      key: 'evasions',
      sorter: (a, b) => a.stats.offense.successful_evasions - b.stats.offense.successful_evasions,
    },
    {
      title: 'Evasion Attempts',
      dataIndex: ['stats', 'offense', 'total_evasion_attempts'],
      key: 'evasion_attempts',
      sorter: (a, b) => a.stats.offense.total_evasion_attempts - b.stats.offense.total_evasion_attempts,
    },
    {
      title: 'Avg Tag Time',
      dataIndex: ['stats', 'defense', 'average_tag_time'],
      key: 'avg_tag_time',
      render: (time) => `${time.toFixed(1)}s`,
      sorter: (a, b) => a.stats.defense.average_tag_time - b.stats.defense.average_tag_time,
    },
    {
      title: 'Avg Evasion Time',
      dataIndex: ['stats', 'offense', 'average_evasion_time'],
      key: 'avg_evasion_time',
      render: (time) => `${time.toFixed(1)}s`,
      sorter: (a, b) => a.stats.offense.average_evasion_time - b.stats.offense.average_evasion_time,
    },
    {
      title: 'Win %',
      dataIndex: 'winPercentage',
      key: 'winPercentage',
      render: (pct) => `${pct}%`,
      sorter: (a, b) => a.winPercentage - b.winPercentage,
    },
    {
      title: 'Matches Won',
      dataIndex: 'wins',
      key: 'wins',
      sorter: (a, b) => a.wins - b.wins,
    },
    {
      title: 'Matches Played',
      dataIndex: 'matchesPlayed',
      key: 'matchesPlayed',
      sorter: (a, b) => a.matchesPlayed - b.matchesPlayed,
    },
  ];

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
      <h2>Player Statistics</h2>
      
      <Card bordered={false} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <RangePicker 
              style={{ width: '100%' }}
              onChange={value => {
                // Value will be null when user clears the picker
                setDateRange(value);
              }}
              allowEmpty={[false, true]} 
              placeholder={['Start Date', 'End Date (optional)']}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Button 
              type="primary" 
              onClick={applyFilters}
              loading={applyingFilters}
              style={{ marginRight: 8 }}
            >
              Apply Filters
            </Button>
            {dateRange && (
              <Button onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </Col>
          
          {/* Active filters display */}
          {dateRange && dateRange[0] && (
            <Col xs={24}>
              <div style={{ marginTop: '8px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                <b>Date Range:</b> {dateRange[0].format('MMM D, YYYY')}
                {dateRange[1] ? ` to ${dateRange[1].format('MMM D, YYYY')}` : ' to Today'}
              </div>
            </Col>
          )}
        </Row>
      </Card>
      
      <Divider />
      
      {/* Main Player Stats Table */}
      <Card title="All Players" bordered={false}>
        {applyingFilters ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            dataSource={playersWithStats}
            columns={playerStatsColumns}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
}

export default PlayerStats; 