import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Typography,
  Select,
  Table,
  Button,
  Form,
  Input,
  DatePicker,
  message,
  Row,
  Col,
  Tag,
  Modal,
} from "antd";
import { customersAPI, paymentsAPI } from "../services/api";
import dayjs from "dayjs";
import "./css/Payments.css";

const { Title, Text } = Typography;
const { Option } = Select;

const Payments = () => {
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedFundNumber, setSelectedFundNumber] = useState(null);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingPaymentValues, setPendingPaymentValues] = useState(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm] = Form.useForm();

  const firstUnpaidDueNumber = useMemo(() => {
    if (!dues || dues.length === 0) return null;
    const sorted = [...dues].sort(
      (a, b) => parseInt(a.Due_number) - parseInt(b.Due_number),
    );
    const firstUnpaid = sorted.find((d) => {
      const due = parseFloat(d.Due_amount || 0);
      const recd = parseFloat(d.Recd_amount || 0);
      return recd < due;
    });
    return firstUnpaid ? firstUnpaid.Due_number : null;
  }, [dues]);

  // Load all customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await customersAPI.getAll({
          has_scheme: "true",
          limit: 1000,
        });
        // Access nested data object if it exists (standard backend response wrapper)
        const resultData = response.data.data || response.data;
        const customersList = resultData.customers || [];
        setAllCustomers(customersList);
        setCustomers(customersList);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    fetchCustomers();
  }, []);

  // Filter customers by search value
  const handleSearch = (value) => {
    if (!value) {
      setCustomers(allCustomers);
      return;
    }

    const filtered = allCustomers.filter(
      (c) =>
        c.Customer_ID?.toLowerCase().includes(value.toLowerCase()) ||
        c.Customer_Code?.toLowerCase().includes(value.toLowerCase()) ||
        c.Name?.toLowerCase().includes(value.toLowerCase()) ||
        c.Phone_Number?.toString().includes(value),
    );
    setCustomers(filtered);
  };

  // Handle customer selection
  const handleCustomerSelect = async (customerId) => {
    setSelectedCustomer(customerId);
    setSelectedScheme(null);
    setDues([]);
    form.resetFields([
      "schemeId",
      "dueNumber",
      "amount",
      "transactionId",
      "date",
    ]);

    try {
      const response = await customersAPI.getSchemes(customerId);
      const schemesList = response.data.data || response.data || [];
      setSchemes(schemesList);

      // Auto-select active scheme if only one exists (or select the first one)
      // "for each customer there will be only one active scheme so automatically display the active scheme"
      // We will look for a scheme status? The API returns scheme members list.
      // Assuming all returned are active or we just pick the first one as requested.
      if (schemesList.length > 0) {
        const activeScheme = schemesList[0]; // Logic: Pick first
        setSelectedScheme(activeScheme.Scheme_ID);
        setSelectedFundNumber(activeScheme.Fund_Number);
        fetchDues(activeScheme.Fund_Number);
        form.setFieldsValue({ schemeId: activeScheme.Scheme_ID });
      }
    } catch (error) {
      console.error("Error fetching customer schemes:", error);
      message.error("Failed to load customer schemes.");
    }
  };

  // Handle scheme selection
  const handleSchemeSelect = async (schemeId, option) => {
    setSelectedScheme(schemeId);
    // Option value is Scheme_ID, but we can access the full object from state or option if stored
    // Better way: Find scheme in schemes array
    const scheme = schemes.find((s) => s.Scheme_ID === schemeId);
    if (scheme) {
      setSelectedFundNumber(scheme.Fund_Number);
      fetchDues(scheme.Fund_Number);
    }
  };

  const fetchDues = async (fundNumber) => {
    setLoading(true);
    try {
      const response = await paymentsAPI.getDues(fundNumber);
      setDues(response.data.data || response.data || []);
    } catch (error) {
      console.error("Error fetching dues:", error);
      message.error("Failed to load dues.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!selectedFundNumber) return;
    setHistoryLoading(true);
    try {
      const res = await paymentsAPI.getAll({ fund_number: selectedFundNumber });
      const result = res.data.data || res.data || {};
      const historyArr =
        result.payments || (Array.isArray(result) ? result : []);
      setPaymentHistory(historyArr);
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
      message.error("Failed to fetch payment history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEditPayment = (record) => {
    setEditingPayment(record);
    editForm.setFieldsValue({
      Amount_Received: record.Amount_Received,
      Payment_Date: dayjs(record.Amount_Received_date),
      Payment_Mode: record.Payment_Mode,
      Payment_Transaction_ID:
        record.Payment_Transaction_ID || record.Transaction_ID,
      UPI_Phone_Number: record.UPI_Phone_Number,
    });
    setEditModalVisible(true);
  };

  const handleUpdatePayment = async (values) => {
    setPaymentLoading(true);
    try {
      await paymentsAPI.update(editingPayment.Pay_ID, {
        ...values,
        Payment_Date: values.Payment_Date.format("YYYY-MM-DD"),
      });
      message.success("Payment updated successfully");
      setEditModalVisible(false);
      fetchPaymentHistory();
      fetchDues(selectedFundNumber);
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const onFinish = (values) => {
    // Store values and open confirmation modal
    setPendingPaymentValues(values);
    setConfirmModalVisible(true);
  };

  const handleConfirmPayment = async (sendWhatsapp) => {
    if (!pendingPaymentValues) return;

    setPaymentLoading(true);
    let remainingAmount = parseFloat(pendingPaymentValues.amount);
    let startDueNumber = parseInt(pendingPaymentValues.dueNumber);
    let successfulPayments = 0;

    // Generate a unique ID for this bulk transaction if not provided
    const generatedTxId = `PAY-${dayjs().format("YYYYMMDD")}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const txIdToUse = pendingPaymentValues.transactionId || generatedTxId;

    // Sort dues by Due_number just in case
    const sortedDues = [...dues].sort(
      (a, b) => parseInt(a.Due_number) - parseInt(b.Due_number),
    );

    try {
      // Find index of the starting due
      let currentIndex = sortedDues.findIndex(
        (d) => parseInt(d.Due_number) === startDueNumber,
      );

      if (currentIndex === -1) {
        message.error("Starting due not found!");
        setPaymentLoading(false);
        return;
      }

      while (remainingAmount > 0 && currentIndex < sortedDues.length) {
        const currentDue = sortedDues[currentIndex];
        const dueAmount = parseFloat(currentDue.Due_amount || 0);
        const paidAmount = parseFloat(currentDue.Recd_amount || 0);
        const pendingForThisDue = dueAmount - paidAmount;

        if (pendingForThisDue <= 0) {
          currentIndex++;
          continue; // Skip fully paid dues
        }

        // Determine how much to pay for this due
        // If remaining >= pending, clear this due. Else, pay partial.
        const paymentForThisDue =
          remainingAmount >= pendingForThisDue
            ? pendingForThisDue
            : remainingAmount;

        const payload = {
          Fund_Number: selectedFundNumber,
          Due_number: currentDue.Due_number.toString(),
          Payment_Transaction_ID: txIdToUse,
          Amount_Received: paymentForThisDue, // Logic handles distribution
          Payment_Date: pendingPaymentValues.date.format("YYYY-MM-DD"),
          Payment_Mode: pendingPaymentValues.paymentMode,
          UPI_Phone_Number: pendingPaymentValues.upiPhone,
          sendWhatsapp: sendWhatsapp,
          // Note: If distributing, we might send multiple WA messages?
          // User might find that annoying. Maybe only send for the first one or a summary?
          // The backend sends WA on each 'create'. We can't easily stop it without backend changes.
          // We will pass 'sendWhatsapp' as true only for the LAST transaction or FIRST?
          // Ideally, we sum up and send one, but backend endpoints are atomic.
          // Let's pass sendWhatsapp for EACH for now, or maybe only for the last to avoid spam?
          // Or better: pass false for all except the last one?
          // If we pass false for early ones, the user won't get "Payment Received for Month X" notification.
          // They usually want receipt for each month. So we leave it as passed.
        };

        await paymentsAPI.create(payload);

        remainingAmount -= paymentForThisDue;
        successfulPayments++;
        currentIndex++;

        // Wait a bit to avoid race conditions or rate limits
        await new Promise((r) => setTimeout(r, 200));
      }

      if (remainingAmount > 0) {
        message.info(
          `Payment complete. Transaction ID: ${txIdToUse}. Excess amount ₹${remainingAmount} was not applied (no more dues).`,
        );
      } else {
        message.success(
          `Payment successfully distributed across ${successfulPayments} due(s)! (ID: ${txIdToUse})`,
        );
      }

      form.resetFields([
        "dueNumber",
        "amount",
        "transactionId",
        "date",
        "paymentMode",
      ]);
      setPaymentMode("UPI"); // Reset to default UPI
      fetchDues(selectedFundNumber); // Refresh dues
      setConfirmModalVisible(false);
      setPayModalVisible(false);
      setPendingPaymentValues(null);
    } catch (error) {
      console.error("Payment error:", error);
      message.error(
        "Failed to record payment: " +
          (error.response?.data?.error ||
            (error.response?.data?.errors
              ? error.response.data.errors.map((e) => e.msg).join(", ")
              : error.message)),
      );
      // If partial failure, we should probably still refresh list
      fetchDues(selectedFundNumber);
    } finally {
      setPaymentLoading(false);
    }
  };

  const columns = [
    { title: "Due #", dataIndex: "Due_number", key: "Due_number", width: 80 },
    {
      title: "Due Date",
      dataIndex: "Due_date",
      key: "Due_date",
      width: 120,
      render: (text) => (text ? dayjs(text).format("DD-MM-YYYY") : "N/A"),
    },
    {
      title: "Due Amount",
      dataIndex: "Due_amount",
      key: "Due_amount",
      width: 100,
      render: (val) => `₹${val}`,
    },
    {
      title: "Received",
      dataIndex: "Recd_amount",
      key: "Recd_amount",
      width: 100,
      render: (val) => (
        <Text type={val >= 0 ? "success" : "warning"}>₹{val || 0}</Text>
      ),
    },
    {
      title: "Recd Date", // New Column
      dataIndex: "amt_received_date",
      key: "amt_received_date",
      width: 120,
      render: (text) => (text ? dayjs(text).format("DD-MM-YYYY") : "-"),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => {
        const due = parseFloat(record.Due_amount || 0);
        const recd = parseFloat(record.Recd_amount || 0);
        return recd >= due ? (
          <Tag color="green">Paid</Tag>
        ) : (
          <Tag color="red">Pending</Tag>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (_, record) => {
        const due = parseFloat(record.Due_amount || 0);
        const recd = parseFloat(record.Recd_amount || 0);

        return (
          <div style={{ display: "flex", gap: "8px" }}>
            {recd < due && record.Due_number === firstUnpaidDueNumber && (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => {
                  const generatedId = `PAY-${dayjs().format("YYYYMMDD")}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
                  form.setFieldsValue({
                    dueNumber: record.Due_number,
                    amount: due - recd,
                    date: dayjs(),
                    paymentMode: "UPI",
                    transactionId: generatedId,
                  });
                  setPaymentMode("UPI");
                  setPayModalVisible(true); // Open modal on Pay
                }}
              >
                Pay
              </Button>
            )}
            {recd > 0 && (
              <Button
                type="link"
                style={{ padding: 0, color: "var(--primary-color)" }}
                loading={loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await paymentsAPI.getAll({
                      fund_number: selectedFundNumber,
                    });
                    const result = res.data.data || res.data || {};
                    const history = result.payments || [];

                    // Find the most recent payment for this specific due number
                    const paymentToEdit = history.find(
                      (p) =>
                        parseInt(p.Due_number) === parseInt(record.Due_number),
                    );

                    if (paymentToEdit) {
                      handleEditPayment(paymentToEdit);
                    } else {
                      message.warning(
                        "No editable payment found for this due.",
                      );
                    }
                  } catch (error) {
                    console.error("Error fetching payment to edit:", error);
                    message.error("Failed to fetch payment details.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Edit
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const historyColumns = [
    {
      title: "Date",
      dataIndex: "Amount_Received_date",
      render: (d) => dayjs(d).format("DD-MM-YYYY"),
    },
    { title: "Due #", dataIndex: "Due_number", width: 80 },
    { title: "Amount", dataIndex: "Amount_Received", render: (v) => `₹${v}` },
    { title: "Mode", dataIndex: "Payment_Mode" },
    {
      title: "Ref No",
      render: (_, record) =>
        record.Payment_Transaction_ID || record.Transaction_ID || "-",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button type="link" onClick={() => handleEditPayment(record)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Payment Management</Title>

      <Row gutter={24}>
        <Col xs={24} md={8}>
          <Card title="Select Customer & Scheme">
            <Form form={form} layout="vertical">
              {/* NEW: Search by Fund Number */}
              <Form.Item label="Search by Fund Number">
                <Input.Search
                  placeholder="Enter Fund Number (e.g. 2024_12_1234)"
                  enterButton="Search"
                  onSearch={async (value) => {
                    if (!value) return;
                    try {
                      const response =
                        await customersAPI.getByFundNumber(value);
                      const customer = response.data.data || response.data;

                      if (!customer) {
                        message.error("Fund Number not found.");
                        return;
                      }

                      const resolvedFundNumber = customer.Fund_Number;

                      // 1. Set Customer
                      await handleCustomerSelect(customer.Customer_ID);

                      // 2. Get schemes for this customer to find the matching fund number
                      const schemesResponse = await customersAPI.getSchemes(
                        customer.Customer_ID,
                      );
                      const schemesList =
                        schemesResponse.data.data || schemesResponse.data || [];
                      const matchingScheme = schemesList.find(
                        (s) => s.Fund_Number === resolvedFundNumber,
                      );

                      if (matchingScheme) {
                        // Small timeout to allow state updates from handleCustomerSelect
                        setTimeout(() => {
                          setSelectedScheme(matchingScheme.Scheme_ID);
                          setSelectedFundNumber(matchingScheme.Fund_Number);
                          fetchDues(matchingScheme.Fund_Number);
                          form.setFieldsValue({
                            schemeId: matchingScheme.Scheme_ID,
                          });
                          message.success(`Found: ${resolvedFundNumber}`);
                        }, 500);
                      }
                    } catch (error) {
                      console.error("Fund Search Error:", error);
                      message.error("Fund Number not found.");
                    }
                  }}
                />
              </Form.Item>

              <Form.Item label="Search Customer">
                <Select
                  showSearch
                  placeholder="Search by Customer Code, ID, Name or Phone"
                  defaultActiveFirstOption={true}
                  filterOption={false}
                  onSearch={handleSearch}
                  onChange={handleCustomerSelect}
                  dropdownStyle={{ zIndex: 1050 }}
                  classNames={{ popup: { root: "bright-highlight" } }}
                  notFoundContent={null}
                  allowClear
                >
                  {(customers || []).map((d) => (
                    <Option key={d.Customer_ID} value={d.Customer_ID}>
                      {d.Customer_Code ? `[${d.Customer_Code}] ` : ""} {d.Name}{" "}
                      ({d.Customer_ID}) - {d.Phone_Number}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedCustomer &&
                (() => {
                  const cust = allCustomers.find(
                    (c) => c.Customer_ID === selectedCustomer,
                  );
                  return cust ? (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: "10px 14px",
                        background: "#f6ffed",
                        border: "1px solid #b7eb8f",
                        borderRadius: 6,
                      }}
                    >
                      <Row gutter={8}>
                        <Col span={24}>
                          <Text strong>Name:</Text> <Text>{cust.Name}</Text>
                        </Col>
                        <Col span={12}>
                          <Text strong>Code:</Text>{" "}
                          <Text>{cust.Customer_Code || "-"}</Text>
                        </Col>
                        <Col span={12}>
                          <Text strong>ID:</Text>{" "}
                          <Text>{cust.Customer_ID}</Text>
                        </Col>
                      </Row>
                    </div>
                  ) : null;
                })()}

              {selectedCustomer && (
                <Form.Item label="Select Scheme">
                  <Select
                    placeholder="Select a scheme"
                    onChange={handleSchemeSelect}
                    value={selectedScheme}
                    showSearch
                    optionFilterProp="children"
                    classNames={{ popup: { root: "bright-highlight" } }}
                  >
                    {schemes.map((s) => (
                      <Option key={s.Scheme_ID} value={s.Scheme_ID}>
                        {s.Scheme_Name} (Fund: {s.Fund_Number})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            title={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Scheme Dues</span>
                {selectedFundNumber && (
                  <Button
                    size="small"
                    onClick={() => {
                      setHistoryModalVisible(true);
                      fetchPaymentHistory();
                    }}
                  >
                    View Payment History
                  </Button>
                )}
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={dues}
              rowKey="Due_number"
              loading={loading}
              pagination={false}
              scroll={{ x: 600, y: 500 }}
            />
          </Card>
        </Col>
      </Row>
      <Modal
        title="Confirm Payment"
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="payOnly"
            onClick={() => handleConfirmPayment(false)}
            loading={paymentLoading}
          >
            No, Pay Only
          </Button>,
          <Button
            key="payNotify"
            type="primary"
            onClick={() => handleConfirmPayment(true)}
            loading={paymentLoading}
          >
            Yes, Pay & Notify
          </Button>,
        ]}
      >
        <p>Are you sure you want to record this payment?</p>
        <p>Do you want to send a WhatsApp notification?</p>
        {selectedCustomer && (
          <p>
            Customer:{" "}
            <strong>
              {
                allCustomers.find((c) => c.Customer_ID === selectedCustomer)
                  ?.Name
              }
            </strong>{" "}
            (
            {
              allCustomers.find((c) => c.Customer_ID === selectedCustomer)
                ?.Phone_Number
            }
            )
          </p>
        )}
      </Modal>

      {/* Payment History Modal */}
      <Modal
        title={`Payment History - ${selectedFundNumber}`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={historyColumns}
          dataSource={paymentHistory}
          rowKey="Pay_ID"
          loading={historyLoading}
          pagination={{ pageSize: 10 }}
        />
      </Modal>

      {/* Edit Payment Modal */}
      <Modal
        title="Edit Payment Details"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdatePayment}>
          <Form.Item
            name="Amount_Received"
            label="Amount Received"
            rules={[{ required: true }]}
          >
            <Input type="number" prefix="₹" />
          </Form.Item>
          <Form.Item
            name="Payment_Date"
            label="Payment Date"
            rules={[{ required: true }]}
          >
            <DatePicker format="DD-MM-YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="Payment_Mode"
            label="Payment Mode"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="Cash">Cash</Option>
              <Option value="UPI">UPI</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
              <Option value="Cheque">Cheque</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="Payment_Transaction_ID"
            label="Reference No (Autogenerated if blank)"
          >
            <Input />
          </Form.Item>
          <Form.Item name="UPI_Phone_Number" label="UPI Phone Number">
            <Input maxLength={10} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={paymentLoading}
          >
            Update Payment
          </Button>
        </Form>
      </Modal>

      {/* NEW: Record Payment Modal */}
      <Modal
        title="Record Payment"
        open={payModalVisible}
        onCancel={() => setPayModalVisible(false)}
        footer={null}
        destroyOnHidden={true}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="dueNumber"
            label="Due Number"
            rules={[{ required: true }]}
          >
            <Input readOnly />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount Received"
            rules={[{ required: true }]}
          >
            <Input type="number" prefix="₹" />
          </Form.Item>

          <Form.Item name="transactionId" label="Payment Transaction ID">
            <Input readOnly placeholder="Autogenerated Transaction ID" />
          </Form.Item>

          <Form.Item
            name="paymentMode"
            label="Payment Mode"
            rules={[{ required: true, message: "Please select payment mode" }]}
            initialValue="UPI"
          >
            <Select
              onChange={setPaymentMode}
              showSearch
              classNames={{ popup: { root: "bright-highlight" } }}
            >
              <Option value="Cash">Cash</Option>
              <Option value="UPI">UPI</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
              <Option value="Cheque">Cheque</Option>
            </Select>
          </Form.Item>

          {paymentMode === "UPI" && (
            <Form.Item name="upiPhone" label="Phone Number">
              <Input placeholder="Enter UPI Phone Number" maxLength={10} />
            </Form.Item>
          )}

          <Form.Item
            name="date"
            label="Payment Date (dd-mm-yyyy)"
            rules={[{ required: true }]}
          >
            <DatePicker
              format="DD-MM-YYYY"
              style={{ width: "100%" }}
              onFocus={(e) => e.target.select()}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={paymentLoading}
          >
            Record Payment
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Payments;
