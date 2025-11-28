
require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");
const cors = require("cors");
const sql = require("mssql");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const dbConfig = {
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  server: process.env.AZURE_SQL_SERVER,      // e.g. "myserver.database.windows.net"
  database: process.env.AZURE_SQL_DB,        // e.g. "ClaimsDB"
  options: {
    encrypt: true,
  },
};

console.log("DB CONFIG:", dbConfig);



// create a single global connection pool
const poolPromise = sql.connect(dbConfig);

async function getRowByClaimId(claimId) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("id", sql.Int, Number(claimId))
    .query("SELECT TOP 1 * FROM Claims WHERE ID = @id");
  return result.recordset[0] || null;
}

app.post("/claim-summary", async (req, res) => {
  try {
    const { claimId } = req.body;
    const row = await getRowByClaimId(claimId);

    if (!row) {
      return res.status(404).json({ error: `Claim ID ${claimId} not found` });
    }

    const claimText = row.AI_Text;

    const prompt = `
You are a professional claims handler.

Here is a claim with structured information:

${claimText}

1. Summarise this claim in 3–5 sentences.
2. List clearly what information seems to be missing or unclear.
3. Suggest the next 2–3 actions a claims engineer should take.
Return the result in three clear sections: Summary, MissingInformation, SuggestedActions.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an accurate, concise claims analysis assistant.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0].message.content;

    res.json({
      claim_id: Number(claimId),
      raw_result: text,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an accurate, concise claims analysis assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    res.json({ answer: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI server error" });
  }
});

app.listen(5001, () => console.log("Server running on port 5001"));