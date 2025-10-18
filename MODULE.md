# 📚 WhatsApp Attendance Bot - Complete Documentation

## 🎯 Overview

A comprehensive WhatsApp-based attendance management system that allows multiple teachers to manage their own students and subjects independently. The bot supports both general class attendance and individual student attendance with automatic notifications.

## ✨ Key Features

- **Multi-Teacher Support**: Each teacher manages their own students and subjects
- **Individual Student Tracking**: Mark attendance for specific students
- **Automatic Notifications**: Students receive instant WhatsApp notifications
- **Four Attendance Statuses**: Present, Absent, Holiday, No Class
- **Student Self-Service**: Students can check their own attendance
- **Real-time Updates**: All changes are saved immediately
- **Daily Alerts**: Automated low attendance warnings

## 🏗️ System Architecture

### Data Structure
```javascript
{
  attendance: {
    "teacherId@c.us": {
      "Subject Name": {
        "studentId@c.us": {
          "2024-01-15": "P", // Present
          "2024-01-16": "A", // Absent
          "2024-01-17": "H"  // Holiday
        }
      }
    }
  },
  teachers: {
    "teacherId@c.us": {
      name: "Teacher Name",
      registeredAt: "2024-01-15T10:00:00.000Z"
    }
  },
  students: {
    "studentId@c.us": {
      name: "Student Name",
      phone: "1234567890",
      teacherId: "teacherId@c.us",
      registeredAt: "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Core Components

1. **Teacher Management System**
   - Teacher registration and authentication
   - Subject management per teacher
   - Student management per teacher

2. **Attendance Tracking System**
   - Individual student attendance marking
   - General class attendance (legacy support)
   - Percentage calculation and reporting

3. **Notification System**
   - Real-time WhatsApp notifications to students
   - Formatted attendance updates
   - Error handling for failed notifications

4. **User Interface**
   - Interactive button-based menus
   - Context-aware message handling
   - Multi-step workflows for complex operations

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- WhatsApp account
- WhatsApp group for the bot

### Installation Steps

1. **Clone/Download the project**
   ```bash
   cd /path/to/project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot**
   - Update `BOT_GROUP_ID` in `index.js` with your WhatsApp group ID
   - The group ID format is: `120363166897800258@g.us`

4. **Start the bot**
   ```bash
   node index.js
   ```

5. **Connect WhatsApp**
   - Scan the QR code with your WhatsApp
   - Wait for "✅ Bot is ready!" message

## 📱 User Guide

### For Teachers

#### Initial Setup
1. Send `/start` in the WhatsApp group
2. Click "👨‍🏫 Register as Teacher"
3. Provide your name when prompted

#### Managing Subjects
1. Click "➕ Add Subject"
2. Send the subject name (e.g., "Mathematics", "Physics")

#### Managing Students
1. Click "👥 Manage Students"
2. Choose from:
   - "➕ Add Student": Add new students
   - "👥 View Students": See all your students
   - "🗑️ Remove Student": Remove students (future feature)

#### Marking Attendance

**Individual Student Attendance (Recommended)**
1. Click "📝 Mark Individual Attendance"
2. Select subject from the list
3. Select student from the list
4. Choose attendance status:
   - 🟢 Present
   - 🔴 Absent
   - 🟡 Holiday
   - 📚 No Class

**General Class Attendance (Legacy)**
1. Click "🟢 Mark Attendance"
2. Select subject and mark overall class status

#### Monitoring & Reports
- "⚠️ Check Alerts": View subjects below 75% attendance
- "📊 View All Subjects": See all subjects with percentages
- `/teachers`: List all registered teachers (admin command)

### For Students

#### Checking Attendance
1. Send `/myattendance` in any chat
2. View your personal attendance report with:
   - Subject-wise percentages
   - Present/Absent/Holiday/No Class counts
   - Teacher information

#### Receiving Notifications
- Automatic notifications when teacher marks your attendance
- Notifications include: Subject, Date, Status, Teacher name

## 🔧 Technical Details

### File Structure
```
Hajiri/
├── index.js              # Main bot application
├── package.json          # Dependencies and scripts
├── attendance.json       # Data storage (auto-generated)
├── node_modules/         # Dependencies
└── MODULE.md            # This documentation
```

