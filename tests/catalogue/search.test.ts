import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  DEFAULT_PAGE_SIZE,
  filtersToSearchParams,
  parseListFilters,
} from "@/lib/catalogue/search";
import type { ListFilters } from "@/lib/catalogue/types";

const parse = (qs: string) => parseListFilters(new URLSearchParams(qs));

describe("parseListFilters", () => {
  it("fills defaults for an empty query", () => {
    expect(parse("")).toEqual({ sort: "relevance", page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it("trims q and ignores blank values", () => {
    expect(parse("q=%20serum%20").q).toBe("serum");
    expect(parse("q=%20%20").q).toBeUndefined();
  });

  it("accepts repeated and comma-separated multi-value keys, de-duplicated", () => {
    const f = parse("brand=velvet-ash&brand=dermaveda,velvet-ash&skin=Oily,Dry&concern=Acne&free_from=Vegan&finish=Matte&size=30ml");
    expect(f.brands).toEqual(["velvet-ash", "dermaveda"]);
    expect(f.skinTypes).toEqual(["Oily", "Dry"]);
    expect(f.concerns).toEqual(["Acne"]);
    expect(f.freeFrom).toEqual(["Vegan"]);
    expect(f.finish).toEqual(["Matte"]);
    expect(f.sizes).toEqual(["30ml"]);
  });

  it("converts rupee price bounds to paise and orders them", () => {
    expect(parse("price_min=500&price_max=1500")).toMatchObject({ priceMin: 50000, priceMax: 150000 });
    expect(parse("price_min=1500&price_max=500")).toMatchObject({ priceMin: 50000, priceMax: 150000 });
    expect(parse("price_min=abc&price_max=-5")).not.toHaveProperty("priceMin");
    expect(parse("price_min=abc&price_max=-5")).not.toHaveProperty("priceMax");
  });

  it("only accepts known discount, rating, sort, delivery and offer values", () => {
    expect(parse("discount=30&rating=4&sort=price_asc&delivery=same_day&offer=flash,bogus,bxgy")).toMatchObject({
      discount: 30,
      rating: 4,
      sort: "price_asc",
      delivery: "same_day",
      offer: ["flash", "bxgy"],
    });
    const bad = parse("discount=25&rating=5&sort=magic&delivery=drone&offer=bogus");
    expect(bad.discount).toBeUndefined();
    expect(bad.rating).toBeUndefined();
    expect(bad.sort).toBe("relevance");
    expect(bad.delivery).toBeUndefined();
    expect(bad.offer).toBeUndefined();
  });

  it("parses in_stock as a flag and pincode as text", () => {
    expect(parse("in_stock=1").inStock).toBe(true);
    expect(parse("in_stock=true").inStock).toBe(true);
    expect(parse("in_stock=0").inStock).toBeUndefined();
    expect(parse("pincode=400001").pincode).toBe("400001");
  });

  it("clamps page_size to 48 and floors page to an integer >= 1", () => {
    expect(parse("page_size=100").pageSize).toBe(48);
    expect(parse("page_size=12").pageSize).toBe(12);
    expect(parse("page_size=0").pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parse("page=3.7").page).toBe(3);
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=-2").page).toBe(1);
  });
});

describe("filtersToSearchParams", () => {
  it("omits defaults and empty values", () => {
    const sp = filtersToSearchParams({ sort: "relevance", page: 1, pageSize: DEFAULT_PAGE_SIZE, brands: [] });
    expect(sp.toString()).toBe("");
  });

  it("writes rupees in the URL and repeats multi-value keys", () => {
    const sp = filtersToSearchParams({ priceMin: 50000, priceMax: 149950, brands: ["a", "b"], sort: "newest", page: 2, pageSize: 48 });
    expect(sp.get("price_min")).toBe("500");
    expect(sp.get("price_max")).toBe("1499.5");
    expect(sp.getAll("brand")).toEqual(["a", "b"]);
    expect(sp.get("sort")).toBe("newest");
    expect(sp.get("page")).toBe("2");
    expect(sp.get("page_size")).toBe("48");
  });

  it("round-trips through parseListFilters", () => {
    const original: ListFilters = {
      q: "vitamin c",
      category: "skincare-serums",
      brands: ["dermaveda", "bare-science"],
      priceMin: 29900,
      priceMax: 249900,
      discount: 20,
      rating: 4,
      skinTypes: ["Oily", "Combination"],
      concerns: ["Acne", "Dark Spots"],
      freeFrom: ["Vegan"],
      finish: ["Matte"],
      sizes: ["30ml", "50ml"],
      inStock: true,
      delivery: "next_day",
      offer: ["on_sale", "flash"],
      sort: "discount",
      page: 3,
      pageSize: 12,
      pincode: "400001",
    };
    const once = parseListFilters(filtersToSearchParams(original));
    expect(once).toEqual(original);
    const twice = parseListFilters(filtersToSearchParams(once));
    expect(twice).toEqual(once);
  });
});

describe("activeFilterCount", () => {
  it("ignores q, category, sort, pagination and pincode", () => {
    expect(activeFilterCount({ q: "x", category: "makeup", sort: "newest", page: 4, pageSize: 48, pincode: "400001" })).toBe(0);
  });

  it("counts each selected value, with the price range counting once", () => {
    expect(
      activeFilterCount({
        brands: ["a", "b"],
        priceMin: 100,
        priceMax: 200,
        discount: 10,
        rating: 4,
        skinTypes: ["Oily"],
        concerns: ["Acne", "Pores"],
        inStock: true,
        delivery: "same_day",
        offer: ["bxgy"],
      }),
    ).toBe(2 + 1 + 1 + 1 + 1 + 2 + 1 + 1 + 1);
    expect(activeFilterCount({ delivery: "standard" })).toBe(0);
  });
});
