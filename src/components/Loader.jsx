import React from 'react';

const Loader = ({ isLoading }) => {
  return (
    <div 
      id="loader" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        transition: 'opacity 0.5s ease, visibility 0.5s ease',
        opacity: isLoading ? 1 : 0,
        visibility: isLoading ? 'visible' : 'hidden',
      }}
    >
      <img src="/img/itya-loading.gif" alt="Loading..." style={{ width: '50px', marginBottom: '10px' }} />
      <p style={{ fontWeight: 'bold' }}>Now Loading...</p>
    </div>
  );
};

export default Loader;