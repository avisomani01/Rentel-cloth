import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Loading from '../components/Loading';
import { getImageUrl } from '../components/DressCard';

const DressDetails = () => {
  const { dressId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [dress, setDress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [size, setSize] = useState('S');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const fetchDetails = async () => {
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
    fetchDetails();
  }, [dressId]);

  useEffect(() => {
    if (startDate && endDate && dress) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        setDuration(diffDays);
        setTotalPrice(diffDays * dress.price_per_day);
      } else {
        setDuration(0);
        setTotalPrice(0);
      }
    } else {
      setDuration(0);
      setTotalPrice(0);
    }
  }, [startDate, endDate, dress]);

  if (loading) {
    return <div style={{ paddingTop: '150px' }}><Loading /></div>;
  }

  if (error || !dress) {
    return (
      <div style={{ paddingTop: '150px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '20px' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '3rem 2rem', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: 'var(--card-shadow)' }}>
          <h2 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>Error</h2>
          <p style={{ color: '#606070', marginBottom: '2rem' }}>{error || 'Garment not found.'}</p>
          <Link to="/collection" className="btn btn-primary" style={{ borderRadius: '12px', color: 'white' }}>Return to Collection</Link>
        </div>
      </div>
    );
  }

  const handleBook = (e) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: `/dress/${dressId}` } } });
      return;
    }
    if (dress.owner_id === currentUser.id) {
      return;
    }
    if (duration <= 0) {
      alert('Please enter a valid rental duration (end date must be after start date).');
      return;
    }
    navigate(`/checkout/${dress.id}`, {
      state: {
        startDate,
        endDate,
        size,
        totalPrice,
        duration
      }
    });
  };

  const getFilterStyle = () => {
    if (!dress.css_filter) return {};
    try {
      const cleanFilter = dress.css_filter.replace('filter:', '').replace(';', '').trim();
      return { filter: cleanFilter };
    } catch (e) {
      return {};
    }
  };

  const isOwner = currentUser && dress.owner_id === currentUser.id;

  return (
    <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'var(--background)', paddingBottom: '60px' }} className="page-fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
        .detail-wrapper {
          max-width: 1200px;
          margin: 0 auto 60px;
          padding: 0 2rem;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 4rem;
          align-items: start;
        }
        .detail-media {
          display: flex;
          justify-content: center;
          align-items: center;
          position: sticky;
          top: 120px;
        }
        .detail-card-inner {
          border-radius: 24px;
          border: 1px solid var(--card-border);
          background: var(--white);
          padding: 3rem 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 450px;
          height: 520px;
          box-shadow: var(--card-shadow);
        }
        .detail-image {
          width: 90%;
          height: auto;
          max-height: 400px;
          object-fit: contain;
          filter: drop-shadow(0 20px 30px rgba(108, 99, 255, 0.1));
          z-index: 2;
          position: relative;
        }
        .detail-info {
          display: flex;
          flex-direction: column;
          gap: 1.8rem;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: #606070;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: color 0.3s;
          font-weight: 700;
        }
        .back-link:hover {
          color: var(--primary);
        }
        .dress-title {
          font-size: clamp(2.5rem, 4vw, 3.5rem);
          line-height: 1.1;
          color: var(--text);
        }
        .dress-meta {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 1.5rem;
        }
        .price-badge {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--primary);
        }
        .rating-stars {
          color: var(--yellow);
          font-size: 1.2rem;
        }
        .dress-desc {
          font-size: 1.05rem;
          color: #505060;
          line-height: 1.8;
        }
        .options-section {
          background: var(--white);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 2.2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          box-shadow: var(--card-shadow);
        }
        .options-title {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #606070;
          margin-bottom: 0.8rem;
          font-weight: 700;
        }
        .size-selector {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sizes {
          display: flex;
          gap: 0.8rem;
        }
        .size-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1.5px solid var(--card-border);
          background: var(--background);
          color: var(--text);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .size-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .size-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .date-picker-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .date-input {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .date-input label {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #606070;
          font-weight: 600;
        }
        .date-input input {
          background: var(--background);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          padding: 0.8rem;
          color: var(--text);
          font-family: inherit;
          outline: none;
          transition: border-color 0.3s;
        }
        .date-input input:focus {
          border-color: var(--primary);
        }
        .price-breakdown {
          border-top: 1px solid var(--card-border);
          padding-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          font-size: 0.95rem;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          color: #606070;
        }
        .price-row.total {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--primary);
          border-top: 1px solid rgba(108, 99, 255, 0.08);
          padding-top: 0.8rem;
        }
        @media (max-width: 900px) {
          .detail-wrapper {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .detail-media {
            position: relative;
            top: 0;
          }
        }
      `}} />

      <div className="detail-wrapper">
        <div className="detail-media" style={{ flexDirection: 'column', gap: '1.5rem' }}>
          <div className="detail-card-inner">
            <img 
              src={getImageUrl(dress.image_file)} 
              alt={dress.name} 
              className="detail-image"
              style={getFilterStyle()}
            />
          </div>
        </div>

        <div className="detail-info">
          <Link to="/collection" className="back-link">
            &larr; Back to collection
          </Link>
          <div>
            <h1 className="dress-title">{dress.name}</h1>
            <div className="dress-meta" style={{ marginTop: '1rem' }}>
              <span className="price-badge">₹{dress.price_per_day} / day</span>
              <span className="rating-stars">★★★★★</span>
            </div>
          </div>

          <p className="dress-desc">{dress.description}</p>

          <form onSubmit={handleBook} className="options-section">
            <div>
              <h3 className="options-title">Select Size</h3>
              <div className="size-selector">
                <div className="sizes">
                  {['S', 'M', 'L', 'XL'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`size-btn ${size === s ? 'active' : ''}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="options-title">Select Duration</h3>
              <div className="date-picker-group">
                <div className="date-input">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="date-input">
                  <label htmlFor="endDate">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    min={startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>

            {duration > 0 && (
              <div className="price-breakdown">
                <div className="price-row">
                  <span>Price per day</span>
                  <span>₹{dress.price_per_day}</span>
                </div>
                <div className="price-row">
                  <span>Rental duration</span>
                  <span>{duration} day{duration > 1 ? 's' : ''}</span>
                </div>
                <div className="price-row total">
                  <span>Total Amount</span>
                  <span>₹{totalPrice}</span>
                </div>
              </div>
            )}

            {isOwner ? (
              <div style={{
                background: 'rgba(108, 99, 255, 0.05)',
                border: '1px solid var(--primary)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                color: 'var(--primary)',
                fontSize: '0.95rem',
                fontWeight: 600
              }}>
                This is your listed garment.
              </div>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, color: 'white' }}
              >
                Book Rental Now
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default DressDetails;
