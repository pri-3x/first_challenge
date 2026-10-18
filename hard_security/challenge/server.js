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

function readArtifact(contractName) {
  return JSON.parse(fs.readFileSync(
    path.join(__dirname, "artifacts", "contracts", "Market.sol", `${contractName}.json`),
    "utf8"
  ));
}

app.get("/contracts/Market.sol", (req, res) => {
  const file = path.join(__dirname, "contracts", "Market.sol");
  res.type("text/plain").send(fs.readFileSync(file, "utf8"));
});

app.get("/abi", (req, res) => {
  try {
    res.json({
      Asset: readArtifact("Asset").abi,
      SpotPool: readArtifact("SpotPool").abi,
      FlashLender: readArtifact("FlashLender").abi,
      Lender: readArtifact("Lender").abi,
    });
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
