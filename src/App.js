import React, { useState } from "react";

function App() {
  // Free prompt (what you already had)
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [promptError, setPromptError] = useState("");

  // Claim summary
  const [claimId, setClaimId] = useState("");
  const [claimResult, setClaimResult] = useState("");
  const [claimError, setClaimError] = useState("");

  async function handleAsk(e) {
    e.preventDefault();
    setPromptError("");
    setAnswer("");

    try {
      const res = await fetch("http://localhost:5001/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPromptError(data.error || "Server error");
        return;
      }

      setAnswer(data.answer);
    } catch (err) {
      console.error(err);
      setPromptError("Could not connect to AI server.");
    }
  }

  async function handleClaimSummary(e) {
    e.preventDefault();
    setClaimError("");
    setClaimResult("");

    try {
      const res = await fetch("http://localhost:5001/claim-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setClaimError(data.error || "Server error");
        return;
      }

      setClaimResult(data.raw_result);
    } catch (err) {
      console.error(err);
      setClaimError("Could not reach server");
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Claims assistant</h1>

      {/* Free prompt section */}
      <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #ccc" }}>
        <h2>Ask anything</h2>
        <form onSubmit={handleAsk}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            style={{ width: "100%", marginBottom: "0.5rem" }}
            placeholder="Ask a question about claims..."
          />
          <button type="submit">Send to AI</button>
        </form>
        {promptError && <div style={{ color: "red", marginTop: "0.5rem" }}>{promptError}</div>}
        {answer && (
          <pre style={{ whiteSpace: "pre-wrap", marginTop: "0.5rem" }}>
            {answer}
          </pre>
        )}
      </section>

      {/* Claim summary by ID */}
      <section style={{ padding: "1rem", border: "1px solid #ccc" }}>
        <h2>Summarise claim by ID</h2>
        <form onSubmit={handleClaimSummary}>
          <input
            type="number"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            placeholder="Enter claim ID (e.g. 1)"
            style={{ marginRight: "0.5rem" }}
          />
          <button type="submit">Get summary</button>
        </form>
        {claimError && <div style={{ color: "red", marginTop: "0.5rem" }}>{claimError}</div>}
        {claimResult && (
          <pre style={{ whiteSpace: "pre-wrap", marginTop: "0.5rem" }}>
            {claimResult}
          </pre>
        )}
      </section>
    </div>
  );
}

export default App;