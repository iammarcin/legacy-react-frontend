import React from 'react';
import './css/ProgressIndicator.css';

const ProgressIndicator = ({ message }) => {
 return (
  <div className="progress-indicator">
   <div className="progress-bar">
    <div className="progress"></div>
   </div>
   <div className="progress-message">{message}</div>
  </div>
 );
};

export default ProgressIndicator;
