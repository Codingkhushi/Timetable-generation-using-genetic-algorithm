const { assignTeachers, assignRooms } = require("./assignments");
const { validateTimetable } = require("./validation");
const { applyConstraints } = require("./constraints");
const db = require("../models/db");
const facultyDB = require("../models/faculty_db");
const { calculateEnhancedFitness, calculateFitness } = require("./fitness");
const { EvenCourses } = require("../models/db.js"); // Add this line
const { OddCourses } = require("../models/db.js"); // Add this line

const POPULATION_SIZE = 50;
const GENERATIONS = 500;
const MUTATION_RATE = 0.05; //5%
const ELITE_SIZE = 5;
const MAX_EXECUTION_TIME = 300000;
const MAX_ATTEMPTS_PER_COURSE = 20;

// Helper function to check if a room is a lab
function isLabRoom(room) {
  return room.toLowerCase().includes('lab');
}

// Helper function to get consecutive time slots
function getConsecutiveSlots(slots, currentIndex) {
  if (currentIndex >= slots.length - 1) return null;
  const currentSlot = slots[currentIndex];
  const nextSlot = slots[currentIndex + 1];
  
  // Parse times
  const currentEnd = currentSlot.split('-')[1];
  const nextStart = nextSlot.split('-')[0];
  
  // Check if slots are consecutive
  if (currentEnd === nextStart) {
    return `${currentSlot.split('-')[0]}-${nextSlot.split('-')[1]}`;
  }
  return null;
}

