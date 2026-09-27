import React, { useState, useEffect, useRef } from "react";
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
  FaWallet,
  FaHistory,
  FaCalendarAlt,
  FaSearch,
  FaTable,
  FaMoneyBillWave,
  FaEdit
} from "react-icons/fa";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update } from "firebase/database";

const EGG_PRICE = 10;
const ADMIN_UPI_ID = "9876543210@upi"; // Replace with your actual UPI ID

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

const FONT_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Bitter:wght@600;700&family=Work+Sans:wght@400;500;600&display=swap');
.egg-app { font-family: 'Work Sans', sans-serif; background:#FAF6EE; color:#2E2318; min-height:100vh; }
.egg-app h1, .egg-app h2, .egg-app .headline { font-family:'Bitter', serif; }
.egg-app input:focus, .egg-app select:focus { outline:none; border-color:#D98D1B !important; box-shadow:0 0 0 3px rgba(242,169,59,0.25); }
.egg-app button { font-family:'Work Sans', sans-serif; cursor:pointer; }
.egg-app ::placeholder { color:#B3A692; }
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
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
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

  // Admin Search & Date Filters
  const [searchName, setSearchName] = useState("");
  const [searchDate, setSearchDate] = useState("");

  // User Form
  const [name, setName] = useState("");
  const [floor, setFloor] = useState("");
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

    return () => unsubscribe();
  }, []);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Enter your name";
    if (!floor.trim()) e.floor = "Enter your floor";
    if (!/^\d{10}$/.test(mobile.trim())) e.mobile = "Enter a valid 10-digit number";
    if (!count || count < 1) e.count = "Pick at least 1 egg";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitOrder = async (ev) => {
    ev.preventDefault();
    setSubmitError("");
    if (!validate()) {
      setSubmitError("Please fix the fields marked in red.");
      return;
    }
    setSaving(true);
    try {
      const cleanMobile = mobile.trim();
      localStorage.setItem("egg_user_mobile", cleanMobile);
      setSavedMobile(cleanMobile);

      const orderData = {
        name: name.trim(),
        floor: floor.trim(),
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
      setFloor("");
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

  // User Filtered Orders (Auto-detected via Saved Mobile Number)
  const myOrders = orders
    .filter((o) => o.mobile === savedMobile)
    .sort((a, b) => b.ts - a.ts);

  const userTotalUnpaid = myOrders.reduce((sum, o) => sum + o.remainingBalance, 0);

  // Admin Filtered Orders (Filtered by Name and Date)
  const filteredAdminOrders = orders
    .filter((o) => {
      const matchesName = o.name.toLowerCase().includes(searchName.toLowerCase()) || 
                          o.mobile.includes(searchName) || 
                          o.floor.toLowerCase().includes(searchName.toLowerCase());
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
    borderRadius: 10,
    border: "1.5px solid #E3D9C6",
    background: "#FFFFFF",
    fontSize: 15,
    color: "#2E2318",
    boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#6B5D4D", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 };
  const errorStyle = { fontSize: 12, color: "#B8452E", marginTop: 4 };

  // Calculate UPI custom pay URL
  const selectedPayAmount = Number(customPayAmount) > 0 ? Number(customPayAmount) : userTotalUnpaid;
  const upiUrl = `upi://pay?pa=${ADMIN_UPI_ID}&pn=EggCounter&am=${selectedPayAmount}&cu=INR`;

  return (
    <div className="egg-app" style={{ padding: "0 0 40px" }}>
      <style>{FONT_STYLE}</style>

      <div style={{ maxWidth: isAdmin ? 760 : 480, margin: "0 auto", padding: "28px 20px 0" }}>
        {/* Navigation Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F2A93B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaEgg size={20} color="#2E2318" />
            </div>
            <div>
              <div className="headline" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>Boiled Egg Counter</div>
              <div style={{ fontSize: 12, color: "#8A7C69" }}>₹{EGG_PRICE}/egg · Fresh & Hot</div>
            </div>
          </div>

          <div style={{ display: "flex", background: "#EFE7D6", borderRadius: 10, padding: 3, gap: 2 }}>
            {!isAdmin ? (
              <>
                <button
                  onClick={() => setView("order")}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: view === "order" ? "#FFFFFF" : "transparent",
                    color: view === "order" ? "#2E2318" : "#8A7C69",
                  }}
                >
                  New Order
                </button>
                <button
                  onClick={() => setView("history")}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: view === "history" ? "#FFFFFF" : "transparent",
                    color: view === "history" ? "#2E2318" : "#8A7C69",
                    display: "flex",
                    alignItems: "center",
                    gap: 5
                  }}
                >
                  <FaHistory size={12} /> My History
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setView("admin_kitchen")}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: view === "admin_kitchen" ? "#FFFFFF" : "transparent",
                    color: view === "admin_kitchen" ? "#2E2318" : "#8A7C69",
                  }}
                >
                  Kitchen View
                </button>
                <button
                  onClick={() => setView("admin_all")}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: view === "admin_all" ? "#FFFFFF" : "transparent",
                    color: view === "admin_all" ? "#2E2318" : "#8A7C69",
                    display: "flex",
                    alignItems: "center",
                    gap: 5
                  }}
                >
                  <FaTable size={12} /> Master Data
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8A7C69", fontSize: 14 }}>Loading orders...</div>
        ) : view === "order" ? (
          /* User Order Form View */
          <div>
            {confirmed ? (
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E8EEE4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <FaCheck size={26} color="#4F6A4B" />
                </div>
                <div className="headline" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Order Placed Successfully!</div>
                <div style={{ fontSize: 14, color: "#6B5D4D", marginBottom: 12, lineHeight: 1.5 }}>
                  {confirmed.count} egg{confirmed.count > 1 ? "s" : ""} (₹{confirmed.count * EGG_PRICE}) for {confirmed.name} at {confirmed.floor}.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                  <button
                    onClick={() => setConfirmed(null)}
                    style={{ border: "none", background: "#F2A93B", color: "#2E2318", padding: "11px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700 }}
                  >
                    Place Another
                  </button>
                  <button
                    onClick={() => setView("history")}
                    style={{ border: "none", background: "#2E2318", color: "#FAF6EE", padding: "11px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
                  >
                    View History
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitOrder} style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 16, padding: 22, marginBottom: 24 }}>
                {submitError && (
                  <div style={{ background: "#F5E3DD", border: "1px solid #E0B6A6", color: "#B8452E", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                    {submitError}
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}><FaUser size={14} /> Name</div>
                  <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  {errors.name && <div style={errorStyle}>{errors.name}</div>}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}><FaMapMarkerAlt size={14} /> Floor / Location</div>
                  <input style={inputStyle} value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 3rd floor, West Desk" />
                  {errors.floor && <div style={errorStyle}>{errors.floor}</div>}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}><FaPhone size={14} /> Mobile Number</div>
                  <input
                    style={inputStyle}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                  />
                  {errors.mobile && <div style={errorStyle}>{errors.mobile}</div>}
                </div>

                <div style={{ marginBottom: 22 }}>
                  <div style={labelStyle}><FaEgg size={14} /> Number of Eggs (₹{EGG_PRICE} each)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      style={{ width: 40, height: 40, borderRadius: 10, border: "1.5px solid #E3D9C6", background: "#FAF6EE", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <FaMinus size={14} />
                    </button>
                    <div style={{ fontSize: 22, fontWeight: 700, minWidth: 28, textAlign: "center" }}>{count}</div>
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.min(30, c + 1))}
                      style={{ width: 40, height: 40, borderRadius: 10, border: "1.5px solid #E3D9C6", background: "#FAF6EE", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <FaPlus size={14} />
                    </button>
                    <div style={{ marginLeft: "auto", fontSize: 16, fontWeight: 700, color: "#D98D1B" }}>
                      Total: ₹{count * EGG_PRICE}
                    </div>
                  </div>
                  {errors.count && <div style={errorStyle}>{errors.count}</div>}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{ width: "100%", border: "none", background: "#F2A93B", color: "#2E2318", padding: "13px 0", borderRadius: 10, fontSize: 15, fontWeight: 700 }}
                >
                  {saving ? "Placing Order..." : "Place Order"}
                </button>
              </form>
            )}
          </div>
        ) : view === "history" ? (
          /* Automatic User History & Partial Payment Dashboard */
          <div>
            <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div className="headline" style={{ fontSize: 17, fontWeight: 700 }}>My Order Dashboard</div>
                  <div style={{ fontSize: 12, color: "#8A7C69" }}>
                    {savedMobile ? `Mobile: ${savedMobile}` : "No saved mobile number"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newMob = prompt("Enter mobile number to view history:", savedMobile);
                    if (newMob && /^\d{10}$/.test(newMob.trim())) {
                      localStorage.setItem("egg_user_mobile", newMob.trim());
                      setSavedMobile(newMob.trim());
                      setMobile(newMob.trim());
                    }
                  }}
                  style={{ border: "1px solid #E3D9C6", background: "#FAF6EE", padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                >
                  Switch Mobile
                </button>
              </div>

              {!savedMobile ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#8A7C69", fontSize: 14 }}>
                  Please place an order or click "Switch Mobile" above to view your order history.
                </div>
              ) : (
                <>
                  {/* Payment Card */}
                  <div style={{ background: "#FAF6EE", borderRadius: 14, padding: 18, marginBottom: 20, border: "1px solid #EFE7D6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#8A7C69", fontWeight: 600 }}>TOTAL UNPAID BALANCE</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: userTotalUnpaid > 0 ? "#B8452E" : "#4F6A4B" }}>
                          ₹{userTotalUnpaid}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "#8A7C69" }}>Total Orders</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{myOrders.length}</div>
                      </div>
                    </div>

                    {userTotalUnpaid > 0 && (
                      <div style={{ borderTop: "1px solid #E3D9C6", paddingTop: 14, marginTop: 10 }}>
                        <div style={labelStyle}><FaMoneyBillWave size={13} /> Custom Payment Amount</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                          <input
                            type="number"
                            style={{ ...inputStyle, padding: "8px 12px", width: 140 }}
                            placeholder={`Max ₹${userTotalUnpaid}`}
                            value={customPayAmount}
                            onChange={(e) => setCustomPayAmount(e.target.value)}
                          />
                          <button
                            onClick={() => setCustomPayAmount(userTotalUnpaid.toString())}
                            style={{ border: "1px solid #E3D9C6", background: "#FFFFFF", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
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
                            background: "#2E2318",
                            color: "#FAF6EE",
                            padding: "11px 0",
                            borderRadius: 10,
                            fontSize: 14,
                            fontWeight: 700,
                            textDecoration: "none",
                            width: "100%"
                          }}
                        >
                          <FaQrcode size={16} /> Pay ₹{selectedPayAmount} via UPI
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Orders List */}
                  <div className="headline" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Previous Orders</div>
                  {myOrders.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#8A7C69", textAlign: "center", padding: "20px 0" }}>
                      No order records found for this phone number.
                    </div>
                  ) : (
                    myOrders.map((o) => (
                      <div key={o.id} style={{ border: "1px solid #F0EAD9", borderRadius: 10, padding: 12, marginBottom: 10, background: "#FFFFFF" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{o.count} Egg{o.count > 1 ? "s" : ""} · ₹{o.totalCost}</div>
                            <div style={{ fontSize: 11, color: "#8A7C69", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <FaCalendarAlt size={10} /> {formatDate(o.ts)}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, background: o.delivered ? "#E8EEE4" : "#FBEBD2", color: o.delivered ? "#4F6A4B" : "#8A5B0B" }}>
                            {o.delivered ? "Delivered" : "Preparing"}
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #FAF6EE", paddingTop: 8, fontSize: 12 }}>
                          <div>
                            Paid: <strong style={{ color: "#4F6A4B" }}>₹{o.amountPaid}</strong>
                            {o.remainingBalance > 0 && <span style={{ color: "#B8452E", marginLeft: 8 }}>(Pending: ₹{o.remainingBalance})</span>}
                          </div>
                          {o.paid ? (
                            <span style={{ color: "#4F6A4B", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <FaCheck size={10} /> Fully Paid
                            </span>
                          ) : (
                            <span style={{ color: "#D98D1B", fontWeight: 600 }}>Partially Paid</span>
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
          /* Admin Kitchen View (Grouping by floor) */
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{totalEggs}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>Total Eggs</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4F6A4B" }}>₹{totalCollected}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>Collected</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: totalPending > 0 ? "#B8452E" : "#2E2318" }}>₹{totalPending}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>Pending</div>
              </div>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#8A7C69" }}>No orders available.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{o.name} <span style={{ fontSize: 13, color: "#8A7C69", fontWeight: 500 }}>({o.floor})</span></div>
                      <div style={{ fontSize: 12, color: "#8A7C69" }}>{o.count} Eggs · Total: ₹{o.totalCost} · {o.mobile}</div>
                      <div style={{ fontSize: 11, color: "#B3A692", marginTop: 2 }}>{formatDate(o.ts)}</div>
                    </div>
                    <button
                      onClick={() => toggleDelivered(o.id, o.delivered)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "none",
                        fontWeight: 700,
                        fontSize: 12,
                        background: o.delivered ? "#E8EEE4" : "#F2A93B",
                        color: o.delivered ? "#4F6A4B" : "#2E2318"
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
          /* Admin Master Data Dashboard (Full Database Access with Date & Name Filters) */
          <div>
            {/* Filter Bar */}
            <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 14, padding: 16, marginBottom: 18 }}>
              <div className="headline" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <FaSearch size={14} /> Master Database Filters
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={labelStyle}>Search Name / Phone / Floor</div>
                  <input
                    style={inputStyle}
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Type name or phone..."
                  />
                </div>
                <div>
                  <div style={labelStyle}><FaCalendarAlt size={12} /> Filter by Date</div>
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
                  style={{ border: "none", background: "none", color: "#B8452E", fontSize: 12, fontWeight: 600, marginTop: 10, padding: 0 }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{filteredAdminOrders.length}</div>
                <div style={{ fontSize: 10, color: "#8A7C69" }}>Orders</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{totalEggs}</div>
                <div style={{ fontSize: 10, color: "#8A7C69" }}>Eggs</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#4F6A4B" }}>₹{totalCollected}</div>
                <div style={{ fontSize: 10, color: "#8A7C69" }}>Collected</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 10, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#B8452E" }}>₹{totalPending}</div>
                <div style={{ fontSize: 10, color: "#8A7C69" }}>Pending</div>
              </div>
            </div>

            {/* Master Data Table */}
            <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 14, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#FAF6EE", borderBottom: "1.5px solid #E3D9C6", color: "#6B5D4D" }}>
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
                      <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#8A7C69" }}>No orders found matching filters.</td>
                    </tr>
                  ) : (
                    filteredAdminOrders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #F0EAD9" }}>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontSize: 11, color: "#8A7C69" }}>{formatDate(o.ts)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600 }}>{o.name}</div>
                          <div style={{ fontSize: 11, color: "#8A7C69" }}>{o.floor} · {o.mobile}</div>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{o.count}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>₹{o.totalCost}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {editingOrderId === o.id ? (
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <input
                                type="number"
                                style={{ width: 60, padding: 4, fontSize: 12, borderRadius: 6, border: "1px solid #E3D9C6" }}
                                value={manualPaidInput}
                                onChange={(e) => setManualPaidInput(e.target.value)}
                              />
                              <button
                                onClick={() => updateOrderPayment(o.id, manualPaidInput, o.totalCost)}
                                style={{ border: "none", background: "#4F6A4B", color: "#FFF", padding: "4px 8px", borderRadius: 6, fontSize: 11 }}
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 600, color: o.paid ? "#4F6A4B" : "#B8452E" }}>₹{o.amountPaid}</span>
                              <button
                                onClick={() => { setEditingOrderId(o.id); setManualPaidInput(o.amountPaid.toString()); }}
                                style={{ border: "none", background: "none", color: "#8A7C69", padding: 0 }}
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
                              fontWeight: 600,
                              background: o.paid ? "#E8EEE4" : "#F5E3DD",
                              color: o.paid ? "#4F6A4B" : "#B8452E"
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

        <div style={{ textAlign: "center", marginTop: 26, fontSize: 11, color: "#B3A692" }}>
          <FaUtensils size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Egg Counter Realtime Dashboard
        </div>
      </div>
    </div>
  );
}