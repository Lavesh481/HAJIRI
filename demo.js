// ...existing code...
const { Client, LocalAuth, Buttons } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const schedule = require('node-schedule');

// Data stores
let attendance = {};
let teachers = {};
let students = {};

// Simple in-memory caches (optional)
const cache = {
    teachers: new Map(),
    students: new Map(),
    attendance: new Map()
};

// Rate limiting
const rateLimit = new Map();
const RATE_LIMIT = 700; // ms

// Awaiting state maps
let awaitingSubject = {};
let awaitingTeacherName = {};
let awaitingStudentName = {};
let awaitingStudentPhone = {};
let awaitingAttendanceStudent = {};

// Persistence
function saveData() {
    try {
        const data = { attendance, teachers, students };
        fs.writeFileSync('attendance.json', JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('saveData error:', err);
        return false;
    }
}

function loadData() {
    try {
        if (fs.existsSync('attendance.json')) {
            const data = JSON.parse(fs.readFileSync('attendance.json', 'utf8'));
            attendance = data.attendance || {};
            teachers = data.teachers || {};
            students = data.students || {};
            cache.teachers = new Map(Object.entries(teachers));
            cache.students = new Map(Object.entries(students));
            cache.attendance = new Map(Object.entries(attendance));
        }
    } catch (err) {
        console.error('loadData error:', err);
    }
}
loadData();

// Helpers
function calcPercent(teacherId, subject) {
    const subjectData = attendance[teacherId]?.[subject] || {};
    let totalPresent = 0, totalAbsent = 0;
    for (const studentId in subjectData) {
        const studentRec = subjectData[studentId] || {};
        const vals = Object.values(studentRec);
        totalPresent += vals.filter(v => v === 'P').length;
        totalAbsent += vals.filter(v => v === 'A').length;
    }
    const total = totalPresent + totalAbsent;
    return total ? ((totalPresent / total) * 100).toFixed(1) : 0;
}

function getTeacherName(id) { return teachers[id]?.name || 'Unknown Teacher'; }
function isTeacher(id) { return !!teachers[id]; }
function getStudentName(id) { return students[id]?.name || 'Unknown Student'; }
function isStudent(id) { return !!students[id]; }
function getStudentsForTeacher(teacherId) {
    return Object.keys(students).filter(sid => students[sid].teacherId === teacherId);
}

// Removal helpers
function removeSubject(teacherId, subject) {
    if (attendance[teacherId] && attendance[teacherId][subject]) {
        delete attendance[teacherId][subject];
        saveData();
        return true;
    }
    return false;
}
function removeStudent(studentId) {
    if (!students[studentId]) return false;
    const teacherId = students[studentId].teacherId;
    delete students[studentId];
    if (attendance[teacherId]) {
        for (const subj of Object.keys(attendance[teacherId])) {
            if (attendance[teacherId][subj][studentId]) delete attendance[teacherId][subj][studentId];
        }
    }
    saveData();
    return true;
}
function removeTeacher(teacherId) {
    if (!teachers[teacherId]) return false;
    delete teachers[teacherId];
    delete attendance[teacherId];
    for (const sid of Object.keys(students)) {
        if (students[sid].teacherId === teacherId) delete students[sid];
    }
    saveData();
    return true;
}

// Messaging helpers
async function sendStudentNotification(studentId, message) {
    try {
        await client.sendMessage(studentId, message);
        return true;
    } catch (err) {
        console.error('sendStudentNotification error:', err);
        return false;
    }
}
async function sendPrivateMessage(userId, message) {
    try {
        await client.sendMessage(userId, message);
        return true;
    } catch (err) {
        console.error('sendPrivateMessage error:', err);
        return false;
    }
}

// Client init
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
        timeout: 60000,
        ignoreHTTPSErrors: true
    }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Scan QR to login');
});
client.on('ready', () => console.log('✅ Bot is ready!'));
client.on('disconnected', reason => console.log('Client disconnected:', reason));
client.on('auth_failure', () => console.log('Auth failed - re-scan QR'));

const initClient = async () => {
    try {
        await client.initialize();
    } catch (err) {
        console.error('client.initialize error:', err);
        setTimeout(initClient, 5000);
    }
};
initClient();

