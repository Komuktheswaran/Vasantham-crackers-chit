import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Space,
  Row,
  Col,
  Tag,
  Checkbox,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  orderTrackingAPI,
  customersAPI,
  transportersAPI,
} from "../services/api";
import dayjs from "dayjs";

const { Option } = Select;

const TrackingOrder = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [form] = Form.useForm();

  // Search state
  const [searchText, setSearchText] = useState("");

  // Options
  const [customers, setCustomers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [deliveryPoints, setDeliveryPoints] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchTransporters();
  }, []);

  const fetchCustomers = async (search = "") => {
    try {
      const res = await customersAPI.getAll({ search, limit: 50 });
      setCustomers(res.data.data?.customers || res.data.customers || []);
    } catch (error) {
      console.error("Fetch customers error:", error);
    }
  };

  const fetchTransporters = async () => {
    try {
      // Use transportersAPI defined in api.js, not orderTrackingAPI
      const res = await transportersAPI.getAll();
      setTransporters(res.data.data || res.data || []);
    } catch (error) {
      console.error("Fetch transporters error", error);
    }
  };

  const fetchOrders = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page: params.page || pagination.current,
        limit: params.limit || pagination.pageSize,
        search: searchText,
        ...params,
      };

      const response = await orderTrackingAPI.getAll(queryParams);
      const resultData = response.data.data || response.data || {};

      setOrders(resultData.orders || []);

      if (resultData.pagination) {
        setPagination({
          ...pagination,
          current: resultData.pagination.currentPage,
          total: resultData.pagination.totalRecords,
        });
      }
    } catch (error) {
      console.error("Fetch orders error:", error);
      message.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    fetchOrders({ page: newPagination.current, limit: newPagination.pageSize });
  };

  const handleOk = async (values) => {
    const performSave = async (sendWhatsapp) => {
      try {
        const payload = { ...values, sendWhatsapp };
        if (editingOrder) {
          await orderTrackingAPI.update(editingOrder.Tracking_ID, payload);
          message.success("Order updated successfully");
        } else {
          await orderTrackingAPI.create(payload);
          message.success("Order created successfully");
        }
        setModalVisible(false);
        fetchOrders();
        form.resetFields();
        setEditingOrder(null);
        setSelectedTransporter(null);
      } catch (error) {
        console.error("Save order error:", error);
        message.error(
          "Failed to save order: " +
            (error.response?.data?.error || error.message),
        );
      }
    };

    let title = editingOrder ? "Update Order" : "Create Order";
    let promptText = editingOrder
      ? 'Do you want to send an "Order Update/Dispatch" WhatsApp notification?'
      : 'Do you want to send an "Order Received" WhatsApp notification?';

    if (editingOrder && values.Transporter_Name) {
      promptText = `Dispatched via ${values.Transporter_Name}. Send WhatsApp notification?`;
    }

    Modal.confirm({
      title: title,
      content: (
        <div>
          <p>
            Are you sure you want to {editingOrder ? "update" : "create"} this
            order?
          </p>
          <p>{promptText}</p>
        </div>
      ),
      okText: editingOrder ? "Yes, Update & Notify" : "Yes, Create & Notify",
      cancelText: editingOrder ? "No, Update Only" : "No, Create Only",
      maskClosable: false,
      closable: false,
      onOk: () => performSave(true),
      onCancel: () => performSave(false),
    });
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Order",
      content: "Are you sure you want to delete this order tracking record?",
      okText: "Yes",
      okType: "danger",
      onOk: async () => {
        try {
          await orderTrackingAPI.delete(id);
          message.success("Order deleted successfully");
          fetchOrders();
        } catch (error) {
          message.error("Failed to delete order");
        }
      },
    });
  };

  const openModal = (order = null) => {
    setEditingOrder(order);
    if (order) {
      // Try to split Transporter Name if needed, or just set it
      // Logic: If Name contains " - ", maybe split? But user might have typed it manually before.
      // We will just set Transporter_Name as is.
      form.setFieldsValue({
        ...order,
        Order_Received_Date: order.Order_Received_Date
          ? dayjs(order.Order_Received_Date)
          : null,
        Payment_Received_Date: order.Payment_Received_Date
          ? dayjs(order.Payment_Received_Date)
          : null,
        Parcel_Quantity: order.Parcel_Quantity || 0,
        Packing_Status: order.Packing_Status || "Pending",
      });
      // Try to find if the existing Transporter Name matches one of our Transporters
      // This is tricky if we concatenated delivery point.
      // We'll leave it as free text if it doesn't match, or just let user change it.
    } else {
      form.resetFields();
      form.setFieldsValue({ Parcel_Quantity: 0, Packing_Status: "Pending" });
      setSelectedTransporter(null);
    }
    setModalVisible(true);
  };

  let timeout;
  const handleCustomerSearch = (val) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fetchCustomers(val);
    }, 300);
  };

  const handleTransporterChange = async (transporterId) => {
    // 1. Find the transporter object
    const transporter = transporters.find(
      (t) => t.Transporter_ID === transporterId,
    );
    setSelectedTransporter(transporter);

    // 2. Clear old delivery points and form values
    setDeliveryPoints([]);
    form.setFieldsValue({
      Delivery_Point: undefined,
      Transporter_Contact: transporter ? transporter.Phone_Number : "",
      Transporter_Name: transporter ? transporter.Transporter_Name : undefined,
    });

    if (!transporterId) return;

    // 3. Fetch Delivery Points for this transporter
    try {
      const res = await transportersAPI.getDeliveryPoints(transporterId);
      setDeliveryPoints(res.data.data || res.data || []);
    } catch (error) {
      console.error("Error fetching delivery points:", error);
      message.error("Failed to load delivery points");
    }
  };

  const handleDeliveryPointChange = (deliveryPointName) => {
    // Find the delivery point object to get specific details if needed
    // The value associated with Option is the Name/String usually, or ID.
    // In our Option: value={dp.Place_Name} which seems to be a name string from the map below.
    const dp = deliveryPoints.find((d) => d.Place_Name === deliveryPointName);

    if (dp) {
      // Update Contact Number with the Branch Phone if available
      form.setFieldsValue({
        Transporter_Contact:
          dp.Branch_Phone || selectedTransporter?.Phone_Number,
      });
    }
  };

  const columns = [
    {
      title: "Tracking No",
      dataIndex: "Tracking_Number",
      key: "Tracking_Number",
      width: 130,
      render: (text) => <b>{text || "-"}</b>,
    },
    {
      title: "Order No",
      dataIndex: "Order_Number",
      key: "Order_Number",
      width: 100,
    },
    {
      title: "Qty",
      dataIndex: "Parcel_Quantity",
      key: "Parcel_Quantity",
      width: 60,
      align: "center",
      render: (text) => text || "0",
    },
    {
      title: "Customer",
      key: "Customer_Display",
      ellipsis: true,
      render: (_, record) => {
        if (record.Registered_Name) {
          return `${record.Registered_Name} (${record.Registered_Phone || record.Customer_ID})`;
        }
        return record.Customer_Name || record.Customer_ID || "-";
      },
    },
    {
      title: "Fund No",
      dataIndex: "Fund_Number",
      key: "Fund_Number",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Order Date",
      dataIndex: "Order_Received_Date",
      key: "Order_Received_Date",
      width: 100,
      render: (date) => (date ? dayjs(date).format("DD-MM-YYYY") : "-"),
    },
    {
      title: "Pay Date",
      dataIndex: "Payment_Received_Date",
      key: "Payment_Received_Date",
      width: 100,
      render: (date) => (date ? dayjs(date).format("DD-MM-YYYY") : "-"),
    },
    {
      title: "Amount",
      dataIndex: "Payment_Amount",
      key: "Payment_Amount",
      width: 90,
      align: "right",
      render: (amt) => (amt ? `₹${parseFloat(amt).toLocaleString()}` : "-"),
    },
    {
      title: "Transporter",
      dataIndex: "Transporter_Name",
      key: "Transporter_Name",
      ellipsis: true,
      render: (text) => text || "-",
    },
    {
      title: "Contact",
      dataIndex: "Transporter_Contact",
      key: "Transporter_Contact",
      width: 110,
      ellipsis: true,
      render: (text) => text || "-",
    },
    {
      title: "Status",
      dataIndex: "Packing_Status",
      key: "Packing_Status",
      width: 100,
      align: "center",
      render: (text) => {
        let color = "default";
        if (text === "Pending") color = "orange";
        if (text === "Packed") color = "blue";
        if (text === "Dispatched") color = "green";
        return <Tag color={color}>{text || "Pending"}</Tag>;
      },
    },
    {
      title: "Source",
      dataIndex: "Source",
      key: "Source",
      width: 80,
      render: (text) => (text ? <Tag color="blue">{text}</Tag> : "-"),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openModal(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record.Tracking_ID)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div
        className="page-header-row"
        style={{ justifyContent: "flex-start", gap: "20px" }}
      >
        <h2 className="page-title">Order Tracking ({pagination.total})</h2>
        <div className="page-action-bar">
          <Space>
            <Input
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={() => fetchOrders({ page: 1 })}
              style={{ width: 200 }}
              suffix={
                <SearchOutlined onClick={() => fetchOrders({ page: 1 })} />
              }
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchText("");
                fetchOrders({ page: 1, search: "" });
              }}
            >
              Reset
            </Button>
            <Button type="primary" onClick={() => openModal()}>
              + New Order
            </Button>
          </Space>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="Tracking_ID"
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        size="middle"
      />

      <Modal
        title={editingOrder ? "Edit Order" : "New Order"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
        forceRender
      >
        <OrderForm
          form={form}
          handleOk={handleOk}
          customers={customers}
          handleCustomerSearch={handleCustomerSearch}
          transporters={transporters}
          deliveryPoints={deliveryPoints}
          selectedTransporter={selectedTransporter}
          handleTransporterChange={handleTransporterChange}
          handleDeliveryPointChange={handleDeliveryPointChange}
        />
      </Modal>
    </div>
  );
};

