const express = require("express");
const OpenAI = require("openai");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// (Optional) put your claims schema here later:
const CLAIMS_SCHEMA = `
We have an insurance claims system with (example):
- Table Claims(ClaimID, ClaimNumber, CustomerID, Status, CreatedDate, UpdatedDate, Description)
- Table Customers(CustomerID, Name, Country)
`;
// ^ adjust this to match your real world

app.post("/ask", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are an assistant that explains and analyzes insurance claims
in our internal system.

Use this context about our data model when relevant:
${CLAIMS_SCHEMA}

If the user asks for specific claim lists or statistics, suggest
what SQL query could be used on our database, and then explain in
plain language what that query would return.

If you don't have enough data (for example, you don't actually see
the database), clearly say that you are only giving an example.
          `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    res.json({ answer: response.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5001, () => console.log("Server running on port 5001"));