import os
import re
import secrets
import hmac
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from flask import Flask, render_template, redirect, url_for, request, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from dotenv import load_dotenv
from flask_cors import CORS
from models import db, User, Dress, Order

# Load environment variables from .env file
load_dotenv()


app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'supersecret_premium_key_2026_default_fallback_change_me')

# Set secure session cookie flags to prevent session hijacking and CSRF
database_url = os.environ.get("DATABASE_URL")
if database_url:
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'
    app.config['SESSION_COOKIE_SECURE'] = True
else:
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Configure CORS securely
allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

CORS(app, supports_credentials=True, origins=allowed_origins)

from flask import url_for as flask_url_for

def smart_url_for(endpoint, **values):
    if endpoint == 'static' and 'filename' in values:
        filename = values['filename']
        if filename.startswith('assets/http://') or filename.startswith('assets/https://'):
            return filename.replace('assets/', '', 1)
    return flask_url_for(endpoint, **values)

@app.context_processor
def inject_smart_url_for():
    return dict(url_for=smart_url_for)

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
# Database Configuration (PostgreSQL on Render, SQLite locally)
database_url = os.environ.get("DATABASE_URL")
if database_url:
    # Handle Render's legacy postgres:// prefix
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def generate_virtual_3d_image(filename, category):
    try:
        from PIL import Image
        import os
        import shutil
        
        assets_dir = os.path.join('static', 'assets')
        input_path = os.path.join(assets_dir, filename)
        if not os.path.exists(input_path):
            return filename
            
        template_path = os.path.join(assets_dir, 'mannequin_torso_template.png')
        if not os.path.exists(template_path):
            return filename
            
        template = Image.open(template_path).convert("RGBA")
        dress = Image.open(input_path).convert("RGBA")
        
        width, height = dress.size
        datas = dress.load()
        
        # 1. Classification (is_colored vs dark/neutral suit)
        colored_pixels = 0
        total_pixels = 0
        for y in range(0, height, 10):
            for x in range(0, width, 10):
                r, g, b, _ = datas[x, y]
                total_pixels += 1
                if max(r, g, b) - min(r, g, b) > 25:
                    colored_pixels += 1
                    
        is_colored = (colored_pixels / total_pixels) > 0.04
        
        # 2. Process image with hybrid keying
        output_dress = Image.new("RGBA", (width, height))
        out_data = output_dress.load()
        
        center_x = width // 2
        
        for y in range(height):
            for x in range(width):
                r, g, b, a = datas[x, y]
                is_bg = False
                
                if is_colored:
                    is_neutral = abs(r - g) < 22 and abs(g - b) < 22 and abs(b - r) < 22
                    if is_neutral or (r > 210 and g > 210 and b > 210):
                        is_bg = True
                else:
                    # Solid black background keying for suits (no checkerboard check needed!)
                    if (r < 25 and g < 25 and b < 25) or (r > 215 and g > 215 and b > 215):
                        is_bg = True
                        
                # Force outer margins to be transparent background
                if x < 15 or x > width - 15 or y < 15 or y > height - 15:
                    is_bg = True
                    
                if is_bg:
                    out_data[x, y] = (0, 0, 0, 0)
                else:
                    out_data[x, y] = (r, g, b, a)
                    
        # Crop to content bounding box
        bbox = output_dress.getbbox()
        if bbox:
            output_dress = output_dress.crop(bbox)
            
        # Resize dress to fit mannequin torso (target width ~ 380px)
        target_width = 380
        aspect = output_dress.width / output_dress.height
        target_height = int(target_width / aspect)
        
        if target_height > 580:
            target_height = 580
            target_width = int(target_height * aspect)
            
        dress_resized = output_dress.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Create composite canvas
        composite = Image.new("RGBA", template.size)
        
        # Position the dress on the mannequin torso
        paste_x = (template.width - target_width) // 2
        paste_y = 295
        
        composite.paste(dress_resized, (paste_x, paste_y), dress_resized)
        
        # Combine template background and composite garment
        final_image = Image.alpha_composite(template, composite)
        
        # Save output filename
        virtual_filename = f"virtual_3d_{filename}"
        output_path = os.path.join(assets_dir, virtual_filename)
        final_image.convert("RGB").save(output_path, "PNG")
        
        # Also copy it to frontend/public if it exists
        frontend_public = os.path.join('frontend', 'public')
        if os.path.exists(frontend_public):
            shutil_path = os.path.join(frontend_public, virtual_filename)
            shutil_dir = os.path.dirname(shutil_path)
            if os.path.exists(shutil_dir):
                final_image.convert("RGB").save(shutil_path, "PNG")
                
        return virtual_filename
        
    except Exception as e:
        print(f"AI 3D Image generation failed: {e}")
        return filename

