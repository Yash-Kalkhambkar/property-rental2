# 🏠 Property Rental Management System

A full-stack property management platform for landlords and tenants, making rental management simple and efficient.

## 🌐 Live Demo

- **Frontend:** https://property-rental2.vercel.app
- **Backend API:** https://property-rental2.onrender.com
- **API Docs:** https://property-rental2.onrender.com/docs

## Demo Accounts

**Owner Login:**
- Email: `yash@gmail.com`
- Password: `yash@123`

**Tenant Login:**
- Email: `veda@gmail.com` 
- Password: `veda@123`

## ✨ Features

### For Property Owners
- Manage multiple properties and units
- Track tenants and lease agreements
- Monitor rent payments and due dates
- View revenue analytics and dashboard
- AI-powered chat assistant for quick insights

### For Tenants
- View lease details and property information
- Track payment history
- Access rent receipts
- Secure tenant portal

## 🛠️ Tech Stack

**Frontend:**
- React + TypeScript
- TanStack Router & Query
- Tailwind CSS + shadcn/ui
- Recharts for analytics

**Backend:**
- FastAPI (Python)
- PostgreSQL (Neon)
- SQLAlchemy ORM
- JWT Authentication
- Alembic migrations

**AI & Services:**
- Groq AI for chat functionality
- Resend for email notifications
- APScheduler for automated tasks

**Deployment:**
- Frontend: Vercel
- Backend: Render
- Database: Neon (PostgreSQL)

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# Run migrations
alembic upgrade head

# Seed demo data (optional)
python seed_production_data.py

# Start server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your backend URL

# Start dev server
npm run dev
```

## 📝 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
GROQ_API_KEY=your-groq-key
RESEND_API_KEY=your-resend-key
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── models/       # Database models
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic
│   │   └── core/         # Config & auth
│   └── alembic/          # Database migrations
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── routes/       # Pages
│   │   └── api/          # API client
│   └── public/
```

## 🔒 Security

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Role-based access control (Owner/Tenant)
- SQL injection prevention via ORM
- CORS protection

## 📊 Database Schema

6 main tables:
- **owners** - Property owner accounts
- **properties** - Property information
- **units** - Individual rental units
- **tenants** - Tenant profiles
- **leases** - Rental agreements
- **payments** - Payment tracking

## 🤝 Contributing

This is a portfolio project, but feel free to fork and adapt it for your needs!

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

---

Built with ❤️ by [Yash Kalkhambkar](https://github.com/Yash-Kalkhambkar)
