// index.js - minimal working backend

require("dotenv").config();


const express = require("express");
const OpenAI = require("openai");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// simple health check
app.get("/", (req, res) => {
  res.send("Backend is alive");
});

// OLD React code expects /ask, so we implement /ask here
app.post("/ask", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt' in body" });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an accurate, concise assistant helping with insurance claims.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = response.choices[0].message.content;
    res.json({ answer: text });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI server error" });
  }
});

// no DB yet, just AI
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});