function generateRandomTimetable() {
  const timeSlotsByDay = {
    Monday: ["08:30-9:30","9:30-10:30", "10:30-11:30", "11:30-12:30", "01:15-02:15", "02:15-03:15", "03:15-04:15", "04:15-05:15"],
    Tuesday: ["08:30-9:30","9:30-10:30", "10:30-11:30", "11:30-12:30", "01:15-02:15", "02:15-03:15", "03:15-04:15", "04:15-05:15"],
    Wednesday: ["08:30-9:30","9:30-10:30", "10:30-11:30", "11:30-12:30", "01:15-02:15", "02:15-03:15", "03:15-04:15", "04:15-05:15"],
    Thursday: ["08:30-9:30","9:30-10:30", "10:30-11:30", "11:30-12:30", "01:15-02:15", "02:15-03:15", "03:15-04:15", "04:15-05:15"],
    Friday: ["08:30-9:30","9:30-10:30", "10:30-11:30", "11:30-12:30", "01:15-02:15", "02:15-03:15", "03:15-04:15", "04:15-05:15"]
  };

  const scheduleMap = new Map();
  const timetable = [];

  // Pre-process courses
  const coursesToSchedule = [];
  for (const year in db.courses) {
    const yearData = db.courses[year];
    for (const branch in yearData) {
      yearData[branch].forEach(course => {
        // Determine required slots based on year and type
        let requiredSlots;
        if (year === 'fourthYear') {
          requiredSlots = 1; // Only one lecture per week for fourth year
        } else {
          requiredSlots = course.type === "both" ? 4 : course.type === "lab" ? 1 : 3;
        }

        coursesToSchedule.push({
          course: course.course,
          year,
          branch,
          type: course.type,
          priority: course.type === "lab" ? 2 : 1,
          requiredSlots
        });
      });
    }
  }

  // Sort by priority
  coursesToSchedule.sort((a, b) => b.priority - a.priority);

  // Helper function to check slot availability
  const isSlotAvailable = (entry, duration = 1) => {
    const slots = duration === 2 ? 2 : 1;
    const key = `${entry.day}-${entry.time}`;
    const existing = scheduleMap.get(key);
    
    if (existing) {
      return !existing.some(e => 
        e.teacher === entry.teacher || 
        e.room === entry.room || 
        (e.branch === entry.branch && e.year === entry.year)
      );
    }
    return true;
  };

  // Helper function to check and reserve consecutive slots for labs
  const reserveLabSlots = (entry, slotIndex, slots) => {
    const consecutiveSlot = getConsecutiveSlots(slots, slotIndex);
    if (!consecutiveSlot) return false;

    // Check availability for both slots
    const firstSlotKey = `${entry.day}-${slots[slotIndex]}`;
    const secondSlotKey = `${entry.day}-${slots[slotIndex + 1]}`;

    if (!isSlotAvailable({ ...entry, time: slots[slotIndex] }) || 
        !isSlotAvailable({ ...entry, time: slots[slotIndex + 1] })) {
      return false;
    }

    // Reserve both slots
    entry.time = consecutiveSlot;
    const key = `${entry.day}-${consecutiveSlot}`;
    const existing = scheduleMap.get(key) || [];
    scheduleMap.set(key, [...existing, entry]);

    return true;
  };

  // Schedule each course
  coursesToSchedule.forEach(course => {
    let scheduledSlots = 0;
    let attempts = 0;

    while (scheduledSlots < course.requiredSlots && attempts < MAX_ATTEMPTS_PER_COURSE) {
      attempts++;
      
      // Try each day
      const days = Object.keys(timeSlotsByDay);
      const randomDay = days[Math.floor(Math.random() * days.length)];
      const slots = [...timeSlotsByDay[randomDay]];
      
      // For lab sessions or lab rooms, try to find consecutive slots
      const isLab = course.type === "lab" || (course.type === "both" && scheduledSlots % 2 === 0);
      
      if (isLab) {
        // Try to find and reserve consecutive slots
        const randomSlotIndex = Math.floor(Math.random() * (slots.length - 1));
        const room = assignRooms(course, db.classrooms, db.labs);
        
        if (room && isLabRoom(room.name)) {
          const teacher = assignTeachers(course, facultyDB.teachers, course.branch);
          if (!teacher) continue;

          const entry = {
            year: course.year,
            branch: course.branch,
            course: course.course,
            teacher: teacher.name,
            room: room.name,
            day: randomDay,
            type: "lab"
          };

          if (reserveLabSlots(entry, randomSlotIndex, slots)) {
            timetable.push(entry);
            scheduledSlots += 2; // Count as two slots for lab sessions
            continue;
          }
        }
      } else {
        // Regular 1-hour session
        const randomSlot = slots[Math.floor(Math.random() * slots.length)];
        const teacher = assignTeachers(course, facultyDB.teachers, course.branch);
        if (!teacher) continue;

        const room = assignRooms(course, db.classrooms, db.labs);
        if (!room) continue;

        const entry = {
          year: course.year,
          branch: course.branch,
          course: course.course,
          teacher: teacher.name,
          room: room.name,
          day: randomDay,
          time: randomSlot,
          type: "theory"
        };

        if (isSlotAvailable(entry)) {
          timetable.push(entry);
          const key = `${entry.day}-${entry.time}`;
          const existing = scheduleMap.get(key) || [];
          scheduleMap.set(key, [...existing, entry]);
          scheduledSlots++;
        }
      }
    }
  });

  return timetable;
}

// function calculateFitness(timetable) {
//   let fitness = 1.0;
//   const conflicts = new Set();
//   const slotMap = new Map();

//   timetable.forEach(entry => {
//     const key = `${entry.day}-${entry.time}`;
    
//     // Check teacher conflicts
//     const teacherKey = `${key}-${entry.teacher}`;
//     if (slotMap.has(teacherKey)) conflicts.add(teacherKey);
//     slotMap.set(teacherKey, true);
    
//     // Check room conflicts
//     const roomKey = `${key}-${entry.room}`;
//     if (slotMap.has(roomKey)) conflicts.add(roomKey);
//     slotMap.set(roomKey, true);
    
//     // Check class conflicts
//     const classKey = `${key}-${entry.year}-${entry.branch}`;
//     if (slotMap.has(classKey)) conflicts.add(classKey);
//     slotMap.set(classKey, true);
//   });

