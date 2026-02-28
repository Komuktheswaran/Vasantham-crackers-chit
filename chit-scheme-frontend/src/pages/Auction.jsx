import React, { useState } from "react";
import {
  Card,
  Input,
  Button,
  Descriptions,
  Typography,
  message,
  Modal,
  Row,
  Col,
  Statistic,
  Alert,
  Tag,
  Table,
} from "antd";
import {
  SearchOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { customersAPI, paymentsAPI, auctionsAPI } from "../services/api";
import dayjs from "dayjs";
import "./css/Auction.css";

const { Text } = Typography;

const Auction = () => {
  const [fundNumber, setFundNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [duesData, setDuesData] = useState([]);
  const [auctionsHistory, setAuctionsHistory] = useState([]);
  const [transactionId, setTransactionId] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const handleSearch = async () => {
    if (!fundNumber) {
      message.warning("Please enter a Fund Number");
      return;
    }

    setLoading(true);
    setCustomerData(null);
    setDuesData([]);

    try {
      // 1. Get Customer & Scheme Basic Info
      const custRes = await customersAPI.getByFundNumber(fundNumber);
      const customer = custRes.data.data;

      if (!customer) {
        message.error("Fund Number not found");
        return;
      }

      const resolvedFundNumber = customer.Fund_Number;

      setCustomerData({
        ...customer,
        Scheme_ID: customer.Scheme_ID,
        Scheme_Name: customer.Scheme_Name,
        Fund_Number: resolvedFundNumber,
      });

      // Auto-generate a unique ID for the bulk payment
      setTransactionId(
        `PAY-BULK-${dayjs().format("YYYYMMDD")}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      );

      // 3. Get Dues Info (to calculate pending amount) using resolved full fund number
      const duesRes = await paymentsAPI.getDues(resolvedFundNumber);
      setDuesData(duesRes.data.data || []);

      // 4. Get Auction History
      const auctionsRes = await auctionsAPI.getByMembership(
        customer.Membership_ID,
      );
      setAuctionsHistory(auctionsRes.data.data || []);
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.error || "Fund Number not found");
    } finally {
      setLoading(false);
    }
  };

  const calculatePendingAmount = () => {
    if (!duesData.length) return 0;
    return duesData.reduce((acc, due) => {
      const pending = due.Due_amount - (due.Recd_amount || 0);
      return acc + (pending > 0 ? pending : 0);
    }, 0);
  };

  const handlePayAll = () => {
    const pendingAmount = calculatePendingAmount();
    if (pendingAmount <= 0) {
      message.info("No pending dues to pay.");
      return;
    }

    Modal.confirm({
      title: "Confirm Bulk Payment",
      content: (
        <div>
          <p>Are you sure you want to pay off all remaining dues?</p>
          <p>
            <strong>Total Amount: ₹{pendingAmount}</strong>
          </p>
          <p>This will mark all pending dues as PAID.</p>
        </div>
      ),
      okText: "Pay All & Close",
      okType: "primary",
      onOk: async () => {
        setPayLoading(true);
        try {
          const response = await paymentsAPI.payAll({
            fundNumber,
            Payment_Transaction_ID: transactionId,
          });

          Modal.success({
            title: "Payment Successful",
            content: (
              <div>
                <p>{response.data.message}</p>
                <p>
                  Transaction ID:{" "}
                  <Text copyable>{response.data.transactionId}</Text>
                </p>
              </div>
            ),
          });

          // Refresh data
          handleSearch();
        } catch (error) {
          console.error(error);
          message.error(
            "Payment failed: " + (error.response?.data?.error || error.message),
          );
        } finally {
          setPayLoading(false);
        }
      },
    });
  };

  const pendingTotal = calculatePendingAmount();

  return (
    <div className="page-container">
      <div className="page-header-row">
        <h2 className="page-title">Auction & Bulk Payment</h2>
      </div>

      <Card className="auction-search-card" style={{ marginBottom: 24 }}>
        <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 14 }}>
          Enter Fund Number to begin
        </Text>
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <Input
            placeholder="e.g. 2024_12_1234"
            size="large"
            value={fundNumber}
            onChange={(e) => setFundNumber(e.target.value)}
            onPressEnter={handleSearch}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            size="large"
            onClick={handleSearch}
            loading={loading}
            className="ant-input-search-button"
            style={{ flexShrink: 0 }}
          >
            Search
          </Button>
        </div>
      </Card>

      {customerData && (
        <Card
          className="details-section auction-customer-card"
          title="Customer & Scheme Details"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Customer Name">
                  <b>{customerData.Name}</b>
                </Descriptions.Item>
                <Descriptions.Item label="Customer ID">
                  {customerData.Customer_ID}
                </Descriptions.Item>
                <Descriptions.Item label="Phone Number">
                  {customerData.Phone_Number}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col xs={24} md={12}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Scheme Name">
                  {customerData.Scheme_Name}
                </Descriptions.Item>
                <Descriptions.Item label="Scheme ID">
                  {customerData.Scheme_ID}
                </Descriptions.Item>
                <Descriptions.Item label="Fund Number">
                  <Tag color="blue">{customerData.Fund_Number}</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>

          <div className="action-footer">
            {pendingTotal > 0 ? (
              <Row align="middle" justify="end" gutter={16}>
                <Col>
                  <div className="auction-stat-item">
                    <Statistic
                      title="Total Pending Dues"
                      value={pendingTotal}
                      prefix="₹"
                      valueStyle={{ color: "#cf1322" }}
                    />
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Input
                    placeholder="Payment Transaction ID"
                    value={transactionId}
                    readOnly
                    style={{ marginBottom: 16 }}
                  />
                  <Button
                    type="primary"
                    danger
                    size="large"
                    icon={<DollarOutlined />}
                    loading={payLoading}
                    onClick={handlePayAll}
                    style={{ width: "100%" }}
                  >
                    Pay All Remaining
                  </Button>
                </Col>
              </Row>
            ) : (
              <Alert
                message="All dues are paid for this customer."
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            )}
          </div>
        </Card>
      )}

      {customerData && auctionsHistory.length > 0 && (
        <Card title="Auction History" style={{ marginTop: 24 }}>
          <Table
            dataSource={auctionsHistory}
            rowKey="Auction_ID"
            pagination={false}
            columns={[
              {
                title: "Auction ID",
                dataIndex: "Auction_ID",
                key: "Auction_ID",
                width: 100,
              },
              {
                title: "Auction Date",
                dataIndex: "Auction_date",
                key: "Auction_date",
                render: (date) =>
                  date ? dayjs(date).format("DD-MM-YYYY") : "-",
              },
              {
                title: "Discount Amount",
                dataIndex: "Discount_amount",
                key: "Discount_amount",
                render: (amt) => `₹${parseFloat(amt).toLocaleString()}`,
              },
              {
                title: "Transaction ID / Ref",
                dataIndex: "Auction_Transaction_ID",
                key: "Auction_Transaction_ID",
                render: (txId) => txId || "-",
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

export default Auction;
