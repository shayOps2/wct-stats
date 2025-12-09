import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Button, theme, Avatar, Dropdown, Switch } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  DashboardOutlined,
  TeamOutlined,
  TrophyOutlined,
  LogoutOutlined,
  LoginOutlined,
  BulbOutlined,
  BulbFilled,
  EnvironmentOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

const Layout = ({ children, isDarkMode, toggleTheme }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user && user.role === "Admin";

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Home</Link>,
    },
    {
      key: '/dashboard',
      icon: <TrophyOutlined />,
      label: <Link to="/dashboard">Stats</Link>,
      disabled: !user,
    },
    {
      key: '/dashboard/players',
      icon: <UserOutlined />,
      label: <Link to="/dashboard/players">Player Details</Link>,
      disabled: !user,
    },
    {
      key: '/dashboard/quadPins',
      icon: <EnvironmentOutlined />,
      label: <Link to="/dashboard/quadPins">Tag Map</Link>,
      disabled: !user,
    },
    ...(isAdmin ? [
      {
        key: '/players',
        icon: <TeamOutlined />,
        label: <Link to="/players">Manage Players</Link>,
      },
      {
        key: '/matches',
        icon: <TrophyOutlined />,
        label: <Link to="/matches">Manage Matches</Link>,
      },
    ] : []),
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} breakpoint="lg" onBreakpoint={(broken) => { if (broken) setCollapsed(true); }}>
        <div className="demo-logo-vertical" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Switch
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              checked={isDarkMode}
              onChange={toggleTheme}
            />
            {user ? (
              <Dropdown overlay={userMenu} placement="bottomRight">
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar icon={<UserOutlined />} src={user.image} />
                  <span style={{ fontWeight: 500 }}>{user.username}</span>
                </div>
              </Dropdown>
            ) : (
              <Link to="/login">
                <Button type="primary" icon={<LoginOutlined />}>Login</Button>
              </Link>
            )}
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'initial'
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;