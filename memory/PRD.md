# TheShutki.com — Product Requirements Document

## Original Problem Statement
Build a premium, modern, fully responsive e-commerce website for a dry-fish (Shutki) brand — TheShutki.com. Tagline: "Authentic Shutki. Coastal Taste. Delivered Fresh." Premium Indian coastal-food aesthetic (deep ocean blue, charcoal, sand/beige, off-white, natural wood, earthy orange). Full storefront (hero, categories, shop-by-budget, bestsellers, combos, promo, trust cards, featured w/ filters, brand story, how it works, reviews, instagram, FAQ, footer), product detail page, cart, checkout, and a complete admin panel. SEO, mobile-first, high-conversion. Must be original (inspired by premium dry-fish D2C concept, not a copy).

## User Choices
- Auth: JWT email/password for admin + customers
- Payments: COD + UPI-QR functional; Stripe/Razorpay/Cashfree/PhonePe as admin-configurable toggles (keys needed to go live). Stripe claimable sandbox unavailable for India.
- Images: AI-generated dry-fish photography with Bengali names, editable in admin
- Scope: full end-to-end storefront + admin
- Logo: user-supplied horizontal "TheShutki" wordmark

## Architecture
- Backend: Node.js + Express + MongoDB (`backend/server.js`). JWT (bcrypt) auth, Bearer token. Local disk uploads served at `/api/files`. qrcode for UPI QR. Replaced the earlier FastAPI app on 2026-10-06.
- Frontend: React 19 (CRA/craco), Tailwind, Shadcn UI, framer-motion, recharts. Fonts: Playfair Display + Outfit.
- State: localStorage-backed cart/wishlist + auth token via `context/store.js`.

## Personas
- Shopper (mobile-first): discovers products, adds to cart, checks out via COD/UPI.
- Admin: manages catalog, orders, coupons, customers, reviews, homepage & store settings.

## Implemented (2026-06)
- Storefront: Home (all 13 sections), Shop (filters/sort), Product Detail (gallery, variants, pincode, tabs, frequently-bought), Cart (coupon), Checkout (validation, COD/UPI), Order Confirmation (UPI QR), Wishlist, Account (login/register + orders), About, Contact.
- Header (sticky glass + announcement), Mobile bottom nav, Floating WhatsApp, Search w/ suggestions.
- Admin: Dashboard (analytics + charts + inventory alerts), Products CRUD (variants, image upload), Orders (status workflow, mark paid, detail), Categories, Coupons, Customers, Reviews (show/hide), Settings (hero, promo, shipping, payment toggles, UPI, contact, social, instagram grid).
- Backend: auth, products (filter/sort/search/suggestions), categories, coupons (validate + CRUD), orders (server-side price recompute + coupon + shipping + UPI QR), reviews, settings, admin analytics/inventory/customers, upload, sitemap.
- Seeded: admin, test customer, 10 products (Bengali names) + 4 combos, 10 categories, 6 reviews, FIRST10 coupon.
- SEO: meta/OG tags, Organization JSON-LD, robots.txt, dynamic sitemap, per-product title, SEO slugs.
- Tested: 36/36 backend API tests pass; critical frontend flows pass.

## Backlog / Remaining
- Activate Firebase Phone OTP + Google sign-in (scaffolded, env-gated) once keys are added.
- P2: require auth for order creation + protect order-by-id endpoint; decrement stock only on payment confirmation.

## Added 2026-06 (iteration 2)
- Recipe Stories: 6 AI-illustrated coastal recipes, `/recipes` + `/recipes/:slug`, homepage "Cook It Like the Coast" section, full admin CRUD (`/admin/recipes`).
- Order Tracking: 7-stage timeline on order confirmation + expandable in customer account; admin "Notify Customer on WhatsApp" click-to-send (wa.me, no keys).
- Signup math captcha (built-in) on registration.
- Env-gated Google sign-in (`GOOGLE_CLIENT_ID`) + Firebase Phone OTP (`FIREBASE_*`) — backend verifies via google-auth; frontend buttons appear only when `/api/auth/config` reports enabled.
- Homepage marquee strip + recipes section.
- Tested: 45/45 backend pytest pass; all new frontend flows pass.


## Credentials
- Admin: admin@theshutki.com / Shutki@2026
- Customer: customer@test.com / Test@1234
