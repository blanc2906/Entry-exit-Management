import React, { useEffect, useState } from 'react';
import { WorkSchedule, WorkShift } from '../../types/userWorkSchedule';
import { workScheduleService } from '../../services/workScheduleService';
import { Button, Card, Form, Select, Space, Table, message } from 'antd';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';

interface UserWorkScheduleProps {
  userId: string;
  availableShifts: WorkShift[];
  availableSchedules: WorkSchedule[];
  onUpdate?: () => void;
}

const DAYS_OF_WEEK = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật'
];

export const UserWorkSchedule: React.FC<UserWorkScheduleProps> = ({
  userId,
  availableShifts,
  availableSchedules,
  onUpdate
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null);

  useEffect(() => {
    loadWorkSchedule();
  }, [userId]);

  const loadWorkSchedule = async () => {
    try {
      setLoading(true);
      const data = await workScheduleService.getUserWorkSchedule(userId);
      setWorkSchedule(data);
      form.setFieldsValue({
        workSchedule: data._id,
        shifts: DAYS_OF_WEEK.map(day => ({
          day,
          shift: data.shifts.get(day)?._id
        }))
      });
    } catch (error) {
      message.error('Failed to load work schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await workScheduleService.updateUserWorkSchedule(userId, {
        workSchedule: values.workSchedule,
        shifts: values.shifts.filter((s: any) => s.shift)
      });
      message.success('Work schedule updated successfully');
      onUpdate?.();
    } catch (error) {
      message.error('Failed to update work schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setLoading(true);
      await workScheduleService.removeUserWorkSchedule(userId);
      setWorkSchedule(null);
      form.resetFields();
      message.success('Work schedule removed successfully');
      onUpdate?.();
    } catch (error) {
      message.error('Failed to remove work schedule');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Thứ',
      dataIndex: 'day',
      key: 'day',
      width: 120
    },
    {
      title: 'Ca',
      dataIndex: 'shift',
      key: 'shift',
      render: (_: any, record: any, index: number) => (
        <Form.Item
          name={['shifts', index, 'shift']}
          noStyle
        >
          <Select
            placeholder="Chọn ca"
            allowClear
            style={{ width: '100%' }}
          >
            {availableShifts.map(shift => (
              <Select.Option key={shift._id.toString()} value={shift._id}>
                {shift.name} ({shift.startTime} - {shift.endTime})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )
    }
  ];

  return (
    <Card
      title="Lịch làm việc"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={form.submit}
            loading={loading}
          >
            Lưu
          </Button>
          {workSchedule && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
              loading={loading}
            >
              Xóa
            </Button>
          )}
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          shifts: DAYS_OF_WEEK.map(day => ({ day, shift: undefined }))
        }}
      >
        <Form.Item
          name="workSchedule"
          label="Lịch làm việc"
          rules={[{ required: true, message: 'Vui lòng chọn lịch làm việc' }]}
        >
          <Select placeholder="Chọn lịch làm việc">
            {availableSchedules.map(schedule => (
              <Select.Option key={schedule._id.toString()} value={schedule._id}>
                {schedule.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Table
          columns={columns}
          dataSource={DAYS_OF_WEEK.map(day => ({ day, key: day }))}
          pagination={false}
          size="small"
        />
      </Form>
    </Card>
  );
}; 