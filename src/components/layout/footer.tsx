import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface pb-20 md:pb-8 no-print">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-text-secondary">
            India&apos;s beauty &amp; lifestyle marketplace. Verified brands. Real reviews. Delivered fast.
          </p>
        </div>
        <FooterCol
          title="Shop"
          links={[
            ["/c/skincare", "Skincare"],
            ["/c/makeup", "Makeup"],
            ["/c/haircare", "Haircare"],
            ["/c/fashion", "Fashion"],
            ["/flash-sale", "Flash Sale"],
            ["/offers", "Offers & Coupons"],
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            ["/orders", "My Orders"],
            ["/profile/rewards", "GLAM Rewards"],
            ["/pro", "GLAM Pro"],
            ["/wishlist", "Wishlist"],
            ["/help", "Help & Support"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["/help#returns", "Returns Policy"],
            ["/help#privacy", "Privacy Policy"],
            ["/help#terms", "Terms of Service"],
            ["/help#contact", "Contact Us"],
          ]}
        />
      </div>
      <p className="px-4 pb-4 text-center text-xs text-text-tertiary">© 2026 GLAM Technologies Pvt. Ltd. Prices inclusive of all taxes.</p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      <ul className="flex flex-col gap-2 text-sm text-text-secondary">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-primary">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
