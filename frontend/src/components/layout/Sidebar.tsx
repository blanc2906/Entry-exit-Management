import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Users, Cpu, Calendar, Settings, ChevronRight, ChevronLeft } from 'lucide-react';
import { useActiveRoute } from '../../hooks/useActiveRoute';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle }) => {
  const { isActive } = useActiveRoute();

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: <Home size={20} />, path: '/' },
    { name: 'Users', icon: <Users size={20} />, path: '/users' },
    { name: 'Devices', icon: <Cpu size={20} />, path: '/devices' },
    { name: 'Attendance', icon: <Calendar size={20} />, path: '/attendance' },
    { name: 'Workshift', icon: <Calendar size={20} />, path: '/workshifts' },
    { name: 'WorkSchedule', icon: <Calendar size={20} />, path: '/workschedules' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  ];

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden" 
          onClick={toggle}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out 
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
          w-64 bg-white border-r border-gray-200 pt-20 lg:pt-16`}
      >
        <div className="h-full flex flex-col justify-between px-3 py-4 overflow-y-auto">
          <nav className="space-y-1 mt-2">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-base font-medium rounded-lg group transition-colors duration-150 
                    ${active 
                      ? 'text-white bg-primary-600 hover:bg-primary-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className={`mr-3 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {active && <ChevronRight size={16} />}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 mt-auto">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">Need help?</p>
                  <p className="text-xs text-gray-500">Check our docs</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={toggle}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-md hidden lg:flex"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;