import React from 'react';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  return (
    <aside style={{ width: open ? 240 : 60, transition: 'width 0.3s ease' }}>
      <button onClick={onToggle}>{open ? 'Close' : 'Open'}</button>
      <nav>
        <ul>
          <li>Dashboard</li>
          <li>Reports</li>
          <li>Service Requests</li>
          <li>Incidents</li>
          <li>Billing</li>
          <li>Settings</li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
