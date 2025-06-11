import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, Row, Col } from 'antd';
import { WorkSchedule, CreateWorkScheduleDto } from '../../types/workschedule';
import { WorkShift } from '../../types/workshift';
import { workshiftService } from '../../services/workshift.service';

const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

interface WorkScheduleFormProps {
  initialValues?: WorkSchedule;
  onSubmit: (values: CreateWorkScheduleDto) => void;
  loading?: boolean;
}

export const WorkScheduleForm: React.FC<WorkScheduleFormProps> = ({
  initialValues,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [workshifts, setWorkshifts] = useState<WorkShift[]>([]);

  useEffect(() => {
    workshiftService.getAll().then(setWorkshifts);
  }, []);

  useEffect(() => {
    console.log('initialValues:', initialValues);
    if (initialValues) {
      console.log('shifts:', initialValues.shifts);
      if (initialValues.shifts && typeof initialValues.shifts === 'object') {
        const newShifts: Record<string, any> = {};
        Object.entries(initialValues.shifts).forEach(([k, v]) => {
          const value: any = v;
          newShifts[k] = typeof value === 'object' && value !== null ? value._id : value;
        });
        form.setFieldsValue({ ...initialValues, shifts: newShifts });
      } else {
        form.setFieldsValue(initialValues);
      }
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  const handleSubmit = (values: any) => {
    onSubmit(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={initialValues}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="scheduleName"
            label="Tên lịch làm việc"
            rules={[{ required: true, message: 'Vui lòng nhập tên lịch làm việc' }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="note" label="Ghi chú">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        {daysOfWeek.map((day) => (
          <Col xs={24} md={12} key={day}>
            <Form.Item
              name={['shifts', day]}
              label={`Ca làm việc cho ${day}`}
              rules={[{ required: true, message: `Chọn ca cho ${day}` }]}
            >
              <Select
                placeholder={`Chọn ca cho ${day}`}
                options={workshifts.map((ws) => ({
                  value: ws._id,
                  label: `${ws.name} (${ws.startTime} - ${ws.endTime})`,
                }))}
              />
            </Form.Item>
          </Col>
        ))}
      </Row>
      <Form.Item style={{ marginTop: 16 }}>
        <Button type="primary" htmlType="submit" loading={loading}>
          {initialValues ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </Form.Item>
    </Form>
  );
}; 