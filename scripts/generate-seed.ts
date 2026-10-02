/**
 * Generates supabase/seed.sql deterministically. Run: npx tsx scripts/generate-seed.ts
 * Brands and products are fictional. Images are deterministic placeholders keyed by SKU.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

// --- deterministic PRNG -----------------------------------------------------
let seed = 20261002;
function rand(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const pickN = <T,>(arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const q = (s: string | null | undefined) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a: string[]) => `array[${a.map(q).join(",")}]::text[]`;
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// --- brands -----------------------------------------------------------------
const BRANDS = [
  ["Lumière Skin", "Clinically-led skincare for Indian skin", 1, ["Dermatologist-tested", "Cruelty-free"]],
  ["Dermaveda", "Ayurveda meets dermatology", 1, ["Cruelty-free", "Vegan"]],
  ["Kaya Bloom", "Botanical actives, visible results", 2, ["Cruelty-free"]],
  ["Nectar & Co", "Honey-powered nourishment", 2, ["Cruelty-free", "Paraben-free"]],
  ["Rituals of Rasa", "Slow beauty rituals", 2, ["Vegan", "Cruelty-free"]],
  ["Velvet Ash", "Makeup for every undertone", 1, ["Cruelty-free", "Vegan"]],
  ["Noor Cosmetics", "Bold colour, weightless wear", 1, ["Cruelty-free"]],
  ["Urban Bloom", "Everyday makeup, elevated", 2, ["Cruelty-free"]],
  ["Sagebrush", "Clean haircare, zero compromise", 2, ["Sulphate-free", "Cruelty-free"]],
  ["Ivory Lane", "Salon results at home", 2, ["Cruelty-free"]],
  ["Monsoon Glow", "Hydration for humid climates", 2, ["Paraben-free"]],
  ["Himalayan Roots", "Cold-pressed oils from the hills", 2, ["Vegan", "Cruelty-free"]],
  ["ForMen Co.", "Grooming without the fuss", 1, ["Cruelty-free"]],
  ["Bare Science", "Minimal formulas, maximal proof", 1, ["Dermatologist-tested", "Fragrance-free"]],
  ["Chandni", "Fragrances inspired by Indian nights", 2, ["Cruelty-free"]],
  ["Aurelle", "Modern perfumery", 1, ["Cruelty-free", "Vegan"]],
  ["Bloomsbury Lane", "Bath & body indulgence", 2, ["Paraben-free"]],
  ["Tulsi & Thyme", "Herbal wellness, daily", 2, ["Vegan", "ISO 22000"]],
  ["Petal Theory", "Soft glam essentials", 2, ["Cruelty-free"]],
  ["Arka Botanicals", "Sun-safe, planet-safe", 2, ["Reef-safe", "Cruelty-free"]],
  ["Zest Beauty", "Vitamin-charged skincare", 2, ["Cruelty-free"]],
  ["Mira Couture", "Contemporary ethnic wear", 1, []],
  ["Indigo Threads", "Hand-loomed, honest fashion", 2, ["Fair-trade"]],
  ["Saffron Street", "Festive wear, modern cuts", 2, []],
  ["Nayra", "Western wear for Indian fits", 2, []],
  ["Crisp & Co", "Accessories that finish the look", 2, []],
  ["Ojas Wellness", "Supplements backed by science", 1, ["ISO 22000", "GMP"]],
  ["Terra Nova", "Mineral makeup, naturally", 2, ["Vegan", "Cruelty-free"]],
  ["Glow Theory", "K-beauty inspired, India made", 2, ["Cruelty-free"]],
  ["Ember Men", "Beard, shave, repeat", 2, ["Cruelty-free"]],
] as const;

// --- categories -------------------------------------------------------------
type Sub = { name: string; kind: "shade" | "size" | "default" | "apparel"; priceBand: [number, number]; brands: string[]; nonReturnable?: boolean; finish?: boolean };
const CATS: { name: string; root: "beauty" | "fashion" | "wellness"; returnDays: number; subs: Sub[] }[] = [
  {
    name: "Skincare", root: "beauty", returnDays: 30,
    subs: [
      { name: "Cleansers", kind: "size", priceBand: [299, 1299], brands: ["Lumière Skin", "Dermaveda", "Kaya Bloom", "Bare Science", "Monsoon Glow", "Glow Theory"] },
      { name: "Serums", kind: "size", priceBand: [549, 2499], brands: ["Lumière Skin", "Bare Science", "Zest Beauty", "Glow Theory", "Kaya Bloom", "Dermaveda"] },
      { name: "Moisturisers", kind: "size", priceBand: [399, 1899], brands: ["Monsoon Glow", "Nectar & Co", "Lumière Skin", "Rituals of Rasa", "Bare Science"] },
      { name: "Sunscreens", kind: "size", priceBand: [349, 1499], brands: ["Arka Botanicals", "Lumière Skin", "Dermaveda", "Bare Science"] },
      { name: "Masks & Toners", kind: "size", priceBand: [249, 1199], brands: ["Glow Theory", "Rituals of Rasa", "Kaya Bloom", "Nectar & Co"] },
    ],
  },
  {
    name: "Makeup", root: "beauty", returnDays: 30,
    subs: [
      { name: "Face", kind: "shade", priceBand: [499, 2999], brands: ["Velvet Ash", "Noor Cosmetics", "Urban Bloom", "Terra Nova", "Petal Theory"], finish: true },
      { name: "Lips", kind: "shade", priceBand: [299, 1499], brands: ["Noor Cosmetics", "Velvet Ash", "Petal Theory", "Urban Bloom"], finish: true },
      { name: "Eyes", kind: "shade", priceBand: [349, 1999], brands: ["Velvet Ash", "Urban Bloom", "Terra Nova", "Noor Cosmetics"] },
      { name: "Nails", kind: "shade", priceBand: [199, 699], brands: ["Petal Theory", "Noor Cosmetics", "Urban Bloom"], finish: true },
    ],
  },
  {
    name: "Haircare", root: "beauty", returnDays: 30,
    subs: [
      { name: "Shampoo & Conditioner", kind: "size", priceBand: [299, 1299], brands: ["Sagebrush", "Ivory Lane", "Himalayan Roots", "Rituals of Rasa"] },
      { name: "Hair Oils & Treatments", kind: "size", priceBand: [349, 1799], brands: ["Himalayan Roots", "Sagebrush", "Ivory Lane", "Dermaveda"] },
      { name: "Styling", kind: "size", priceBand: [399, 1499], brands: ["Ivory Lane", "Sagebrush"] },
    ],
  },
  {
    name: "Fragrance", root: "beauty", returnDays: 30,
    subs: [
      { name: "Women's Perfume", kind: "size", priceBand: [899, 4999], brands: ["Chandni", "Aurelle"], nonReturnable: true },
      { name: "Men's Perfume", kind: "size", priceBand: [899, 4499], brands: ["Aurelle", "Chandni", "ForMen Co."], nonReturnable: true },
    ],
  },
  {
    name: "Bath & Body", root: "beauty", returnDays: 30,
    subs: [
      { name: "Body Wash", kind: "size", priceBand: [249, 899], brands: ["Bloomsbury Lane", "Nectar & Co", "Rituals of Rasa"] },
      { name: "Body Lotion", kind: "size", priceBand: [299, 1199], brands: ["Bloomsbury Lane", "Monsoon Glow", "Nectar & Co"] },
    ],
  },
  {
    name: "Men's Grooming", root: "beauty", returnDays: 30,
    subs: [
      { name: "Beard & Shave", kind: "size", priceBand: [249, 1299], brands: ["ForMen Co.", "Ember Men"] },
      { name: "Men's Skincare", kind: "size", priceBand: [299, 1499], brands: ["ForMen Co.", "Ember Men", "Bare Science"] },
    ],
  },
  {
    name: "Wellness", root: "wellness", returnDays: 7,
    subs: [
      { name: "Supplements", kind: "size", priceBand: [499, 2499], brands: ["Ojas Wellness", "Tulsi & Thyme"] },
      { name: "Herbal & Ayurveda", kind: "size", priceBand: [199, 1299], brands: ["Tulsi & Thyme", "Dermaveda", "Himalayan Roots"] },
    ],
  },
  {
    name: "Fashion", root: "fashion", returnDays: 14,
    subs: [
      { name: "Ethnic Wear", kind: "apparel", priceBand: [1299, 7999], brands: ["Mira Couture", "Saffron Street", "Indigo Threads"] },
      { name: "Western Wear", kind: "apparel", priceBand: [899, 4999], brands: ["Nayra", "Indigo Threads"] },
      { name: "Accessories", kind: "default", priceBand: [399, 2999], brands: ["Crisp & Co", "Mira Couture"] },
    ],
  },
];

// --- product name parts -----------------------------------------------------
const NAMES: Record<string, string[]> = {
  Cleansers: ["Gentle Foaming Cleanser", "Salicylic Acid Face Wash", "Hydrating Cream Cleanser", "Micellar Water", "Oil-to-Milk Cleanser", "Charcoal Detox Face Wash", "Ceramide Cleansing Balm", "Rice Water Cleanser"],
  Serums: ["10% Vitamin C Serum", "2% Hyaluronic Acid Serum", "10% Niacinamide Serum", "Retinol Night Serum", "Alpha Arbutin Brightening Serum", "Peptide Firming Serum", "Azelaic Acid Serum", "Bakuchiol Serum", "Centella Calming Serum"],
  Moisturisers: ["Oil-Free Gel Moisturiser", "Ceramide Barrier Cream", "Niacinamide Day Cream", "Overnight Repair Cream", "Squalane Hydra Lotion", "Aloe Water Cream", "SPF 15 Day Moisturiser", "Rich Shea Night Cream"],
  Sunscreens: ["SPF 50 PA++++ Gel Sunscreen", "Mineral SPF 30 Sunscreen", "Tinted SPF 50 Sunscreen", "Invisible Sunscreen Stick", "SPF 40 Matte Sunscreen", "Aqua Light SPF 50"],
  "Masks & Toners": ["Glycolic Acid Toner", "Clay Purifying Mask", "Sheet Mask Set (5)", "Rose Hydrating Toner", "Overnight Sleeping Mask", "Enzyme Peel Mask"],
  Face: ["Weightless Serum Foundation", "Matte Perfecting Foundation", "Skin Tint SPF 20", "Cream Blush", "Radiant Concealer", "Setting Powder", "Liquid Highlighter", "Bronzer Stick"],
  Lips: ["Velvet Matte Lipstick", "Hydrating Lip Tint", "Glossy Lip Oil", "Transfer-Proof Liquid Lipstick", "Satin Bullet Lipstick", "Lip Liner", "Tinted Lip Balm"],
  Eyes: ["Volumising Mascara", "Precision Liquid Eyeliner", "Kajal Intense Black", "9-Pan Eyeshadow Palette", "Brow Sculpting Gel", "Waterproof Pencil Liner", "Shimmer Eyeshadow Stick"],
  Nails: ["Breathable Nail Lacquer", "Gel-Effect Nail Polish", "Quick-Dry Nail Colour", "Nail Strengthener", "Top Coat Shine"],
  "Shampoo & Conditioner": ["Anti-Hairfall Shampoo", "Hydrating Conditioner", "Scalp Detox Shampoo", "Keratin Smooth Shampoo", "Curl Defining Conditioner", "Colour Protect Shampoo", "Sulphate-Free Daily Shampoo"],
  "Hair Oils & Treatments": ["Cold-Pressed Coconut Hair Oil", "Bhringraj Scalp Oil", "Argan Repair Hair Mask", "Rosemary Growth Serum", "Onion Hair Oil", "Protein Bond Treatment"],
  Styling: ["Heat Protect Spray", "Sea Salt Texture Spray", "Curl Cream", "Frizz Control Serum", "Volumising Mousse"],
  "Women's Perfume": ["Jasmine Nights EDP", "Rose Oud EDP", "Mogra Bloom EDT", "Vanilla Sandal EDP", "Citrus Dawn EDT", "Saffron Musk EDP"],
  "Men's Perfume": ["Vetiver Noir EDP", "Cedar & Smoke EDT", "Ocean Drive EDT", "Oud Royale EDP", "Black Pepper EDP"],
  "Body Wash": ["Honey Oat Body Wash", "Lavender Sleep Body Wash", "Coffee Scrub Body Wash", "Rose Milk Shower Gel", "Tea Tree Body Wash"],
  "Body Lotion": ["Shea Butter Body Lotion", "Vitamin E Body Milk", "Cocoa Deep Moisture Lotion", "Cooling Aloe Body Gel", "Body Butter Whip"],
  "Beard & Shave": ["Beard Growth Oil", "Shave Gel Sensitive", "Beard Softening Balm", "Post-Shave Soother", "Beard Wash"],
  "Men's Skincare": ["Oil Control Face Wash", "Charcoal Peel-Off Mask", "SPF 50 Matte Gel for Men", "Under-Eye Roll-On", "Daily Moisturiser for Men"],
  Supplements: ["Biotin Hair Gummies", "Marine Collagen Powder", "Vitamin D3 + K2 Drops", "Glutathione Effervescent", "Omega-3 Softgels", "Probiotic Daily Capsules"],
  "Herbal & Ayurveda": ["Ashwagandha Capsules", "Kumkumadi Tailam", "Triphala Powder", "Neem & Tulsi Tablets", "Rose Water Mist", "Multani Mitti Pack"],
  "Ethnic Wear": ["Chanderi Silk Kurta Set", "Embroidered Anarkali", "Bandhani Co-ord Set", "Linen Straight Kurta", "Festive Sharara Set", "Block Print Kurta Dress", "Organza Dupatta"],
  "Western Wear": ["Linen Wrap Dress", "High-Rise Wide Leg Trousers", "Ribbed Knit Top", "Satin Slip Dress", "Oversized Cotton Shirt", "Pleated Midi Skirt"],
  Accessories: ["Pearl Drop Earrings", "Minimal Gold-Tone Chain", "Structured Tote Bag", "Printed Silk Scarf", "Oxidised Jhumkas", "Leather Belt Bag"],
};

const SIZES_ML = [["30ml", 1], ["50ml", 1.6], ["100ml", 2.8]] as const;
const SIZES_HAIR = [["200ml", 1], ["400ml", 1.8]] as const;
const SIZES_PERF = [["50ml", 1], ["100ml", 1.7]] as const;
const SIZES_SUPP = [["30 servings", 1], ["60 servings", 1.8]] as const;
const SIZES_APP = ["XS", "S", "M", "L", "XL"];
const SHADES_FACE = [["Porcelain 01", "#f3dcc9"], ["Ivory 02", "#efd1b4"], ["Beige 03", "#e5c09c"], ["Sand 04", "#d8ab83"], ["Honey 05", "#c9976b"], ["Caramel 06", "#b87f57"], ["Toffee 07", "#a66a45"], ["Mocha 08", "#8a5436"], ["Espresso 09", "#6b3f28"], ["Cocoa 10", "#4f2d1c"]];
const SHADES_LIP = [["Nude Rose", "#c98a7d"], ["Peach Crush", "#e58c6b"], ["Berry Pop", "#a8325f"], ["Classic Red", "#c0202c"], ["Brick", "#9b3b2a"], ["Mauve Mist", "#9f6b84"], ["Plum", "#5e2a4a"], ["Coral", "#f0705e"]];
const SHADES_EYE = [["Jet Black", "#0f0f0f"], ["Espresso Brown", "#3f2a1d"], ["Navy", "#1b2a52"], ["Emerald", "#1f5f4a"], ["Bronze", "#8a5a2b"]];
const SHADES_NAIL = [["Ballet Pink", "#f2c6d0"], ["Cherry", "#b3122e"], ["Nude Latte", "#c9a78b"], ["Midnight", "#1e2238"], ["Sage", "#9fb79b"], ["Lilac", "#b9a2d6"]];
const FINISHES = ["Matte", "Dewy", "Glossy", "Satin", "Natural"];
const SKIN = ["Oily", "Dry", "Combination", "Normal", "Sensitive"];
const CONCERNS = ["Acne", "Anti-aging", "Brightening", "Hydration", "Dark Spots", "Pores"];
const FREE_FROM = ["Paraben-free", "Sulphate-free", "Alcohol-free", "Fragrance-free", "Cruelty-free", "Vegan"];
const INGREDIENTS = ["Aqua", "Glycerin", "Niacinamide", "Sodium Hyaluronate", "Panthenol", "Allantoin", "Tocopherol", "Centella Asiatica Extract", "Ceramide NP", "Butylene Glycol", "Caprylic/Capric Triglyceride", "Xanthan Gum", "Phenoxyethanol", "Ethylhexylglycerin", "Citric Acid", "Zinc PCA", "Squalane", "Aloe Barbadensis Leaf Juice", "Dimethicone", "Parfum", "Alcohol Denat.", "Sodium Lauryl Sulfate"];
const FLAGGABLE = ["Parfum", "Alcohol Denat.", "Sodium Lauryl Sulfate", "Phenoxyethanol"];

// --- generation -------------------------------------------------------------
const lines: string[] = [];
lines.push("-- Generated by scripts/generate-seed.ts. Do not edit by hand.");
lines.push("begin;");

for (const [name, tagline, tier, certs] of BRANDS) {
  const slug = slugify(name);
  lines.push(
    `insert into brands (slug, name, logo_url, cover_url, tagline, about, verified, tier, socials, certifications) values (${q(slug)}, ${q(name)}, ${q(`https://picsum.photos/seed/${slug}-logo/200/200`)}, ${q(`https://picsum.photos/seed/${slug}-cover/1600/600`)}, ${q(tagline)}, ${q(`${name} is a GLAM-verified brand. ${tagline}. Every product is sourced directly from the brand and authenticated before it reaches you.`)}, true, ${tier}, '{"instagram":"https://instagram.com/${slug}","website":"https://${slug}.example"}'::jsonb, ${arr([...certs])}) on conflict (slug) do nothing;`,
  );
}

let catPos = 0;
for (const cat of CATS) {
  const slug = slugify(cat.name);
  lines.push(
    `insert into categories (slug, name, parent_id, image_url, position, root, return_window_days) values (${q(slug)}, ${q(cat.name)}, null, ${q(`https://picsum.photos/seed/cat-${slug}/600/600`)}, ${catPos++}, ${q(cat.root)}, ${cat.returnDays}) on conflict (slug) do nothing;`,
  );
  let subPos = 0;
  for (const sub of cat.subs) {
    const subSlug = slugify(`${cat.name}-${sub.name}`);
    lines.push(
      `insert into categories (slug, name, parent_id, image_url, position, root, return_window_days) values (${q(subSlug)}, ${q(sub.name)}, (select id from categories where slug = ${q(slug)}), ${q(`https://picsum.photos/seed/cat-${subSlug}/600/600`)}, ${subPos++}, ${q(cat.root)}, ${cat.returnDays}) on conflict (slug) do nothing;`,
    );
  }
}

let skuCounter = 1000;
let productCount = 0;
const productSlugs: string[] = [];
const now = new Date("2026-10-02T00:00:00Z");

for (const cat of CATS) {
  for (const sub of cat.subs) {
    const subSlug = slugify(`${cat.name}-${sub.name}`);
    const names = NAMES[sub.name];
    for (const base of names) {
      const brandsForName = rand() < 0.45 && sub.brands.length > 1 ? pickN(sub.brands, 2) : [pick(sub.brands)];
      for (const brand of brandsForName) {
      const brandSlug = slugify(brand);
      const name = `${base}`;
      const slug = slugify(`${brand}-${base}`);
      if (productSlugs.includes(slug)) continue;
      productSlugs.push(slug);
      const [lo, hi] = sub.priceBand;
      const price = Math.round(int(lo, hi) / 10) * 10 * 100; // paise, rounded to ₹10
      const discount = pick([0, 0, 10, 15, 20, 25, 30, 42, 50]);
      const mrp = discount ? Math.round((price / (1 - discount / 100)) / 100) * 100 : price;
      const proPrice = rand() < 0.35 ? Math.round((price * 0.93) / 100) * 100 : null;
      const daysOld = rand() < 0.15 ? int(1, 13) : int(30, 400);
      const launched = new Date(now.getTime() - daysOld * 86400000).toISOString();
      const sold = daysOld < 14 ? int(5, 120) : int(40, 4800);
      const ratingCount = daysOld < 14 ? int(0, 25) : int(12, 2400);
      const ratingAvg = ratingCount ? Math.round((3.6 + rand() * 1.3) * 10) / 10 : 0;
      const ratingSum = Math.round(ratingAvg * ratingCount);
      const isBeauty = cat.root === "beauty" && cat.name !== "Fragrance";
      const skinTypes = isBeauty ? pickN(SKIN, int(2, 4)) : [];
      const concerns = isBeauty ? pickN(CONCERNS, int(1, 3)) : [];
      const freeFrom = cat.root === "fashion" ? [] : pickN(FREE_FROM, int(1, 4));
      const finish = sub.finish ? pick(FINISHES) : null;
      const ingredients = cat.root === "fashion" ? [] : pickN(INGREDIENTS, int(6, 10));
      const flagged = ingredients.filter((i) => FLAGGABLE.includes(i));
      const certs = cat.root === "fashion" ? [] : pickN(["Cruelty-free", "Vegan", "Dermatologist-tested", "ISO 22716", "Fragrance-free"], int(1, 3));
      const offer = rand() < 0.12 ? "bxgy" : "none";
      const images = [1, 2, 3].map((i) => `https://picsum.photos/seed/${slug}-${i}/800/800`);
      const benefits = pickN(
        [
          "Visibly brighter skin in 2 weeks",
          "Lightweight, non-greasy texture",
          "Strengthens the skin barrier",
          "Suitable for daily use",
          "Dermatologist-tested formula",
          "Long-lasting, transfer-proof wear",
          "Deeply hydrates for 72 hours",
          "Reduces frizz and breakage",
          "Clinically proven actives",
          "Made for Indian weather",
        ],
        int(3, 5),
      );
      const howTo = [
        "Apply a small amount to clean, dry skin.",
        "Massage gently in upward strokes.",
        "Use morning and evening for best results.",
        "Follow with moisturiser and sunscreen in the day.",
      ].slice(0, int(2, 4));
      const description = `${name} by ${brand}. ${pick(benefits)}. Formulated for ${skinTypes.length ? skinTypes.join(", ").toLowerCase() + " skin" : "everyday use"}${concerns.length ? ` and targets ${concerns.join(", ").toLowerCase()}` : ""}. GLAM-verified authentic.`;
      const tags = [cat.name, sub.name, brand, ...concerns, ...skinTypes, finish ?? ""].filter(Boolean);

      lines.push(
        `insert into products (slug, name, brand_id, category_id, description, benefits, ingredients, flagged_ingredients, how_to_use, certifications, skin_types, concerns, free_from, finish, tags, images, price, mrp, pro_price, rating_avg, rating_count, base_rating_sum, base_rating_count, sold_count, is_active, non_returnable, offer_type, offer_buy, offer_get, launched_at) values (` +
          [
            q(slug), q(name),
            `(select id from brands where slug = ${q(brandSlug)})`,
            `(select id from categories where slug = ${q(subSlug)})`,
            q(description), arr(benefits), arr(ingredients), arr(flagged), arr(howTo), arr(certs), arr(skinTypes), arr(concerns), arr(freeFrom), q(finish), arr(tags), arr(images),
            price, mrp, proPrice ?? "null", ratingAvg, ratingCount, ratingSum, ratingCount, sold, "true", sub.nonReturnable ? "true" : "false",
            q(offer), offer === "bxgy" ? 2 : 0, offer === "bxgy" ? 1 : 0, q(launched),
          ].join(", ") +
          `) on conflict (slug) do nothing;`,
      );
      productCount++;

      // variants
      type V = { name: string; kind: string; hex: string | null; mult: number };
      let variants: V[] = [];
      if (sub.kind === "shade") {
        const pool = sub.name === "Face" ? SHADES_FACE : sub.name === "Lips" ? SHADES_LIP : sub.name === "Eyes" ? SHADES_EYE : SHADES_NAIL;
        variants = pickN(pool, Math.min(pool.length, int(3, 6))).map(([n, hex]) => ({ name: n, kind: "shade", hex, mult: 1 }));
      } else if (sub.kind === "size") {
        const pool = cat.name === "Haircare" ? SIZES_HAIR : cat.name === "Fragrance" ? SIZES_PERF : cat.name === "Wellness" ? SIZES_SUPP : SIZES_ML;
        const n = rand() < 0.3 ? 1 : Math.min(pool.length, int(2, 3));
        variants = pool.slice(0, n).map(([s, m]) => ({ name: s, kind: "size", hex: null, mult: m }));
      } else if (sub.kind === "apparel") {
        variants = SIZES_APP.map((s) => ({ name: s, kind: "size", hex: null, mult: 1 }));
      } else {
        variants = [{ name: "Standard", kind: "default", hex: null, mult: 1 }];
      }
      variants.forEach((v, i) => {
        const vPrice = Math.round((price * v.mult) / 100) * 100;
        const vMrp = Math.round((mrp * v.mult) / 100) * 100;
        const stock = rand() < 0.08 ? 0 : rand() < 0.1 ? int(1, 3) : int(8, 250);
        const sku = `GLM${skuCounter++}`;
        lines.push(
          `insert into variants (product_id, sku, name, kind, shade_hex, price, mrp, stock, is_default, position) values ((select id from products where slug = ${q(slug)}), ${q(sku)}, ${q(v.name)}, ${q(v.kind)}, ${q(v.hex)}, ${vPrice}, ${vMrp}, ${stock}, ${i === 0 ? "true" : "false"}, ${i}) on conflict (sku) do nothing;`,
        );
      });
      }
    }
  }
}

// pincodes
const PINS: [string, string, string, boolean, boolean, number, number][] = [
  ["400001", "Mumbai", "Maharashtra", true, true, 4900, 2], ["400050", "Mumbai", "Maharashtra", true, true, 4900, 2], ["400070", "Mumbai", "Maharashtra", true, true, 4900, 2],
  ["110001", "New Delhi", "Delhi", true, true, 4900, 2], ["110016", "New Delhi", "Delhi", true, true, 4900, 2], ["110024", "New Delhi", "Delhi", true, true, 4900, 2],
  ["560001", "Bengaluru", "Karnataka", true, true, 4900, 2], ["560034", "Bengaluru", "Karnataka", true, true, 4900, 2], ["560066", "Bengaluru", "Karnataka", true, true, 4900, 2], ["560103", "Bengaluru", "Karnataka", true, true, 4900, 2],
  ["500001", "Hyderabad", "Telangana", true, true, 4900, 2], ["500081", "Hyderabad", "Telangana", true, true, 4900, 2],
  ["600001", "Chennai", "Tamil Nadu", true, true, 4900, 2], ["600040", "Chennai", "Tamil Nadu", true, true, 4900, 2],
  ["411001", "Pune", "Maharashtra", true, true, 4900, 2], ["411014", "Pune", "Maharashtra", true, true, 4900, 2],
  ["700001", "Kolkata", "West Bengal", true, true, 4900, 3], ["700019", "Kolkata", "West Bengal", true, true, 4900, 3],
  ["380001", "Ahmedabad", "Gujarat", true, true, 4900, 3], ["380015", "Ahmedabad", "Gujarat", true, true, 4900, 3],
  ["302001", "Jaipur", "Rajasthan", true, true, 4900, 3], ["302017", "Jaipur", "Rajasthan", true, true, 4900, 3],
  ["160001", "Chandigarh", "Chandigarh", true, true, 4900, 3], ["226001", "Lucknow", "Uttar Pradesh", true, true, 4900, 3], ["682001", "Kochi", "Kerala", true, true, 4900, 3],
  ["641001", "Coimbatore", "Tamil Nadu", false, true, 5900, 4], ["452001", "Indore", "Madhya Pradesh", false, true, 5900, 4], ["395001", "Surat", "Gujarat", false, true, 5900, 4],
  ["440001", "Nagpur", "Maharashtra", false, true, 5900, 4], ["462001", "Bhopal", "Madhya Pradesh", false, true, 5900, 4], ["800001", "Patna", "Bihar", false, false, 6900, 5],
  ["781001", "Guwahati", "Assam", false, false, 7900, 6], ["248001", "Dehradun", "Uttarakhand", false, true, 5900, 4], ["570001", "Mysuru", "Karnataka", false, true, 5900, 4],
  ["390001", "Vadodara", "Gujarat", false, true, 5900, 4], ["530001", "Visakhapatnam", "Andhra Pradesh", false, true, 5900, 4], ["834001", "Ranchi", "Jharkhand", false, false, 6900, 5],
  ["695001", "Thiruvananthapuram", "Kerala", false, true, 5900, 4], ["403001", "Panaji", "Goa", false, true, 5900, 4], ["190001", "Srinagar", "Jammu & Kashmir", false, false, 8900, 7],
];
for (const [pin, city, state, sameDay, nextDay, fee, days] of PINS) {
  lines.push(
    `insert into pincodes (pincode, city, state, same_day, next_day, delivery_fee, cod_available, standard_days, courier) values (${q(pin)}, ${q(city)}, ${q(state)}, ${sameDay}, ${nextDay}, ${fee}, ${pin !== "190001"}, ${days}, ${q(pick(["Delhivery", "Bluedart", "Ecom Express", "Xpressbees"]))}) on conflict (pincode) do nothing;`,
  );
}

// coupons
lines.push(`insert into coupons (code, kind, value, max_discount, min_order, description, ends_at, usage_limit, per_user_limit) values ('GLAM200', 'flat', 20000, null, 99900, 'Flat ₹200 off on orders above ₹999', now() + interval '60 days', 100000, 1) on conflict (code) do nothing;`);
lines.push(`insert into coupons (code, kind, value, max_discount, min_order, description, ends_at, usage_limit, per_user_limit) values ('FREESHIP', 'free_delivery', 0, null, 49900, 'Free delivery on orders above ₹499', now() + interval '90 days', null, 5) on conflict (code) do nothing;`);
lines.push(`insert into coupons (code, kind, value, max_discount, min_order, description, ends_at, pro_only, per_user_limit) values ('PRO10', 'percent', 10, 50000, 0, 'GLAM Pro exclusive: 10% off (max ₹500)', now() + interval '90 days', true, 10) on conflict (code) do nothing;`);
lines.push(`insert into coupons (code, kind, value, max_discount, min_order, scope, scope_id, description, ends_at, per_user_limit) values ('SKIN20', 'percent', 20, 40000, 79900, 'category', (select id from categories where slug = 'skincare'), '20% off skincare (max ₹400) on orders above ₹799', now() + interval '14 days', 2) on conflict (code) do nothing;`);
lines.push(`insert into coupons (code, kind, value, max_discount, min_order, scope, scope_id, description, ends_at, per_user_limit) values ('VELVET15', 'percent', 15, 30000, 0, 'brand', (select id from brands where slug = 'velvet-ash'), '15% off Velvet Ash makeup', now() + interval '30 days', 3) on conflict (code) do nothing;`);
lines.push(`insert into coupons (code, kind, value, max_discount, min_order, description, ends_at, usage_limit, per_user_limit, is_active) values ('EXPIRED10', 'percent', 10, 10000, 0, 'Expired test coupon', now() - interval '1 day', null, 1, true) on conflict (code) do nothing;`);

// banners & editorial
const banners = [
  ["Festive Glow Sale", "Up to 50% off on skincare & makeup", "Shop the sale", "/flash-sale"],
  ["New: Velvet Ash Foundation", "10 shades. One skin-like finish.", "Explore", "/b/velvet-ash"],
  ["Sun-safe Season", "SPF 50 picks for every skin type", "Shop sunscreens", "/c/skincare-sunscreens"],
  ["GLAM Pro", "Free delivery on every order. ₹299/month.", "Join Pro", "/pro"],
  ["Ethnic Edit", "Festive wear from Mira Couture & Saffron Street", "Shop ethnic", "/c/fashion-ethnic-wear"],
];
banners.forEach(([t, s, c, h], i) => {
  lines.push(`insert into banners (title, subtitle, image_url, cta_label, href, position, is_active) values (${q(t)}, ${q(s)}, ${q(`https://picsum.photos/seed/banner-${i + 1}/1600/900`)}, ${q(c)}, ${q(h)}, ${i}, true);`);
});
const editorial = [
  ["The 3-step routine for monsoon skin", "Humidity-proof your skincare with lightweight layers.", "/c/skincare"],
  ["Shade matching 101", "How to find your foundation match without the guesswork.", "/c/makeup-face"],
  ["Ingredient decoder: niacinamide", "What it does, who it's for, and how to layer it.", "/search?q=niacinamide"],
];
editorial.forEach(([t, e, h], i) => {
  lines.push(`insert into editorial_cards (title, excerpt, image_url, href, position, is_active) values (${q(t)}, ${q(e)}, ${q(`https://picsum.photos/seed/edit-${i + 1}/900/600`)}, ${q(h)}, ${i}, true);`);
});

// flash sale: 12 products at ~30% off current price, active now for 3 days
lines.push(`insert into flash_sales (id, name, starts_at, ends_at, is_active, banner_url) values ('11111111-1111-1111-1111-111111111111', 'Festive Flash Sale', now() - interval '1 hour', now() + interval '3 days', true, 'https://picsum.photos/seed/flash/1600/900') on conflict (id) do nothing;`);
for (const slug of pickN(productSlugs, 12)) {
  lines.push(`insert into flash_sale_items (flash_sale_id, product_id, sale_price) select '11111111-1111-1111-1111-111111111111', id, (round(price * 0.7 / 100) * 100)::integer from products where slug = ${q(slug)} on conflict do nothing;`);
}

lines.push("commit;");
const out = path.join(process.cwd(), "supabase", "seed.sql");
writeFileSync(out, lines.join("\n") + "\n");
console.log(`wrote ${out}: ${productCount} products, ${skuCounter - 1000} variants, ${BRANDS.length} brands, ${PINS.length} pincodes`);
