"use client";

import { useEffect, useState } from "react";

const NAV = [
  { label: "Queue Tracker", href: "https://interconnection-queue.kardashevlabs.org" },
  { label: "Grid Demand",   href: "https://grid-demand.kardashevlabs.org" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header
        className="fixed left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
        style={{ top: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <div
          className="pointer-events-auto flex items-center gap-4 md:gap-8 px-5 md:pl-6 md:pr-3 py-2.5 rounded-full transition-all duration-500 w-max max-w-[calc(100vw-2rem)]"
          style={{
            background: scrolled ? "rgba(5,15,11,0.88)" : "rgba(5,15,11,0.45)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
            border: "1px solid rgba(52,211,153,0.12)",
          }}
        >
          <a
            href="https://kardashevlabs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm font-semibold text-white tracking-tight hover:text-white/80 transition-colors duration-300"
          >
            Kardashev<span style={{ color: "#34d399" }}>Labs</span>
          </a>

          <span className="hidden md:block h-4 w-px shrink-0 bg-white/10" aria-hidden />

          <nav className="hidden md:flex items-center gap-6">
            {NAV.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-medium text-white/45 hover:text-white/85 transition-colors duration-300 whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href="https://github.com/kardashev-lab/curtailment-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white/75 hover:text-white transition-all duration-300"
            style={{
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.18)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden min-w-11 min-h-11 flex flex-col items-center justify-center gap-[5px]"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span
              className="block w-4 h-px bg-white/70 origin-center transition-transform duration-300"
              style={{ transform: menuOpen ? "rotate(45deg) translateY(4.5px)" : undefined }}
            />
            <span
              className="block w-4 h-px bg-white/70 origin-center transition-transform duration-300"
              style={{ transform: menuOpen ? "rotate(-45deg) translateY(-4.5px)" : undefined }}
            />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          {NAV.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-2xl font-semibold text-white/80 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/kardashev-lab/curtailment-tracker"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-3 text-2xl font-semibold text-white/80 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
        </div>
      )}
    </>
  );
}
