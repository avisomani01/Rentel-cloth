import os
import re
import secrets
import hmac
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from flask import Flask, render_template, redirect, url_for, request, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from dotenv import load_dotenv
from models import db, User, Dress, Order

# Load environment variables from .env file
load_dotenv()


app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'supersecret_premium_key_2026_default_fallback_change_me')

# Set secure session cookie flags to prevent session hijacking and CSRF
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Brevo API Configuration
app.config['BREVO_API_KEY'] = os.environ.get('BREVO_API_KEY')
app.config['BREVO_SENDER_EMAIL'] = os.environ.get('BREVO_SENDER_EMAIL', 'no-reply@closetshare.com')
app.config['BREVO_SENDER_NAME'] = os.environ.get('BREVO_SENDER_NAME', 'Closet Share')

def generate_otp():
    # Cryptographically secure random 6 digit OTP
    digits = [str(secrets.randbelow(10)) for _ in range(6)]
    return "".join(digits)

def send_otp_email(to_email, otp, purpose="register"):
    brevo_api_key = os.environ.get('BREVO_API_KEY') or app.config.get('BREVO_API_KEY')
    brevo_sender_email = os.environ.get('BREVO_SENDER_EMAIL') or app.config.get('BREVO_SENDER_EMAIL') or 'no-reply@closetshare.com'
    brevo_sender_name = os.environ.get('BREVO_SENDER_NAME') or app.config.get('BREVO_SENDER_NAME') or 'Closet Share'
    
    if purpose == "reset":
        subject = "OTP Code for Closet Share - Reset"
    else:
        subject = "OTP Code for Closet Share - Register"
        
    body = f"""Hello,

Your verification code (OTP) for Closet Share is:

==========================
          {otp}
==========================

This OTP is valid for 5 minutes.
If you did not request this code, you can safely ignore this email.

Warm regards,
Closet Share Team
"""
    
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": brevo_api_key or "",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    data = {
        "sender": {
            "name": brevo_sender_name,
            "email": brevo_sender_email
        },
        "to": [
            {
                "email": to_email
            }
        ],
        "subject": subject,
        "textContent": body
    }
    
    try:
        if not brevo_api_key:
            raise ValueError("BREVO_API_KEY environment variable is not set.")
            
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            return True
            
    except urllib.error.HTTPError as e:
        status_code = e.code
        try:
            error_response = e.read().decode('utf-8')
        except Exception:
            error_response = "Could not read error response body"
            
        print("\n" + "="*60)
        print(f"  [BREVO API EMAIL SENDING HTTP ERROR]")
        print(f"  Recipient: {to_email}")
        print(f"  HTTP Status Code: {status_code}")
        print(f"  Brevo Error Response: {error_response}")
        print("="*60 + "\n")
        return False
        
    except Exception as e:
        print("\n" + "="*60)
        print(f"  [BREVO API EMAIL SENDING GENERAL ERROR]")
        print(f"  Recipient: {to_email}")
        print(f"  Error details: {e}")
        print("="*60 + "\n")
        return False
# Setup SQLite Database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

