import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import DressGrid from '../components/DressGrid';
import Loading from '../components/Loading';
import { getImageUrl } from '../components/DressCard';
import HeroThreeDViewer from '../components/HeroThreeDViewer';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Ananya Sharma',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
    rating: 5,
    feedback: "Closet Share made finding an outfit for my friend's wedding incredibly easy. The dress looked exactly like the photos.",
    category: 'Gowns & Anarkalis',
    label: 'Verified Renter'
  },
  {
    id: 2,
    name: 'Rahul Mehta',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
    rating: 5,
    feedback: "I listed my formal suit and received my first rental request quickly. The whole process was simple.",
    category: 'Suits & Sherwanis',
    label: 'Verified Lender'
  },
  {
    id: 3,
    name: 'Priyanka Sen',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
    rating: 5,
    feedback: "Exceptional quality and pristine condition! I rented a luxury tuxedo for a gala and received compliments all night.",
    category: 'Designer Tuxedos',
    label: 'Verified Renter'
  }
];

const Home = () => {
  const [dresses, setDresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await api.get('/dresses');
        if (response.data.success) {
          const allDresses = response.data.data;
          setDresses(allDresses.slice(0, 6));
          setHasMore(allDresses.length > 6);
        }
      } catch (err) {
        console.error('Error fetching featured dresses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="page-fade-in">
      {/* Hero Section */}
      <header className="hero" style={{ minHeight: '85vh', paddingBottom: '3rem' }}>
        <div className="hero-content">
          <h1 className="hero-title" style={{ fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
            WEAR THE <br /><span>MOMENT</span>
          </h1>
          <p className="hero-subtitle">
            Rent premium fashion from people like you. Discover luxury attire, set your price, and list your clothes in a modern P2P marketplace.
          </p>
          <div className="hero-actions">
            <Link to="/collection" className="btn btn-primary" style={{ padding: '0.9rem 2.4rem' }}>Explore Collection &rarr;</Link>
            <Link to="/lend" className="btn btn-secondary" style={{ padding: '0.9rem 2.4rem' }}>List Your Clothes</Link>
          </div>
        </div>
        <div className="hero-3d-container">
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px', height: '420px' }}>
            <HeroThreeDViewer />
            <div style={{
              position: 'absolute',
              top: '15%',
              left: '10%',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(108,99,255,0.4) 0%, transparent 70%)',
              filter: 'blur(30px)',
              zIndex: 1,
              animation: 'float-blob 8s infinite alternate ease-in-out'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '10%',
              right: '5%',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,107,157,0.4) 0%, transparent 70%)',
              filter: 'blur(40px)',
              zIndex: 1,
              animation: 'float-blob 12s infinite alternate-reverse ease-in-out'
            }}></div>
          </div>
        </div>
      </header>

      {/* Testimonials */}
      <section className="testimonials" style={{ background: 'rgba(108,99,255,0.02)', padding: '5rem 5%', borderTop: '1px solid var(--card-border)' }}>
        <div className="container">
          <h2 className="section-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem' }}>LOVED BY OUR COMMUNITY</h2>
          <p className="section-subtitle">Real feedback from verified lenders and renters in VogueVault.</p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem',
            marginTop: '1rem'
          }}>
            {TESTIMONIALS.map((t) => (
              <div 
                key={t.id} 
                className="testimonial-card"
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '20px',
                  padding: '2.5rem',
                  boxShadow: 'var(--card-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                }}
              >
                <div>
                  <div style={{ color: 'var(--yellow)', fontSize: '1.2rem', marginBottom: '1rem' }}>
                    {'★'.repeat(t.rating)}
                  </div>
                  <p style={{ fontStyle: 'italic', color: 'var(--text)', fontSize: '1rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    "{t.feedback}"
                  </p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid rgba(108,99,255,0.06)', paddingTop: '1.2rem' }}>
                  <img 
                    src={t.avatar} 
                    alt={t.name} 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                  />
                  <div>
                    <h4 style={{ color: 'var(--text)', fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>{t.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>{t.category} &bull; {t.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
