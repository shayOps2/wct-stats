import React, { useEffect, useState } from "react";

function QuadMap() {
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);

  const fetchImages = () => {
    fetch("/quadmap/")
      .then(res => res.json())
      .then(setImages);
  };
  useEffect(fetchImages, []);

  const handleUpload = async e => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    await fetch("/quadmap/upload", {
      method: "POST",
      body: formData,
    });
    setFile(null);
    fetchImages();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Quad Map Images</h2>
      <form onSubmit={handleUpload} style={{ marginBottom: 24 }}>
        <input
          type="file"
          accept="image/png, image/jpeg"
          onChange={e => setFile(e.target.files[0])}
          style={{ marginRight: 8 }}
        />
        <button type="submit">Upload Quad Map</button>
      </form>
      <div style={{ display: "flex", gap: 16 }}>
        {images.map(img => (
          <img
            key={img.image}
            src={`/images/${img.image}`}
            alt={img.image}
            style={{ width: 320, borderRadius: 8, border: "1px solid #ccc" }}
          />
        ))}
      </div>
    </div>
  );
}

export default QuadMap;
