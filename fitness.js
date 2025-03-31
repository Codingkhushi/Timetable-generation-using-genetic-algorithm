function calculateEnhancedFitness(timetable) {
    let fitness = 1.0;
    const violations = [];
    
    // Basic conflict checks
    const slotMap = new Map();
    timetable.forEach(entry => {
        const key = `${entry.day}-${entry.time}`;
        const teacherKey = `${key}-${entry.teacher}`;
        if (slotMap.has(teacherKey)) {
            violations.push({ type: 'Teacher Conflict', details: teacherKey });
        }
        slotMap.set(teacherKey, true);
        
        const roomKey = `${key}-${entry.room}`;
        if (slotMap.has(roomKey)) {
            violations.push({ type: 'Room Conflict', details: roomKey });
        }
        slotMap.set(roomKey, true);
        
        const classKey = `${key}-${entry.year}-${entry.branch}`;
        if (slotMap.has(classKey)) {
            violations.push({ type: 'Class Conflict', details: classKey });
        }
        slotMap.set(classKey, true);
    });
    
    // Additional constraint checks (e.g., teacher workload, course repetition)
    const teacherWorkload = {};
    const courseLastScheduled = {};
    const courseCount = {};
    
    timetable.forEach(entry => {
        const { teacher, day, time, course, type } = entry;
        const teacherDayKey = `${day}-${teacher}`;
        if (!teacherWorkload[teacherDayKey]) teacherWorkload[teacherDayKey] = 0;
        teacherWorkload[teacherDayKey]++;
        if (teacherWorkload[teacherDayKey] > 5) {
            violations.push({ type: 'Teacher Workload', details: teacherDayKey });
        }
        
        const courseKey = `${day}-${course}`;
        if (courseLastScheduled[courseKey] === time) {
            violations.push({ type: 'Course Repetition', details: courseKey });
        }
        courseLastScheduled[courseKey] = time;
        
        if (!courseCount[course]) courseCount[course] = 0;
        courseCount[course]++;
        
        if (course === "Project" || type === "non") {
            if (courseCount[course] > 1) {
                violations.push({ type: 'Course Frequency', details: `${course} > 1` });
            }
        }
        
        if (type === "both" && courseCount[course] > 4) {
            violations.push({ type: 'Course Frequency', details: `${course} > 4` });
        }
        
        if (time === "12:30-01:15") {
            violations.push({ type: 'Lunch Break', details: time });
        }
    });
    
    // Calculate penalty based on violations
    const penaltyWeights = {
        'Teacher Conflict': 0.2,
        'Room Conflict': 0.1,
        'Class Conflict': 0.1,
        'Teacher Workload': 0.08,
        'Course Repetition': 0.05,
        'Course Frequency': 0.07,
        'Lunch Break': 0.06
    };
    
    violations.forEach(violation => {
        fitness -= penaltyWeights[violation.type] || 0.05;
    });
    
    return { 
        score: Math.max(0, fitness),
        violations,
        details: {
            totalViolations: violations.length,
            violationTypes: violations.reduce((acc, v) => {
                acc[v.type] = (acc[v.type] || 0) + 1;
                return acc;
            }, {})
        }
    };
}
function calculateFitness(timetable) {
    return calculateEnhancedFitness(timetable).score;
}
  
module.exports = { calculateEnhancedFitness, calculateFitness };
  