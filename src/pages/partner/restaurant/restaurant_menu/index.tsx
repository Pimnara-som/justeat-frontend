import React, { useRef, useState, useEffect } from "react";
import { FaCamera } from "react-icons/fa";
import "./index.css";

type MenuType = "เมนูหลัก" | "ของทานเล่น" | "ของหวาน" | "เครื่องดื่ม";
type SizeType = "S" | "M" | "L";
type SpicyType = "ไม่เผ็ด" | "เผ็ดน้อย" | "เผ็ดกลาง" | "เผ็ดมาก";
type MenuStatus = "พร้อมขาย" | "หมดชั่วคราว";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  detail?: string;
  type: MenuType;
  size: SizeType;
  spicy?: SpicyType | null;
  toppings: string[];
  toppingLimit: number;
  toppingMin: number;
  image?: string | null; // DataURL
  status: MenuStatus;
}

interface CreateMenuDTO {
  menuName: string;
  detail: string;
  price: number;
  menuTypeId: number;
  menuStatusId: number;
  picture?: string | null; // DataURL
  size: SizeType;
  spicy?: SpicyType | "";
  minSelect: number;
  maxSelect: number;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const RESTAURANT_ID = Number(import.meta.env.VITE_RESTAURANT_ID || 1);
const getToken = () => localStorage.getItem("token") || ""; // ต้องเซ็ตหลัง /auth/login

// map ชื่อ ↔︎ id
const menuTypeToId: Record<MenuType, number> = {
  "เครื่องดื่ม": 1,
  "เมนูหลัก": 2,
  "ของทานเล่น": 3,
  "ของหวาน": 4,
};
const idToMenuType: Record<number, MenuType> = {
  1: "เครื่องดื่ม",
  2: "เมนูหลัก",
  3: "ของทานเล่น",
  4: "ของหวาน",
};

const statusToId: Record<MenuStatus, number> = { "พร้อมขาย": 1, "หมดชั่วคราว": 2 };
const idToStatus: Record<number, MenuStatus> = { 1: "พร้อมขาย", 2: "หมดชั่วคราว" };

export default function MenuManagementUI() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [detail, setDetail] = useState<string>("");
  const [type, setType] = useState<MenuType>("เมนูหลัก");
  const [size, setSize] = useState<SizeType>("M");
  const [spicy, setSpicy] = useState<SpicyType | "">("ไม่เผ็ด");
  const [toppings, setToppings] = useState<string[]>([]);
  const [newTopping, setNewTopping] = useState("");
  const [toppingLimit, setToppingLimit] = useState<number>(1);
  const [toppingMin, setToppingMin] = useState<number>(0);
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<MenuStatus>("พร้อมขาย");

