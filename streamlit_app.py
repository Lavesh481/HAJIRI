import streamlit as st
import json
import os
from datetime import datetime, date
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Page configuration
st.set_page_config(
    page_title="Attendance Management System",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #1f77b4;
    }
    .success-message {
        background-color: #d4edda;
        color: #155724;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #c3e6cb;
    }
    .error-message {
        background-color: #f8d7da;
        color: #721c24;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #f5c6cb;
    }
</style>
""", unsafe_allow_html=True)

# Data storage functions
def load_data():
    """Load data from JSON files"""
    data = {
        'attendance': {},
        'teachers': {},
        'students': {}
    }
    
    if os.path.exists('attendance.json'):
        with open('attendance.json', 'r') as f:
            data = json.load(f)
    
    return data

def save_data(data):
    """Save data to JSON file"""
    with open('attendance.json', 'w') as f:
        json.dump(data, f, indent=2)

def initialize_session_state():
    """Initialize session state variables"""
    if 'data' not in st.session_state:
        st.session_state.data = load_data()
    if 'current_teacher' not in st.session_state:
        st.session_state.current_teacher = None
    if 'current_student' not in st.session_state:
        st.session_state.current_student = None

# Helper functions
def calculate_percentage(teacher_id, subject):
    """Calculate attendance percentage for a subject"""
    if teacher_id not in st.session_state.data['attendance']:
        return 0
    if subject not in st.session_state.data['attendance'][teacher_id]:
        return 0
    
    subject_data = st.session_state.data['attendance'][teacher_id][subject]
    total_present = 0
    total_absent = 0
    
    for student_id, student_attendance in subject_data.items():
        if isinstance(student_attendance, dict):
            for date, status in student_attendance.items():
                if status == 'P':
                    total_present += 1
                elif status == 'A':
                    total_absent += 1
    
    total = total_present + total_absent
    return (total_present / total * 100) if total > 0 else 0

def get_teacher_name(teacher_id):
    """Get teacher name from ID"""
    return st.session_state.data['teachers'].get(teacher_id, {}).get('name', 'Unknown Teacher')

def get_student_name(student_id):
    """Get student name from ID"""
    return st.session_state.data['students'].get(student_id, {}).get('name', 'Unknown Student')

# Main app
def main():
    initialize_session_state()
    
    # Header
    st.markdown('<h1 class="main-header">📚 Attendance Management System</h1>', unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.header("🔐 Login")
        
        # Teacher login
        st.subheader("Teacher Login")
        teacher_name = st.text_input("Teacher Name", key="teacher_name_input")
        if st.button("Login as Teacher", key="teacher_login"):
            if teacher_name:
                # Create teacher ID (simple hash)
                teacher_id = f"teacher_{hash(teacher_name) % 10000}"
                st.session_state.data['teachers'][teacher_id] = {
                    'name': teacher_name,
                    'registeredAt': datetime.now().isoformat()
                }
                if teacher_id not in st.session_state.data['attendance']:
                    st.session_state.data['attendance'][teacher_id] = {}
                st.session_state.current_teacher = teacher_id
                save_data(st.session_state.data)
                st.success(f"Welcome, {teacher_name}!")
            else:
                st.error("Please enter your name")
        
        # Student login
        st.subheader("Student Login")
        student_name = st.text_input("Student Name", key="student_name_input")
        student_phone = st.text_input("Phone Number", key="student_phone_input")
        if st.button("Login as Student", key="student_login"):
            if student_name and student_phone:
                student_id = f"{student_phone.replace('+', '').replace(' ', '')}@c.us"
                st.session_state.data['students'][student_id] = {
                    'name': student_name,
                    'phone': student_phone,
                    'teacherId': st.session_state.current_teacher,
                    'registeredAt': datetime.now().isoformat()
                }
                st.session_state.current_student = student_id
                save_data(st.session_state.data)
                st.success(f"Welcome, {student_name}!")
            else:
                st.error("Please enter both name and phone number")
        
        # Logout
        if st.button("Logout"):
            st.session_state.current_teacher = None
            st.session_state.current_student = None
            st.rerun()
    
    # Main content based on login status
    if st.session_state.current_teacher:
        teacher_interface()
    elif st.session_state.current_student:
        student_interface()
    else:
        welcome_interface()

def welcome_interface():
    """Welcome page for non-logged in users"""
    st.markdown("""
    ## 🎓 Welcome to Attendance Management System
    
    This system helps teachers manage student attendance efficiently.
    
    ### Features:
    - 📚 **Subject Management** - Add and manage subjects
    - 👥 **Student Management** - Add and track students
    - ✅ **Attendance Tracking** - Mark and view attendance
    - 📊 **Reports & Analytics** - Detailed attendance reports
    - 📱 **Mobile Friendly** - Works on all devices
    
    ### Getting Started:
    1. **Teachers**: Login with your name to start managing attendance
    2. **Students**: Login with your name and phone number to view your attendance
    
    ### Quick Stats:
    """)
    
    # Display overall stats
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Teachers", len(st.session_state.data['teachers']))
    
    with col2:
        st.metric("Total Students", len(st.session_state.data['students']))
    
    with col3:
        total_subjects = sum(len(teacher_data.get('subjects', [])) for teacher_data in st.session_state.data['attendance'].values())
        st.metric("Total Subjects", total_subjects)
    
    with col4:
        total_attendance_records = sum(
            len(subject_data) 
            for teacher_data in st.session_state.data['attendance'].values() 
            for subject_data in teacher_data.values()
        )
        st.metric("Attendance Records", total_attendance_records)

def teacher_interface():
    """Teacher dashboard and management interface"""
    teacher_name = get_teacher_name(st.session_state.current_teacher)
    st.header(f"👨‍🏫 Welcome, {teacher_name}")
    
    # Tabs for different functions
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📚 Subjects", "👥 Students", "✅ Mark Attendance", "📊 Reports", "📈 Analytics"
    ])
    
    with tab1:
        subject_management()
    
    with tab2:
        student_management()
    
    with tab3:
        mark_attendance()
    
    with tab4:
        attendance_reports()
    
    with tab5:
        analytics_dashboard()

def subject_management():
    """Subject management interface"""
    st.subheader("📚 Subject Management")
    
    # Add new subject
    with st.expander("➕ Add New Subject", expanded=True):
        new_subject = st.text_input("Subject Name", key="new_subject")
        if st.button("Add Subject"):
            if new_subject:
                if new_subject not in st.session_state.data['attendance'][st.session_state.current_teacher]:
                    st.session_state.data['attendance'][st.session_state.current_teacher][new_subject] = {}
                    save_data(st.session_state.data)
                    st.success(f"Subject '{new_subject}' added successfully!")
                    st.rerun()
                else:
                    st.error("Subject already exists!")
            else:
                st.error("Please enter a subject name")
    
    # Display subjects
    st.subheader("Your Subjects")
    subjects = list(st.session_state.data['attendance'][st.session_state.current_teacher].keys())
    
    if subjects:
        for i, subject in enumerate(subjects, 1):
            col1, col2, col3 = st.columns([3, 1, 1])
            with col1:
                st.write(f"{i}. {subject}")
            with col2:
                percentage = calculate_percentage(st.session_state.current_teacher, subject)
                st.metric("Attendance", f"{percentage:.1f}%")
            with col3:
                if st.button("Delete", key=f"delete_subject_{i}"):
                    del st.session_state.data['attendance'][st.session_state.current_teacher][subject]
                    save_data(st.session_state.data)
                    st.rerun()
    else:
        st.info("No subjects added yet. Add your first subject above!")

def student_management():
    """Student management interface"""
    st.subheader("👥 Student Management")
    
    # Add new student
    with st.expander("➕ Add New Student", expanded=True):
        student_name = st.text_input("Student Name", key="new_student_name")
        student_phone = st.text_input("Phone Number", key="new_student_phone")
        if st.button("Add Student"):
            if student_name and student_phone:
                student_id = f"{student_phone.replace('+', '').replace(' ', '')}@c.us"
                if student_id not in st.session_state.data['students']:
                    st.session_state.data['students'][student_id] = {
                        'name': student_name,
                        'phone': student_phone,
                        'teacherId': st.session_state.current_teacher,
                        'registeredAt': datetime.now().isoformat()
                    }
                    # Initialize attendance for all subjects
                    for subject in st.session_state.data['attendance'][st.session_state.current_teacher]:
                        if student_id not in st.session_state.data['attendance'][st.session_state.current_teacher][subject]:
                            st.session_state.data['attendance'][st.session_state.current_teacher][subject][student_id] = {}
                    save_data(st.session_state.data)
                    st.success(f"Student '{student_name}' added successfully!")
                    st.rerun()
                else:
                    st.error("Student with this phone number already exists!")
            else:
                st.error("Please enter both name and phone number")
    
    # Display students
    st.subheader("Your Students")
    students = [sid for sid, sdata in st.session_state.data['students'].items() 
                if sdata.get('teacherId') == st.session_state.current_teacher]
    
    if students:
        for student_id in students:
            student_data = st.session_state.data['students'][student_id]
            col1, col2, col3 = st.columns([3, 2, 1])
            with col1:
                st.write(f"👤 {student_data['name']}")
            with col2:
                st.write(f"📱 {student_data['phone']}")
            with col3:
                if st.button("Remove", key=f"remove_student_{student_id}"):
                    # Remove from all subjects
                    for subject in st.session_state.data['attendance'][st.session_state.current_teacher]:
                        if student_id in st.session_state.data['attendance'][st.session_state.current_teacher][subject]:
                            del st.session_state.data['attendance'][st.session_state.current_teacher][subject][student_id]
                    del st.session_state.data['students'][student_id]
                    save_data(st.session_state.data)
                    st.rerun()
    else:
        st.info("No students added yet. Add your first student above!")

def mark_attendance():
    """Mark attendance interface"""
    st.subheader("✅ Mark Attendance")
    
    # Select subject
    subjects = list(st.session_state.data['attendance'][st.session_state.current_teacher].keys())
    if not subjects:
        st.warning("Please add subjects first!")
        return
    
    selected_subject = st.selectbox("Select Subject", subjects)
    
    # Get students for this teacher
    students = [sid for sid, sdata in st.session_state.data['students'].items() 
                if sdata.get('teacherId') == st.session_state.current_teacher]
    
    if not students:
        st.warning("Please add students first!")
        return
    
    # Attendance form
    st.subheader(f"Mark Attendance for {selected_subject}")
    
    attendance_data = {}
    for student_id in students:
        student_name = get_student_name(student_id)
        col1, col2 = st.columns([3, 1])
        with col1:
            st.write(f"👤 {student_name}")
        with col2:
            status = st.selectbox(
                "Status",
                ["Present", "Absent", "Holiday", "No Class"],
                key=f"attendance_{student_id}",
                index=0
            )
            attendance_data[student_id] = status[0]  # P, A, H, N
    
    # Save attendance
    if st.button("Save Attendance", type="primary"):
        today = date.today().isoformat()
        for student_id, status in attendance_data.items():
            if student_id not in st.session_state.data['attendance'][st.session_state.current_teacher][selected_subject]:
                st.session_state.data['attendance'][st.session_state.current_teacher][selected_subject][student_id] = {}
            st.session_state.data['attendance'][st.session_state.current_teacher][selected_subject][student_id][today] = status
        
        save_data(st.session_state.data)
        st.success("Attendance saved successfully!")
        st.rerun()

def attendance_reports():
    """Attendance reports interface"""
    st.subheader("📊 Attendance Reports")
    
    subjects = list(st.session_state.data['attendance'][st.session_state.current_teacher].keys())
    if not subjects:
        st.warning("No subjects available!")
        return
    
    selected_subject = st.selectbox("Select Subject for Report", subjects)
    
    # Calculate statistics
    subject_data = st.session_state.data['attendance'][st.session_state.current_teacher][selected_subject]
    
    # Overall statistics
    col1, col2, col3, col4 = st.columns(4)
    
    total_present = 0
    total_absent = 0
    total_holiday = 0
    total_no_class = 0
    
    for student_id, student_attendance in subject_data.items():
        for date, status in student_attendance.items():
            if status == 'P':
                total_present += 1
            elif status == 'A':
                total_absent += 1
            elif status == 'H':
                total_holiday += 1
            elif status == 'N':
                total_no_class += 1
    
    with col1:
        st.metric("Present", total_present)
    with col2:
        st.metric("Absent", total_absent)
    with col3:
        st.metric("Holiday", total_holiday)
    with col4:
        st.metric("No Class", total_no_class)
    
    # Student-wise report
    st.subheader("Student-wise Report")
    
    report_data = []
    for student_id, student_attendance in subject_data.items():
        student_name = get_student_name(student_id)
        present = sum(1 for status in student_attendance.values() if status == 'P')
        absent = sum(1 for status in student_attendance.values() if status == 'A')
        total = present + absent
        percentage = (present / total * 100) if total > 0 else 0
        
        report_data.append({
            'Student': student_name,
            'Present': present,
            'Absent': absent,
            'Total': total,
            'Percentage': f"{percentage:.1f}%"
        })
    
    if report_data:
        df = pd.DataFrame(report_data)
        st.dataframe(df, use_container_width=True)
        
        # Download button
        csv = df.to_csv(index=False)
        st.download_button(
            label="Download Report as CSV",
            data=csv,
            file_name=f"attendance_report_{selected_subject}_{date.today()}.csv",
            mime="text/csv"
        )
    else:
        st.info("No attendance data available for this subject.")

def analytics_dashboard():
    """Analytics dashboard with charts"""
    st.subheader("📈 Analytics Dashboard")
    
    subjects = list(st.session_state.data['attendance'][st.session_state.current_teacher].keys())
    if not subjects:
        st.warning("No subjects available for analytics!")
        return
    
    # Subject-wise attendance chart
    st.subheader("Subject-wise Attendance")
    
    subject_percentages = []
    for subject in subjects:
        percentage = calculate_percentage(st.session_state.current_teacher, subject)
        subject_percentages.append({
            'Subject': subject,
            'Attendance %': percentage
        })
    
    if subject_percentages:
        df_subjects = pd.DataFrame(subject_percentages)
        
        # Bar chart
        fig = px.bar(df_subjects, x='Subject', y='Attendance %', 
                    title="Attendance Percentage by Subject",
                    color='Attendance %',
                    color_continuous_scale='RdYlGn')
        fig.update_layout(xaxis_tickangle=-45)
        st.plotly_chart(fig, use_container_width=True)
        
        # Pie chart for overall distribution
        st.subheader("Overall Attendance Distribution")
        
        total_present = 0
        total_absent = 0
        
        for subject in subjects:
            subject_data = st.session_state.data['attendance'][st.session_state.current_teacher][subject]
            for student_id, student_attendance in subject_data.items():
                for date, status in student_attendance.items():
                    if status == 'P':
                        total_present += 1
                    elif status == 'A':
                        total_absent += 1
        
        if total_present + total_absent > 0:
            fig_pie = go.Figure(data=[go.Pie(
                labels=['Present', 'Absent'],
                values=[total_present, total_absent],
                hole=.3
            )])
            fig_pie.update_layout(title="Overall Attendance Distribution")
            st.plotly_chart(fig_pie, use_container_width=True)

def student_interface():
    """Student interface to view their attendance"""
    student_name = get_student_name(st.session_state.current_student)
    st.header(f"👤 Welcome, {student_name}")
    
    # Get student's teacher
    student_data = st.session_state.data['students'][st.session_state.current_student]
    teacher_id = student_data.get('teacherId')
    
    if not teacher_id or teacher_id not in st.session_state.data['attendance']:
        st.warning("No attendance data available.")
        return
    
    teacher_name = get_teacher_name(teacher_id)
    st.subheader(f"Teacher: {teacher_name}")
    
    # Display attendance for each subject
    subjects = list(st.session_state.data['attendance'][teacher_id].keys())
    
    for subject in subjects:
        if st.session_state.current_student in st.session_state.data['attendance'][teacher_id][subject]:
            st.subheader(f"📚 {subject}")
            
            student_attendance = st.session_state.data['attendance'][teacher_id][subject][st.session_state.current_student]
            
            # Calculate statistics
            present = sum(1 for status in student_attendance.values() if status == 'P')
            absent = sum(1 for status in student_attendance.values() if status == 'A')
            holiday = sum(1 for status in student_attendance.values() if status == 'H')
            no_class = sum(1 for status in student_attendance.values() if status == 'N')
            total = present + absent
            percentage = (present / total * 100) if total > 0 else 0
            
            # Display metrics
            col1, col2, col3, col4, col5 = st.columns(5)
            with col1:
                st.metric("Present", present)
            with col2:
                st.metric("Absent", absent)
            with col3:
                st.metric("Holiday", holiday)
            with col4:
                st.metric("No Class", no_class)
            with col5:
                st.metric("Percentage", f"{percentage:.1f}%")
            
            # Display attendance history
            if student_attendance:
                st.subheader("Attendance History")
                history_data = []
                for date, status in sorted(student_attendance.items(), reverse=True):
                    status_text = {
                        'P': 'Present',
                        'A': 'Absent',
                        'H': 'Holiday',
                        'N': 'No Class'
                    }.get(status, status)
                    history_data.append({
                        'Date': date,
                        'Status': status_text
                    })
                
                df_history = pd.DataFrame(history_data)
                st.dataframe(df_history, use_container_width=True)

if __name__ == "__main__":
    main()
