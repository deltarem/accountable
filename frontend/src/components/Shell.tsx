import { Package } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { Toaster } from "sonner";

import { formatDate } from "../lib/dates";
import { useToday } from "../lib/useToday";
import { ConnectionMessage } from "./ConnectionMessage";
import { Icon, type IconName } from "./Icon";
import { UserMenu } from "./UserMenu";

const ICON_SIZE = 17;

function designIcon(name: IconName) {
  return <Icon name={name} size={ICON_SIZE} />;
}

// The design's own icons, and lucide-react's for Products, which the design doesn't show.
const SECTIONS: { to: string; label: string; icon: ReactNode }[] = [
  { to: "/", label: "Dashboard", icon: designIcon("dashboard") },
  { to: "/organizations", label: "Organizations", icon: designIcon("organizations") },
  { to: "/contacts", label: "Contacts", icon: designIcon("contacts") },
  { to: "/deals", label: "Deals", icon: designIcon("deals") },
  { to: "/pipeline", label: "Pipeline", icon: designIcon("pipeline") },
  {
    to: "/products",
    label: "Products",
    icon: <Package size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" className="flex-none" />,
  },
];

/** The top bar and the page under it. The search box comes from App.tsx, because it knows about records. */
export function Shell({ search }: { search: ReactNode }) {
  const today = useToday();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-5 mt-3 flex h-14 flex-none items-center gap-5 rounded-panel bg-panel pr-[18px] pl-5">
        <div className="text-[19px] leading-6 font-semibold">Accountable</div>
        <nav aria-label="Sections" className="flex gap-0.5">
          {SECTIONS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex h-9 items-center gap-[7px] rounded-control px-2.5 font-medium ${
                  isActive ? "bg-sea-green font-semibold text-midnight" : "hover:bg-page"
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {search}
          <span className="num text-[13px] whitespace-nowrap text-muted">{formatDate(today)}</span>
          <UserMenu />
        </div>
      </header>
      <ConnectionMessage />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <Toaster position="bottom-center" toastOptions={{ className: "font-sans" }} />
    </div>
  );
}