//   // Each conflict reduces fitness by 0.1
//   fitness -= (conflicts.size * 0.1);
//   return Math.max(0, fitness);
// }


function selectParents(population) {
  const tournamentSize = 3;
  
  const tournament = () => {
    let best = null;
    for (let i = 0; i < tournamentSize; i++) {
      const contestant = population[Math.floor(Math.random() * population.length)];
      if (!best || contestant.fitness > best.fitness) {
        best = contestant;
      }
    }
    return best;
  };

  return [tournament(), tournament()];
}

function crossover(parent1, parent2) {
  const crossoverPoint = Math.floor(Math.random() * parent1.timetable.length);
  const childTimetable = [
    ...parent1.timetable.slice(0, crossoverPoint),
    ...parent2.timetable.slice(crossoverPoint)
  ];
  return { timetable: childTimetable, fitness: calculateFitness(childTimetable) };
}

function mutate(individual) {
  if (Math.random() < MUTATION_RATE) {
    const idx = Math.floor(Math.random() * individual.timetable.length);
    const newTimetable = generateRandomTimetable();
    if (newTimetable.length > idx) {
      individual.timetable[idx] = newTimetable[idx];
      individual.fitness = calculateFitness(individual.timetable);
    }
  }
}

function geneticAlgorithm() {
  const startTime = Date.now();
  
  let population = Array.from({ length: POPULATION_SIZE }, () => {
    const timetable = generateRandomTimetable();
    return { timetable, fitness: calculateFitness(timetable) };
  });

  let bestSolution = null;
  let generationsWithoutImprovement = 0;

  for (let generation = 0; generation < GENERATIONS; generation++) {
    // Check timeout
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.log("Timeout reached, returning best solution found");
      return bestSolution?.timetable || population[0].timetable;
    }

    // Sort by fitness
    population.sort((a, b) => b.fitness - a.fitness);

    // Update best solution
    if (!bestSolution || population[0].fitness > bestSolution.fitness) {
      bestSolution = { ...population[0] };
      generationsWithoutImprovement = 0;
    } else {
      generationsWithoutImprovement++;
    }

    // Early stopping
    if (generationsWithoutImprovement > 50 || bestSolution.fitness === 1) {
      console.log(`Stopping at generation ${generation}`);
      const finalTimetable = bestSolution.timetable;
      const fitnessDetails = calculateEnhancedFitness(finalTimetable);
      console.log("Final Timetable Fitness Analysis:");
      console.log(`Overall Score: ${fitnessDetails.score.toFixed(4)}`);
      console.log(`Total Violations: ${fitnessDetails.details.totalViolations}`);
      console.log("Violation Types:");
      for (const [type, count] of Object.entries(fitnessDetails.details.violationTypes)) {
        console.log(`- ${type}: ${count}`);
      }
      return finalTimetable;
    }

    // Create new population
    const newPopulation = population.slice(0, ELITE_SIZE);
    
    while (newPopulation.length < POPULATION_SIZE) {
      const [parent1, parent2] = selectParents(population);
      const child = crossover(parent1, parent2);
      mutate(child);
      newPopulation.push(child);
    }

    population = newPopulation;
  }

  const finalTimetable = bestSolution?.timetable || population[0].timetable;
  const fitnessDetails = calculateEnhancedFitness(finalTimetable);
  console.log("Final Timetable Fitness Analysis:");
  console.log(`Overall Score: ${fitnessDetails.score.toFixed(4)}`);
  console.log(`Total Violations: ${fitnessDetails.details.totalViolations}`);
  console.log("Violation Types:");
  for (const [type, count] of Object.entries(fitnessDetails.details.violationTypes)) {
    console.log(`- ${type}: ${count}`);
  }
  return finalTimetable;
}

module.exports = { geneticAlgorithm };