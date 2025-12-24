import React, { useState, useEffect } from 'react';
import './App.css';
import { Button, Layout, Menu, Avatar, Dropdown, Spin, Tag } from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  UsergroupAddOutlined,
  MoneyCollectOutlined,
  BarChartOutlined,
  DownloadOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Schemes from './pages/Schemes';
import Payments from './pages/Payments';
import Downloads from './pages/Downloads';
import Auction from './pages/Auction';
import SchemeMembers from './pages/SchemeMembers';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import TrackingOrder from './pages/TrackingOrder';
import { isAuthenticated, logout, getUserInfo } from './services/authService';

const { Header, Content, Footer, Sider } = Layout;

// Protected Route Component
const ProtectedRoute = ({ children, authenticated, loading }) => {
  if (loading) return <div className="loading-container"><Spin size="large" /></div>;
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Admin-Only Route Component
const AdminRoute = ({ children, authenticated, user, loading }) => {
  if (loading) return <div className="loading-container"><Spin size="large" /></div>;
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Component to handle forced logout for /login route
const LogoutHandler = ({ onLogout }) => {
  useEffect(() => {
    onLogout();
  }, [onLogout]);

  return <div className="loading-container"><Spin size="large" tip="Logging out..." /></div>;
};

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [location]);

  const checkAuth = async () => {
    // setLoading(true); // Don't reload on every nav, just check status
    const authStatus = await isAuthenticated();
    const userInfo = await getUserInfo();
    setAuthenticated(authStatus);
    setUser(userInfo);
    setLoading(false);
  };

  const handleLogin = (userData) => {
    setAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="app-loading">
        <Spin size="large" tip="Loading App..." />
      </div>
    );
  }

  // If not authenticated, show only login page
  if (!authenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Dashboard' },
    { key: '/customers', icon: <UsergroupAddOutlined />, label: 'Customers' },
    { key: '/schemes', icon: <MoneyCollectOutlined />, label: 'Schemes' },
    { key: '/scheme-members', icon: <UsergroupAddOutlined />, label: 'Assigned Schemes' },
    { key: '/payments', icon: <BarChartOutlined />, label: 'Payments' },
    { key: '/auction', icon: <MoneyCollectOutlined />, label: 'Auction' },
    { key: '/tracking-order', icon: <BarChartOutlined />, label: 'Tracking Order' },
    { key: '/downloads', icon: <DownloadOutlined />, label: 'Downloads' },
  ];

  // Add User Management menu item only for admins
  if (user?.role === 'admin') {
    menuItems.push({
      key: '/users',
      icon: <SettingOutlined />,
      label: 'User Management'
    });
  }

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ cursor: 'default', padding: '4px 0' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>Signed in as</div>
            <div style={{ fontWeight: 'bold' }}>{user?.name || user?.username}</div>
            {user?.role === 'admin' && <Tag color="red" style={{marginTop: 4}}>Admin</Tag>}
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout
    }
  ];

  return (
    <Layout className="app-main-layout">
      {authenticated && (
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          className="app-sider"
          breakpoint="lg"
          collapsedWidth="0"
          onBreakpoint={(broken) => {
            setCollapsed(broken);
          }}
          width={220}
          trigger={null}
        >
          <div className="app-logo-container">
            {collapsed ? (
              <span className="app-logo-text">VCW</span>
            ) : (
              <span className="app-logo-text">VCW Chit</span>
            )}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
      )}
      <Layout className="app-content-layout">
        {authenticated && (
          <Header className="app-header">
            <div className="header-left-section">
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  className="mobile-menu-trigger"
                />
                <Button 
                  type="link"
                  href="http://www.vasanthamcrackersworld.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="app-header-title"
                >
                  VasanthamCrackersWorlds Chit Scheme
                </Button>
            </div>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="app-user-menu">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span className="app-user-name">
                  {user?.name || user?.username}
                  {user?.role === 'admin' && <span className="text-danger ml-1">(Admin)</span>}
                </span>
              </div>
            </Dropdown>
          </Header>
        )}
        <Content className={authenticated ? "app-content-wrapper" : ""}>
          <Routes>
            <Route path="/login" element={<LogoutHandler onLogout={handleLogout} />} />
            <Route path="/" element={<ProtectedRoute authenticated={authenticated} loading={loading}><Dashboard /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute authenticated={authenticated} loading={loading}><Customers /></ProtectedRoute>} />
            <Route path="/schemes" element={<ProtectedRoute authenticated={authenticated} loading={loading}><Schemes /></ProtectedRoute>} />
            <Route path="/scheme-members" element={<ProtectedRoute authenticated={authenticated} loading={loading}><SchemeMembers /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute authenticated={authenticated} loading={loading}><Payments /></ProtectedRoute>} />
            <Route path="/auction" element={<ProtectedRoute authenticated={authenticated} loading={loading}><Auction /></ProtectedRoute>} />
            <Route path="/tracking-order" element={<ProtectedRoute authenticated={authenticated} loading={loading}><TrackingOrder /></ProtectedRoute>} />
            <Route path="/downloads" element={<ProtectedRoute authenticated={authenticated} loading={loading}><Downloads /></ProtectedRoute>} />
            <Route path="/users" element={<AdminRoute authenticated={authenticated} user={user} loading={loading}><UserManagement /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
        {authenticated && (
          <Footer className="app-footer">
            MaDuSOFT Solutions © {new Date().getFullYear()}
          </Footer>
        )}
      </Layout>
    </Layout>
  );
};

export default App;
