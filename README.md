# WorkHub - Project Management System

A comprehensive project management platform for managing projects, developers, timesheets, and payments. Built with FastAPI backend and React frontend with Tailwind CSS.

## Features

- **Project Management**: Create and manage projects from startup companies
- **Developer Management**: Add developers to projects with hourly rates
- **Task Management**: Create and track tasks within projects
- **Timesheet Entry**: Developers and project leads can log their work hours
- **Timesheet Validation**: Project leads can approve/reject timesheets
- **Payment Management**: Track payments with evidence upload
- **Earnings Tracking**: Developers can view their earnings and payment status
- **Role-Based Access**: Three roles - Project Manager, Project Lead, and Developer

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy (ORM)
- Alembic (Database Migrations)
- SQLite (can be changed to PostgreSQL)
- JWT Authentication
- Python 3.8+

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- React Hot Toast

## Project Structure

```
workhub/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Authentication utilities
│   ├── alembic/             # Alembic migration files
│   │   ├── env.py           # Alembic environment config
│   │   └── versions/        # Migration files
│   ├── alembic.ini          # Alembic configuration
│   ├── run_migrations.py    # Migration helper script
│   └── routers/             # API route handlers
│       ├── auth.py
│       ├── projects.py
│       ├── developers.py
│       ├── tasks.py
│       ├── timesheets.py
│       └── payments.py
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── requirements.txt
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the project root directory:
```bash
cd workhub
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install backend dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file in the root directory (optional, defaults to SQLite):
```env
DATABASE_URL=sqlite:///./workhub.db
SECRET_KEY=your-secret-key-change-this-in-production
```

6. Run the backend server:
```bash
cd backend
python main.py
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

### Creating Your First Super Admin

**Important**: Super Admin accounts cannot be created through the registration form. You must use the provided script.

1. **Run the Super Admin creation script**:
   ```bash
   # On Windows
   python create_super_admin.py
   
   # On Linux/Mac
   python3 create_super_admin.py
   ```
   
   Or use the convenience scripts:
   ```bash
   # Windows
   create_super_admin.bat
   
   # Linux/Mac
   chmod +x create_super_admin.sh
   ./create_super_admin.sh
   ```

2. **Follow the prompts** to enter:
   - Username
   - Email
   - Full Name
   - Password

3. **Alternative: Use command-line arguments**:
   ```bash
   python create_super_admin.py --username admin --email admin@workhub.com --full-name "Admin User" --password yourpassword
   ```

4. **Login** with the super admin credentials at `http://localhost:3000/login`

### Creating Regular Users

1. Start both backend and frontend servers
2. Navigate to `http://localhost:3000/register`
3. Register a new user with role:
   - **Project Manager** or **Project Lead** - Can create projects, manage developers, validate timesheets, and manage payments
   - **Developer** - Can view assigned projects, create timesheets, and view earnings
4. **Wait for Super Admin approval** - New users must be approved by a Super Admin before they can login
5. **Super Admin approves users** - Login as super admin and go to "User Approvals" page to approve pending users

### Workflow

1. **Project Lead/Manager**:
   - Create a new project
   - Add developers to the project with hourly rates
   - Create tasks for the project
   - Validate timesheets submitted by developers
   - Create payments and upload evidence

2. **Developer**:
   - View assigned projects
   - Create timesheets for work done
   - View earnings and payment status

## API Documentation

Once the backend is running, you can access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Database

The application uses SQLite by default. The database file (`workhub.db`) will be created automatically on first run.

### Database Migrations with Alembic

This project uses **Alembic** for database migrations. See [ALEMBIC_GUIDE.md](ALEMBIC_GUIDE.md) for detailed instructions.

#### Quick Start

**For new installations:**
```bash
# Create initial migration
create_initial_migration.bat  # Windows
./create_initial_migration.sh  # Linux/Mac

# Apply migrations
run_migrations.bat upgrade  # Windows
./run_migrations.sh upgrade  # Linux/Mac
```

**For existing databases:**
If you have an existing database, set up Alembic and stamp it:
```bash
create_initial_migration.bat
cd backend
alembic stamp head  # Mark current state as up-to-date
```

**Creating new migrations:**
When you modify models, create a migration:
```bash
run_migrations.bat create --message "Description of changes"
run_migrations.bat upgrade
```

For more details, see [ALEMBIC_GUIDE.md](ALEMBIC_GUIDE.md).

### PostgreSQL

To use PostgreSQL instead:
1. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost/workhub
   ```
2. Make sure PostgreSQL is installed and running

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=sqlite:///./workhub.db
SECRET_KEY=your-secret-key-change-this-in-production
```

**Important**: Change the `SECRET_KEY` in production!

## Production Deployment

### Backend
- Use a production ASGI server like `uvicorn` with multiple workers
- Set up proper database (PostgreSQL recommended)
- Configure CORS for your frontend domain
- Use environment variables for sensitive data
- Enable HTTPS

### Frontend
- Build the production bundle:
  ```bash
  npm run build
  ```
- Serve the `dist` folder using a web server (nginx, Apache, etc.)

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please create an issue in the repository.

