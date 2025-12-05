import React, { useState, useEffect } from 'react';
import './App.css';
import { Button, Layout, Menu, theme, Avatar, Dropdown } from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  UsergroupAddOutlined,
  MoneyCollectOutlined,
  BarChartOutlined,
  DownloadOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Schemes from './pages/Schemes';
import Payments from './pages/Payments';
import Downloads from './pages/Downloads';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import { isAuthenticated, isAdmin, logout, getUserInfo } from './services/authService';

const { Header, Content, Footer, Sider } = Layout;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Admin-Only Route Component
const AdminRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [user, setUser] = useState(getUserInfo());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Update authentication state when location changes
    const authStatus = isAuthenticated();
    setAuthenticated(authStatus);
    setUser(getUserInfo());
  }, [location]);

  const handleLogin = (userData) => {
    setAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

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
    { key: '/payments', icon: <BarChartOutlined />, label: 'Payments' },
    { key: '/downloads', icon: <DownloadOutlined />, label: 'Downloads' },
  ];

  // Add User Management menu item only for admins
  if (isAdmin()) {
    menuItems.push({
      key: '/users',
      icon: <SettingOutlined />,
      label: 'User Management'
    });
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout
    }
  ];

  return (
    <Layout className="app-main-layout">
      {isAuthenticated() && (
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          className="app-sider"
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
        {isAuthenticated() && (
          <Header className="app-header">
            <Button 
              type="link"
              href="http://www.vasanthamcrackersworld.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="app-header-title"
            >
              VasanthamCrackersWorlds Chit Scheme
            </Button>

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
        <Content className={isAuthenticated() ? "app-content-wrapper" : ""}>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/schemes" element={<ProtectedRoute><Schemes /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
            <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
        {isAuthenticated() && (
          <Footer className="app-footer">
            MaDuSOFT Solutions © {new Date().getFullYear()}
          </Footer>
        )}
      </Layout>
    </Layout>
  );
};

export default App;
