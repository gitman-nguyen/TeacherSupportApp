import React, { memo } from 'react';

const Header = memo(({ currentUser, onLogout }) => {
  return (
    <header className="bg-white p-4 rounded-lg shadow-md mb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trình Sắp Xếp Ảnh Google Drive</h1>
          <p className="text-gray-600">Xin chào, {currentUser.name} ({currentUser.role})</p>
        </div>
        <button 
          onClick={onLogout} 
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;

