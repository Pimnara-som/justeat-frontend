import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Col, Row, Space, Typography, Popconfirm, message, Modal, Form, Input, Select, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { useLocation, useNavigate } from 'react-router-dom';
import './admin_promotion.css';

// ✅ เพิ่มรูปจาก src/assets (ไฟล์นี้อยู่ใน src/pages → ต้องใช้ ../assets/...)
import discount from '../../assets/discount.jpg';
import percent from '../../assets/percent.jpg';

dayjs.extend(isSameOrAfter);

const { Text } = Typography;
const { Option } = Select;

// ===== API base =====
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
const apiUrl = `${API_BASE}/admin/promotion`;   // -> http://localhost:8000/admin/promotion

// >>> FIX: ต้องเป็นอาร์เรย์ ไม่ใช่สตริงเดี่ยว
const TOKEN_KEYS: readonly string[] = ['access_token', 'token'];

interface PromotionItem {
  id?: number;
  ID?: number;
  promoCode: string;
  promoDetail: string;
  values: number;
  minOrder: number;
  startAt: string;
  endAt: string;
  promoTypeId: number;
  PromoType?: {
    ID: number;
    TypeName: string;
  }
}

// ✅ map รูปตามประเภทโปรโมชัน
const TYPE_IMAGES: Record<number, string> = {
  1: discount,
  2: percent,
};

// ✅ ป้ายชื่อประเภท (ใช้ซ้ำ)
function typeLabel(id?: number) {
  return id === 1 ? 'ลดเป็นค่าคงที่' : id === 2 ? 'ลดเป็นเปอร์เซ็นต์' : 'ไม่ทราบประเภท';
}

