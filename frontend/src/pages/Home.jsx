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
          <div style={{ position: 'relative', width: '100%', maxWidth: '440px', height: '440px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeroThreeDViewer />
          </div>
        </div>
      </header>

      {/* Curated Editorial Editions */}
      <section id="editions" className="editorial-section">
        <div className="container">
          <div className="editorial-header">
            <span className="editorial-eyebrow">Curated Collections</span>
            <h2 className="section-title">The Seasonal <span>Editions</span></h2>
            <p className="section-subtitle">Editorial portfolios tailored for red carpets, galas, and defining celebrations.</p>
          </div>
          <div className="editorial-grid">
            <Link to="/collection" className="editorial-card">
              <div className="editorial-card-img-wrap">
                <img src="/images/editorial_gala.jpg" alt="Black Tie and Gala Gowns" className="editorial-card-img" loading="lazy" />
              </div>
              <div className="editorial-card-overlay"></div>
              <div className="editorial-card-content">
                <span className="editorial-card-tag">01 / Black Tie & Gala</span>
                <h3 className="editorial-card-title">Evening Gowns</h3>
                <p className="editorial-card-desc">Fluid silk silhouettes and architectural gowns crafted for grand entrances.</p>
                <span className="editorial-card-cta">Explore Edit &rarr;</span>
              </div>
            </Link>

            <Link to="/collection" className="editorial-card">
              <div className="editorial-card-img-wrap">
                <img src="/images/editorial_suit.jpg" alt="Bespoke Tailored Suits and Tuxedos" className="editorial-card-img" loading="lazy" />
              </div>
              <div className="editorial-card-overlay"></div>
              <div className="editorial-card-content">
                <span className="editorial-card-tag">02 / Tailored Suiting</span>
                <h3 className="editorial-card-title">Bespoke Tuxedos</h3>
                <p className="editorial-card-desc">Sharp Italian wool blazers and velvet black-tie suiting for distinguished occasions.</p>
                <span className="editorial-card-cta">Explore Edit &rarr;</span>
              </div>
            </Link>

            <Link to="/collection" className="editorial-card">
              <div className="editorial-card-img-wrap">
                <img src="/images/editorial_cocktail.jpg" alt="Cocktail and Soirée Fashion" className="editorial-card-img" loading="lazy" />
              </div>
              <div className="editorial-card-overlay"></div>
              <div className="editorial-card-content">
                <span className="editorial-card-tag">03 / Cocktail & Soirée</span>
                <h3 className="editorial-card-title">Modern Chic</h3>
                <p className="editorial-card-desc">Effortless silk slips, striking party silhouettes, and contemporary evening wear.</p>
                <span className="editorial-card-cta">Explore Edit &rarr;</span>
              </div>
            </Link>

            <Link to="/collection" className="editorial-card">
              <div className="editorial-card-img-wrap">
                <img src="/images/editorial_couture.jpg" alt="Runway and Rare Archive Fashion" className="editorial-card-img" loading="lazy" />
              </div>
              <div className="editorial-card-overlay"></div>
              <div className="editorial-card-content">
                <span className="editorial-card-tag">04 / Limited Archive</span>
                <h3 className="editorial-card-title">Haute Couture</h3>
                <p className="editorial-card-desc">Rare designer archive statements and intricate embroidery for visionary styling.</p>
                <span className="editorial-card-cta">Explore Edit &rarr;</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Pieces */}
      <section className="featured-section" style={{ padding: '4rem 5% 5rem' }}>
        <div className="container">
          <div className="editorial-header">
            <span className="editorial-eyebrow">Coveted Pieces</span>
            <h2 className="section-title">Featured in <span>The Vault</span></h2>
            <p className="section-subtitle">Explore our most requested designer garments in interactive 3D.</p>
          </div>
          {loading ? (
            <Loading message="Loading curated vault..." />
          ) : (
            <>
              <DressGrid dresses={dresses.slice(0, 3)} />
              <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
                <Link to="/collection" className="btn btn-outline" style={{ padding: '0.9rem 2.4rem' }}>
                  Explore Full Collection &rarr;
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Editorial Story / Brand Philosophy */}
      <section className="editorial-story-section">
        <div className="editorial-story-container">
          <div className="story-visual-wrap">
            <img src="/images/editorial_story.jpg" alt="WearLoop Luxury Fashion Atelier" className="story-img" loading="lazy" />
            <div className="story-badge">
              <span className="story-badge-dot"></span>
              <span>WearLoop Atelier &bull; 100% Verified Couture</span>
            </div>
          </div>
          <div className="story-content">
            <span className="editorial-eyebrow">The Atelier Standard</span>
            <h2>Luxury Without Excess. <span>Wear The Unattainable.</span></h2>
            <p className="story-lead">Accessing iconic designer fashion shouldn't demand permanent ownership. WearLoop connects collectors and style connoisseurs through a seamless, circular rental experience.</p>
            <div className="story-features">
              <div className="story-feature-item">
                <span className="story-feature-num">01</span>
                <div className="story-feature-text">
                  <h4>White-Glove Curation</h4>
                  <p>Every piece is authenticated, hand-inspected, and delivered freshly dry-cleaned by master garment artisans.</p>
                </div>
              </div>
              <div className="story-feature-item">
                <span className="story-feature-num">02</span>
                <div className="story-feature-text">
                  <h4>Effortless Doorstep Service</h4>
                  <p>Direct courier delivery in luxury garment bags with pre-addressed, zero-waste return satchels included.</p>
                </div>
              </div>
              <div className="story-feature-item">
                <span className="story-feature-num">03</span>
                <div className="story-feature-text">
                  <h4>Sustainable High Fashion</h4>
                  <p>Keep exquisite fashion in constant circulation while actively reducing textile waste and carbon emissions.</p>
                </div>
              </div>
            </div>
            <div className="story-actions">
              <Link to="/collection" className="btn btn-primary">Start Renting</Link>
              <Link to="/lend" className="btn btn-outline">Lend Your Clothes</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials" style={{ padding: '5rem 5%', borderTop: '1px solid var(--card-border)' }}>
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