with app.app_context():
    # Dynamic DB Migration Helper for SQLite
    if db.engine.name == 'sqlite':
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
    
    DEFAULT_FILTERS = {
        'Midnight Gala Gown': 'filter: hue-rotate(50deg) brightness(0.6);',
        'Classic Tailored Suit': '',
        'Emerald Silk Slip': 'filter: hue-rotate(90deg) saturate(1.5) brightness(0.9);',
        'Velvet Tuxedo': 'filter: hue-rotate(220deg) brightness(0.5);',
        'Royal Indigo Sherwani': 'filter: hue-rotate(190deg) saturate(1.8) brightness(0.85);',
        'Golden Shimmer Sari': 'filter: hue-rotate(-20deg) saturate(1.5) brightness(1.2);',
        'Ruby Crimson Blazer': 'filter: hue-rotate(-120deg) saturate(2.0) brightness(0.9);',
        'Sapphire Evening Dress': 'filter: hue-rotate(200deg) saturate(1.8) brightness(0.8);',
        'Ivory Wedding Tux': 'filter: sepia(0.2) brightness(1.5) contrast(1.1);',
        'Rose Gold Prom Dress': 'filter: hue-rotate(-60deg) saturate(1.2) brightness(1.1);',
        'Champagne Silk Gown': 'filter: hue-rotate(-30deg) saturate(0.8) brightness(1.25);',
        'Charcoal Executive Suit': 'filter: grayscale(1.0) brightness(0.75);'
    }

    # Seed the database with initial dresses if empty
    if not Dress.query.first():
        dresses = [
            Dress(name='Midnight Gala Gown', description='A stunning elegant evening gown.', price_per_day=4500.0, image_file='dress_premium.png', css_filter=DEFAULT_FILTERS['Midnight Gala Gown']),
            Dress(name='Classic Tailored Suit', description='A sharp suit for executive meetings.', price_per_day=3200.0, image_file='suit_premium.png', css_filter=DEFAULT_FILTERS['Classic Tailored Suit']),
            Dress(name='Emerald Silk Slip', description='Minimalist luxury for any occasion.', price_per_day=2800.0, image_file='dress_premium.png', css_filter=DEFAULT_FILTERS['Emerald Silk Slip']),
            Dress(name='Velvet Tuxedo', description='Stand out with a deep black velvet tux.', price_per_day=5500.0, image_file='suit_premium.png', css_filter=DEFAULT_FILTERS['Velvet Tuxedo']),
            Dress(name='Royal Indigo Sherwani', description='Traditional luxury suit crafted from pure silk.', price_per_day=6000.0, image_file='suit_premium.png', css_filter=DEFAULT_FILTERS['Royal Indigo Sherwani']),
            Dress(name='Golden Shimmer Sari', description='A heavily embroidered designer sari with gold accents.', price_per_day=4800.0, image_file='dress_premium.png', css_filter=DEFAULT_FILTERS['Golden Shimmer Sari']),
            Dress(name='Ruby Crimson Blazer', description='A striking scarlet blazer for formal events.', price_per_day=3500.0, image_file='suit_premium.png', css_filter=DEFAULT_FILTERS['Ruby Crimson Blazer']),
            Dress(name='Sapphire Evening Dress', description='A deep blue gown that catches the light beautifully.', price_per_day=4200.0, image_file='dress_premium.png', css_filter=DEFAULT_FILTERS['Sapphire Evening Dress']),
            Dress(name='Ivory Wedding Tux', description='Pristine white tuxedo set for wedding celebrations.', price_per_day=5800.0, image_file='suit_premium.png', css_filter=DEFAULT_FILTERS['Ivory Wedding Tux']),
            Dress(name='Rose Gold Prom Dress', description='Elegant flowing silhouette in soft rose gold colors.', price_per_day=3900.0, image_file='dress_premium.png', css_filter=DEFAULT_FILTERS['Rose Gold Prom Dress']),
            Dress(name='Champagne Silk Gown', description='Liquid gold styling with soft drape detailing.', price_per_day=5000.0, image_file='dress_premium.png', css_filter=DEFAULT_FILTERS['Champagne Silk Gown']),
            Dress(name='Charcoal Executive Suit', description='Deep gray tailored wool blend formal wear.', price_per_day=3400.0, image_file='suit_premium.png', css_filter=DEFAULT_FILTERS['Charcoal Executive Suit'])
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

        # Ensure Royal Hybrid Tuxedo Gown is present in database
        hybrid_gown = Dress.query.filter_by(name='Royal Hybrid Tuxedo Gown').first()
        if not hybrid_gown:
            hybrid_gown = Dress(
                name='Royal Hybrid Tuxedo Gown',
                description='A luxury hybrid haute couture gown seamlessly blending menswear and womenswear. Features a navy velvet tuxedo jacket bodice with gold embroidery, crisp shirt & bow tie, and a cascading gold-lined satin ballgown skirt.',
                price_per_day=7500.0,
                image_file='hybrid_couture_gown.png',
                css_filter=''
            )
            db.session.add(hybrid_gown)
            db.session.commit()

    # Dynamic startup migration to revert database entries back to clean product images (no virtual mannequin overlays in collection)
    try:
        existing_dresses = Dress.query.all()
        for d in existing_dresses:
            if d.image_file and d.image_file.startswith('virtual_3d_'):
                d.image_file = d.image_file.replace('virtual_3d_', '')
            if d.name in DEFAULT_FILTERS and (not d.css_filter or d.css_filter == ''):
                d.css_filter = DEFAULT_FILTERS[d.name]
        db.session.commit()
    except Exception as d_err:
        print(f"Startup dynamic dress migration failed: {d_err}")

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
    session.pop('_flashes', None)
    flash('You have been logged out successfully.')
    return redirect(url_for('login'))

@app.route('/dress/<int:dress_id>')
def detail(dress_id):
    dress = Dress.query.get_or_404(dress_id)
    return render_template('detail.html', dress=dress)

@app.route('/dress/<int:dress_id>/showcase')
def dress_showcase(dress_id):
    dress = Dress.query.get_or_404(dress_id)
    return render_template('showcase.html', dress=dress)


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

def save_uploaded_image(file, category):
    # Cloudinary Integration option
    cloudinary_cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key = os.environ.get("CLOUDINARY_API_KEY")
    cloudinary_api_secret = os.environ.get("CLOUDINARY_API_SECRET")

    if file and file.filename != '':
        if not allowed_file(file.filename):
            raise ValueError("Security Error: Invalid file format. Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed.")
        
        # If Cloudinary environment variables are set, upload directly to Cloudinary
        if cloudinary_cloud_name and cloudinary_api_key and cloudinary_api_secret:
            try:
                import cloudinary
                import cloudinary.uploader
                cloudinary.config(
                    cloud_name=cloudinary_cloud_name,
                    api_key=cloudinary_api_key,
                    api_secret=cloudinary_api_secret,
                    secure=True
                )
                upload_result = cloudinary.uploader.upload(file)
                return upload_result.get("secure_url")
            except Exception as cloud_err:
                print(f"Cloudinary upload failed, falling back to local: {cloud_err}")
        
        # Fallback: local filesystem storage
        from werkzeug.utils import secure_filename
        import uuid
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        assets_dir = os.path.join('static', 'assets')
        if not os.path.exists(assets_dir):
            os.makedirs(assets_dir)
            
        file.save(os.path.join(assets_dir, unique_filename))
        return unique_filename
    else:
        # Select premium asset fallback based on category keyword matching
        cat_lower = (category or '').lower()
        suit_keywords = ['suit', 'tux', 'blazer', 'sherwani', 'jacket', 'coat', 'men']
        if any(kw in cat_lower for kw in suit_keywords):
            return 'suit_premium.png'
        else:
            return 'dress_premium.png'

@app.route('/lend', methods=['GET', 'POST'])
@login_required
def lend_clothes():
    if request.method == 'POST':
        name = request.form.get('name')
        category = request.form.get('category')
        price_val = request.form.get('price')
        price = float(price_val) if price_val else 0.0
        description = request.form.get('description')
        
        # Handle file upload via helper function (supports local filesystem fallback or Cloudinary)
        file = request.files.get('image')
        try:
            image_file = save_uploaded_image(file, category)
        except ValueError as val_err:
            flash(str(val_err))
            return redirect(url_for('lend_clothes'))
        
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

@app.route('/remove_listing/<int:dress_id>', methods=['POST'])
@login_required
def remove_listing(dress_id):
    dress = Dress.query.get(dress_id)
    if not dress:
        flash("Listing not found.")
        return redirect(url_for('dashboard'))
        
    if dress.owner_id != current_user.id:
        flash("Unauthorized action: You can only remove your own listings.")
        return redirect(url_for('dashboard'))
        
    # Check for active orders/rentals
    active_order = Order.query.filter(
        Order.dress_id == dress.id,
        Order.status.in_(['Paid', 'Active', 'Shipped'])
    ).first()
    
    if active_order:
        flash("This listing cannot be removed because it is currently rented.")
        return redirect(url_for('dashboard'))
        
    try:
        # Delete related (inactive) orders first to prevent ForeignKey violations
        Order.query.filter_by(dress_id=dress.id).delete()
        
        # Delete the dress
        db.session.delete(dress)
        db.session.commit()
        
        # Remove uploaded image from static/assets if not a shared fallback
        fallbacks = {'suit_premium.png', 'dress_premium.png', 'dress.png'}
        if dress.image_file and dress.image_file not in fallbacks:
            safe_filename = os.path.basename(dress.image_file)
            image_path = os.path.join('static', 'assets', safe_filename)
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except Exception as img_err:
                    print(f"Error removing image file {image_path}: {img_err}")
                    
        flash("Your listing has been removed successfully.")
    except Exception as db_err:
        db.session.rollback()
        print(f"Database deletion error: {db_err}")
        flash("An error occurred while removing your listing. Please try again.")
        
    return redirect(url_for('dashboard'))

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

# ==========================================
# REST API ENDPOINTS
# ==========================================

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({"success": False, "message": "All fields (username, email, password) are required for registration."}), 400
        
    user_by_username = User.query.filter_by(username=username).first()
    user_by_email = User.query.filter_by(email=email).first()
    
    if user_by_username and user_by_username.is_verified:
        return jsonify({"success": False, "message": "Username already exists."}), 400
    if user_by_email and user_by_email.is_verified:
        return jsonify({"success": False, "message": "Email already exists."}), 400
        
    # Password complexity check
    password_pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
    if not re.match(password_pattern, password):
        return jsonify({"success": False, "message": "Security Requirement: Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&)."}), 400
        
    user = None
    if user_by_email and not user_by_email.is_verified:
        user = user_by_email
    elif user_by_username and not user_by_username.is_verified:
        user = user_by_username
        
    otp_code = generate_otp()
    now = datetime.utcnow()
    
    if user and user.otp_last_sent and (now - user.otp_last_sent) < timedelta(seconds=60):
        time_left = 60 - int((now - user.otp_last_sent).total_seconds())
        return jsonify({"success": False, "message": f"Please wait {time_left} seconds before requesting another OTP.", "pending_user_id": user.id}), 429
        
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
    return jsonify({
        "success": True, 
        "message": "An OTP has been sent to your email. Please verify to activate your account.",
        "pending_user_id": user.id
    })

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username/Email and Password are required."}), 400
        
    user = User.query.filter((User.username == username) | (User.email == username)).first()
    if user:
        if user.lockout_until and user.lockout_until > datetime.utcnow():
            time_left = user.lockout_until - datetime.utcnow()
            minutes_left = int(time_left.total_seconds() / 60) + 1
            return jsonify({"success": False, "message": f"Security Lockout: Account temporarily locked. Try again in {minutes_left} minute(s)."}), 403
            
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
                msg = "Your account is not verified yet. A new OTP has been sent to your email."
            else:
                msg = "Your account is not verified yet. Please enter the OTP sent to your email."
                
            return jsonify({
                "success": False,
                "message": msg,
                "needs_verification": True,
                "pending_user_id": user.id
            }), 401
            
        if check_password_hash(user.password, password):
            user.failed_login_attempts = 0
            user.lockout_until = None
            db.session.commit()
            login_user(user)
            return jsonify({
                "success": True,
                "message": "Logged in successfully.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role
                }
            })
        else:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.lockout_until = datetime.utcnow() + timedelta(minutes=15)
                msg = "Security Lockout: Too many failed login attempts. Account locked for 15 minutes."
            else:
                msg = f"Invalid credentials. {5 - user.failed_login_attempts} attempts remaining before account lockout."
            db.session.commit()
            return jsonify({"success": False, "message": msg}), 401
    else:
        return jsonify({"success": False, "message": "Invalid credentials."}), 401

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    session.pop('_flashes', None)
    return jsonify({"success": True, "message": "You have been logged out successfully."})

