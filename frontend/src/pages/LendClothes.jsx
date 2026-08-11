import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const LendClothes = () => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('dress');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!imageFile) {
      setError('Please select an image file for the garment.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('description', description);
    formData.append('image', imageFile);

    try {
      const response = await api.post('/dresses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to list outfit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'var(--background)', paddingBottom: '60px' }} className="page-fade-in">
      <div className="container" style={{ maxWidth: '650px', padding: '0 20px' }}>
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--card-border)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          boxShadow: 'var(--card-shadow)',
          backdropFilter: 'blur(12px)'
        }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '0.5rem', textAlign: 'center', fontFamily: 'var(--font-serif)' }}>
            Lend Your Outfit
          </h2>
          <p style={{ color: '#606070', marginBottom: '2rem', textAlign: 'center', fontSize: '0.95rem' }}>
            List your premium fashion piece on Closet Share and start earning.
          </p>

          {error && (
            <div style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '8px', padding: '0.75rem', color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: 'rgba(0, 194, 168, 0.08)', border: '1px solid rgba(0, 194, 168, 0.2)', borderRadius: '8px', padding: '0.75rem', color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Outfit Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Sabyasachi Velvet Sherwani"
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--background)',
                  color: 'var(--text)',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    outline: 'none',
                    height: '46px'
                  }}
                >
                  <option value="dress">Dress / Gown</option>
                  <option value="suit">Suit / Sherwani / Tuxedo</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Rental Price (per day)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="₹ per day"
                  min="0"
                  style={{
                    padding: '0.8rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your outfit (sizing fit details, condition, style suggestions...)"
                rows="4"
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--background)',
                  color: 'var(--text)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#606070', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Outfit Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--background)',
                  color: 'var(--text)',
                  outline: 'none'
                }}
              />
              {imagePreview && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', border: '1px solid var(--card-border)' }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, color: 'white' }}
            >
              {loading ? 'Submitting Listing...' : 'Submit Outfit Listing'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LendClothes;
