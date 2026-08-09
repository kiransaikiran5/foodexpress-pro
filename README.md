# FoodExpress Pro

A full‑stack food delivery platform built with **FastAPI** (Python) and **React** (Vite).  
It covers everything from customer ordering, restaurant management, delivery logistics, to advanced AI‑powered recommendations and platform monitoring.

---

## 🚀 Tech Stack

| Layer        | Technology                                 |
| ------------ | ------------------------------------------ |
| **Backend**  | FastAPI, SQLAlchemy ORM, Pydantic, PyJWT, bcrypt, ReportLab, openpyxl |
| **Frontend** | React (Vite), Tailwind CSS, Axios, Chart.js, Google Maps API |
| **Database** | MySQL                                      |
| **Auth**     | JWT (OAuth2PasswordBearer) + RBAC (4 roles) |

---

## 🎯 Features & Modules

The project contains **50 comprehensive modules**:

| Module | Feature |
|--------|---------|
| 1 | Authentication & User Management (register, login, email verification, RBAC) |
| 2 | Customer Profile Management |
| 3 | Restaurant Registration & Verification |
| 4 | Restaurant Management (hours, cuisines, images, radius) |
| 5 | Menu Management (categories, items, availability) |
| 6 | Food Categories & Customizations (add‑ons, combos) |
| 7 | Cart Management |
| 8 | Order Management (place, cancel, reorder) |
| 9 | Kitchen Order Management |
| 10 | Delivery Partner Management |
| 11 | Live Order Tracking (Google Maps) |
| 12 | Payment Management (cards, UPI, COD, wallet) |
| 13 | Wallet & Rewards |
| 14 | Coupons & Promotions |
| 15 | Reviews & Ratings |
| 16 | Notifications System |
| 17 | In‑App Chat |
| 18 | AI Food Recommendation Engine |
| 19 | AI Customer Support Chatbot |
| 20 | Restaurant Dashboard |
| 21 | Delivery Dashboard |
| 22 | Customer Dashboard |
| 23 | Admin Dashboard |
| 24 | Inventory & Ingredient Management |
| 25 | Reports & Analytics |
| 26 | Refund & Cancellation Management |
| 27 | Multi‑Branch Restaurant Management |
| 28 | Audit Logs & Security |
| 29 | Business Intelligence Dashboard |
| 30 | System Settings & Platform Management |
| 31 | Scheduled Food Ordering |
| 32 | Group Ordering System |
| 33 | Restaurant Table Reservation |
| 34 | Smart Delivery Assignment |
| 35 | Route Optimization |
| 36 | Real‑Time Delivery Tracking Enhancements |
| 37 | Restaurant Performance Dashboard |
| 38 | AI Demand Prediction |
| 39 | Smart Inventory Automation |
| 40 | Restaurant Staff Management |
| 41 | Delivery Partner Earnings Management |
| 42 | Customer Membership Plans |
| 43 | Advanced Coupon Engine |
| 44 | AI Customer Recommendation Dashboard |
| 45 | Complaint & Support Management |
| 46 | Push Notifications & Marketing Campaigns |
| 47 | Financial Dashboard |
| 48 | Business Intelligence & AI Analytics |
| 49 | Super Admin Control Center |
| 50 | Platform Monitoring & Security |

---

## 📁 Project Structure

```
foodexpress-pro/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/              # API routers
│   │   ├── models/              # SQLAlchemy database models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── utils/               # Helper utilities
│   │   │   ├── file_upload.py   # File upload helpers
│   │   │   ├── audit.py         # Audit logging helpers
│   │   │   └── assignment.py    # Delivery assignment helpers
│   │   └── main.py              # FastAPI application entry point
│   ├── requirements.txt         # Backend dependencies
│   └── .env.example             # Backend environment variables
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # Customer, admin, owner & delivery pages
│   │   ├── store/               # Auth, cart & notification contexts
│   │   └── services/            # Axios API client and services
│   ├── package.json             # Frontend dependencies & scripts
│   └── .env.example             # Frontend environment variables
│
├── .gitignore
└── README.md
```

---

## 🔧 Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8

### Backend

1. **Navigate to the backend folder**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   - Copy the example file:  
     `cp .env.example .env` (or manually copy on Windows)
   - Fill in your MySQL credentials, JWT secret, email credentials, etc.

5. **Create the database**
   - Create a MySQL database (e.g., `foodexpress`).
   - The tables will be created automatically by SQLAlchemy on first run (if `create_all` is enabled), or run the provided SQL scripts.

6. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

### Frontend

1. **Navigate to the frontend folder**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env` and adjust `VITE_API_BASE_URL` if needed (default is `http://localhost:8000/api/v1`).
   - Add your Google Maps API key.

4. **Start the dev server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173`.

---

## 🧪 Test Accounts (seeded)

| Role              | Email                  | Password   |
| ----------------- | ---------------------- | ---------- |
| Admin             | `admin@gmail.com`      | `admin123` |
| Restaurant Owner  | `owner@test.com`       | `owner123` |
| Delivery Partner  | `driver@test.com`      | `driver123`|
| Customer          | `customer@test.com`    | `cust123`  |

> Note: Adjust these if you changed the seed data.

---

## 🌍 Environment Variables

All required variables are listed in `backend/.env.example` and `frontend/.env.example`.  
The most important ones:

- `DATABASE_URL` – MySQL connection string
- `SECRET_KEY` – JWT signing key
- `SMTP_*` – Email credentials for password reset, etc.
- `VITE_GOOGLE_MAPS_API_KEY` – Google Maps API key
