import { useEffect, useMemo, useState } from "react";
import "./PromotionPage.css";
import discount from "../assets/discount.jpg";
import percent from "../assets/percent.jpg";

// ===== API bases =====
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const PROMO_API = `${API_BASE}/promotions`;
const SAVE_API = `${API_BASE}/user/promotions`;
const ME_API = `${API_BASE}/auth/me`;

// token ที่อาจถูกเก็บไว้หลังล็อกอิน
const TOKEN_KEYS: readonly string[] = ["access_token", "token"];
function getToken(): string | null {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}

// ===== localStorage global keys (ของเก่า) =====
const LEGACY_IDS_KEY = "promo.savedIds";
const LEGACY_LIST_KEY = "promo.savedList";

// ===== helper: สร้างคีย์ตามผู้ใช้ =====
function userKeyFromId(id?: number) {
  return id ? `user:${id}` : "user:guest";
}
function lsKeysForUser(userKey: string) {
  return {
    ids: `promo.savedIds.${userKey}`,
    list: `promo.savedList.${userKey}`,
  };
}

// ===== ชนิดข้อมูลจาก API =====
interface PromoAPI {
  id?: number;
  ID?: number;
  promoCode: string;
  promoDetail: string;
  values: number;
  minOrder: number;
  startAt: string | null;
  endAt: string | null;
  promoTypeId: number; // 1 = ค่าคงที่, 2 = เปอร์เซ็นต์
}

interface UserPromotionRow {
  id?: number;
  userId?: number;
  promoId?: number;        // backend แบบเก่า
  promotionId?: number;    // backend แบบใหม่
  Promotion?: PromoAPI;    // ถ้า preload มา
}

// /auth/me response
interface MeResponse {
  id?: number;
  ID?: number;
  email?: string;
  role?: string;
}

// ===== รูปภาพตามประเภทโปร =====
const TYPE_IMAGES: Record<number, string> = {
 1: discount, 
  2: percent,
};

// ===== helpers =====
function formatDate(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso ?? "";
  }
}

function normalize(promos: any[]): PromoAPI[] {
  return promos.map((x) => ({
    id: x.id ?? x.ID,
    ID: x.ID,
    promoCode: x.promoCode,
    promoDetail: x.promoDetail,
    values: Number(x.values),
    minOrder: Number(x.minOrder),
    startAt: x.startAt ?? x.start_at ?? null,
    endAt: x.endAt ?? x.end_at ?? null,
    promoTypeId: Number(x.promoTypeId ?? x.promo_type_id ?? 1),
  })) as PromoAPI[];
}

function loadSavedFromLocal(userKey: string): { ids: Set<number>; list: PromoAPI[] } {
  try {
    const { ids: idsKey, list: listKey } = lsKeysForUser(userKey);
    const rawIds = localStorage.getItem(idsKey);
    const rawList = localStorage.getItem(listKey);
    const idsArr: number[] = rawIds ? JSON.parse(rawIds) : [];
    const list: PromoAPI[] = rawList ? JSON.parse(rawList) : [];
    return { ids: new Set(idsArr), list: Array.isArray(list) ? list : [] };
  } catch {
    return { ids: new Set<number>(), list: [] };
  }
}

function saveSavedToLocal(userKey: string, ids: Set<number>, list: PromoAPI[]) {
  try {
    const { ids: idsKey, list: listKey } = lsKeysForUser(userKey);
    localStorage.setItem(idsKey, JSON.stringify(Array.from(ids)));
    localStorage.setItem(listKey, JSON.stringify(list));
  } catch {
    // ignore
  }
}

// ย้ายค่าจากคีย์เก่าที่ยังไม่ผูกผู้ใช้ → คีย์ของ userKey ปัจจุบัน
function migrateLegacyToUser(userKey: string) {
  try {
    const rawLegacyIds = localStorage.getItem(LEGACY_IDS_KEY);
    const rawLegacyList = localStorage.getItem(LEGACY_LIST_KEY);
    if (!rawLegacyIds && !rawLegacyList) return;

    const legacyIds: number[] = rawLegacyIds ? JSON.parse(rawLegacyIds) : [];
    const legacyList: PromoAPI[] = rawLegacyList ? JSON.parse(rawLegacyList) : [];

    const current = loadSavedFromLocal(userKey);
    const mergedIds = new Set<number>([...Array.from(current.ids), ...legacyIds]);
    const mergedList = [...current.list];

    legacyList.forEach((p) => {
      const id = p.id ?? p.ID;
      if (id && !mergedList.some((x) => (x.id ?? x.ID) === id)) {
        mergedList.push(p);
      }
    });

    saveSavedToLocal(userKey, mergedIds, mergedList);

    // ลบของเก่า
    localStorage.removeItem(LEGACY_IDS_KEY);
    localStorage.removeItem(LEGACY_LIST_KEY);
  } catch {
    // ignore
  }
}