@app.route('/api/auth/verify-otp', methods=['POST'])
def api_verify_otp():
    data = request.get_json() or {}
    otp_entered = data.get('otp')
    pending_id = data.get('pending_user_id')
    
    if not pending_id:
        return jsonify({"success": False, "message": "No active verification session found."}), 400
        
    user = User.query.get(pending_id)
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404
        
    if not otp_entered or len(otp_entered) != 6:
        return jsonify({"success": False, "message": "Please enter a valid 6-digit OTP code."}), 400
        
    now = datetime.utcnow()
    
    if user.otp_attempts >= 3:
        return jsonify({"success": False, "message": "This OTP has been invalidated due to too many failed attempts. Please request a new one."}), 400
        
    if not user.otp_expiry or user.otp_expiry < now:
        return jsonify({"success": False, "message": "The OTP has expired. Please request a new code."}), 400
        
    if user.otp and hmac.compare_digest(user.otp, otp_entered):
        user.is_verified = True
        user.otp = None
        user.otp_expiry = None
        user.otp_attempts = 0
        db.session.commit()
        login_user(user)
        return jsonify({
            "success": True,
            "message": "Account successfully verified and logged in!",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        })
    else:
        user.otp_attempts += 1
        db.session.commit()
        attempts_remaining = 3 - user.otp_attempts
        if attempts_remaining <= 0:
            msg = "Too many incorrect attempts. This OTP has been invalidated. Please request a new one."
        else:
            msg = f"Incorrect OTP. {attempts_remaining} attempt(s) remaining."
        return jsonify({"success": False, "message": msg}), 400

