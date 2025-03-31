const express = require('express');
const bodyParser = require('body-parser');
const scheduler = require('./timetable_schedular/scheduler');

const app = express();
const port = 3000;

// Middleware to serve static files
app.use(express.static('public'));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.post('/generate-timetable', (req, res) => {
    const { branch, year, visitingTeachers } = req.body;

    // Add visiting teachers to the database
    visitingTeachers.forEach(teacher => {
        const newTeacher = {
            name: teacher.name,
            subjects: [{ course: teacher.subject, type: 'non', teachesTo: [branch] }]
        };
        scheduler.addVisitingTeacher(newTeacher);
    });

    try {
        const timetable = scheduler.generateTimetable();
        res.status(200).json({ message: 'Timetable generated successfully', timetable });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating timetable', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
