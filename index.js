const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Parse service account
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// Fix newline issue
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ----------- ADD DATA -----------
app.post("/add-data", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const { name, score } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: "1hSQ5z7Zov9KDmYDbhZX87OYUvPNy_WG_gne-5G3TxTA",
      range: "HVG.hu!A2:G",
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

// ----------- GET NEWS -----------
app.get("/get-news", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1hSQ5z7Zov9KDmYDbhZX87OYUvPNy_WG_gne-5G3TxTA",
      range: "HVG.hu!A2:G",
    });

    res.json(response.data.values || []);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
});

// ----------- START SERVER -----------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