@app.route('/api/auth/resend-otp', methods=['POST'])
def api_resend_otp():
    data = request.get_json() or {}
    pending_id = data.get('pending_user_id')
    
    if not pending_id:
        return jsonify({"success": False, "message": "No active verification session found."}), 400
        
    user = User.query.get(pending_id)
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404
        
    now = datetime.utcnow()
    if user.otp_last_sent and (now - user.otp_last_sent) < timedelta(seconds=60):
        time_left = 60 - int((now - user.otp_last_sent).total_seconds())
        return jsonify({"success": False, "message": f"Please wait {time_left} seconds before requesting a new OTP."}), 429
        
    otp_code = generate_otp()
    user.otp = otp_code
    user.otp_expiry = now + timedelta(minutes=5)
    user.otp_attempts = 0
    user.otp_last_sent = now
    db.session.commit()
    
    send_otp_email(user.email, otp_code, purpose="register")
    return jsonify({"success": True, "message": "A new OTP has been sent to your email."})

@app.route('/api/auth/forgot-password', methods=['POST'])
def api_forgot_password():
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
        
    user = User.query.filter_by(email=email).first()
    if user and user.is_verified:
        now = datetime.utcnow()
        if user.otp_last_sent and (now - user.otp_last_sent) < timedelta(seconds=60):
            time_left = 60 - int((now - user.otp_last_sent).total_seconds())
            return jsonify({"success": False, "message": f"Please wait {time_left} seconds before requesting a new OTP."}), 429
            
        otp_code = generate_otp()
        user.otp = otp_code
        user.otp_expiry = now + timedelta(minutes=5)
        user.otp_attempts = 0
        user.otp_last_sent = now
        db.session.commit()
        
        send_otp_email(email, otp_code, purpose="reset")
        return jsonify({"success": True, "message": "A password reset OTP has been sent to your email."})
    else:
        return jsonify({"success": True, "message": "If the email is registered and verified, a password reset code has been sent."})