with app.app_context():
    # Dynamic DB Migration Helper for SQLite
    try:
        from sqlalchemy import text
        conn = db.engine.connect()
        result = conn.execute(text("PRAGMA table_info(user)")).fetchall()
        existing_cols = [row[1] for row in result]
        
        if existing_cols:
            if 'email' not in existing_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN email VARCHAR(150)"))
            if 'is_verified' not in existing_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
            if 'otp' not in existing_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN otp VARCHAR(10)"))
            if 'otp_expiry' not in existing_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN otp_expiry DATETIME"))
            if 'otp_attempts' not in existing_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN otp_attempts INTEGER DEFAULT 0"))
            if 'otp_last_sent' not in existing_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN otp_last_sent DATETIME"))
            conn.commit()
        conn.close()
    except Exception as e:
        print(f"Migration warning: {e}")

    db.create_all()
    # Seed the database with initial dresses if empty
    if not Dress.query.first():
        dresses = [
            Dress(name='Midnight Gala Gown', description='A stunning elegant evening gown.', price_per_day=4500.0, image_file='dress_premium.png', css_filter=''),
            Dress(name='Classic Tailored Suit', description='A sharp suit for executive meetings.', price_per_day=3200.0, image_file='suit_premium.png', css_filter=''),
            Dress(name='Emerald Silk Slip', description='Minimalist luxury for any occasion.', price_per_day=2800.0, image_file='dress_premium.png', css_filter=''),
            Dress(name='Velvet Tuxedo', description='Stand out with a deep black velvet tux.', price_per_day=5500.0, image_file='suit_premium.png', css_filter=''),
            Dress(name='Royal Indigo Sherwani', description='Traditional luxury suit crafted from pure silk.', price_per_day=6000.0, image_file='suit_premium.png', css_filter=''),
            Dress(name='Golden Shimmer Sari', description='A heavily embroidered designer sari with gold accents.', price_per_day=4800.0, image_file='dress_premium.png', css_filter=''),
            Dress(name='Ruby Crimson Blazer', description='A striking scarlet blazer for formal events.', price_per_day=3500.0, image_file='suit_premium.png', css_filter=''),
            Dress(name='Sapphire Evening Dress', description='A deep blue gown that catches the light beautifully.', price_per_day=4200.0, image_file='dress_premium.png', css_filter=''),
            Dress(name='Ivory Wedding Tux', description='Pristine white tuxedo set for wedding celebrations.', price_per_day=5800.0, image_file='suit_premium.png', css_filter=''),
            Dress(name='Rose Gold Prom Dress', description='Elegant flowing silhouette in soft rose gold colors.', price_per_day=3900.0, image_file='dress_premium.png', css_filter=''),
            Dress(name='Champagne Silk Gown', description='Liquid gold styling with soft drape detailing.', price_per_day=5000.0, image_file='dress_premium.png', css_filter=''),
            Dress(name='Charcoal Executive Suit', description='Deep gray tailored wool blend formal wear.', price_per_day=3400.0, image_file='suit_premium.png', css_filter='')
        ]
        db.session.bulk_save_objects(dresses)
        
        # Create an admin user for testing
        hashed_password = generate_password_hash('admin', method='pbkdf2:sha256')
        admin = User(username='admin', email='admin@clothesrent.com', password=hashed_password, role=1, is_verified=True)
        db.session.add(admin)
        db.session.commit()
    else:
        # Ensure existing admin is verified and has a dummy email
        admin = User.query.filter_by(username='admin').first()
        if admin:
            if not admin.email:
                admin.email = 'admin@clothesrent.com'
            admin.is_verified = True
            db.session.commit()

