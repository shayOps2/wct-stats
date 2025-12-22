import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "../config";
import { Card, Form, Input, Button, Select, Upload, List, Avatar, Typography, Space, Modal, message } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, UploadOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;

function Players() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [teamForm] = Form.useForm();

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user && user.role === "Admin";

  const fetchPlayers = () => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${BACKEND_URL}/players/`, { headers })
      .then(res => {
        if (res.status === 401) {
          message.error("Unauthorized. Please log in.");
          return [];
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setPlayers(data);
      })
      .catch(err => message.error("Failed to fetch players"));
  };

  const fetchTeams = () => {
    fetch(`${BACKEND_URL}/teams/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeams(data);
      })
      .catch(err => console.error("Failed to fetch teams", err));
  };

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  const handleAddPlayer = async (values) => {
    const formData = new FormData();
    formData.append("name", values.name);
    if (values.team_id) formData.append("team_id", values.team_id);
    if (values.image && values.image.file) formData.append("image", values.image.file.originFileObj);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${BACKEND_URL}/players/`, {
        method: "POST",
        body: formData,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        message.error(errorData.message || "Failed to add player.");
        return;
      }

      message.success("Player added successfully!");
      form.resetFields();
      fetchPlayers();
    } catch (err) {
      console.error("Error adding player:", err);
      message.error("An unexpected error occurred");
    }
  };

  const handleDelete = async id => {
    if (!window.confirm("Are you sure you want to delete this player?")) return;
    const token = localStorage.getItem("token");
    await fetch(`${BACKEND_URL}/players/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    message.success("Player deleted.");
    fetchPlayers();
  };

  const handleAddTeam = async (values) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/teams/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: values.name }),
      });
      if (res.ok) {
        message.success("Team added!");
        teamForm.resetFields();
        fetchTeams();
      } else {
        message.error("Failed to add team");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Delete this team?")) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${BACKEND_URL}/teams/${id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      message.success("Team deleted.");
      fetchTeams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePlayer = async (values) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/players/${editingPlayer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: values.name,
          team_id: values.team_id || null,
        }),
      });
      if (res.ok) {
        message.success("Player updated!");
        setEditingPlayer(null);
        setIsModalVisible(false);
        fetchPlayers();
      } else {
        message.error("Failed to update player");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (player) => {
    setEditingPlayer(player);
    setIsModalVisible(true);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2}>Players & Teams</Title>

      {isAdmin && (
        <Space direction="vertical" size="large" style={{ width: '100%', marginBottom: 24 }}>
          <Card title="Manage Teams">
            <Form form={teamForm} layout="inline" onFinish={handleAddTeam}>
              <Form.Item name="name" rules={[{ required: true, message: 'Please enter team name' }]}>
                <Input placeholder="New Team Name" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Add Team</Button>
              </Form.Item>
            </Form>
            <div style={{ marginTop: 16 }}>
              {teams.map(t => (
                <Space key={t.id} style={{ marginRight: 16, marginBottom: 8 }}>
                  <Text>{t.name}</Text>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteTeam(t.id)} />
                </Space>
              ))}
            </div>
          </Card>

          <Card title="Add Player">
            <Form form={form} layout="inline" onFinish={handleAddPlayer}>
              <Form.Item name="name" rules={[{ required: true, message: 'Please enter player name' }]}>
                <Input placeholder="Player Name" />
              </Form.Item>
              <Form.Item name="team_id">
                <Select placeholder="Select Team (Optional)" style={{ width: 200 }} allowClear>
                  {teams.map(t => (
                    <Option key={t.id} value={t.id}>{t.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="image">
                <Upload maxCount={1} beforeUpload={() => false} accept="image/*">
                  <Button icon={<UploadOutlined />}>Upload Image</Button>
                </Upload>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Add Player</Button>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      )}

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }}
        dataSource={players}
        renderItem={p => (
          <List.Item>
            <Card
              hoverable
              cover={
                <div style={{ height: 200, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f0f0' }}>
                  {p.image_id ? (
                    <img alt={p.name} src={`${BACKEND_URL}/players/${p.id}/image`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Avatar size={64} icon={<PlusOutlined />} />
                  )}
                </div>
              }
              actions={isAdmin ? [
                <EditOutlined key="edit" onClick={() => openEditModal(p)} />,
                <DeleteOutlined key="delete" onClick={() => handleDelete(p.id)} style={{ color: 'red' }} />
              ] : []}
            >
              <Card.Meta
                title={p.name}
                description={teams.find(t => t.id === p.team_id)?.name || "No Team"}
              />
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="Edit Player"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        {editingPlayer && (
          <Form
            initialValues={{ name: editingPlayer.name, team_id: editingPlayer.team_id }}
            onFinish={handleUpdatePlayer}
            layout="vertical"
          >
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="team_id" label="Team">
              <Select allowClear>
                {teams.map(t => (
                  <Option key={t.id} value={t.id}>{t.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item>
              <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">Save</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

export default Players;
