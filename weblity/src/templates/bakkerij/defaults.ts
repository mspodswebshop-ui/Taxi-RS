import type { SiteContent } from "@/lib/content";

/** Startinhoud voor een nieuwe bakkerijsite. De klant past dit daarna zelf aan. */
export function bakkerijDefaults(businessName: string): SiteContent {
  return {
    business: {
      name: businessName,
      tagline: "Elke dag vers brood en gebak, met liefde gebakken.",
      street: "",
      city: "",
      phone: "",
      whatsapp: "",
      email: "",
      googleUrl: "",
      googleRating: 0,
      googleCount: 0,
    },
    hero: {
      title: "Elke ochtend",
      highlight: "vers",
      titleEnd: "uit de oven",
      intro: "Ambachtelijk brood en zoet gebak, met liefde gebakken. Kom langs of bestel vooraf en haal het warm af.",
    },
    highlights: ["Dagelijks vers gebakken", "Ambachtelijke recepten", "Taarten op bestelling"],
    about: {
      title: "Een familiebakkerij met hart voor de buurt",
      body: "Vertel hier het verhaal van je zaak: wie je bent, sinds wanneer je bakt en wat jullie bijzonder maakt.",
      quote: "Goed brood heeft tijd nodig.",
    },
    hours: [
      { closed: false, open: "07:00", close: "13:00" },
      { closed: false, open: "06:30", close: "18:30" },
      { closed: false, open: "06:30", close: "18:30" },
      { closed: false, open: "06:30", close: "18:30" },
      { closed: false, open: "06:30", close: "18:30" },
      { closed: false, open: "06:30", close: "18:30" },
      { closed: false, open: "06:30", close: "18:30" },
    ],
    hoursNote: "",
    categories: ["Brood", "Zoet", "Op bestelling"],
    products: [
      { id: "p1", name: "Wit brood", description: "Krokante korst, luchtige kruim.", priceCents: 260, category: "Brood", art: "loaf", featured: true, visible: true },
      { id: "p2", name: "Croissant", description: "Boterig en gelaagd.", priceCents: 130, category: "Zoet", art: "croissant", featured: true, visible: true },
      { id: "p3", name: "Feesttaart (8 pers.)", description: "Naar keuze, 48 uur op voorhand.", priceCents: 3200, category: "Op bestelling", art: "cake", featured: true, visible: true },
    ],
    reviews: [],
    showReviews: true,
    ordering: {
      enabled: true,
      note: "Voor grote bestellingen of taarten: minstens 48 uur op voorhand.",
      greeting: "Hallo, ik wil graag bestellen:",
    },
    theme: { primary: "#b5492b", accent: "#e9a23b", secondary: "#2c4a9a" },
  };
}
