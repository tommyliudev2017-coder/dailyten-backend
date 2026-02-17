const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

app.post("/add-data", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const { name, score } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: "1hSQ5z7Zov9KDmYDbhZX87OYUvPNy_WG_gne-5G3TxTA",
      range: "HVG.hu!A2:G11",
      valueInputOption: "RAW",
      resource: {
        values: [[name, score]],
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to write to sheet" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
