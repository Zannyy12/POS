import React, { useEffect, useState, useRef, useCallback } from 'react';
import { axios } from '../../store/useAuthStore';
import useAuthStore from '../../store/useAuthStore';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Check, X, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import PaymentModal from '../../components/PaymentModal';

// Number to words utility function
const numberToWords = (num) => {
  const val = Math.round(parseFloat(num || 0));
  if (val === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  const convertThreeDigits = (n) => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  };

  let word = '';
  let scaleIndex = 0;
  let integerPart = val;

  while (integerPart > 0) {
    const chunk = integerPart % 1000;
    if (chunk > 0) {
      word = convertThreeDigits(chunk) + ' ' + scales[scaleIndex] + ' ' + word;
    }
    integerPart = Math.floor(integerPart / 1000);
    scaleIndex++;
  }

  return word.trim().replace(/\s+/g, ' ') + ' Only.';
};

// Calculate Sq.ft dimensions helper
const calculateSqft = (w, l, qty, uom) => {
  const width = parseFloat(w) || 0;
  const length = parseFloat(l) || 0;
  const pieces = parseFloat(qty) || 0;
  if (width <= 0 || length <= 0 || pieces <= 0) return 0;
  
  if (uom === 'cm') {
    const wIn = width / 2.54;
    const lIn = length / 2.54;
    return parseFloat(((wIn * lIn * pieces) / 144).toFixed(4));
  } else {
    return parseFloat(((width * length * pieces) / 144).toFixed(4));
  }
};

