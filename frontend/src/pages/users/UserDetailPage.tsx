import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Tabs, message } from 'antd';
import { UserWorkSchedule } from '../../components/users/UserWorkSchedule';
import { userService } from '../../services/userService';
import { workScheduleService } from '../../services/workScheduleService';
import { User } from '../../types/user';
import { WorkSchedule, WorkShift } from '../../types/userWorkSchedule';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableShifts, setAvailableShifts] = useState<WorkShift[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<WorkSchedule[]>([]);

  useEffect(() => {
    if (id) {
      loadUserData();
      loadWorkScheduleData();
    }
  }, [id]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const data = await userService.findUserById(id!);
      setUser(data);
    } catch (error) {
      message.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkScheduleData = async () => {
    try {
      const [shifts, schedules] = await Promise.all([
        workScheduleService.getAllShifts(),
        workScheduleService.getAllSchedules()
      ]);
      setAvailableShifts(shifts);
      setAvailableSchedules(schedules);
    } catch (error) {
      message.error('Failed to load work schedule data');
    }
  };

  const handleWorkScheduleUpdate = () => {
    loadUserData();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="p-6">
      <Card title="User Details" loading={loading}>
        <Tabs
          items={[
            {
              key: 'info',
              label: 'Basic Information',
              children: (
                <div>
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>User ID:</strong> {user.userId}</p>
                  {/* Add more user information as needed */}
                </div>
              )
            },
            {
              key: 'workSchedule',
              label: 'Work Schedule',
              children: (
                <UserWorkSchedule
                  userId={user._id}
                  availableShifts={availableShifts}
                  availableSchedules={availableSchedules}
                  onUpdate={handleWorkScheduleUpdate}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}; 