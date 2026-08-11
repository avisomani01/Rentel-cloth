import React from 'react';
import DressCard from './DressCard';

const DressGrid = ({ dresses }) => {
  return (
    <div className="cards-container">
      {dresses && dresses.map((dress) => (
        <DressCard key={dress.id} dress={dress} />
      ))}
    </div>
  );
};

export default DressGrid;
