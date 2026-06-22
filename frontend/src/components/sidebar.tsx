import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Bot, ChartLine as LineChart, GitFork as Github, X, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Portfolio", path: "/portfolio", icon: Wallet },
  { label: "AI Assistant", path: "/assistant", icon: Bot },
  { label: "Market", path: "/market", icon: LineChart },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function go(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto border-r border-sidebar-border",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border">
          <button onClick={() => go("/")} className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-500 shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight">Momentum</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Crypto Suite
              </span>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto scrollbar-thin">
          <div className="px-3 mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            Navigate
          </div>
          {NAV.map((item) => {
            const active =
              item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-[1.05rem] w-[1.05rem] group-hover:scale-110 transition-transform" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}

          <div className="mt-auto pt-4">
            <a
              href="https://github.com/TheNucleya02/crypto-assistant-backend"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
            >
              <Github className="h-[1.05rem] w-[1.05rem]" />
              <span>Backend Repo</span>
            </a>
            <div className="mt-3 mx-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-sidebar-foreground">Demo Mode</span>
                <Badge variant="success" className="text-[9px] px-1.5 py-0">live</Badge>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Live market data feed & portfolio persistence.
              </p>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
