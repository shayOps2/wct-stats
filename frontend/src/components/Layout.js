import React from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';

const { Header, Content, Footer } = AntLayout;

const Layout = ({ children }) => {
  const location = useLocation();
  const pathname = location.pathname;

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

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ position: 'fixed', zIndex: 1, width: '100%', background: '#fff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)' }}>
        <div className="logo" style={{ float: 'left', marginRight: '20px' }}>
          <h2 style={{ margin: 0, lineHeight: '64px' }}>WCT Stats</h2>
        </div>
        <Menu
          theme="light"
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          style={{ lineHeight: '64px' }}
        >
          <Menu.Item key="1">
            <Link to="/">Home</Link>
          </Menu.Item>
          <Menu.Item key="2">
            <Link to="/dashboard">All Players</Link>
          </Menu.Item>
          <Menu.Item key="3">
            <Link to="/dashboard/players">Player Details</Link>
          </Menu.Item>
          <Menu.Item key="4">
            <Link to="/dashboard/quadPins">Tag Map</Link>
          </Menu.Item>
          {/* Admin-only tabs */}
          {user && user.role === "Admin" && (
            <>
              <Menu.Item key="5">
                <Link to="/players">Manage Players</Link>
              </Menu.Item>
              <Menu.Item key="6">
                <Link to="/matches">Manage Matches</Link>
              </Menu.Item>
            </>
          )}
        </Menu>
      </Header>
      <Content style={{ padding: '0 50px', marginTop: 64 }}>
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