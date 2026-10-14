import os
import re
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
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
from models import db, User, Dress, DressImage, Order

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

# Email Delivery Configuration (Supports Resend API, Brevo API, and Gmail SMTP)
app.config['RESEND_API_KEY'] = os.environ.get('RESEND_API_KEY')
app.config['RESEND_SENDER'] = os.environ.get('RESEND_SENDER', 'onboarding@resend.dev')

app.config['BREVO_API_KEY'] = os.environ.get('BREVO_API_KEY')
app.config['BREVO_SENDER_EMAIL'] = os.environ.get('BREVO_SENDER_EMAIL', 'no-reply@closetshare.com')
app.config['BREVO_SENDER_NAME'] = os.environ.get('BREVO_SENDER_NAME', 'Closet Share')

app.config['SMTP_SERVER'] = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
app.config['SMTP_PORT'] = int(os.environ.get('SMTP_PORT', 587))
app.config['SMTP_USERNAME'] = os.environ.get('SMTP_USERNAME')
app.config['SMTP_PASSWORD'] = os.environ.get('SMTP_PASSWORD')
app.config['SMTP_SENDER'] = os.environ.get('SMTP_SENDER')

def generate_otp():
    # Cryptographically secure random 6 digit OTP
    digits = [str(secrets.randbelow(10)) for _ in range(6)]
    return "".join(digits)

