import React, { useState } from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New user registered', read: false },
    { id: 2, text: 'Device offline alert', read: false },
    { id: 3, text: 'System update available', read: true },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Search logic would go here
    console.log('Searching for:', searchQuery);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfile(false);
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar} 
            className="mr-4 text-gray-500 hover:text-primary-600 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center">
            <div className="text-primary-600 font-bold text-2xl flex items-center">
              <div className="mr-2 text-primary-600 p-1 bg-primary-100 rounded-md">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-6 h-6"
                >
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <path d="M3 10h18" />
                  <path d="M9 16h6" />
                </svg>
              </div>
              <span className="hidden sm:inline">AttendTrack</span>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-4 hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search users, devices, or records..."
              className="w-full py-2 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <Search size={18} />
            </div>
          </form>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="p-2 text-gray-500 rounded-full hover:bg-gray-100 relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-block w-5 h-5 text-xs text-white bg-red-500 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-40 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700">Notifications</h3>
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    Mark all as read
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-sm text-gray-700">{notification.text}</p>
                        <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-3 text-sm text-gray-500">No notifications</p>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <button className="text-sm text-primary-600 hover:text-primary-800 w-full text-center">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={toggleProfile}
              className="flex items-center text-gray-700 hover:text-primary-600"
              aria-label="User profile"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-white">
                <User size={20} className="text-gray-500" />
              </div>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-40 border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">Admin User</p>
                  <p className="text-xs text-gray-500">admin@example.com</p>
                </div>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Your Profile
                </a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Settings
                </a>
                <div className="border-t border-gray-100 my-1"></div>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Sign out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;