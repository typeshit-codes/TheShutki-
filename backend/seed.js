const crypto = require("crypto");
const { slugify, nowIso, hashPassword, verifyPassword } = require("./util");

const IMG = (h) => `https://static.prod-images.emergentagent.com/jobs/db2212d3-eb5d-4aac-b4dc-f2966de0720e/images/${h}.jpeg`;
const sku = () => crypto.randomBytes(3).toString("hex").toUpperCase();

function variants(p250, mrp250) {
  return [
    { weight: "250g", price: p250, mrp: mrp250, stock: 120, sku: sku() },
    { weight: "500g", price: Math.round(p250 * 1.9), mrp: Math.round(mrp250 * 1.9), stock: 80, sku: sku() },
    { weight: "1kg", price: Math.round(p250 * 3.6), mrp: Math.round(mrp250 * 3.6), stock: 40, sku: sku() },
  ];
}

async function seed(db) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@theshutki.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Shutki@2026";

  try { await db.collection("users").createIndex({ email: 1 }, { unique: true }); } catch {}

  const existing = await db.collection("users").findOne({ email: ADMIN_EMAIL });
  if (!existing) {
    await db.collection("users").insertOne({ name: "Admin", email: ADMIN_EMAIL, password_hash: hashPassword(ADMIN_PASSWORD), role: "admin", created_at: nowIso() });
  } else if (!verifyPassword(ADMIN_PASSWORD, existing.password_hash)) {
    await db.collection("users").updateOne({ email: ADMIN_EMAIL }, { $set: { password_hash: hashPassword(ADMIN_PASSWORD) } });
  }

  if (!(await db.collection("settings").findOne({ key: "main" }))) {
    await db.collection("settings").insertOne({
      key: "main", free_shipping_above: 499, shipping_charge: 49, cod_enabled: true, first_order_discount: 10,
      whatsapp_number: "919876543210", upi_id: "theshutki@upi", upi_name: "TheShutki",
      phone: "+91 98765 43210", email: "care@theshutki.com",
      address: "12 Marine Drive, Coastal Road, Mumbai, Maharashtra 400001",
      instagram: "https://instagram.com/theshutki", facebook: "https://facebook.com/theshutki", youtube: "https://youtube.com/@theshutki",
      hero_title: "AUTHENTIC SHUTKI.\nPURE COASTAL FLAVOUR.",
      hero_subtitle: "Premium sun-dried fish, carefully selected and hygienically packed for an authentic taste of the coast.",
      hero_image: IMG("a6a2907421315eb9a78b99bb1b92383e5c8a8ae64c46de88ea262c0bbd0936ff"),
      promo_text: "Get 10% OFF on your first order",
      announcement: "FREE SHIPPING ON PREPAID ORDERS • PAN-INDIA DELIVERY",
      payment_methods: { cod: true, upi: true, stripe: false, razorpay: false, cashfree: false, phonepe: false },
      social_images: ["40005c24ea1e9b4996159647f7a7205c6377aad13e38768ea43823c632618a42", "692fe6d7df6f729ad91d441db6e10018db4a15373fc231a004f1a63bc7343fed", "4b7b47d4d0785784460b68bf537bb54aecd9c4ab5cbe8073e33d750616721593", "fa78c1a7a84cc859df8eec08834ba2507f720f89403cf34251595d725776ea09", "bdbf00d445e67fc8ad4ed5cff670fcf288eaca803266725b5d1cb937605dd531", "117914cfc1c068aa2722e41c7fc49a583b3a1e9746044fca139fec3797586463"].map(IMG),
    });
  }

  if ((await db.collection("categories").countDocuments()) === 0) {
    const cats = [
      ["Dry Fish", "40005c24ea1e9b4996159647f7a7205c6377aad13e38768ea43823c632618a42"],
      ["Prawns & Shrimp", "692fe6d7df6f729ad91d441db6e10018db4a15373fc231a004f1a63bc7343fed"],
      ["Premium Fish", "117914cfc1c068aa2722e41c7fc49a583b3a1e9746044fca139fec3797586463"],
      ["Boneless Shutki", "eaf562aaa790f136640fe355064c8347cabe678d8b9df999c1c50e03fd7ff840"],
      ["Ready to Cook", "fa78c1a7a84cc859df8eec08834ba2507f720f89403cf34251595d725776ea09"],
      ["Fish Pickles", "d57311e2cb39167848d7ad31d9dfd1661c7b463cc25b253d49fbde4c80e6f044"],
      ["Combo Packs", "b88d92b542be9e9c59436f0021c0026dadd6b2c049f553d603443735561bc315"],
      ["Spicy Specials", "0558d293e9d792362d6f19d11a28930a78b7c4a343acbc9716819bf9c9485b4a"],
      ["Low Salt", "b45d4ebf825883f8eac4edd4bb8f8d171d43363ca7214baad3ad10216a7ce51a"],
      ["Gift Packs", "bca07f000ba4bc677905e0feab738c1d4425f0c2867bb5b86686e42828f009b7"],
    ];
    await db.collection("categories").insertMany(cats.map(([n, h], i) => ({ name: n, slug: slugify(n), image: IMG(h), order: i })));
  }

  if ((await db.collection("products").countDocuments()) === 0) {
    const P = [
      { name: "Premium Nethili Shutki", bengali_name: "নেথিলি শুঁটকি", fish_type: "Anchovies", category: "Dry Fish", img: "40005c24ea1e9b4996159647f7a7205c6377aad13e38768ea43823c632618a42", desc: "Premium sun-dried anchovies with a deep coastal aroma.", p: 299, mrp: 399, rating: 4.8, rc: 324, bestseller: true, featured: true, badge: "BESTSELLER", salt: "Regular", tags: ["anchovies", "premium", "bestseller"] },
      { name: "Cleaned Nethili Shutki", bengali_name: "পরিষ্কার নেথিলি শুঁটকি", fish_type: "Anchovies", category: "Dry Fish", img: "b45d4ebf825883f8eac4edd4bb8f8d171d43363ca7214baad3ad10216a7ce51a", desc: "Headless, cleaned anchovies — ready to cook with minimal prep.", p: 349, mrp: 449, rating: 4.7, rc: 211, bestseller: true, salt: "Low Salt", tags: ["anchovies", "boneless"] },
      { name: "Premium Bombay Duck Shutki", bengali_name: "লইট্টা শুঁটকি", fish_type: "Bombay Duck", category: "Dry Fish", img: "fa78c1a7a84cc859df8eec08834ba2507f720f89403cf34251595d725776ea09", desc: "Classic Loitta shutki, sun-dried to a firm, flavourful finish.", p: 329, mrp: 429, rating: 4.6, rc: 187, bestseller: true, featured: true, badge: "POPULAR", salt: "Regular", tags: ["bombay duck", "premium"] },
      { name: "Dried Prawns", bengali_name: "চিংড়ি শুঁটকি", fish_type: "Prawns", category: "Prawns & Shrimp", img: "692fe6d7df6f729ad91d441db6e10018db4a15373fc231a004f1a63bc7343fed", desc: "Sun-dried prawns bursting with concentrated coastal flavour.", p: 499, mrp: 649, rating: 4.9, rc: 402, bestseller: true, featured: true, badge: "BESTSELLER", salt: "Regular", tags: ["prawns", "premium", "bestseller"] },
      { name: "Dried Sardines", bengali_name: "সার্ডিন শুঁটকি", fish_type: "Sardines", category: "Dry Fish", img: "bdbf00d445e67fc8ad4ed5cff670fcf288eaca803266725b5d1cb937605dd531", desc: "Robust sun-dried sardines, a coastal kitchen staple.", p: 279, mrp: 369, rating: 4.5, rc: 156, salt: "Regular", tags: ["sardines"] },
      { name: "Dried Ribbon Fish", bengali_name: "ছুরি শুঁটকি", fish_type: "Ribbon Fish", category: "Premium Fish", img: "2229f230aed16859b51797573a86e94511f58b225d7d870ef3cd239cd18cbfa0", desc: "Silver ribbon fish, sun-dried into savoury strips.", p: 359, mrp: 469, rating: 4.6, rc: 98, featured: true, salt: "Regular", tags: ["ribbon fish", "premium"] },
      { name: "Dried King Fish", bengali_name: "সুরমাই শুঁটকি", fish_type: "King Fish", category: "Premium Fish", img: "117914cfc1c068aa2722e41c7fc49a583b3a1e9746044fca139fec3797586463", desc: "Thick, meaty king fish steaks, premium sun-dried.", p: 599, mrp: 799, rating: 4.8, rc: 143, featured: true, badge: "PREMIUM", salt: "Regular", tags: ["king fish", "premium"] },
      { name: "Boneless Shutki", bengali_name: "কাঁটা ছাড়া শুঁটকি", fish_type: "Boneless", category: "Boneless Shutki", img: "eaf562aaa790f136640fe355064c8347cabe678d8b9df999c1c50e03fd7ff840", desc: "Deboned dried fish fillets — convenient and family friendly.", p: 449, mrp: 589, rating: 4.7, rc: 176, bestseller: true, salt: "Low Salt", tags: ["boneless", "premium"] },
      { name: "Dried Squid", bengali_name: "স্কুইড শুঁটকি", fish_type: "Squid", category: "Premium Fish", img: "d57311e2cb39167848d7ad31d9dfd1661c7b463cc25b253d49fbde4c80e6f044", desc: "Tender sun-dried squid with a delicate briny taste.", p: 549, mrp: 729, rating: 4.6, rc: 87, is_new: true, salt: "Regular", tags: ["squid", "premium", "new"] },
      { name: "Premium Shark Shutki", bengali_name: "হাঙ্গর শুঁটকি", fish_type: "Shark", category: "Spicy Specials", img: "0558d293e9d792362d6f19d11a28930a78b7c4a343acbc9716819bf9c9485b4a", desc: "Bold, firm shark pieces — a connoisseur's coastal delicacy.", p: 699, mrp: 899, rating: 4.8, rc: 64, featured: true, badge: "PREMIUM", salt: "Regular", tags: ["shark", "premium", "spicy"] },
    ];
    const docs = P.map((p) => ({
      name: p.name, bengali_name: p.bengali_name, slug: slugify(p.name), description: p.desc,
      long_description: `${p.desc} Each batch of ${p.name} is traditionally sun-dried along the coast and hygienically cleaned, graded and packed to preserve its distinctive flavour. A versatile ingredient for authentic coastal curries, fries and chutneys.`,
      category: p.category, fish_type: p.fish_type, salt_level: p.salt, images: [IMG(p.img)], variants: variants(p.p, p.mrp),
      rating: p.rating, reviews_count: p.rc, is_featured: !!p.featured, is_bestseller: !!p.bestseller, is_combo: false, is_new: !!p.is_new,
      badge: p.badge || null, tags: p.tags,
      storage_instructions: "Store in an airtight container in a cool, dry place. Refrigerate after opening for longer freshness. Keep away from direct sunlight and moisture.",
      preparation_instructions: "Rinse thoroughly in warm water before cooking. Soak for 10–15 minutes if preferred. Cook as per your favourite coastal recipe.",
      ingredients: "100% natural sun-dried fish, edible salt.", created_at: nowIso(),
    }));
    const combos = [
      { name: "Starter Shutki Combo", img: "b88d92b542be9e9c59436f0021c0026dadd6b2c049f553d603443735561bc315", weight: "500g", varieties: 4, servings: "6-8", price: 699, mrp: 899, badge: "BEST VALUE" },
      { name: "Family Shutki Combo", img: "23c45057b866f1f79878d0d802788f0cde83a2f04cb8c4879bac803e24e91323", weight: "1kg", varieties: 6, servings: "12-15", price: 1299, mrp: 1699, badge: "MOST POPULAR" },
      { name: "Premium Coastal Combo", img: "87d0f4f2032339e1237a56d032fab274617da6c14672e597701c3d3662c19007", weight: "1.5kg", varieties: 8, servings: "18-22", price: 1899, mrp: 2499, badge: "PREMIUM" },
      { name: "Ultimate Shutki Box", img: "bca07f000ba4bc677905e0feab738c1d4425f0c2867bb5b86686e42828f009b7", weight: "3kg", varieties: 12, servings: "35+", price: 3499, mrp: 4799, badge: "PREMIUM" },
    ];
    for (const c of combos) {
      docs.push({
        name: c.name, bengali_name: "", slug: slugify(c.name),
        description: `${c.varieties} varieties • ${c.weight} • serves ${c.servings}`,
        long_description: `The ${c.name} brings together ${c.varieties} of our most-loved coastal varieties in one ${c.weight} box. Thoughtfully curated for variety, flavour and value — perfect for families and gifting.`,
        category: "Combo Packs", fish_type: "Combo", salt_level: "Regular", images: [IMG(c.img)],
        variants: [{ weight: c.weight, price: c.price, mrp: c.mrp, stock: 60, sku: sku() }],
        rating: 4.8, reviews_count: 120, is_featured: true, is_bestseller: true, is_combo: true, is_new: false, badge: c.badge, tags: ["combo"],
        combo_meta: { varieties: c.varieties, servings: c.servings, weight: c.weight, savings: c.mrp - c.price },
        storage_instructions: "Store in an airtight container in a cool, dry place. Refrigerate after opening.",
        preparation_instructions: "Rinse thoroughly before cooking.",
        ingredients: "Assorted 100% natural sun-dried fish, edible salt.", created_at: nowIso(),
      });
    }
    await db.collection("products").insertMany(docs);
  }

  if ((await db.collection("reviews").countDocuments()) === 0) {
    const rv = [
      ["Ananya Dasgupta", 5, "The Nethili shutki tastes just like what my grandmother used to make. Beautifully cleaned and packed!"],
      ["Rahul Menon", 5, "Dried prawns were incredibly fresh and aromatic. Packaging was leak-proof and premium."],
      ["Suchitra Nair", 4, "Loved the boneless shutki — so convenient for a quick weekday curry. Will reorder."],
      ["Imran Shaikh", 5, "Fast pan-India delivery and the quality is genuinely premium. The combo box is great value."],
      ["Priya Balan", 5, "Finally a brand that gets coastal flavour right. The king fish shutki is outstanding."],
      ["Debjani Roy", 5, "Authentic taste, hygienic packing and lovely branding. Highly recommend TheShutki."],
    ];
    await db.collection("reviews").insertMany(rv.map(([name, rating, text]) => ({ name, rating, text, product_id: null, verified: true, active: true, created_at: nowIso() })));
  }

  if ((await db.collection("recipes").countDocuments()) === 0) {
    const recs = [
      { title: "Spicy Nethili Shutki Bhuna", subtitle: "A fiery dry-fish bhuna with anchovies and onion masala.", img: "bb8de3f4be1b7891478f9541be6f745f10bcd78fa67e12c37880107f14cbccbb", time: "35 min", serves: "4", difficulty: "Medium", fish: "Nethili Shutki", ing: ["150g Nethili Shutki (cleaned)", "3 onions, sliced", "2 tomatoes", "1 tbsp ginger-garlic paste", "2 tsp red chilli powder", "1 tsp turmeric", "Mustard oil", "Green chillies & coriander"], steps: ["Rinse the shutki in warm water and drain.", "Dry-roast lightly, then set aside.", "Heat mustard oil, fry onions till golden.", "Add ginger-garlic, tomatoes and spices; cook to a thick masala.", "Add shutki, toss and simmer 10 minutes.", "Finish with green chillies and coriander. Serve with rice."] },
      { title: "Dried Prawn Coconut Curry", subtitle: "Creamy coconut gravy with concentrated prawn flavour.", img: "ad543c8602bd7d7199ec8f9f9862cae9d340be5ddaa7b1503a83f5fb81a4ca6c", time: "40 min", serves: "4", difficulty: "Medium", fish: "Dried Prawns", ing: ["100g dried prawns", "1 cup coconut milk", "2 onions", "Curry leaves", "1 tsp mustard seeds", "Turmeric & chilli", "Coconut oil"], steps: ["Soak dried prawns 10 minutes; drain.", "Temper mustard seeds and curry leaves in coconut oil.", "Saute onions, add spices.", "Add prawns and a little water; cook 8 minutes.", "Pour coconut milk and simmer gently.", "Serve hot with steamed rice."] },
      { title: "Shutki Bhorta", subtitle: "Smoky mashed dry-fish chutney with mustard oil.", img: "70b773d96359b63d3ee52ac7606c38a208b8247a8b9502b6c95c2d4dd56dbf75", time: "20 min", serves: "3", difficulty: "Easy", fish: "Any Shutki", ing: ["80g shutki", "2 onions, chopped", "4 dried red chillies", "3 cloves garlic", "2 tbsp mustard oil", "Salt to taste"], steps: ["Dry-roast shutki and chillies until fragrant.", "Pound with garlic and salt.", "Mix in chopped onions.", "Finish with raw mustard oil.", "Serve with hot rice."] },
      { title: "Crispy Loitta Shutki Fry", subtitle: "Golden, crunchy Bombay duck fry.", img: "b3ec347ef4bf7c2e4875c5204d3036cf32231f3348863c1d6cead1d50eac6166", time: "25 min", serves: "4", difficulty: "Easy", fish: "Bombay Duck Shutki", ing: ["150g Bombay duck shutki", "1 tsp turmeric", "2 tsp chilli powder", "Rice flour", "Oil for frying", "Salt"], steps: ["Rinse and pat dry the shutki.", "Marinate with turmeric, chilli and salt.", "Dust lightly with rice flour.", "Shallow-fry till crisp and golden.", "Drain and serve with lemon and onions."] },
      { title: "Coastal Shutki & Vegetable Stew", subtitle: "Hearty village-style stew with brinjal and drumstick.", img: "f738fb0e09e5032dbc48e4e45750c56ea17263587f781e14abbac8e21c58025a", time: "45 min", serves: "5", difficulty: "Medium", fish: "Mixed Shutki", ing: ["120g mixed shutki", "1 brinjal, cubed", "2 drumsticks", "2 potatoes", "Onion, garlic, ginger", "Turmeric & chilli", "Mustard oil"], steps: ["Soak and clean the shutki.", "Saute aromatics in mustard oil.", "Add vegetables and spices.", "Add shutki and water; simmer till tender.", "Adjust seasoning and serve with rice."] },
      { title: "Homemade Shutki Pickle (Achar)", subtitle: "Tangy, spicy dry-fish pickle that lasts for weeks.", img: "7242aa7d4acc07015a024b17b425e178594858775f04898fdadbdf39a72637d5", time: "50 min", serves: "Makes 1 jar", difficulty: "Advanced", fish: "Any Shutki", ing: ["200g shutki", "6 dried red chillies", "1 bulb garlic", "2 tbsp vinegar", "1 tsp mustard seeds", "Mustard oil", "Salt"], steps: ["Fry the shutki until crisp; set aside.", "Make a paste of chilli, garlic and mustard.", "Cook the paste in mustard oil.", "Add shutki and vinegar; cook till oil separates.", "Cool completely and store in a sterilised jar."] },
    ];
    await db.collection("recipes").insertMany(recs.map((r, i) => ({ title: r.title, slug: slugify(r.title), subtitle: r.subtitle, image: IMG(r.img), time: r.time, serves: r.serves, difficulty: r.difficulty, fish_used: r.fish, ingredients: r.ing, steps: r.steps, featured: true, order: i, created_at: nowIso() })));
  }

  if (!(await db.collection("coupons").findOne({ code: "FIRST10" }))) {
    await db.collection("coupons").insertOne({ code: "FIRST10", type: "percent", value: 10, min_order: 0, max_discount: 300, expiry: null, usage_limit: null, used: 0, active: true });
  }

  if (!(await db.collection("users").findOne({ email: "customer@test.com" }))) {
    await db.collection("users").insertOne({ name: "Test Customer", email: "customer@test.com", password_hash: hashPassword("Test@1234"), phone: "9123456780", role: "customer", created_at: nowIso() });
  }
}

module.exports = { seed };
