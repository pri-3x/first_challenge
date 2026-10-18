const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const getState = require("./getstate");

const FLAG = fs.readFileSync(path.join(__dirname, "flag.txt"), "utf8").trim();
const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed"));
  },
}));

app.get("/contracts/Workshop.sol", (req, res) => {
  const file = path.join(__dirname, "contracts", "Workshop.sol");
  res.type("text/plain").send(fs.readFileSync(file, "utf8"));
});

app.get("/abi", (req, res) => {
  try {
    const token = JSON.parse(fs.readFileSync(
      path.join(__dirname, "artifacts", "contracts", "Workshop.sol", "WorkshopToken.json"),
      "utf8"
    ));
    const collector = JSON.parse(fs.readFileSync(
      path.join(__dirname, "artifacts", "contracts", "Workshop.sol", "Collector.json"),
      "utf8"
    ));
    res.json({ WorkshopToken: token.abi, Collector: collector.abi });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ABI is unavailable" });
  }
});

app.get("/status", async (req, res) => {
  try {
    res.json(await getState());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Challenge state is unavailable" });
  }
});

app.get("/check-solved", async (req, res) => {
  try {
    const data = await getState();
    if (!data.solved) {
      return res.json({ solved: false });
    }
    res.json({ solved: true, flag: FLAG });
  } catch (err) {
    console.error(err);
    res.status(500).json({ solved: false });
  }
});

const port = Number(process.env.API_PORT || 3000);
app.listen(port, "127.0.0.1", () => {
  console.log(`Challenge running on http://127.0.0.1:${port}`);
});