@app.route('/')
def index():
    dresses = Dress.query.order_by(Dress.id.desc()).limit(6).all()
    has_more = Dress.query.count() > 6
    return render_template('index.html', dresses=dresses, has_more=has_more)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if action == 'register':
            if not username or not email or not password:
                flash('All fields (username, email, password) are required for registration.')
                return render_template('login.html')
                
            user_by_username = User.query.filter_by(username=username).first()
            user_by_email = User.query.filter_by(email=email).first()
            
            if user_by_username and user_by_username.is_verified:
                flash('Username already exists.')
                return render_template('login.html')
            if user_by_email and user_by_email.is_verified:
                flash('Email already exists.')
                return render_template('login.html')
                
            # Password complexity check (min 8 chars, 1 upper, 1 lower, 1 digit, 1 special symbol)
            password_pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
            if not re.match(password_pattern, password):
                flash('Security Requirement: Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&).')
                return render_template('login.html')
            
            user = None
            if user_by_email and not user_by_email.is_verified:
                user = user_by_email
            elif user_by_username and not user_by_username.is_verified:
                user = user_by_username
                
            otp_code = generate_otp()
            now = datetime.utcnow()
            
            # Cooldown check: if OTP was sent recently (< 60 seconds ago)
            if user and user.otp_last_sent and (now - user.otp_last_sent) < timedelta(seconds=60):
                time_left = 60 - int((now - user.otp_last_sent).total_seconds())
                flash(f'Please wait {time_left} seconds before requesting another OTP.')
                session['pending_user_id'] = user.id
                return redirect(url_for('verify_otp'))
                
            if not user:
                user = User(username=username, email=email)
                db.session.add(user)
                
            user.username = username
            user.email = email
            user.password = generate_password_hash(password, method='pbkdf2:sha256')
            user.is_verified = False
            user.otp = otp_code
            user.otp_expiry = now + timedelta(minutes=5)
            user.otp_attempts = 0
            user.otp_last_sent = now
            db.session.commit()
            
            send_otp_email(email, otp_code, purpose="register")
            session['pending_user_id'] = user.id
            flash('An OTP has been sent to your email. Please verify to activate your account.')
            return redirect(url_for('verify_otp'))
                
        elif action == 'login':
            if not username or not password:
                flash('Username/Email and Password are required.')
                return render_template('login.html')
                
            # Allow login by either username or email
            user = User.query.filter((User.username == username) | (User.email == username)).first()
            if user:
                # Check for active lockout
                if user.lockout_until and user.lockout_until > datetime.utcnow():
                    time_left = user.lockout_until - datetime.utcnow()
                    minutes_left = int(time_left.total_seconds() / 60) + 1
                    flash(f'Security Lockout: Account temporarily locked due to failed attempts. Try again in {minutes_left} minute(s).')
                    return render_template('login.html')
                
                # Check if account is verified
                if not user.is_verified:
                    now = datetime.utcnow()
                    if not user.otp_last_sent or (now - user.otp_last_sent) >= timedelta(seconds=60):
                        otp_code = generate_otp()
                        user.otp = otp_code
                        user.otp_expiry = now + timedelta(minutes=5)
                        user.otp_attempts = 0
                        user.otp_last_sent = now
                        db.session.commit()
                        send_otp_email(user.email, otp_code, purpose="register")
                        flash('Your account is not verified yet. A new OTP has been sent to your email.')
                    else:
                        flash('Your account is not verified yet. Please enter the OTP sent to your email.')
                    session['pending_user_id'] = user.id
                    return redirect(url_for('verify_otp'))
                
                if check_password_hash(user.password, password):
                    user.failed_login_attempts = 0
                    user.lockout_until = None
                    db.session.commit()
                    login_user(user)
                    return redirect(request.args.get('next') or url_for('index'))
                else:
                    user.failed_login_attempts += 1
                    if user.failed_login_attempts >= 5:
                        user.lockout_until = datetime.utcnow() + timedelta(minutes=15)
                        flash('Security Lockout: Too many failed login attempts. Account locked for 15 minutes.')
                    else:
                        flash(f'Invalid credentials. {5 - user.failed_login_attempts} attempts remaining before account lockout.')
                    db.session.commit()
            else:
                flash('Invalid credentials.')
                
    return render_template('login.html')

