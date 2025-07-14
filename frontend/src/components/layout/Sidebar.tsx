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

const Sidebar: React.FC = () => {
  const { isActive } = useActiveRoute();

  const navItems: NavItem[] = [
    { name: 'Trang chủ', icon: <Home size={20} />, path: '/' },
    { name: 'Nhân viên', icon: <Users size={20} />, path: '/users' },
    { name: 'Thiết bị', icon: <Cpu size={20} />, path: '/devices' },
    { name: 'Chấm công', icon: <Calendar size={20} />, path: '/attendance' },
    { name: 'Ca làm', icon: <Calendar size={20} />, path: '/workshifts' },
    { name: 'Lịch làm việc', icon: <Calendar size={20} />, path: '/workschedules' },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 pt-20 lg:pt-16`}
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
      </aside>
    </>
  );
};

export default Sidebar;