@app.route('/api/auth/reset-password', methods=['POST'])
def api_reset_password():
    data = request.get_json() or {}
    email = data.get('email')
    otp_entered = data.get('otp')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    action = data.get('action')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user or not user.is_verified:
        return jsonify({"success": False, "message": "User not found or unverified."}), 404
        
    if action == 'resend':
        now = datetime.utcnow()
        if user.otp_last_sent and (now - user.otp_last_sent) < timedelta(seconds=60):
            time_left = 60 - int((now - user.otp_last_sent).total_seconds())
            return jsonify({"success": False, "message": f"Please wait {time_left} seconds before requesting a new OTP."}), 429
            
        otp_code = generate_otp()
        user.otp = otp_code
        user.otp_expiry = now + timedelta(minutes=5)
        user.otp_attempts = 0
        user.otp_last_sent = now
        db.session.commit()
        
        send_otp_email(email, otp_code, purpose="reset")
        return jsonify({"success": True, "message": "A new password reset OTP has been sent to your email."})
        
    if not otp_entered or not password or not confirm_password:
        return jsonify({"success": False, "message": "All fields are required."}), 400
        
    if password != confirm_password:
        return jsonify({"success": False, "message": "Passwords do not match."}), 400
        
    password_pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
    if not re.match(password_pattern, password):
        return jsonify({"success": False, "message": "Security Requirement: Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&)."}), 400
        
    now = datetime.utcnow()
    if user.otp_attempts >= 3:
        return jsonify({"success": False, "message": "This OTP has been invalidated due to too many failed attempts. Please request a new one."}), 400
        
    if not user.otp_expiry or user.otp_expiry < now:
        return jsonify({"success": False, "message": "The OTP has expired. Please request a new code."}), 400
        
    if user.otp and hmac.compare_digest(user.otp, otp_entered):
        user.password = generate_password_hash(password, method='pbkdf2:sha256')
        user.otp = None
        user.otp_expiry = None
        user.otp_attempts = 0
        db.session.commit()
        return jsonify({"success": True, "message": "Password has been reset successfully! You can now log in."})
    else:
        user.otp_attempts += 1
        db.session.commit()
        attempts_remaining = 3 - user.otp_attempts
        if attempts_remaining <= 0:
            msg = "Too many incorrect attempts. This OTP has been invalidated. Please request a new one."
        else:
            msg = f"Incorrect OTP. {attempts_remaining} attempt(s) remaining."
        return jsonify({"success": False, "message": msg}), 400

