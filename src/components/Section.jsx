import React from 'react';
import FadeIn from './FadeIn'; 

const Section = ({ id, title, text, nextId, nextText }) => {
  return (
    <div id={id} className="ints column fade-section">
      <div className="row">
        <p className="bTitle">{title}</p>
      </div>
      
      <FadeIn>
        <p className="description">{text}</p>
        <a className="sTitle btn" href={`#${nextId}`}>{nextText}</a>
      </FadeIn>
    </div>
  );
};

export default Section;