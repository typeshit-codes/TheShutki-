"""TheShutki backend API regression tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://coastal-shop-demo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@theshutki.com"
ADMIN_PASSWORD = "Shutki@2026"
CUSTOMER_EMAIL = "customer@test.com"
CUSTOMER_PASSWORD = "Test@1234"


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("role") == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def customer_token(session):
    r = session.post(f"{API}/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def customer_headers(customer_token):
    return {"Authorization": f"Bearer {customer_token}", "Content-Type": "application/json"}


# ---------------- health ----------------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200


# ---------------- auth ----------------
class TestAuth:
    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "x@y.com", "password": "nope"})
        assert r.status_code == 401

    def test_admin_login(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_customer_login(self, customer_headers):
        r = requests.get(f"{API}/auth/me", headers=customer_headers)
        assert r.status_code == 200
        assert r.json()["role"] == "customer"

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={
            "name": "Dup", "email": CUSTOMER_EMAIL, "password": "whatever"})
        assert r.status_code == 400

    def test_register_new(self):
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "TEST User", "email": email, "password": "Test@1234"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and data["role"] == "customer"


# ---------------- products ----------------
class TestProducts:
    def test_list(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 10
        assert all("id" in p and "_id" not in p for p in items)

    def test_filter_fish_type(self):
        r = requests.get(f"{API}/products", params={"fish_type": "Anchovies"})
        assert r.status_code == 200
        assert all(p["fish_type"] == "Anchovies" for p in r.json())

    def test_filter_salt_and_max_price(self):
        r = requests.get(f"{API}/products", params={"salt_level": "Low Salt", "max_price": 500})
        assert r.status_code == 200
        for p in r.json():
            assert p["salt_level"] == "Low Salt"

    def test_sort_price_asc(self):
        r = requests.get(f"{API}/products", params={"sort": "price_asc"})
        prices = [min(v["price"] for v in p["variants"]) for p in r.json() if p.get("variants")]
        assert prices == sorted(prices)

    def test_suggestions(self):
        r = requests.get(f"{API}/products/suggestions", params={"q": "Nethili"})
        assert r.status_code == 200
        s = r.json()
        assert len(s) >= 1
        assert any("Nethili" in x["name"] for x in s)

    def test_get_by_slug(self):
        r = requests.get(f"{API}/products/premium-nethili-shutki")
        assert r.status_code == 200
        assert r.json()["slug"] == "premium-nethili-shutki"

    def test_get_missing(self):
        r = requests.get(f"{API}/products/nonexistent-slug-xyz")
        assert r.status_code == 404


# ---------------- categories ----------------
def test_categories_list():
    r = requests.get(f"{API}/categories")
    assert r.status_code == 200
    assert len(r.json()) >= 5


# ---------------- coupons ----------------
class TestCoupons:
    def test_validate_first10(self):
        r = requests.post(f"{API}/coupons/validate",
                          json={"code": "FIRST10", "subtotal": 1000})
        assert r.status_code == 200
        d = r.json()
        assert d["discount"] == 100  # 10%

    def test_validate_first10_cap(self):
        r = requests.post(f"{API}/coupons/validate",
                          json={"code": "FIRST10", "subtotal": 10000})
        assert r.status_code == 200
        assert r.json()["discount"] == 300  # capped

    def test_invalid_coupon(self):
        r = requests.post(f"{API}/coupons/validate",
                          json={"code": "DOESNOTEXIST", "subtotal": 500})
        assert r.status_code == 404

    def test_coupons_require_admin(self):
        r = requests.get(f"{API}/coupons")
        assert r.status_code == 401

    def test_admin_coupon_crud(self, admin_headers):
        code = f"TEST{uuid.uuid4().hex[:5].upper()}"
        r = requests.post(f"{API}/coupons", headers=admin_headers,
                          json={"code": code, "type": "flat", "value": 50, "active": True})
        assert r.status_code == 200
        cid = r.json()["id"]
        # delete
        d = requests.delete(f"{API}/coupons/{cid}", headers=admin_headers)
        assert d.status_code == 200


# ---------------- orders ----------------
class TestOrders:
    @pytest.fixture
    def product(self):
        return requests.get(f"{API}/products").json()[0]

    def _order_payload(self, product, payment="cod", coupon=None):
        v = product["variants"][0]
        return {
            "items": [{"product_id": product["id"], "name": product["name"],
                       "weight": v["weight"], "price": v["price"], "quantity": 2,
                       "image": product["images"][0]}],
            "full_name": "TEST Buyer", "phone": "9123456780",
            "email": "test@test.com", "address": "1 Test St",
            "city": "Mumbai", "state": "MH", "pincode": "400001",
            "payment_method": payment, "coupon_code": coupon, "notes": ""
        }

    def test_place_cod_order(self, customer_headers, product):
        payload = self._order_payload(product, "cod", "FIRST10")
        r = requests.post(f"{API}/orders", headers=customer_headers, json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["order_id"].startswith("TS")
        assert d["discount"] > 0
        # fetch
        g = requests.get(f"{API}/orders/{d['order_id']}")
        assert g.status_code == 200

    def test_place_upi_order_returns_qr(self, product):
        payload = self._order_payload(product, "upi")
        r = requests.post(f"{API}/orders", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d.get("qr", "").startswith("data:image/png;base64,")
        assert "upi://pay" in d.get("upi_link", "")

    def test_empty_cart_rejected(self):
        r = requests.post(f"{API}/orders", json={
            "items": [], "full_name": "X", "phone": "9", "address": "a",
            "city": "c", "state": "s", "pincode": "400001", "payment_method": "cod"})
        assert r.status_code == 400

    def test_orders_me(self, customer_headers, product):
        # ensure at least one
        requests.post(f"{API}/orders", headers=customer_headers,
                      json=self._order_payload(product, "cod"))
        r = requests.get(f"{API}/orders/me", headers=customer_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 1

    def test_admin_update_status(self, admin_headers, customer_headers, product):
        o = requests.post(f"{API}/orders", headers=customer_headers,
                          json=self._order_payload(product, "cod")).json()
        r = requests.patch(f"{API}/admin/orders/{o['order_id']}/status",
                           headers=admin_headers, json={"status": "shipped"})
        assert r.status_code == 200
        assert r.json()["status"] == "shipped"

    def test_admin_mark_paid(self, admin_headers, customer_headers, product):
        o = requests.post(f"{API}/orders", headers=customer_headers,
                          json=self._order_payload(product, "cod")).json()
        r = requests.patch(f"{API}/admin/orders/{o['order_id']}/payment",
                           headers=admin_headers, json={"status": "paid"})
        assert r.status_code == 200
        assert r.json()["payment_status"] == "paid"


# ---------------- admin pages ----------------
class TestAdmin:
    def test_admin_requires_admin(self, customer_headers):
        r = requests.get(f"{API}/admin/analytics", headers=customer_headers)
        assert r.status_code == 403

    def test_analytics(self, admin_headers):
        r = requests.get(f"{API}/admin/analytics", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("revenue", "total_orders", "aov", "customers", "bestsellers", "sales_series"):
            assert k in d

    def test_inventory(self, admin_headers):
        r = requests.get(f"{API}/admin/inventory", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_customers(self, admin_headers):
        r = requests.get(f"{API}/admin/customers", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_orders(self, admin_headers):
        r = requests.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200

    def test_product_crud(self, admin_headers):
        payload = {"name": f"TEST Fish {uuid.uuid4().hex[:5]}", "category": "Dry Fish",
                   "fish_type": "Test", "variants": [{"weight": "250g", "price": 100,
                                                      "mrp": 150, "stock": 10}]}
        r = requests.post(f"{API}/products", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        # update
        payload["name"] = payload["name"] + " Updated"
        u = requests.put(f"{API}/products/{pid}", headers=admin_headers, json=payload)
        assert u.status_code == 200
        assert "Updated" in u.json()["name"]
        # delete
        d = requests.delete(f"{API}/products/{pid}", headers=admin_headers)
        assert d.status_code == 200

    def test_review_create_and_delete(self, admin_headers):
        r = requests.post(f"{API}/reviews", headers=admin_headers,
                          json={"name": "TEST Reviewer", "rating": 5,
                                "text": "TEST review", "active": True})
        assert r.status_code == 200
        rid = r.json()["id"]
        d = requests.delete(f"{API}/reviews/{rid}", headers=admin_headers)
        assert d.status_code == 200

    def test_settings_update(self, admin_headers):
        r = requests.put(f"{API}/settings", headers=admin_headers,
                         json={"shipping_charge": 49})
        assert r.status_code == 200
        assert r.json()["shipping_charge"] == 49


# ---------------- settings public ----------------
def test_public_settings():
    r = requests.get(f"{API}/settings")
    assert r.status_code == 200
    assert "upi_id" in r.json()


def test_reviews_list():
    r = requests.get(f"{API}/reviews")
    assert r.status_code == 200
    assert len(r.json()) >= 1