// Extracted Form Component to handle Transporter Logic more cleanly
const OrderForm = ({
  form,
  handleOk,
  customers,
  handleCustomerSearch,
  transporters,
  deliveryPoints,
  selectedTransporter,
  handleTransporterChange,
  handleDeliveryPointChange,
}) => {
  const [isGuest, setIsGuest] = useState(false);

  // Watch for editing mode to set initial guest state
  useEffect(() => {
    // If we have a Customer_ID but it doesn't match the format or isn't in list (hard to check list async),
    // simpler: If we are editing, and the current Customer_ID is NOT in the customers list we loaded?
    // Actually, backend sends "Customer_Name" if it joined. If "Customer_Name" is null but "Customer_ID" has value, it's a guest.
    // BUT form just receives values.
    // Let's rely on the fact that standard IDs might look like "custid/..."
    // If it doesn't look like that, maybe it's guest?
    const cid = form.getFieldValue("Customer_ID");
    const cname = form.getFieldValue("Customer_Name");
    // If Customer_Name is set but Customer_ID is empty, it's definitely a guest
    if (cname && !cid) {
      setIsGuest(true);
    } else {
      setIsGuest(false);
    }
  }, [form]);

  return (
    <Form form={form} layout="vertical" onFinish={handleOk}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="Tracking_Number" label="Tracking / LLM Number">
            <Input placeholder="Enter Tracking / LLM No" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="Order_Number" label="Order Number">
            <Input placeholder="Enter Order No" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Customer">
            <Form.Item name={isGuest ? "Customer_Name" : "Customer_ID"} noStyle>
              {isGuest ? (
                <Input placeholder="Enter Guest / Customer Name" />
              ) : (
                <Select
                  showSearch
                  placeholder="Select Customer"
                  filterOption={false}
                  onSearch={handleCustomerSearch}
                  allowClear
                >
                  {customers.map((c) => (
                    <Option key={c.Customer_ID} value={c.Customer_ID}>
                      {c.Name} - {c.Customer_Code} ({c.Phone_Number})
                    </Option>
                  ))}
                </Select>
              )}
            </Form.Item>
            <Checkbox
              checked={isGuest}
              onChange={(e) => {
                const guest = e.target.checked;
                setIsGuest(guest);
                if (guest) {
                  form.setFieldsValue({ Customer_ID: undefined });
                } else {
                  form.setFieldsValue({ Customer_Name: undefined });
                }
              }}
              style={{ marginTop: 8 }}
            >
              Unregistered / Guest Customer
            </Checkbox>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="Fund_Number" label="Fund Number">
            <Input placeholder="Enter Fund No (Optional)" />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Cust Phone">
            <Input
              readOnly
              placeholder="Phone"
              value={
                !isGuest
                  ? customers.find(
                      (c) =>
                        c.Customer_ID === form.getFieldValue("Customer_ID"),
                    )?.Phone_Number || ""
                  : ""
              }
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="Order_Received_Date" label="Order Received Date">
            <DatePicker
              style={{ width: "100%" }}
              format="DD-MM-YYYY"
              onFocus={(e) => e.target.select()}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="Payment_Received_Date" label="Payment Received Date">
            <DatePicker
              style={{ width: "100%" }}
              format="DD-MM-YYYY"
              onFocus={(e) => e.target.select()}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="Payment_Amount" label="Payment Amount">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Transporter Name">
            <Select
              placeholder="Select Transporter"
              onChange={handleTransporterChange}
              showSearch
              popupClassName="bright-highlight"
              filterOption={(input, option) =>
                (option?.children ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {transporters.map((t) => (
                <Option key={t.Transporter_ID} value={t.Transporter_ID}>
                  {t.Transporter_Name}
                </Option>
              ))}
            </Select>
            {/* Hidden Input to store the actual value sent to backend */}
            <Form.Item name="Transporter_Name" noStyle hidden>
              <Input />
            </Form.Item>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Delivery Point">
            <Select
              placeholder="Select Delivery Point"
              onChange={handleDeliveryPointChange}
              showSearch
              popupClassName="bright-highlight"
              disabled={!selectedTransporter}
              filterOption={(input, option) =>
                (option?.children ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {deliveryPoints.map((dp) => (
                <Option
                  key={dp.Delivery_Point_ID || dp.Place_Name}
                  value={dp.Place_Name}
                >
                  {dp.Place_Name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="Transporter_Contact" label="Contact Number">
            <Input readOnly placeholder="Auto-filled" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="Source" label="Source">
            <Select
              placeholder="Select Source"
              showSearch
              popupClassName="bright-highlight"
            >
              <Option value="Website">Website</Option>
              <Option value="Whatsapp">Whatsapp</Option>
              <Option value="In Store">In Store</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="Packing_Status" label="Packing Status">
            <Select
              placeholder="Select Status"
              showSearch
              popupClassName="bright-highlight"
            >
              <Option value="Pending">Pending</Option>
              <Option value="Packed">Packed</Option>
              <Option value="Dispatched">Dispatched</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="Parcel_Quantity" label="Parcel Quantity">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default TrackingOrder;
