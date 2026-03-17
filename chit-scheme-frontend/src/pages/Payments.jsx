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
  Tooltip,
} from "antd";
import { LeftOutlined, RightOutlined, DownloadOutlined } from "@ant-design/icons";
import { customersAPI, paymentsAPI, schemesAPI } from "../services/api";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
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
  const [fundSearchValue, setFundSearchValue] = useState("");
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm] = Form.useForm();
  const [currentSchemeIndex, setCurrentSchemeIndex] = useState(0);
  // Global list of ALL fund numbers across all customers, sorted
  const [allFundNumbers, setAllFundNumbers] = useState([]); // [{Fund_Number, Customer_ID}]
  const [globalFundIndex, setGlobalFundIndex] = useState(-1);

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

    // Also fetch all fund numbers globally for prev/next navigation
    const fetchAllFunds = async () => {
      try {
        const res = await schemesAPI.getMembers({ limit: 5000 });
        const members = res.data.data?.members || res.data?.members || [];
        // Sort by fund number string naturally
        const sorted = members
          .filter((m) => m.Fund_Number && m.Customer_ID)
          .map((m) => ({
            Fund_Number: m.Fund_Number,
            Customer_ID: m.Customer_ID,
          }))
          .sort((a, b) =>
            a.Fund_Number.localeCompare(b.Fund_Number, undefined, {
              numeric: true,
            }),
          );
        setAllFundNumbers(sorted);
      } catch (err) {
        console.error("Failed to load all fund numbers for navigation", err);
      }
    };
    fetchAllFunds();
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
      setCurrentSchemeIndex(0); // Reset navigation index on customer change

      // Auto-select active scheme if only one exists (or select the first one)
      if (schemesList.length > 0) {
        const activeScheme = schemesList[0]; // Logic: Pick first
        setSelectedScheme(activeScheme.Scheme_ID);
        setSelectedFundNumber(activeScheme.Fund_Number);
        fetchDues(activeScheme.Fund_Number);
        form.setFieldsValue({ schemeId: activeScheme.Scheme_ID });
        // Sync global index
        const gi = allFundNumbers.findIndex(
          (f) => f.Fund_Number === activeScheme.Fund_Number,
        );
        setGlobalFundIndex(gi);
      }
    } catch (error) {
      console.error("Error fetching customer schemes:", error);
      message.error("Failed to load customer schemes.");
    }
  };

  // Handle scheme selection
  const handleSchemeSelect = async (schemeId, option) => {
    setSelectedScheme(schemeId);
    const idx = schemes.findIndex((s) => s.Scheme_ID === schemeId);
    if (idx !== -1) setCurrentSchemeIndex(idx);
    const scheme = schemes.find((s) => s.Scheme_ID === schemeId);
    if (scheme) {
      setSelectedFundNumber(scheme.Fund_Number);
      fetchDues(scheme.Fund_Number);
      // Sync global index
      const gi = allFundNumbers.findIndex(
        (f) => f.Fund_Number === scheme.Fund_Number,
      );
      setGlobalFundIndex(gi);
    }
  };

  // Navigate to prev or next fund number (GLOBAL — across all customers)
  const handleNavigateFund = async (direction) => {
    const newIndex = globalFundIndex + direction;
    if (newIndex < 0 || newIndex >= allFundNumbers.length) return;
    const target = allFundNumbers[newIndex];
    setGlobalFundIndex(newIndex);
    setFundSearchValue(target.Fund_Number);

    try {
      // Load the customer for this fund number
      const response = await customersAPI.getByFundNumber(target.Fund_Number);
      const customer = response.data.data || response.data;
      if (!customer) return;

      // Select the customer (loads their schemes)
      setSelectedCustomer(customer.Customer_ID);
      setSelectedScheme(null);
      setDues([]);
      form.resetFields([
        "schemeId",
        "dueNumber",
        "amount",
        "transactionId",
        "date",
      ]);

      const schemesResponse = await customersAPI.getSchemes(
        customer.Customer_ID,
      );
      const schemesList =
        schemesResponse.data.data || schemesResponse.data || [];
      setSchemes(schemesList);

      const matchingScheme = schemesList.find(
        (s) => s.Fund_Number === target.Fund_Number,
      );
      if (matchingScheme) {
        const idx = schemesList.indexOf(matchingScheme);
        setCurrentSchemeIndex(idx);
        setSelectedScheme(matchingScheme.Scheme_ID);
        setSelectedFundNumber(matchingScheme.Fund_Number);
        fetchDues(matchingScheme.Fund_Number);
        form.setFieldsValue({ schemeId: matchingScheme.Scheme_ID });
      }
    } catch (err) {
      console.error("Navigation error:", err);
      message.error("Failed to navigate to fund number.");
    }
  };

  const fetchDues = async (fundNumber) => {
    setLoading(true);
    try {
      const response = await paymentsAPI.getDues(fundNumber);
      const raw = response.data.data || response.data || [];
      const sorted = [...raw].sort(
        (a, b) => parseInt(a.Due_number) - parseInt(b.Due_number),
      );
      setDues(sorted);
    } catch (error) {
      console.error("Error fetching dues:", error);
      message.error("Failed to load dues.");
    } finally {
      setLoading(false);
    }
  };

  const generateReferenceId = async () => {
    try {
      const refRes = await paymentsAPI.getNextReferenceId();
      return refRes.data.data?.referenceId || refRes.data?.referenceId;
    } catch (err) {
      console.warn(
        "Backend sequence API failed, calculating sequence locally via getAll():",
      );
      try {
        const allPayRes = await paymentsAPI.getAll();
        const allPayments =
          allPayRes.data.data?.payments ||
          allPayRes.data?.payments ||
          allPayRes.data.data ||
          allPayRes.data ||
          [];
        const paymentsArray = Array.isArray(allPayments) ? allPayments : [];
        const prefix = `${dayjs().year()}/`;
        let maxSeq = 0;
        paymentsArray.forEach((p) => {
          const id = p.Payment_Transaction_ID || p.Transaction_ID;
          if (id && id.startsWith(prefix)) {
            const num = parseInt(id.split("/")[1], 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          }
        });
        return `${prefix}${String(maxSeq + 1).padStart(5, "0")}`;
      } catch (fallbackErr) {
        console.error(
          "Both primary and fallback sequence generation failed",
          fallbackErr,
        );
        return `${dayjs().year()}/${String(Date.now()).slice(-5).padStart(5, "0")}`;
      }
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
      // Sort by due number ascending
      const sorted = [...historyArr].sort(
        (a, b) => parseInt(a.Due_number) - parseInt(b.Due_number),
      );
      setPaymentHistory(sorted);
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
      message.error("Failed to fetch payment history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/jpeg");
        resolve(dataURL);
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  };

  const downloadHistoryPDF = async () => {
    if (!paymentHistory || paymentHistory.length === 0) {
      message.warning("No payment history to download.");
      return;
    }

    const cust = allCustomers.find((c) => c.Customer_ID === selectedCustomer);
    const scheme = schemes.find((s) => s.Scheme_ID === selectedScheme);

    const doc = new jsPDF();

    // Add Logo
    try {
      const logoData = await getBase64ImageFromURL("/logo.jpeg");
      doc.addImage(logoData, "JPEG", 15, 10, 25, 25);
    } catch (err) {
      console.error("Failed to load logo for PDF:", err);
    }

    // Set header
    doc.setFontSize(18);
    doc.setTextColor(180, 0, 0); // Reddish color for header
    doc.text("VASANTHAM CRACKERS FUND SCHEME", 105, 18, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("SATHUR ROAD, Sivakasi - 626 189.", 105, 22, { align: "center" });
    doc.text("Cell: 95855 93485, 98439 82100, 97897 80866, 90927 80866", 105, 27, {
      align: "center",
    });

    // Draw lines
    doc.setDrawColor(180, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(10, 32, 200, 32);

    // Customer Info Section
    doc.setFontSize(12);
    doc.text(`Fund No: ${selectedFundNumber}`, 15, 42);
    doc.text(`Date: ${dayjs().format("DD/MM/YYYY")}`, 150, 42);

    doc.text(`Customer Name: ${cust?.Name || "-"}`, 15, 52);
    doc.text(`Customer ID: ${cust?.Customer_ID || "-"}`, 15, 62);
    doc.text(`Phone: ${cust?.Phone_Number || "-"}`, 15, 72);

    if (scheme) {
      doc.text(`Scheme: ${scheme.Scheme_Name || "-"}`, 15, 82);
    }

    // Table Header
    const tableColumn = ["Month/Due", "Date", "Paid Amount", "Ref No"];
    const tableRows = [];

    paymentHistory.forEach((p) => {
      const rowData = [
        p.Due_number,
        dayjs(p.Amount_Received_date).format("DD/MM/YYYY"),
        `INR ${p.Amount_Received}`,
        p.Payment_Transaction_ID || p.Transaction_ID || "-",
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      startY: 92,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [180, 0, 0], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: "auto" },
      },
    });

    // Total
    const totalPaid = paymentHistory.reduce(
      (sum, p) => sum + parseFloat(p.Amount_Received || 0),
      0,
    );
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`Total Amount Paid: INR ${totalPaid.toFixed(2)}`, 15, finalY);

    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(
      "Note: Please pay the monthly subscription before the 10th of every month.",
      15,
      finalY + 10,
    );

    doc.save(`Passbook_${selectedFundNumber}.pdf`);
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

    // Fetch sequential Payment_Transaction_ID
    const generatedRefId = await generateReferenceId();
    const txIdToUse = pendingPaymentValues.transactionId || generatedRefId;

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
    {
      title: "Due",
      dataIndex: "Due_number",
      key: "Due_number",
      width: "10%",
    },
    {
      title: "Due Date",
      dataIndex: "Due_date",
      key: "Due_date",
      width: "16%",
      render: (text) => (text ? dayjs(text).format("DD-MM-YYYY") : "N/A"),
    },
    {
      title: "Due Amt",
      dataIndex: "Due_amount",
      key: "Due_amount",
      width: "16%",
      render: (val) => `₹${val}`,
    },
    {
      title: "Recd Amt",
      dataIndex: "Recd_amount",
      key: "Recd_amount",
      width: "16%",
      render: (val) => (
        <Text type={val >= 0 ? "success" : "warning"}>₹{val || 0}</Text>
      ),
    },
    {
      title: "Recd Date",
      dataIndex: "amt_received_date",
      key: "amt_received_date",
      width: "16%",
      render: (text) => (text ? dayjs(text).format("DD-MM-YYYY") : "-"),
    },
    {
      title: "Status",
      key: "status",
      width: "12%",
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
      width: "12%",
      render: (_, record) => {
        const due = parseFloat(record.Due_amount || 0);
        const recd = parseFloat(record.Recd_amount || 0);

        return (
          <div style={{ display: "flex", gap: "8px" }}>
            {recd < due && record.Due_number === firstUnpaidDueNumber && (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={async () => {
                  // Fetch sequential Payment_Transaction_ID
                  const refId = await generateReferenceId();
                  form.setFieldsValue({
                    dueNumber: record.Due_number,
                    amount: due - recd,
                    date: dayjs(),
                    paymentMode: "UPI",
                    transactionId: refId,
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
    { title: "Due", dataIndex: "Due_number", width: 80 },
    { title: "Amount", dataIndex: "Amount_Received", render: (v) => `₹${v}` },
    { title: "Mode", dataIndex: "Payment_Mode" },
    {
      title: "Payment_Transaction_ID",
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
    <div className="page-container">
      <Title level={2}>Payment Management</Title>

      <Row gutter={24}>
        <Col xs={24} md={8}>
          <Card title="Select Customer & Scheme" className="payment-form-card">
            <Form form={form} layout="vertical">
              {/* NEW: Search by Fund Number */}
              <Form.Item label="Search by Fund Number">
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <Input
                    placeholder="e.g. 2024_12_1234"
                    value={fundSearchValue}
                    onChange={(e) => setFundSearchValue(e.target.value)}
                    onPressEnter={async () => {
                      const value = fundSearchValue;
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
                          schemesResponse.data.data ||
                          schemesResponse.data ||
                          [];
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
                            // Sync global nav index
                            const gi = allFundNumbers.findIndex(
                              (f) =>
                                f.Fund_Number === matchingScheme.Fund_Number,
                            );
                            setGlobalFundIndex(gi);
                            message.success(`Found: ${resolvedFundNumber}`);
                          }, 500);
                        }
                      } catch (error) {
                        console.error("Fund Search Error:", error);
                        message.error("Fund Number not found.");
                      }
                    }}
                  />
                  <Button
                    type="primary"
                    className="ant-input-search-button"
                    onClick={async () => {
                      const value = fundSearchValue;
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
                          schemesResponse.data.data ||
                          schemesResponse.data ||
                          [];
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
                  >
                    Search
                  </Button>
                </div>
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
            className="payment-form-card"
            title={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "nowrap",
                  overflow: "hidden",
                }}
              >
                <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                  Scheme Dues
                </span>
                {selectedFundNumber && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      flexWrap: "nowrap",
                      overflowX: "hidden",
                    }}
                  >
                    <Tooltip title="Previous Fund">
                      <Button
                        icon={<LeftOutlined />}
                        size="small"
                        disabled={globalFundIndex <= 0}
                        onClick={() => handleNavigateFund(-1)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                        }}
                      />
                    </Tooltip>
                    <Tag
                      color="blue"
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        padding: "0 4px",
                      }}
                    >
                      {selectedFundNumber}
                      {allFundNumbers.length > 1 && globalFundIndex >= 0 && (
                        <span
                          style={{
                            fontWeight: 400,
                            marginLeft: 4,
                            opacity: 0.7,
                          }}
                        >
                          ({globalFundIndex + 1}/{allFundNumbers.length})
                        </span>
                      )}
                    </Tag>
                    {selectedCustomer &&
                      (() => {
                        const cust = allCustomers.find(
                          (c) => c.Customer_ID === selectedCustomer,
                        );
                        return cust ? (
                          <Text
                            strong
                            style={{
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "100px",
                              margin: "0 2px",
                            }}
                          >
                            {cust.Name}
                          </Text>
                        ) : null;
                      })()}
                    <Tooltip title="Next Fund">
                      <Button
                        icon={<RightOutlined />}
                        size="small"
                        disabled={globalFundIndex >= allFundNumbers.length - 1}
                        onClick={() => handleNavigateFund(1)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                        }}
                      />
                    </Tooltip>
                    <Button
                      size="small"
                      type="default"
                      style={{ marginLeft: 4, flexShrink: 0 }}
                      onClick={() => {
                        setHistoryModalVisible(true);
                        fetchPaymentHistory();
                      }}
                    >
                      History
                    </Button>
                  </div>
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
              scroll={{ y: 500 }}
              style={{ width: "100%" }}
            />
          </Card>
        </Col>
      </Row>
      <Modal
        title="Confirm Payment"
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        zIndex={1200}
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
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginRight: 24,
            }}
          >
            <span>{`Payment History - ${selectedFundNumber}${selectedCustomer ? ` · ${allCustomers.find((c) => c.Customer_ID === selectedCustomer)?.Name || ""}` : ""}`}</span>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={downloadHistoryPDF}
              size="small"
            >
              Download PDF
            </Button>
          </div>
        }
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
        title="Received Payment"
        open={payModalVisible}
        onCancel={() => setPayModalVisible(false)}
        footer={null}
        destroyOnHidden={true}
        style={{ top: 20 }}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} size="small">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="dueNumber"
                label="Due Number"
                rules={[{ required: true }]}
                style={{ marginBottom: 8 }}
              >
                <Input readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount Received"
                rules={[{ required: true }]}
                style={{ marginBottom: 8 }}
              >
                <Input type="number" prefix="₹" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="paymentMode"
                label="Payment Mode"
                rules={[{ required: true, message: "Select payment mode" }]}
                initialValue="UPI"
                style={{ marginBottom: 8 }}
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
            </Col>
            <Col span={12}>
              {paymentMode === "UPI" ? (
                <Form.Item
                  name="upiPhone"
                  label="UPI Phone"
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Enter UPI Phone" maxLength={10} />
                </Form.Item>
              ) : (
                <Form.Item
                  name="date"
                  label="Payment Date"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 8 }}
                >
                  <DatePicker format="DD-MM-YYYY" style={{ width: "100%" }} />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={paymentMode === "UPI" ? 12 : 24}>
              <Form.Item
                name="transactionId"
                label="Payment_Transaction_ID"
                style={{ marginBottom: 8 }}
              >
                <Input readOnly placeholder="Autogenerated (YYYY/NNNNN)" />
              </Form.Item>
            </Col>
            {paymentMode === "UPI" && (
              <Col span={12}>
                <Form.Item
                  name="date"
                  label="Payment Date"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 8 }}
                >
                  <DatePicker
                    format="DD-MM-YYYY"
                    style={{ width: "100%" }}
                    onFocus={(e) => e.target.select()}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={paymentLoading}
            style={{ marginTop: 4 }}
          >
            Received Payment
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Payments;
