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
  FaClipboardList, 
  FaTrash,
  FaQrcode,
  FaWallet,
  FaLock
} from "react-icons/fa";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update, remove } from "firebase/database";

// Configuration
const EGG_PRICE = 10; // Price per egg in INR
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
.egg-app input:focus { outline:none; border-color:#D98D1B !important; box-shadow:0 0 0 3px rgba(242,169,59,0.25); }
.egg-app button { font-family:'Work Sans', sans-serif; cursor:pointer; }
.egg-app ::placeholder { color:#B3A692; }
`;

function classForFloorKey(k) {
  return k || "Unspecified";
}

export default function EggOrderApp() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("order"); // 'order' or 'kitchen'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User Form
  const [name, setName] = useState("");
  const [floor, setFloor] = useState("");
  const [mobile, setMobile] = useState("");
  const [count, setCount] = useState(2);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(null);
  
  // User Lookup
  const [userSearchMobile, setUserSearchMobile] = useState("");
  const [userOrders, setUserOrders] = useState([]);

  // Admin Controls
  const [clearArmed, setClearArmed] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const clearTimer = useRef(null);

  useEffect(() => {
    // Check URL parameters for Admin Access (e.g. site.com/?admin=true)
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "true") {
      setIsAdmin(true);
    }

    const ordersRef = ref(db, "orders");
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
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

  // Update personal user orders when mobile search or global orders change
  useEffect(() => {
    if (userSearchMobile.length === 10) {
      setUserOrders(orders.filter((o) => o.mobile === userSearchMobile));
    } else {
      setUserOrders([]);
    }
  }, [userSearchMobile, orders]);

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
      setSubmitError("Please fix the fields marked in red below.");
      return;
    }
    setSaving(true);
    try {
      const orderData = {
        name: name.trim(),
        floor: floor.trim(),
        mobile: mobile.trim(),
        count,
        price: count * EGG_PRICE,
        delivered: false,
        paid: false,
        ts: Date.now(),
      };
      
      const ordersRef = ref(db, "orders");
      const newOrderRef = await push(ordersRef, orderData);

      setConfirmed({ id: newOrderRef.key, ...orderData });
      setUserSearchMobile(mobile.trim());
      setName("");
      setFloor("");
      setMobile("");
      setCount(2);
      setErrors({});
    } catch (e) {
      setSubmitError("Order couldn't be saved. Check connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (id, field) => {
    const currentOrder = orders.find((o) => o.id === id);
    if (!currentOrder) return;
    
    try {
      const orderRef = ref(db, `orders/${id}`);
      await update(orderRef, {
        [field]: !currentOrder[field],
      });
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const requestClear = async () => {
    if (clearArmed) {
      try {
        const ordersRef = ref(db, "orders");
        await remove(ordersRef);
      } catch (e) {
        console.error("Failed to clear database:", e);
      }
      setClearArmed(false);
      if (clearTimer.current) clearTimeout(clearTimer.current);
      return;
    }
    setClearArmed(true);
    clearTimer.current = setTimeout(() => setClearArmed(false), 3000);
  };

  // Aggregation Logic
  const byFloor = orders.reduce((acc, o) => {
    const k = classForFloorKey(o.floor);
    (acc[k] = acc[k] || []).push(o);
    return acc;
  }, {});
  const floorKeys = Object.keys(byFloor).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const totalEggs = orders.reduce((s, o) => s + o.count, 0);
  const totalRevenue = orders.reduce((s, o) => s + (o.count * EGG_PRICE), 0);
  const totalPaidAmount = orders.filter((o) => o.paid).reduce((s, o) => s + (o.count * EGG_PRICE), 0);
  const totalUnpaidAmount = totalRevenue - totalPaidAmount;

  // Personal user totals
  const userUnpaidTotal = userOrders.filter(o => !o.paid).reduce((s, o) => s + (o.count * EGG_PRICE), 0);
  const userPaidTotal = userOrders.filter(o => o.paid).reduce((s, o) => s + (o.count * EGG_PRICE), 0);

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

  return (
    <div className="egg-app" style={{ padding: "0 0 40px" }}>
      <style>{FONT_STYLE}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 0" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F2A93B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaEgg size={20} color="#2E2318" />
            </div>
            <div>
              <div className="headline" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>Boiled Egg Counter</div>
              <div style={{ fontSize: 12, color: "#8A7C69" }}>₹{EGG_PRICE}/egg · Pay after delivery</div>
            </div>
          </div>

          {/* Render navigation tabs ONLY if user is Admin */}
          {isAdmin && (
            <div style={{ display: "flex", background: "#EFE7D6", borderRadius: 10, padding: 3, gap: 2 }}>
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
                Order
              </button>
              <button
                onClick={() => setView("kitchen")}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: view === "kitchen" ? "#FFFFFF" : "transparent",
                  color: view === "kitchen" ? "#2E2318" : "#8A7C69",
                }}
              >
                Kitchen
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8A7C69", fontSize: 14 }}>Loading...</div>
        ) : view === "order" || !isAdmin ? (
          <div>
            {/* User Order Form / Confirmation */}
            {confirmed ? (
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E8EEE4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <FaCheck size={26} color="#4F6A4B" />
                </div>
                <div className="headline" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Order placed!</div>
                <div style={{ fontSize: 14, color: "#6B5D4D", marginBottom: 12, lineHeight: 1.5 }}>
                  {confirmed.count} egg{confirmed.count > 1 ? "s" : ""} (₹{confirmed.count * EGG_PRICE}) for {confirmed.name} on {confirmed.floor}.
                </div>
                <div style={{ fontSize: 12, color: "#8A7C69", marginBottom: 20 }}>
                  You can pay via UPI on this page once delivered.
                </div>
                <button
                  onClick={() => setConfirmed(null)}
                  style={{ border: "none", background: "#2E2318", color: "#FAF6EE", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
                >
                  Place another order
                </button>
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
                  <input style={inputStyle} value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 3rd floor, west wing" />
                  {errors.floor && <div style={errorStyle}>{errors.floor}</div>}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={labelStyle}><FaPhone size={14} /> Mobile Number</div>
                  <input
                    style={inputStyle}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    placeholder="10-digit number"
                    inputMode="numeric"
                  />
                  {errors.mobile && <div style={errorStyle}>{errors.mobile}</div>}
                </div>

                <div style={{ marginBottom: 22 }}>
                  <div style={labelStyle}><FaEgg size={14} /> Number of eggs (₹{EGG_PRICE} each)</div>
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
                  {saving ? "Placing order..." : "Place order"}
                </button>
              </form>
            )}

            {/* User Dashboard & Status Lookup */}
            <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 16, padding: 20 }}>
              <div className="headline" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <FaWallet size={16} /> My Orders & Payment Status
              </div>
              <input
                style={{ ...inputStyle, marginBottom: 14 }}
                value={userSearchMobile}
                onChange={(e) => setUserSearchMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                placeholder="Enter mobile number to view status"
                inputMode="numeric"
              />

              {userSearchMobile.length === 10 && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    <div style={{ background: "#FAF6EE", padding: 12, borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#B8452E" }}>₹{userUnpaidTotal}</div>
                      <div style={{ fontSize: 11, color: "#8A7C69" }}>Unpaid Balance</div>
                    </div>
                    <div style={{ background: "#FAF6EE", padding: 12, borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#4F6A4B" }}>₹{userPaidTotal}</div>
                      <div style={{ fontSize: 11, color: "#8A7C69" }}>Paid Amount</div>
                    </div>
                  </div>

                  {userOrders.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#8A7C69", textAlign: "center", padding: "10px 0" }}>
                      No orders found for this mobile number.
                    </div>
                  ) : (
                    userOrders.map((o) => {
                      const amount = o.count * EGG_PRICE;
                      const upiUrl = `upi://pay?pa=${ADMIN_UPI_ID}&pn=EggCounter&am=${amount}&cu=INR`;

                      return (
                        <div key={o.id} style={{ borderTop: "1px solid #F0EAD9", padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{o.count} Egg{o.count > 1 ? "s" : ""} (₹{amount})</div>
                            <div style={{ fontSize: 12, color: "#8A7C69" }}>
                              Status: {o.delivered ? "Delivered" : "Preparing"}
                            </div>
                          </div>

                          {o.paid ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#4F6A4B", background: "#E8EEE4", padding: "5px 10px", borderRadius: 8 }}>
                              Paid
                            </span>
                          ) : o.delivered ? (
                            <a
                              href={upiUrl}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "#2E2318",
                                color: "#FAF6EE",
                                padding: "7px 12px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: "none"
                              }}
                            >
                              <FaQrcode size={12} /> Pay ₹{amount}
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "#8A7C69", background: "#FAF6EE", padding: "5px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4 }}>
                              <FaLock size={10} /> Pay on delivery
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Kitchen / Admin View */
          <div>
            {/* Admin Overview Dashboard */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{totalEggs}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>Total Eggs</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4F6A4B" }}>₹{totalPaidAmount}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>Total Paid</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: totalUnpaidAmount ? "#B8452E" : "#2E2318" }}>₹{totalUnpaidAmount}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>Unpaid Balance</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
              {orders.length > 0 && (
                <button
                  onClick={requestClear}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    border: "1.5px solid " + (clearArmed ? "#B8452E" : "#E3D9C6"),
                    background: clearArmed ? "#F5E3DD" : "#FFFFFF",
                    borderRadius: 9,
                    padding: "7px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: clearArmed ? "#B8452E" : "#6B5D4D",
                  }}
                >
                  <FaTrash size={12} /> {clearArmed ? "Tap again to confirm" : "Start new day"}
                </button>
              )}
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#8A7C69" }}>
                <FaClipboardList size={30} style={{ marginBottom: 10, opacity: 0.5 }} />
                <div style={{ fontSize: 14 }}>No orders yet.</div>
              </div>
            ) : (
              floorKeys.map((fk) => {
                const list = byFloor[fk].slice().sort((a, b) => a.ts - b.ts);
                const floorTotal = list.reduce((s, o) => s + o.count, 0);
                return (
                  <div key={fk} style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
                      <div className="headline" style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        <FaMapMarkerAlt size={13} /> {fk}
                      </div>
                      <div style={{ fontSize: 12, color: "#8A7C69" }}>{floorTotal} egg{floorTotal > 1 ? "s" : ""} (₹{floorTotal * EGG_PRICE})</div>
                    </div>
                    <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, overflow: "hidden" }}>
                      {list.map((o, idx) => (
                        <div
                          key={o.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "12px 14px",
                            borderTop: idx === 0 ? "none" : "1px solid #F0EAD9",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {o.name} <span style={{ color: "#8A7C69", fontWeight: 500 }}>· {o.count} egg{o.count > 1 ? "s" : ""} (₹{o.count * EGG_PRICE})</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#8A7C69" }}>{o.mobile}</div>
                          </div>
                          <button
                            onClick={() => toggleField(o.id, "delivered")}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1.5px solid " + (o.delivered ? "#6F8F6B" : "#E3D9C6"),
                              background: o.delivered ? "#E8EEE4" : "#FAF6EE",
                              color: o.delivered ? "#4F6A4B" : "#8A7C69",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {o.delivered ? "Delivered" : "Mark delivered"}
                          </button>
                          <button
                            onClick={() => toggleField(o.id, "paid")}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1.5px solid " + (o.paid ? "#D98D1B" : "#E3D9C6"),
                              background: o.paid ? "#FBEBD2" : "#FAF6EE",
                              color: o.paid ? "#8A5B0B" : "#8A7C69",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {o.paid ? "Paid" : "Mark paid"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 26, fontSize: 11, color: "#B3A692" }}>
          <FaUtensils size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Orders sync automatically in real-time
        </div>
      </div>
    </div>
  );
}