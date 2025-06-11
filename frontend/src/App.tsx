import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import UsersPage from './pages/UsersPage';
import DevicesPage from './pages/DevicesPage';
import { WorkShiftPage } from './pages/workshift/WorkShiftPage';
import { WorkSchedulePage } from './pages/workschedule/WorkSchedulePage';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header toggleSidebar={toggleSidebar} />
        <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />
        
        <main className={`pt-6 pb-16 transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/workshifts" element={<WorkShiftPage />} />
              <Route path="/workschedules" element={<WorkSchedulePage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;