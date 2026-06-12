import React, { useState, useEffect } from "react";
import {
  Card,
  Select,
  DatePicker,
  Input,
  Button,
  message,
  Space,
  Statistic,
  Table,
} from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import {
  customersAPI,
  schemesAPI,
  exportsAPI,
  paymentsAPI,
} from "../../services/api";
import dayjs from "dayjs";

const { Option } = Select;

const PaymentDownload = () => {
  const [filters, setFilters] = useState({
    date_from: null,
    date_to: null,
    customer_id: null,
    scheme_id: null,
    transaction_id: "",
  });

  const [customers, setCustomers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [customersRes, schemesRes] = await Promise.all([
        customersAPI.getAll({ has_scheme: "true", limit: 1000 }),
        schemesAPI.getAll(),
      ]);
      // Backend wraps response in .data wrapper: response.data.data.customers
      const customersData = customersRes.data.data || customersRes.data || {};
      const customersList =
        customersData.customers ||
        (Array.isArray(customersData) ? customersData : []);
      setCustomers(customersList);

      const schemesData = schemesRes.data.data || schemesRes.data || {};
      const schemesList =
        schemesData.schemes || (Array.isArray(schemesData) ? schemesData : []);
      setSchemes(schemesList);
    } catch (error) {
      message.error("Failed to load filter options");
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSingleDateChange = (field) => (date) => {
    setFilters((prev) => ({
      ...prev,
      [field]: date ? date.format("YYYY-MM-DD") : null,
    }));
  };

  const clearFilters = () => {
    setFilters({
      date_from: null,
      date_to: null,
      customer_id: null,
      scheme_id: null,
      transaction_id: "",
    });
    setPreviewData([]);
    setRecordCount(0);
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const params = { limit: 10, sort_order: "asc" };
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.customer_id) params.customer_id = filters.customer_id;
      if (filters.scheme_id) params.scheme_id = filters.scheme_id;
      if (filters.transaction_id)
        params.transaction_id = filters.transaction_id;

      const response = await paymentsAPI.getAll(params);
      const data = response.data.data || response.data || {};
      const payments = data.payments || (Array.isArray(data) ? data : []);
      const count = data.pagination?.totalRecords || payments.length || 0;

      // Enrich with Customer_Code from the already-loaded customers list
      const enriched = payments.map((p) => {
        const cust = customers.find((c) => c.Customer_ID === p.Customer_ID);
        return { ...p, Customer_Code: cust?.Customer_Code || p.Customer_Code || "-" };
      });

      setPreviewData(enriched);
      setRecordCount(count);

      if (payments.length === 0) {
        message.info("No payment records found matching your filters");
      }
    } catch (error) {
      message.error("Failed to preview data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.customer_id) params.customer_id = filters.customer_id;
      if (filters.scheme_id) params.scheme_id = filters.scheme_id;
      if (filters.transaction_id)
        params.transaction_id = filters.transaction_id;

      const response = await exportsAPI.exportPayments(params);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `payments_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success("Payment data downloaded successfully");
    } catch (error) {
      message.error("Failed to download payment data");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Customer ID", dataIndex: "Customer_ID", key: "customer_id" },
    { title: "Customer Code", dataIndex: "Customer_Code", key: "customer_code", render: (v) => v || "-" },
    { title: "Customer Name", dataIndex: "Customer_Name", key: "customer" },
    { title: "Fund No.", dataIndex: "Fund_Number", key: "fund_number", render: (v) => v || "-" },
    { title: "Scheme", dataIndex: "Scheme_Name", key: "scheme" },
    { title: "Due No.", dataIndex: "Due_number", key: "due_number" },
    {
      title: "Amount",
      dataIndex: "Amount_Received",
      key: "amount",
      render: (val) => `₹${val}`,
    },
    {
      title: "Date",
      dataIndex: "Amount_Received_date",
      key: "date",
      render: (val) => dayjs(val).format("DD-MM-YYYY"),
    },
    { title: "UPI Number", dataIndex: "UPI_Phone_Number", key: "upi", render: (v) => v || "-" },
    {
      title: "Transaction ID",
      dataIndex: "Transaction_ID",
      key: "transaction_id",
    },
  ];

  return (
    <div>
      <Card title="Filter Payments" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <DatePicker
              style={{ width: "100%" }}
              onChange={handleSingleDateChange("date_from")}
              placeholder="From Date"
              format="DD-MM-YYYY"
              value={filters.date_from ? dayjs(filters.date_from) : null}
            />
            <DatePicker
              style={{ width: "100%" }}
              onChange={handleSingleDateChange("date_to")}
              placeholder="To Date"
              format="DD-MM-YYYY"
              value={filters.date_to ? dayjs(filters.date_to) : null}
            />

            <Select
              allowClear
              showSearch
              popupClassName="bright-highlight"
              optionFilterProp="children"
              placeholder="Select Customer"
              value={filters.customer_id}
              onChange={(value) => handleFilterChange("customer_id", value)}
              style={{ width: "100%" }}
            >
              {customers.map((c) => (
                <Option key={c.Customer_ID} value={c.Customer_ID}>
                  {c.Customer_Code ? `[${c.Customer_Code}] ` : ""}{c.Name || `${c.First_Name || ""} ${c.Last_Name || ""}`} ({c.Customer_ID})
                </Option>
              ))}
            </Select>

            <Select
              allowClear
              showSearch
              optionFilterProp="children"
              popupClassName="bright-highlight"
              placeholder="Select Scheme"
              value={filters.scheme_id}
              onChange={(value) => handleFilterChange("scheme_id", value)}
              style={{ width: "100%" }}
            >
              {schemes.map((s) => (
                <Option key={s.Scheme_ID} value={s.Scheme_ID}>
                  {s.Name}
                </Option>
              ))}
            </Select>

            <Input
              placeholder="Search by Transaction ID"
              value={filters.transaction_id}
              onChange={(e) =>
                handleFilterChange("transaction_id", (e.target.value || "").toUpperCase())
              }
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button
              icon={<EyeOutlined />}
              onClick={handlePreview}
              loading={loading}
            >
              Preview
            </Button>
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={loading}
            >
              Download CSV
            </Button>
          </div>
        </Space>
      </Card>

      {(previewData.length > 0 || recordCount > 0) && (
        <Card title="Preview" style={{ marginBottom: 16 }}>
          <Statistic
            title="Total Records"
            value={recordCount}
            suffix="payments"
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={previewData}
            columns={columns}
            rowKey="Pay_ID"
            pagination={false}
            size="small"
          />
          <p style={{ marginTop: 8, color: "#666", fontSize: "12px" }}>
            Showing first 10 records. Download will include all {recordCount}{" "}
            matching records.
          </p>
        </Card>
      )}

      <Card>
        <p style={{ color: "#666" }}>
          <strong>Note:</strong> The download will include all payment records
          matching your filter criteria.
          {filters.date_from && filters.date_to && (
            <>
              {" "}
              Date range: {filters.date_from} to {filters.date_to}.
            </>
          )}
          {!filters.date_from && !filters.date_to && (
            <> No date filter applied - all payment records will be included.</>
          )}
        </p>
      </Card>
    </div>
  );
};

export default PaymentDownload;