// Redesigned printable Customer Order Slip
const ReceiptPrintTemplate = React.forwardRef(({ order, items, customer, cashier, settings }, ref) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
  };
  
  const formatInteger = (val) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(val || 0));
  };

  if (!order) return null;

  // Compute summary values
  const grossAmountTotal = items.reduce((sum, item) => sum + (parseFloat(item.unit_price) * parseFloat(item.quantity)), 0);
  const itemsDiscountTotal = items.reduce((sum, item) => sum + (parseFloat(item.discount || 0) * parseFloat(item.quantity)), 0);
  const invoiceDiscount = parseFloat(order.discount || 0);
  const totalDiscount = itemsDiscountTotal + invoiceDiscount;
  const netTotal = order.total || order.total_price || (grossAmountTotal - totalDiscount);
  const balanceDue = order.change < 0 ? Math.abs(order.change) : parseFloat(order.balance_due || 0);
  
  // Format dates
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString();
  const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toLocaleString() : 'N/A';

  return (
    <div ref={ref} className="customer-order-print-container">
      <div className="invoice-border-box">
        {/* Header Block */}
        <div className="invoice-print-header">
          {/* Top-left: Shop Logo Placeholder */}
          <div className="header-logo-container">
            {settings?.shop_logo ? (
              <img src={settings.shop_logo} alt="Shop Logo" style={{ maxHeight: '75px', maxWidth: '150px' }} />
            ) : (
              <svg width="70" height="70" viewBox="0 0 100 100" style={{ border: '1px solid #000' }}>
                <rect width="100" height="100" fill="#f8fafc" />
                <polygon points="15,25 85,25 75,75 25,75" fill="none" stroke="#000" strokeWidth="3" />
                <line x1="40" y1="25" x2="40" y2="75" stroke="#000" strokeWidth="1" strokeDasharray="3" />
                <line x1="60" y1="25" x2="60" y2="75" stroke="#000" strokeWidth="1" strokeDasharray="3" />
                <line x1="25" y1="50" x2="75" y2="50" stroke="#000" strokeWidth="1" strokeDasharray="3" />
                <text x="50" y="90" fontSize="10" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="bold">STONE</text>
              </svg>
            )}
          </div>

          {/* Top-right: Rebranding from settings */}
          <div className="header-brand-container">
            <h1 className="brand-shop-name">{settings?.shop_name || 'Khuzdar Marble & Granite'}</h1>
            <p className="brand-status">{settings?.dealer_under || 'Authorized Stone Dealer'}</p>
            <p className="brand-parent-company">{settings?.parent_company || 'Zannny Parent Stones Ltd.'}</p>
          </div>
        </div>

        {/* Centered large bold red title */}
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <h2 className="invoice-large-title">CUSTOMER ORDER</h2>
        </div>

        {/* Three-column info bar */}
        <div className="info-bar-container">
          {/* Column 1: Order Information */}
          <div className="info-bar-col">
            <h4 className="info-col-title">Order Information</h4>
            <div className="info-col-content">
              <p><strong>Order #:</strong> {order.orderId || order.id || 'NEW'}</p>
              <p><strong>Order Date:</strong> {orderDate}</p>
              <p><strong>Communicate Type:</strong> {order.communicate_type || order.communicateType || 'Walk-in'}</p>
              <p><strong>Sale Person:</strong> {order.sale_person || order.salePerson || cashier || 'Admin'}</p>
            </div>
          </div>

          {/* Column 2: Customer Information */}
          <div className="info-bar-col">
            <h4 className="info-col-title">Customer Information</h4>
            <div className="info-col-content">
              <p><strong>Name:</strong> {customer?.name || 'Walk-in Customer'} {customer?.id ? `(${customer.id})` : ''}</p>
              <p><strong>Contact #:</strong> {customer?.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Column 3: Delivery Information */}
          <div className="info-bar-col">
            <h4 className="info-col-title">Delivery Information</h4>
            <div className="info-col-content">
              <p><strong>Date & time:</strong> {deliveryDate}</p>
              <p><strong>Delivery Type:</strong> {order.delivery_type || order.deliveryType || 'Pick-Up'}</p>
              <p><strong>Remarks:</strong> {order.remarks || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Product Demand table */}
        <div className="table-print-section">
          <h3 className="section-table-title">Product Demand</h3>
          <table className="print-data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No#</th>
                <th>Barcode</th>
                <th>Item Name</th>
                <th style={{ textAlign: 'right' }}>QTY (Sq.ft)</th>
                <th>UOM</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Gross Amount</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const qty = parseFloat(item.quantity || 0);
                const rate = parseFloat(item.unit_price || 0);
                const disc = parseFloat(item.discount || 0);
                const gross = qty * rate;
                const amt = gross - (disc * qty);
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{item.barcode || 'N/A'}</td>
                    <td style={{ fontWeight: 'bold' }}>{item.name || item.product_name}</td>
                    <td style={{ textAlign: 'right' }}>{qty.toFixed(4)}</td>
                    <td>Sq.ft</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(rate)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gross)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(disc * qty)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(amt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Customer Demand / Billing / Wastage table (cutting lists) */}
        {items.filter(item => item.cutting_list && item.cutting_list.length > 0).map((item, idx) => {
          // Compute totals for this cutting list
          const totalDemandQty = item.cutting_list.reduce((sum, cl) => sum + (parseFloat(cl.demand_qty) || 0), 0);
          const totalDemandSqft = item.cutting_list.reduce((sum, cl) => sum + (parseFloat(cl.demand_sqft) || 0), 0);
          const totalBillingQty = item.cutting_list.reduce((sum, cl) => sum + (parseFloat(cl.billing_qty) || 0), 0);
          const totalBillingSqft = item.cutting_list.reduce((sum, cl) => sum + (parseFloat(cl.billing_sqft) || 0), 0);
          const totalWastage = item.cutting_list.reduce((sum, cl) => sum + (parseFloat(cl.wastage_diff) || 0), 0);

          return (
            <div key={idx} className="table-print-section cutting-list-print-section">
              <h3 className="section-table-title">Cutting & Billing Details — {item.name || item.product_name}</h3>
              <table className="print-data-table cutting-list-table">
                <thead>
                  <tr className="header-grouped-row">
                    <th colSpan="6" style={{ background: '#f8fafc', borderBottom: '1px solid #000', textAlign: 'center' }}>Customer Demand</th>
                    <th colSpan="5" style={{ background: '#f1f5f9', borderBottom: '1px solid #000', textAlign: 'center' }}>Billing Dimensions</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle', textAlign: 'right' }}>Wastage (Sq.ft)</th>
                  </tr>
                  <tr>
                    <th style={{ width: '40px' }}>W</th>
                    <th style={{ width: '40px' }}>L</th>
                    <th style={{ width: '40px' }}>UOM</th>
                    <th style={{ width: '40px' }}>Pcs</th>
                    <th style={{ width: '70px' }}>Sq.ft</th>
                    <th>Description</th>
                    <th style={{ width: '40px' }}>W(In)</th>
                    <th style={{ width: '40px' }}>L(In)</th>
                    <th style={{ width: '40px' }}>UOM</th>
                    <th style={{ width: '40px' }}>Pcs</th>
                    <th style={{ width: '70px' }}>Sq.ft</th>
                  </tr>
                </thead>
                <tbody>
                  {item.cutting_list.map((cl, clIdx) => (
                    <tr key={clIdx}>
                      <td>{cl.demand_w}</td>
                      <td>{cl.demand_l}</td>
                      <td>{cl.demand_uom}</td>
                      <td>{cl.demand_qty}</td>
                      <td style={{ fontWeight: 'bold' }}>{cl.demand_sqft.toFixed(4)}</td>
                      <td style={{ fontSize: '10px' }}>{cl.demand_description || '-'}</td>
                      <td>{cl.billing_w}</td>
                      <td>{cl.billing_l}</td>
                      <td>{cl.billing_uom}</td>
                      <td>{cl.billing_qty}</td>
                      <td style={{ fontWeight: 'bold' }}>{cl.billing_sqft.toFixed(4)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: cl.wastage_diff > 0 ? '#b91c1c' : 'black' }}>
                        {cl.wastage_diff !== 0 ? cl.wastage_diff.toFixed(4) : '-'}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="totals-row">
                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total Demand:</td>
                    <td style={{ fontWeight: 'bold' }}>{totalDemandQty}</td>
                    <td style={{ fontWeight: 'bold' }}>{totalDemandSqft.toFixed(4)}</td>
                    <td></td>
                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total Billed:</td>
                    <td style={{ fontWeight: 'bold' }}>{totalBillingQty}</td>
                    <td style={{ fontWeight: 'bold' }}>{totalBillingSqft.toFixed(4)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {totalWastage !== 0 ? totalWastage.toFixed(4) : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Bottom Section: Words Box & Payment Info Box */}
        <div className="bottom-invoice-layout">
          {/* Bottom-left: "In Words" box */}
          <div className="words-in-words-box">
            <span className="words-label">In Words:</span>
            <span className="words-value">{numberToWords(netTotal)}</span>
          </div>

          {/* Bottom-right: Payment Information box */}
          <div className="payment-info-print-box">
            <table className="payment-info-print-table">
              <tbody>
                <tr>
                  <td>Gross Amount:</td>
                  <td style={{ textAlign: 'right' }}>{formatInteger(grossAmountTotal)}</td>
                </tr>
                {itemsDiscountTotal > 0 && (
                  <tr>
                    <td>Item Discount:</td>
                    <td style={{ textAlign: 'right' }}>{formatInteger(itemsDiscountTotal)}</td>
                  </tr>
                )}
                {invoiceDiscount > 0 && (
                  <tr>
                    <td>Flat Discount:</td>
                    <td style={{ textAlign: 'right' }}>{formatInteger(invoiceDiscount)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Total Amount:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatInteger(netTotal)}</td>
                </tr>
                <tr className="balance-underlined-row">
                  <td style={{ fontWeight: 'bold', borderBottom: '2px solid #000' }}>Balance Due:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', borderBottom: '2px solid #000' }}>{formatInteger(balanceDue)}</td>
                </tr>
                <tr style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  <td>Ledger Bal.:</td>
                  <td style={{ textAlign: 'right' }}>{formatInteger(customer?.current_customer_balance || customer?.balance || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .customer-order-print-container {
          width: 210mm;
          min-height: 297mm;
          padding: 10px;
          background: white;
          color: black;
          font-family: 'Inter', sans-serif;
          box-sizing: border-box;
          margin: 0 auto;
          box-shadow: var(--shadow-md);
        }

        .invoice-border-box {
          border: 2px solid #000;
          padding: 18px;
          min-height: 275mm;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .invoice-print-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #000;
          padding-bottom: 12px;
        }

        .header-logo-container {
          flex: 1;
        }

        .header-brand-container {
          flex: 2;
          text-align: right;
        }

        .brand-shop-name {
          color: #16a34a;
          font-size: 24px;
          font-weight: 800;
          margin: 0;
          letter-spacing: 0.5px;
        }

        .brand-status {
          font-size: 11px;
          color: #000;
          margin: 2px 0 0 0;
          text-transform: uppercase;
          font-weight: 500;
        }

        .brand-parent-company {
          font-size: 14px;
          font-weight: 700;
          color: #000;
          margin: 4px 0 0 0;
        }

        .invoice-large-title {
          color: #dc2626;
          font-size: 26px;
          font-weight: 800;
          margin: 0;
          letter-spacing: 1px;
        }

        .info-bar-container {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #000;
        }

        .info-bar-col {
          display: flex;
          flex-direction: column;
        }

        .info-col-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 6px 0;
          padding-bottom: 2px;
          border-bottom: 2px solid #000;
          width: fit-content;
        }

        .info-col-content p {
          margin: 3px 0;
          font-size: 11px;
          line-height: 1.4;
        }

        .table-print-section {
          margin-bottom: 20px;
        }

        .section-table-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 6px 0;
          color: #000;
        }

        .print-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .print-data-table th, .print-data-table td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }

        .print-data-table th {
          background-color: #f8fafc;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
        }

        .cutting-list-table th, .cutting-list-table td {
          padding: 4px;
          font-size: 10px;
          text-align: center;
        }

        .header-grouped-row th {
          font-size: 11px;
          font-weight: 800;
          padding: 6px;
        }

        .totals-row td {
          font-weight: bold;
          background-color: #f8fafc;
          border-top: 2px solid #000;
        }

        .bottom-invoice-layout {
          display: flex;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 20px;
          gap: 20px;
        }

        .words-in-words-box {
          border: 1px solid #000;
          padding: 10px;
          flex: 1.2;
          height: fit-content;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: #fafafa;
        }

        .words-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #fff;
          background-color: #000;
          padding: 2px 6px;
          width: fit-content;
        }

        .words-value {
          font-size: 13px;
          font-weight: 600;
          font-style: italic;
        }

        .payment-info-print-box {
          flex: 1;
          display: flex;
          justify-content: flex-end;
        }

        .payment-info-print-table {
          width: 100%;
          max-width: 320px;
          font-size: 12px;
          line-height: 1.8;
        }

        .payment-info-print-table td {
          padding: 2px 6px;
        }

        .payment-info-print-table td:last-child {
          text-align: right;
          font-weight: 600;
        }

        .balance-underlined-row td {
          border-bottom: 1.5px solid #000;
          padding-bottom: 4px;
          margin-bottom: 4px;
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0;
            padding: 0;
          }
          .customer-order-print-container {
            width: 100%;
            height: 100%;
            padding: 0;
          }
          .invoice-border-box {
            border: 2px solid #000 !important;
            min-height: 285mm;
          }
        }
      `}</style>
    </div>
  );
});

const Invoice = () => {
  const [customers, setCustomers] = useState([]);

  // Cart & Invoice states
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState('0.00');
  const [amountPaid, setAmountPaid] = useState('0.00');
  const [checkoutLocation, setCheckoutLocation] = useState('Shop');

  const [communicateType, setCommunicateType] = useState('Walk-in');
  const [deliveryType, setDeliveryType] = useState('Pick-Up');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().substring(0, 16));
  const [remarks, setRemarks] = useState('');
  const [salePerson, setSalePerson] = useState('');
  const [editingCuttingListIdx, setEditingCuttingListIdx] = useState(null);

  const [settings, setSettings] = useState({
    shop_name: 'Khuzdar Marble & Granite',
    dealer_under: 'Authorized Stone Dealer',
    parent_company: 'Zannny Parent Stones Ltd.',
    shop_logo: ''
  });

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // Checkout Result for Receipt Modal
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const barcodeInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const printRef = useRef(null);
  // Debounce timer ref
  const debounceRef = useRef(null);

  const { addToast, user } = useAuthStore();

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const loadAllProducts = async () => {
    setDropdownLoading(true);
    try {
      const res = await axios.get('/api/pos/products');
      const raw = res.data;
      const list =
        Array.isArray(raw) ? raw :
          Array.isArray(raw?.products) ? raw.products :
            Array.isArray(raw?.data) ? raw.data :
              [];

      // Sort: in-stock first, then out-of-stock, then by name
      const sorted = list.sort((a, b) => {
        const aStock = a.quantity > 0;
        const bStock = b.quantity > 0;
        if (aStock && !bStock) return -1;
        if (!aStock && bStock) return 1;
        return a.name.localeCompare(b.name);
      });

      setAllProducts(sorted);
      setFilteredProducts(sorted);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setDropdownLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const custRes = await axios.get('/api/customers', { params: { limit: 100 } });
      setCustomers(custRes.data.data || []);

      // Default set Walk-in Customer
      const walkin = custRes.data.data?.find(c => c.name === 'Walk-in Customer');
      if (walkin) setSelectedCustomerId(walkin.id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data && Object.keys(res.data).length > 0) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    if (user?.name) {
      setSalePerson(user.name);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
    loadAllProducts();
    fetchSettings();
  }, []);

  // Click outside → close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        barcodeInputRef.current &&
        !barcodeInputRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search focus
  const handleSearchFocus = () => {
    setShowDropdown(true);
    if (!searchQuery) {
      setFilteredProducts(allProducts);
    }
  };

  // Handle typing in the search box
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowDropdown(true);

    if (!query.trim()) {
      setFilteredProducts(allProducts);
      return;
    }

    // Filter by name OR barcode — case insensitive
    const filtered = allProducts.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode?.toString().includes(query.trim())
    );

    setFilteredProducts(filtered);
  };

  // Handle Enter key and keyboard navigation
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.replace(/[^a-zA-Z0-9\-]/g, '').trim();
      if (!query) return;

      // Try exact barcode match first
      const exactMatch = allProducts.find(p =>
        p.barcode?.replace(/[^a-zA-Z0-9\-]/g, '').trim() === query
      );

      if (exactMatch) {
        handleProductSelect(exactMatch);
        return;
      }

      // If only one result → auto-select it
      if (filteredProducts.length === 1) {
        handleProductSelect(filteredProducts[0]);
        return;
      }

      addToast('No product matches this barcode', 'warning');
    }

    // Arrow key navigation in dropdown
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const firstItem = dropdownRef.current?.querySelector('.dropdown-item');
      firstItem?.focus();
    }

    // Escape closes dropdown
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setSearchQuery('');
    }
  };

  // When product is selected from dropdown
  const handleProductSelect = (product) => {
    // Close dropdown and clear search immediately
    setShowDropdown(false);
    setSearchQuery('');
    setFilteredProducts(allProducts);

    // Check if out of stock
    if (product.quantity <= 0) {
      addToast(`⚠️ "${product.name}" is out of stock`, 'warning');
      return;
    }

    // Add to cart
    addToCart(product);

    // Refocus search bar for next product
    setTimeout(() => {
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }, 50);
  };

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      addToast(`⚠️ "${product.name}" is out of stock`, 'warning');
      return;
    }

    // Check if product is already in cart
    const existingIdx = cart.findIndex(item => item.product_id === product.id && item.location === checkoutLocation);

    if (existingIdx > -1) {
      const nextCart = [...cart];
      if (nextCart[existingIdx].quantity + 1 > product.quantity) {
        addToast(`⚠️ Only ${product.quantity} units available`, 'warning');
        return;
      }
      nextCart[existingIdx].quantity += 1;
      setCart(nextCart);
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        barcode: product.barcode,
        quantity: 1.0000,
        unit_price: parseFloat(product.price),
        discount: parseFloat(product.discount || 0),
        location: checkoutLocation,
        cuttingList: []
      }]);
    }
    addToast(`✅ "${product.name}" added to cart`, 'success');
  };

  const updateCartQty = (idx, amount) => {
    const nextCart = [...cart];
    const newQty = nextCart[idx].quantity + amount;
    if (newQty <= 0) {
      nextCart.splice(idx, 1);
    } else {
      nextCart[idx].quantity = newQty;
    }
    setCart(nextCart);
  };

  const updateCartDiscount = (idx, value) => {
    const nextCart = [...cart];
    nextCart[idx].discount = parseFloat(value || 0);
    setCart(nextCart);
  };

  const removeFromCart = (idx) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    const nextCart = [...cart];
    const item = nextCart[editingCuttingListIdx];
    if (!item.cuttingList) item.cuttingList = [];
    item.cuttingList.push({
      demand_w: '',
      demand_l: '',
      demand_uom: 'in',
      demand_qty: '',
      demand_sqft: 0,
      demand_description: '',
      billing_w: '',
      billing_l: '',
      billing_uom: 'in',
      billing_qty: '',
      billing_sqft: 0,
      billing_detail: '',
      wastage_diff: 0
    });
    setCart(nextCart);
  };

  const updateRow = (rowIdx, field, val) => {
    const nextCart = [...cart];
    const row = nextCart[editingCuttingListIdx].cuttingList[rowIdx];
    
    row[field] = val;

    // Recalculate customer demand sqft if demand fields changed
    if (['demand_w', 'demand_l', 'demand_qty', 'demand_uom'].includes(field)) {
      row.demand_sqft = calculateSqft(row.demand_w, row.demand_l, row.demand_qty, row.demand_uom);
      
      // Auto-populate billing side
      if (field === 'demand_w') row.billing_w = row.demand_uom === 'cm' ? (parseFloat((val / 2.54).toFixed(2)) || '') : val;
      if (field === 'demand_l') row.billing_l = row.demand_uom === 'cm' ? (parseFloat((val / 2.54).toFixed(2)) || '') : val;
      if (field === 'demand_qty') row.billing_qty = val;
      if (field === 'demand_uom') {
        row.billing_uom = 'in';
        if (row.demand_w) row.billing_w = val === 'cm' ? (parseFloat((row.demand_w / 2.54).toFixed(2)) || '') : row.demand_w;
        if (row.demand_l) row.billing_l = val === 'cm' ? (parseFloat((row.demand_l / 2.54).toFixed(2)) || '') : row.demand_l;
      }
      
      row.billing_sqft = calculateSqft(row.billing_w, row.billing_l, row.billing_qty, 'in');
    }
    
    // Recalculate billing sqft if billing dimensions changed
    if (['billing_w', 'billing_l', 'billing_qty'].includes(field)) {
      row.billing_sqft = calculateSqft(row.billing_w, row.billing_l, row.billing_qty, 'in');
    }

    // Force parse billing_sqft if they override it manually
    if (field === 'billing_sqft') {
      row.billing_sqft = parseFloat(val) || 0;
    }

    // wastage diff
    row.wastage_diff = parseFloat((row.billing_sqft - row.demand_sqft).toFixed(4));
    
    // Update cart item quantity to sum of billing_sqft
    const totalSqft = nextCart[editingCuttingListIdx].cuttingList.reduce((sum, r) => sum + (parseFloat(r.billing_sqft) || 0), 0);
    nextCart[editingCuttingListIdx].quantity = parseFloat(totalSqft.toFixed(4)) || 1.0;

    setCart(nextCart);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + ((item.unit_price - item.discount) * item.quantity), 0);
  const discountVal = parseFloat(invoiceDiscount || 0);
  const netTotal = Math.max(0, subtotal - discountVal);
  const paidVal = parseFloat(amountPaid || 0);
  const balance = netTotal - paidVal; // Positive means debt, negative means change

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));
  const isWalkin = selectedCustomer?.name === 'Walk-in Customer';

  // Checkout submit - opens the payment modal
  const handleCheckout = () => {
    if (cart.length === 0) {
      addToast('Billing cart is empty', 'warning');
      return;
    }
    setPaymentModalOpen(true);
  };

  // Called on successful payment checkout from PaymentModal
  const handlePaymentSuccess = (paymentDetails) => {
    setPaymentModalOpen(false);

    // Prepare receipt template dataset
    setCheckoutResult({
      orderId: paymentDetails.orderId,
      subtotal: paymentDetails.subtotal,
      discount: paymentDetails.discount,
      total: paymentDetails.netTotal,
      amount_paid: paymentDetails.amountPaid,
      change: paymentDetails.amountPaid - paymentDetails.netTotal,
      balance_due: paymentDetails.balanceDue,
      items: paymentDetails.items,
      communicate_type: communicateType,
      delivery_type: deliveryType,
      delivery_date: deliveryDate,
      remarks: remarks,
      sale_person: salePerson,
      customer: selectedCustomer
    });

    addToast('Payment completed successfully', 'success');
    setReceiptOpen(true);

    // Reset Billing Panel
    setCart([]);
    setInvoiceDiscount('0.00');
    setAmountPaid('0.00');
    setCommunicateType('Walk-in');
    setDeliveryType('Pick-Up');
    setDeliveryDate(new Date().toISOString().substring(0, 16));
    setRemarks('');

    // Reset customer back to Walk-in & reload
    fetchInitialData();
  };

  // react-to-print setup
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  return (
    <div className="invoice-page">
      <div className="grid invoice-main-grid" style={{ gridTemplateColumns: '2.5fr 1fr', alignItems: 'stretch' }}>

        {/* Left billing cart panel */}
        <div className="glass-card flex-col" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>

          {/* Autocomplete Search input */}
          <div className="form-group search-container-box" style={{ position: 'relative', marginBottom: '20px' }}>
            <label className="form-label">Scan Barcode / Search Product</label>
            <div className="search-input-wrapper" style={{ position: 'relative' }}>
              <Search className="search-icon" size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: dropdownLoading ? 'var(--primary)' : 'var(--text-muted)', transition: 'color 0.2s' }} />
              <input
                ref={barcodeInputRef}
                type="text"
                className="form-input"
                style={{ paddingLeft: '44px', paddingRight: '44px', height: '48px', fontSize: '15px' }}
                placeholder="Scan barcode directly or type product name... [Press ENTER to quick-scan]"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onKeyDown={handleSearchKeyDown}
                autoFocus
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '16px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    zIndex: 5
                  }}
                  onClick={() => {
                    setSearchQuery('');
                    setFilteredProducts(allProducts);
                    if (barcodeInputRef.current) barcodeInputRef.current.focus();
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown — shows on focus */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="products-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '380px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}
              >
                {/* Dropdown Header */}
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--bg-sidebar)',
                  zIndex: 1,
                  textAlign: 'left'
                }}>
                  {dropdownLoading ? (
                    'Loading products...'
                  ) : searchQuery ? (
                    `Results for "${searchQuery}" (${filteredProducts.length})`
                  ) : (
                    `All Products (${filteredProducts.length})`
                  )}
                </div>

                {/* Loading State */}
                {dropdownLoading && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto 8px auto' }} />
                    <p style={{ fontSize: '13px' }}>Loading products...</p>
                  </div>
                )}

                {/* No Results */}
                {!dropdownLoading && filteredProducts.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                    <p style={{ fontWeight: '500' }}>
                      No products match "{searchQuery}"
                    </p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>
                      Try a different name or scan the barcode
                    </p>
                  </div>
                )}

                {/* Product List */}
                {!dropdownLoading && filteredProducts.map((product, index) => {
                  const inStock = product.quantity > 0;
                  const lowStock = product.quantity > 0 && product.quantity <= (product.quantity_limit || 5);

                  return (
                    <div
                      key={product.id}
                      className="dropdown-item"
                      tabIndex={0}
                      onClick={() => handleProductSelect(product)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleProductSelect(product);
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          const items = dropdownRef.current?.querySelectorAll('.dropdown-item');
                          items?.[index + 1]?.focus();
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          if (index === 0) {
                            barcodeInputRef.current?.focus();
                          } else {
                            const items = dropdownRef.current?.querySelectorAll('.dropdown-item');
                            items?.[index - 1]?.focus();
                          }
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 16px',
                        cursor: inStock ? 'pointer' : 'not-allowed',
                        borderBottom: '1px solid var(--border-color)',
                        background: inStock ? 'var(--bg-sidebar)' : 'var(--bg-card-hover)',
                        opacity: inStock ? 1 : 0.6,
                        gap: '12px',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => {
                        if (inStock) e.currentTarget.style.background = 'var(--bg-card-hover)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = inStock ? 'var(--bg-sidebar)' : 'var(--bg-card-hover)';
                      }}
                    >
                      {/* Stock Status Dot */}
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: inStock
                          ? (lowStock ? '#F59E0B' : '#10B981')
                          : '#EF4444'
                      }} />

                      {/* Product Name + Category */}
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <div style={{
                          fontWeight: '500',
                          fontSize: '14px',
                          color: inStock ? 'var(--text-main)' : 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {product.name}
                          {!inStock && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              color: '#EF4444',
                              fontWeight: '600'
                            }}>
                              OUT OF STOCK
                            </span>
                          )}
                          {lowStock && inStock && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              color: '#F59E0B',
                              fontWeight: '600'
                            }}>
                              LOW STOCK
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginTop: '2px'
                        }}>
                          {product.category} • Barcode: {product.barcode}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div style={{
                        fontSize: '12px',
                        color: inStock ? 'var(--text-muted)' : '#EF4444',
                        textAlign: 'center',
                        minWidth: '60px'
                      }}>
                        <div style={{ fontWeight: '600' }}>
                          {product.quantity}
                        </div>
                        <div>in stock</div>
                      </div>

                      {/* Price */}
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: 'var(--primary)',
                        minWidth: '80px',
                        textAlign: 'right'
                      }}>
                        PKR {parseFloat(product.price).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="table-container" style={{ flex: 1, overflowY: 'auto', minHeight: '380px', marginTop: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>S.No</th>
                  <th>Product Details</th>
                  <th style={{ width: '120px' }}>Location</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Quantity</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Retail</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Disc/Unit</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ width: '50px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <span style={{ fontWeight: 600, display: 'block' }}>{item.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code: {item.barcode}</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          marginTop: '6px',
                          fontSize: '11px',
                          padding: '3px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: item.cuttingList?.length > 0 ? 'rgba(16, 185, 129, 0.15)' : '',
                          borderColor: item.cuttingList?.length > 0 ? '#10B981' : '',
                          cursor: 'pointer'
                        }}
                        onClick={() => setEditingCuttingListIdx(idx)}
                      >
                        📐 Cutting List ({item.cuttingList?.length || 0})
                      </button>
                    </td>
                    <td>
                      <select
                        className="form-input btn-sm"
                        style={{ padding: '4px 8px' }}
                        value={item.location}
                        onChange={(e) => {
                          const nextCart = [...cart];
                          nextCart[idx].location = e.target.value;
                          setCart(nextCart);
                        }}
                      >
                        <option value="Shop">Shop</option>
                        <option value="Store 1">Store 1</option>
                      </select>
                    </td>
                    <td>
                      <div className="qty-control flex-center">
                        <button
                          className="btn btn-secondary btn-sm qty-btn"
                          onClick={() => updateCartQty(idx, -1)}
                          disabled={item.cuttingList?.length > 0}
                          style={{ cursor: item.cuttingList?.length > 0 ? 'not-allowed' : 'pointer' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="qty-value">
                          {item.cuttingList?.length > 0 ? parseFloat(item.quantity).toFixed(4) : item.quantity}
                        </span>
                        <button
                          className="btn btn-secondary btn-sm qty-btn"
                          onClick={() => updateCartQty(idx, 1)}
                          disabled={item.cuttingList?.length > 0}
                          style={{ cursor: item.cuttingList?.length > 0 ? 'not-allowed' : 'pointer' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                    <td>
                      <input
                        type="number"
                        className="form-input btn-sm"
                        style={{ textAlign: 'right', padding: '6px' }}
                        value={item.discount}
                        onChange={(e) => updateCartDiscount(idx, e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency((item.unit_price - item.discount) * item.quantity)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => removeFromCart(idx)} style={{ padding: '6px', cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                      <ShoppingCart size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                      Billing cart is empty. Scan barcodes or search products to build invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right billing summary panel */}
        <div className="glass-card flex-col checkout-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3>Checkout Invoice</h3>

          {/* Customer Selection */}
          <div className="form-group">
            <label className="form-label">Client / Customer</label>
            <select
              className="form-input"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {parseFloat(c.balance) > 0 ? `(Owes: ${formatCurrency(c.balance)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Cart Default Location</label>
            <select
              className="form-input"
              value={checkoutLocation}
              onChange={(e) => {
                setCheckoutLocation(e.target.value);
                // Also update existing cart rows
                setCart(cart.map(item => ({ ...item, location: e.target.value })));
              }}
            >
              <option value="Shop">Shop</option>
              <option value="Store 1">Store 1</option>
            </select>
          </div>

          {/* Communicate Type */}
          <div className="form-group">
            <label className="form-label">Communicate Type</label>
            <select
              className="form-input"
              value={communicateType}
              onChange={(e) => setCommunicateType(e.target.value)}
            >
              <option value="Walk-in">Walk-in</option>
              <option value="On Phone">On Phone</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Sale Person */}
          <div className="form-group">
            <label className="form-label">Sale Person</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter salesman name..."
              value={salePerson}
              onChange={(e) => setSalePerson(e.target.value)}
            />
          </div>

          {/* Delivery Type */}
          <div className="form-group">
            <label className="form-label">Delivery Type</label>
            <select
              className="form-input"
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
            >
              <option value="Pick-Up">Pick-Up</option>
              <option value="Delivery">Delivery</option>
            </select>
          </div>

          {/* Delivery Date & Time */}
          <div className="form-group">
            <label className="form-label">Delivery Date & Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          {/* Remarks */}
          <div className="form-group">
            <label className="form-label">Remarks / Delivery Instructions</label>
            <textarea
              className="form-input"
              rows="2"
              placeholder="Enter remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ resize: 'vertical', minHeight: '50px' }}
            />
          </div>

          <div style={{ borderBottom: '1px solid var(--border-color)', margin: '10px 0' }}></div>

          {/* Totals Summary */}
          <div className="totals-summary-list">
            <div className="flex-between total-row">
              <span className="total-label">Subtotal</span>
              <span className="total-val">{formatCurrency(subtotal)}</span>
            </div>

            <div className="form-group" style={{ margin: '10px 0 0 0' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Invoice Flat Discount (PKR)</label>
              <input
                type="number"
                className="form-input"
                value={invoiceDiscount}
                onChange={(e) => setInvoiceDiscount(e.target.value || '0.00')}
              />
            </div>

            <div className="flex-between total-row net-row" style={{ marginTop: '14px' }}>
              <span className="total-label" style={{ fontWeight: 700, fontSize: '15px' }}>Net Total</span>
              <span className="total-val" style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>
                PKR {formatCurrency(netTotal)}
              </span>
            </div>

            <div className="form-group" style={{ margin: '14px 0 0 0' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Amount Paid (PKR)</label>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success)' }}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value || '0.00')}
              />
            </div>

            {/* Change / Outstanding calculation */}
            <div className="flex-between total-row" style={{ marginTop: '14px' }}>
              <span className="total-label">{balance >= 0 ? 'Outstanding Receivable' : 'Change Return'}</span>
              <span className={`total-val ${balance >= 0 ? 'danger-color' : 'success-color'}`} style={{ fontWeight: 700 }}>
                PKR {formatCurrency(Math.abs(balance))}
              </span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: 600, marginTop: 'auto' }}
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            <Check size={20} />
            Complete Checkout
          </button>
        </div>
      </div>

      {/* Thermal Receipt Print Modal */}
      {receiptOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{
            width: '95vw',
            height: '95vh',
            maxWidth: '1200px',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div className="flex-between" style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              zIndex: 10
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Checkout Complete</h3>
              <button className="theme-toggle-btn" onClick={() => setReceiptOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Receipt Preview box */}
            <div className="receipt-preview-box" style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px 10px',
              backgroundColor: 'var(--bg-sidebar)',
              flex: 1,
              overflowY: 'auto',
              overflowX: 'auto'
            }}>
              <ReceiptPrintTemplate
                ref={printRef}
                order={checkoutResult}
                items={checkoutResult ? checkoutResult.items : []}
                customer={checkoutResult ? checkoutResult.customer : selectedCustomer}
                cashier={user?.name}
                settings={settings}
              />
            </div>

            <div className="flex" style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              gap: '12px',
              justifyContent: 'flex-end',
              zIndex: 10
            }}>
              <button className="btn btn-secondary" style={{ minWidth: '120px' }} onClick={() => setReceiptOpen(false)}>
                Close Panel
              </button>
              <button className="btn btn-primary" style={{ minWidth: '160px' }} onClick={handlePrint}>
                <Printer size={16} style={{ marginRight: '8px' }} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        cartItems={cart}
        subtotal={subtotal}
        invoiceDiscount={invoiceDiscount}
        netTotal={netTotal}
        customer={selectedCustomer}
        cartLocation={checkoutLocation}
        communicate_type={communicateType}
        delivery_type={deliveryType}
        delivery_date={deliveryDate}
        remarks={remarks}
        sale_person={salePerson}
        onSuccess={handlePaymentSuccess}
      />

      {/* Cutting List Editor Modal */}
      {editingCuttingListIdx !== null && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '95%', width: '1200px', padding: '24px' }}>
            <div className="flex-between" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>📐 Cutting List & Dimension Billing — {cart[editingCuttingListIdx].name}</h3>
              <button className="theme-toggle-btn" onClick={() => setEditingCuttingListIdx(null)} style={{ border: 'none', cursor: 'pointer', background: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '20px' }}>
              <table className="custom-table" style={{ margin: 0, fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-sidebar)' }}>
                    <th colSpan="6" style={{ textAlign: 'center', borderRight: '2px solid var(--border-color)' }}>CUSTOMER DEMAND</th>
                    <th colSpan="5" style={{ textAlign: 'center', borderRight: '2px solid var(--border-color)' }}>BILLING DIMENSIONS</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle', textAlign: 'center' }}>Diff (Wastage)</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle', textAlign: 'center', width: '50px' }}></th>
                  </tr>
                  <tr style={{ background: 'var(--bg-sidebar)' }}>
                    <th style={{ width: '80px' }}>W</th>
                    <th style={{ width: '80px' }}>L</th>
                    <th style={{ width: '80px' }}>UOM</th>
                    <th style={{ width: '70px' }}>Qty (Pcs)</th>
                    <th style={{ width: '90px' }}>Sq.ft</th>
                    <th style={{ borderRight: '2px solid var(--border-color)' }}>Description</th>
                    <th style={{ width: '80px' }}>W (Inch)</th>
                    <th style={{ width: '80px' }}>L (Inch)</th>
                    <th style={{ width: '80px' }}>UOM</th>
                    <th style={{ width: '70px' }}>Qty (Pcs)</th>
                    <th style={{ width: '90px', borderRight: '2px solid var(--border-color)' }}>Sq.ft</th>
                  </tr>
                </thead>
                <tbody>
                  {(cart[editingCuttingListIdx].cuttingList || []).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {/* Customer Demand */}
                      <td>
                        <input
                          type="number"
                          className="form-input btn-sm"
                          value={row.demand_w}
                          placeholder="W"
                          onChange={(e) => updateRow(rowIdx, 'demand_w', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input btn-sm"
                          value={row.demand_l}
                          placeholder="L"
                          onChange={(e) => updateRow(rowIdx, 'demand_l', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="form-input btn-sm"
                          value={row.demand_uom}
                          onChange={(e) => updateRow(rowIdx, 'demand_uom', e.target.value)}
                        >
                          <option value="in">Inch</option>
                          <option value="cm">cm</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input btn-sm"
                          value={row.demand_qty}
                          placeholder="Pcs"
                          onChange={(e) => updateRow(rowIdx, 'demand_qty', e.target.value)}
                        />
                      </td>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>
                        {(row.demand_sqft || 0).toFixed(4)}
                      </td>
                      <td style={{ borderRight: '2px solid var(--border-color)' }}>
                        <input
                          type="text"
                          className="form-input btn-sm"
                          value={row.demand_description}
                          placeholder="Desc..."
                          onChange={(e) => updateRow(rowIdx, 'demand_description', e.target.value)}
                        />
                      </td>

                      {/* Billing Dimensions */}
                      <td>
                        <input
                          type="number"
                          className="form-input btn-sm"
                          value={row.billing_w}
                          placeholder="W"
                          onChange={(e) => updateRow(rowIdx, 'billing_w', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input btn-sm"
                          value={row.billing_l}
                          placeholder="L"
                          onChange={(e) => updateRow(rowIdx, 'billing_l', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="form-input btn-sm"
                          value={row.billing_uom}
                          onChange={(e) => updateRow(rowIdx, 'billing_uom', e.target.value)}
                        >
                          <option value="in">Inch</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input btn-sm"
                          value={row.billing_qty}
                          placeholder="Pcs"
                          onChange={(e) => updateRow(rowIdx, 'billing_qty', e.target.value)}
                        />
                      </td>
                      <td style={{ borderRight: '2px solid var(--border-color)' }}>
                        <input
                          type="number"
                          step="0.0001"
                          className="form-input btn-sm"
                          value={row.billing_sqft}
                          style={{ fontWeight: 600 }}
                          onChange={(e) => updateRow(rowIdx, 'billing_sqft', e.target.value)}
                        />
                      </td>

                      {/* Diff and Action */}
                      <td style={{ textAlign: 'center', fontWeight: 600, color: row.wastage_diff > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                        {row.wastage_diff !== 0 ? row.wastage_diff.toFixed(4) : '-'}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '6px', cursor: 'pointer' }}
                          onClick={() => {
                            const nextCart = [...cart];
                            nextCart[editingCuttingListIdx].cuttingList.splice(rowIdx, 1);
                            const totalSqft = nextCart[editingCuttingListIdx].cuttingList.reduce((sum, r) => sum + (parseFloat(r.billing_sqft) || 0), 0);
                            nextCart[editingCuttingListIdx].quantity = parseFloat(totalSqft.toFixed(4)) || 1.0;
                            setCart(nextCart);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Totals & Add Row */}
                  <tr style={{ background: 'var(--bg-card-hover)', fontWeight: 'bold' }}>
                    <td colSpan="3" style={{ textAlign: 'right' }}>Total Demand:</td>
                    <td style={{ textAlign: 'center' }}>
                      {cart[editingCuttingListIdx].cuttingList?.reduce((sum, r) => sum + (parseFloat(r.demand_qty) || 0), 0) || 0}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(cart[editingCuttingListIdx].cuttingList?.reduce((sum, r) => sum + (parseFloat(r.demand_sqft) || 0), 0) || 0).toFixed(4)}
                    </td>
                    <td style={{ borderRight: '2px solid var(--border-color)' }}></td>
                    
                    <td colSpan="3" style={{ textAlign: 'right' }}>Total Billing:</td>
                    <td style={{ textAlign: 'center' }}>
                      {cart[editingCuttingListIdx].cuttingList?.reduce((sum, r) => sum + (parseFloat(r.billing_qty) || 0), 0) || 0}
                    </td>
                    <td style={{ textAlign: 'center', borderRight: '2px solid var(--border-color)' }}>
                      {(cart[editingCuttingListIdx].cuttingList?.reduce((sum, r) => sum + (parseFloat(r.billing_sqft) || 0), 0) || 0).toFixed(4)}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {(cart[editingCuttingListIdx].cuttingList?.reduce((sum, r) => sum + (parseFloat(r.wastage_diff) || 0), 0) || 0).toFixed(4)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              {(!cart[editingCuttingListIdx].cuttingList || cart[editingCuttingListIdx].cuttingList.length === 0) && (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No dimensions entered. Click "Add Dimension Row" to begin.
                </div>
              )}
            </div>

            <div className="flex-between">
              <button className="btn btn-secondary" onClick={addRow} style={{ cursor: 'pointer' }}>
                <Plus size={16} /> Add Dimension Row
              </button>
              <button className="btn btn-primary" onClick={() => setEditingCuttingListIdx(null)} style={{ cursor: 'pointer' }}>
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX for Billing Cart Autocomplete */}
      <style>{`
        .products-dropdown {
          scrollbar-width: thin;
          scrollbar-color: var(--border-color) transparent;
        }
        .products-dropdown::-webkit-scrollbar {
          width: 6px;
        }
        .products-dropdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .products-dropdown::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .dropdown-item:focus {
          outline: none;
          background: var(--bg-card-hover) !important;
        }

        .search-results-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background-color: var(--bg-sidebar);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: 120;
          margin-top: 6px;
          overflow: hidden;
        }

        .search-result-item {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
          transition: background-color var(--transition-fast);
        }

        .search-result-item:hover {
          background-color: var(--primary-light);
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .res-prod-name {
          font-weight: 600;
          display: block;
          color: var(--text-main);
        }

        .res-prod-barcode {
          font-size: 11px;
          color: var(--text-muted);
        }

        .res-prod-price {
          font-weight: 700;
          color: var(--primary);
        }

        .qty-control {
          gap: 12px;
        }

        .qty-btn {
          width: 26px;
          height: 26px;
          padding: 0 !important;
          border-radius: var(--radius-sm);
        }

        .qty-value {
          font-weight: 700;
          font-size: 15px;
        }

        .totals-summary-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .total-row {
          font-size: 14px;
        }

        .net-row {
          border-top: 1px solid var(--border-color);
          padding-top: 14px;
        }

        .success-color {
          color: var(--success);
        }

        .danger-color {
          color: var(--danger);
        }

        /* Out-of-stock items in dropdown */
        .oos-item {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .oos-item:hover {
          background-color: rgba(239, 68, 68, 0.06) !important;
        }

        .oos-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 1px 6px;
          font-size: 10px;
          font-weight: 600;
          background-color: var(--danger);
          color: white;
          border-radius: 4px;
          vertical-align: middle;
          letter-spacing: 0.3px;
        }
      `}</style>
    </div>
  );
};

export default Invoice;
export { ReceiptPrintTemplate };
