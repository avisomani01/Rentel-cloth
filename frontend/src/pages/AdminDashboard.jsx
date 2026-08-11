import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Loading from '../components/Loading';
import { getImageUrl } from '../components/DressCard';

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemImage, setNewItemImage] = useState('dress_premium.png');
  const [newItemColor, setNewItemColor] = useState('none');
  const [addingItem, setAddingItem] = useState(false);

  const fetchAdminData = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      if (response.data.success) {
        setAdminData(response.data.data);
      } else {
        setError(response.data.message || 'Access denied or failed to load data.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setAddingItem(true);

    try {
      const response = await api.post('/admin/dresses', {
        name: newItemName,
        description: newItemDesc,
        price: parseFloat(newItemPrice),
        image_type: newItemImage,
        color: newItemColor,
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setNewItemName('');
        setNewItemDesc('');
        setNewItemPrice('');
        setNewItemImage('dress_premium.png');
        setNewItemColor('none');
        await fetchAdminData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add item.');
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (dressId, name) => {
    const confirmDelete = window.confirm(`Admin Action: Are you sure you want to permanently delete "${name}"? This will delete all order histories related to this item.`);
    if (!confirmDelete) return;

    setError('');
    setMessage('');
    try {
      const response = await api.delete(`/admin/dresses/${dressId}`);
      if (response.data.success) {
        setMessage(response.data.message);
        await fetchAdminData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete item.');
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setError('');
    setMessage('');
    try {
      const response = await api.patch(`/admin/orders/${orderId}`, { status: newStatus });
      if (response.data.success) {
        setMessage(response.data.message);
        await fetchAdminData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  if (loading) {
    return <div style={{ paddingTop: '150px' }}><Loading /></div>;
  }

  if (error && !adminData) {
    return (
      <div style={{ paddingTop: '150px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '20px' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '3rem 2rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: '#606070', marginBottom: '2rem' }}>{error}</p>
          <a href="/" className="btn btn-primary" style={{ borderRadius: '12px' }}>Return Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'var(--background)', paddingBottom: '60px' }} className="page-fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .admin-metric-card {
          background: var(--white);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: var(--card-shadow);
        }
        .admin-metric-value {
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.25rem;
          font-family: var(--font-serif);
        }
        .admin-metric-label {
          color: #606070;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .admin-section {
          background: var(--white);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          margin-bottom: 3rem;
          box-shadow: var(--card-shadow);
        }
        .admin-section h3 {
          font-size: 1.8rem;
          color: var(--text);
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 0.8rem;
        }
        .add-item-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
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
        @media (max-width: 768px) {
          .add-item-form {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      <div className="container" style={{ padding: '0 20px' }}>
        <h2 style={{ fontSize: '3rem', color: 'var(--text)', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>Admin Panel</h2>
        <p style={{ color: '#606070', marginBottom: '2.5rem' }}>Global marketplace controls, inventory records, and logistics status patching.</p>

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

        <div className="admin-grid">
          <div className="admin-metric-card">
            <div className="admin-metric-value">₹{adminData?.total_revenue}</div>
            <div className="admin-metric-label">Total Revenue</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-value">{adminData?.active_rentals}</div>
            <div className="admin-metric-label">Active Rentals</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-value">{adminData?.inventory_count}</div>
            <div className="admin-metric-label">Inventory Size</div>
          </div>
          <div className="admin-metric-card">
            <div className="admin-metric-value">{adminData?.user_count}</div>
            <div className="admin-metric-label">Registered Users</div>
          </div>
        </div>

        <div className="admin-section">
          <h3>Add Premium Wardrobe Item</h3>
          <form onSubmit={handleAddItem} className="add-item-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Garment Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Premium Blue Silk Sherwani"
                  style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Daily Rate (INR)</label>
                <input
                  type="number"
                  required
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="e.g. 1500"
                  min="0"
                  style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Description</label>
                <textarea
                  required
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Premium handwoven threads with elegant styling details..."
                  rows="4"
                  style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Fallback Image Style</label>
                <select
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
                  style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none', height: '46px' }}
                >
                  <option value="dress_premium.png">Dress Premium (Golden Gown)</option>
                  <option value="suit_premium.png">Suit Premium (Black/Gold Tuxedo)</option>
                  <option value="dress.png">Standard Dress (Red Gown)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Render Color Theme Filter</label>
                <select
                  value={newItemColor}
                  onChange={(e) => setNewItemColor(e.target.value)}
                  style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--card-border)', background: 'var(--background)', color: 'var(--text)', outline: 'none', height: '46px' }}
                >
                  <option value="none">Original Colors</option>
                  <option value="blue">Blue Spectrum Filter (180deg)</option>
                  <option value="red">Red Spectrum Filter (-90deg)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={addingItem}
                className="btn btn-primary"
                style={{ width: '100%', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, color: 'white' }}
              >
                {addingItem ? 'Adding Garment...' : 'Add Item to Catalog'}
              </button>
            </div>
          </form>
        </div>

        <div className="admin-section">
          <h3>Garment Catalog Inventory</h3>
          {adminData?.dresses.length === 0 ? (
            <p style={{ color: '#606070', textAlign: 'center' }}>No dresses listed yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Outfit</th>
                    <th>Price</th>
                    <th>Lender</th>
                    <th>CSS Filter</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData?.dresses.map((d) => (
                    <tr key={d.id}>
                      <td style={{ borderBottom: 'none' }}>#{d.id}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: 'none' }}>
                        <img
                          src={getImageUrl(d.image_file)}
                          alt={d.name}
                          style={{
                            width: '45px',
                            height: '45px',
                            objectFit: 'contain',
                            background: 'rgba(108,99,255,0.02)',
                            borderRadius: '8px',
                            border: '1px solid var(--card-border)',
                            filter: d.css_filter ? d.css_filter.replace('filter:', '').replace(';', '').trim() : ''
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{d.name}</span>
                      </td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600, borderBottom: 'none' }}>₹{d.price_per_day}/day</td>
                      <td style={{ borderBottom: 'none' }}>{d.owner_username}</td>
                      <td style={{ fontSize: '0.8rem', color: '#666', fontFamily: 'monospace', borderBottom: 'none' }}>{d.css_filter || 'none'}</td>
                      <td style={{ borderBottom: 'none' }}>
                        <button
                          onClick={() => handleDeleteItem(d.id, d.name)}
                          className="btn btn-small"
                          style={{ border: '1px solid rgba(255, 77, 77, 0.4)', color: '#ff4d4d', borderRadius: '12px', fontSize: '0.75rem' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-section">
          <h3>Orders & Delivery Logistics</h3>
          {adminData?.orders.length === 0 ? (
            <p style={{ color: '#606070', textAlign: 'center' }}>No orders placed yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Garment</th>
                    <th>Placed At</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData?.orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ borderBottom: 'none' }}>#{o.id}</td>
                      <td style={{ borderBottom: 'none' }}>{o.username}</td>
                      <td style={{ fontWeight: 600, borderBottom: 'none' }}>{o.dress_name}</td>
                      <td style={{ borderBottom: 'none' }}>{new Date(o.date_rented).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600, borderBottom: 'none' }}>₹{o.total_price}</td>
                      <td style={{ borderBottom: 'none' }}>
                        <span className={`status-badge ${o.status === 'Paid' ? 'status-paid' : o.status === 'Returned' ? 'status-returned' : 'status-other'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ borderBottom: 'none' }}>
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                          style={{
                            background: 'var(--background)',
                            color: 'var(--text)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            padding: '0.4rem 0.8rem',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Active">Active</option>
                          <option value="Returned">Returned</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
