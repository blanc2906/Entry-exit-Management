import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, message, Popconfirm, Space, Form } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { WorkShift, CreateWorkShiftDto } from '../../types/workshift';
import { workshiftService } from '../../services/workshift.service';
import { WorkShiftForm } from '../../components/workshift/WorkShiftForm';
import dayjs from 'dayjs';

export const WorkShiftPage: React.FC = () => {
  const [workshifts, setWorkshifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkshift, setEditingWorkshift] = useState<WorkShift | undefined>();
  const [formLoading, setFormLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchWorkshifts = async () => {
    try {
      setLoading(true);
      const data = await workshiftService.getAll();
      setWorkshifts(data);
    } catch (error) {
      message.error('Không thể tải danh sách ca làm việc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshifts();
  }, []);

  const handleCreate = async (values: CreateWorkShiftDto) => {
    try {
      setFormLoading(true);
      await workshiftService.create(values);
      message.success('Tạo ca làm việc thành công');
      setModalVisible(false);
      fetchWorkshifts();
    } catch (error) {
      message.error('Không thể tạo ca làm việc');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (values: CreateWorkShiftDto) => {
    if (!editingWorkshift) return;
    try {
      setFormLoading(true);
      await workshiftService.update(editingWorkshift._id, values);
      message.success('Cập nhật ca làm việc thành công');
      setModalVisible(false);
      setEditingWorkshift(undefined);
      fetchWorkshifts();
    } catch (error) {
      message.error('Không thể cập nhật ca làm việc');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workshiftService.delete(id);
      message.success('Xóa ca làm việc thành công');
      fetchWorkshifts();
    } catch (error) {
      message.error('Không thể xóa ca làm việc');
    }
  };

  const columns = [
    {
      title: 'Mã ca',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Tên ca',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Giờ bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
    },
    {
      title: 'Giờ kết thúc',
      dataIndex: 'endTime',
      key: 'endTime',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: WorkShift) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingWorkshift(record);
              form.setFieldsValue({
                ...record,
                startTime: record.startTime ? dayjs(record.startTime, 'HH:mm') : undefined,
                endTime: record.endTime ? dayjs(record.endTime, 'HH:mm') : undefined,
                breakStart: record.breakStart ? dayjs(record.breakStart, 'HH:mm') : undefined,
                breakEnd: record.breakEnd ? dayjs(record.breakEnd, 'HH:mm') : undefined,
              });
              setModalVisible(true);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa ca làm việc này?"
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
            setEditingWorkshift(undefined);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Thêm ca làm việc
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={workshifts}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title={editingWorkshift ? 'Sửa ca làm việc' : 'Thêm ca làm việc mới'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
        }}
        footer={null}
        width={800}
      >
        <WorkShiftForm
          form={form}
          onSubmit={editingWorkshift ? handleUpdate : handleCreate}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}; 