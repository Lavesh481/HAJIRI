const { Client, LocalAuth, Buttons } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const schedule = require('node-schedule');
const http = require('http');

// Load or initialize attendance data
let attendance = {};
let teachers = {}; // Store teacher information
let students = {}; // Store student information
if(fs.existsSync('attendance.json')){
    const data = JSON.parse(fs.readFileSync('attendance.json', 'utf-8'));
    attendance = data.attendance || {};
    teachers = data.teachers || {};
    students = data.students || {};
}
function saveData(){
    fs.writeFileSync('attendance.json', JSON.stringify({attendance, teachers, students}, null, 2));
}

// Calculate percentage for a specific teacher's subject
function calcPercent(teacherId, subject){
    const subjectData = attendance[teacherId]?.[subject] || {};
    let totalPresent = 0;
    let totalAbsent = 0;
    
    // Check if this is individual student attendance or general attendance
    const firstKey = Object.keys(subjectData)[0];
    if(firstKey && firstKey.includes('@c.us')){
        // Individual student attendance
        for(let studentId in subjectData){
            const studentAttendance = subjectData[studentId];
            const vals = Object.values(studentAttendance);
            totalPresent += vals.filter(v => v === 'P').length;
            totalAbsent += vals.filter(v => v === 'A').length;
        }
    } else {
        // General attendance (old system)
        const vals = Object.values(subjectData);
        totalPresent = vals.filter(v => v === 'P').length;
        totalAbsent = vals.filter(v => v === 'A').length;
    }
    
    const total = totalPresent + totalAbsent;
    return total ? ((totalPresent/total)*100).toFixed(1) : 0;
}

// Get teacher name from ID
function getTeacherName(teacherId){
    return teachers[teacherId]?.name || 'Unknown Teacher';
}

// Check if user is a registered teacher
function isTeacher(userId){
    return teachers.hasOwnProperty(userId);
}

// Get student name from ID
function getStudentName(studentId){
    return students[studentId]?.name || 'Unknown Student';
}

// Check if user is a registered student
function isStudent(userId){
    return students.hasOwnProperty(userId);
}

// Get students for a specific teacher
function getStudentsForTeacher(teacherId){
    return Object.keys(students).filter(studentId => 
        students[studentId].teacherId === teacherId
    );
}

// Send notification to student
async function sendStudentNotification(studentId, message){
    try {
        await client.sendMessage(studentId, message);
        return true;
    } catch (error) {
        console.error(`Failed to send notification to ${studentId}:`, error);
        return false;
    }
}

// Start client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true, 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Scan this QR with WhatsApp to log in.');
});

client.on('ready', () => {
    console.log('✅ Bot is ready!');
});

const BOT_GROUP_ID =  '120363420628239379@g.us'; // replace after setup
let awaitingSubject = {};
let awaitingTeacherName = {};
let awaitingStudentName = {};
let awaitingStudentPhone = {};
let awaitingAttendanceSubject = {};
let awaitingAttendanceStudent = {};

