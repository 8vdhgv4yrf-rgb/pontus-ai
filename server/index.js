// index.js – backend with OpenAI + Azure SQL (ClaimsDB)
//Test of github
require("dotenv").config();
const express = require("express");
const OpenAI = require("openai");
const cors = require("cors");
const sql = require("mssql");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- OpenAI client ----------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- DB config (MariaDB SQL: claimsDB) ----------
const dbConfig = {
  host: process.env.MARIADB_HOST || "127.0.0.1",
  port: Number(process.env.MARIADB_PORT || 3307),  // SSH tunnel
  user: process.env.MARIADB_USER,                  // claimsuser
  password: process.env.MARIADB_PASSWORD,
  database: process.env.MARIADB_DB || "claimsdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

console.log("DB CONFIG:", dbConfig);
// ---------- Helper: build structured claim text from DB row ----------

const CLAIM_FIELDS = [
  // Basic claim info
  { label: "Claim ID", column: "ID" },
  { label: "Type", column: "Type" },
  { label: "Status", column: "Status" },
  { label: "CreatedDate", column: "CreatedDate" },
  { label: "ClosedDate", column: "ClosedDate" },
  { label: "Title", column: "Title" },
  { label: "Incident", column: "Incident" },
  { label: "Accepted", column: "Accepted" },
  { label: "Closed", column: "Closed" },
  { label: "Responsible", column: "Responsible" },

  // Customer info
  { label: "CustomerName", column: "CustomerName" },
  { label: "CustomerContact", column: "CustomerContact" },
  { label: "CustomerReferenceNo", column: "CustomerReferenceNo" },
  { label: "CustomerClaimDate", column: "CustomerClaimDate" },

  // Product info
  { label: "CustomerProductName", column: "CustomerProductName" },
  { label: "ProductName", column: "ProductName" },
  { label: "SerialNo", column: "SerialNo" },
  { label: "ComponentGroup", column: "ComponentGroup" },
  { label: "ComponentFailMode", column: "ComponentFailMode" },
  { label: "NumberClaimedUnits", column: "NumberClaimedUnits" },
  { label: "NumberReturnedUnits", column: "NumberReturnedUnits" },

  // Problem descriptions
  { label: "customer_problem_description", column: "customer_problem_description" },
  { label: "D0_ProblemDescription", column: "D0_ProblemDescription" },

  // 8D fields
  { label: "D3_achieved", column: "D3_achieved" },
  { label: "D4_RootCause", column: "D4_RootCause" },
  { label: "D4_CausedBy", column: "D4_CausedBy" },
  { label: "D4_achieved", column: "D4_achieved" },
  { label: "D5_achieved", column: "D5_achieved" },
  { label: "D6_planned", column: "D6_planned" },
  { label: "D6_achieved", column: "D6_achieved" },
  { label: "D7_planned", column: "D7_planned" },
  { label: "D7_achieved", column: "D7_achieved" },

  // Misc
  { label: "ReturnDate", column: "ReturnDate" },
  { label: "RepurchaseOrderNo", column: "RepurchaseOrderNo" },
  { label: "StoragePlace", column: "StoragePlace" },
  { label: "CommentsCQT", column: "CommentsCQT" },
];

function buildClaimText(row) {
  const lines = CLAIM_FIELDS.map(({ label, column }) => {
    const value = row[column];
    if (value === null || value === undefined || value === "") {
      return `${label}:`;
    }
    return `${label}: ${value}`;
  });
  return lines.join("\n");
}

// ---------- DB helper: get one claim by ID ----------

async function getRowByClaimId(claimId) {
  const [rows] = await pool.query(
    "SELECT * FROM Claims WHERE ID = ?",
    [Number(claimId)]
  );
  return rows[0] || null;
}


// ---------- DB helper: get all claims ----------


async function getAllClaims() {
  const [rows] = await pool.query(
    "SELECT * FROM Claims ORDER BY ID DESC LIMIT 20"
  );
  return rows;
}

// ---------- Routes ----------

// Health check
app.get("/", (req, res) => {
  res.send("Backend is alive");
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS cnt FROM Claims");
    res.json({ ok: true, claims_count: rows[0].cnt });
  } catch (err) {
    console.error("DB test error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Existing route used by your current React UI (free prompt)
app.post("/claim-summary", async (req, res) => {
  try {
    const { claimId } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: "Missing 'claimId' in body" });
    }

    const row = await getRowByClaimId(claimId);

    if (!row) {
      return res.status(404).json({ error: `Claim ID ${claimId} not found` });
    }

    const claimText = buildClaimText(row);

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
    console.error("Error in /claim-summary:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Route: ask questions about the Claims table
app.post("/ask", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing 'prompt' in body" });
    }

    // 1) Load data from DB
    const claims = await getAllClaims();

    // Optional: if table is huge, you can trim or select columns here
    // Example: keep only some fields
    // const trimmedClaims = claims.map(({ ID, Status, Type, CreatedDate, ClosedDate, Responsible }) => ({
    //   ID, Status, Type, CreatedDate, ClosedDate, Responsible
    // }));

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are an accurate, concise assistant helping with insurance claims.
You are given a table from the "Claims" SQL table (as JSON array of row objects).
Always base your answers ONLY on that data. If something cannot be answered from the data, say so clearly.
If useful, you may reference Claim IDs or other fields in your explanation.
        `.trim(),
        },
        {
          role: "user",
          content: `
Here is the Claims table data as JSON:

\`\`\`json
${JSON.stringify(claims, null, 2)}
\`\`\`

Question: ${prompt}
        `.trim(),
        },
      ],
    });

    const text = response.choices[0].message.content;
    res.json({ answer: text });
  } catch (err) {
    console.error("AI error in /ask:", err);
    res.status(500).json({ error: "AI server error" });
  }
});

// New: summarise a specific claim by ID using DB + AI
app.post("/claim-summary", async (req, res) => {
  try {
    const { claimId } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: "Missing 'claimId' in body" });
    }

    const row = await getalldata(claimId);

    if (!row) {
      return res.status(404).json({ error: `Claim ID ${claimId} not found` });
    }

    const claimText = buildClaimText(row);

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
    console.error("Error in /claim-summary:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Start server ----------
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