@app.route('/api/auth/me', methods=['GET'])
def api_auth_me():
    if current_user.is_authenticated:
        return jsonify({
            "success": True,
            "authenticated": True,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "role": current_user.role
            }
        })
    return jsonify({"success": True, "authenticated": False}), 200

# Marketplace APIs
@app.route('/api/dresses', methods=['GET'])
def api_get_dresses():
    dresses = Dress.query.order_by(Dress.id.desc()).all()
    dresses_data = [{
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "price_per_day": d.price_per_day,
        "image_file": d.image_file,
        "css_filter": d.css_filter,
        "owner_id": d.owner_id
      } for d in dresses]
    return jsonify({"success": True, "data": dresses_data})

@app.route('/api/dresses/<int:dress_id>', methods=['GET'])
def api_get_dress(dress_id):
    dress = Dress.query.get(dress_id)
    if not dress:
        return jsonify({"success": False, "message": "Listing not found."}), 404
    return jsonify({
        "success": True,
        "data": {
            "id": dress.id,
            "name": dress.name,
            "description": dress.description,
            "price_per_day": dress.price_per_day,
            "image_file": dress.image_file,
            "css_filter": dress.css_filter,
            "owner_id": dress.owner_id
        }
    })

@app.route('/api/dresses', methods=['POST'])
@login_required
def api_create_dress():
    name = request.form.get('name')
    category = request.form.get('category')
    price_val = request.form.get('price')
    description = request.form.get('description')
    
    if not name or not price_val:
        return jsonify({"success": False, "message": "Name and Price are required."}), 400
        
    try:
        price = float(price_val)
    except ValueError:
        return jsonify({"success": False, "message": "Price must be a valid number."}), 400
        
    file = request.files.get('image')
    try:
        image_file = save_uploaded_image(file, category)
    except ValueError as val_err:
        return jsonify({"success": False, "message": str(val_err)}), 400
        
    new_dress = Dress(
        name=name,
        description=description or '',
        price_per_day=price,
        image_file=image_file,
        css_filter='',
        owner_id=current_user.id
    )
    db.session.add(new_dress)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Your outfit has been listed successfully!",
        "data": {
            "id": new_dress.id,
            "name": new_dress.name,
            "price_per_day": new_dress.price_per_day
        }
    })