client.on('message', async msg => {
    const from = msg.from;
    const text = msg.body.trim();

    // Only respond inside your bot group
    if(from !== BOT_GROUP_ID) return;

    // Await teacher name for registration
    if(awaitingTeacherName[from]){
        const teacherName = text;
        teachers[from] = { name: teacherName, registeredAt: new Date().toISOString() };
        attendance[from] = {}; // Initialize teacher's attendance data
        saveData();
        msg.reply(`✅ Welcome ${teacherName}! You are now registered as a teacher.`);
        awaitingTeacherName[from] = false;
        return;
    }

    // Await subject name
    if(awaitingSubject[from]){
        const subj = text;
        if(!attendance[from][subj]){
            attendance[from][subj] = {};
            saveData();
            msg.reply(`✅ Subject "${subj}" added to your classes!`);
        } else {
            msg.reply('⚠️ You already have this subject.');
        }
        awaitingSubject[from] = false;
        return;
    }

    // Await student name for registration
    if(awaitingStudentName[from]){
        const studentName = text;
        awaitingStudentName[from] = false;
        awaitingStudentPhone[from] = { name: studentName };
        msg.reply(`📱 Student Phone Number

Please send the student's WhatsApp number.

Examples:
• +1234567890
• +919876543210
• +447123456789

💡 Important:
• Include the country code (+)
• Make sure the student has WhatsApp
• The student will receive attendance notifications!`);
        return;
    }

    // Await student phone number
    if(awaitingStudentPhone[from]){
        const phoneNumber = text.replace(/\D/g, ''); // Remove non-digits
        const studentName = awaitingStudentPhone[from].name;
        
        // Create student ID (phone number with @c.us)
        const studentId = phoneNumber + '@c.us';
        
        students[studentId] = {
            name: studentName,
            phone: phoneNumber,
            teacherId: from,
            registeredAt: new Date().toISOString()
        };
        
        // Initialize student's attendance data
        if(!attendance[from]) attendance[from] = {};
        for(let subject in attendance[from]){
            if(!attendance[from][subject][studentId]){
                attendance[from][subject][studentId] = {};
            }
        }
        
        saveData();
        msg.reply(`✅ Great! Student "${studentName}" has been added successfully!

📱 Phone: ${phoneNumber}
👨‍🏫 Teacher: ${getTeacherName(from)}

The student will now receive attendance notifications on their WhatsApp!`);
        awaitingStudentPhone[from] = false;
        return;
    }

    // Await subject selection for individual attendance
    if(awaitingAttendanceSubject[from]){
        // Only teachers can mark attendance
        if(!isTeacher(from)){
            msg.reply('❌ Only registered teachers can mark attendance. Please register first using /register');
            awaitingAttendanceSubject[from] = false;
            return;
        }
        
        const subject = text;
        if(!attendance[from][subject]){
            msg.reply('⚠️ Subject not found. Please add the subject first.');
            awaitingAttendanceSubject[from] = false;
            return;
        }
        
        const studentList = getStudentsForTeacher(from);
        if(studentList.length === 0){
            msg.reply('⚠️ No students registered yet. Add students first.');
            awaitingAttendanceSubject[from] = false;
            return;
        }
        
        awaitingAttendanceSubject[from] = false;
        awaitingAttendanceStudent[from] = { subject: subject };
        
        let studentListMsg = `👥 Choose Student for ${subject}

Select a student to mark attendance:

`;
        let index = 1;
        for(let studentId of studentList){
            const studentName = getStudentName(studentId);
            studentListMsg += `${index} - ${studentName}\n`;
            index++;
        }
        studentListMsg += `\nType the number (1, 2, 3, etc.) to select a student.`;
        msg.reply(studentListMsg);
        return;
    }

    if(text === '/start'){
        if(!isTeacher(from)){
            msg.reply(`🎓 Welcome to Attendance Bot!

This bot helps teachers manage student attendance easily.

📝 To get started, send: /register

Then follow these steps:
1️⃣ Register as a teacher
2️⃣ Add your subjects
3️⃣ Add your students
4️⃣ Start marking attendance!

💡 Need help? Send: /help`);
            return;
        }

        const teacherName = getTeacherName(from);
        msg.reply(`👋 Hello ${teacherName}!

What would you like to do today?

📚 1 - Add a new subject
👥 2 - Manage students  
✅ 3 - Mark student attendance
📊 4 - Check attendance reports
⚙️ 5 - View all subjects & alerts

Just type the number (1, 2, 3, 4, or 5) to choose!

💡 Send /help for detailed instructions`);
        return;
    }

    // Help command
    if(text === '/help'){
        if(!isTeacher(from)){
            msg.reply(`📚 Attendance Bot Help

🎯 Getting Started:
1. Send /register to register as a teacher
2. Add your subjects using option 1
3. Add students using option 2
4. Mark attendance using option 3

📋 Main Commands:
• /start - Main menu
• /register - Register as teacher
• /help - Show this help

💡 After registration, use numbers 1-5 for quick access!`);
            return;
        }

        msg.reply(`📚 Attendance Bot Help

🎯 Main Menu Options:
1️⃣ Add Subject - Add new subjects to track
2️⃣ Manage Students - Add/view students
3️⃣ Mark Attendance - Record student attendance
4️⃣ Check Reports - View attendance reports
5️⃣ View All - See all subjects and alerts

📋 Quick Commands:
• /start - Main menu
• /add - Add subject
• /students - Student management
• /mark - Mark attendance
• /view - View subjects
• /alert - Check low attendance

👥 Student Management:
• Type 2, then A to add student
• Type 2, then B to view students

✅ Marking Attendance:
• Type 3, then select subject
• Use student.X P/A/H/N format
• Or use "bulk" for all students

💡 Need more help? Contact your admin!`);
        return;
    }

    // Teacher registration command
    if(text === '/register'){
        awaitingTeacherName[from] = true;
        msg.reply(`👨‍🏫 Teacher Registration

Please send your full name to register as a teacher.

Example: Dr. John Smith

💡 After registration, you can:
• Add subjects
• Add students  
• Mark attendance
• View reports`);
        return;
    }

    // Number-based menu system for teachers
    if(text === '1' && isTeacher(from)){
        awaitingSubject[from] = true;
        msg.reply(`📚 Add New Subject

Please send the name of the subject you want to add.

Examples:
• Mathematics
• Physics
• Chemistry
• English
• History

💡 You can add multiple subjects. Each subject will track attendance separately.`);
        return;
    }

    if(text === '2' && isTeacher(from)){
        msg.reply(`👥 Student Management

What would you like to do?

➕ A - Add a new student
📋 B - View all students

Type A or B to choose!

💡 Students will receive attendance notifications on their WhatsApp!`);
        return;
    }

    if(text === '2a' && isTeacher(from)){
        awaitingStudentName[from] = true;
        msg.reply(`👤 Add New Student

Please send the student's full name.

Example: John Doe

💡 Make sure the student has WhatsApp and their phone number is correct!`);
        return;
    }

    if(text === '2b' && isTeacher(from)){
        const studentList = getStudentsForTeacher(from);
        let studentMsg = '👥 Your Students:\n\n';
        if(studentList.length === 0){
            studentMsg += 'No students registered yet.';
        } else {
            for(let studentId of studentList){
                const student = students[studentId];
                studentMsg += `• ${student.name} (${student.phone})\n`;
            }
        }
        msg.reply(studentMsg);
        return;
    }

    if(text === '3' && isTeacher(from)){
        if(Object.keys(attendance[from] || {}).length === 0) return msg.reply('❌ No subjects added yet. Please add subjects first using option 1.');
        
        let subjectList = `📚 Choose Subject for Attendance

Select a subject:

`;
        let index = 1;
        for(let subject in attendance[from]){
            subjectList += `${index}. ${subject}: Send "subject.${index}"\n`;
            index++;
        }
        subjectList += `\nExamples:\n`;
        subjectList += `• Send "subject.1" to select the first subject\n`;
        subjectList += `• Send "subject.2" to select the second subject\n`;
        subjectList += `• Send "subject.3" to select the third subject\n\n`;
        subjectList += `💡 After selecting a subject, you can mark attendance for each student individually or use "bulk" for all students at once!`;
        msg.reply(subjectList);
        return;
    }

    // Handle subject selection for list-based attendance (only when not in attendance mode)
    if(text.match(/^subject\.\d+$/) && !awaitingAttendanceStudent[from] && isTeacher(from)){
        const subjectIndex = parseInt(text.split('.')[1]) - 1;
        const subjects = Object.keys(attendance[from] || {});
        if(subjectIndex >= 0 && subjectIndex < subjects.length){
            const subject = subjects[subjectIndex];
            const studentList = getStudentsForTeacher(from);
            
            if(studentList.length === 0){
                msg.reply('⚠️ No students registered yet. Add students first using option 2.');
                return;
            }
            
            // Create attendance list for all students
            let attendanceList = `📋 Attendance List - ${subject}

Mark attendance for each student:

`;
            
            let index = 1;
            for(let studentId of studentList){
                const studentName = getStudentName(studentId);
                attendanceList += `${index}. ${studentName}\n`;
                attendanceList += `   🟢 P - Present  🔴 A - Absent  🟡 H - Holiday  📚 N - No Class\n\n`;
                index++;
            }
            
            attendanceList += `📝 To mark attendance, send:\n`;
            attendanceList += `"student.[number] [P/A/H/N]"\n\n`;
            attendanceList += `Examples:\n`;
            attendanceList += `• "student.1 P" - Mark student 1 as Present\n`;
            attendanceList += `• "student.2 A" - Mark student 2 as Absent\n`;
            attendanceList += `• "student.3 H" - Mark student 3 as Holiday\n`;
            attendanceList += `• "student.4 N" - Mark student 4 as No Class\n\n`;
            attendanceList += `💡 Quick options:\n`;
            attendanceList += `• Send "bulk" to mark all students at once\n`;
            attendanceList += `• Students will receive WhatsApp notifications!`;
            
            awaitingAttendanceStudent[from] = { subject: subject, studentList: studentList };
            msg.reply(attendanceList);
        } else {
            msg.reply('❌ Invalid subject selection. Please try again.');
        }
        return;
    }

    if(text === '4' && isTeacher(from)){
        if(Object.keys(attendance[from] || {}).length===0) return msg.reply('❌ No subjects added yet. Add subjects first using option 1.');
        
        let subjectList = `📊 Check Attendance Reports

Select a subject to view detailed reports:

`;
        let index = 1;
        for(let s in attendance[from]){
            const percent = calcPercent(from, s);
            const status = percent < 75 ? '⚠️ Low' : '✅ Good';
            subjectList += `${index}. ${s}: ${percent}% (${status})\n`;
            subjectList += `   Send "report.${index}" to view details\n\n`;
            index++;
        }
        subjectList += `Examples:\n`;
        subjectList += `• Send "report.1" to view first subject report\n`;
        subjectList += `• Send "report.2" to view second subject report\n\n`;
        subjectList += `💡 Reports show individual student attendance and overall percentages!`;
        msg.reply(subjectList);
        return;
    }

    // Handle report viewing
    if(text.match(/^report\.\d+$/) && isTeacher(from)){
        const reportIndex = parseInt(text.split('.')[1]) - 1;
        const subjects = Object.keys(attendance[from] || {});
        if(reportIndex >= 0 && reportIndex < subjects.length){
            const subject = subjects[reportIndex];
            const percent = calcPercent(from, subject);
            const status = percent < 75 ? '⚠️ Low Attendance' : '✅ Good Attendance';
            
            let reportMsg = `📊 Attendance Report - ${subject}

Overall: ${percent}% (${status})

Student Details:
`;
            
            const studentList = getStudentsForTeacher(from);
            for(let studentId of studentList){
                const studentName = getStudentName(studentId);
                const studentData = attendance[from][subject][studentId] || {};
                const dates = Object.keys(studentData).sort();
                const present = dates.filter(d => studentData[d] === 'P').length;
                const absent = dates.filter(d => studentData[d] === 'A').length;
                const holiday = dates.filter(d => studentData[d] === 'H').length;
                const noClass = dates.filter(d => studentData[d] === 'N').length;
                const total = present + absent;
                const studentPercent = total ? ((present/total)*100).toFixed(1) : 0;
                
                reportMsg += `\n👤 ${studentName}: ${studentPercent}%\n`;
                reportMsg += `   Present: ${present}, Absent: ${absent}, Holiday: ${holiday}, No Class: ${noClass}`;
            }
            
            msg.reply(reportMsg);
        } else {
            msg.reply('❌ Invalid report selection. Please try again.');
        }
        return;
    }

    if(text === '5' && isTeacher(from)){
        let viewMsg = `📊 ${getTeacherName(from)}'s Subjects:\n\n`;
        if(Object.keys(attendance[from] || {}).length === 0){
            viewMsg += 'No subjects added yet.';
        } else {
            for(let s in attendance[from]){
                const pct = calcPercent(from, s);
                const status = pct < 75 ? '⚠️ Low' : '✅ Good';
                viewMsg += `${s}: ${pct}% (${status})\n`;
            }
        }
        
        // Add alerts for low attendance
        let alertMsg = '\n⚠️ Subjects below 75%:\n';
        let low = false;
        for(let s in attendance[from] || {}){
            const pct = calcPercent(from, s);
            if(pct < 75){
                alertMsg += `${s}: ${pct}%\n`;
                low = true;
            }
        }
        if(!low) alertMsg = '\n✅ All subjects are above 75%.';
        
        msg.reply(viewMsg + alertMsg);
        return;
    }

    // Admin command to list all teachers
    if(text === '/teachers' && isTeacher(from)){
        let teacherList = '👨‍🏫 Registered Teachers:\n\n';
        for(let teacherId in teachers){
            const teacher = teachers[teacherId];
            const subjectCount = Object.keys(attendance[teacherId] || {}).length;
            teacherList += `${teacher.name}: ${subjectCount} subjects\n`;
        }
        msg.reply(teacherList);
        return;
    }

    // Add subject command
    if(text === '/add'){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        awaitingSubject[from] = true;
        msg.reply('Send the subject name you want to add:');
        return;
    }

    // Student management command
    if(text === '/students'){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        msg.reply(`Student Management:

➕ Add Student: /addStudent
👥 View Students: /viewStudents`);
        return;
    }

    // Add student command
    if(text === '/addStudent'){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        awaitingStudentName[from] = true;
        msg.reply('Send the student\'s name:');
        return;
    }

    // View students command
    if(text === '/viewStudents'){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        const studentList = getStudentsForTeacher(from);
        let studentMsg = '👥 Your Students:\n\n';
        if(studentList.length === 0){
            studentMsg += 'No students registered yet.';
        } else {
            for(let studentId of studentList){
                const student = students[studentId];
                studentMsg += `• ${student.name} (${student.phone})\n`;
            }
        }
        msg.reply(studentMsg);
        return;
    }

    // Mark individual attendance command
    if(text === '/markIndividual'){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        if(Object.keys(attendance[from] || {}).length === 0) return msg.reply('No subjects added yet. Add subjects first.');
        
        let subjectList = 'Select subject for individual attendance:\n\n';
        for(let subject in attendance[from]){
            subjectList += `📚 ${subject}: /markSubject-${subject.replace(/\s+/g, '_')}\n`;
        }
        msg.reply(subjectList);
        return;
    }

    // Mark general attendance command
    if(text === '/mark'){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        if(Object.keys(attendance[from] || {}).length===0) return msg.reply('No subjects added yet. Add subjects first.');
        
        let subjectList = 'Select subject to mark attendance:\n\n';
        for(let s in attendance[from]){
            const percent = calcPercent(from, s);
            const status = percent < 75 ? '⚠️ Low' : '✅ Good';
            subjectList += `📚 ${s}: ${percent}% (${status})\n`;
            subjectList += `   🟢 Present: /present-${s.replace(/\s+/g, '_')}\n`;
            subjectList += `   🔴 Absent: /absent-${s.replace(/\s+/g, '_')}\n`;
            subjectList += `   🟡 Holiday: /holiday-${s.replace(/\s+/g, '_')}\n\n`;
        }
        msg.reply(subjectList);
        return;
    }

    // Check alerts command
    if(text === '/alert'){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        let alertMsg = '⚠️ Your subjects below 75%:\n';
        let low = false;
        for(let s in attendance[from] || {}){
            const pct = calcPercent(from, s);
            if(pct < 75){
                alertMsg += `${s}: ${pct}%\n`;
                low = true;
            }
        }
        if(!low) alertMsg = '✅ All your subjects are above 75%.';
        msg.reply(alertMsg);
        return;
    }

    // View all subjects command
    if(text === '/view'){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        let viewMsg = `📊 ${getTeacherName(from)}'s Subjects:\n\n`;
        if(Object.keys(attendance[from] || {}).length === 0){
            viewMsg += 'No subjects added yet.';
        } else {
            for(let s in attendance[from]){
                const pct = calcPercent(from, s);
                const status = pct < 75 ? '⚠️ Low' : '✅ Good';
                viewMsg += `${s}: ${pct}% (${status})\n`;
            }
        }
        msg.reply(viewMsg);
        return;
    }

    // Student command to check their attendance
    if(text === '/myattendance' && isStudent(from)){
        const student = students[from];
        const teacherId = student.teacherId;
        const teacherName = getTeacherName(teacherId);
        
        let attendanceMsg = `📊 Your Attendance Report\n\nTeacher: ${teacherName}\n\n`;
        
        if(!attendance[teacherId]){
            attendanceMsg += 'No attendance records found.';
        } else {
            for(let subject in attendance[teacherId]){
                const subjectData = attendance[teacherId][subject];
                if(subjectData[from]){
                    const studentAttendance = subjectData[from];
                    const dates = Object.keys(studentAttendance).sort();
                    const present = dates.filter(d => studentAttendance[d] === 'P').length;
                    const absent = dates.filter(d => studentAttendance[d] === 'A').length;
                    const holiday = dates.filter(d => studentAttendance[d] === 'H').length;
                    const noClass = dates.filter(d => studentAttendance[d] === 'N').length;
                    const total = present + absent;
                    const percentage = total ? ((present/total)*100).toFixed(1) : 0;
                    
                    attendanceMsg += `📚 ${subject}: ${percentage}%\n`;
                    attendanceMsg += `   Present: ${present}, Absent: ${absent}, Holiday: ${holiday}, No Class: ${noClass}\n\n`;
                }
            }
        }
        
        msg.reply(attendanceMsg);
        return;
    }

    // Student help command
    if(text === '/help' && isStudent(from)){
        const student = students[from];
        const teacherName = getTeacherName(student.teacherId);
        
        msg.reply(`📚 Student Help

👋 Hello ${student.name}!

Your teacher: ${teacherName}

📋 Available Commands:
• /myattendance - Check your attendance report
• /help - Show this help

💡 You'll receive attendance notifications from your teacher on WhatsApp!`);
        return;
    }

    // Handle list-based attendance marking (student.X P/A/H/N)
    if(text.match(/^student\.\d+\s+[PAHN]$/) && awaitingAttendanceStudent[from] && isTeacher(from)){
        const parts = text.split(' ');
        const studentPart = parts[0]; // "student.X"
        const status = parts[1]; // "P", "A", "H", or "N"
        
        const studentIndex = parseInt(studentPart.split('.')[1]) - 1;
        const subject = awaitingAttendanceStudent[from]?.subject;
        const studentList = awaitingAttendanceStudent[from]?.studentList;
        
        if(!subject || !studentList) return msg.reply('❌ Error: Missing information.');
        
        if(studentIndex >= 0 && studentIndex < studentList.length){
            const studentId = studentList[studentIndex];
            const date = new Date().toISOString().split('T')[0];
            
            if(!attendance[from]) attendance[from] = {};
            if(!attendance[from][subject]) attendance[from][subject] = {};
            if(!attendance[from][subject][studentId]) attendance[from][subject][studentId] = {};
            
            attendance[from][subject][studentId][date] = status;
            saveData();
            
            const studentName = getStudentName(studentId);
            const statusText = {
                'P': 'Present',
                'A': 'Absent',
                'H': 'Holiday',
                'N': 'No Class'
            }[status];
            
            // Send notification to student
            const notificationMessage = `📚 Attendance Update

Subject: ${subject}
Date: ${date}
Status: ${statusText}
Teacher: ${getTeacherName(from)}`;
            const sent = await sendStudentNotification(studentId, notificationMessage);
            
            msg.reply(`✅ Marked ${studentName} as ${statusText} for ${subject}
📅 Date: ${date}
${sent ? '📱 Notification sent!' : '⚠️ Notification failed'}

Continue marking other students or send "bulk" to mark all remaining students.`);
        } else {
            msg.reply('❌ Invalid student number. Please check the list and try again.');
        }
        return;
    }

    // Handle bulk attendance marking
    if(text === 'bulk' && awaitingAttendanceStudent[from] && isTeacher(from)){
        const subject = awaitingAttendanceStudent[from]?.subject;
        const studentList = awaitingAttendanceStudent[from]?.studentList;
        
        if(!subject || !studentList) return msg.reply('❌ Error: Missing information.');
        
        msg.reply(`📋 Bulk Attendance - ${subject}

Mark all students at once:

🟢 Send "bulk P" - Mark all as Present
🔴 Send "bulk A" - Mark all as Absent  
🟡 Send "bulk H" - Mark all as Holiday
📚 Send "bulk N" - Mark all as No Class

💡 All students will receive WhatsApp notifications with their attendance status!`);
        
        awaitingAttendanceStudent[from].bulkMode = true;
        return;
    }
    
    // Handle bulk attendance execution
    if(text.match(/^bulk\s+[PAHN]$/) && awaitingAttendanceStudent[from] && awaitingAttendanceStudent[from].bulkMode && isTeacher(from)){
        const parts = text.split(' ');
        const status = parts[1]; // "P", "A", "H", or "N"
        
        const subject = awaitingAttendanceStudent[from]?.subject;
        const studentList = awaitingAttendanceStudent[from]?.studentList;
        
        if(!subject || !studentList) return msg.reply('❌ Error: Missing information.');
        
        const date = new Date().toISOString().split('T')[0];
        const statusText = {
            'P': 'Present',
            'A': 'Absent',
            'H': 'Holiday',
            'N': 'No Class'
        }[status];
        
        let successCount = 0;
        let notificationCount = 0;
        
        for(let studentId of studentList){
            if(!attendance[from]) attendance[from] = {};
            if(!attendance[from][subject]) attendance[from][subject] = {};
            if(!attendance[from][subject][studentId]) attendance[from][subject][studentId] = {};
            
            attendance[from][subject][studentId][date] = status;
            successCount++;
            
            // Send notification to student
            const notificationMessage = `📚 Attendance Update

Subject: ${subject}
Date: ${date}
Status: ${statusText}
Teacher: ${getTeacherName(from)}`;
            const sent = await sendStudentNotification(studentId, notificationMessage);
            if(sent) notificationCount++;
        }
        
        saveData();
        
        msg.reply(`✅ Bulk Attendance Complete!

📊 Results:
• Students marked: ${successCount}
• Status: ${statusText}
• Subject: ${subject}
• Date: ${date}
• Notifications sent: ${notificationCount}/${successCount}

Type /start to return to main menu.`);
        
        awaitingAttendanceStudent[from] = false;
        return;
    }

    // Restrict attendance commands to teachers only
    if(text.match(/^(present|absent|holiday|noclass|mark|attendance)/i) && !isTeacher(from)){
        msg.reply('❌ Only registered teachers can mark attendance. Please register first using /register');
        return;
    }

    // Handle general attendance commands
    if(text.startsWith('/present-') || text.startsWith('/absent-') || text.startsWith('/holiday-')){
        if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /register');
        
        const parts = text.split('-');
        const status = parts[0].replace('/', '');
        const subj = parts[1].replace(/_/g, ' ');
        
        const date = new Date().toISOString().split('T')[0];
        if(!attendance[from]) attendance[from] = {};
        if(!attendance[from][subj]) attendance[from][subj] = {};
        attendance[from][subj][date] = status.charAt(0).toUpperCase();
        saveData();
        msg.reply(`Marked ${subj} as ${status} for ${date}`);
        return;
    }

    if(msg.selectedButtonId){
        const btn = msg.selectedButtonId;
        
        if(btn === 'register'){
            awaitingTeacherName[from] = true;
            msg.reply('Please send your name to register as a teacher:');
        }
        else if(btn === 'add'){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            awaitingSubject[from] = true;
            msg.reply('Send the subject name you want to add:');
        }
        else if(btn === 'students'){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            const buttons = new Buttons(
                'Student Management:',
                [
                    {id:'addStudent', body:'➕ Add Student'},
                    {id:'viewStudents', body:'👥 View Students'},
                    {id:'removeStudent', body:'🗑️ Remove Student'}
                ],
                'Student Management'
            );
            await msg.reply(buttons);
        }
        else if(btn === 'addStudent'){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            awaitingStudentName[from] = true;
            msg.reply('Send the student\'s name:');
        }
        else if(btn === 'viewStudents'){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            const studentList = getStudentsForTeacher(from);
            let studentMsg = '👥 Your Students:\n\n';
            if(studentList.length === 0){
                studentMsg += 'No students registered yet.';
            } else {
                for(let studentId of studentList){
                    const student = students[studentId];
                    studentMsg += `• ${student.name} (${student.phone})\n`;
                }
            }
            msg.reply(studentMsg);
        }
        else if(btn === 'markIndividual'){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            if(Object.keys(attendance[from] || {}).length === 0) return msg.reply('No subjects added yet. Add subjects first.');
            
            let subjectButtons = [];
            for(let subject in attendance[from]){
                subjectButtons.push({id: `subject-${subject}`, body: subject});
            }
            
            const buttons = new Buttons(
                'Select subject for individual attendance:',
                subjectButtons,
                'Select Subject'
            );
            await msg.reply(buttons);
        }
        else if(btn === 'mark'){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            if(Object.keys(attendance[from] || {}).length===0) return msg.reply('No subjects added yet. Add subjects first.');
            
            for(let s in attendance[from]){
                const percent = calcPercent(from, s);
                const status = percent < 75 ? '⚠️ Low' : '✅ Good';
                const buttons = new Buttons(
                    `${s}: ${percent}% (${status})\nMark today:`,
                    [
                        {id:`P-${s}`, body:'🟢 Present'},
                        {id:`A-${s}`, body:'🔴 Absent'},
                        {id:`H-${s}`, body:'🟡 Holiday'}
                    ],
                    s
                );
                await msg.reply(buttons);
            }
        }
        else if(btn === 'alert'){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            let alertMsg = '⚠️ Your subjects below 75%:\n';
            let low = false;
            for(let s in attendance[from] || {}){
                const pct = calcPercent(from, s);
                if(pct < 75){
                    alertMsg += `${s}: ${pct}%\n`;
                    low = true;
                }
            }
            if(!low) alertMsg = '✅ All your subjects are above 75%.';
            msg.reply(alertMsg);
        }
        else if(btn === 'view'){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            let viewMsg = `📊 ${getTeacherName(from)}'s Subjects:\n\n`;
            if(Object.keys(attendance[from] || {}).length === 0){
                viewMsg += 'No subjects added yet.';
            } else {
                for(let s in attendance[from]){
                    const pct = calcPercent(from, s);
                    const status = pct < 75 ? '⚠️ Low' : '✅ Good';
                    viewMsg += `${s}: ${pct}% (${status})\n`;
                }
            }
            msg.reply(viewMsg);
        }
        else if(btn.startsWith('subject-')){
            const subject = btn.replace('subject-', '');
            awaitingAttendanceSubject[from] = true;
            msg.reply(`Send the subject name: ${subject}`);
        }
        else if(btn.startsWith('student-')){
            const studentId = btn.replace('student-', '');
            const subject = awaitingAttendanceStudent[from]?.subject;
            if(!subject) return msg.reply('Error: Subject not found.');
            
            const studentName = getStudentName(studentId);
            // Create safe button IDs by replacing @ with _ and - with _
            const safeStudentId = studentId.replace('@', '_').replace('-', '_');
            const safeSubject = subject.replace(' ', '_');
            
            const buttons = new Buttons(
                `Mark attendance for ${studentName} in ${subject}:`,
                [
                    {id:`P_${safeStudentId}_${safeSubject}`, body:'🟢 Present'},
                    {id:`A_${safeStudentId}_${safeSubject}`, body:'🔴 Absent'},
                    {id:`H_${safeStudentId}_${safeSubject}`, body:'🟡 Holiday'},
                    {id:`N_${safeStudentId}_${safeSubject}`, body:'📚 No Class'}
                ],
                'Mark Attendance'
            );
            await msg.reply(buttons);
            awaitingAttendanceStudent[from] = false;
        }
        else if(btn.startsWith('P_') || btn.startsWith('A_') || btn.startsWith('H_') || btn.startsWith('N_')){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            
            // Handle individual student attendance
            const parts = btn.split('_');
            const status = parts[0];
            const studentId = parts[1] + '@' + parts[2]; // Reconstruct student ID
            const subject = parts[3].replace(/_/g, ' '); // Reconstruct subject name
            
            const date = new Date().toISOString().split('T')[0];
            if(!attendance[from]) attendance[from] = {};
            if(!attendance[from][subject]) attendance[from][subject] = {};
            if(!attendance[from][subject][studentId]) attendance[from][subject][studentId] = {};
            
            attendance[from][subject][studentId][date] = status;
            saveData();
            
            const studentName = getStudentName(studentId);
            const statusText = {
                'P': 'Present',
                'A': 'Absent', 
                'H': 'Holiday',
                'N': 'No Class'
            }[status];
            
            // Send notification to student
            const notificationMessage = `📚 Attendance Update\n\nSubject: ${subject}\nDate: ${date}\nStatus: ${statusText}\nTeacher: ${getTeacherName(from)}`;
            const sent = await sendStudentNotification(studentId, notificationMessage);
            
            msg.reply(`✅ Marked ${studentName} as ${statusText} for ${subject} on ${date}${sent ? ' (Notification sent)' : ' (Notification failed)'}`);
        }
        else if(btn.startsWith('P-') || btn.startsWith('A-') || btn.startsWith('H-')){
            if(!isTeacher(from)) return msg.reply('Please register as a teacher first using /start');
            
            // Handle general subject attendance (old system)
            const [status, subj] = btn.split('-');
            const date = new Date().toISOString().split('T')[0];
            if(!attendance[from]) attendance[from] = {};
            if(!attendance[from][subj]) attendance[from][subj] = {};
            attendance[from][subj][date] = status;
            saveData();
            msg.reply(`Marked ${subj} as ${status} for ${date}`);
        }
    }
});

// Optional: send daily alert at 8 AM
schedule.scheduleJob('0 8 * * *', async ()=>{
    for(let teacherId in attendance){
        const teacherName = getTeacherName(teacherId);
        for(let subject in attendance[teacherId]){
            const p = calcPercent(teacherId, subject);
        if(p < 75){
                await client.sendMessage(BOT_GROUP_ID, `⚠️ ${teacherName}'s ${subject} attendance below 75% (${p}%)`);
            }
        }
    }
});

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            message: 'WhatsApp Attendance Bot is running',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/`);
});

// Error handling for production
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit in production, let Railway restart if needed
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

client.initialize();
