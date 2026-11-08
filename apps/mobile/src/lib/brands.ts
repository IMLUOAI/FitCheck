/**
 * Popular fashion brands for external shopping from the closet search.
 * Tapping a brand opens that brand's own official online store — with the
 * user's typed query in the brand's search when one was typed, otherwise
 * the store homepage. No marketplaces: these are the brands' own sites.
 */
import { Linking } from "react-native";

export interface BrandLink {
  name: string;
  home: string;
  searchUrl: (query: string) => string;
}

const enc = (q: string) => encodeURIComponent(q);

/** Salesforce Commerce Cloud storefronts use ?searchTerm=. */
const sfccSearch =
  (base: string) =>
  (q: string): string =>
    `${base}/search?searchTerm=${enc(q)}`;

/** Gap Inc. brand sites use /browse/search?searchText=. */
const gapSearch =
  (base: string) =>
  (q: string): string =>
    `${base}/browse/search?searchText=${enc(q)}`;

export const POPULAR_BRANDS: BrandLink[] = [
  {
    name: "Nike",
    home: "https://www.nike.com/",
    searchUrl: (q) => `https://www.nike.com/w?q=${enc(q)}`,
  },
  {
    name: "Adidas",
    home: "https://www.adidas.com/us/",
    searchUrl: (q) => `https://www.adidas.com/us/search?q=${enc(q)}`,
  },
  {
    name: "Polo",
    home: "https://www.ralphlauren.com/",
    // Polo is Ralph Lauren's label, so a Polo tap searches RL for polo
    // pieces (plus the typed query when there is one).
    searchUrl: (q) =>
      `https://www.ralphlauren.com/search?searchTerm=${enc(q ? `polo ${q}` : "polo")}`,
  },
  {
    name: "Ralph Lauren",
    home: "https://www.ralphlauren.com/",
    searchUrl: sfccSearch("https://www.ralphlauren.com"),
  },
  {
    name: "Banana Republic",
    home: "https://bananarepublic.gap.com/",
    searchUrl: gapSearch("https://bananarepublic.gap.com"),
  },
  {
    name: "Coach",
    home: "https://www.coach.com/",
    searchUrl: sfccSearch("https://www.coach.com"),
  },
  {
    name: "Levi's",
    home: "https://www.levi.com/",
    searchUrl: sfccSearch("https://www.levi.com/US/en_US"),
  },
  {
    name: "Gap",
    home: "https://www.gap.com/",
    searchUrl: gapSearch("https://www.gap.com"),
  },
  {
    name: "Old Navy",
    home: "https://oldnavy.gap.com/",
    searchUrl: gapSearch("https://oldnavy.gap.com"),
  },
  {
    name: "Tommy Hilfiger",
    home: "https://usa.tommy.com/",
    searchUrl: sfccSearch("https://usa.tommy.com"),
  },
  {
    name: "Calvin Klein",
    home: "https://www.calvinklein.us/",
    searchUrl: sfccSearch("https://www.calvinklein.us"),
  },
  {
    name: "Zara",
    home: "https://www.zara.com/us/",
    searchUrl: (q) => `https://www.zara.com/us/en/search?searchTerm=${enc(q)}`,
  },
];

/** Store URL for a brand: search with the typed query, else the homepage. */
export function brandUrl(brand: BrandLink, query: string): string {
  const q = query.trim();
  return q ? brand.searchUrl(q) : brand.home;
}

export async function openBrandLink(
  brand: BrandLink,
  query: string,
): Promise<void> {
  await Linking.openURL(brandUrl(brand, query));
}
