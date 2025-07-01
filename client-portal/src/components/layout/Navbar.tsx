import React from 'react';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  return (
    <nav>
      <button onClick={onMenuClick}>Toggle Menu</button>
      <h1>Client Portal Navbar</h1>
    </nav>
  );
};

export default Navbar;
