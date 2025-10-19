import React, { memo } from 'react';

const LoadingSpinner = memo(({ message = "Đang tải..." }) => {
  return (
    <div className="flex justify-center items-center h-screen text-xl">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p>{message}</p>
      </div>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;

