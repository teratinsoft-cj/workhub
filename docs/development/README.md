# Development Documentation

This directory contains development guides and quick start documentation.

## 📄 Documentation Files

### [Quick Start Guide](./quickstart.md)
Getting started guide for developers.

**Covers:**
- Project setup
- Installation
- Running the application
- Development workflow

## 🛠️ Development Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- PostgreSQL (for production) or SQLite (for development)

### Quick Setup

1. **Clone the repository**
2. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   ```

4. **Run development servers:**
   ```bash
   # Backend (from backend/)
   uvicorn main:app --reload
   
   # Frontend (from frontend/)
   npm run dev
   ```

## 📚 Additional Resources

- **Main README:** [../README.md](../README.md)
- **Database Setup:** [../database/postgresql-setup.md](../database/postgresql-setup.md)
- **Deployment:** [../deployment/guide.md](../deployment/guide.md)

---

**For production deployment, see [Deployment Documentation](../deployment/)**

