import React, { memo } from 'react';

const Navigation = memo(({ currentView, onViewChange, currentUser }) => {
  const navigationItems = [
    { id: 'schedule', label: 'Lịch học' },
    { id: 'gallery', label: 'Thư viện ảnh' },
    { id: 'organizer', label: 'Sắp xếp' }
  ];

  const adminItems = [
    { id: 'settings', label: 'Cài đặt' },
    { id: 'admin', label: 'Quản trị' }
  ];

  return (
    <div className="flex justify-center border-b mb-8 space-x-2">
      {navigationItems.map(item => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`py-2 px-4 text-lg font-semibold rounded-t-lg ${
            currentView === item.id ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          {item.label}
        </button>
      ))}
      {currentUser.role === 'Admin' && adminItems.map(item => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`py-2 px-4 text-lg font-semibold rounded-t-lg ${
            currentView === item.id ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;