// ===== main component =====
export default function PromotionsPage() {
  const [promos, setPromos] = useState<PromoAPI[]>([]);

  // ระบุผู้ใช้ปัจจุบัน
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [userKey, setUserKey] = useState<string>(userKeyFromId(undefined));

  // สำหรับเช็คสถานะปุ่ม “เก็บแล้ว”
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  // สำหรับ modal “ดูที่เก็บไว้”
  const [savedList, setSavedList] = useState<PromoAPI[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  const token = getToken();
  const isLoggedIn = !!token;

  // ---------- ดึงผู้ใช้ปัจจุบัน ----------
  useEffect(() => {
    (async () => {
      if (!isLoggedIn) {
        setUserId(undefined);
        setUserKey(userKeyFromId(undefined)); // user:guest
        return;
      }
      try {
        const res = await fetch(ME_API, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          setUserId(undefined);
          setUserKey(userKeyFromId(undefined));
          return;
        }
        const me: MeResponse = await res.json();
        const id = me.id ?? me.ID;
        setUserId(id);
        setUserKey(userKeyFromId(id));
      } catch {
        setUserId(undefined);
        setUserKey(userKeyFromId(undefined));
      }
    })();
  }, [isLoggedIn, token]);

  // ---------- โหลดโปรทั้งหมด (public) ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(PROMO_API);
        if (!res.ok) {
          console.warn("fetch promotions failed:", res.status);
          setPromos([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
        setPromos(normalize(list));
      } catch (e) {
        console.error("fetch promos failed:", e);
        setPromos([]);
      }
    })();
  }, []);

  // ---------- เมื่อ userKey หรือสถานะล็อกอินเปลี่ยน ----------
  useEffect(() => {
    // ถ้ายังไม่ล็อกอิน: ห้ามมี "ที่เก็บไว้"
    if (!isLoggedIn) {
      setSavedIds(new Set());
      setSavedList([]);
      return;
    }
    // ล็อกอินแล้ว: migrate + โหลด local ของ user นี้
    migrateLegacyToUser(userKey);
    const { ids, list } = loadSavedFromLocal(userKey);
    setSavedIds(ids);
    setSavedList(list);
  }, [userKey, isLoggedIn]);

  // ---------- โหลด/ซิงก์ “ที่เก็บไว้” ของผู้ใช้จากแบ็กเอนด์ ----------
  async function refreshSaved() {
    if (!isLoggedIn) return; // ไม่ล็อกอิน ไม่แตะอะไร

    try {
      const res = await fetch(SAVE_API, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        console.warn("fetch user saved promos failed:", res.status);
        return;
      }
      const rows: UserPromotionRow[] = await res.json();

      // ถ้าแบ็กเอนด์ว่าง: ผู้ใช้นี้ยังไม่มีของที่เก็บไว้ → ล้าง state และ localStorage
      if (!Array.isArray(rows) || rows.length === 0) {
        const empty = new Set<number>();
        setSavedIds(empty);
        setSavedList([]);
        saveSavedToLocal(userKey, empty, []);
        return;
      }

      const ids = new Set<number>();
      const listForModal: PromoAPI[] = [];

      for (const r of rows) {
        const pid =
          r.promoId ??
          r.promotionId ??
          r.Promotion?.id ??
          r.Promotion?.ID;

        if (pid) ids.add(pid);

        if (r.Promotion) {
          listForModal.push(normalize([r.Promotion])[0]);
        } else {
          const fallbackPid = r.promoId ?? r.promotionId;
          if (fallbackPid) {
            const found = promos.find((p) => (p.id ?? p.ID) === fallbackPid);
            if (found) listForModal.push(found);
          }
        }
      }

      setSavedIds(ids);
      setSavedList(listForModal);
      saveSavedToLocal(userKey, ids, listForModal);
    } catch (e) {
      console.warn("fetch user saved promos failed:", e);
    }
  }

  // ---------- เรียก refreshSaved เมื่อรู้ userKey/โปรโหลดเสร็จ ----------
  useEffect(() => {
    refreshSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey, promos.length]);

  const isSaved = useMemo(
    () => (promoId?: number) => (promoId ? savedIds.has(promoId) : false),
    [savedIds]
  );

  // ---------- กด “+ เก็บโปรนี้” ----------
  const handleSave = async (p: PromoAPI) => {
    const id = p.id ?? p.ID;
    if (!id) return;

    if (!isLoggedIn) {
      if (confirm("ต้องเข้าสู่ระบบเพื่อเก็บโปรโมชัน ไปหน้าเข้าสู่ระบบหรือไม่?")) {
        window.location.href = "/login";
      }
      return;
    }

    if (isSaved(id)) return;

    try {
      const res = await fetch(SAVE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ promoId: id, promotionId: id }),
      });

      if (res.status === 401 || res.status === 403) {
        if (confirm("เซสชันหมดอายุ/ยังไม่เข้าสู่ระบบ ไปหน้าเข้าสู่ระบบหรือไม่?")) {
          window.location.href = "/login";
        }
        return;
      }

      // 409 = เก็บซ้ำ → ถือว่าเก็บแล้ว (อัปเดต state ฝั่งหน้าเว็บ)
      if (res.status === 409 || res.ok) {
        const nextIds = new Set(savedIds);
        nextIds.add(id);
        const nextList = savedList.some((x) => (x.id ?? x.ID) === id) ? savedList : [...savedList, p];
        setSavedIds(nextIds);
        setSavedList(nextList);
        saveSavedToLocal(userKey, nextIds, nextList);
        return;
      }

      const msg = await res.text();
      alert(`บันทึกไม่สำเร็จ: ${msg}`);
    } catch (e) {
      console.error("save promo failed:", e);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  // ---------- เปิด modal “ดูที่เก็บไว้” ----------
  const openSaved = () => {
    if (!isLoggedIn) {
      if (confirm("ต้องเข้าสู่ระบบเพื่อดูรายการที่เก็บไว้ ไปหน้าเข้าสู่ระบบหรือไม่?")) {
        window.location.href = "/login";
      }
      return;
    }
    setShowSaved(true);
  };

  return (
    <div className="promotions-page-container">
      {/* Header */}
      <header className="promotions-header">
        <div className="header-content">
          <h1 className="header-title">โปรโมชั่น</h1>

          {isLoggedIn ? (
            <button onClick={openSaved} className="saved-button" title="ดูที่เก็บไว้">
              ดูที่เก็บไว้ ({savedList.length})
            </button>
          ) : (
            <button onClick={openSaved} className="saved-button saved-button--login" title="เข้าสู่ระบบเพื่อดูที่เก็บไว้">
              เข้าสู่ระบบเพื่อดูที่เก็บไว้
            </button>
          )}
        </div>
      </header>

      {/* Grid of promotions */}
      <main className="promotions-grid">
        {promos.length === 0 && <div className="no-promos-found">ยังไม่มีโปรโมชั่น</div>}

        {promos.map((p) => {
          const id = p.id ?? p.ID!;
          const img = TYPE_IMAGES[p.promoTypeId] ?? TYPE_IMAGES[1];

          return (
            <article key={id} className="promo-card">
              <div className="promo-image-container">
                <img src={img} alt={p.promoCode} className="promo-image" loading="lazy" />
              </div>

              <div className="promo-details">
                <div className="promo-title-and-description">
                  <div>
                    <h2 className="promo-title">{p.promoCode}</h2>
                    <p className="promo-description">{p.promoDetail}</p>
                  </div>
                </div>

                <div className="promo-info-row">
                  <div className="promo-expiry">{p.endAt ? `หมดเขต ${formatDate(p.endAt)}` : ""}</div>
                </div>

                <div className="promo-action-area">
                  <button
                    className={`save-button ${isSaved(id) ? "saved" : ""}`}
                    onClick={() => !isSaved(id) && handleSave(p)}
                    disabled={isSaved(id)}
                    title={isSaved(id) ? "บันทึกแล้ว" : "เก็บโปรนี้"}
                  >
                    {isSaved(id) ? "✓ เก็บแล้ว" : "+ เก็บโปรนี้"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </main>

      {/* Saved Drawer / Modal */}
      {showSaved && (
        <div className="saved-modal-backdrop" aria-modal role="dialog">
          {/* backdrop */}
          <div className="saved-modal-overlay" onClick={() => setShowSaved(false)} />

          {/* panel */}
          <div className="saved-modal-panel">
            <div className="saved-modal-header">
              <h3 className="saved-modal-title">ที่เก็บไว้ ({savedList.length})</h3>
              <button onClick={() => setShowSaved(false)} className="saved-modal-close-button">
                ปิด
              </button>
            </div>

            {savedList.length === 0 ? (
              <div className="saved-empty-message">ยังไม่มีรายการที่เก็บไว้</div>
            ) : (
              <ul className="saved-list">
                {savedList.map((p) => {
                  const id = p.id ?? p.ID!;
                  const img = TYPE_IMAGES[p.promoTypeId] ?? TYPE_IMAGES[1];
                  return (
                    <li key={id} className="saved-list-item">
                      <img src={img} alt={p.promoCode} className="saved-promo-image" />
                      <div className="saved-promo-details">
                        <div className="saved-promo-title">{p.promoCode}</div>
                        <div className="saved-promo-description">{p.promoDetail}</div>
                        <div className="saved-promo-expiry">{p.endAt ? `หมดเขต ${formatDate(p.endAt)}` : ""}</div>
                      </div>
                      <div className="saved-promo-actions">
                        <button className="saved-promo-remove-button" disabled title="ยังไม่รองรับการลบ">
                          ลบออก
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <footer className="promotions-footer" />
    </div>
  );
}
