import React, { useState } from 'react';
import { Button, Layout, Menu, theme } from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  UsergroupAddOutlined,
  MoneyCollectOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Schemes from './pages/Schemes';
import Payments from './pages/Payments';

const { Header, Content, Footer, Sider } = Layout;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Dashboard' },
    { key: '/customers', icon: <UsergroupAddOutlined />, label: 'Customers' },
    { key: '/schemes', icon: <MoneyCollectOutlined />, label: 'Schemes' },
    { key: '/payments', icon: <BarChartOutlined />, label: 'Payments' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div className="logo" style={{ 
          height: 64, margin: 16, background: 'rgba(255,255,255,.2)', 
          textAlign: 'center', lineHeight: '64px', color: 'white' 
        }}>
          VCW Chit
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label
          }))}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: 0, background: '#fff', borderBottom: '1px solid #f0f0f0' 
        }}>
          <Button style={{ 
            margin: '0 24px', 
            color: '#1890ff', 
            padding: '16px 0',
            fontSize: '20px'
          }} href="http://www.vasanthamcrackersworld.com" target="_blank" rel="noopener noreferrer">
            VasanthamCrackersWorlds Chit Scheme
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/schemes" element={<Schemes />} />
            <Route path="/payments" element={<Payments />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: 'center', padding: '16px 0' }}>
          MaDuSOFT Solutions © {new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default App;
