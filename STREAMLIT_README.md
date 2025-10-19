# 📚 Streamlit Attendance Management System

A modern, web-based attendance management system built with Streamlit that's perfect for teachers and students.

## 🚀 Features

### For Teachers:
- 📚 **Subject Management** - Add and manage multiple subjects
- 👥 **Student Management** - Add students with contact information
- ✅ **Attendance Tracking** - Mark attendance with Present/Absent/Holiday/No Class
- 📊 **Detailed Reports** - Generate comprehensive attendance reports
- 📈 **Analytics Dashboard** - Visual charts and statistics
- 📱 **Mobile Friendly** - Works on all devices

### For Students:
- 👤 **Personal Dashboard** - View your attendance for all subjects
- 📊 **Attendance History** - See your attendance record over time
- 📈 **Performance Tracking** - Monitor your attendance percentage
- 📱 **Mobile Access** - Check attendance from your phone

## 🛠 Requirements

### System Requirements:
- **Python 3.8+**
- **4GB RAM minimum**
- **1GB storage space**

### Python Dependencies:
```
streamlit>=1.28.0
pandas>=1.5.0
plotly>=5.15.0
python-dateutil>=2.8.0
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Application
```bash
# Option 1: Using the startup script
python run_streamlit.py

# Option 2: Direct streamlit command
streamlit run streamlit_app.py
```

### 3. Access the Application
- Open your browser
- Go to: `http://localhost:8501`
- Start using the system!

## 📱 Deployment Options

### Free Platforms (Recommended):

#### 1. Streamlit Cloud (Easiest)
- ✅ **Completely FREE**
- ✅ **No setup required**
- ✅ **Automatic deployment**
- ✅ **Custom domain support**

**Steps:**
1. Push code to GitHub
2. Go to share.streamlit.io
3. Connect GitHub repository
4. Deploy automatically

#### 2. Railway
- ✅ **500 hours/month FREE**
- ✅ **Easy deployment**
- ✅ **Custom domain**

#### 3. Heroku
- ✅ **$7/month** (no free tier)
- ✅ **Reliable platform**

#### 4. DigitalOcean App Platform
- ✅ **$5/month**
- ✅ **Good performance**

### VPS Deployment:
```bash
# Install dependencies
pip install -r requirements.txt

# Run with PM2 for 24/7 operation
pm2 start streamlit_app.py --name "attendance-app"
pm2 save
pm2 startup
```

## 🎯 Usage Guide

### For Teachers:

1. **Login** with your name
2. **Add Subjects** - Create subjects you teach
3. **Add Students** - Register students with phone numbers
4. **Mark Attendance** - Record daily attendance
5. **View Reports** - Generate attendance reports
6. **Analytics** - See visual charts and statistics

### For Students:

1. **Login** with your name and phone number
2. **View Dashboard** - See your attendance overview
3. **Check History** - View detailed attendance records
4. **Track Performance** - Monitor your attendance percentage

## 📊 Features Overview

### Teacher Dashboard:
- **Subject Management**: Add/edit/delete subjects
- **Student Management**: Add students with contact info
- **Attendance Marking**: Quick attendance entry
- **Reports**: Detailed attendance reports with CSV export
- **Analytics**: Visual charts and statistics

### Student Dashboard:
- **Personal Overview**: Your attendance summary
- **Subject-wise View**: Attendance for each subject
- **History Tracking**: Detailed attendance history
- **Performance Metrics**: Attendance percentages

## 🔧 Configuration

### Streamlit Configuration:
The app uses `streamlit_config.toml` for configuration:
- **Port**: 8501
- **Headless mode**: Enabled for deployment
- **CORS**: Disabled for security
- **Theme**: Custom blue theme

### Data Storage:
- **Format**: JSON files
- **Location**: `attendance.json`
- **Backup**: Automatic data persistence

## 📱 Mobile Access

The web application is fully responsive and works perfectly on:
- 📱 **Mobile phones**
- 📱 **Tablets**
- 💻 **Laptops**
- 🖥️ **Desktop computers**

## 🆓 Free Deployment Options

### 1. Streamlit Cloud (BEST FREE OPTION)
- ✅ **100% FREE**
- ✅ **No credit card needed**
- ✅ **Automatic deployment**
- ✅ **Custom domain**

### 2. Railway
- ✅ **500 hours/month FREE**
- ✅ **Easy setup**

### 3. VPS with Free Credits
- ✅ **DigitalOcean**: $200 free credits (4 months)
- ✅ **Linode**: $100 free credits (2 months)
- ✅ **Vultr**: $100 free credits (2 months)

## 🎯 Advantages over WhatsApp Bot

### ✅ **Resource Efficient**:
- No WhatsApp Web.js dependency
- No Puppeteer/Chrome requirements
- Minimal resource usage
- Runs on free platforms

### ✅ **Better User Experience**:
- Modern web interface
- Mobile responsive
- Real-time updates
- Better data visualization

### ✅ **Easier Deployment**:
- No complex setup
- Works on all platforms
- No resource limits
- Free hosting available

## 🚀 Quick Deployment

### Streamlit Cloud (Recommended):
1. **Push to GitHub**
2. **Go to share.streamlit.io**
3. **Connect repository**
4. **Deploy automatically**
5. **Share the link with users**

### Railway:
1. **Connect GitHub to Railway**
2. **Select repository**
3. **Deploy automatically**
4. **Get your app URL**

## 📞 Support

For issues or questions:
- Check the documentation
- Review error logs
- Test locally first
- Contact support if needed

## 🎉 Ready to Deploy!

Your Streamlit attendance system is ready for deployment. Choose your preferred platform and start managing attendance efficiently!
