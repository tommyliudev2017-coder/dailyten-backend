const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// ================= API KEY =================
const API_KEY = process.env.API_KEY;

function verifyApiKey(req, res, next) {
  const clientKey = req.headers["x-api-key"];

  if (!clientKey || clientKey !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

// ================= GOOGLE AUTH =================
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ================= ADD DATA =================
app.post("/add-data", verifyApiKey, async (req, res) => {
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

// ================= GET NEWS =================
// 1. Move Auth OUTSIDE the route so it only happens ONCE when server starts
let sheets;
async function initializeSheets() {
  const client = await auth.getClient();
  sheets = google.sheets({ version: "v4", auth: client });
  console.log("Google Sheets API Ready");
}
initializeSheets();

// 2. Simple In-Memory Cache
let newsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.get("/get-news", verifyApiKey, async (req, res) => {
  try {
    const now = Date.now();
    
    // Serve from cache if available and not expired
    if (newsCache && (now - lastFetchTime < CACHE_DURATION)) {
      return res.json(newsCache);
    }

    // Fetch only if cache is empty or old
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1hSQ5z7Zov9KDmYDbhZX87OYUvPNy_WG_gne-5G3TxTA",
      range: "HVG.hu!A2:G11",
    });

    newsCache = response.data.values || [];
    lastFetchTime = now;

    res.json(newsCache);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
});

// ================= PROXY IMAGE =================
app.get("/proxy-image", verifyApiKey, async (req, res) => {
  try {
    const imageUrl = req.query.url;

    if (!imageUrl) {
      return res.status(400).send("Missing image URL");
    }

    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://hvg.hu/",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      timeout: 10000,
    });

    res.set("Content-Type", response.headers["content-type"]);
    res.set("Cache-Control", "public, max-age=3600");

    res.send(response.data);

  } catch (error) {
    console.error("Proxy image error:", error.message);
    res.status(500).send("Failed to fetch image");
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
