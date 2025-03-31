// validation.js

function validateTimetable(timetable) {
    let teacherSchedule = {};
    let roomSchedule = {};
    let batchSchedule = {};

    timetable.forEach(entry => {
        let key = `${entry.day}-${entry.time}`;
        let teacherKey = `${entry.teacher}-${key}`;
        let roomKey = `${entry.room}-${key}`;
        let batchKey = `${entry.branch_id}-${entry.semester_id}-${key}`;

        // Check if teacher has overlapping classes
        if (teacherSchedule[teacherKey]) {
            throw new Error(`Scheduling Conflict: Teacher ${entry.teacher} has multiple classes at ${entry.time} on ${entry.day}`);
        }
        teacherSchedule[teacherKey] = true;

        // Check if room is double-booked
        if (roomSchedule[roomKey]) {
            throw new Error(`Room Conflict: Room ${entry.room} is double-booked at ${entry.time} on ${entry.day}`);
        }
        roomSchedule[roomKey] = true;

        // Check if a batch has overlapping classes
        if (batchSchedule[batchKey]) {
            throw new Error(`Batch Conflict: Batch ${entry.branch_id} (Semester ${entry.semester_id}) has multiple classes at ${entry.time} on ${entry.day}`);
        }
        batchSchedule[batchKey] = true;
    });

    console.log("✅ Timetable validation passed!");
}

module.exports = { validateTimetable };