// ===== JWT helpers =====
function getToken(): string | null {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

function parseJwt(token: string): { exp?: number } {
  try {
    const base64 = token.split('.')[1];
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function isTokenExpired(token: string, skewSeconds = 60): boolean {
  const { exp } = parseJwt(token);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= (exp - skewSeconds);
}

// ===== Component =====
const PromotionManagementPage: React.FC = () => {
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionItem | null>(null);
  const [form] = Form.useForm();

  const navigate = useNavigate();
  const location = useLocation();

  // ตรวจ token และ redirect ถ้าไม่พร้อมใช้งาน
  const ensureValidToken = useMemo(() => {
    return () => {
      const token = getToken();
      if (!token) {
        message.warning('กรุณาเข้าสู่ระบบก่อนใช้งาน');
        navigate('/login', { replace: true, state: { from: location.pathname } });
        return null;
      }
      if (isTokenExpired(token)) {
        message.warning('เซสชันหมดอายุ โปรดเข้าสู่ระบบใหม่');
        TOKEN_KEYS.forEach((k: string) => localStorage.removeItem(k));
        navigate('/login', { replace: true, state: { from: location.pathname } });
        return null;
      }
      return token;
    };
  }, [navigate, location.pathname]);

  async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
    const token = ensureValidToken();
    if (!token) throw new Error('NO_TOKEN');

    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.method && init.method !== 'GET') {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(input, { ...init, headers });

    if (res.status === 401 || res.status === 403) {
      const body = await res.clone().json().catch(() => ({}));
      message.error(body?.error || 'สิทธิ์หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
      TOKEN_KEYS.forEach((k: string) => localStorage.removeItem(k));
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }

    return res;
  }

  // Warn ก่อนหมดอายุ 2 นาที
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const { exp } = parseJwt(token);
    if (!exp) return;

    const warnMsBefore = 2 * 60 * 1000;
    const target = exp * 1000 - warnMsBefore;
    const delay = Math.max(0, target - Date.now());

    const id = window.setTimeout(() => {
      const t = getToken();
      if (t && isTokenExpired(t, 120)) {
        message.warning('โทเคนกำลังจะหมดอายุในไม่กี่นาที โปรดบันทึกงานของคุณ');
      }
    }, delay);

    return () => clearTimeout(id);
  }, []);

  // ทำให้ shape สม่ำเสมอ (มี id เสมอ)
  function normalizeItems(list: any[]): PromotionItem[] {
    return list.map((x) => {
      const id = x.id ?? x.ID;
      return {
        ...x,
        id,
        PromoType: x.PromoType ?? {
          ID: x.promoTypeId,
          TypeName: x.promoTypeId === 1 ? 'Discount' : 'Percent',
        },
      } as PromotionItem;
    });
  }

  const fetchPromotions = async () => {
    try {
      const response = await fetchWithAuth(apiUrl);
      if (!response.ok) throw new Error(`Failed to fetch promotions (${response.status})`);

      const data = await response.json();
      const raw = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      setPromotions(normalizeItems(raw));
    } catch (error: any) {
      if (error?.message !== 'NO_TOKEN') {
        console.error('Error fetching promotions:', error);
        message.error('ไม่สามารถดึงข้อมูลโปรโมชั่นได้');
      }
    }
  };

  useEffect(() => {
    if (ensureValidToken()) {
      fetchPromotions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddNew = () => {
    setEditingPromotion(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (promotion: PromotionItem) => {
    setEditingPromotion(promotion);
    form.setFieldsValue({
      promoCode: promotion.promoCode,
      promoDetail: promotion.promoDetail,
      values: promotion.values,
      minOrder: promotion.minOrder,
      startAt: promotion.startAt ? dayjs(promotion.startAt) : null,
      endAt: promotion.endAt ? dayjs(promotion.endAt) : null,
      promoTypeId: promotion.promoTypeId,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (promoId?: number) => {
    const id = promoId ?? undefined;
    if (!id) {
      message.error('ไม่พบรหัสโปรโมชั่น');
      return;
    }
    try {
      const res = await fetchWithAuth(`${apiUrl}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success('ลบโปรโมชั่นเรียบร้อยแล้ว!');
        fetchPromotions();
      } else {
        const errorData = await res.json().catch(() => ({}));
        message.error(`เกิดข้อผิดพลาด: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      if (error?.message !== 'NO_TOKEN') {
        console.error('Network or server error:', error);
        message.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
      }
    }
  };

  const onFinish = async (values: any) => {
    const body = {
      promoCode: values.promoCode,
      promoDetail: values.promoDetail,
      values: Number(values.values),
      minOrder: Number(values.minOrder),
      startAt: values.startAt ? values.startAt.toDate().toISOString() : null,
      endAt: values.endAt ? values.endAt.toDate().toISOString() : null,
      promoTypeId: Number(values.promoTypeId),
    };

    const isEdit = !!editingPromotion?.id || !!editingPromotion?.ID;
    const id = editingPromotion?.id ?? editingPromotion?.ID;
    const url = isEdit ? `${apiUrl}/${id}` : apiUrl;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success(isEdit ? 'แก้ไขโปรโมชั่นเรียบร้อยแล้ว!' : 'เพิ่มโปรโมชั่นใหม่เรียบร้อยแล้ว!');
        setIsModalVisible(false);
        setEditingPromotion(null);
        fetchPromotions();
      } else {
        const errorData = await res.json().catch(() => ({}));
        message.error(`เกิดข้อผิดพลาด: ${errorData.error || res.statusText}`);
      }
    } catch (error: any) {
      if (error?.message !== 'NO_TOKEN') {
        console.error('Network or server error:', error);
        message.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
      }
    }
  };

  const formPromoTypeId = Form.useWatch('promoTypeId', form);

  return (
    <div className="promo-management-container">
      <div className="promo-management-header">
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleAddNew}>
          เพิ่มโปรโมชั่นใหม่
        </Button>
      </div>

      <Space direction="vertical" size="middle" className="promo-list">
        {promotions.map((promo) => {
          const id = promo.id ?? promo.ID;
          const typeId = Number(promo.promoTypeId);

          // ✅ เลือกรูปตามประเภท ถ้าไม่พบใช้ placeholder
          const imgSrc =
            TYPE_IMAGES[typeId] ??
            'https://via.placeholder.com/100/CCCCCC/FFFFFF?text=No+Image';

          return (
            <Card key={id ?? Math.random()} className="promo-card">
              <Row align="middle" justify="space-between">
                <Col span={18}>
                  <Space align="start">
                    <img
                      src={imgSrc}
                      alt={typeLabel(typeId)}
                      className="promo-card-image"
                    />
                    <div>
                      <Text strong className="promo-name">{promo.promoCode}</Text>
                      <br />
                      <Text type="secondary">
                        รายละเอียด: {promo.promoDetail}
                        <br />
                        ประเภท: {typeLabel(typeId)}
                        <br />
                        ส่วนลด: {promo.values} {typeId === 1 ? 'บาท' : '%'}
                        <br />
                        สั่งขั้นต่ำ: {promo.minOrder} บาท
                        <br />
                        เริ่ม: {promo.startAt ? promo.startAt.split('T')[0] : 'N/A'}
                        <br />
                        สิ้นสุด: {promo.endAt ? promo.endAt.split('T')[0] : 'N/A'}
                      </Text>
                    </div>
                  </Space>
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Space>
                    <Button type="text" icon={<EditOutlined style={{ color: '#faad14' }} />} onClick={() => handleEdit(promo)}>
                      แก้ไข
                    </Button>
                    <Popconfirm
                      title="ยืนยันการลบโปรโมชั่น?"
                      description={`คุณต้องการลบโปรโมชั่น "${promo.promoCode}" ใช่หรือไม่?`}
                      onConfirm={() => handleDelete(id)}
                      okText="ใช่"
                      cancelText="ไม่"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />}>
                        ลบ
                      </Button>
                    </Popconfirm>
                  </Space>
                </Col>
              </Row>
            </Card>
          );
        })}
      </Space>

      <Modal
        title={editingPromotion ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่นใหม่'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsModalVisible(false)}>ยกเลิก</Button>,
          <Button key="submit" type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>
            บันทึก
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" name="promo_form" onFinish={onFinish}>
          <Form.Item name="promoCode" label="Promo Code" rules={[{ required: true, message: 'กรุณากรอกรหัสโปรโมชั่น!' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="promoDetail" label="รายละเอียดโปรโมชั่น" rules={[{ required: true, message: 'กรุณากรอกรายละเอียดโปรโมชั่น!' }]}>
            <Input.TextArea />
          </Form.Item>

          <Form.Item name="promoTypeId" label="ประเภทส่วนลด" rules={[{ required: true, message: 'กรุณาเลือกประเภทส่วนลด!' }]}>
            <Select placeholder="เลือกประเภทส่วนลด">
              <Option value={1}>ลดเป็นค่าคงที่</Option>
              <Option value={2}>ลดเป็นเปอร์เซ็นต์</Option>
            </Select>
          </Form.Item>

          {formPromoTypeId && (
            <Form.Item
              name="values"
              label={formPromoTypeId === 1 ? 'มูลค่าส่วนลด (บาท)' : 'มูลค่าส่วนลด (%)'}
              rules={[
                { required: true, message: 'กรุณากรอกมูลค่าส่วนลด!' },
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    const typeId = getFieldValue('promoTypeId');
                    if (typeId === 2 && (value < 1 || value > 100)) {
                      return Promise.reject(new Error('เปอร์เซ็นต์ส่วนลดต้องอยู่ระหว่าง 1-100!'));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input type="number" />
            </Form.Item>
          )}

          <Form.Item name="minOrder" label="ยอดสั่งซื้อขั้นต่ำ (บาท)" rules={[{ required: true, message: 'กรุณากรอกยอดสั่งขั้นต่ำ!' }]}>
            <Input type="number" />
          </Form.Item>

          <Form.Item name="startAt" label="วันที่เริ่ม" rules={[{ required: true, message: 'กรุณาเลือกวันที่เริ่ม!' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="endAt"
            label="วันที่สิ้นสุด"
            rules={[
              { required: true, message: 'กรุณาเลือกวันที่สิ้นสุด!' },
              ({ getFieldValue }) => ({
                validator(_, value: Dayjs) {
                  const startAt: Dayjs = getFieldValue('startAt');
                  if (!value || !startAt || value.isSameOrAfter(startAt, 'day')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มโปรโมชั่น!'));
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PromotionManagementPage;
