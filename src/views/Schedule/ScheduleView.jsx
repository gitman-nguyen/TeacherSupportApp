import React, { useState } from 'react';
import WeekCalendarView from './WeekCalendarView';
import MonthCalendarView from './MonthCalendarView';
import { BACKEND_URL, dayOfWeekMap } from '../../utils/constants';

function ScheduleView({ recurringSchedule = [], setRecurringSchedule, oneOffSchedule = [], setOneOffSchedule, log }) {
    const initialRecurringState = { schoolName: '', className: '', daysOfWeek: [], startTime: '08:00', endTime: '09:30', expiryDate: '' };
    const initialOneOffState = { schoolName: '', className: '', date: '', startTime: '08:00', endTime: '09:30' };

    const [currentRecurringEntry, setCurrentRecurringEntry] = useState(initialRecurringState);
    const [currentOneOffEntry, setCurrentOneOffEntry] = useState(initialOneOffState);
    const [editingEntry, setEditingEntry] = useState(null);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [tooltip, setTooltip] = useState({ visible: false, content: null, x: 0, y: 0 });
    const [calendarView, setCalendarView] = useState('week'); // 'week' or 'month'

    // Helper to get headers with Auth token, adjusted for backend requirements
    const getAuthHeaders = () => {
        // Backend expects the key 'apiToken' from the login response
        const token = localStorage.getItem('apiToken'); 
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            // Backend's @token_required decorator looks for 'x-access-token'
            headers['x-access-token'] = token; 
        } else {
            console.warn("Không tìm thấy apiToken. Yêu cầu sẽ được gửi đi mà không có xác thực.");
        }
        return headers;
    };


    const handleEditClick = (entry, type) => {
        setEditingEntry({ type, id: entry.id });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (type === 'recurring') {
            setCurrentRecurringEntry({ ...entry, daysOfWeek: entry.daysOfWeek.map(String) });
        } else {
            setCurrentOneOffEntry({ ...entry });
        }
    };
    
    const cancelEdit = () => {
        setEditingEntry(null);
        setCurrentRecurringEntry(initialRecurringState);
        setCurrentOneOffEntry(initialOneOffState);
    };

    const handleRecurringChange = (e) => {
        const { name, value } = e.target;
        setCurrentRecurringEntry(prev => ({ ...prev, [name]: value }));
    };

    const handleDayToggle = (day) => {
        setCurrentRecurringEntry(prev => {
            const days = prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day];
            return { ...prev, daysOfWeek: days.sort((a, b) => a - b) };
        });
    };

    const handleSaveRecurring = async (e) => {
        e.preventDefault();
        if (!currentRecurringEntry.schoolName || !currentRecurringEntry.className || currentRecurringEntry.daysOfWeek.length === 0) {
            alert('Vui lòng điền Tên trường, Tên lớp và chọn ít nhất một ngày trong tuần.');
            return;
        }
        
        const isEditing = editingEntry && editingEntry.type === 'recurring';
        const url = isEditing ? `${BACKEND_URL}/recurring-schedules/${editingEntry.id}` : `${BACKEND_URL}/recurring-schedules`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(currentRecurringEntry),
            });
            if (response.status === 401) {
                 throw new Error('Xác thực không thành công. Vui lòng đăng nhập lại.');
            }
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    throw new Error(response.statusText || `Failed to ${isEditing ? 'update' : 'add'} schedule`);
                }
                throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'add'} schedule`);
            }
            const savedSchedule = await response.json();
            
            if (isEditing) {
                setRecurringSchedule(prev => prev.map(item => item.id === savedSchedule.id ? savedSchedule : item));
                log('Cập nhật lịch định kỳ thành công', 'success');
            } else {
                setRecurringSchedule(prev => [...prev, savedSchedule]);
                log('Thêm lịch định kỳ thành công', 'success');
            }
            cancelEdit();
        } catch (error) {
            log(`Lỗi: ${error.message}`, 'error');
        }
    };
    
    const handleDeleteRecurring = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa lịch học này?')) {
            try {
                const response = await fetch(`${BACKEND_URL}/recurring-schedules/${id}`, { 
                    method: 'DELETE',
                    headers: getAuthHeaders() 
                });
                if (response.status === 401) {
                    throw new Error('Xác thực không thành công. Vui lòng đăng nhập lại.');
                }
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (parseError) {
                        throw new Error(response.statusText || 'Failed to delete schedule');
                    }
                    throw new Error(errorData.message || 'Failed to delete schedule');
                }
                setRecurringSchedule(prev => prev.filter(e => e.id !== id));
                log('Xóa lịch định kỳ thành công', 'success');
            } catch (error) {
                log(`Lỗi: ${error.message}`, 'error');
            }
        }
    };

    const handleOneOffChange = (e) => {
        const { name, value } = e.target;
        setCurrentOneOffEntry(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveOneOff = async (e) => {
        e.preventDefault();
        if (!currentOneOffEntry.schoolName || !currentOneOffEntry.className || !currentOneOffEntry.date) {
            alert('Vui lòng điền đầy đủ Tên trường, Tên lớp và Ngày.');
            return;
        }
        
        const isEditing = editingEntry && editingEntry.type === 'one-off';
        const url = isEditing ? `${BACKEND_URL}/one-off-schedules/${editingEntry.id}` : `${BACKEND_URL}/one-off-schedules`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(currentOneOffEntry),
            });
            if (response.status === 401) {
                throw new Error('Xác thực không thành công. Vui lòng đăng nhập lại.');
            }
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    throw new Error(response.statusText || `Failed to ${isEditing ? 'update' : 'add'} schedule`);
                }
                throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'add'} schedule`);
            }
            const savedSchedule = await response.json();
            
            if (isEditing) {
                setOneOffSchedule(prev => prev.map(item => item.id === savedSchedule.id ? savedSchedule : item));
                log('Cập nhật lịch đột xuất thành công', 'success');
            } else {
                setOneOffSchedule(prev => [...prev, savedSchedule].sort((a, b) => new Date(a.date) - new Date(b.date)));
                log('Thêm lịch đột xuất thành công', 'success');
            }
            cancelEdit();
        } catch (error) {
             log(`Lỗi: ${error.message}`, 'error');
        }
    };

    const handleDeleteOneOff = async (id) => {
         if (window.confirm('Bạn có chắc chắn muốn xóa lịch học này?')) {
            try {
                const response = await fetch(`${BACKEND_URL}/one-off-schedules/${id}`, { 
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                if (response.status === 401) {
                    throw new Error('Xác thực không thành công. Vui lòng đăng nhập lại.');
                }
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (parseError) {
                        throw new Error(response.statusText || 'Failed to delete schedule');
                    }
                    throw new Error(errorData.message || 'Failed to delete schedule');
                }
                setOneOffSchedule(prev => prev.filter(e => e.id !== id));
                log('Xóa lịch đột xuất thành công', 'success');
            } catch (error) {
                log(`Lỗi: ${error.message}`, 'error');
            }
         }
    };
    
    const goToPrevious = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (calendarView === 'week') {
                newDate.setDate(newDate.getDate() - 7);
            } else {
                newDate.setMonth(newDate.getMonth() - 1);
            }
            return newDate;
        });
    };
    
    const goToNext = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (calendarView === 'week') {
                newDate.setDate(newDate.getDate() + 7);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };
    
    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const isRecurringEditing = editingEntry && editingEntry.type === 'recurring';
    const isOneOffEditing = editingEntry && editingEntry.type === 'one-off';

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
                    {editingEntry ? 'Chỉnh sửa Lịch học' : 'Thêm Lịch học'}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                     <form onSubmit={handleSaveRecurring} className={`space-y-4 p-4 border rounded-lg bg-gray-50 flex flex-col ${isOneOffEditing ? 'opacity-40 pointer-events-none' : ''}`}>
                        <h3 className="font-semibold text-lg text-center text-gray-800">Lịch Định kỳ (Hàng tuần)</h3>
                        <input type="text" name="schoolName" value={currentRecurringEntry.schoolName} onChange={handleRecurringChange} placeholder="Tên trường" className="w-full px-3 py-2 border rounded-md" required />
                        <input type="text" name="className" value={currentRecurringEntry.className} onChange={handleRecurringChange} placeholder="Tên lớp" className="w-full px-3 py-2 border rounded-md" required />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn các ngày trong tuần</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(dayOfWeekMap).map(([value, label]) => (
                                    <button key={value} type="button" onClick={() => handleDayToggle(value)}
                                        className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${currentRecurringEntry.daysOfWeek.includes(value) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Giờ bắt đầu</label>
                                <input type="time" name="startTime" value={currentRecurringEntry.startTime} onChange={handleRecurringChange} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Giờ kết thúc</label>
                                <input type="time" name="endTime" value={currentRecurringEntry.endTime} onChange={handleRecurringChange} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Ngày hết hạn (tùy chọn)</label>
                            <input type="date" name="expiryDate" value={currentRecurringEntry.expiryDate} onChange={handleRecurringChange} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div className="flex gap-2 mt-auto">
                           {isRecurringEditing && <button type="button" onClick={cancelEdit} className="w-1/2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>}
                           <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">{isRecurringEditing ? 'Lưu thay đổi' : '+ Thêm'}</button>
                        </div>
                    </form>
                    <form onSubmit={handleSaveOneOff} className={`space-y-4 p-4 border rounded-lg bg-gray-50 flex flex-col ${isRecurringEditing ? 'opacity-40 pointer-events-none' : ''}`}>
                        <h3 className="font-semibold text-lg text-center text-gray-800">Lịch Đột xuất (Ưu tiên)</h3>
                        <input type="text" name="schoolName" value={currentOneOffEntry.schoolName} onChange={handleOneOffChange} placeholder="Tên trường (sự kiện)" className="w-full px-3 py-2 border rounded-md" required />
                        <input type="text" name="className" value={currentOneOffEntry.className} onChange={handleOneOffChange} placeholder="Tên lớp (hoạt động)" className="w-full px-3 py-2 border rounded-md" required />
                        <div>
                            <label className="text-sm font-medium text-gray-700">Ngày diễn ra</label>
                            <input type="date" name="date" value={currentOneOffEntry.date} onChange={handleOneOffChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="text-sm font-medium text-gray-700">Giờ bắt đầu</label>
                                <input type="time" name="startTime" value={currentOneOffEntry.startTime} onChange={handleOneOffChange} className="w-full px-3 py-2 border rounded-md" />
                             </div>
                             <div>
                                <label className="text-sm font-medium text-gray-700">Giờ kết thúc</label>
                                <input type="time" name="endTime" value={currentOneOffEntry.endTime} onChange={handleOneOffChange} className="w-full px-3 py-2 border rounded-md" />
                             </div>
                        </div>
                         <div className="flex gap-2 mt-auto">
                           {isOneOffEditing && <button type="button" onClick={cancelEdit} className="w-1/2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>}
                           <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">{isOneOffEditing ? 'Lưu thay đổi' : '+ Thêm'}</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-2xl font-bold text-gray-800">
                           {currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex items-center space-x-1">
                            <button onClick={goToPrevious} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                             <button onClick={goToToday} className="px-4 py-1.5 text-sm rounded-md border hover:bg-gray-100 transition-colors">Hôm nay</button>
                            <button onClick={goToNext} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex border rounded-md">
                        <button onClick={() => setCalendarView('week')} className={`px-4 py-1.5 text-sm rounded-l-md transition-colors ${calendarView === 'week' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}>Tuần</button>
                        <button onClick={() => setCalendarView('month')} className={`px-4 py-1.5 text-sm rounded-r-md transition-colors ${calendarView === 'month' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}>Tháng</button>
                    </div>
                </div>

                {calendarView === 'week' ? (
                    <WeekCalendarView 
                        currentDate={currentDate}
                        recurringSchedule={recurringSchedule} 
                        oneOffSchedule={oneOffSchedule} 
                        handleEditClick={handleEditClick}
                        handleDeleteRecurring={handleDeleteRecurring}
                        handleDeleteOneOff={handleDeleteOneOff}
                        setTooltip={setTooltip}
                    />
                ) : (
                    <MonthCalendarView 
                        currentDate={currentDate}
                        recurringSchedule={recurringSchedule} 
                        oneOffSchedule={oneOffSchedule}
                    />
                )}
            </div>
             {tooltip.visible && (
                <div
                    className="absolute z-30 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-xl"
                    style={{ top: `${tooltip.y}px`, left: `${tooltip.x}px`, pointerEvents: 'none' }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
}

export default ScheduleView;

