import React, { useState, useEffect } from "react";
import { 
  FaEgg, 
  FaPlus, 
  FaMinus, 
  FaCheck, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaUser, 
  FaUtensils, 
  FaQrcode,
  FaHistory,
  FaCalendarAlt,
  FaSearch,
  FaTable,
  FaMoneyBillWave,
  FaEdit,
  FaQuoteLeft,
  FaLeaf,
  FaDumbbell,
  FaHeart
} from "react-icons/fa";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update } from "firebase/database";

const EGG_PRICE = 11;
const ADMIN_UPI_ID = "reshmamanikandan17@oksbi"; // Replace with your actual UPI ID

const firebaseConfig = {
  apiKey: "AIzaSyAk5fc_KBjXNXNQVjpCJmPmhyWkmjn2q1s",
  authDomain: "Yhealthybitehub-app.firebaseapp.com",
  databaseURL: "https://healthybitehub-app-default-rtdb.firebaseio.com",
  projectId: "healthybitehub-app",
  storageBucket: "healthybitehub-app.appspot.com",
  messagingSenderId: "168127888521",
  appId: "1:168127888521:web:d32ca57a8975be71185a58"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const HEALTH_QUOTES = [
  "Eat Clean. Feel Great.",
  "Crack open a healthier you with nature's ultimate protein powerhouse!",
  "Fuel your body with wholesome nutrition, one bite at a time.",
  "Good health starts with good food choices — power up your day with fresh eggs!",
  "High in protein, rich in life — pure health delivered fresh to your spot."
];

const FONT_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

.egg-app { 
  font-family: 'Plus Jakarta Sans', sans-serif; 
  background: #F4F7F4; 
  color: #1C2D1F; 
  min-height: 100vh; 
}
.egg-app h1, .egg-app h2, .egg-app .headline, .egg-app .brand-title { 
  font-family: 'Fredoka', cursive, sans-serif; 
}
.egg-app input:focus, .egg-app select:focus { 
  outline: none; 
  border-color: #1E5128 !important; 
  box-shadow: 0 0 0 3px rgba(30, 81, 40, 0.18); 
}
.egg-app button { 
  font-family: 'Plus Jakarta Sans', sans-serif; 
  cursor: pointer; 
}
.egg-app ::placeholder { 
  color: #93A395; 
}
`;

function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateShort(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toISOString().split('T')[0];
}

export default function EggOrderApp() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("order"); // 'order', 'history', 'admin_kitchen', 'admin_all'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Saved User Mobile from LocalStorage (Auto Login)
  const [savedMobile, setSavedMobile] = useState(() => localStorage.getItem("egg_user_mobile") || "");
  const [customPayAmount, setCustomPayAmount] = useState("");

  // Rotating Quotes Index
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Admin Search & Date Filters
  const [searchName, setSearchName] = useState("");
  const [searchDate, setSearchDate] = useState("");

  // User Form
  const [name, setName] = useState("");
  const [floor, setFloor] = useState("Plot 16A");
  const [mobile, setMobile] = useState(savedMobile);
  const [count, setCount] = useState(2);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(null);
  const [submitError, setSubmitError] = useState("");

  // Admin Editing Paid Amount
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [manualPaidInput, setManualPaidInput] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "true") {
      setIsAdmin(true);
      setView("admin_kitchen");
    }

    const ordersRef = ref(db, "orders");
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.keys(data).map((key) => {
          const item = data[key];
          const totalCost = item.count * EGG_PRICE;
          const amountPaid = item.amountPaid !== undefined ? item.amountPaid : (item.paid ? totalCost : 0);
          return {
            id: key,
            ...item,
            totalCost,
            amountPaid,
            remainingBalance: Math.max(0, totalCost - amountPaid)
          };
        });
        setOrders(orderList);
      } else {
        setOrders([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error reading orders:", error);
      setLoading(false);
    });

    // Rotate Quote every 8 seconds
    const quoteInterval = setInterval(() => {
      setQuoteIdx((prevIdx) => (prevIdx + 1) % HEALTH_QUOTES.length);
    }, 8000);

    return () => {
      unsubscribe();
      clearInterval(quoteInterval);
    };
  }, []);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Enter your name";
    if (!floor.trim()) e.floor = "Please select a location";
    if (!/^\d{10}$/.test(mobile.trim())) e.mobile = "Enter a valid 10-digit number";
    if (!count || count < 1) e.count = "Pick at least 1 egg";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitOrder = async (ev) => {
    ev.preventDefault();
    setSubmitError("");
    if (!validate()) {
      setSubmitError("Please fix the fields highlighted in red.");
      return;
    }
    setSaving(true);
    try {
      const cleanMobile = mobile.trim();
      localStorage.setItem("egg_user_mobile", cleanMobile);
      setSavedMobile(cleanMobile);

      const orderData = {
        name: name.trim(),
        floor,
        mobile: cleanMobile,
        count,
        price: count * EGG_PRICE,
        delivered: false,
        paid: false,
        amountPaid: 0,
        ts: Date.now(),
      };
      
      const ordersRef = ref(db, "orders");
      const newOrderRef = await push(ordersRef, orderData);

      setConfirmed({ id: newOrderRef.key, ...orderData });
      setName("");
      setFloor("Plot 16A");
      setCount(2);
      setErrors({});
    } catch (e) {
      setSubmitError("Order couldn't be saved. Check connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDelivered = async (id, currentVal) => {
    try {
      const orderRef = ref(db, `orders/${id}`);
      await update(orderRef, { delivered: !currentVal });
    } catch (e) {
      console.error("Failed to update delivery status:", e);
    }
  };

  const updateOrderPayment = async (id, newPaidAmount, totalCost) => {
    try {
      const parsedAmount = Math.min(totalCost, Math.max(0, Number(newPaidAmount) || 0));
      const isFullyPaid = parsedAmount >= totalCost;
      
      const orderRef = ref(db, `orders/${id}`);
      await update(orderRef, {
        amountPaid: parsedAmount,
        paid: isFullyPaid
      });
      setEditingOrderId(null);
    } catch (e) {
      console.error("Failed to update payment amount:", e);
    }
  };

  // User Filtered Orders
  const myOrders = orders
    .filter((o) => o.mobile === savedMobile)
    .sort((a, b) => b.ts - a.ts);

  const userTotalUnpaid = myOrders.reduce((sum, o) => sum + o.remainingBalance, 0);

  // Admin Filtered Orders
  const filteredAdminOrders = orders
    .filter((o) => {
      const matchesName = o.name.toLowerCase().includes(searchName.toLowerCase()) || 
                          o.mobile.includes(searchName) || 
                          (o.floor && o.floor.toLowerCase().includes(searchName.toLowerCase()));
      const matchesDate = searchDate === "" || formatDateShort(o.ts) === searchDate;
      return matchesName && matchesDate;
    })
    .sort((a, b) => b.ts - a.ts);

  const totalEggs = filteredAdminOrders.reduce((s, o) => s + o.count, 0);
  const totalRevenue = filteredAdminOrders.reduce((s, o) => s + o.totalCost, 0);
  const totalCollected = filteredAdminOrders.reduce((s, o) => s + o.amountPaid, 0);
  const totalPending = totalRevenue - totalCollected;

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1.5px solid #D2E0D4",
    background: "#FFFFFF",
    fontSize: 15,
    color: "#1C2D1F",
    boxSizing: "border-box",
  };

  const labelStyle = { 
    fontSize: 13, 
    fontWeight: 600, 
    color: "#2C402E", 
    marginBottom: 6, 
    display: "flex", 
    alignItems: "center", 
    gap: 6 
  };
  
  const errorStyle = { fontSize: 12, color: "#D32F2F", marginTop: 4 };
  // 1. Set your exact name from GPay / Bank Account
  const ADMIN_NAME = "RESHMA V M"; // e.g. "RAHUL SHARMA"

  // 2. Encode parameters safely
  const encodedPa = encodeURIComponent(ADMIN_UPI_ID);
  const encodedPn = encodeURIComponent(ADMIN_NAME);
  const amount = selectedPayAmount || "0";

  const upiUrl = `upi://pay?pa=${encodeURIComponent(ADMIN_UPI_ID)}&pn=${encodeURIComponent(ADMIN_NAME)}&cu=INR`;
  return (
    <div className="egg-app" style={{ padding: "0 0 40px" }}>
      <style>{FONT_STYLE}</style>

      <div style={{ maxWidth: isAdmin ? 780 : 480, margin: "0 auto", padding: "20px 16px 0" }}>
        
        {/* BRAND HEADER & LOGO CONTAINER */}
        <div style={{
          background: "linear-gradient(135deg, #1E5128 0%, #143A1B 100%)",
          borderRadius: 20,
          padding: "20px 18px",
          color: "#FFFFFF",
          boxShadow: "0 8px 24px rgba(30,81,40,0.18)",
          marginBottom: 16,
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Logo Image Placeholder / Display */}
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #FF6B00",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              overflow: "hidden",
              flexShrink: 0
            }}>
              <img 
                src={process.env.PUBLIC_URL + "/1000386596.png"}
                alt="Healthy Bite Hub" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  // Fallback icon if image path isn't local
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<span style="font-size: 32px">🥚</span>';
                }}
              />
            </div>

            <div>
              <div className="brand-title" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", color: "#FFFFFF", lineHeight: 1.1 }}>
                Healthy Bite Hub
              </div>
              <div style={{ fontSize: 13, color: "#E0EED2", marginTop: 3, fontWeight: 500 }}>
                Fresh, Boiled & Hot · ₹{EGG_PRICE} / Egg
              </div>
            </div>
          </div>

          {/* Badges Bar */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <FaDumbbell color="#FF6B00" size={11} /> High Protein
            </span>
            <span style={{ background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <FaLeaf color="#72B043" size={11} /> Fresh Ingredients
            </span>
            <span style={{ background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <FaHeart color="#FF4D4D" size={11} /> Healthy You
            </span>
          </div>
        </div>

        {/* HEALTHY QUOTE BANNER */}
        <div style={{
          background: "#E8F0E6",
          border: "1px solid #C8DEC5",
          borderRadius: 14,
          padding: "12px 16px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 12,
          transition: "all 0.3s ease"
        }}>
          <FaQuoteLeft size={18} color="#1E5128" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E5128", fontStyle: "italic", lineHeight: 1.3 }}>
            "{HEALTH_QUOTES[quoteIdx]}"
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div style={{ display: "flex", background: "#E2EBE1", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          {!isAdmin ? (
            <>
              <button
                onClick={() => setView("order")}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 9,
                  padding: "9px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  background: view === "order" ? "#1E5128" : "transparent",
                  color: view === "order" ? "#FFFFFF" : "#4E6251",
                  boxShadow: view === "order" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s"
                }}
              >
                Order Eggs
              </button>
              <button
                onClick={() => setView("history")}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 9,
                  padding: "9px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  background: view === "history" ? "#1E5128" : "transparent",
                  color: view === "history" ? "#FFFFFF" : "#4E6251",
                  boxShadow: view === "history" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s"
                }}
              >
                <FaHistory size={13} /> My Orders
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setView("admin_kitchen")}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 9,
                  padding: "9px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  background: view === "admin_kitchen" ? "#1E5128" : "transparent",
                  color: view === "admin_kitchen" ? "#FFFFFF" : "#4E6251",
                }}
              >
                Kitchen View
              </button>
              <button
                onClick={() => setView("admin_all")}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 9,
                  padding: "9px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  background: view === "admin_all" ? "#1E5128" : "transparent",
                  color: view === "admin_all" ? "#FFFFFF" : "#4E6251",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <FaTable size={13} /> Master Data
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6A7B6C", fontSize: 14 }}>Fetching menu & orders...</div>
        ) : view === "order" ? (
          /* USER ORDER FORM VIEW */
          <div>
            {confirmed ? (
              <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 18, padding: 28, textAlign: "center", boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <FaCheck size={28} color="#2E7D32" />
                </div>
                <div className="headline" style={{ fontSize: 22, fontWeight: 700, color: "#1E5128", marginBottom: 6 }}>Order Received!</div>
                <div style={{ fontSize: 14, color: "#4E6251", marginBottom: 16, lineHeight: 1.5 }}>
                  <strong>{confirmed.count}</strong> egg{confirmed.count > 1 ? "s" : ""} (₹{confirmed.count * EGG_PRICE}) scheduled for <strong>{confirmed.name}</strong> at <strong>{confirmed.floor}</strong>.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                  <button
                    onClick={() => setConfirmed(null)}
                    style={{ border: "none", background: "#FF6B00", color: "#FFFFFF", padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700 }}
                  >
                    Place Another Order
                  </button>
                  <button
                    onClick={() => setView("history")}
                    style={{ border: "none", background: "#1E5128", color: "#FFFFFF", padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600 }}
                  >
                    View Order History
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitOrder} style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 18, padding: 22, boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}>
                {submitError && (
                  <div style={{ background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#D32F2F", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                    {submitError}
                  </div>
                )}

                {/* Name */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}><FaUser size={13} color="#1E5128" /> Customer Name</div>
                  <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" />
                  {errors.name && <div style={errorStyle}>{errors.name}</div>}
                </div>

                {/* Floor Dropdown */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}><FaMapMarkerAlt size={13} color="#1E5128" /> Select Plot / Location</div>
                  <select
                    style={{
                      ...inputStyle,
                      appearance: "none",
                      backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="%231E5128" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      cursor: "pointer"
                    }}
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  >
                    <option value="Plot 16A">Plot 16A</option>
                    <option value="Plot 16B">Plot 16B</option>
                    <option value="Plot 43">Plot 43</option>
                  </select>
                  {errors.floor && <div style={errorStyle}>{errors.floor}</div>}
                </div>

                {/* Mobile Number */}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}><FaPhone size={13} color="#1E5128" /> Mobile Number</div>
                  <input
                    style={inputStyle}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                  />
                  {errors.mobile && <div style={errorStyle}>{errors.mobile}</div>}
                </div>

                {/* Quantity Selector */}
                <div style={{ marginBottom: 22 }}>
                  <div style={labelStyle}><FaEgg size={13} color="#1E5128" /> Quantity (₹{EGG_PRICE} / egg)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#F4F7F4", padding: 10, borderRadius: 12, border: "1px solid #D2E0D4" }}>
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      style={{ width: 42, height: 42, borderRadius: 10, border: "none", background: "#1E5128", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <FaMinus size={14} />
                    </button>
                    <div style={{ fontSize: 22, fontWeight: 700, minWidth: 32, textAlign: "center" }}>{count}</div>
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.min(30, c + 1))}
                      style={{ width: 42, height: 42, borderRadius: 10, border: "none", background: "#1E5128", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <FaPlus size={14} />
                    </button>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#6A7B6C" }}>Total Price</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#FF6B00" }}>₹{count * EGG_PRICE}</div>
                    </div>
                  </div>
                  {errors.count && <div style={errorStyle}>{errors.count}</div>}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "linear-gradient(135deg, #FF6B00 0%, #E05D00 100%)",
                    color: "#FFFFFF",
                    padding: "14px 0",
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(255,107,0,0.25)"
                  }}
                >
                  {saving ? "Placing Order..." : "Confirm & Place Order"}
                </button>
              </form>
            )}
          </div>
        ) : view === "history" ? (
          /* USER HISTORY & PAYMENTS DASHBOARD */
          <div>
            <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 18, padding: 20, boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div className="headline" style={{ fontSize: 18, fontWeight: 700, color: "#1E5128" }}>My Orders & Balance</div>
                  <div style={{ fontSize: 12, color: "#6A7B6C" }}>
                    {savedMobile ? `Mobile: ${savedMobile}` : "No phone number saved"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newMob = prompt("Enter 10-digit mobile number to switch account:", savedMobile);
                    if (newMob && /^\d{10}$/.test(newMob.trim())) {
                      localStorage.setItem("egg_user_mobile", newMob.trim());
                      setSavedMobile(newMob.trim());
                      setMobile(newMob.trim());
                    }
                  }}
                  style={{ border: "1px solid #D2E0D4", background: "#F4F7F4", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#1E5128" }}
                >
                  Switch Number
                </button>
              </div>

              {!savedMobile ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#6A7B6C", fontSize: 14 }}>
                  Please place an order or click "Switch Number" to view your orders.
                </div>
              ) : (
                <>
                  {/* Payment Card */}
                  <div style={{ background: "linear-gradient(135deg, #F4F7F4 0%, #E8F0E6 100%)", borderRadius: 14, padding: 18, marginBottom: 20, border: "1px solid #D2E0D4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#6A7B6C", fontWeight: 700, letterSpacing: "0.5px" }}>PENDING BALANCE</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: userTotalUnpaid > 0 ? "#D32F2F" : "#2E7D32" }}>
                          ₹{userTotalUnpaid}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#6A7B6C" }}>Total Orders</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#1E5128" }}>{myOrders.length}</div>
                      </div>
                    </div>

                    {userTotalUnpaid > 0 && (
                      <div style={{ borderTop: "1px solid #C8DEC5", paddingTop: 14, marginTop: 10 }}>
                        <div style={labelStyle}><FaMoneyBillWave size={13} color="#1E5128" /> Enter Pay Amount</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                          <input
                            type="number"
                            style={{ ...inputStyle, padding: "8px 12px", width: 140 }}
                            placeholder={`Max ₹${userTotalUnpaid}`}
                            value={customPayAmount}
                            onChange={(e) => setCustomPayAmount(e.target.value)}
                          />
                          <button
                            onClick={() => setCustomPayAmount(userTotalUnpaid.toString())}
                            style={{ border: "1px solid #1E5128", background: "#FFFFFF", color: "#1E5128", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                          >
                            Pay Full
                          </button>
                        </div>

                        <a
                          href={upiUrl}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            background: "#1E5128",
                            color: "#FFFFFF",
                            padding: "12px 0",
                            borderRadius: 12,
                            fontSize: 15,
                            fontWeight: 700,
                            textDecoration: "none",
                            boxShadow: "0 4px 10px rgba(30,81,40,0.2)"
                          }}
                        >
                          <FaQrcode size={16} /> Pay ₹{selectedPayAmount} via UPI
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Orders List */}
                  <div className="headline" style={{ fontSize: 16, fontWeight: 700, color: "#1E5128", marginBottom: 12 }}>Order History</div>
                  {myOrders.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#6A7B6C", textAlign: "center", padding: "20px 0" }}>
                      No order records found for this phone number.
                    </div>
                  ) : (
                    myOrders.map((o) => (
                      <div key={o.id} style={{ border: "1px solid #E2EBE1", borderRadius: 12, padding: 12, marginBottom: 10, background: "#FFFFFF" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{o.count} Egg{o.count > 1 ? "s" : ""} · ₹{o.totalCost}</div>
                            <div style={{ fontSize: 11, color: "#6A7B6C", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <FaMapMarkerAlt size={10} /> {o.floor || "Plot 16A"} · <FaCalendarAlt size={10} /> {formatDate(o.ts)}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: o.delivered ? "#E8F5E9" : "#FFF3E0", color: o.delivered ? "#2E7D32" : "#E65100" }}>
                            {o.delivered ? "Delivered" : "Preparing"}
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F4F7F4", paddingTop: 8, fontSize: 12 }}>
                          <div>
                            Paid: <strong style={{ color: "#2E7D32" }}>₹{o.amountPaid}</strong>
                            {o.remainingBalance > 0 && <span style={{ color: "#D32F2F", marginLeft: 6 }}>(Pending: ₹{o.remainingBalance})</span>}
                          </div>
                          {o.paid ? (
                            <span style={{ color: "#2E7D32", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <FaCheck size={10} /> Fully Paid
                            </span>
                          ) : (
                            <span style={{ color: "#FF6B00", fontWeight: 700 }}>Partially Paid</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        ) : view === "admin_kitchen" ? (
          /* ADMIN KITCHEN VIEW */
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1E5128" }}>{totalEggs}</div>
                <div style={{ fontSize: 11, color: "#6A7B6C" }}>Total Eggs</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#2E7D32" }}>₹{totalCollected}</div>
                <div style={{ fontSize: 11, color: "#6A7B6C" }}>Collected</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: totalPending > 0 ? "#D32F2F" : "#1E5128" }}>₹{totalPending}</div>
                <div style={{ fontSize: 11, color: "#6A7B6C" }}>Pending</div>
              </div>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#6A7B6C" }}>No active kitchen orders.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1E5128" }}>{o.name} <span style={{ fontSize: 13, color: "#FF6B00", fontWeight: 700 }}>({o.floor})</span></div>
                      <div style={{ fontSize: 12, color: "#4E6251" }}>{o.count} Eggs · Total: ₹{o.totalCost} · {o.mobile}</div>
                      <div style={{ fontSize: 11, color: "#93A395", marginTop: 2 }}>{formatDate(o.ts)}</div>
                    </div>
                    <button
                      onClick={() => toggleDelivered(o.id, o.delivered)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "none",
                        fontWeight: 700,
                        fontSize: 12,
                        background: o.delivered ? "#E8F5E9" : "#FF6B00",
                        color: o.delivered ? "#2E7D32" : "#FFFFFF"
                      }}
                    >
                      {o.delivered ? "Delivered" : "Mark Delivered"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ADMIN MASTER DATA DASHBOARD */
          <div>
            {/* Filter Bar */}
            <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 14, padding: 16, marginBottom: 18 }}>
              <div className="headline" style={{ fontSize: 15, fontWeight: 700, color: "#1E5128", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <FaSearch size={14} /> Search Master Database
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={labelStyle}>Search Name / Phone / Plot</div>
                  <input
                    style={inputStyle}
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Search name, phone, plot..."
                  />
                </div>
                <div>
                  <div style={labelStyle}><FaCalendarAlt size={12} color="#1E5128" /> Filter Date</div>
                  <input
                    type="date"
                    style={inputStyle}
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                  />
                </div>
              </div>
              {(searchName || searchDate) && (
                <button
                  onClick={() => { setSearchName(""); setSearchDate(""); }}
                  style={{ border: "none", background: "none", color: "#D32F2F", fontSize: 12, fontWeight: 700, marginTop: 10, padding: 0 }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1E5128" }}>{filteredAdminOrders.length}</div>
                <div style={{ fontSize: 10, color: "#6A7B6C" }}>Orders</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1E5128" }}>{totalEggs}</div>
                <div style={{ fontSize: 10, color: "#6A7B6C" }}>Eggs</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#2E7D32" }}>₹{totalCollected}</div>
                <div style={{ fontSize: 10, color: "#6A7B6C" }}>Collected</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#D32F2F" }}>₹{totalPending}</div>
                <div style={{ fontSize: 10, color: "#6A7B6C" }}>Pending</div>
              </div>
            </div>

            {/* Master Data Table */}
            <div style={{ background: "#FFFFFF", border: "1.5px solid #D2E0D4", borderRadius: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#F4F7F4", borderBottom: "1.5px solid #D2E0D4", color: "#1E5128" }}>
                    <th style={{ padding: "10px 12px" }}>Date</th>
                    <th style={{ padding: "10px 12px" }}>Customer</th>
                    <th style={{ padding: "10px 12px" }}>Qty</th>
                    <th style={{ padding: "10px 12px" }}>Total</th>
                    <th style={{ padding: "10px 12px" }}>Paid</th>
                    <th style={{ padding: "10px 12px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#6A7B6C" }}>No matching orders found.</td>
                    </tr>
                  ) : (
                    filteredAdminOrders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #E2EBE1" }}>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontSize: 11, color: "#6A7B6C" }}>{formatDate(o.ts)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600, color: "#1E5128" }}>{o.name}</div>
                          <div style={{ fontSize: 11, color: "#6A7B6C" }}>{o.floor} · {o.mobile}</div>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{o.count}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>₹{o.totalCost}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {editingOrderId === o.id ? (
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <input
                                type="number"
                                style={{ width: 60, padding: 4, fontSize: 12, borderRadius: 6, border: "1px solid #D2E0D4" }}
                                value={manualPaidInput}
                                onChange={(e) => setManualPaidInput(e.target.value)}
                              />
                              <button
                                onClick={() => updateOrderPayment(o.id, manualPaidInput, o.totalCost)}
                                style={{ border: "none", background: "#2E7D32", color: "#FFF", padding: "4px 8px", borderRadius: 6, fontSize: 11 }}
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 700, color: o.paid ? "#2E7D32" : "#D32F2F" }}>₹{o.amountPaid}</span>
                              <button
                                onClick={() => { setEditingOrderId(o.id); setManualPaidInput(o.amountPaid.toString()); }}
                                style={{ border: "none", background: "none", color: "#6A7B6C", padding: 0 }}
                              >
                                <FaEdit size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            onClick={() => updateOrderPayment(o.id, o.paid ? 0 : o.totalCost, o.totalCost)}
                            style={{
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: o.paid ? "#E8F5E9" : "#FFEBEE",
                              color: o.paid ? "#2E7D32" : "#D32F2F"
                            }}
                          >
                            {o.paid ? "Fully Paid" : "Mark Full"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 26, fontSize: 12, color: "#6A7B6C" }}>
          <FaUtensils size={12} style={{ verticalAlign: "-2px", marginRight: 4, color: "#1E5128" }} />
          Healthy Bite Hub · Fresh, Hot & Healthy
        </div>
      </div>
    </div>
  );
}