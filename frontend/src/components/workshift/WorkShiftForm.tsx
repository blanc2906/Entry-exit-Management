import React from 'react';
import { Form, Input, InputNumber, Button, TimePicker, Row, Col, FormInstance } from 'antd';
import { WorkShift, CreateWorkShiftDto } from '../../types/workshift';

interface WorkShiftFormProps {
  onSubmit: (values: CreateWorkShiftDto) => void;
  loading?: boolean;
  form?: FormInstance;
}

export const WorkShiftForm: React.FC<WorkShiftFormProps> = ({
  onSubmit,
  loading = false,
  form,
}) => {
  const [internalForm] = Form.useForm();
  const usedForm = form || internalForm;

  const handleSubmit = (values: any) => {
    const formattedValues: CreateWorkShiftDto = {
      ...values,
      startTime: values.startTime.format('HH:mm'),
      endTime: values.endTime.format('HH:mm'),
      breakStart: values.breakStart?.format('HH:mm'),
      breakEnd: values.breakEnd?.format('HH:mm'),
    };
    onSubmit(formattedValues);
  };

  return (
    <Form
      form={usedForm}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="code"
            label="Mã ca làm việc"
            rules={[{ required: true, message: 'Vui lòng nhập mã ca làm việc' }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="name"
            label="Tên ca làm việc"
            rules={[{ required: true, message: 'Vui lòng nhập tên ca làm việc' }]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="startTime"
            label="Giờ bắt đầu"
            rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="endTime"
            label="Giờ kết thúc"
            rules={[
              { required: true, message: 'Vui lòng chọn giờ kết thúc' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const start = getFieldValue('startTime');
                  if (!start || !value) return Promise.resolve();
                  if (value.isAfter(start)) return Promise.resolve();
                  return Promise.reject('Giờ kết thúc phải lớn hơn giờ bắt đầu và không được qua ngày!');
                },
              }),
            ]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="breakStart" label="Giờ nghỉ bắt đầu">
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="breakEnd" label="Giờ nghỉ kết thúc">
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="allowLate" label="Cho phép đi muộn (phút)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="allowEarly" label="Cho phép về sớm (phút)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="overtimeBefore" label="Tính tăng ca trước (phút)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="overtimeAfter" label="Tính tăng ca sau (phút)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item style={{ marginTop: 16 }}>
        <Button type="primary" htmlType="submit" loading={loading}>
          Tạo mới
        </Button>
      </Form.Item>
    </Form>
  );
}; 