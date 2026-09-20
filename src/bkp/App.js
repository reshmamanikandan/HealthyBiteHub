import React, { useState, useEffect, useRef } from "react";
import { 
  FaEgg, 
  FaPlus, 
  FaMinus, 
  FaCheck, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaUser, 
  FaSyncAlt, 
  FaUtensils, 
  FaClipboardList, 
  FaTrash 
} from "react-icons/fa";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update, remove } from "firebase/database";

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
  const [view, setView] = useState("order");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [floor, setFloor] = useState("");
  const [mobile, setMobile] = useState("");
  const [count, setCount] = useState(2);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(null);
  const [clearArmed, setClearArmed] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const clearTimer = useRef(null);

  useEffect(() => {
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
      setSubmitError("Please fix the fields marked in red below and tap Place order again.");
      return;
    }
    setSaving(true);
    try {
      const orderData = {
        name: name.trim(),
        floor: floor.trim(),
        mobile: mobile.trim(),
        count,
        delivered: false,
        paid: false,
        ts: Date.now(),
      };
      
      const ordersRef = ref(db, "orders");
      const newOrderRef = await push(ordersRef, orderData);

      setConfirmed({ id: newOrderRef.key, ...orderData });
      setName("");
      setFloor("");
      setMobile("");
      setCount(2);
      setErrors({});
    } catch (e) {
      setSubmitError("Order couldn't be saved. Please check your connection and try again.");
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

  const byFloor = orders.reduce((acc, o) => {
    const k = classForFloorKey(o.floor);
    (acc[k] = acc[k] || []).push(o);
    return acc;
  }, {});
  const floorKeys = Object.keys(byFloor).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const totalEggs = orders.reduce((s, o) => s + o.count, 0);
  const totalDelivered = orders.filter((o) => o.delivered).reduce((s, o) => s + o.count, 0);
  const totalUnpaid = orders.filter((o) => !o.paid).length;

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F2A93B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaEgg size={20} color="#2E2318" />
            </div>
            <div>
              <div className="headline" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>Boiled Egg Counter</div>
              <div style={{ fontSize: 12, color: "#8A7C69" }}>Order by floor, pay after delivery</div>
            </div>
          </div>
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
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8A7C69", fontSize: 14 }}>Loading...</div>
        ) : view === "order" ? (
          confirmed ? (
            <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 16, padding: 28, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E8EEE4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <FaCheck size={26} color="#4F6A4B" />
              </div>
              <div className="headline" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Order placed</div>
              <div style={{ fontSize: 14, color: "#6B5D4D", marginBottom: 20, lineHeight: 1.5 }}>
                {confirmed.count} egg{confirmed.count > 1 ? "s" : ""} for {confirmed.name} on {confirmed.floor}. Pay after your eggs arrive.
              </div>
              <button
                onClick={() => setConfirmed(null)}
                style={{ border: "none", background: "#2E2318", color: "#FAF6EE", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600 }}
              >
                Place another order
              </button>
            </div>
          ) : (
            <form onSubmit={submitOrder} style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 16, padding: 22 }}>
              {submitError && (
                <div style={{ background: "#F5E3DD", border: "1px solid #E0B6A6", color: "#B8452E", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                  {submitError}
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>
                  <FaUser size={14} /> Name
                </div>
                <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                {errors.name && <div style={errorStyle}>{errors.name}</div>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>
                  <FaMapMarkerAlt size={14} /> Floor / location
                </div>
                <input style={inputStyle} value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 3rd floor, west wing" />
                {errors.floor && <div style={errorStyle}>{errors.floor}</div>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={labelStyle}>
                  <FaPhone size={14} /> Mobile number
                </div>
                <input
                  style={inputStyle}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  placeholder="10-digit number"
                  inputMode="numeric"
                />
                {errors.mobile && <div style={errorStyle}>{errors.mobile}</div>}
                <div style={{ fontSize: 11, color: "#8A7C69", marginTop: 4 }}>Used only to collect payment after delivery.</div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={labelStyle}>
                  <FaEgg size={14} /> Number of eggs
                </div>
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
          )
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{totalEggs}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>total eggs</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{totalDelivered}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>delivered</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3D9C6", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: totalUnpaid ? "#B8452E" : "#2E2318" }}>{totalUnpaid}</div>
                <div style={{ fontSize: 11, color: "#8A7C69" }}>unpaid orders</div>
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
                <div style={{ fontSize: 14 }}>No orders yet. Share the QR code to get started.</div>
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
                      <div style={{ fontSize: 12, color: "#8A7C69" }}>{floorTotal} egg{floorTotal > 1 ? "s" : ""}</div>
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
                              {o.name} <span style={{ color: "#8A7C69", fontWeight: 500 }}>· {o.count} egg{o.count > 1 ? "s" : ""}</span>
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
          Orders sync automatically for everyone with this link
        </div>
      </div>
    </div>
  );
}