import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Input, Button, Typography, message, Select, Form, Alert } from "antd";
import { UserOutlined, LockOutlined, TeamOutlined } from "@ant-design/icons";
import { BACKEND_URL } from "../config";

const { Title, Text } = Typography;
const { Option } = Select;

function Register() {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    fetch(`${BACKEND_URL}/teams/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeams(data);
      })
      .catch(err => console.error("Failed to fetch teams", err));
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/login/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
          team_id: values.team_id
        }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success("Registration successful! Please log in.");
        navigate("/login");
      } else {
        message.error(data.detail || "Registration failed");
      }
    } catch (error) {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>Register</Title>
          <Text type="secondary">Create a new account</Text>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          scrollToFirstError
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 8, message: 'Password must be at least 8 characters' },
              { pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, message: 'Password must contain letters and numbers' }
            ]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords that you entered do not match!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
          </Form.Item>

          <Form.Item name="team_id" label="Team (Optional)">
            <Select placeholder="Select a team" allowClear size="large">
              {teams.map(t => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Register
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            Or <Link to="/login">login now!</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default Register;
