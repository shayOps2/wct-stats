import React from "react";
import { Card, Tag, Button, Input, Typography, Space, theme } from "antd";
import { EditOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function MatchCard({ match, selected, onClick, onDelete, onEditDate, onEditVideoURL, onUpdateVideoURL, generateTeamName }) {
  const { token } = theme.useToken();

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        width: 320,
        borderColor: selected ? token.colorPrimary : undefined,
        borderWidth: selected ? 2 : 1,
      }}
      actions={[
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          Delete
        </Button>
      ]}
      title={
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tag color="blue">{match.match_type.toUpperCase()}</Tag>
            {match.is_sudden_death && <Tag color="red">SUDDEN DEATH</Tag>}
          </div>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {match.match_type === "team" ? (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 16 }}>
              {match.team1_name || generateTeamName(match.team1_players.map(p => p.id))}
            </Text>
            <div style={{ color: token.colorTextSecondary }}>vs</div>
            <Text strong style={{ fontSize: 16 }}>
              {match.team2_name || generateTeamName(match.team2_players.map(p => p.id))}
            </Text>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 'bold' }}>
              {match.team1_score} - {match.team2_score}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 16 }}>{match.player1?.name}</Text>
            <div style={{ color: token.colorTextSecondary }}>vs</div>
            <Text strong style={{ fontSize: 16 }}>{match.player2?.name}</Text>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 'bold' }}>
              {match.team1_score} - {match.team2_score}
            </div>
          </div>
        )}

        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary">Date:</Text>
          <div onClick={e => e.stopPropagation()}>
            <Input
              type="date"
              size="small"
              value={onEditDate.value}
              onChange={onEditDate.onChange}
            />
          </div>
        </Space>

        <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
          <Text type="secondary">Video URL:</Text>
          <Space.Compact style={{ width: '100%' }} onClick={e => e.stopPropagation()}>
            <Input
              size="small"
              value={onEditVideoURL.value}
              onChange={onEditVideoURL.onChange}
              placeholder="Video URL"
            />
            <Button
              size="small"
              type="primary"
              icon={<SaveOutlined />}
              onClick={onUpdateVideoURL}
            />
          </Space.Compact>
        </Space>

        {match.is_completed && (
          <div style={{ marginTop: 8 }}>
            <Text type="success">Winner: {match.winner}</Text>
          </div>
        )}

        <div style={{ marginTop: 4 }}>
          <Text type="secondary">Rounds: {match.rounds?.length || 0}</Text>
        </div>
      </Space>
    </Card>
  );
}
