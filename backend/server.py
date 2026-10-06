from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import re
import uuid
import base64
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any

import jwt
import bcrypt
import qrcode
import requests
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Header, Query
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response as StarletteResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator, EmailStr

# ------------------------------------------------------------------ setup
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@theshutki.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Shutki@2026")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "theshutki"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="TheShutki API")
api = APIRouter(prefix="/api")

# ------------------------------------------------------------------ models
def _to_str(v: Any) -> str:
    return str(v)

PyObjectId = Annotated[str, BeforeValidator(_to_str)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s


# ------------------------------------------------------------------ password / jwt helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_token_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            return None
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except Exception:
        return None


async def require_user(request: Request) -> dict:
    user = await get_token_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def require_admin(request: Request) -> dict:
    user = await require_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


# ------------------------------------------------------------------ object storage
_storage_key = None


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ------------------------------------------------------------------ pydantic schemas
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class Variant(BaseModel):
    weight: str
    price: float
    mrp: float
    stock: int = 100
    sku: Optional[str] = None


class ProductIn(BaseModel):
    name: str
    bengali_name: Optional[str] = ""
    slug: Optional[str] = None
    description: str = ""
    long_description: str = ""
    category: str = ""
    fish_type: str = ""
    salt_level: str = "Regular"
    images: List[str] = []
    video: Optional[str] = None
    variants: List[Variant] = []
    rating: float = 4.7
    reviews_count: int = 0
    is_featured: bool = False
    is_bestseller: bool = False
    is_combo: bool = False
    is_new: bool = False
    tags: List[str] = []
    storage_instructions: str = ""
    preparation_instructions: str = ""
    ingredients: str = ""
    combo_meta: Optional[dict] = None
    badge: Optional[str] = None


class CategoryIn(BaseModel):
    name: str
    slug: Optional[str] = None
    image: str = ""
    order: int = 0


class CouponIn(BaseModel):
    code: str
    type: str = "percent"          # percent | flat
    value: float = 0
    min_order: float = 0
    max_discount: Optional[float] = None
    expiry: Optional[str] = None
    usage_limit: Optional[int] = None
    used: int = 0
    active: bool = True


class CouponValidateIn(BaseModel):
    code: str
    subtotal: float


class OrderItem(BaseModel):
    product_id: str
    name: str
    weight: str
    price: float
    quantity: int
    image: Optional[str] = None


class OrderIn(BaseModel):
    items: List[OrderItem]
    full_name: str
    phone: str
    email: Optional[str] = ""
    address: str
    city: str
    state: str
    pincode: str
    payment_method: str = "cod"     # cod | upi | stripe | razorpay
    coupon_code: Optional[str] = None
    notes: Optional[str] = ""


class StatusIn(BaseModel):
    status: str


class ReviewIn(BaseModel):
    name: str
    rating: int = 5
    text: str
    product_id: Optional[str] = None
    verified: bool = True
    active: bool = True


class SettingsIn(BaseModel):
    free_shipping_above: Optional[float] = None
    shipping_charge: Optional[float] = None
    cod_enabled: Optional[bool] = None
    first_order_discount: Optional[float] = None
    whatsapp_number: Optional[str] = None
    upi_id: Optional[str] = None
    upi_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_image: Optional[str] = None
    promo_text: Optional[str] = None
    announcement: Optional[str] = None
    payment_methods: Optional[dict] = None
    social_images: Optional[List[str]] = None


# ------------------------------------------------------------------ helpers
def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


IMG = "https://static.prod-images.emergentagent.com/jobs/db2212d3-eb5d-4aac-b4dc-f2966de0720e/images/{}.jpeg"


# ------------------------------------------------------------------ auth routes
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"name": body.name, "email": email, "phone": body.phone or "",
           "password_hash": hash_password(body.password), "role": "customer",
           "created_at": now_iso()}
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email, "customer")
    set_auth_cookie(response, token)
    return {"id": uid, "name": body.name, "email": email, "role": "customer", "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    token = create_access_token(uid, email, user.get("role", "customer"))
    set_auth_cookie(response, token)
    return {"id": uid, "name": user.get("name"), "email": email,
            "role": user.get("role", "customer"), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(require_user)):
    return {"id": user["_id"], "name": user.get("name"), "email": user.get("email"),
            "role": user.get("role", "customer"), "phone": user.get("phone", "")}


# ------------------------------------------------------------------ products
@api.get("/products")
async def list_products(
    category: Optional[str] = None, fish_type: Optional[str] = None,
    salt_level: Optional[str] = None, availability: Optional[str] = None,
    min_price: Optional[float] = None, max_price: Optional[float] = None,
    sort: Optional[str] = "featured", q: Optional[str] = None,
    featured: Optional[bool] = None, bestseller: Optional[bool] = None,
    is_combo: Optional[bool] = None, tag: Optional[str] = None,
    limit: int = 100, skip: int = 0,
):
    query: dict = {}
    if category and category != "all":
        query["category"] = category
    if fish_type and fish_type != "All":
        query["fish_type"] = fish_type
    if salt_level and salt_level != "All":
        query["salt_level"] = salt_level
    if featured is not None:
        query["is_featured"] = featured
    if bestseller is not None:
        query["is_bestseller"] = bestseller
    if is_combo is not None:
        query["is_combo"] = is_combo
    if tag:
        query["tags"] = tag
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"bengali_name": rx}, {"fish_type": rx},
                        {"category": rx}, {"tags": rx}, {"description": rx}]

    docs = [clean(d) for d in await db.products.find(query).to_list(1000)]

    def minprice(p):
        return min([v["price"] for v in p.get("variants", [])] or [0])

    if min_price is not None:
        docs = [d for d in docs if minprice(d) >= min_price]
    if max_price is not None:
        docs = [d for d in docs if minprice(d) <= max_price]
    if availability == "in_stock":
        docs = [d for d in docs if any(v.get("stock", 0) > 0 for v in d.get("variants", []))]

    if sort == "price_asc":
        docs.sort(key=minprice)
    elif sort == "price_desc":
        docs.sort(key=minprice, reverse=True)
    elif sort == "bestselling":
        docs.sort(key=lambda d: d.get("reviews_count", 0), reverse=True)
    elif sort == "new":
        docs.sort(key=lambda d: d.get("is_new", False), reverse=True)
    else:
        docs.sort(key=lambda d: (not d.get("is_featured", False), -d.get("rating", 0)))

    return docs[skip: skip + limit]