// Single consolidated message handler
client.on('message', async msg => {
    const from = msg.from;
    const textRaw = (msg.body || '').trim();
    const text = textRaw;
    if (!text) return;

    // Rate limit per user
    const now = Date.now();
    const last = rateLimit.get(from) || 0;
    if (now - last < RATE_LIMIT) return;
    rateLimit.set(from, now);

    // Handle button/interactive ids as text fallback
    if (msg.selectedButtonId && !text) {
        // selectedButtonId handled below via msg.selectedButtonId variable
    }

    // Awaiting states
    if (awaitingTeacherName[from]) {
        const teacherName = text;
        teachers[from] = { name: teacherName, registeredAt: new Date().toISOString() };
        attendance[from] = attendance[from] || {};
        saveData();
        awaitingTeacherName[from] = false;
        await client.sendMessage(from, `✅ Registered as teacher: ${teacherName}`);
        return;
    }

    if (awaitingSubject[from]) {
        const subj = text;
        attendance[from] = attendance[from] || {};
        if (!attendance[from][subj]) {
            attendance[from][subj] = {};
            saveData();
            awaitingSubject[from] = false;
            await client.sendMessage(from, `✅ Subject "${subj}" added.`);
        } else {
            awaitingSubject[from] = false;
            await client.sendMessage(from, '⚠️ Subject already exists.');
        }
        return;
    }

    if (awaitingStudentName[from]) {
        const studentName = text;
        awaitingStudentName[from] = false;
        awaitingStudentPhone[from] = { name: studentName };
        await client.sendMessage(from, `Send student's phone with country code, e.g. +919876543210`);
        return;
    }

    if (awaitingStudentPhone[from]) {
        const phone = text.replace(/\D/g, '');
        const studentName = awaitingStudentPhone[from].name;
        const studentId = phone + '@c.us';
        students[studentId] = {
            name: studentName,
            phone,
            teacherId: from,
            registeredAt: new Date().toISOString()
        };
        // ensure student's record exists in each subject
        attendance[from] = attendance[from] || {};
        for (const subj of Object.keys(attendance[from])) {
            attendance[from][subj][studentId] = attendance[from][subj][studentId] || {};
        }
        saveData();
        awaitingStudentPhone[from] = false;
        await client.sendMessage(from, `✅ Student added: ${studentName} (${phone})`);
        return;
    }

    // If teacher selected a subject to mark attendance in individual mode
    if (awaitingAttendanceStudent[from] && awaitingAttendanceStudent[from].expectingSelection) {
        // expecting a number to select a student
        const idx = parseInt(text, 10);
        const { subject, studentList } = awaitingAttendanceStudent[from];
        if (!subject || !studentList) {
            awaitingAttendanceStudent[from] = false;
            return client.sendMessage(from, '❌ Attendance session expired. Start again.');
        }
        if (Number.isNaN(idx) || idx < 1 || idx > studentList.length) {
            return client.sendMessage(from, '❌ Invalid student number.');
        }
        const studentId = studentList[idx - 1];
        awaitingAttendanceStudent[from] = { subject, currentStudent: studentId };
        return client.sendMessage(from, `Send status for ${getStudentName(studentId)}: P (present), A (absent), H (holiday), N (no class)`);
    }

    // Core commands
    if (text === '/start') {
        if (!isTeacher(from)) {
            await sendPrivateMessage(from, `🎓 Welcome! Register as teacher with /register`);
            return client.sendMessage(from, '✅ Instructions sent privately.');
        }
        const name = getTeacherName(from);
        const menu = `👋 Hello ${name}!

1 - Add subject
2 - Manage students
3 - Mark attendance
4 - Reports
5 - View subjects & alerts
6 - Remove subject/student
7 - Delete account

Send number (1-7) to choose.`;
        return client.sendMessage(from, menu);
    }

    if (text === '/register') {
        awaitingTeacherName[from] = true;
        return client.sendMessage(from, 'Send your full name to register as teacher:');
    }

    // Simple numeric menu
    if (text === '1' && isTeacher(from)) {
        awaitingSubject[from] = true;
        return client.sendMessage(from, 'Send the subject name to add:');
    }

    if (text === '2' && isTeacher(from)) {
        const msg = `Student Management:
A - Add student
B - View students`;
        return client.sendMessage(from, msg);
    }
    if ((text === 'A' || text.toLowerCase() === 'a') && isTeacher(from)) {
        awaitingStudentName[from] = true;
        return client.sendMessage(from, 'Send student full name:');
    }
    if ((text === 'B' || text.toLowerCase() === 'b') && isTeacher(from)) {
        const list = getStudentsForTeacher(from);
        if (!list.length) return client.sendMessage(from, 'No students registered.');
        let out = 'Students:\n';
        for (const sid of list) {
            out += `• ${students[sid].name} (${students[sid].phone})\n`;
        }
        return client.sendMessage(from, out);
    }

    if (text === '3' && isTeacher(from)) {
        const subs = Object.keys(attendance[from] || {});
        if (!subs.length) return client.sendMessage(from, 'No subjects. Add one with option 1.');
        let out = 'Select subject:\n';
        subs.forEach((s, i) => out += `${i + 1}. ${s}\n`);
        out += '\nReply with subject.[number] e.g. subject.1';
        return client.sendMessage(from, out);
    }

    if (text.match(/^subject\.\d+$/) && isTeacher(from)) {
        const idx = parseInt(text.split('.')[1], 10) - 1;
        const subs = Object.keys(attendance[from] || {});
        if (idx < 0 || idx >= subs.length) return client.sendMessage(from, 'Invalid subject.');
        const subject = subs[idx];
        const studentList = getStudentsForTeacher(from);
        if (!studentList.length) return client.sendMessage(from, 'No students registered.');
        // Set awaiting to allow selecting student by number
        awaitingAttendanceStudent[from] = { subject, studentList, expectingSelection: true };
        let out = `Mark attendance for ${subject}\n\n`;
        studentList.forEach((sid, i) => out += `${i + 1}. ${getStudentName(sid)}\n`);
        out += '\nReply with the student number.';
        return client.sendMessage(from, out);
    }

    // handle individual status after selecting student
    if (awaitingAttendanceStudent[from] && awaitingAttendanceStudent[from].currentStudent) {
        const status = text.toUpperCase();
        const valid = ['P', 'A', 'H', 'N'];
        if (!valid.includes(status)) return client.sendMessage(from, 'Send one of P/A/H/N');
        const subject = awaitingAttendanceStudent[from].subject;
        const studentId = awaitingAttendanceStudent[from].currentStudent;
        const date = new Date().toISOString().split('T')[0];
        attendance[from] = attendance[from] || {};
        attendance[from][subject] = attendance[from][subject] || {};
        attendance[from][subject][studentId] = attendance[from][subject][studentId] || {};
        attendance[from][subject][studentId][date] = status;
        saveData();
        const notification = `📚 Attendance Update\nSubject: ${subject}\nDate: ${date}\nStatus: ${status}\nTeacher: ${getTeacherName(from)}`;
        await sendStudentNotification(studentId, notification);
        awaitingAttendanceStudent[from] = { subject, studentList: awaitingAttendanceStudent[from].studentList, expectingSelection: true }; // back to selection mode
        return client.sendMessage(from, `Marked ${getStudentName(studentId)} as ${status} for ${subject}`);
    }

    if (text === '4' && isTeacher(from)) {
        const subs = Object.keys(attendance[from] || {});
        if (!subs.length) return client.sendMessage(from, 'No subjects yet.');
        let out = 'Reports:\n';
        subs.forEach((s, i) => out += `${i + 1}. ${s} - ${calcPercent(from, s)}%\n`);
        out += '\nReply with report.[number] to view details';
        return client.sendMessage(from, out);
    }
    if (text.match(/^report\.\d+$/) && isTeacher(from)) {
        const idx = parseInt(text.split('.')[1], 10) - 1;
        const subs = Object.keys(attendance[from] || {});
        if (idx < 0 || idx >= subs.length) return client.sendMessage(from, 'Invalid report.');
        const subject = subs[idx];
        let out = `Report - ${subject}\nOverall: ${calcPercent(from, subject)}%\n\n`;
        const sList = getStudentsForTeacher(from);
        for (const sid of sList) {
            const rec = attendance[from][subject]?.[sid] || {};
            const dates = Object.keys(rec);
            const present = dates.filter(d => rec[d] === 'P').length;
            const absent = dates.filter(d => rec[d] === 'A').length;
            const holiday = dates.filter(d => rec[d] === 'H').length;
            const noclass = dates.filter(d => rec[d] === 'N').length;
            const total = present + absent;
            const pct = total ? ((present / total) * 100).toFixed(1) : 0;
            out += `${getStudentName(sid)}: ${pct}% (P:${present} A:${absent} H:${holiday} N:${noclass})\n`;
        }
        return client.sendMessage(from, out);
    }

    if (text === '5' && isTeacher(from)) {
        let out = `Your subjects:\n`;
        for (const s of Object.keys(attendance[from] || {})) {
            out += `${s}: ${calcPercent(from, s)}%\n`;
        }
        return client.sendMessage(from, out);
    }

    if (text === '6' && isTeacher(from)) {
        return client.sendMessage(from, `Remove:
A - Subject
B - Student
Reply A or B`);
    }
    if (text === 'A' && isTeacher(from)) {
        const subs = Object.keys(attendance[from] || {});
        if (!subs.length) return client.sendMessage(from, 'No subjects.');
        let out = 'Subjects:\n';
        subs.forEach((s, i) => out += `${i + 1}. ${s}\n`);
        out += '\nReply remove.subject.[number]';
        return client.sendMessage(from, out);
    }
    if (text.match(/^remove\.subject\.\d+$/) && isTeacher(from)) {
        const idx = parseInt(text.split('.')[2], 10) - 1;
        const subs = Object.keys(attendance[from] || {});
        if (idx < 0 || idx >= subs.length) return client.sendMessage(from, 'Invalid subject number.');
        const subject = subs[idx];
        removeSubject(from, subject);
        return client.sendMessage(from, `Removed subject "${subject}"`);
    }
    if (text === 'B' && isTeacher(from)) {
        const list = getStudentsForTeacher(from);
        if (!list.length) return client.sendMessage(from, 'No students.');
        let out = 'Students:\n';
        list.forEach((sid, i) => out += `${i + 1}. ${students[sid].name}\n`);
        out += '\nReply remove.student.[number]';
        return client.sendMessage(from, out);
    }
    if (text.match(/^remove\.student\.\d+$/) && isTeacher(from)) {
        const idx = parseInt(text.split('.')[2], 10) - 1;
        const list = getStudentsForTeacher(from);
        if (idx < 0 || idx >= list.length) return client.sendMessage(from, 'Invalid student number.');
        const sid = list[idx];
        removeStudent(sid);
        return client.sendMessage(from, `Removed student ${getStudentName(sid)}`);
    }

    if (text === '7' && isTeacher(from)) {
        return client.sendMessage(from, 'To delete account permanently send: confirm.delete.account');
    }
    if (text === 'confirm.delete.account' && isTeacher(from)) {
        removeTeacher(from);
        return client.sendMessage(from, 'Your account and all related data were removed.');
    }

    // Student viewing own attendance
    if (text === '/myattendance' && isStudent(from)) {
        const s = students[from];
        const tid = s.teacherId;
        let out = `Attendance for ${s.name}\nTeacher: ${getTeacherName(tid)}\n\n`;
        for (const subj of Object.keys(attendance[tid] || {})) {
            const rec = attendance[tid][subj][from] || {};
            const dates = Object.keys(rec);
            const present = dates.filter(d => rec[d] === 'P').length;
            const absent = dates.filter(d => rec[d] === 'A').length;
            const holiday = dates.filter(d => rec[d] === 'H').length;
            const noclass = dates.filter(d => rec[d] === 'N').length;
            const total = present + absent;
            const pct = total ? ((present / total) * 100).toFixed(1) : 0;
            out += `${subj}: ${pct}% (P:${present} A:${absent} H:${holiday} N:${noclass})\n`;
        }
        return client.sendMessage(from, out);
    }

    // Fallback: unknown command
    return client.sendMessage(from, 'Unknown command. Send /start for menu or /help for instructions.');
});
// ...existing code...