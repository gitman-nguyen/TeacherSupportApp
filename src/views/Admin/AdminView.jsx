import React, { useState, useEffect } from 'react';

// Component con để thêm người dùng mới
const AddUserModal = ({ isOpen, onClose, onCreateUser, log }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('User');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Kiểm tra cơ bản
        if (!name || !email) {
            log('Vui lòng điền đủ Tên và Email.', 'error');
            return;
        }
        
        // Chỉ yêu cầu mật khẩu nếu là Admin và không có Google ID (để đơn giản)
        if (role === 'Admin' && !password) {
            log('Quản trị viên cần có mật khẩu để đăng nhập trực tiếp.', 'error');
            return;
        }

        try {
            await onCreateUser({ name, email, password, role });
            onClose(); // Đóng modal sau khi tạo thành công
            // Reset form
            setName(''); setEmail(''); setPassword(''); setRole('User');
        } catch (error) {
            // Lỗi đã được log ở App.jsx, chỉ cần đóng modal nếu tạo thành công
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Thêm Tài Khoản Mới</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tên người dùng</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mật khẩu (Chỉ dùng cho đăng nhập bằng Tên/Mật khẩu)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Để trống nếu người dùng chỉ đăng nhập bằng Google"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Tạo Tài Khoản
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Component chính AdminView
function AdminView({ currentUser, log, fetchUsers, deleteUser, createUser, updateUserRole }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await fetchUsers();
            setUsers(data);
            log('Tải danh sách người dùng thành công.', 'success');
        } catch (error) {
            log(`Lỗi tải danh sách người dùng: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        loadUsers();
    }, []); // Chỉ chạy một lần khi component mount

    const handleDelete = async (userId, userName) => {
        if (userId === currentUser.id) {
            log('Lỗi: Không thể tự xóa tài khoản của chính mình.', 'error');
            return;
        }
        
        // Thay thế alert bằng window.confirm tạm thời
        if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userName}" (ID: ${userId})?`)) {
            return;
        }

        try {
            await deleteUser(userId);
            log(`Đã xóa tài khoản "${userName}" thành công.`, 'success');
            loadUsers(); // Tải lại danh sách
        } catch (error) {
            log(`Lỗi khi xóa tài khoản: ${error.message}`, 'error');
        }
    };
    
    const handleRoleChange = async (userId, newRole) => {
        const userToUpdate = users.find(u => u.id === userId);
        if (!userToUpdate) return;
        
        if (userId === currentUser.id && newRole !== 'Admin') {
            const adminCount = users.filter(u => u.role === 'Admin').length;
            if (adminCount <= 1) {
                log('Lỗi: Không thể hạ cấp tài khoản Admin duy nhất.', 'error');
                return;
            }
        }

        try {
            await updateUserRole(userId, newRole);
            log(`Đã cập nhật vai trò của ${userToUpdate.name} thành ${newRole}.`, 'success');
            loadUsers(); // Tải lại danh sách
        } catch (error) {
            log(`Lỗi cập nhật vai trò: ${error.message}`, 'error');
        }
    };

    const handleCreate = async (newUserData) => {
        try {
            const newUser = await createUser(newUserData);
            log(`Đã tạo tài khoản "${newUser.name}" thành công.`, 'success');
            loadUsers(); // Tải lại danh sách
            return newUser;
        } catch (error) {
            log(`Lỗi khi tạo tài khoản: ${error.message}`, 'error');
            throw error; // Ném lỗi để modal xử lý
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center text-lg text-gray-500">Đang tải dữ liệu người dùng...</div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Quản Lý Tài Khoản Người Dùng</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Thêm Người Dùng
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đăng nhập</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className={user.id === currentUser.id ? 'bg-blue-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        className={`px-2 py-1 text-xs font-semibold rounded-full border ${user.role === 'Admin' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}`}
                                    >
                                        <option value="User">User</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.password_hash ? 'Tên/Mật khẩu' : user.google_id ? 'Google' : 'Chỉ Google'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDelete(user.id, user.name)}
                                        disabled={user.id === currentUser.id}
                                        className={`ml-2 text-red-600 hover:text-red-900 font-semibold transition-colors ${user.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <AddUserModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreateUser={handleCreate}
                log={log}
            />
        </div>
    );
}

export default AdminView;