### Key Functions

#### Data Management
- `saveData()`: Saves all data to attendance.json
- `calcPercent(teacherId, subject)`: Calculates attendance percentage
- `getTeacherName(teacherId)`: Gets teacher name from ID
- `getStudentName(studentId)`: Gets student name from ID

#### User Management
- `isTeacher(userId)`: Checks if user is registered teacher
- `isStudent(userId)`: Checks if user is registered student
- `getStudentsForTeacher(teacherId)`: Gets all students for a teacher

#### Notification System
- `sendStudentNotification(studentId, message)`: Sends WhatsApp message to student

### Message Flow

1. **Message Reception**: Bot receives message in group
2. **User Identification**: Determines if sender is teacher/student
3. **Command Processing**: Processes commands and button clicks
4. **Data Updates**: Updates attendance data
5. **Notifications**: Sends notifications to relevant students
6. **Response**: Sends confirmation to teacher

### Error Handling

- **Failed Notifications**: Logs errors but continues operation
- **Invalid Commands**: Provides helpful error messages
- **Data Validation**: Checks for required data before operations
- **Group Restrictions**: Only responds in configured group

## 🧪 Testing Guide

### Manual Testing Steps

1. **Start Bot**
   ```bash
   node index.js
   ```

2. **Test Teacher Registration**
   - Send `/start` → Click "Register as Teacher" → Provide name

3. **Test Subject Addition**
   - Click "Add Subject" → Provide subject name

4. **Test Student Management**
   - Click "Manage Students" → "Add Student" → Provide name and phone

5. **Test Individual Attendance**
   - Click "Mark Individual Attendance" → Select subject → Select student → Mark status

6. **Test Notifications**
   - Verify student receives WhatsApp notification

7. **Test Student Commands**
   - From student's WhatsApp: Send `/myattendance`

### Automated Testing

Run the test script to verify data structures:
```bash
node test_student_features.js
```

## 📊 Data Persistence

### Storage Format
- **File**: `attendance.json`
- **Format**: JSON with nested objects
- **Auto-save**: After every data modification
- **Backup**: Manual backup recommended

### Data Migration
- System automatically migrates from old format
- Backward compatible with previous versions
- No manual migration required

## 🔒 Security & Privacy

### Data Protection
- All data stored locally in `attendance.json`
- No external API calls for data storage
- WhatsApp numbers stored for notification purposes only

### Access Control
- Teachers can only access their own students
- Students can only view their own attendance
- Group-based access control

## 🚨 Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check if bot is running: `ps aux | grep "node index.js"`
   - Verify group ID is correct
   - Check WhatsApp connection

2. **QR code not working**
   - Ensure WhatsApp Web is not already connected
   - Try refreshing the QR code
   - Check internet connection

3. **Notifications not sent**
   - Verify student's WhatsApp number is correct
   - Check if student has blocked the bot
   - Review error logs in console

4. **Data not saving**
   - Check file permissions on `attendance.json`
   - Ensure sufficient disk space
   - Verify JSON format is valid

### Debug Mode
- Run with `DEBUG=* node index.js` for detailed logs
- Check console output for error messages
- Monitor `attendance.json` for data changes

## 🔄 Updates & Maintenance

### Regular Maintenance
- Monitor `attendance.json` file size
- Backup data regularly
- Update dependencies periodically

### Future Enhancements
- Student removal functionality
- Bulk attendance marking
- Export attendance reports
- Advanced analytics and charts
- Multi-language support

## 📞 Support

### Getting Help
1. Check this documentation first
2. Review console logs for errors
3. Test with simple commands
4. Verify data in `attendance.json`

### Reporting Issues
- Include error messages
- Provide steps to reproduce
- Share relevant log output
- Include system information

## 📝 License & Credits

### Dependencies
- `whatsapp-web.js`: WhatsApp Web API wrapper
- `qrcode-terminal`: QR code generation
- `node-schedule`: Scheduled tasks

### Credits
- Built for educational attendance management
- Designed for multi-teacher environments
- Optimized for WhatsApp integration

---

**Version**: 2.0  
**Last Updated**: January 2024  
**Compatibility**: Node.js 14+, WhatsApp Web
