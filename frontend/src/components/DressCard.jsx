import React from 'react';
import { Link } from 'react-router-dom';

export const getImageUrl = (imageFile) => {
  if (!imageFile) return '';
  if (imageFile.startsWith('http://') || imageFile.startsWith('https://')) {
    return imageFile;
  }
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendBase = API_URL.replace(/\/api$/, '');
  return `${backendBase}/static/assets/${imageFile}`;
};

const DressCard = ({ dress }) => {
  const getFilterStyle = () => {
    if (!dress.css_filter) return {};
    try {
      const cleanFilter = dress.css_filter.replace('filter:', '').replace(';', '').trim();
      return { filter: cleanFilter };
    } catch (e) {
      return {};
    }
  };

  const getCategory = () => {
    const term = `${dress.name} ${dress.description}`.toLowerCase();
    if (term.includes('sherwani') || term.includes('sari') || term.includes('saree')) {
      return 'Ethnic Wear';
    } else if (term.includes('suit') || term.includes('tuxedo') || term.includes('blazer')) {
      return 'Formal Suit';
    } else {
      return 'Formal Gown';
    }
  };

  return (
    <Link to={`/dress/${dress.id}`} className="collection-card-link">
      <div className="collection-card">
        <div className="card-inner-img-wrapper">
          <img
            src={getImageUrl(dress.image_file)}
            alt={dress.name}
            className="card-image"
            style={getFilterStyle()}
          />
        </div>
        <div className="card-tag">{getCategory()}</div>
        <h3 className="card-name" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>{dress.name}</h3>
        <div className="card-rating">★★★★★</div>
        <div className="card-footer">
          <span className="price">
            <span className="price-num">₹{dress.price_per_day}</span> / day
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            View Details &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
};

export default DressCard;
