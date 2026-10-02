import type { ProductDetail } from "@/lib/catalogue/types";

/** schema.org Product markup with offers and aggregateRating (PRD §8.5 SEO). */
export function ProductJsonLd({ product, url }: { product: ProductDetail; url: string }) {
  const inStock = product.variants.some((v) => v.stock > 0);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.description.slice(0, 500),
    sku: product.variants.find((v) => v.isDefault)?.sku ?? product.variants[0]?.sku,
    brand: { "@type": "Brand", name: product.brand.name },
    category: product.category.name,
    url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: (Math.min(...product.variants.map((v) => v.price), product.flashPrice ?? Infinity) / 100).toFixed(2),
      highPrice: (Math.max(...product.variants.map((v) => v.price)) / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(product.ratingAvg).toFixed(1),
            reviewCount: product.ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
