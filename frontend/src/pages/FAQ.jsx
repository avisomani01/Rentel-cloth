import React, { useState } from 'react';

const FAQ_ITEMS = [
  {
    id: 1,
    question: "How does Closet Share work?",
    answer: "Closet Share is a peer-to-peer premium wardrobe lending marketplace. Logged-in users can browse our curated catalog to rent designer gowns, suits, and sherwanis at a fraction of their retail price, or list their own unused luxury garments to earn recurring revenue."
  },
  {
    id: 2,
    question: "How are the garments cleaned?",
    answer: "Hygiene is our topmost priority. Every listed outfit is dry-cleaned by professional, eco-friendly specialists after each rental. Lenders just need to make sure the outfit is clean when listing, and we handle the cleaning cycle between rentals."
  },
  {
    id: 3,
    question: "What happens if a garment is damaged?",
    answer: "We offer complimentary rental insurance that covers minor wear and tear (such as small removable stains or minor loose threads). For major damage or lost items, our dispute team evaluates the replacement cost based on lender insurance policies."
  },
  {
    id: 4,
    question: "How do shipping and returns work?",
    answer: "We offer door-to-door delivery. Once your order is booked, the garment is delivered in premium packaging. After your rental duration ends, simply repack the item, apply the pre-printed return shipping label generated in your dashboard, and drop it off at the nearest logistics partner."
  }
];

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div style={{ paddingTop: '120px', minHeight: '100vh', background: 'var(--background)', paddingBottom: '60px' }} className="page-fade-in">
      <div className="container" style={{ maxWidth: '750px', padding: '0 20px' }}>
        <h2 className="section-title" style={{ fontSize: '3rem', color: 'var(--text)', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>Frequently Asked Questions</h2>
        <p style={{ sectionSubtitle: 'Everything you need to know about premium wardrobe rentals.', color: '#606070', textAlign: 'center', marginBottom: '3.5rem' }}>
          Everything you need to know about premium wardrobe rentals.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={item.id}
              style={{
                background: 'var(--white)',
                border: '1px solid var(--card-border)',
                borderRadius: '16px',
                padding: '1.2rem 1.8rem',
                boxShadow: 'var(--card-shadow)',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              onClick={() => toggleFAQ(idx)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '1.15rem', color: 'var(--text)', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                  {item.question}
                </h4>
                <span style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 300 }}>
                  {activeIndex === idx ? '−' : '+'}
                </span>
              </div>
              
              <div style={{
                maxHeight: activeIndex === idx ? '200px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease-out, margin-top 0.3s ease',
                marginTop: activeIndex === idx ? '1rem' : '0px',
                color: '#505060',
                fontSize: '0.95rem',
                lineHeight: '1.7'
              }}>
                {item.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
