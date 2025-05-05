import React, { useEffect, useState } from "react";

function Players() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);

  const fetchPlayers = () => {
    fetch("/players/")
      .then(res => res.json())
      .then(setPlayers);
  };
  useEffect(fetchPlayers, []);

  const handleAddPlayer = async e => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    if (image) formData.append("image", image);
    await fetch("/players/", {
      method: "POST",
      body: formData,
    });
    setName("");
    setImage(null);
    fetchPlayers();
  };

  const handleDelete = async id => {
    await fetch(`/players/${id}`, { method: "DELETE" });
    fetchPlayers();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Players</h2>
      <form onSubmit={handleAddPlayer} style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Player name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={{ marginRight: 8 }}
        />
        <input
          type="file"
          accept="image/png, image/jpeg"
          onChange={e => setImage(e.target.files[0])}
          style={{ marginRight: 8 }}
        />
        <button type="submit">Add Player</button>
      </form>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {players.map(p => (
          <div key={p.id} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, width: 180, position: "relative" }}>
            {p.image_id && (
              <div style={{ width: "100%", paddingTop: "100%", position: "relative", marginBottom: 8 }}>
                <img 
                  src={`/players/${p.id}/image`} 
                  alt={p.name} 
                  style={{ 
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 6 
                  }} 
                />
              </div>
            )}
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <button
              onClick={() => handleDelete(p.id)}
              style={{ 
                position: "absolute", 
                top: 8, 
                right: 8, 
                background: "#f55", 
                color: "#fff", 
                border: "none", 
                borderRadius: 4, 
                padding: "2px 8px", 
                cursor: "pointer",
                zIndex: 1
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Players;