@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    pending_id = session.get('pending_user_id')
    if not pending_id:
        flash("No active verification session found. Please register or log in.")
        return redirect(url_for('login'))
        
    user = User.query.get(pending_id)
    if not user:
        flash("User not found.")
        return redirect(url_for('login'))
        
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'resend':
            now = datetime.utcnow()
            if user.otp_last_sent and (now - user.otp_last_sent) < timedelta(seconds=60):
                time_left = 60 - int((now - user.otp_last_sent).total_seconds())
                flash(f"Please wait {time_left} seconds before requesting a new OTP.")
                return render_template('verify_otp.html', email=user.email)
                
            otp_code = generate_otp()
            user.otp = otp_code
            user.otp_expiry = now + timedelta(minutes=5)
            user.otp_attempts = 0
            user.otp_last_sent = now
            db.session.commit()
            
            send_otp_email(user.email, otp_code, purpose="register")
            flash("A new OTP has been sent to your email.")
            return render_template('verify_otp.html', email=user.email)
            
        otp_entered = request.form.get('otp')
        if not otp_entered:
            otp_parts = [request.form.get(f'otp_{i}', '') for i in range(1, 7)]
            otp_entered = "".join(otp_parts)
            
        if not otp_entered or len(otp_entered) != 6:
            flash("Please enter a valid 6-digit OTP code.")
            return render_template('verify_otp.html', email=user.email)
            
        now = datetime.utcnow()
        
        if user.otp_attempts >= 3:
            flash("This OTP has been invalidated due to too many failed attempts. Please request a new one.")
            return render_template('verify_otp.html', email=user.email)
            
        if not user.otp_expiry or user.otp_expiry < now:
            flash("The OTP has expired. Please request a new code.")
            return render_template('verify_otp.html', email=user.email)
            
        if user.otp and hmac.compare_digest(user.otp, otp_entered):
            user.is_verified = True
            user.otp = None
            user.otp_expiry = None
            user.otp_attempts = 0
            user.failed_login_attempts = 0
            user.lockout_until = None
            db.session.commit()
            
            login_user(user)
            session.pop('pending_user_id', None)
            flash("Account successfully verified and logged in!")
            return redirect(url_for('index'))
        else:
            user.otp_attempts += 1
            attempts_remaining = 3 - user.otp_attempts
            db.session.commit()
            
            if user.otp_attempts >= 3:
                user.otp = None
                user.otp_expiry = None
                db.session.commit()
                flash("Too many incorrect attempts. This OTP has been invalidated. Please request a new one.")
            else:
                flash(f"Incorrect OTP. {attempts_remaining} attempt(s) remaining.")
                
    return render_template('verify_otp.html', email=user.email)

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get('email')
        user = User.query.filter_by(email=email).first()
        
        if user and user.is_verified:
            now = datetime.utcnow()
            if user.otp_last_sent and (now - user.otp_last_sent) < timedelta(seconds=60):
                time_left = 60 - int((now - user.otp_last_sent).total_seconds())
                flash(f"Please wait {time_left} seconds before requesting a new OTP.")
                session['reset_email'] = email
                return redirect(url_for('reset_password'))
                
            otp_code = generate_otp()
            user.otp = otp_code
            user.otp_expiry = now + timedelta(minutes=5)
            user.otp_attempts = 0
            user.otp_last_sent = now
            db.session.commit()
            
            send_otp_email(email, otp_code, purpose="reset")
            session['reset_email'] = email
            flash("A password reset OTP has been sent to your email.")
            return redirect(url_for('reset_password'))
        else:
            flash("If the email is registered and verified, a password reset code has been sent.")
            return redirect(url_for('login'))
            
    return render_template('forgot_password.html')

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    reset_email = session.get('reset_email')
    if not reset_email:
        flash("No active reset session. Please enter your email.")
        return redirect(url_for('forgot_password'))
        
    user = User.query.filter_by(email=reset_email).first()
    if not user or not user.is_verified:
        flash("User not found or unverified.")
        return redirect(url_for('login'))
        
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'resend':
            now = datetime.utcnow()
            if user.otp_last_sent and (now - user.otp_last_sent) < timedelta(seconds=60):
                time_left = 60 - int((now - user.otp_last_sent).total_seconds())
                flash(f"Please wait {time_left} seconds before requesting a new OTP.")
                return render_template('reset_password.html', email=reset_email)
                
            otp_code = generate_otp()
            user.otp = otp_code
            user.otp_expiry = now + timedelta(minutes=5)
            user.otp_attempts = 0
            user.otp_last_sent = now
            db.session.commit()
            
            send_otp_email(reset_email, otp_code, purpose="reset")
            flash("A new password reset OTP has been sent to your email.")
            return render_template('reset_password.html', email=reset_email)
            
        otp_entered = request.form.get('otp')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not otp_entered or not password or not confirm_password:
            flash("All fields are required.")
            return render_template('reset_password.html', email=reset_email)
            
        if password != confirm_password:
            flash("Passwords do not match.")
            return render_template('reset_password.html', email=reset_email)
            
        # Password complexity check
        password_pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
        if not re.match(password_pattern, password):
            flash('Security Requirement: Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&).')
            return render_template('reset_password.html', email=reset_email)
            
        now = datetime.utcnow()
        
        if user.otp_attempts >= 3:
            flash("This OTP has been invalidated due to too many failed attempts. Please request a new one.")
            return render_template('reset_password.html', email=reset_email)
            
        if not user.otp_expiry or user.otp_expiry < now:
            flash("The OTP has expired. Please request a new code.")
            return render_template('reset_password.html', email=reset_email)
            
        if user.otp and hmac.compare_digest(user.otp, otp_entered):
            user.password = generate_password_hash(password, method='pbkdf2:sha256')
            user.otp = None
            user.otp_expiry = None
            user.otp_attempts = 0
            user.failed_login_attempts = 0
            user.lockout_until = None
            db.session.commit()
            
            session.pop('reset_email', None)
            flash("Password has been reset successfully! You can now log in.")
            return redirect(url_for('login'))
        else:
            user.otp_attempts += 1
            attempts_remaining = 3 - user.otp_attempts
            db.session.commit()
            
            if user.otp_attempts >= 3:
                user.otp = None
                user.otp_expiry = None
                db.session.commit()
                flash("Too many incorrect attempts. This OTP has been invalidated. Please request a new one.")
            else:
                flash(f"Incorrect OTP. {attempts_remaining} attempt(s) remaining.")
                
    return render_template('reset_password.html', email=reset_email)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dress/<int:dress_id>')