def send_otp_email(to_email, otp, purpose="register"):
    subject_purpose = "Password Reset" if purpose == "reset" else "Account Verification"
    subject = f"Your OTP Code for Closet Share - {subject_purpose}"
    
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

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <h2 style="color: #6366f1; margin-top: 0; font-size: 22px; font-weight: 700;">Closet Share</h2>
      <p style="font-size: 15px; color: #334155; line-height: 1.5;">Hello,</p>
      <p style="font-size: 15px; color: #334155; line-height: 1.5;">Your verification code (OTP) for Closet Share is:</p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e1b4b; background: #eef2ff; border: 1px solid #c7d2fe; padding: 14px 28px; border-radius: 12px;">{otp}</span>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.4;">This OTP code expires in <strong>5 minutes</strong>. For your security, do not share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Warm regards,<br>The Closet Share Team</p>
    </div>
    """

    # Always log the OTP to the console so developers and testers are never blocked
    print("\n" + "="*65)
    print(f"  [CLOSET SHARE OTP DISPATCH]")
    print(f"  Recipient : {to_email}")
    print(f"  Purpose   : {purpose.upper()}")
    print(f"  OTP Code  : >>> {otp} <<< (valid for 5 minutes)")
    print("="*65)

    errors = []

    # 1. Attempt sending via Resend API (https://resend.com)
    resend_api_key = os.environ.get('RESEND_API_KEY') or app.config.get('RESEND_API_KEY')
    if resend_api_key and resend_api_key.strip():
        resend_sender = os.environ.get('RESEND_SENDER') or app.config.get('RESEND_SENDER') or 'onboarding@resend.dev'
        try:
            req_data = {
                "from": resend_sender,
                "to": [to_email],
                "subject": subject,
                "text": body,
                "html": html_body
            }
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(req_data).encode('utf-8'),
                headers={
                    "Authorization": f"Bearer {resend_api_key.strip()}",
                    "Content-Type": "application/json"
                },
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                if "id" in res_data:
                    print(f"  [EMAIL DISPATCH SUCCESS] Sent via Resend API (ID: {res_data['id']}) to {to_email}")
                    return True
                errors.append(f"Resend unexpected response: {res_data}")
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8', errors='ignore')
            print(f"  [RESEND API HTTP ERROR {e.code}]: {err_msg}")
            errors.append(f"Resend HTTP {e.code}: {err_msg}")
        except Exception as e:
            print(f"  [RESEND API ERROR]: {e}")
            errors.append(f"Resend error: {e}")

    # 2. Attempt sending via Brevo API (https://brevo.com)
    brevo_api_key = os.environ.get('BREVO_API_KEY') or app.config.get('BREVO_API_KEY')
    if brevo_api_key and brevo_api_key.strip():
        brevo_sender_email = os.environ.get('BREVO_SENDER_EMAIL') or app.config.get('BREVO_SENDER_EMAIL') or 'no-reply@closetshare.com'
        brevo_sender_name = os.environ.get('BREVO_SENDER_NAME') or app.config.get('BREVO_SENDER_NAME') or 'Closet Share'
        try:
            req_data = {
                "sender": {"name": brevo_sender_name, "email": brevo_sender_email},
                "to": [{"email": to_email}],
                "subject": subject,
                "textContent": body,
                "htmlContent": html_body
            }
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=json.dumps(req_data).encode('utf-8'),
                headers={
                    "api-key": brevo_api_key.strip(),
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                print(f"  [EMAIL DISPATCH SUCCESS] Sent via Brevo API to {to_email}")
                return True
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8', errors='ignore')
            print(f"  [BREVO API HTTP ERROR {e.code}]: {err_msg}")
            errors.append(f"Brevo HTTP {e.code}: {err_msg}")
        except Exception as e:
            print(f"  [BREVO API ERROR]: {e}")
            errors.append(f"Brevo error: {e}")

    # 3. Attempt sending via SMTP (e.g. Gmail SMTP)
    smtp_server = os.environ.get('SMTP_SERVER') or app.config.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT') or app.config.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USERNAME') or app.config.get('SMTP_USERNAME')
    smtp_pass = os.environ.get('SMTP_PASSWORD') or app.config.get('SMTP_PASSWORD')
    smtp_sender = os.environ.get('SMTP_SENDER') or app.config.get('SMTP_SENDER')
    
    # Avoid placeholder dummy addresses
    if smtp_user and smtp_pass and smtp_user not in ('dummy-sender@clothesrent.com', 'your-email@gmail.com'):
        # For Gmail SMTP, sender must match authenticated user or account
        sender_addr = smtp_sender if (smtp_sender and '@' in smtp_sender and 'noreply@gmail.com' not in smtp_sender) else smtp_user
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = f"Closet Share <{sender_addr}>"
            msg['To'] = to_email

            part1 = MIMEText(body, 'plain', 'utf-8')
            part2 = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(part1)
            msg.attach(part2)

            server = smtplib.SMTP(smtp_server, smtp_port, timeout=12)
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(sender_addr, [to_email], msg.as_string())
            server.quit()
            print(f"  [EMAIL DISPATCH SUCCESS] Sent via SMTP ({smtp_server}:{smtp_port}) to {to_email}")
            return True
        except Exception as e:
            print(f"  [SMTP DISPATCH ERROR]: {e}")
            errors.append(f"SMTP error: {e}")

    # If no provider succeeded:
    if errors:
        print(f"  [EMAIL WARNING] Delivery attempts failed: {'; '.join(errors)}")
        print(f"  [DEVELOPER NOTICE] The OTP ({otp}) is displayed in the console above.")
    else:
        print(f"  [EMAIL NOTICE] No email provider configured (set RESEND_API_KEY, BREVO_API_KEY, or SMTP credentials).")
        print(f"  [DEVELOPER NOTICE] The OTP ({otp}) is displayed in the console above.")
        
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

# ── Expanded catalog with Indian + Western + Fusion cultural categories ─────────
INDIAN_WESTERN_CATALOG = [
    # ── INDIAN HERITAGE ───────────────────────────────────────────────────────
    {
        'name': 'Zardozi Crimson Bridal Lehenga',
        'description': 'Handcrafted crimson velvet lehenga choli adorned with heritage zardozi gold threadwork, antique sequins, and sheer embroidered net dupatta.',
        'price_per_day': 7500.0,
        'image_file': 'lehenga_crimson_bridal_1.jpg',
        'culture': 'indian',
        'clothing_type': 'lehenga',
        'gender': 'women',
        'gallery': ['lehenga_crimson_bridal_1.jpg', 'lehenga_crimson_bridal_2.jpg'],
    },
    {
        'name': 'Royal Kanjivaram Silk Saree',
        'description': 'Authentic pure mulberry silk saree woven with real gold zari temple borders, contrast rich pallu, and opulent jewel tones.',
        'price_per_day': 4800.0,
        'image_file': 'saree_royal_kanjivaram_1.jpg',
        'culture': 'indian',
        'clothing_type': 'saree',
        'gender': 'women',
        'gallery': ['saree_royal_kanjivaram_1.jpg', 'saree_royal_kanjivaram_2.jpg'],
    },
    {
        'name': 'Heritage Banarasi Brocade Saree',
        'description': 'Heirloom handloom Banarasi katan silk saree featuring intricate floral kadwa weaves and lustrous metallic gold sheen.',
        'price_per_day': 5200.0,
        'image_file': 'saree_banarasi_brocade_1.jpg',
        'culture': 'indian',
        'clothing_type': 'saree',
        'gender': 'women',
        'gallery': ['saree_banarasi_brocade_1.jpg', 'saree_banarasi_brocade_2.jpg'],
    },
    {
        'name': 'Rose Quartz Chikankari Anarkali',
        'description': 'Graceful pastel blush georgette floor-sweeping Anarkali suit with delicate Lucknowi chikankari embroidery and mukaish highlights.',
        'price_per_day': 3600.0,
        'image_file': 'anarkali_rose_chikankari_1.jpg',
        'culture': 'indian',
        'clothing_type': 'kurta',
        'gender': 'women',
        'gallery': ['anarkali_rose_chikankari_1.jpg', 'anarkali_rose_chikankari_2.jpg'],
    },
    {
        'name': 'Mustard Festive Georgette Sharara',
        'description': 'Celebratory turmeric yellow kurta-sharara set with gota patti detailing and lightweight scalloped dupatta — ideal for Haldi & Mehendi.',
        'price_per_day': 3200.0,
        'image_file': 'sharara_mustard_georgette_1.jpg',
        'culture': 'indian',
        'clothing_type': 'kurta',
        'gender': 'women',
        'gallery': ['sharara_mustard_georgette_1.jpg', 'sharara_mustard_georgette_2.jpg'],
    },
    {
        'name': 'Royal Ivory Groom Sherwani',
        'description': 'Bespoke ivory raw-silk wedding sherwani with hand-embroidered resham motifs, mandarin collar, and royal ceremonial stole.',
        'price_per_day': 6500.0,
        'image_file': 'sherwani_ivory_groom_1.jpg',
        'culture': 'indian',
        'clothing_type': 'sherwani',
        'gender': 'men',
        'gallery': ['sherwani_ivory_groom_1.jpg', 'sherwani_ivory_groom_2.jpg'],
    },
    {
        'name': 'Midnight Maroon Velvet Sherwani',
        'description': 'Regal deep-wine micro-velvet sherwani embellished with antique gold dabka embroidery, tailored for royal grooms and sangeet nights.',
        'price_per_day': 6800.0,
        'image_file': 'sherwani_maroon_velvet_1.jpg',
        'culture': 'indian',
        'clothing_type': 'sherwani',
        'gender': 'men',
        'gallery': ['sherwani_maroon_velvet_1.jpg', 'sherwani_maroon_velvet_2.jpg'],
    },
    {
        'name': 'Jodhpuri Silk Bandhgala Suit',
        'description': 'Master-tailored structured Jodhpuri bandhgala in rich silk blend with bespoke brass buttons and matching tapered trousers.',
        'price_per_day': 4500.0,
        'image_file': 'bandhgala_jodhpuri_silk_1.jpg',
        'culture': 'indian',
        'clothing_type': 'suit',
        'gender': 'men',
        'gallery': ['bandhgala_jodhpuri_silk_1.jpg', 'bandhgala_jodhpuri_silk_2.jpg'],
    },

    # ── WESTERN ELEGANCE ──────────────────────────────────────────────────────
    {
        'name': 'Midnight Gala Velvet Gown',
        'description': 'Dramatic black velvet column gown with structured corset bodice, off-the-shoulder drape, and an ethereal sweeping train.',
        'price_per_day': 4900.0,
        'image_file': 'gown_midnight_velvet_1.jpg',
        'culture': 'western',
        'clothing_type': 'gown',
        'gender': 'women',
        'gallery': ['gown_midnight_velvet_1.jpg', 'gown_midnight_velvet_2.jpg'],
    },
    {
        'name': 'Emerald Silk Charmeuse Slip Dress',
        'description': 'Bias-cut evening slip dress in liquid emerald pure silk charmeuse with fluid cowl neckline and low-back crossover straps.',
        'price_per_day': 3100.0,
        'image_file': 'slip_emerald_charmeuse_1.jpg',
        'culture': 'western',
        'clothing_type': 'cocktail',
        'gender': 'women',
        'gallery': ['slip_emerald_charmeuse_1.jpg', 'slip_emerald_charmeuse_2.jpg'],
    },
    {
        'name': 'Scarlet Red Corset Ballgown',
        'description': 'High-drama ruby red ballroom gown with boned lace-up corset, architectural sweetheart neck, and billowing satin ball skirt.',
        'price_per_day': 5400.0,
        'image_file': 'gown_scarlet_corset_1.jpg',
        'culture': 'western',
        'clothing_type': 'gown',
        'gender': 'women',
        'gallery': ['gown_scarlet_corset_1.jpg', 'gown_scarlet_corset_2.jpg'],
    },
    {
        'name': 'Champagne Crystal Evening Gown',
        'description': 'Ethereal liquid champagne gown dusted with hand-placed micro-crystals and soft metallic fringe for red carpet events.',
        'price_per_day': 5600.0,
        'image_file': 'gown_champagne_crystal_1.jpg',
        'culture': 'western',
        'clothing_type': 'gown',
        'gender': 'women',
        'gallery': ['gown_champagne_crystal_1.jpg', 'gown_champagne_crystal_2.jpg'],
    },
    {
        'name': 'Blush Pink Tiered Tulle Gown',
        'description': 'Romantic pastel blush evening gown with tiered French tulle skirt, delicate illusion neckline, and hand-embroidered florals.',
        'price_per_day': 4200.0,
        'image_file': 'gown_blush_tulle_1.jpg',
        'culture': 'western',
        'clothing_type': 'gown',
        'gender': 'women',
        'gallery': ['gown_blush_tulle_1.jpg', 'gown_blush_tulle_2.jpg'],
    },
    {
        'name': 'Obsidian Satin-Lapel Black Tuxedo',
        'description': 'Sharp bespoke black tuxedo in Super 130s wool with silk grosgrain peak lapels, tailored trousers, and matching silk bowtie.',
        'price_per_day': 5500.0,
        'image_file': 'tuxedo_obsidian_black_1.jpg',
        'culture': 'western',
        'clothing_type': 'tuxedo',
        'gender': 'men',
        'gallery': ['tuxedo_obsidian_black_1.jpg', 'tuxedo_obsidian_black_2.jpg'],
    },
    {
        'name': 'Italian Charcoal Pinstripe Suit',
        'description': 'Classic Milanese-cut charcoal wool suit with subtle pinstripes, full-canvas construction, and breathable cupro lining.',
        'price_per_day': 3800.0,
        'image_file': 'suit_italian_charcoal_1.jpg',
        'culture': 'western',
        'clothing_type': 'suit',
        'gender': 'men',
        'gallery': ['suit_italian_charcoal_1.jpg', 'suit_italian_charcoal_2.jpg'],
    },
    {
        'name': 'Bespoke Ivory Peak-Lapel Tuxedo',
        'description': 'Immaculate cream-white dinner jacket tuxedo with contrasting black grosgrain lapels and dress trousers for summer galas.',
        'price_per_day': 5900.0,
        'image_file': 'tuxedo_ivory_peak_1.jpg',
        'culture': 'western',
        'clothing_type': 'tuxedo',
        'gender': 'men',
        'gallery': ['tuxedo_ivory_peak_1.jpg', 'tuxedo_ivory_peak_2.jpg'],
    },

    # ── FUSION COUTURE ────────────────────────────────────────────────────────
    {
        'name': 'Metallic Draped Concept Saree Gown',
        'description': 'Sculptural pre-pleated concept saree draped seamlessly over an architectural crepe bodice — modern runway meets Indian grace.',
        'price_per_day': 5500.0,
        'image_file': 'fusion_draped_saree_gown_1.jpg',
        'culture': 'fusion',
        'clothing_type': 'gown',
        'gender': 'women',
        'gallery': ['fusion_draped_saree_gown_1.jpg', 'fusion_draped_saree_gown_2.jpg'],
    },
    {
        'name': 'Brocade Asymmetric Indo-Western Tuxedo',
        'description': 'Gold Banarasi brocade dinner jacket cut with modern western asymmetric overlap lapels and cigarette formal trousers.',
        'price_per_day': 4600.0,
        'image_file': 'fusion_brocade_tuxedo_1.jpg',
        'culture': 'fusion',
        'clothing_type': 'tuxedo',
        'gender': 'men',
        'gallery': ['fusion_brocade_tuxedo_1.jpg', 'fusion_brocade_tuxedo_2.jpg'],
    },
    {
        'name': 'Cape-Sleeve Embroidered Cocktail Gown',
        'description': 'Fitted cocktail silhouette with cascading sheer organza cape sleeves, botanical threadwork, and thigh-high side slit.',
        'price_per_day': 4100.0,
        'image_file': 'fusion_cape_cocktail_1.jpg',
        'culture': 'fusion',
        'clothing_type': 'cocktail',
        'gender': 'women',
        'gallery': ['fusion_cape_cocktail_1.jpg', 'fusion_cape_cocktail_2.jpg'],
    },
    {
        'name': 'Contemporary Bandhgala Tuxedo Hybrid',
        'description': 'Innovative closed mandarin collar jacket tailored in Western wool twill with contrast pocket flap styling and modern cut.',
        'price_per_day': 4400.0,
        'image_file': 'fusion_bandhgala_hybrid_1.jpg',
        'culture': 'fusion',
        'clothing_type': 'suit',
        'gender': 'men',
        'gallery': ['fusion_bandhgala_hybrid_1.jpg', 'fusion_bandhgala_hybrid_2.jpg'],
    },
    {
        'name': 'Embellished Velvet Corset & Palazzo Set',
        'description': 'Midnight velvet boned bustier top paired with voluminous pure-silk wide-leg palazzos and embroidered belt.',
        'price_per_day': 3800.0,
        'image_file': 'fusion_velvet_palazzo_1.jpg',
        'culture': 'fusion',
        'clothing_type': 'other',
        'gender': 'women',
        'gallery': ['fusion_velvet_palazzo_1.jpg', 'fusion_velvet_palazzo_2.jpg'],
    },
    {
        'name': 'Modern Pastel Nehru Jacket & Chino Set',
        'description': 'Raw-silk mint pastel sleeveless Nehru waistcoat paired with fine Egyptian linen kurta and crisp formal slim chinos.',
        'price_per_day': 2900.0,
        'image_file': 'fusion_nehru_chino_1.jpg',
        'culture': 'fusion',
        'clothing_type': 'suit',
        'gender': 'men',
        'gallery': ['fusion_nehru_chino_1.jpg', 'fusion_nehru_chino_2.jpg'],
    },
    {
        'name': 'Ruby Silk Tailored Cape Blazer',
        'description': 'Dramatic scarlet structured silk blazer featuring split cape sleeves, peak lapels, and polished gold insignia buttons.',
        'price_per_day': 3600.0,
        'image_file': 'fusion_cape_blazer_1.jpg',
        'culture': 'fusion',
        'clothing_type': 'blazer',
        'gender': 'women',
        'gallery': ['fusion_cape_blazer_1.jpg', 'fusion_cape_blazer_2.jpg'],
    },
    {
        'name': 'Royal Indigo Draped Kurta-Suit',
        'description': 'Asymmetric cowl kurta in rich indigo silk layered under a sharp tailored Western single-breasted blazer and trousers.',
        'price_per_day': 3900.0,
        'image_file': 'fusion_indigo_draped_1.jpg',
        'culture': 'fusion',
        'clothing_type': 'kurta',
        'gender': 'men',
        'gallery': ['fusion_indigo_draped_1.jpg', 'fusion_indigo_draped_2.jpg'],
    },
]

with app.app_context():
    # Dynamic DB Migration Helper for SQLite
    if db.engine.name == 'sqlite':
        try:
            from sqlalchemy import text
            conn = db.engine.connect()

            # User table migrations
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

            # Dress table migrations — new cultural columns
            result_dress = conn.execute(text("PRAGMA table_info(dress)")).fetchall()
            existing_dress_cols = [row[1] for row in result_dress]
            if existing_dress_cols:
                if 'culture' not in existing_dress_cols:
                    conn.execute(text("ALTER TABLE dress ADD COLUMN culture VARCHAR(50) DEFAULT 'western'"))
                if 'clothing_type' not in existing_dress_cols:
                    conn.execute(text("ALTER TABLE dress ADD COLUMN clothing_type VARCHAR(50) DEFAULT 'other'"))
                if 'gender' not in existing_dress_cols:
                    conn.execute(text("ALTER TABLE dress ADD COLUMN gender VARCHAR(20) DEFAULT 'unisex'"))

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Migration warning: {e}")

    db.create_all()

    # Seed the database with expanded catalog if empty
    if not Dress.query.first():
        for item in INDIAN_WESTERN_CATALOG:
            d = Dress(
                name=item['name'],
                description=item['description'],
                price_per_day=item['price_per_day'],
                image_file=item['image_file'],
                css_filter='',
                culture=item.get('culture', 'western'),
                clothing_type=item.get('clothing_type', 'other'),
                gender=item.get('gender', 'unisex'),
            )
            db.session.add(d)
            db.session.flush()  # get d.id
            # Add gallery images
            for idx, img in enumerate(item.get('gallery', [item['image_file']])):
                db.session.add(DressImage(dress_id=d.id, image_file=img, sort_order=idx))

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

        # Sync all 24 catalog items into database with multi-photo galleries
        try:
            existing_dresses_by_name = {d.name: d for d in Dress.query.all()}
            for item in INDIAN_WESTERN_CATALOG:
                if item['name'] in existing_dresses_by_name:
                    d = existing_dresses_by_name[item['name']]
                    d.description = item['description']
                    d.price_per_day = item['price_per_day']
                    d.image_file = item['image_file']
                    d.css_filter = ''
                    d.culture = item.get('culture', 'western')
                    d.clothing_type = item.get('clothing_type', 'other')
                    d.gender = item.get('gender', 'unisex')
                    # Sync gallery images
                    DressImage.query.filter_by(dress_id=d.id).delete()
                    for idx, img in enumerate(item.get('gallery', [item['image_file']])):
                        db.session.add(DressImage(dress_id=d.id, image_file=img, sort_order=idx))
                else:
                    d = Dress(
                        name=item['name'],
                        description=item['description'],
                        price_per_day=item['price_per_day'],
                        image_file=item['image_file'],
                        css_filter='',
                        culture=item.get('culture', 'western'),
                        clothing_type=item.get('clothing_type', 'other'),
                        gender=item.get('gender', 'unisex'),
                    )
                    db.session.add(d)
                    db.session.flush()
                    for idx, img in enumerate(item.get('gallery', [item['image_file']])):
                        db.session.add(DressImage(dress_id=d.id, image_file=img, sort_order=idx))
            db.session.commit()
        except Exception as d_err:
            print(f"Startup catalog sync failed: {d_err}")


@app.route('/')
def index():
    dresses = Dress.query.order_by(Dress.id.desc()).limit(6).all()
    has_more = Dress.query.count() > 6
    return render_template('index.html', dresses=dresses, has_more=has_more)


@app.route('/collection')
def collection_all():
    """Collection page with optional filters: culture, type, gender, search."""
    culture = request.args.get('culture', '')       # indian | western | fusion
    clothing_type = request.args.get('type', '')    # gown | suit | saree | etc.
    gender = request.args.get('gender', '')          # women | men | unisex
    search = request.args.get('q', '').strip()

    query = Dress.query
    if culture:
        query = query.filter(Dress.culture == culture)
    if clothing_type:
        query = query.filter(Dress.clothing_type == clothing_type)
    if gender:
        query = query.filter(Dress.gender == gender)
    if search:
        query = query.filter(Dress.name.ilike(f'%{search}%'))

    dresses = query.order_by(Dress.id.asc()).all()

    # Build filter options for the UI
    all_cultures = [('', 'All Cultures'), ('indian', 'Indian'), ('western', 'Western'), ('fusion', 'Fusion')]
    all_types = [
        ('', 'All Types'),
        ('gown', 'Gown'), ('saree', 'Saree'), ('lehenga', 'Lehenga'),
        ('sherwani', 'Sherwani'), ('kurta', 'Kurta'),
        ('tuxedo', 'Tuxedo'), ('suit', 'Suit'), ('blazer', 'Blazer'), ('cocktail', 'Cocktail'),
    ]
    all_genders = [('', 'All'), ('women', 'Women'), ('men', 'Men'), ('unisex', 'Unisex')]

    return render_template(
        'collection_all.html',
        dresses=dresses,
        all_cultures=all_cultures,
        all_types=all_types,
        all_genders=all_genders,
        selected_culture=culture,
        selected_type=clothing_type,
        selected_gender=gender,
        search_query=search,
    )

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
