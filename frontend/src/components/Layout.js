import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Drawer, Button, Grid } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { MenuOutlined } from '@ant-design/icons';

const { Header, Content, Footer } = AntLayout;
const { useBreakpoint } = Grid;

const Layout = ({ children }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const screens = useBreakpoint();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Get user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  // Determine which menu item should be active
  const getSelectedKey = () => {
    if (pathname === '/') return '1';
    if (pathname.startsWith('/dashboard')) {
      if (pathname === '/dashboard' || pathname === '/dashboard/') return '2';
      if (pathname.includes('/players')) return '3';
      if (pathname.includes('/quadPins')) return '4';
    }
    if (pathname === '/players') return '5';
    if (pathname === '/matches') return '6';
    return '1';
  };

  const menuItems = [
    { key: '1', label: <Link to="/">Home</Link> },
    { key: '2', label: <Link to="/dashboard">All Players</Link> },
    { key: '3', label: <Link to="/dashboard/players">Player Details</Link> },
    { key: '4', label: <Link to="/dashboard/quadPins">Tag Map</Link> },
    ...(user && user.role === "Admin" ? [
      { key: '5', label: <Link to="/players">Manage Players</Link> },
      { key: '6', label: <Link to="/matches">Manage Matches</Link> }
    ] : [])
  ];

  const showDrawer = () => setDrawerVisible(true);
  const onClose = () => setDrawerVisible(false);

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ position: 'fixed', zIndex: 1, width: '100%', background: '#fff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="logo">
          <h2 style={{ margin: 0, lineHeight: '64px' }}>WCT Stats</h2>
        </div>

        {screens.md ? (
          <Menu
            theme="light"
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{ lineHeight: '64px', borderBottom: 'none', flex: 1, justifyContent: 'flex-end' }}
          />
        ) : (
          <>
            <Button type="text" icon={<MenuOutlined />} onClick={showDrawer} style={{ fontSize: '18px' }} />
            <Drawer
              title="Menu"
              placement="right"
              onClose={onClose}
              open={drawerVisible}
              bodyStyle={{ padding: 0 }}
            >
              <Menu
                mode="vertical"
                selectedKeys={[getSelectedKey()]}
                items={menuItems}
                onClick={onClose}
                style={{ borderRight: 'none' }}
              />
            </Drawer>
          </>
        )}
      </Header>
      <Content style={{ padding: screens.md ? '0 50px' : '0 16px', marginTop: 64 }}>
        <div style={{ padding: '24px 0', minHeight: 280 }}>
          {children}
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        World Chase Tag Statistics ©{new Date().getFullYear()}
      </Footer>
    </AntLayout>
  );
};

export default Layout;