def detail(dress_id):
    dress = Dress.query.get_or_404(dress_id)
    return render_template('detail.html', dress=dress)

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/collection')
def collection_all():
    dresses = Dress.query.order_by(Dress.id.desc()).all()
    return render_template('collection_all.html', dresses=dresses)

@app.route('/dashboard')
@login_required
def dashboard():
    all_orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.date_rented.desc()).all()
    active_orders = [o for o in all_orders if o.status in ('Paid', 'Active', 'Shipped')]
    active_rentals_count = len(active_orders)
    total_rentals_count = len(all_orders)
    
    nearest_return_days = None
    today = datetime.utcnow().date()
    for o in active_orders:
        if o.end_date:
            days = (o.end_date.date() - today).days
            if nearest_return_days is None or days < nearest_return_days:
                nearest_return_days = days
                
    # Peer-to-peer wardrobe lending metrics
    listed_garments = Dress.query.filter_by(owner_id=current_user.id).order_by(Dress.id.desc()).all()
    lending_orders = Order.query.join(Dress).filter(Dress.owner_id == current_user.id).all()
    lending_earnings = sum(o.total_price for o in lending_orders if o.total_price is not None)
                
    return render_template('dashboard.html', 
                           all_orders=all_orders, 
                           active_orders=active_orders,
                           active_rentals_count=active_rentals_count,
                           total_rentals_count=total_rentals_count,
                           nearest_return_days=nearest_return_days,
                           listed_garments=listed_garments,
                           lending_earnings=lending_earnings,
                           lending_orders=lending_orders)

@app.route('/return_order/<int:order_id>', methods=['POST'])
@login_required
def return_order(order_id):
    order = Order.query.get_or_404(order_id)
    if order.user_id != current_user.id:
        flash("Unauthorized action.")
        return redirect(url_for('dashboard'))
    
    order.status = 'Returned'
    db.session.commit()
    flash(f"Return label generated for {order.dress.name}! Place it in the mail shortly.")
    return redirect(url_for('dashboard'))

@app.route('/admin')
@login_required
def admin_dashboard():
    if current_user.role != 1:
        flash("Access denied. Admin credentials required.")
        return redirect(url_for('index'))
        
    dresses = Dress.query.order_by(Dress.id.desc()).all()
    all_orders = Order.query.order_by(Order.date_rented.desc()).all()
    
    total_revenue = sum(o.total_price for o in all_orders if o.total_price is not None)
    active_rentals = Order.query.filter(Order.status.in_(['Paid', 'Active', 'Shipped'])).count()
    inventory_count = len(dresses)
    user_count = User.query.count()
    
    return render_template('admin_dashboard.html', 
                           dresses=dresses,
                           all_orders=all_orders,
                           total_revenue=total_revenue,
                           active_rentals=active_rentals,
                           inventory_count=inventory_count,
                           user_count=user_count)

@app.route('/admin/delete_dress/<int:dress_id>')
@login_required
def delete_dress(dress_id):
    if current_user.role != 1:
        flash("Access denied.")
        return redirect(url_for('index'))
        
    dress = Dress.query.get_or_404(dress_id)
    Order.query.filter_by(dress_id=dress.id).delete()
    db.session.delete(dress)
    db.session.commit()
    flash(f"Removed {dress.name} from inventory.")
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/update_order_status/<int:order_id>/<string:status>')
@login_required
def update_order_status(order_id, status):
    if current_user.role != 1:
        flash("Access denied.")
        return redirect(url_for('index'))
        
    order = Order.query.get_or_404(order_id)
    order.status = status
    db.session.commit()
    flash(f"Order #{order.id} status updated to {status}.")
    return redirect(url_for('admin_dashboard'))

