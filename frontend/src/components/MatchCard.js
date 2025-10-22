import React from "react";

export default function MatchCard({ match, selected, onClick, onDelete, onEditDate, onEditVideoURL, onUpdateVideoURL, generateTeamName, setSelectedMatch, setMatches, matches, selectedMatch }) {
  return (
    <div 
      style={{ 
        border: `1px solid ${selected ? '#007bff' : '#ccc'}`,
        borderRadius: 8, 
        padding: 12, 
        width: 300,
        cursor: 'pointer'
      }}
      onClick={onClick}
    >
      <div style={{ marginBottom: 8 }}>
        <strong>Type:</strong> {match.match_type}
      </div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Date:</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input
            type="date"
            value={onEditDate.value}
            onChange={onEditDate.onChange}
            onClick={e => e.stopPropagation()}
            style={{ border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px' }}
          />
          <span style={{ fontSize: '0.8em', color: '#666' }}>
            {onEditDate.display}
          </span>
        </div>
      </div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Video URL:</strong>
        <input
          type="url"
          value={onEditVideoURL.value}
          onChange={onEditVideoURL.onChange}
          placeholder="Edit video URL"
          style={{ border: '1px solid #ddd', borderRadius: 4, padding: '2px 4px', width: '100%' }}
        />
        <button
          onClick={e => {
            e.stopPropagation();
            onUpdateVideoURL();
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
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        style={{ background: "#f55", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}
      >
        Delete
      </button>
    </div>
  );
}
