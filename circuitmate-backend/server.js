require("dotenv").config();
const express = require("express");
const cors = require("cors");

const resultsRouter = require("./src/routes/results");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ service: "CircuitMate Results API", status: "ok" });
});

app.use("/api/results", resultsRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CircuitMate results API listening on http://localhost:${PORT}`);
});
