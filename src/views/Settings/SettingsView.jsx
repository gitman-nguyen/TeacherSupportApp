import React from 'react';

// Đã loại bỏ props isSignedIn, getDriveToken, handleSignoutClick vì logic đã chuyển sang OrganizerView
function SettingsView({ settings, handleSettingsChange, handleSave, origin }) {
    
    // Thêm bước kiểm tra để tránh crash khi settings chưa được tải
    if (!settings) {
        return <div>Đang tải cài đặt...</div>;
    }

    // Ghi chú: Logic Kết nối Google Drive đã được loại bỏ hoàn toàn khỏi view này
    
    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Cài đặt Kết nối Google (Admin)</h2>
                 
                 <div className="space-y-4 mb-4">
                     <div>
                         <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">Google Client ID</label>
                         <input type="text" id="client_id" name="client_id" value={settings.client_id || ''} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-md" />
                     </div>
                 </div>
                 
                 <div className="mt-4 mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                     <p className="text-sm text-yellow-800">
                         <strong>Mẹo:</strong> Để API Key hoạt động, hãy đảm bảo bạn đã thêm địa chỉ sau vào phần "Authorized JavaScript origins" trong Google Cloud Console:
                     </p>
                     <div className="flex items-center mt-1">
                         <code className="text-sm bg-gray-200 p-1 rounded font-mono">{origin}</code>
                         {origin && <button onClick={() => navigator.clipboard.writeText(origin)} className="ml-2 text-xs bg-gray-300 hover:bg-gray-400 p-1 rounded">Sao chép</button>}
                     </div>
                 </div>
                 
                 <p className='mt-4 text-sm text-gray-600 font-medium'>
                    Lưu ý: Nút cấp quyền Drive đã được chuyển sang màn hình Sắp xếp.
                 </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Cài đặt API & Thư mục</h2>
                 <div>
                    <label htmlFor="api_key" className="block text-sm font-medium text-gray-700 mb-1">Google API Key</label>
                    <input type="text" id="api_key" name="api_key" value={settings.api_key || ''} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                    <label htmlFor="source_folder_id" className="block text-sm font-medium text-gray-700 mb-1">ID Thư mục Nguồn (hoặc URL)</label>
                    <input type="text" id="source_folder_id" name="source_folder_id" value={settings.source_folder_id || ''} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                    Lưu Cài đặt
                </button>
            </div>
        </div>
    );
}

export default SettingsView;
