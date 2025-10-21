const { Client, LocalAuth, Buttons } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
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
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--no-first-run',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-domain-reliability',
            '--disable-features=AudioServiceOutOfProcess',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-notifications',
            '--disable-offer-store-unmasked-wallet-cards',
            '--disable-popup-blocking',
            '--disable-print-preview',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-speech-api',
            '--disable-sync',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-pings',
            '--password-store=basic',
            '--use-gl=swiftshader',
            '--use-mock-keychain',
            '--disable-accelerated-2d-canvas',
            '--disable-web-security',
            '--user-data-dir=/tmp/chromium-user-data'
        ],
        timeout: 60000,
        ignoreHTTPSErrors: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    }
});

let qrDisplayed = false;
client.on('qr', async (qr) => {
    console.clear(); // Clear previous QR codes
    
    // Save QR code as image file
    try {
        await QRCode.toFile('whatsapp-qr.png', qr, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        console.log('\n✅ QR Code saved as: whatsapp-qr.png');
        console.log('📱 Open the file and scan with WhatsApp on your phone\n');
    } catch (err) {
        console.error('Error saving QR code:', err);
    }
    
    // Also display in terminal
    console.log('📱 WhatsApp QR Code (Terminal view):\n');
    qrcodeTerminal.generate(qr, { small: true });
    console.log('\n⏳ QR code refreshes every ~20 seconds if not scanned');
    console.log('💡 Tip: Open whatsapp-qr.png file for a clearer image\n');
    qrDisplayed = true;
});
client.on('ready', () => {
    console.log('✅ Bot is ready!');
    console.log('Waiting for messages...');
});
client.on('disconnected', reason => console.log('Client disconnected:', reason));
client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
});

let initAttempts = 0;
const initClient = async () => {
    try {
        console.log('🚀 Initializing WhatsApp client...');
        await client.initialize();
    } catch (err) {
        initAttempts++;
        console.error(`❌ Initialization failed (attempt ${initAttempts}):`, err.message);
        
        // Exponential backoff: wait longer between retries
        const waitTime = Math.min(5000 * initAttempts, 30000);
        console.log(`⏳ Retrying in ${waitTime/1000} seconds...`);
        setTimeout(initClient, waitTime);
    }
};
initClient();

