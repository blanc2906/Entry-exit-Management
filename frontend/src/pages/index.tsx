// frontend/src/pages/users/index.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { User } from '@/types/user';
import { useUserStore } from '@/store/useUserStore'; 
import CardNumberModal from './users/components/CardNumberModal';
import FingerprintModal from './users/components/FingerprintModal';

// Mock devices - replace with actual device store
const mockDevices = [
  { _id: '1', deviceMac: 'AA:BB:CC:DD:EE:FF', description: 'Main Entrance' },
  { _id: '2', deviceMac: 'FF:EE:DD:CC:BB:AA', description: 'Office Door' },
];

const UsersPage: React.FC = () => {
  const router = useRouter();
  const { users, loading, error, setUsers, clearError } = useUserStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isFingerprintModalOpen, setIsFingerprintModalOpen] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    // Fetch users from backend API
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:3000/users/findAll');
        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [setUsers]);

  // Filter and sort users
  useEffect(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter = (() => {
        switch (filterBy) {
          case 'with-fingerprint': return !!user.fingerTemplate;
          case 'with-card': return !!user.cardNumber;
          case 'without-fingerprint': return !user.fingerTemplate;
          case 'without-card': return !user.cardNumber;
          case 'active': return user.devices.length > 0;
          default: return true;
        }
      })();

      return matchesSearch && matchesFilter;
    });

    // Sort users
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        case 'activity':
          return b.devices.length - a.devices.length;
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterBy, sortBy]);

  const handleViewDetails = (user: User) => {
    router.push(`/users/${user._id}`);
  };

  const handleEditUser = (user: User) => {
    router.push(`/users/${user._id}/edit`);
  };

  const handleAddFingerprint = (user: User) => {
    setSelectedUser(user);
    setIsFingerprintModalOpen(true);
  };

  const handleAddCardNumber = (user: User) => {
    setSelectedUser(user);
    setIsCardModalOpen(true);
  };

  const handleCreateUser = () => {
    router.push('/users/create');
  };

  const exportUsers = () => {
    const csvContent = [
      ['User ID', 'Name', 'Email', 'Has Fingerprint', 'Card Number', 'Devices', 'Created'],
      ...users.map(user => [
        user.userId,
        user.name,
        user.email || 'N/A',
        user.fingerTemplate ? 'Yes' : 'No',
        user.cardNumber || 'N/A',
        user.devices.length,
        new Date(user.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Statistics
  const stats = {
    total: users.length,
    withFingerprint: users.filter(u => u.fingerTemplate).length,
    withCard: users.filter(u => u.cardNumber).length,
    active: users.filter(u => u.devices.length > 0).length
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem'
              }}>
                User Management
              </h1>
              <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                Manage users, access controls, and attendance tracking
              </p>
            </div>
            <button
              onClick={handleCreateUser}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              ➕ Add New User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {[
            { icon: '👥', label: 'Total Users', value: stats.total },
            { icon: '👆', label: 'With Fingerprint', value: stats.withFingerprint },
            { icon: '💳', label: 'With Access Card', value: stats.withCard },
            { icon: '✅', label: 'Active Users', value: stats.active }
          ].map((stat, index) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              padding: '1.5rem',
              textAlign: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{stat.icon}</div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.5rem' }}>
                {stat.value}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search users by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 3rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  background: 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}>🔍</span>
            </div>
            
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                background: 'white',
                minWidth: '150px',
                transition: 'all 0.3s ease'
              }}
            >
              <option value="all">All Users</option>
              <option value="with-fingerprint">With Fingerprint</option>
              <option value="with-card">With Access Card</option>
              <option value="without-fingerprint">Without Fingerprint</option>
              <option value="without-card">Without Access Card</option>
              <option value="active">Active Users</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                background: 'white',
                minWidth: '150px',
                transition: 'all 0.3s ease'
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="created">Sort by Created Date</option>
              <option value="updated">Sort by Updated Date</option>
              <option value="activity">Sort by Activity</option>
            </select>

            <button
              onClick={exportUsers}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f8fafc',
                color: '#475569',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📥 Export
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626'
          }}>
            {error}
            <button onClick={clearError} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{ marginLeft: '1rem', color: '#64748b' }}>Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          /* Empty State */
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ fontSize: '6rem', marginBottom: '1.5rem' }}>👥</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#1a202c' }}>
              No users found
            </h3>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              {searchTerm || filterBy !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first user account.'}
            </p>
            <button
              onClick={handleCreateUser}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              ➕ Create Your First User
            </button>
          </div>
        ) : (
          /* Users Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredUsers.map((user) => (
              <div key={user._id} style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                padding: '1.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                borderTop: '4px solid transparent',
                borderImage: 'linear-gradient(135deg, #667eea, #764ba2) 1'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
              }}>
                
                {/* User Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '4rem',
                    height: '4rem',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.25rem' }}>
                      {user.name}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>ID: {user.userId}</p>
                    {user.email && <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{user.email}</p>}
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {user.fingerTemplate ? (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: '#dcfce7',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      👆 Fingerprint ✓
                    </span>
                  ) : (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: '#f1f5f9',
                      color: '#64748b'
                    }}>
                      👆 No Fingerprint
                    </span>
                  )}
                  
                  {user.cardNumber ? (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: '#dbeafe',
                      color: '#2563eb'
                    }}>
                      💳 Card: {user.cardNumber}
                    </span>
                  ) : (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: '#f1f5f9',
                      color: '#64748b'
                    }}>
                      💳 No Card
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '12px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a202c' }}>
                      {user.devices.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Devices
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a202c' }}>
                      {user.history.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Records
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a202c' }}>
                      {formatDate(user.createdAt)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Created
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleViewDetails(user)}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#2563eb';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#3b82f6';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    👁️ View Details
                  </button>
                  
                  <button
                    onClick={() => handleEditUser(user)}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    ✏️ Edit
                  </button>

                  {!user.fingerTemplate && (
                    <button
                      onClick={() => handleAddFingerprint(user)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        borderRadius: '8px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#059669';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#10b981';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      👆 Add Fingerprint
                    </button>
                  )}

                  {!user.cardNumber && (
                    <button
                      onClick={() => handleAddCardNumber(user)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        borderRadius: '8px',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#d97706';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#f59e0b';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      💳 Add Card
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        <CardNumberModal
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          user={selectedUser}
        />
        
        <FingerprintModal
          isOpen={isFingerprintModalOpen}
          onClose={() => setIsFingerprintModalOpen(false)}
          user={selectedUser}
          devices={mockDevices}
        />
      </div>

      {/* Add CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UsersPage;