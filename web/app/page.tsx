import { Hero } from "@/components/home/Hero";
import { TrendingSquads } from "@/components/home/TrendingSquads";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { ProductGrid } from "@/components/home/ProductGrid";
import { TrustBadges } from "@/components/home/TrustBadges";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrendingSquads />
      <CategoryShowcase />
      <ProductGrid
        title="Featured for Solo Purchase"
        subtitle="Can't wait for a group? Buy these items instantly at standard prices"
        viewAllHref="/products"
        options={{ limit: 8, sort: "-createdAt" }}
      />
      <TrustBadges />
    </>
  );
}