@api.get("/products/suggestions")
async def suggestions(q: str = Query(...)):
    rx = {"$regex": re.escape(q), "$options": "i"}
    docs = await db.products.find(
        {"$or": [{"name": rx}, {"bengali_name": rx}, {"fish_type": rx}, {"tags": rx}]}
    ).limit(6).to_list(6)
    return [{"id": str(d["_id"]), "name": d["name"], "slug": d.get("slug"),
             "image": (d.get("images") or [None])[0]} for d in docs]


@api.get("/products/{slug}")
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug})
    if not doc:
        try:
            doc = await db.products.find_one({"_id": ObjectId(slug)})
        except Exception:
            doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return clean(doc)


@api.post("/products")
async def create_product(body: ProductIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["slug"] = doc.get("slug") or slugify(doc["name"])
    if await db.products.find_one({"slug": doc["slug"]}):
        doc["slug"] = f"{doc['slug']}-{uuid.uuid4().hex[:5]}"
    doc["created_at"] = now_iso()
    res = await db.products.insert_one(doc)
    return clean(await db.products.find_one({"_id": res.inserted_id}))


@api.put("/products/{pid}")
async def update_product(pid: str, body: ProductIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["slug"] = doc.get("slug") or slugify(doc["name"])
    await db.products.update_one({"_id": ObjectId(pid)}, {"$set": doc})
    return clean(await db.products.find_one({"_id": ObjectId(pid)}))


@api.delete("/products/{pid}")
async def delete_product(pid: str, admin: dict = Depends(require_admin)):
    await db.products.delete_one({"_id": ObjectId(pid)})
    return {"ok": True}


# ------------------------------------------------------------------ categories
@api.get("/categories")
async def list_categories():
    docs = await db.categories.find().sort("order", 1).to_list(100)
    return [clean(d) for d in docs]


@api.post("/categories")
async def create_category(body: CategoryIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["slug"] = doc.get("slug") or slugify(doc["name"])
    res = await db.categories.insert_one(doc)
    return clean(await db.categories.find_one({"_id": res.inserted_id}))


@api.put("/categories/{cid}")
async def update_category(cid: str, body: CategoryIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["slug"] = doc.get("slug") or slugify(doc["name"])
    await db.categories.update_one({"_id": ObjectId(cid)}, {"$set": doc})
    return clean(await db.categories.find_one({"_id": ObjectId(cid)}))


@api.delete("/categories/{cid}")
async def delete_category(cid: str, admin: dict = Depends(require_admin)):
    await db.categories.delete_one({"_id": ObjectId(cid)})
    return {"ok": True}


# ------------------------------------------------------------------ coupons
@api.post("/coupons/validate")
async def validate_coupon(body: CouponValidateIn):
    c = await db.coupons.find_one({"code": body.code.upper(), "active": True})
    if not c:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    if c.get("expiry"):
        try:
            if datetime.fromisoformat(c["expiry"]) < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Coupon expired")
        except ValueError:
            pass
    if c.get("usage_limit") and c.get("used", 0) >= c["usage_limit"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    if body.subtotal < c.get("min_order", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order ₹{int(c['min_order'])} required")
    if c["type"] == "percent":
        discount = body.subtotal * c["value"] / 100
        if c.get("max_discount"):
            discount = min(discount, c["max_discount"])
    else:
        discount = c["value"]
    discount = round(min(discount, body.subtotal), 2)
    return {"code": c["code"], "discount": discount, "type": c["type"], "value": c["value"]}


@api.get("/coupons")
async def list_coupons(admin: dict = Depends(require_admin)):
    return [clean(d) for d in await db.coupons.find().to_list(200)]


@api.post("/coupons")
async def create_coupon(body: CouponIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["code"] = doc["code"].upper()
    if await db.coupons.find_one({"code": doc["code"]}):
        raise HTTPException(status_code=400, detail="Coupon code exists")
    res = await db.coupons.insert_one(doc)
    return clean(await db.coupons.find_one({"_id": res.inserted_id}))


@api.put("/coupons/{cid}")
async def update_coupon(cid: str, body: CouponIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["code"] = doc["code"].upper()
    await db.coupons.update_one({"_id": ObjectId(cid)}, {"$set": doc})
    return clean(await db.coupons.find_one({"_id": ObjectId(cid)}))


@api.delete("/coupons/{cid}")
async def delete_coupon(cid: str, admin: dict = Depends(require_admin)):
    await db.coupons.delete_one({"_id": ObjectId(cid)})
    return {"ok": True}


# ------------------------------------------------------------------ orders
def gen_order_id() -> str:
    return "TS" + datetime.now().strftime("%y%m%d") + uuid.uuid4().hex[:5].upper()


@api.post("/orders")
async def create_order(body: OrderIn, request: Request):
    settings = await db.settings.find_one({"key": "main"}) or {}

    # recompute each line price from DB to prevent client-side price tampering
    for it in body.items:
        try:
            prod = await db.products.find_one({"_id": ObjectId(it.product_id)})
        except Exception:
            prod = None
        if prod:
            match = next((v for v in prod.get("variants", []) if v["weight"] == it.weight), None)
            if match:
                it.price = float(match["price"])

    subtotal = round(sum(i.price * i.quantity for i in body.items), 2)
    if subtotal <= 0:
        raise HTTPException(status_code=400, detail="Cart is empty")

    discount = 0.0
    if body.coupon_code:
        try:
            cres = await validate_coupon(CouponValidateIn(code=body.coupon_code, subtotal=subtotal))
            discount = cres["discount"]
            await db.coupons.update_one({"code": body.coupon_code.upper()}, {"$inc": {"used": 1}})
        except HTTPException:
            discount = 0.0

    free_above = settings.get("free_shipping_above", 499)
    ship_charge = settings.get("shipping_charge", 49)
    shipping = 0 if (subtotal - discount) >= free_above or body.payment_method != "cod" else ship_charge
    if body.payment_method == "cod":
        # free shipping on prepaid; COD charged if below threshold
        shipping = 0 if (subtotal - discount) >= free_above else ship_charge
    total = round(subtotal - discount + shipping, 2)

    user = await get_token_user(request)
    oid = gen_order_id()
    doc = {
        "order_id": oid,
        "user_id": user["_id"] if user else None,
        "items": [i.model_dump() for i in body.items],
        "customer": {"full_name": body.full_name, "phone": body.phone, "email": body.email},
        "shipping_address": {"address": body.address, "city": body.city,
                             "state": body.state, "pincode": body.pincode},
        "subtotal": subtotal, "discount": discount, "shipping": shipping, "total": total,
        "coupon_code": body.coupon_code, "payment_method": body.payment_method,
        "payment_status": "pending", "status": "pending", "notes": body.notes,
        "created_at": now_iso(),
    }
    await db.orders.insert_one(doc)

    # decrement stock
    for i in body.items:
        try:
            await db.products.update_one(
                {"_id": ObjectId(i.product_id), "variants.weight": i.weight},
                {"$inc": {"variants.$.stock": -i.quantity}})
        except Exception:
            pass

    result = {"order_id": oid, "total": total, "subtotal": subtotal,
              "discount": discount, "shipping": shipping, "payment_method": body.payment_method}

    if body.payment_method == "upi":
        upi_id = settings.get("upi_id", "theshutki@upi")
        upi_name = settings.get("upi_name", "TheShutki")
        upi_link = f"upi://pay?pa={upi_id}&pn={upi_name}&am={total}&cu=INR&tn={oid}"
        qr = qrcode.make(upi_link)
        buf = io.BytesIO()
        qr.save(buf, format="PNG")
        result["upi_link"] = upi_link
        result["qr"] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    return result


@api.get("/orders/me")
async def my_orders(user: dict = Depends(require_user)):
    docs = await db.orders.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(200)
    return [clean(d) for d in docs]


@api.get("/orders/{order_id}")
async def get_order(order_id: str):
    doc = await db.orders.find_one({"order_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return clean(doc)


@api.get("/admin/orders")
async def admin_orders(admin: dict = Depends(require_admin), status: Optional[str] = None):
    query = {"status": status} if status else {}
    docs = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    return [clean(d) for d in docs]


@api.patch("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, body: StatusIn, admin: dict = Depends(require_admin)):
    update = {"status": body.status}
    if body.status == "delivered":
        update["payment_status"] = "paid"
    await db.orders.update_one({"order_id": order_id}, {"$set": update})
    return clean(await db.orders.find_one({"order_id": order_id}))


@api.patch("/admin/orders/{order_id}/payment")
async def mark_payment(order_id: str, body: StatusIn, admin: dict = Depends(require_admin)):
    await db.orders.update_one({"order_id": order_id}, {"$set": {"payment_status": body.status}})
    return clean(await db.orders.find_one({"order_id": order_id}))


# ------------------------------------------------------------------ reviews
@api.get("/reviews")
async def list_reviews(product_id: Optional[str] = None, all: Optional[bool] = False):
    query: dict = {} if all else {"active": True}
    if product_id:
        query["product_id"] = product_id
    docs = await db.reviews.find(query).sort("created_at", -1).to_list(200)
    return [clean(d) for d in docs]


@api.post("/reviews")
async def create_review(body: ReviewIn, admin: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["created_at"] = now_iso()
    res = await db.reviews.insert_one(doc)
    return clean(await db.reviews.find_one({"_id": res.inserted_id}))


@api.put("/reviews/{rid}")
async def update_review(rid: str, body: ReviewIn, admin: dict = Depends(require_admin)):
    await db.reviews.update_one({"_id": ObjectId(rid)}, {"$set": body.model_dump()})
    return clean(await db.reviews.find_one({"_id": ObjectId(rid)}))


@api.delete("/reviews/{rid}")
async def delete_review(rid: str, admin: dict = Depends(require_admin)):
    await db.reviews.delete_one({"_id": ObjectId(rid)})
    return {"ok": True}


# ------------------------------------------------------------------ settings
@api.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"key": "main"})
    return clean(s) if s else {}


@api.put("/settings")
async def update_settings(body: SettingsIn, admin: dict = Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.settings.update_one({"key": "main"}, {"$set": update}, upsert=True)
    return clean(await db.settings.find_one({"key": "main"}))


# ------------------------------------------------------------------ customers / analytics / inventory
@api.get("/admin/customers")
async def admin_customers(admin: dict = Depends(require_admin)):
    users = await db.users.find({"role": "customer"}).sort("created_at", -1).to_list(1000)
    out = []
    for u in users:
        uid = str(u["_id"])
        orders = await db.orders.find({"user_id": uid}).to_list(1000)
        out.append({"id": uid, "name": u.get("name"), "email": u.get("email"),
                    "phone": u.get("phone", ""), "created_at": u.get("created_at"),
                    "orders_count": len(orders),
                    "total_spent": round(sum(o.get("total", 0) for o in orders), 2)})
    return out


@api.get("/admin/analytics")
async def analytics(admin: dict = Depends(require_admin)):
    orders = await db.orders.find().to_list(10000)
    paid = [o for o in orders if o.get("payment_status") == "paid" or o.get("status") == "delivered"]
    revenue = round(sum(o.get("total", 0) for o in orders), 2)
    total_orders = len(orders)
    aov = round(revenue / total_orders, 2) if total_orders else 0
    pending = len([o for o in orders if o.get("status") == "pending"])
    customers = await db.users.count_documents({"role": "customer"})

    counts: dict = {}
    for o in orders:
        for it in o.get("items", []):
            counts[it["name"]] = counts.get(it["name"], 0) + it["quantity"]
    best = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # last 7 days sales
    series = {}
    for o in orders:
        d = (o.get("created_at") or "")[:10]
        series[d] = series.get(d, 0) + o.get("total", 0)
    sales_series = [{"date": k, "total": round(v, 2)} for k, v in sorted(series.items())][-7:]

    return {"revenue": revenue, "total_orders": total_orders, "aov": aov,
            "pending_orders": pending, "customers": customers, "paid_orders": len(paid),
            "bestsellers": [{"name": n, "qty": q} for n, q in best],
            "sales_series": sales_series}


@api.get("/admin/inventory")
async def inventory(admin: dict = Depends(require_admin)):
    docs = await db.products.find().to_list(1000)
    out = []
    for d in docs:
        total_stock = sum(v.get("stock", 0) for v in d.get("variants", []))
        out.append({"id": str(d["_id"]), "name": d["name"], "stock": total_stock,
                    "image": (d.get("images") or [None])[0],
                    "status": "out" if total_stock == 0 else ("low" if total_stock < 20 else "ok")})
    out.sort(key=lambda x: x["stock"])
    return out


# ------------------------------------------------------------------ uploads
@api.post("/upload")
async def upload(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    data = await file.read()
    ctype = file.content_type or "application/octet-stream"
    result = put_object(path, data, ctype)
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"],
                               "original_filename": file.filename, "content_type": ctype,
                               "is_deleted": False, "created_at": now_iso()})
    return {"url": f"/api/files/{result['path']}", "path": result["path"]}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    data, ctype = get_object(path)
    return StarletteResponse(content=data, media_type=(record or {}).get("content_type", ctype))


# ------------------------------------------------------------------ sitemap / robots
@api.get("/sitemap.xml")
async def sitemap():
    base = os.environ.get("SITE_URL", "https://theshutki.com")
    products = await db.products.find({}, {"slug": 1}).to_list(1000)
    urls = [f"{base}/", f"{base}/shop", f"{base}/about", f"{base}/contact"]
    urls += [f"{base}/products/{p['slug']}" for p in products]
    body = "".join(f"<url><loc>{u}</loc></url>" for u in urls)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>'
    return StarletteResponse(content=xml, media_type="application/xml")


@api.get("/")
async def root():
    return {"message": "TheShutki API running"}


# ------------------------------------------------------------------ seed
async def seed():
    # indexes
    try:
        await db.users.create_index("email", unique=True)
    except Exception:
        pass

    # admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({"name": "Admin", "email": ADMIN_EMAIL,
                                   "password_hash": hash_password(ADMIN_PASSWORD),
                                   "role": "admin", "created_at": now_iso()})
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL},
                                  {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})

    # settings
    if not await db.settings.find_one({"key": "main"}):
        await db.settings.insert_one({
            "key": "main",
            "free_shipping_above": 499, "shipping_charge": 49, "cod_enabled": True,
            "first_order_discount": 10,
            "whatsapp_number": "919876543210", "upi_id": "theshutki@upi", "upi_name": "TheShutki",
            "phone": "+91 98765 43210", "email": "care@theshutki.com",
            "address": "12 Marine Drive, Coastal Road, Mumbai, Maharashtra 400001",
            "instagram": "https://instagram.com/theshutki",
            "facebook": "https://facebook.com/theshutki",
            "youtube": "https://youtube.com/@theshutki",
            "hero_title": "AUTHENTIC SHUTKI.\nPURE COASTAL FLAVOUR.",
            "hero_subtitle": "Premium sun-dried fish, carefully selected and hygienically packed for an authentic taste of the coast.",
            "hero_image": IMG.format("a6a2907421315eb9a78b99bb1b92383e5c8a8ae64c46de88ea262c0bbd0936ff"),
            "promo_text": "Get 10% OFF on your first order",
            "announcement": "FREE SHIPPING ON PREPAID ORDERS • PAN-INDIA DELIVERY",
            "payment_methods": {"cod": True, "upi": True, "stripe": False,
                                "razorpay": False, "cashfree": False, "phonepe": False},
            "social_images": [IMG.format(h) for h in [
                "40005c24ea1e9b4996159647f7a7205c6377aad13e38768ea43823c632618a42",
                "692fe6d7df6f729ad91d441db6e10018db4a15373fc231a004f1a63bc7343fed",
                "4b7b47d4d0785784460b68bf537bb54aecd9c4ab5cbe8073e33d750616721593",
                "fa78c1a7a84cc859df8eec08834ba2507f720f89403cf34251595d725776ea09",
                "bdbf00d445e67fc8ad4ed5cff670fcf288eaca803266725b5d1cb937605dd531",
                "117914cfc1c068aa2722e41c7fc49a583b3a1e9746044fca139fec3797586463"]],
        })

    # categories
    if await db.categories.count_documents({}) == 0:
        cats = [
            ("Dry Fish", "40005c24ea1e9b4996159647f7a7205c6377aad13e38768ea43823c632618a42"),
            ("Prawns & Shrimp", "692fe6d7df6f729ad91d441db6e10018db4a15373fc231a004f1a63bc7343fed"),
            ("Premium Fish", "117914cfc1c068aa2722e41c7fc49a583b3a1e9746044fca139fec3797586463"),
            ("Boneless Shutki", "eaf562aaa790f136640fe355064c8347cabe678d8b9df999c1c50e03fd7ff840"),
            ("Ready to Cook", "fa78c1a7a84cc859df8eec08834ba2507f720f89403cf34251595d725776ea09"),
            ("Fish Pickles", "d57311e2cb39167848d7ad31d9dfd1661c7b463cc25b253d49fbde4c80e6f044"),
            ("Combo Packs", "b88d92b542be9e9c59436f0021c0026dadd6b2c049f553d603443735561bc315"),
            ("Spicy Specials", "0558d293e9d792362d6f19d11a28930a78b7c4a343acbc9716819bf9c9485b4a"),
            ("Low Salt", "b45d4ebf825883f8eac4edd4bb8f8d171d43363ca7214baad3ad10216a7ce51a"),
            ("Gift Packs", "bca07f000ba4bc677905e0feab738c1d4425f0c2867bb5b86686e42828f009b7"),
        ]
        await db.categories.insert_many([
            {"name": n, "slug": slugify(n), "image": IMG.format(h), "order": i}
            for i, (n, h) in enumerate(cats)])

    # products
    if await db.products.count_documents({}) == 0:
        def variants(p250, mrp250):
            return [
                {"weight": "250g", "price": p250, "mrp": mrp250, "stock": 120, "sku": uuid.uuid4().hex[:6].upper()},
                {"weight": "500g", "price": round(p250 * 1.9), "mrp": round(mrp250 * 1.9), "stock": 80, "sku": uuid.uuid4().hex[:6].upper()},
                {"weight": "1kg", "price": round(p250 * 3.6), "mrp": round(mrp250 * 3.6), "stock": 40, "sku": uuid.uuid4().hex[:6].upper()},
            ]
        P = [
            dict(name="Premium Nethili Shutki", bengali_name="নেথিলি শুঁটকি", fish_type="Anchovies",
                 category="Dry Fish", img="40005c24ea1e9b4996159647f7a7205c6377aad13e38768ea43823c632618a42",
                 desc="Premium sun-dried anchovies with a deep coastal aroma.", p=299, mrp=399,
                 rating=4.8, rc=324, bestseller=True, featured=True, badge="BESTSELLER",
                 salt="Regular", tags=["anchovies", "premium", "bestseller"]),
            dict(name="Cleaned Nethili Shutki", bengali_name="পরিষ্কার নেথিলি শুঁটকি", fish_type="Anchovies",
                 category="Dry Fish", img="b45d4ebf825883f8eac4edd4bb8f8d171d43363ca7214baad3ad10216a7ce51a",
                 desc="Headless, cleaned anchovies — ready to cook with minimal prep.", p=349, mrp=449,
                 rating=4.7, rc=211, bestseller=True, salt="Low Salt", tags=["anchovies", "boneless"]),
            dict(name="Premium Bombay Duck Shutki", bengali_name="লইট্টা শুঁটকি", fish_type="Bombay Duck",
                 category="Dry Fish", img="fa78c1a7a84cc859df8eec08834ba2507f720f89403cf34251595d725776ea09",
                 desc="Classic Loitta shutki, sun-dried to a firm, flavourful finish.", p=329, mrp=429,
                 rating=4.6, rc=187, bestseller=True, featured=True, badge="POPULAR",
                 salt="Regular", tags=["bombay duck", "premium"]),
            dict(name="Dried Prawns", bengali_name="চিংড়ি শুঁটকি", fish_type="Prawns",
                 category="Prawns & Shrimp", img="692fe6d7df6f729ad91d441db6e10018db4a15373fc231a004f1a63bc7343fed",
                 desc="Sun-dried prawns bursting with concentrated coastal flavour.", p=499, mrp=649,
                 rating=4.9, rc=402, bestseller=True, featured=True, badge="BESTSELLER",
                 salt="Regular", tags=["prawns", "premium", "bestseller"]),
            dict(name="Dried Sardines", bengali_name="সার্ডিন শুঁটকি", fish_type="Sardines",
                 category="Dry Fish", img="bdbf00d445e67fc8ad4ed5cff670fcf288eaca803266725b5d1cb937605dd531",
                 desc="Robust sun-dried sardines, a coastal kitchen staple.", p=279, mrp=369,
                 rating=4.5, rc=156, salt="Regular", tags=["sardines"]),
            dict(name="Dried Ribbon Fish", bengali_name="ছুরি শুঁটকি", fish_type="Ribbon Fish",
                 category="Premium Fish", img="2229f230aed16859b51797573a86e94511f58b225d7d870ef3cd239cd18cbfa0",
                 desc="Silver ribbon fish, sun-dried into savoury strips.", p=359, mrp=469,
                 rating=4.6, rc=98, featured=True, salt="Regular", tags=["ribbon fish", "premium"]),
            dict(name="Dried King Fish", bengali_name="সুরমাই শুঁটকি", fish_type="King Fish",
                 category="Premium Fish", img="117914cfc1c068aa2722e41c7fc49a583b3a1e9746044fca139fec3797586463",
                 desc="Thick, meaty king fish steaks, premium sun-dried.", p=599, mrp=799,
                 rating=4.8, rc=143, featured=True, badge="PREMIUM", salt="Regular",
                 tags=["king fish", "premium"]),
            dict(name="Boneless Shutki", bengali_name="কাঁটা ছাড়া শুঁটকি", fish_type="Boneless",
                 category="Boneless Shutki", img="eaf562aaa790f136640fe355064c8347cabe678d8b9df999c1c50e03fd7ff840",
                 desc="Deboned dried fish fillets — convenient and family friendly.", p=449, mrp=589,
                 rating=4.7, rc=176, bestseller=True, salt="Low Salt",
                 tags=["boneless", "premium"]),
            dict(name="Dried Squid", bengali_name="স্কুইড শুঁটকি", fish_type="Squid",
                 category="Premium Fish", img="d57311e2cb39167848d7ad31d9dfd1661c7b463cc25b253d49fbde4c80e6f044",
                 desc="Tender sun-dried squid with a delicate briny taste.", p=549, mrp=729,
                 rating=4.6, rc=87, is_new=True, salt="Regular", tags=["squid", "premium", "new"]),
            dict(name="Premium Shark Shutki", bengali_name="হাঙ্গর শুঁটকি", fish_type="Shark",
                 category="Spicy Specials", img="0558d293e9d792362d6f19d11a28930a78b7c4a343acbc9716819bf9c9485b4a",
                 desc="Bold, firm shark pieces — a connoisseur's coastal delicacy.", p=699, mrp=899,
                 rating=4.8, rc=64, featured=True, badge="PREMIUM", salt="Regular",
                 tags=["shark", "premium", "spicy"]),
        ]
        prod_docs = []
        for p in P:
            prod_docs.append({
                "name": p["name"], "bengali_name": p["bengali_name"], "slug": slugify(p["name"]),
                "description": p["desc"],
                "long_description": f"{p['desc']} Each batch of {p['name']} is traditionally sun-dried along the coast and hygienically cleaned, graded and packed to preserve its distinctive flavour. A versatile ingredient for authentic coastal curries, fries and chutneys.",
                "category": p["category"], "fish_type": p["fish_type"], "salt_level": p["salt"],
                "images": [IMG.format(p["img"])],
                "variants": variants(p["p"], p["mrp"]),
                "rating": p["rating"], "reviews_count": p["rc"],
                "is_featured": p.get("featured", False), "is_bestseller": p.get("bestseller", False),
                "is_combo": False, "is_new": p.get("is_new", False),
                "badge": p.get("badge"), "tags": p["tags"],
                "storage_instructions": "Store in an airtight container in a cool, dry place. Refrigerate after opening for longer freshness. Keep away from direct sunlight and moisture.",
                "preparation_instructions": "Rinse thoroughly in warm water before cooking. Soak for 10–15 minutes if preferred. Cook as per your favourite coastal recipe.",
                "ingredients": "100% natural sun-dried fish, edible salt.",
                "created_at": now_iso(),
            })

        combos = [
            dict(name="Starter Shutki Combo", img="b88d92b542be9e9c59436f0021c0026dadd6b2c049f553d603443735561bc315",
                 weight="500g", varieties=4, servings="6-8", price=699, mrp=899, badge="BEST VALUE"),
            dict(name="Family Shutki Combo", img="23c45057b866f1f79878d0d802788f0cde83a2f04cb8c4879bac803e24e91323",
                 weight="1kg", varieties=6, servings="12-15", price=1299, mrp=1699, badge="MOST POPULAR"),
            dict(name="Premium Coastal Combo", img="87d0f4f2032339e1237a56d032fab274617da6c14672e597701c3d3662c19007",
                 weight="1.5kg", varieties=8, servings="18-22", price=1899, mrp=2499, badge="PREMIUM"),
            dict(name="Ultimate Shutki Box", img="bca07f000ba4bc677905e0feab738c1d4425f0c2867bb5b86686e42828f009b7",
                 weight="3kg", varieties=12, servings="35+", price=3499, mrp=4799, badge="PREMIUM"),
        ]
        for c in combos:
            prod_docs.append({
                "name": c["name"], "bengali_name": "", "slug": slugify(c["name"]),
                "description": f"{c['varieties']} varieties • {c['weight']} • serves {c['servings']}",
                "long_description": f"The {c['name']} brings together {c['varieties']} of our most-loved coastal varieties in one {c['weight']} box. Thoughtfully curated for variety, flavour and value — perfect for families and gifting.",
                "category": "Combo Packs", "fish_type": "Combo", "salt_level": "Regular",
                "images": [IMG.format(c["img"])],
                "variants": [{"weight": c["weight"], "price": c["price"], "mrp": c["mrp"],
                              "stock": 60, "sku": uuid.uuid4().hex[:6].upper()}],
                "rating": 4.8, "reviews_count": 120,
                "is_featured": True, "is_bestseller": True, "is_combo": True, "is_new": False,
                "badge": c["badge"], "tags": ["combo"],
                "combo_meta": {"varieties": c["varieties"], "servings": c["servings"],
                               "weight": c["weight"], "savings": c["mrp"] - c["price"]},
                "storage_instructions": "Store in an airtight container in a cool, dry place. Refrigerate after opening.",
                "preparation_instructions": "Rinse thoroughly before cooking.",
                "ingredients": "Assorted 100% natural sun-dried fish, edible salt.",
                "created_at": now_iso(),
            })
        await db.products.insert_many(prod_docs)

    # reviews
    if await db.reviews.count_documents({}) == 0:
        rv = [
            ("Ananya Dasgupta", 5, "The Nethili shutki tastes just like what my grandmother used to make. Beautifully cleaned and packed!"),
            ("Rahul Menon", 5, "Dried prawns were incredibly fresh and aromatic. Packaging was leak-proof and premium."),
            ("Suchitra Nair", 4, "Loved the boneless shutki — so convenient for a quick weekday curry. Will reorder."),
            ("Imran Shaikh", 5, "Fast pan-India delivery and the quality is genuinely premium. The combo box is great value."),
            ("Priya Balan", 5, "Finally a brand that gets coastal flavour right. The king fish shutki is outstanding."),
            ("Debjani Roy", 5, "Authentic taste, hygienic packing and lovely branding. Highly recommend TheShutki."),
        ]
        await db.reviews.insert_many([
            {"name": n, "rating": r, "text": t, "product_id": None, "verified": True,
             "active": True, "created_at": now_iso()} for n, r, t in rv])

    # coupon
    if not await db.coupons.find_one({"code": "FIRST10"}):
        await db.coupons.insert_one({"code": "FIRST10", "type": "percent", "value": 10,
                                     "min_order": 0, "max_discount": 300, "expiry": None,
                                     "usage_limit": None, "used": 0, "active": True})

    # test customer
    if not await db.users.find_one({"email": "customer@test.com"}):
        await db.users.insert_one({"name": "Test Customer", "email": "customer@test.com",
                                   "password_hash": hash_password("Test@1234"),
                                   "phone": "9123456780", "role": "customer", "created_at": now_iso()})


@app.on_event("startup")
async def startup():
    await seed()
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")
    logger.info("TheShutki backend started")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
