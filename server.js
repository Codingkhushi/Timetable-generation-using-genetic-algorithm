const express = require("express");
const cors = require("cors");
const { geneticAlgorithm } = require("./timetable_schedular/genetic_algorithm"); // Ensure this file exists and works

const app = express();
const PORT = 3000;

app.use(cors()); // Enable CORS to allow frontend requests
app.use(express.json()); // Parse JSON request body

// API route to get the timetable
app.get("/api/timetable", (req, res) => {
  try {
    const timetable = geneticAlgorithm(); // Generate timetable
    res.json(timetable); // Send JSON response
  } catch (error) {
    console.error("Error generating timetable:", error);
    res.status(500).json({ error: "Failed to generate timetable" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
app.get("/", (req, res) => {
  res.send("Welcome to the Timetable API! Use /api/timetable to get the timetable.");
});
