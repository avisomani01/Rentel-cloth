import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DressGrid from '../components/DressGrid';
import Loading from '../components/Loading';

const Collection = () => {
  const [dresses, setDresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDresses = async () => {
      try {
        const response = await api.get('/dresses');
        if (response.data.success) {
          setDresses(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching collection:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDresses();
  }, []);

  return (
    <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'var(--background)' }} className="page-fade-in">
      <section className="collection" style={{ padding: '2rem 5%' }}>
        <div className="container">
          <h2 className="section-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', color: 'var(--text)' }}>Entire Collection</h2>
          <p className="section-subtitle">Rent elite wardrobe from the community. Choose an option below to simulate booking.</p>
          
          {loading ? (
            <Loading />
          ) : dresses.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#606070', padding: '3rem 0' }}>
              <h3>No items listed in the collection yet.</h3>
            </div>
          ) : (
            <DressGrid dresses={dresses} />
          )}
        </div>
      </section>
    </div>
  );
};

export default Collection;
