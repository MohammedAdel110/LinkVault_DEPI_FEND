import { Link, useLocation } from "react-router-dom";
import { Bookmark, Folder, StickyNote, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const links = [
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { href: "/categories", label: "Categories", icon: Folder },
    { href: "/notes", label: "Notes", icon: StickyNote },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-6 gap-4">
        {/* Logo */}
        <Link to="/bookmarks" className="flex items-center w-48 shrink-0 -ml-2">
          <img src="/logo.png" alt="LinkVault" className="h-8 w-auto object-contain scale-[3] origin-left transition-all dark:brightness-0 dark:invert" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-6 flex-1">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "relative flex items-center gap-1.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute -bottom-4 left-0 h-0.5 w-full bg-accent rounded-t-full transition-all" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          
          <span className="hidden sm:inline-block max-w-[150px] truncate text-sm text-muted-foreground ml-2 mr-1">
            {user?.email}
          </span>
          
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-surface-alt hover:text-foreground text-muted-foreground"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Nav (simple bottom bar or integrated, but for now we keep it simple) */}
      <div className="sm:hidden flex items-center justify-between px-6 py-2 border-t bg-background">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 text-xs font-medium text-muted-foreground transition-colors",
                isActive && "text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