@app.route('/add_dress', methods=['GET', 'POST'])
@login_required
def add_dress():
    if current_user.role != 1:
        flash("Access denied.")
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description')
        price = float(request.form.get('price'))
        image_type = request.form.get('image_type')
        color = request.form.get('color')
        
        css_filter = ''
        if color == 'blue': css_filter = 'filter: hue-rotate(180deg);'
        elif color == 'red': css_filter = 'filter: hue-rotate(-90deg);'
        
        new_dress = Dress(name=name, description=description, price_per_day=price, image_file=image_type, css_filter=css_filter)
        db.session.add(new_dress)
        db.session.commit()
        flash('Dress added successfully!')
        return redirect(url_for('admin_dashboard'))
        
    return render_template('add_item.html')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/lend', methods=['GET', 'POST'])
@login_required
def lend_clothes():
    if request.method == 'POST':
        name = request.form.get('name')
        category = request.form.get('category')
        price_val = request.form.get('price')
        price = float(price_val) if price_val else 0.0
        description = request.form.get('description')
        
        # Handle file upload
        file = request.files.get('image')
        if file and file.filename != '':
            if not allowed_file(file.filename):
                flash("Security Error: Invalid file format. Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed.")
                return redirect(url_for('lend_clothes'))
            
            from werkzeug.utils import secure_filename
            import uuid
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            # Ensure assets directory exists
            assets_dir = os.path.join('static', 'assets')
            if not os.path.exists(assets_dir):
                os.makedirs(assets_dir)
            file.save(os.path.join(assets_dir, unique_filename))
            image_file = unique_filename
        else:
            # Select premium asset fallback based on category keyword matching
            cat_lower = (category or '').lower()
            suit_keywords = ['suit', 'tux', 'blazer', 'sherwani', 'jacket', 'coat', 'men']
            if any(kw in cat_lower for kw in suit_keywords):
                image_file = 'suit_premium.png'
            else:
                image_file = 'dress_premium.png'
        
        # Original image of clothe, no css color styling filter
        css_filter = ''
            
        new_dress = Dress(
            name=name,
            description=description,
            price_per_day=price,
            image_file=image_file,
            css_filter=css_filter,
            owner_id=current_user.id
        )
        db.session.add(new_dress)
        db.session.commit()
        flash('Your outfit has been listed successfully!')
        return redirect(url_for('dashboard'))
        
    return render_template('lend.html')

@app.route('/checkout/<int:dress_id>', methods=['GET', 'POST'])
@login_required
def checkout(dress_id):
    dress = Dress.query.get_or_404(dress_id)
    if dress.owner_id == current_user.id:
        flash("You cannot rent your own listed garment.")
        return redirect(url_for('detail', dress_id=dress.id))
    
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    size = request.args.get('size', 'S')
    
    if not start_date_str or not end_date_str:
        return redirect(url_for('detail', dress_id=dress_id))
        
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
    except ValueError:
        return redirect(url_for('detail', dress_id=dress_id))
        
    duration = (end_date - start_date).days
    if duration < 1:
        duration = 1
    total_price = (dress.price_per_day * duration) + 15.0
    
    if request.method == 'POST':
        card_number = request.form.get('card_number')
        payment_method = request.form.get('payment_method', 'card')
        
        if payment_method == 'upi' or (card_number and len(card_number.replace(' ', '')) >= 14):
            new_order = Order(
                user_id=current_user.id,
                dress_id=dress.id,
                start_date=start_date,
                end_date=end_date,
                total_price=total_price,
                status='Paid'
            )
            db.session.add(new_order)
            db.session.commit()
            return render_template('success.html', dress=dress)
        else:
            flash('Invalid Card Details.')
            
    return render_template('checkout.html', 
                           dress=dress,
                           start_date=start_date_str,
                           end_date=end_date_str,
                           start_date_formatted=start_date.strftime('%B %d, %Y'),
                           end_date_formatted=end_date.strftime('%B %d, %Y'),
                           duration=duration,
                           total_price=total_price,
                           size=size)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
