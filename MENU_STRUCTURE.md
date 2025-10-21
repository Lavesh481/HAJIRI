# Hajiri Bot - Menu Structure

## Quick Navigation Commands

### For Teachers:
- `/start` - Show welcome message and main menu
- `/menu` or `/back` - Return to main menu from anywhere (clears all pending operations)
- `/register` - Register as a teacher
- `/reports` - Quick access to view all reports
- `/help` - Show help menu

### For Students:
- `/myattendance` - View complete attendance report
- `/today` - View today's attendance status
- `/percentage` - View overall attendance percentage
- `/help` - Show help menu

---

## Main Menu (Options 1-7)

### 1️⃣ Add Subject
- **Direct action**: Prompts for subject name
- **Cancel**: Type `/menu`

### 2️⃣ Manage Students
Suboptions:
- **A** - Add New Student
- **B** - View All Students
- **C** - Search Student
- **D** - Student Reports
  - Format: `student.report.1`, `student.report.2`, etc.

### 3️⃣ Mark Attendance
Suboptions (prefixed with 3):
- **3A** - First subject
- **3B** - Second subject
- **3C** - Third subject
- etc.

**Quick bulk options:**
- `bulk P` - Mark all Present
- `bulk A` - Mark all Absent
- `bulk H` - Mark Holiday
- `bulk N` - No Class

### 4️⃣ View Reports
Suboptions (prefixed with 4):
- **4A** - First subject report
- **4B** - Second subject report
- **4C** - Third subject report
- etc.

### 5️⃣ Subject Overview
- **Direct action**: Shows all subjects with attendance percentages

### 6️⃣ Remove Data
Suboptions (prefixed with 6):
- **6A** - Remove Subject
  - Format: `remove.subject.1`, `remove.subject.2`, etc.
- **6B** - Remove Student
  - Format: `remove.student.1`, `remove.student.2`, etc.

### 7️⃣ Delete Account
- **Confirmation required**: `confirm.delete.account`

---

## Design Principles

### No Conflicts
- Main menu uses numbers: `1`, `2`, `3`, `4`, `5`, `6`, `7`
- Option 2 uses plain letters: `A`, `B`, `C`, `D`
- Option 3 uses prefixed letters: `3A`, `3B`, `3C`...
- Option 4 uses prefixed letters: `4A`, `4B`, `4C`...
- Option 6 uses prefixed letters: `6A`, `6B`

### User-Friendly Features
- Every submenu shows `/menu` option to return to main menu
- All awaiting states are cleared when using `/menu` or `/back`
- Clear instructions in every message
- Emoji indicators for better visual navigation
- Case-insensitive input (e.g., `A` or `a` both work)

---

## Attendance Status Codes
- **P** - Present ✅
- **A** - Absent ❌
- **H** - Holiday 🌟
- **N** - No Class 📅
