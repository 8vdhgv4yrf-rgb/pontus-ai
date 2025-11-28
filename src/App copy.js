import React, { useState } from "react";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("http://localhost:5001/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query })
      });

      const data = await res.json();
      setAnswer(data.answer);
    } catch (err) {
      console.error(err);
      setAnswer("Error: Could not connect to AI server.");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Pontus AI Search</h1>

      <input
        type="text"
        placeholder="Ask something…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input"
      />

      <button onClick={handleSearch} className="button" disabled={loading}>
        {loading ? "Thinking…" : "Search"}
      </button>

      <div className="answer-box">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <p>{answer || "Your answer will appear here."}</p>
        )}
      </div>
    </div>
  );
}

export default App;