@app.route('/api/dresses/<int:dress_id>', methods=['DELETE'])
@login_required
def api_delete_dress(dress_id):
    dress = Dress.query.get(dress_id)
    if not dress:
        return jsonify({"success": False, "message": "Listing not found."}), 404
        
    if dress.owner_id != current_user.id:
        return jsonify({"success": False, "message": "Unauthorized action: You can only remove your own listings."}), 403
        
    active_order = Order.query.filter(
        Order.dress_id == dress.id,
        Order.status.in_(['Paid', 'Active', 'Shipped'])
    ).first()
    
    if active_order:
        return jsonify({"success": False, "message": "This listing cannot be removed because it is currently rented."}), 400
        
    try:
        Order.query.filter_by(dress_id=dress.id).delete()
        db.session.delete(dress)
        db.session.commit()
        
        fallbacks = {'suit_premium.png', 'dress_premium.png', 'dress.png'}
        if dress.image_file and dress.image_file not in fallbacks:
            safe_filename = os.path.basename(dress.image_file)
            image_path = os.path.join('static', 'assets', safe_filename)
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except Exception as img_err:
                    print(f"Error removing image file: {img_err}")
                    
        return jsonify({"success": True, "message": "Your listing has been removed successfully."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": false, "message": f"Database error: {e}"}), 500

# Dashboard APIs
@app.route('/api/dashboard', methods=['GET'])
@login_required
def api_dashboard():
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
                
    listed_garments = Dress.query.filter_by(owner_id=current_user.id).order_by(Dress.id.desc()).all()
    lending_orders = Order.query.join(Dress).filter(Dress.owner_id == current_user.id).all()
    lending_earnings = sum(o.total_price for o in lending_orders if o.total_price is not None)
    
    orders_data = [{
        "id": o.id,
        "dress": {
            "id": o.dress.id,
            "name": o.dress.name,
            "image_file": o.dress.image_file,
            "css_filter": o.dress.css_filter
        },
        "date_rented": o.date_rented.isoformat() if o.date_rented else None,
        "start_date": o.start_date.isoformat() if o.start_date else None,
        "end_date": o.end_date.isoformat() if o.end_date else None,
        "total_price": o.total_price,
        "status": o.status
    } for o in all_orders]
    
    listings_data = [{
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "price_per_day": d.price_per_day,
        "image_file": d.image_file,
        "css_filter": d.css_filter,
        "times_rented": len(d.orders)
    } for d in listed_garments]
    
    lending_orders_data = [{
        "id": lo.id,
        "dress_name": lo.dress.name,
        "user_id": lo.user_id,
        "date_rented": lo.date_rented.isoformat() if lo.date_rented else None,
        "total_price": lo.total_price,
        "status": lo.status
    } for lo in lending_orders]
    
    return jsonify({
        "success": True,
        "data": {
            "active_rentals_count": active_rentals_count,
            "total_rentals_count": total_rentals_count,
            "nearest_return_days": nearest_return_days,
            "lending_earnings": lending_earnings,
            "orders": orders_data,
            "listings": listings_data,
            "lending_orders": lending_orders_data
        }
    })

@app.route('/api/orders', methods=['POST'])
@login_required
def api_create_order():
    data = request.get_json() or {}
    dress_id = data.get('dress_id')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    size = data.get('size', 'S')
    card_number = data.get('card_number')
    payment_method = data.get('payment_method', 'card')
    
    if not dress_id or not start_date_str or not end_date_str:
        return jsonify({"success": False, "message": "Dress ID, start date, and end date are required."}), 400
        
    dress = Dress.query.get(dress_id)
    if not dress:
        return jsonify({"success": False, "message": "Dress not found."}), 404
        
    if dress.owner_id == current_user.id:
        return jsonify({"success": False, "message": "You cannot rent your own listed garment."}), 400
        
    try:
        start_date = datetime.strptime(start_date_str.split('T')[0], '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str.split('T')[0], '%Y-%m-%d')
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date format. Expected YYYY-MM-DD."}), 400
        
    if start_date >= end_date:
        return jsonify({"success": False, "message": "Start date must be before end date."}), 400
        
    duration = (end_date - start_date).days
    if duration <= 0:
        duration = 1
    total_price = duration * dress.price_per_day
    
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
        return jsonify({
            "success": True,
            "message": "Order created successfully!",
            "order": {
                "id": new_order.id,
                "total_price": new_order.total_price,
                "status": new_order.status
            }
        })
    else:
        return jsonify({"success": False, "message": "Invalid Card Details."}), 400

@app.route('/api/orders/<int:order_id>/return', methods=['POST'])
@login_required
def api_return_order(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"success": False, "message": "Order not found."}), 404
        
    if order.user_id != current_user.id:
        return jsonify({"success": False, "message": "Unauthorized action."}), 403
        
    order.status = 'Returned'
    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Return label generated for {order.dress.name}! Place it in the mail shortly."
    })

