import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import { getImageUrl } from '../components/DressCard';

const Checkout = () => {
  const { dressId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const bookingState = location.state || {};
  const { startDate, endDate, size, totalPrice, duration } = bookingState;

  const [dress, setDress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate || !size || !totalPrice) {
      navigate(`/dress/${dressId}`);
      return;
    }

    const fetchDressDetails = async () => {
      try {
        const response = await api.get(`/dresses/${dressId}`);
        if (response.data.success) {
          setDress(response.data.data);
        } else {
          setError(response.data.message || 'Garment details not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading garment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDressDetails();
  }, [dressId, startDate, endDate, size, totalPrice, navigate]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    const payload = {
      dress_id: parseInt(dressId),
      start_date: startDate,
      end_date: endDate,
      size,
      payment_method: paymentMethod,
    };

    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 14) {
        setError('Invalid Card Details. Card number must be at least 14 digits.');
        setSubmitLoading(false);
        return;
      }
      payload.card_number = cardNumber;
    } else {
      if (!upiId || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. user@okhdfcbank).');
        setSubmitLoading(false);
        return;
      }
      payload.upi_id = upiId;
    }

    try {
      const response = await api.post('/orders', payload);
      if (response.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment simulation failed. Please check details.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <div style={{ paddingTop: '150px' }}><Loading /></div>;
  }

  if (success) {
    return (
      <div style={{ paddingTop: '150px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '20px' }}>
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--card-border)',
          borderRadius: '24px',
          padding: '4rem 3rem',
          maxWidth: '550px',
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--card-shadow)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '4.5rem', color: 'var(--accent)', marginBottom: '1.5rem' }}>✓</div>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>Booking Confirmed!</h2>
          <p style={{ color: '#606070', marginBottom: '2.5rem', lineHeight: '1.8' }}>
            Your rental booking for <strong>{dress?.name}</strong> has been successfully placed. Your delivery is being scheduled!
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/dashboard" className="btn btn-primary" style={{ borderRadius: '30px', color: 'white' }}>Go to Dashboard</Link>
            <Link to="/collection" className="btn btn-outline" style={{ borderRadius: '30px' }}>Browse More</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'var(--background)', paddingBottom: '60px' }} className="page-fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
        .checkout-container {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 3rem;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .checkout-box {
          background: var(--white);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          box-shadow: var(--card-shadow);
        }
        .summary-card {
          display: flex;
          gap: 1.5rem;
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .summary-img {
          width: 90px;
          height: 110px;
          object-fit: contain;
          background: var(--background);
          border: 1px solid var(--card-border);
          border-radius: 12px;
        }
        .payment-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .toggle-btn {
          padding: 0.8rem;
          border: 1.5px solid var(--card-border);
          background: var(--background);
          color: var(--text);
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }
        .toggle-btn.active {
          border-color: var(--primary);
          color: var(--primary);
          background: rgba(108, 99, 255, 0.05);
        }
        @media (max-width: 900px) {
          .checkout-container {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      <div className="checkout-container">
        <div className="checkout-box">
          <h3 style={{ fontSize: '1.8rem', color: 'var(--text)', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>Payment & Simulation</h3>
          
          {error && (
            <div style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '8px', padding: '0.75rem', color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div className="payment-toggle">
            <button
              type="button"
              className={`toggle-btn ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              Credit/Debit Card
            </button>
            <button
              type="button"
              className={`toggle-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('upi')}
            >
              UPI Payment
            </button>
          </div>

          <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {paymentMethod === 'card' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Cardholder Name</label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Card Number</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Expiry Date</label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>CVV</label>
                    <input
                      type="password"
                      required
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="000"
                      maxLength="3"
                      style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>UPI ID</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. user@upi"
                  style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitLoading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, color: 'white' }}
            >
              {submitLoading ? 'Processing Simulated Payment...' : `Pay ₹${totalPrice}`}
            </button>
          </form>
        </div>

        <div className="checkout-box" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.8rem', color: 'var(--text)', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)' }}>Order Summary</h3>
          
          <div className="summary-card">
            <img src={getImageUrl(dress?.image_file)} alt={dress?.name} className="summary-img" />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.25rem', fontWeight: 700 }}>{dress?.name}</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>Size: {size}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#606070' }}>
              <span>Daily Rate</span>
              <span>₹{dress?.price_per_day} / day</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#606070' }}>
              <span>Rental Duration</span>
              <span>{duration} day{duration > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#606070' }}>
              <span>Booking Dates</span>
              <span style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                {new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
                {new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)', fontWeight: 700, fontSize: '1.3rem', borderTop: '1px solid rgba(108, 99, 255, 0.08)', paddingTop: '1rem' }}>
              <span>Total Price</span>
              <span style={{ color: 'var(--primary)' }}>₹{totalPrice}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
