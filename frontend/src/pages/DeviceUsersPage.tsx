import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { deviceService } from '../services/deviceService';
import { User } from '../types/user';

const DeviceUsersPage: React.FC = () => {
  const { id: deviceId } = useParams<{ id: string }>();
  const [device, setDevice] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchData = async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await deviceService.getDeviceUsers(deviceId);
      setDevice(res.device);
      setUsers(res.users);
      const notInDevice = await deviceService.getAllUsersNotInDevice(deviceId);
      setAvailableUsers(notInDevice.data);
    } catch (err: any) {
      setError('Lỗi khi tải dữ liệu thiết bị hoặc nhân viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [deviceId]);

  const handleAddUsers = async () => {
    if (!deviceId || selectedUsers.length === 0) return;
    setAdding(true);
    try {
      await Promise.all(selectedUsers.map(userId => deviceService.addUserToDevice(deviceId, userId)));
      setSelectedUsers([]);
      await fetchData();
    } catch (err) {
      setError('Lỗi khi thêm nhân viên vào thiết bị.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!deviceId) return;
    try {
      await deviceService.removeUserFromDevice(deviceId, userId);
      await fetchData();
    } catch (err) {
      setError('Lỗi khi xoá nhân viên khỏi thiết bị.');
    }
  };

  const handleDeleteAll = async () => {
    if (!deviceId) return;
    setDeletingAll(true);
    try {
      await deviceService.deleteAllUsers(deviceId);
      await fetchData();
    } catch (err) {
      setError('Lỗi khi xoá tất cả nhân viên khỏi thiết bị.');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleSync = async () => {
    if (!deviceId) return;
    setSyncing(true);
    try {
      await deviceService.syncAllUsers(deviceId);
      await fetchData();
    } catch (err) {
      setError('Lỗi khi đồng bộ dữ liệu.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Data của thiết bị và các nút thao tác */}
      <div className="bg-white rounded-lg p-4 flex justify-between items-start mb-6">
        <div>
          <div className="font-semibold text-lg mb-2">Thông tin thiết bị</div>
          <div><span className="font-medium">Tên thiết bị:</span> <span className="font-normal">{device?.description || ''}</span></div>
          <div><span className="font-medium">Địa chỉ MAC:</span> <span className="font-normal">{device?.deviceMac || ''}</span></div>
          <div><span className="font-medium">Trạng thái:</span> <span className="font-normal">{device?.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</span></div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={handleDeleteAll} disabled={deletingAll} className="px-4 py-2 bg-red-600 text-white rounded mb-2 disabled:opacity-50">
            {deletingAll ? 'Đang xoá...' : 'Xoá tất cả nhân viên'}
          </button>
          <button onClick={handleSync} disabled={syncing} className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50">
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
          </button>
        </div>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div className="text-center text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-4">
            <div className="font-semibold text-base mb-2">Danh sách nhân viên có trong thiết bị</div>
            {users.length === 0 ? (
              <div className="text-gray-500">Không có nhân viên nào trong thiết bị.</div>
            ) : (
              <ul className="space-y-2">
                {users.map(user => (
                  <li key={user._id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">Mã NV: {user.userId}</div>
                    </div>
                    <button onClick={() => handleRemoveUser(user._id)} className="text-red-500 hover:underline text-sm">Xoá</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="font-semibold text-base mb-2">Danh sách nhân viên chưa được thêm vào thiết bị</div>
            {availableUsers.length === 0 ? (
              <div className="text-gray-500">Không còn nhân viên nào để thêm.</div>
            ) : (
              <>
                <ul className="space-y-2 mb-2">
                  {availableUsers.map(user => (
                    <li key={user._id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">Mã NV: {user.userId}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedUsers(prev => [...prev, user._id]);
                          else setSelectedUsers(prev => prev.filter(id => id !== user._id));
                        }}
                      />
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleAddUsers}
                  disabled={selectedUsers.length === 0 || adding}
                  className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50"
                >
                  {adding ? 'Đang thêm...' : 'Thêm nhân viên đã chọn'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceUsersPage; 