# Admin APIs
@app.route('/api/admin/dashboard', methods=['GET'])
@login_required
def api_admin_dashboard():
    if current_user.role != 1:
        return jsonify({"success": False, "message": "Access denied."}), 403
        
    total_revenue = db.session.query(db.func.sum(Order.total_price)).filter(Order.status.in_(['Paid', 'Active', 'Shipped', 'Returned'])).scalar() or 0.0
    active_rentals = Order.query.filter(Order.status.in_(['Paid', 'Active', 'Shipped'])).count()
    inventory_count = Dress.query.count()
    user_count = User.query.count()
    
    dresses = Dress.query.order_by(Dress.id.desc()).all()
    orders = Order.query.order_by(Order.date_rented.desc()).all()
    
    dresses_data = [{
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "price_per_day": d.price_per_day,
        "image_file": d.image_file,
        "css_filter": d.css_filter,
        "owner_username": d.owner.username if d.owner else 'Admin'
    } for d in dresses]
    
    orders_data = [{
        "id": o.id,
        "username": o.user.username,
        "dress_name": o.dress.name,
        "date_rented": o.date_rented.isoformat() if o.date_rented else None,
        "total_price": o.total_price,
        "status": o.status
    } for o in orders]
    
    return jsonify({
        "success": True,
        "data": {
            "total_revenue": total_revenue,
            "active_rentals": active_rentals,
            "inventory_count": inventory_count,
            "user_count": user_count,
            "dresses": dresses_data,
            "orders": orders_data
        }
    })

@app.route('/api/admin/dresses', methods=['POST'])
@login_required
def api_admin_create_dress():
    if current_user.role != 1:
        return jsonify({"success": False, "message": "Access denied."}), 403
        
    data = request.get_json() or {}
    name = data.get('name')
    description = data.get('description')
    price_val = data.get('price')
    image_type = data.get('image_type', 'dress_premium.png')
    color = data.get('color')
    
    if not name or not price_val:
        return jsonify({"success": False, "message": "Name and Price are required."}), 400
        
    try:
        price = float(price_val)
    except ValueError:
        return jsonify({"success": False, "message": "Price must be a valid number."}), 400
        
    css_filter = ''
    if color == 'blue': 
        css_filter = 'filter: hue-rotate(180deg);'
    elif color == 'red': 
        css_filter = 'filter: hue-rotate(-90deg);'
        
    new_dress = Dress(
        name=name,
        description=description or '',
        price_per_day=price,
        image_file=image_type,
        css_filter=css_filter,
        owner_id=None
    )
    db.session.add(new_dress)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Dress added successfully!"})

@app.route('/api/admin/dresses/<int:dress_id>', methods=['DELETE'])
@login_required
def api_admin_delete_dress(dress_id):
    if current_user.role != 1:
        return jsonify({"success": False, "message": "Access denied."}), 403
        
    dress = Dress.query.get(dress_id)
    if not dress:
        return jsonify({"success": False, "message": "Dress not found."}), 404
        
    Order.query.filter_by(dress_id=dress.id).delete()
    db.session.delete(dress)
    db.session.commit()
    
    return jsonify({"success": True, "message": f"Removed {dress.name} from inventory."})

@app.route('/api/admin/orders/<int:order_id>', methods=['PATCH'])
@login_required
def api_admin_update_order_status(order_id):
    if current_user.role != 1:
        return jsonify({"success": False, "message": "Access denied."}), 403
        
    data = request.get_json() or {}
    status = data.get('status')
    
    if not status:
        return jsonify({"success": False, "message": "Status is required."}), 400
        
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"success": False, "message": "Order not found."}), 404
        
    order.status = status
    db.session.commit()
    
    return jsonify({"success": True, "message": f"Order #{order.id} status updated to {status}."})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
