import React, { useEffect, useState } from 'react';
import { Layout as AntLayout, Menu, Button, theme, Avatar, Dropdown, Switch, Drawer, Grid, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
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
const { useBreakpoint } = Grid;
const { Text } = Typography;
const LG_BREAKPOINT_WIDTH = 992;

const Layout = ({ children, isDarkMode, toggleTheme }) => {
  const screens = useBreakpoint();
  const hasResolvedBreakpoints = Object.keys(screens).length > 0;
  const isMobile = hasResolvedBreakpoints
    ? screens.lg === false
    : typeof window !== 'undefined' && window.innerWidth < LG_BREAKPOINT_WIDTH;
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [isMobile, location.pathname]);

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: handleLogout,
      },
    ],
  };

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

  const navigationMenu = (
    <>
      <div className="app-shell__logo">WCT Stats</div>
      <Menu
        theme={isMobile ? 'light' : 'dark'}
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={() => {
          if (isMobile) {
            setMobileNavOpen(false);
          }
        }}
      />
    </>
  );

  return (
    <AntLayout className="app-shell">
      {!isMobile && (
        <Sider
          className="app-shell__sider"
          trigger={null}
          collapsible
          collapsed={desktopCollapsed}
          width={240}
        >
          {navigationMenu}
        </Sider>
      )}

      <AntLayout className="app-shell__main">
        <Header className="app-shell__header" style={{ background: colorBgContainer }}>
          <div className="app-shell__header-left">
            <Button
              type="text"
              icon={isMobile ? (mobileNavOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />) : (desktopCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={() => {
                if (isMobile) {
                  setMobileNavOpen((open) => !open);
                  return;
                }

                setDesktopCollapsed((value) => !value);
              }}
              className="app-shell__trigger"
            />
            <Text className="app-shell__title">World Chase Tag Stats</Text>
          </div>

          <div className="app-shell__header-right">
            <Switch
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              checked={isDarkMode}
              onChange={toggleTheme}
            />

            {user ? (
              <Dropdown menu={userMenu} placement="bottomRight" trigger={["click"]}>
                <button type="button" className="app-shell__user-button">
                  <Avatar icon={<UserOutlined />} src={user.image} />
                  <span className="app-shell__username">{user.username}</span>
                </button>
              </Dropdown>
            ) : (
              <Link to="/login">
                <Button type="primary" icon={<LoginOutlined />}>Login</Button>
              </Link>
            )}
          </div>
        </Header>

        <Content className="app-shell__content">
          <div
            className="app-shell__content-inner"
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </AntLayout>

      {isMobile && (
        <Drawer
          title="Navigation"
          placement="left"
          width={280}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          className="app-shell__drawer"
          styles={{ body: { padding: 0 } }}
        >
          {navigationMenu}
        </Drawer>
      )}
    </AntLayout>
  );
};

export default Layout;