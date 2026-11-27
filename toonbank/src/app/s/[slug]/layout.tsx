import type { Metadata } from "next";
import Link from "next/link";

import { readCart } from "@/lib/cart";
import { imageUrl } from "@/lib/images";
import { stripeEnabled } from "@/lib/stripe";
import { getNavCollections, getStore, onAccent } from "@/lib/storefront";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const store = await getStore((await params).slug);
  return {
    title: { default: store.name, template: `%s · ${store.name}` },
    description: store.tagline || store.description.slice(0, 160) || `Webshop van ${store.name}`,
    icons: store.logoImageId ? { icon: imageUrl(store.logoImageId)! } : undefined,
  };
}

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  const [collections, cart] = await Promise.all([getNavCollections(store.id), readCart(store.id)]);
  const count = cart.reduce((s, e) => s + e.q, 0);
  const logo = imageUrl(store.logoImageId);

  const style = { "--accent": store.accentColor, "--on-accent": onAccent(store.accentColor) } as React.CSSProperties;

  return (
    <div style={style} className="flex min-h-screen flex-col bg-white">
      {!store.published && (
        <div className="bg-ink-900 px-4 py-1.5 text-center text-xs text-white">
          Je winkel is gesloten. Alleen jij ziet dit. Open hem bij Instellingen.
        </div>
      )}
      {!stripeEnabled() && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
          Testwinkel: bestellen kan, maar er wordt niets echt betaald of verzonden.
        </div>
      )}
      {store.freeShippingCents != null && (
        <div className="bg-accent text-on-accent px-4 py-1.5 text-center text-xs font-medium">
          Gratis verzending vanaf {new Intl.NumberFormat("nl-BE", { style: "currency", currency: store.currency, maximumFractionDigits: 0 }).format(store.freeShippingCents / 100)}
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4 sm:px-6">
          <Link href={`/s/${slug}`} className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo} alt="" className="h-8 w-auto max-w-[120px] object-contain" />}
            <span className="font-serif text-xl font-semibold tracking-tight">{store.name}</span>
          </Link>
          <nav className="hidden flex-1 gap-5 text-sm md:flex">
            <Link href={`/s/${slug}/products`} className="text-ink-600 hover:text-ink-950">
              Alles
            </Link>
            {collections.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/s/${slug}/collections/${c.handle}`} className="text-ink-600 hover:text-ink-950">
                {c.title}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <form action={`/s/${slug}/products`} className="hidden sm:block">
              <input name="q" placeholder="Zoeken" aria-label="Zoeken" className="w-36 rounded-full border border-ink-200 px-3 py-1.5 text-sm outline-none focus:w-48 focus:border-ink-400" />
            </form>
            <Link href={`/s/${slug}/cart`} className="relative text-sm font-medium" aria-label={`Winkelwagen, ${count} artikelen`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="20" r="1.3" />
                <circle cx="17" cy="20" r="1.3" />
              </svg>
              {count > 0 && (
                <span className="bg-accent text-on-accent absolute -top-1.5 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px]">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        {collections.length > 0 && (
          <nav className="flex gap-4 overflow-x-auto px-4 pb-3 text-sm md:hidden">
            <Link href={`/s/${slug}/products`} className="shrink-0 text-ink-600">Alles</Link>
            {collections.map((c) => (
              <Link key={c.id} href={`/s/${slug}/collections/${c.handle}`} className="shrink-0 text-ink-600">
                {c.title}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-ink-100 bg-ink-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-serif text-lg font-semibold">{store.name}</p>
            {store.description && <p className="mt-2 whitespace-pre-line text-ink-600">{store.description}</p>}
          </div>
          <div>
            <p className="font-medium">Winkel</p>
            <ul className="mt-2 space-y-1 text-ink-600">
              <li><Link href={`/s/${slug}/products`} className="hover:underline">Alle producten</Link></li>
              {collections.slice(0, 5).map((c) => (
                <li key={c.id}><Link href={`/s/${slug}/collections/${c.handle}`} className="hover:underline">{c.title}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Contact</p>
            <a href={`mailto:${store.email}`} className="mt-2 block text-ink-600 hover:underline">{store.email}</a>
            <p className="mt-4 text-xs text-ink-400">Veilig betalen met Bancontact, kaart en meer.</p>
          </div>
        </div>
        <p className="pb-6 text-center text-xs text-ink-400">
          © {new Date().getFullYear()} {store.name} · Gemaakt met <Link href="/" className="hover:underline">Toonbank</Link>
        </p>
      </footer>
    </div>
  );
}