// Single consolidated message handler
client.on('message', async msg => {
    // Add debug logs at start of message handler
    console.log('Message received:', {
        from: msg.from,
        body: msg.body,
        isGroup: msg.isGroup,
        hasMedia: msg.hasMedia,
        type: msg.type
    });

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
        // Auto-return to menu
        const name = getTeacherName(from);
        const menu = `🎓 *Welcome ${name}!*\n\nChoose an option:\n\n1️⃣ 📚 Add Subject\n2️⃣ 👥 Manage Students\n3️⃣ ✅ Mark Attendance\n4️⃣ 📊 View Reports\n5️⃣ 📋 Subject Overview\n6️⃣ ❌ Remove Data\n7️⃣ 🗑️ Delete Account\n\n📌 *Quick Commands:*\n📝 /register - Register as teacher\n📊 /reports - View all reports\n🔙 /menu - Return to main menu\n❓ /help - Show help menu\n\nSend number (1-7) to choose.`;
        await client.sendMessage(from, menu);
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
        // Auto-return to menu
        const name = getTeacherName(from);
        const menu = `🎓 *Welcome ${name}!*\n\nChoose an option:\n\n1️⃣ 📚 Add Subject\n2️⃣ 👥 Manage Students\n3️⃣ ✅ Mark Attendance\n4️⃣ 📊 View Reports\n5️⃣ 📋 Subject Overview\n6️⃣ ❌ Remove Data\n7️⃣ 🗑️ Delete Account\n\n📌 *Quick Commands:*\n📝 /register - Register as teacher\n📊 /reports - View all reports\n🔙 /menu - Return to main menu\n❓ /help - Show help menu\n\nSend number (1-7) to choose.`;
        await client.sendMessage(from, menu);
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

    // Quick navigation commands
    if (text === '/menu' || text === '/back') {
        // Clear all awaiting states
        awaitingSubject[from] = false;
        awaitingTeacherName[from] = false;
        awaitingStudentName[from] = false;
        awaitingStudentPhone[from] = false;
        awaitingAttendanceStudent[from] = false;
        
        if (!isTeacher(from)) {
            return client.sendMessage(from, '⚠️ Please register first using /register');
        }
        
        const name = getTeacherName(from);
        const menu = `🎓 *Welcome ${name}!*

Choose an option:

1️⃣ 📚 Add Subject
2️⃣ 👥 Manage Students
3️⃣ ✅ Mark Attendance
4️⃣ 📊 View Reports
5️⃣ 📋 Subject Overview
6️⃣ ❌ Remove Data
7️⃣ 🗑️ Delete Account

📌 *Quick Commands:*
📝 /register - Register as teacher
📊 /reports - View all reports
🔙 /menu - Return to main menu
❓ /help - Show help menu

Send number (1-7) to choose.`;
        return client.sendMessage(from, menu);
    }

    // Core commands
    if (text === '/start') {
        if (!isTeacher(from)) {
            await sendPrivateMessage(from, `🎓 *Welcome to Hajiri - Attendance Bot!*

📝 Register as teacher:
➡️ Send: /register

Need help?
❓ Send: /help`);
            return client.sendMessage(from, '✅ Instructions sent privately.');
        }
        const name = getTeacherName(from);
        const menu = `🎓 *Welcome ${name}!*

Choose an option:

1️⃣ 📚 Add Subject
2️⃣ 👥 Manage Students
3️⃣ ✅ Mark Attendance
4️⃣ 📊 View Reports
5️⃣ 📋 Subject Overview
6️⃣ ❌ Remove Data
7️⃣ 🗑️ Delete Account

📌 *Quick Commands:*
📝 /register - Register as teacher
📊 /reports - View all reports
🔙 /menu - Return to main menu
❓ /help - Show help menu

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
        return client.sendMessage(from, '📚 *Add Subject*\n\nSend the subject name to add:\n🔙 Type /menu to cancel');
    }

    if (text === '2' && isTeacher(from)) {
        const msg = `👥 *Student Management*

Choose an option:

*A* 📝 Add New Student
*B* 📋 View All Students
*C* 🔍 Search Student
*D* 📊 Student Reports

Reply with A, B, C or D
🔙 Type /menu to return to main menu`;
        return client.sendMessage(from, msg);
    }
    if ((text === 'A' || text.toLowerCase() === 'a') && isTeacher(from)) {
        awaitingStudentName[from] = true;
        return client.sendMessage(from, '📝 *Add New Student*\n\nSend student full name:\n🔙 Type /menu to cancel');
    }
    if ((text === 'B' || text.toLowerCase() === 'b') && isTeacher(from)) {
        const list = getStudentsForTeacher(from);
        if (!list.length) return client.sendMessage(from, 'No students registered.');
        let out = '📋 *All Students*\n\n';
        for (const sid of list) {
            out += `• ${students[sid].name} (${students[sid].phone})\n`;
        }
        await client.sendMessage(from, out);
        // Auto-return to menu
        const name = getTeacherName(from);
        const menu = `🎓 *Welcome ${name}!*\n\nChoose an option:\n\n1️⃣ 📚 Add Subject\n2️⃣ 👥 Manage Students\n3️⃣ ✅ Mark Attendance\n4️⃣ 📊 View Reports\n5️⃣ 📋 Subject Overview\n6️⃣ ❌ Remove Data\n7️⃣ 🗑️ Delete Account\n\n📌 *Quick Commands:*\n📝 /register - Register as teacher\n📊 /reports - View all reports\n🔙 /menu - Return to main menu\n❓ /help - Show help menu\n\nSend number (1-7) to choose.`;
        return client.sendMessage(from, menu);
    }
    if ((text === 'C' || text.toLowerCase() === 'c') && isTeacher(from)) {
        return client.sendMessage(from, '🔍 *Search Student*\n\nSend student name or phone number to search:\n🔙 Type /menu to cancel');
    }
    if ((text === 'D' || text.toLowerCase() === 'd') && isTeacher(from)) {
        const list = getStudentsForTeacher(from);
        if (!list.length) return client.sendMessage(from, 'No students registered.');
        let out = '📊 *Student Reports*\n\nSelect a student:\n';
        list.forEach((sid, i) => out += `${i + 1}. ${students[sid].name}\n`);
        out += '\n📌 Reply format: student.report.[number]\n🔙 Type /menu to return to main menu';
        return client.sendMessage(from, out);
    }
    if (text.match(/^student\.report\.\d+$/) && isTeacher(from)) {
        const idx = parseInt(text.split('.')[2], 10) - 1;
        const list = getStudentsForTeacher(from);
        if (idx < 0 || idx >= list.length) return client.sendMessage(from, 'Invalid student number.');
        const studentId = list[idx];
        const studentName = getStudentName(studentId);
        let out = `📊 *Report for ${studentName}*\n\n`;
        const subs = Object.keys(attendance[from] || {});
        for (const subj of subs) {
            const rec = attendance[from][subj]?.[studentId] || {};
            const dates = Object.keys(rec);
            const present = dates.filter(d => rec[d] === 'P').length;
            const absent = dates.filter(d => rec[d] === 'A').length;
            const holiday = dates.filter(d => rec[d] === 'H').length;
            const noclass = dates.filter(d => rec[d] === 'N').length;
            const total = present + absent;
            const pct = total ? ((present / total) * 100).toFixed(1) : 0;
            out += `📚 *${subj}*\n`;
            out += `   ✅ Present: ${present}\n`;
            out += `   ❌ Absent: ${absent}\n`;
            out += `   🌟 Holiday: ${holiday}\n`;
            out += `   📅 No Class: ${noclass}\n`;
            out += `   📊 Percentage: ${pct}%\n\n`;
        }
        return client.sendMessage(from, out);
    }

    if (text === '3' && isTeacher(from)) {
        const subs = Object.keys(attendance[from] || {});
        if (!subs.length) return client.sendMessage(from, '❌ No subjects found. Add subjects first using option 1️⃣');
        let out = `📝 *Mark Attendance*\n\n*Select Subject:*\n`;
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        subs.forEach((s, i) => {
            if (i < letters.length) {
                out += `*3${letters[i]}* ${s}\n`;
            }
        });
        out += `\n📌 Reply with 3A, 3B, 3C...
✨ *Quick Options:*
• bulk P - Mark all Present
• bulk A - Mark all Absent
• bulk H - Mark Holiday
• bulk N - No Class
🔙 Type /menu to return to main menu`;
        return client.sendMessage(from, out);
    }

    // Handle subject selection for attendance (3A, 3B, etc.)
    if (text.match(/^3[A-Z]$/i) && isTeacher(from)) {
        const letter = text.charAt(1).toUpperCase();
        const subs = Object.keys(attendance[from] || {});
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const idx = letters.indexOf(letter);
        if (idx >= 0 && idx < subs.length) {
            const subject = subs[idx];
            const studentList = getStudentsForTeacher(from);
            if (!studentList.length) return client.sendMessage(from, 'No students registered.');
            // Set awaiting to allow selecting student by number
            awaitingAttendanceStudent[from] = { subject, studentList, expectingSelection: true };
            let out = `📝 *Mark attendance for ${subject}*\n\n`;
            studentList.forEach((sid, i) => out += `${i + 1}. ${getStudentName(sid)}\n`);
            out += '\n📌 Reply with the student number.';
            return client.sendMessage(from, out);
        }
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
        if (!subs.length) return client.sendMessage(from, '❌ No subjects yet.');
        let out = `📊 *Attendance Reports*\n\n*Select Subject:*\n`;
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        subs.forEach((s, i) => {
            if (i < letters.length) {
                out += `*4${letters[i]}* ${s} - ${calcPercent(from, s)}%\n`;
            }
        });
        out += `\n📌 Reply with 4A, 4B, 4C...
📊 Overall class performance
🎯 Subject-wise breakdown
📅 Daily attendance logs
🔙 Type /menu to return to main menu`;
        return client.sendMessage(from, out);
    }
    if (text.match(/^4[A-Z]$/i) && isTeacher(from)) {
        const letter = text.charAt(1).toUpperCase();
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const idx = letters.indexOf(letter);
        const subs = Object.keys(attendance[from] || {});
        if (idx < 0 || idx >= subs.length) return client.sendMessage(from, 'Invalid report.');
        const subject = subs[idx];
        let out = `📊 *Report - ${subject}*\nOverall: ${calcPercent(from, subject)}%\n\n`;
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
        let out = `📋 *Subject Overview*\n\n`;
        for (const s of Object.keys(attendance[from] || {})) {
            out += `• ${s}: ${calcPercent(from, s)}%\n`;
        }
        await client.sendMessage(from, out);
        // Auto-return to menu
        const name = getTeacherName(from);
        const menu = `🎓 *Welcome ${name}!*\n\nChoose an option:\n\n1️⃣ 📚 Add Subject\n2️⃣ 👥 Manage Students\n3️⃣ ✅ Mark Attendance\n4️⃣ 📊 View Reports\n5️⃣ 📋 Subject Overview\n6️⃣ ❌ Remove Data\n7️⃣ 🗑️ Delete Account\n\n📌 *Quick Commands:*\n📝 /register - Register as teacher\n📊 /reports - View all reports\n🔙 /menu - Return to main menu\n❓ /help - Show help menu\n\nSend number (1-7) to choose.`;
        return client.sendMessage(from, menu);
    }

    if (text === '6' && isTeacher(from)) {
        return client.sendMessage(from, `❌ *Remove Data*\n\nChoose an option:\n\n*6A* 📚 Remove Subject\n*6B* 👤 Remove Student\n\nReply with 6A or 6B\n🔙 Type /menu to return to main menu`);
    }
    if ((text === '6A' || text === '6a') && isTeacher(from)) {
        const subs = Object.keys(attendance[from] || {});
        if (!subs.length) return client.sendMessage(from, 'No subjects.');
        let out = '📚 *Remove Subject*\n\nYour subjects:\n';
        subs.forEach((s, i) => out += `${i + 1}. ${s}\n`);
        out += '\n📌 Reply format: remove.subject.[number]\n🔙 Type /menu to cancel';
        return client.sendMessage(from, out);
    }
    if (text.match(/^remove\.subject\.\d+$/) && isTeacher(from)) {
        const idx = parseInt(text.split('.')[2], 10) - 1;
        const subs = Object.keys(attendance[from] || {});
        if (idx < 0 || idx >= subs.length) return client.sendMessage(from, 'Invalid subject number.');
        const subject = subs[idx];
        removeSubject(from, subject);
        await client.sendMessage(from, `✅ Removed subject "${subject}"`);
        // Auto-return to menu
        const name = getTeacherName(from);
        const menu = `🎓 *Welcome ${name}!*\n\nChoose an option:\n\n1️⃣ 📚 Add Subject\n2️⃣ 👥 Manage Students\n3️⃣ ✅ Mark Attendance\n4️⃣ 📊 View Reports\n5️⃣ 📋 Subject Overview\n6️⃣ ❌ Remove Data\n7️⃣ 🗑️ Delete Account\n\n📌 *Quick Commands:*\n📝 /register - Register as teacher\n📊 /reports - View all reports\n🔙 /menu - Return to main menu\n❓ /help - Show help menu\n\nSend number (1-7) to choose.`;
        return client.sendMessage(from, menu);
    }
    if ((text === '6B' || text === '6b') && isTeacher(from)) {
        const list = getStudentsForTeacher(from);
        if (!list.length) return client.sendMessage(from, 'No students.');
        let out = '👤 *Remove Student*\n\nYour students:\n';
        list.forEach((sid, i) => out += `${i + 1}. ${students[sid].name}\n`);
        out += '\n📌 Reply format: remove.student.[number]\n🔙 Type /menu to cancel';
        return client.sendMessage(from, out);
    }
    if (text.match(/^remove\.student\.\d+$/) && isTeacher(from)) {
        const idx = parseInt(text.split('.')[2], 10) - 1;
        const list = getStudentsForTeacher(from);
        if (idx < 0 || idx >= list.length) return client.sendMessage(from, 'Invalid student number.');
        const sid = list[idx];
        const studentName = getStudentName(sid);
        removeStudent(sid);
        await client.sendMessage(from, `✅ Removed student ${studentName}`);
        // Auto-return to menu
        const name = getTeacherName(from);
        const menu = `🎓 *Welcome ${name}!*\n\nChoose an option:\n\n1️⃣ 📚 Add Subject\n2️⃣ 👥 Manage Students\n3️⃣ ✅ Mark Attendance\n4️⃣ 📊 View Reports\n5️⃣ 📋 Subject Overview\n6️⃣ ❌ Remove Data\n7️⃣ 🗑️ Delete Account\n\n📌 *Quick Commands:*\n📝 /register - Register as teacher\n📊 /reports - View all reports\n🔙 /menu - Return to main menu\n❓ /help - Show help menu\n\nSend number (1-7) to choose.`;
        return client.sendMessage(from, menu);
    }

    if (text === '7' && isTeacher(from)) {
        return client.sendMessage(from, 'To delete account permanently send: confirm.delete.account');
    }
    if (text === 'confirm.delete.account' && isTeacher(from)) {
        removeTeacher(from);
        return client.sendMessage(from, 'Your account and all related data were removed.');
    }

    // Teacher quick command: /reports
    if (text === '/reports' && isTeacher(from)) {
        const subs = Object.keys(attendance[from] || {});
        if (!subs.length) return client.sendMessage(from, '❌ No subjects yet.');
        let out = `📊 *Attendance Reports*\n\n*Select Subject:*\n`;
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        subs.forEach((s, i) => {
            if (i < letters.length) {
                out += `*4${letters[i]}* ${s} - ${calcPercent(from, s)}%\n`;
            }
        });
        out += `\n📌 Reply with 4A, 4B, 4C...\n📊 Overall class performance\n🎯 Subject-wise breakdown\n📅 Daily attendance logs\n🔙 Type /menu to return to main menu`;
        return client.sendMessage(from, out);
    }

    // Student viewing own attendance
    if (text === '/myattendance' && isStudent(from)) {
        const s = students[from];
        const tid = s.teacherId;
        let out = `📊 *Attendance Report*\n`;
        out += `👤 Student: ${s.name}\n`;
        out += `👨‍🏫 Teacher: ${getTeacherName(tid)}\n\n`;
        for (const subj of Object.keys(attendance[tid] || {})) {
            const rec = attendance[tid][subj][from] || {};
            const dates = Object.keys(rec);
            const present = dates.filter(d => rec[d] === 'P').length;
            const absent = dates.filter(d => rec[d] === 'A').length;
            const total = present + absent;
            const pct = total ? ((present / total) * 100).toFixed(1) : 0;
            out += `📚 *${subj}*\n`;
            out += `✅ Present: ${present}\n`;
            out += `❌ Absent: ${absent}\n`;
            out += `📊 Percentage: ${pct}%\n\n`;
        }
        return client.sendMessage(from, out);
    }

    // Student command: /today
    if (text === '/today' && isStudent(from)) {
        const s = students[from];
        const tid = s.teacherId;
        const today = new Date().toISOString().split('T')[0];
        let out = `📅 *Today's Attendance (${today})*\n`;
        out += `👤 Student: ${s.name}\n\n`;
        let hasData = false;
        for (const subj of Object.keys(attendance[tid] || {})) {
            const rec = attendance[tid][subj][from] || {};
            if (rec[today]) {
                hasData = true;
                const status = rec[today];
                const emoji = status === 'P' ? '✅' : status === 'A' ? '❌' : status === 'H' ? '🌟' : '📅';
                const statusText = status === 'P' ? 'Present' : status === 'A' ? 'Absent' : status === 'H' ? 'Holiday' : 'No Class';
                out += `📚 ${subj}: ${emoji} ${statusText}\n`;
            }
        }
        if (!hasData) {
            out += '⚠️ No attendance marked for today yet.';
        }
        return client.sendMessage(from, out);
    }

    // Student command: /percentage
    if (text === '/percentage' && isStudent(from)) {
        const s = students[from];
        const tid = s.teacherId;
        let out = `📊 *Overall Percentage*\n`;
        out += `👤 Student: ${s.name}\n\n`;
        let totalPresent = 0, totalAbsent = 0;
        for (const subj of Object.keys(attendance[tid] || {})) {
            const rec = attendance[tid][subj][from] || {};
            const dates = Object.keys(rec);
            const present = dates.filter(d => rec[d] === 'P').length;
            const absent = dates.filter(d => rec[d] === 'A').length;
            totalPresent += present;
            totalAbsent += absent;
            const total = present + absent;
            const pct = total ? ((present / total) * 100).toFixed(1) : 0;
            out += `📚 ${subj}: ${pct}%\n`;
        }
        const grandTotal = totalPresent + totalAbsent;
        const overallPct = grandTotal ? ((totalPresent / grandTotal) * 100).toFixed(1) : 0;
        out += `\n🎯 *Overall: ${overallPct}%*\n`;
        out += `✅ Total Present: ${totalPresent}\n`;
        out += `❌ Total Absent: ${totalAbsent}`;
        return client.sendMessage(from, out);
    }

    // Add a help command
    if (text === '/help') {
        const helpText = `🔰 *Hajiri Bot Help*

*Teacher Commands:*
📝 /register - Register as teacher
📚 /start - Show main menu
📊 /reports - View reports
🔙 /menu or /back - Return to menu
❌ Cancel any operation

*Student Commands:*
📊 /myattendance - Check attendance
📅 /today - Today's attendance
📈 /percentage - Overall percentage

*Attendance Marking:*
P - Present ✅
A - Absent ❌
H - Holiday 🌟
N - No Class 📅

Need more help? Contact admin.`;
        return client.sendMessage(from, helpText);
    }

    // Fallback: unknown command
    return client.sendMessage(from, 'Unknown command. Send /start for menu or /help for instructions.');
});

// Add error handler
client.on('error', (err) => {
    console.error('Client error:', err);
});