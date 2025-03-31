let timetableData = [];

// Fetch timetable data on page load
document.addEventListener("DOMContentLoaded", () => {
  fetch("http://localhost:3000/api/timetable")
    .then(response => response.json())
    .then(data => {
      timetableData = data;
      displayTimetable(timetableData);
    })
    .catch(error => console.error("Error fetching timetable:", error));
});

// Function to display timetable
// Function to sort timetable: First by day, then by time
function sortTimetable(timetable) {
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return timetable.sort((a, b) => {
    // Sort by day order first
    let dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;

    // Then sort by time (assuming time format is "HH:MM AM/PM")
    return a.time.localeCompare(b.time);
  });
}

// Function to display the timetable
function displayTimetable(timetable) {
  const tbody = document.getElementById("timetable-body");
  tbody.innerHTML = "";

  // Sort timetable before displaying
  const sortedTimetable = sortTimetable(timetable);

  sortedTimetable.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.year}</td>
      <td>${entry.branch}</td>
      <td>${entry.course}</td>
      <td>${entry.teacher}</td>
      <td>${entry.room}</td>
      <td>${entry.day}</td>
      <td>${entry.type}</td>
      <td>${entry.time}</td>
    `;
    tbody.appendChild(row);
  });
}


// Show semester buttons when a year is selected
function showSemesterButtons(year) {
  document.getElementById("semester-buttons").style.display = "block";

  document.getElementById("oddSemBtn").onclick = () => filterBySemester(year, "odd");
  document.getElementById("evenSemBtn").onclick = () => filterBySemester(year, "even");
}

// Filter data based on year & semester
function filterBySemester(year, semesterType) {
  let semester;
  if (semesterType === "odd") {
    semester = year === "firstYear" ? "1st" : 
               year === "secondYear" ? "3rd" : 
               year === "thirdYear" ? "5th" : "7th";
  } else {
    semester = year === "firstYear" ? "2nd" : 
               year === "secondYear" ? "4th" : 
               year === "thirdYear" ? "6th" : "8th";
  }

  // Check if timetableData has semester information
  const filtered = timetableData.filter(entry => 
    entry.year.toLowerCase() === year.toLowerCase() &&
    entry.semester.includes(semester)  // Ensure this matches how semester is stored in DB
  );

  if (filtered.length === 0) {
    console.warn("No data found for", year, semester);
  }

  displayTimetable(filtered);
}



// Year button event listeners
document.getElementById("firstYearBtn").addEventListener("click", () => showSemesterButtons("firstYear"));
document.getElementById("secondYearBtn").addEventListener("click", () => showSemesterButtons("secondYear"));
document.getElementById("thirdYearBtn").addEventListener("click", () => showSemesterButtons("thirdYear"));
document.getElementById("fourthYearBtn").addEventListener("click", () => showSemesterButtons("fourthYear"));

// Show all years
document.getElementById("allYearsBtn").addEventListener("click", () => {
  document.getElementById("semester-buttons").style.display = "none";
  displayTimetable(timetableData);
});
