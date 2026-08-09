from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    # 0 = User, 1 = Admin (Can add dresses)
    role = db.Column(db.Integer, default=0)
    failed_login_attempts = db.Column(db.Integer, default=0)
    lockout_until = db.Column(db.DateTime, nullable=True)
    email = db.Column(db.String(150), unique=True, nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    otp = db.Column(db.String(10), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    otp_attempts = db.Column(db.Integer, default=0)
    otp_last_sent = db.Column(db.DateTime, nullable=True)

class Dress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price_per_day = db.Column(db.Float, nullable=False)
    image_file = db.Column(db.String(150), nullable=False, default='dress.png')
    # Use to create css filters for different dress looks
    css_filter = db.Column(db.String(100), nullable=True, default='')
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    owner = db.relationship('User', backref=db.backref('dresses', lazy=True))

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    dress_id = db.Column(db.Integer, db.ForeignKey('dress.id'), nullable=False)
    date_rented = db.Column(db.DateTime, default=datetime.utcnow)
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)
    total_price = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(50), default='Paid')

    user = db.relationship('User', backref=db.backref('orders', lazy=True))
    dress = db.relationship('Dress', backref=db.backref('orders', lazy=True))