  const detailRef = useRef<HTMLTextAreaElement | null>(null);
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
  };

  // ------- API helpers -------
  const listMenus = async () => {
    const res = await fetch(`${API_BASE}/restaurants/${RESTAURANT_ID}/menus`);
    const data = await res.json();
    const items: MenuItem[] = (data.items || []).map((m: any) => ({
      id: m.ID ?? m.id,
      name: m.menuName,
      price: m.price,
      detail: m.detail,
      type: idToMenuType[m.menuTypeId] ?? "เมนูหลัก",
      size: "M", // ขนาด/เผ็ด/ท็อปปิ้งไม่ได้ส่งกลับใน list ตอนนี้ → ใส่ default
      spicy: "ไม่เผ็ด",
      toppings: [],
      toppingLimit: 1,
      toppingMin: 0,
      image: m.picture || null,
      status: idToStatus[m.menuStatusId] ?? "พร้อมขาย",
    }));
    setMenus(items);
  };

  const createMenu = async (dto: CreateMenuDTO) => {
    const res = await fetch(`${API_BASE}/owner/restaurants/${RESTAURANT_ID}/menus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const updateMenu = async (id: number, dto: CreateMenuDTO) => {
    const res = await fetch(`${API_BASE}/owner/menus/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const deleteMenu = async (id: number) => {
    const res = await fetch(`${API_BASE}/owner/menus/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error(await res.text());
  };

  useEffect(() => {
    listMenus().catch(console.error);
  }, []);

  // ------- UI logic -------
  const resetForm = () => {
    setName("");
    setPrice("");
    setDetail("");
    setType("เมนูหลัก");
    setSize("M");
    setSpicy("ไม่เผ็ด");
    setToppings([]);
    setNewTopping("");
    setToppingLimit(1);
    setToppingMin(0);
    setImage(null);
    setEditingId(null);
    setStatus("พร้อมขาย");
    if (detailRef.current) detailRef.current.style.height = "auto";
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (menu: MenuItem) => {
    setEditingId(menu.id);
    setName(menu.name);
    setPrice(menu.price);
    setDetail(menu.detail ?? "");
    setType(menu.type);
    setSize(menu.size);
    setSpicy(menu.spicy ?? "");
    setToppings([...menu.toppings]);
    setToppingLimit(menu.toppingLimit);
    setToppingMin(menu.toppingMin ?? 0);
    setImage(menu.image ?? null);
    setStatus(menu.status);
    setShowForm(true);
    setTimeout(() => {
      if (detailRef.current) autoResize(detailRef.current);
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string); // DataURL
    reader.readAsDataURL(file);
  };

  const handleAddTopping = () => {
    if (!newTopping.trim()) return;
    if (toppings.length >= 20) return;
    setToppings((t) => [...t, newTopping.trim()]);
    setNewTopping("");
  };

  const handleRemoveTopping = (index: number) => {
    setToppings((t) => t.filter((_, i) => i !== index));
  };

  const handleUpdateTopping = (index: number, value: string) => {
    setToppings((t) => t.map((it, i) => (i === index ? value : it)));
  };

  const validateForm = () => {
    if (!name.trim()) return false;
    if (price === "" || Number.isNaN(Number(price))) return false;
    if (!["S", "M", "L"].includes(size)) return false;
    if ((type === "เมนูหลัก" || type === "ของทานเล่น") && !spicy) return false;
    if (!Number.isFinite(toppingLimit) || toppingLimit < 1) return false;
    if (!Number.isFinite(toppingMin) || toppingMin < 0) return false;
    if (toppingMin > toppingLimit) return false;
    return true;
  };

  const toDTO = (): CreateMenuDTO => ({
    menuName: name.trim(),
    detail: detail.trim(),
    price: Number(price),
    menuTypeId: menuTypeToId[type],
    menuStatusId: statusToId[status],
    picture: image || null, // DataURL → backend จะ decode เป็น BLOB
    size,
    spicy: type === "เมนูหลัก" || type === "ของทานเล่น" ? (spicy as SpicyType) : "",
    minSelect: toppingMin,
    maxSelect: toppingLimit,
  });

  const handleSave = async () => {
    if (!validateForm()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน และตั้งค่าเงื่อนไขให้ถูกต้อง");
      return;
    }
    try {
      const dto = toDTO();
      if (editingId) {
        await updateMenu(editingId, dto);
        setMenus((m) =>
          m.map((it) =>
            it.id === editingId
              ? {
                  ...it,
                  name,
                  price: Number(price),
                  detail: detail.trim(),
                  type,
                  size,
                  spicy: type === "เมนูหลัก" || type === "ของทานเล่น" ? (spicy as SpicyType) : undefined,
                  toppings: [...toppings],
                  toppingLimit,
                  toppingMin,
                  image,
                  status,
                }
              : it
          )
        );
      } else {
        const created = await createMenu(dto);
        const newItem: MenuItem = {
          id: created.id ?? created.ID,
          name: name.trim(),
          price: Number(price),
          detail: detail.trim() || undefined,
          type,
          size,
          spicy: type === "เมนูหลัก" || type === "ของทานเล่น" ? (spicy as SpicyType) : undefined,
          toppings: [...toppings],
          toppingLimit,
          toppingMin,
          image,
          status,
        };
        setMenus((m) => [newItem, ...m]);
      }
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      alert(e?.message || "บันทึกไม่สำเร็จ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("ต้องการลบเมนูนี้หรือไม่?")) return;
    try {
      await deleteMenu(id);
      setMenus((m) => m.filter((it) => it.id !== id));
    } catch (e: any) {
      alert(e?.message || "ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="menu-management-container">
      <div className="header-section">
        <h1 className="main-title">จัดการเมนูอาหาร</h1>
        <button onClick={openAddForm} className="add-menu-button">
          เพิ่มเมนูใหม่
        </button>
      </div>

      {menus.length === 0 ? (
        <div className="empty-state-card">
          <p className="empty-message">ไม่พบเมนูอาหาร</p>
        </div>
      ) : (
        <div className="menu-grid">
          {menus.map((menu) => (
            <div key={menu.id} className="menu-card">
              <div className="menu-image-container">
                {menu.image ? (
                  <img src={menu.image} alt={menu.name} className="menu-image" />
                ) : (
                  <div className="no-image-placeholder">no image</div>
                )}
              </div>
              <div className="menu-details">
                <div className="menu-header">
                  <div>
                    <h3 className="menu-name">{menu.name}</h3>
                    <div className="menu-price">{menu.price.toLocaleString()} บาท</div>
                    <div className="menu-price" style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>
                      {menu.detail || "-"}
                    </div>
                  </div>
                  <div className="menu-actions">
                    <button onClick={() => openEditForm(menu)} className="edit-button">
                      แก้ไข
                    </button>
                    <button onClick={() => handleDelete(menu.id)} className="delete-button">
                      ลบ
                    </button>
                  </div>
                </div>

                <div className="menu-info-section">
                  <div>ประเภท: {menu.type}</div>
                  <div>ขนาด: {menu.size}</div>
                  {(menu.type === "เมนูหลัก" || menu.type === "ของทานเล่น") && <div>ระดับความเผ็ด: {menu.spicy}</div>}
                  <div>
                    ท็อปปิ้ง: {menu.toppings.length ? menu.toppings.join(", ") : "-"} (อย่างน้อย {menu.toppingMin} สูงสุด {menu.toppingLimit})
                  </div>
                  <div>สถานะ: {menu.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="form-modal-backdrop">
          <div className="form-modal-panel">
            <div className="form-header">
              <h2 className="form-title">{editingId ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="close-button">
                ปิด
              </button>
            </div>

            <div className="form-content">
              <div>
                <label className="form-label">ชื่อเมนู</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ใส่ชื่อเมนู"
                  value={name}
                  size={48}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">รายละเอียดเมนู</label>
                <textarea
                  ref={detailRef}
                  className="form-input"
                  rows={4}
                  placeholder="เช่น วัตถุดิบ จุดเด่น หรือหมายเหตุหลายบรรทัด"
                  value={detail}
                  onChange={(e) => {
                    setDetail(e.target.value);
                    if (detailRef.current) autoResize(detailRef.current);
                  }}
                  style={{ resize: "vertical", overflow: "hidden" }}
                />
              </div>

              <div>
                <label className="form-label">ราคา</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="ใส่ราคา"
                  value={price === "" ? "" : String(price)}
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="form-label">ประเภทอาหาร</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value as MenuType)}>
                  <option>เมนูหลัก</option>
                  <option>ของทานเล่น</option>
                  <option>ของหวาน</option>
                  <option>เครื่องดื่ม</option>
                </select>
              </div>

              <div>
                <label className="form-label">ขนาด</label>
                <div className="form-radio-group">
                  {(["S", "M", "L"] as SizeType[]).map((s) => (
                    <label key={s} className="form-radio-label">
                      <input type="radio" name="size" checked={size === s} onChange={() => setSize(s)} /> {s}
                    </label>
                  ))}
                </div>
              </div>

              {(type === "เมนูหลัก" || type === "ของทานเล่น") && (
                <div>
                  <label className="form-label">ระดับความเผ็ด</label>
                  <div className="form-radio-group">
                    {(["ไม่เผ็ด", "เผ็ดน้อย", "เผ็ดกลาง", "เผ็ดมาก"] as SpicyType[]).map((sp) => (
                      <label key={sp} className="form-radio-label">
                        <input type="radio" name="spicy" checked={spicy === sp} onChange={() => setSpicy(sp)} /> {sp}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">สถานะเมนู</label>
                <div className="form-radio-group">
                  {(["พร้อมขาย", "หมดชั่วคราว"] as MenuStatus[]).map((st) => (
                    <label key={st} className="form-radio-label">
                      <input type="radio" name="menu-status" checked={status === st} onChange={() => setStatus(st)} /> {st}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">ท็อปปิ้ง</label>
                <div className="topping-input-group">
                  <input
                    className="form-input topping-input"
                    placeholder="ชื่อท็อปปิ้ง"
                    value={newTopping}
                    onChange={(e) => setNewTopping(e.target.value)}
                  />
                  <button onClick={handleAddTopping} className="add-topping-button">
                    เพิ่ม
                  </button>
                </div>

                <div className="topping-limit-group" style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label className="topping-limit-label" style={{ minWidth: 210 }}>
                      จำนวนท็อปปิ้งขั้นต่ำที่ลูกค้าต้องเลือก:
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="topping-limit-input"
                      value={toppingMin}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setToppingMin(Math.min(v, toppingLimit));
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label className="topping-limit-label" style={{ minWidth: 210 }}>
                      จำนวนท็อปปิ้งสูงสุดที่ลูกค้าสามารถเลือกได้:
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="topping-limit-input"
                      value={toppingLimit}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value) || 1);
                        setToppingLimit(v);
                        setToppingMin((prev) => Math.min(prev, v));
                      }}
                    />
                  </div>
                </div>

                <ul className="topping-list">
                  {toppings.map((t, idx) => (
                    <li key={idx} className="topping-item">
                      <input className="form-input topping-item-input" value={t} onChange={(e) => handleUpdateTopping(idx, e.target.value)} />
                      <button onClick={() => handleRemoveTopping(idx)} className="remove-topping-button">
                        ลบ
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="form-label">รูปภาพเมนู</label>
                <label className="image-upload-label">
                  <FaCamera className="camera-icon" />
                  <span>คลิกเพื่ออัปโหลด</span>
                  <input type="file" accept="image/*" className="image-upload-input" onChange={handleImageUpload} />
                </label>
                {image && <img src={image} alt="preview" className="image-preview" />}
              </div>

              <div className="form-actions">
                <button onClick={() => { setShowForm(false); resetForm(); }} className="cancel-button">
                  ยกเลิก
                </button>
                <button onClick={handleSave} className="save-button">
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
