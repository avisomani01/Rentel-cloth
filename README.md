# 👗 Closet Share — Peer-to-Peer Wardrobe Rental Marketplace

[![Python Version](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![Flask Version](https://img.shields.io/badge/Flask-3.0.3-green?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Database](https://img.shields.io/badge/Database-SQLite-lightgrey?logo=sqlite&logoColor=white)](https://www.sqlite.org/)

**Closet Share** is a secure, premium peer-to-peer wardrobe and garment renting marketplace web application. Built on a Python Flask backend, it offers a robust platform for users to list/lend their premium formal attire (dresses, suits, tuxedos) and rent high-quality clothing for weddings, galas, and corporate events.

---

## ✨ Features

### 👤 User & Authentication Features
* **Email Verification (OTP):** New user registration and password recovery are protected by a cryptographically secure 6-digit One-Time Password (OTP) system.
* **Brute-Force Protection:** Temp-lockout protection locks users out for 15 minutes after 5 consecutive failed login attempts.
* **Strict Passwords:** Enforces high password complexity (minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol).
* **Verify Sessions:** Features secure session cookie properties (`HttpOnly`, `SameSite=Lax`) to prevent session hijacking and CSRF threats.

### 👔 Peer-to-Peer Clothing Lending
* **Listing Clothes:** Users can easily catalog their own dresses or suits for rent, complete with size, price per day, category, description, and photo upload.
* **Secure Uploads:** Multi-layer verification checks file formats and sanitizes paths before saving garment images to the server.
* **Dynamic Styling Filters:** Optional CSS filters applied during upload let users render varying colored styles of standard fallback outfits.

### 💳 Rental & Checkout Management
* **Interactive Booking:** Select rental start and end dates with automatic calculation of duration and total costs.
* **Mock Payment Gateways:** Seamless integration supporting simulated credit card and UPI transactions.
* **Personalized Dashboard:** Track rented out orders, active garments listed, total lending revenue, and real-time return countdowns.

### 🛡️ Administration Portal
* **Inventory Control:** Admins can view active marketplace items, add listings, or remove old inventory.
* **Order Tracking:** Monitor rental progress, view total accumulated revenue, and update status logs (`Paid` $\rightarrow$ `Shipped` $\rightarrow$ `Active` $\rightarrow$ `Returned`).

---

## 🛠️ Tech Stack

* **Backend Framework:** [Flask](https://flask.palletsprojects.com/) (v3.0.3)
* **Database ORM:** [SQLAlchemy](https://www.sqlalchemy.org/) (via Flask-SQLAlchemy)
* **Authentication:** [Flask-Login](https://flask-login.readthedocs.io/)
* **Database:** SQLite
* **Styling:** Vanilla HTML5 / CSS3

---

## 📦 Project Structure

```text
├── app.py                  # Core application routing & Flask configuration
├── models.py               # Database schemas (User, Dress, Order)
├── requirements.txt        # Third-party Python dependencies
├── .env.example            # Template for local environment variables
├── .gitignore              # Files and directories excluded from Git
├── static/
│   ├── css/                # Main stylesheet and design system tokens
│   └── assets/             # User-uploaded outfit photos & fallback graphics
├── templates/              # HTML layout templates
│   ├── index.html          # Main landing marketplace catalog
│   ├── login.html          # Register & Sign-in portal
│   ├── dashboard.html      # Customer rentals & earnings console
│   ├── admin_dashboard.html# Administrator operations portal
│   └── ...                 # OTP checks, password resets, and detail pages
└── instance/               # Local SQLite databases (Auto-generated)
```

---

## 🚀 Installation & Local Setup

Follow these instructions to run the project locally on your machine:

### 1. Prerequisites
Ensure you have **Python 3.8+** installed on your system.

### 2. Clone the Repository
```bash
git clone https://github.com/yourusername/closet-share.git
cd closet-share
```

### 3. Create a Virtual Environment
**Windows:**
```powershell
python -m venv .venv
.venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Setup Environment Variables
Copy `.env.example` to a new `.env` file:
```bash
cp .env.example .env
```
Open `.env` and fill in your details:
* **`SECRET_KEY`**: A secure string used for encrypting user sessions.
* **`SMTP_SERVER` & `SMTP_PORT`**: Details for sending registration and reset emails (e.g., `smtp.gmail.com` with port `587`).
* **`SMTP_USERNAME` & `SMTP_PASSWORD`**: Your credentials (if using Gmail, generate a **16-character App Password** in Google settings).

*Note: If no `.env` is configured, registration emails containing OTPs will print to your terminal console instead of sending physically.*

### 6. Run the Application
```bash
python app.py
```
Open your browser and navigate to: **`http://127.0.0.1:5000`**

---

## 📤 How to Upload to GitHub

To publish this project to your own GitHub repository, follow these steps:

### 1. Initialize Git in the Project Folder
Open your terminal (PowerShell, Command Prompt, or Bash) in this project's directory and run:
```bash
git init
```

### 2. Stage All Allowed Files
This command stages all your files. Since we have configured `.gitignore`, your virtual environment (`.venv`), database (`database.db`), and secret configurations (`.env`) will be ignored:
```bash
git add .
```

### 3. Commit the Files
```bash
git commit -m "Initial commit: Closet Share MVP"
```

### 4. Create a New Repository on GitHub
1. Go to [github.com](https://github.com/) and click **New Repository**.
2. Name your repository (e.g., `closet-share`).
3. Leave "Add a README file", "Add .gitignore", and "Choose a license" **unchecked** (as we have already created them).
4. Click **Create repository**.

### 5. Link Local Repository and Push to GitHub
Copy the commands from the GitHub instruction page under *"…or push an existing repository from the command line"*:
```bash
# Rename current default branch to main
git branch -M main

# Link your local repository to GitHub (replace with your actual GitHub URL)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY-NAME.git

# Push your code to the main branch
git push -u origin main
```

---

## 📝 Seeding Admin Credentials
Upon the first initialization, the database is pre-seeded with 12 items and a default Admin Account:
* **Username:** `admin`
* **Password:** `admin`
* **Email:** `admin@clothesrent.com`

*Ensure to update this account password if deployed publicly.*
