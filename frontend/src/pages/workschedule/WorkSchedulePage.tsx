import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { WorkSchedule, CreateWorkScheduleDto } from '../../types/workschedule';
import { workscheduleService } from '../../services/workschedule.service';
import { WorkScheduleForm } from '../../components/workschedule/WorkScheduleForm';

export const WorkSchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | undefined>();
  const [formLoading, setFormLoading] = useState(false);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await workscheduleService.getAll();
      setSchedules(data);
    } catch (error) {
      message.error('Không thể tải danh sách lịch làm việc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreate = async (values: CreateWorkScheduleDto) => {
    try {
      setFormLoading(true);
      await workscheduleService.create(values);
      message.success('Tạo lịch làm việc thành công');
      setModalVisible(false);
      fetchSchedules();
    } catch (error) {
      message.error('Không thể tạo lịch làm việc');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (values: CreateWorkScheduleDto) => {
    if (!editingSchedule) return;
    try {
      setFormLoading(true);
      await workscheduleService.update(editingSchedule._id, values);
      message.success('Cập nhật lịch làm việc thành công');
      setModalVisible(false);
      setEditingSchedule(undefined);
      fetchSchedules();
    } catch (error) {
      message.error('Không thể cập nhật lịch làm việc');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workscheduleService.delete(id);
      message.success('Xóa lịch làm việc thành công');
      fetchSchedules();
    } catch (error) {
      message.error('Không thể xóa lịch làm việc');
    }
  };

  const columns = [
    {
      title: 'Tên lịch',
      dataIndex: 'scheduleName',
      key: 'scheduleName',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: WorkSchedule) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              let shiftsObj = record.shifts;
              if (record.shifts instanceof Map) {
                shiftsObj = Object.fromEntries(record.shifts);
              } else if (
                typeof record.shifts === 'object' &&
                record.shifts !== null &&
                !(record.shifts instanceof Array)
              ) {
                // shifts đã là object thường, giữ nguyên
              } else {
                // Nếu có trường hợp khác, ép về object rỗng
                shiftsObj = {};
              }
              setEditingSchedule({ ...record, shifts: shiftsObj });
              setModalVisible(true);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa lịch làm việc này?"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingSchedule(undefined);
            setModalVisible(true);
          }}
        >
          Thêm lịch làm việc
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={schedules}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingSchedule ? 'Sửa lịch làm việc' : 'Thêm lịch làm việc mới'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingSchedule(undefined);
        }}
        footer={null}
        width={800}
      >
        <WorkScheduleForm
          initialValues={editingSchedule}
          onSubmit={editingSchedule ? handleUpdate : handleCreate}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}; 