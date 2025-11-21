# Quick Start Guide

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

## Quick Setup (5 minutes)

### 1. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
cd backend
python main.py
```

Backend will run on `http://localhost:8000`

### 2. Frontend Setup (in a new terminal)

```bash
# Install frontend dependencies
cd frontend
npm install

# Start the frontend server
npm run dev
```

Frontend will run on `http://localhost:3000`

### 3. Create Your First Super Admin

**Important**: You must create a Super Admin first using the script. Super Admin accounts cannot be registered through the web interface.

```bash
# Run the super admin creation script
python create_super_admin.py
```

Follow the prompts to create your super admin account.

### 4. Create Regular Users

1. Open `http://localhost:3000/register`
2. Register with role **Project Lead**, **Project Manager**, or **Developer**
3. **Note**: New users need Super Admin approval before they can login
4. Login as Super Admin and go to "User Approvals" to approve users

### 5. Get Started

1. **Create a Project**: Go to Projects → New Project
2. **Add Developers**: Go to the project detail page → Add Developer (with hourly rate)
3. **Create Tasks**: Add tasks to the project
4. **Log Timesheets**: Go to Timesheets → New Timesheet
5. **Validate Timesheets**: As Project Lead, approve/reject timesheets
6. **Create Payments**: Go to Payments → New Payment → Upload evidence

## Default Roles

- **Super Admin**: Can approve/reject users, full system access (created via script only)
- **Project Manager**: Full access to all features
- **Project Lead**: Can manage projects, validate timesheets, manage payments
- **Developer**: Can view projects, create timesheets, view earnings

## API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

## Troubleshooting

### Backend won't start
- Make sure Python 3.8+ is installed
- Check if port 8000 is available
- Verify all dependencies are installed: `pip install -r requirements.txt`

### Frontend won't start
- Make sure Node.js 16+ is installed
- Check if port 3000 is available
- Delete `node_modules` and run `npm install` again

### Database issues
- The database file (`workhub.db`) is created automatically
- If you need to reset, delete `workhub.db` and restart the backend

