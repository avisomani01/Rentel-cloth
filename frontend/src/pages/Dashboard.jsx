import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import { getImageUrl } from '../components/DressCard';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Review states
  const [selectedOrderReview, setSelectedOrderReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard');
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to retrieve dashboard metrics.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error retrieving dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleReturnOrder = async (orderId, dressName) => {
    const confirmReturn = window.confirm(`Are you sure you want to return the garment "${dressName}"? This will simulate generating a return shipping label.`);
    if (!confirmReturn) return;

    setError('');
    setMessage('');
    try {
      const response = await api.post(`/orders/${orderId}/return`);
      if (response.data.success) {
        setMessage(response.data.message);
        await fetchDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to return the item.');
    }
  };

  const handleRemoveListing = async (dressId, dressName) => {
    const confirmDelete = window.confirm(`Security confirmation: Are you sure you want to permanently delete your listing for "${dressName}"? This action is permanent and cannot be undone.`);
    if (!confirmDelete) return;

    setError('');
    setMessage('');
    try {
      const response = await api.delete(`/dresses/${dressId}`);
      if (response.data.success) {
        setMessage(response.data.message);
        await fetchDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove listing.');
    }
  };

  const handleOpenReviewModal = (orderId, dressName) => {
    setSelectedOrderReview({ orderId, dressName });
    setRating(5);
    setComment('');
    setReviewSubmitted(false);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    console.log(`Mock Review Submitted for Order #${selectedOrderReview.orderId}: Rating=${rating}, Comment="${comment}"`);
    setReviewSubmitted(true);
    setTimeout(() => {
      setSelectedOrderReview(null);
    }, 2000);
  };

  if (loading) {
    return <div style={{ paddingTop: '150px' }}><Loading /></div>;
  }

  if (error && !data) {
    return (
      <div style={{ paddingTop: '150px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '20px' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '3rem 2rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>Error</h2>
          <p style={{ color: '#606070', marginBottom: '2rem' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ borderRadius: '12px' }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'var(--background)', paddingBottom: '60px' }} className="page-fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .metric-card {
          background: var(--white);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: var(--card-shadow);
        }
        .metric-value {
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.25rem;
          font-family: var(--font-serif);
        }
        .metric-label {
          color: #606070;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .dashboard-section {
          background: var(--white);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          margin-bottom: 3rem;
          box-shadow: var(--card-shadow);
        }
        .section-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 1rem;
        }
        .section-hdr h3 {
          font-size: 1.8rem;
          color: var(--text);
        }
        .table-container {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th, td {
          padding: 1rem;
          border-bottom: 1px solid rgba(108,99,255,0.06);
          color: var(--text);
        }
        th {
          color: #606070;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .status-paid {
          background: rgba(0, 194, 168, 0.08);
          color: var(--accent);
        }
        .status-returned {
          background: rgba(108, 99, 255, 0.08);
          color: var(--primary);
        }
        .status-other {
          background: rgba(255, 107, 157, 0.08);
          color: var(--secondary);
        }
      `}} />

      <div className="container" style={{ padding: '0 20px' }}>
        <h2 style={{ fontSize: '3rem', color: 'var(--text)', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>User Dashboard</h2>
        <p style={{ color: '#606070', marginBottom: '2.5rem' }}>Track your active bookings, listed garments, and community wardrobe income.</p>

        {error && (
          <div style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '8px', padding: '0.75rem', color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: 'rgba(0, 194, 168, 0.08)', border: '1px solid rgba(0, 194, 168, 0.2)', borderRadius: '8px', padding: '0.75rem', color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {message}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="dashboard-grid">
          <div className="metric-card">
            <div className="metric-value">{data?.active_rentals_count}</div>
            <div className="metric-label">Active Rentals</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{data?.total_rentals_count}</div>
            <div className="metric-label">Total Rented Outfits</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              {data?.nearest_return_days !== null && data?.nearest_return_days !== undefined
                ? `${data.nearest_return_days} day${data.nearest_return_days === 1 ? '' : 's'}`
                : 'No Returns'}
            </div>
            <div className="metric-label">Next Return Window</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">₹{data?.lending_earnings || 0}</div>
            <div className="metric-label">Total Earnings</div>
          </div>
        </div>

        {/* Section 1: Bookings */}
        <div className="dashboard-section">
          <div className="section-hdr">
            <h3>My Rental Bookings</h3>
            <Link to="/collection" className="btn btn-outline btn-small" style={{ borderRadius: '20px' }}>Browse More</Link>
          </div>
          {data?.orders.length === 0 ? (
            <p style={{ color: '#606070', textAlign: 'center', padding: '2rem 0' }}>You have not rented any outfits yet.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Outfit</th>
                    <th>Booking Duration</th>
                    <th>Total Paid</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: 'none' }}>
                        <img
                          src={getImageUrl(o.dress.image_file)}
                          alt={o.dress.name}
                          style={{
                            width: '45px',
                            height: '45px',
                            objectFit: 'contain',
                            background: 'rgba(108,99,255,0.02)',
                            borderRadius: '8px',
                            border: '1px solid var(--card-border)'
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{o.dress.name}</span>
                      </td>
                      <td>
                        {new Date(o.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} -{' '}
                        {new Date(o.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>₹{o.total_price}</td>
                      <td>
                        <span className={`status-badge ${o.status === 'Paid' ? 'status-paid' : o.status === 'Returned' ? 'status-returned' : 'status-other'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        {o.status !== 'Returned' ? (
                          <button
                            onClick={() => handleReturnOrder(o.id, o.dress.name)}
                            className="btn btn-small"
                            style={{ borderRadius: '12px', fontSize: '0.75rem' }}
                          >
                            Return Outfit
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReviewModal(o.id, o.dress.name)}
                            className="btn btn-small"
                            style={{ borderRadius: '12px', fontSize: '0.75rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                          >
                            Leave a Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Listings */}
        <div className="dashboard-section">
          <div className="section-hdr">
            <h3>My Listed Outfits</h3>
            <Link to="/lend" className="btn btn-primary btn-small" style={{ borderRadius: '20px', color: 'white' }}>List Garment</Link>
          </div>
          {data?.listings.length === 0 ? (
            <p style={{ color: '#606070', textAlign: 'center', padding: '2rem 0' }}>You have not listed any outfits for rental.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Outfit</th>
                    <th>Daily Rate</th>
                    <th>Times Rented</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.listings.map((l) => (
                    <tr key={l.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: 'none' }}>
                        <img
                          src={getImageUrl(l.image_file)}
                          alt={l.name}
                          style={{
                            width: '45px',
                            height: '45px',
                            objectFit: 'contain',
                            background: 'rgba(108,99,255,0.02)',
                            borderRadius: '8px',
                            border: '1px solid var(--card-border)'
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{l.name}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>₹{l.price_per_day}/day</td>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{l.times_rented}</td>
                      <td style={{ color: '#606070', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.description}
                      </td>
                      <td>
                        <button
                          onClick={() => handleRemoveListing(l.id, l.name)}
                          className="btn btn-small"
                          style={{
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            border: '1px solid rgba(255, 77, 77, 0.4)',
                            color: '#ff4d4d'
                          }}
                        >
                          Remove Listing
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal Dialog */}
      {selectedOrderReview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--card-border)',
            borderRadius: '24px',
            padding: '2.5rem',
            maxWidth: '450px',
            width: '90%',
            boxShadow: 'var(--card-shadow-hover)'
          }}>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--text)', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>Leave a Review</h3>
            <p style={{ color: '#606070', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Share your experience renting <strong>{selectedOrderReview.dressName}</strong>.</p>
            
            {reviewSubmitted ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem' }}>✓</div>
                <h4 style={{ color: 'var(--text)', fontWeight: 700 }}>Thank You!</h4>
                <p style={{ color: '#606070', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Your feedback has been received. <br />
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>(Mock API Target: POST /api/orders/{selectedOrderReview.orderId}/review)</span>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px' }}>Rating</label>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.8rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => setRating(star)}
                        style={{ cursor: 'pointer', color: star <= rating ? 'var(--yellow)' : '#ddd', transition: 'color 0.2s' }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Feedback</label>
                  <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write your experience..."
                    rows="4"
                    style={{
                      padding: '0.8rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid var(--card-border)',
                      background: 'var(--background)',
                      color: 'var(--text)',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'none'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderReview(null)}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', color: 'white' }}
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
