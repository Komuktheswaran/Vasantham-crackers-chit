import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Space,
  Tag,
  Card
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined
  
} from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService';

const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      message.error(error.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.Username,
      fullName: user.Full_Name,
      role: user.Role
    });
    setModalVisible(true);
  };

  const handleDelete = async (userId) => {
    try {
      await deleteUser(userId);
      message.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      message.error(error.error || 'Failed to delete user');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData = {
          username: values.username,
          fullName: values.fullName,
          role: values.role
        };
        
        // Only include password if it was changed
        if (values.password) {
          updateData.password = values.password;
        }

        await updateUser(editingUser.User_ID, updateData);
        message.success('User updated successfully');
      } else {
        // Create new user
        await createUser({
          username: values.username,
          password: values.password,
          fullName: values.fullName,
          role: values.role
        });
        message.success('User created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      const errorMsg = error.error || error.errors?.[0]?.msg || 'Operation failed';
      message.error(errorMsg);
    }
  };

  const columns = [
    {
      title: 'User ID',
      dataIndex: 'User_ID',
      key: 'User_ID',
      width: 100
    },
    {
      title: 'Username',
      dataIndex: 'Username',
      key: 'Username',
      width: 120,
      sorter: (a, b) => a.Username.localeCompare(b.Username)
    },
    {
      title: 'Full Name',
      dataIndex: 'Full_Name',
      key: 'Full_Name',
      width: 150,
      render: (text) => text || '-'
    },
    {
      title: 'Role',
      dataIndex: 'Role',
      key: 'Role',
      width: 100,
      render: (role) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Admin', value: 'admin' },
        { text: 'User', value: 'user' }
      ],
      onFilter: (value, record) => record.Role === value
    },
    {
      title: 'Created At',
      dataIndex: 'Created_At',
      key: 'Created_At',
      width: 120,
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.Created_At) - new Date(b.Created_At)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDelete(record.User_ID)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="User Management"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchUsers}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleCreate}
          >
            Create User
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="User_ID"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Total ${total} users`,
          showSizeChanger: true
        }}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editingUser ? 'Edit User' : 'Create New User'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingUser ? 'Update' : 'Create'}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[
              { required: true, message: 'Please input username!' },
              { min: 3, max: 50, message: 'Username must be 3-50 characters' }
            ]}
          >
            <Input placeholder="Enter username" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: !editingUser,
                message: 'Please input password!'
              },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
            extra={editingUser ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[
              { max: 100, message: 'Full name must not exceed 100 characters' }
            ]}
          >
            <Input placeholder="Enter full name (optional)" />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            initialValue="user"
            rules={[{ required: true, message: 'Please select a role!' }]}
          >
            <Select>
              <Option value="user">User</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UserManagement;
