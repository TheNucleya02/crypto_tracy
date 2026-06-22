import { Suspense, lazy, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Portfolio = lazy(() => import("@/pages/portfolio"));
const Assistant = lazy(() => import("@/pages/assistant"));
const Market = lazy(() => import("@/pages/market"));

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/portfolio": "Portfolio",
  "/assistant": "AI Assistant",
  "/market": "Market",
};

function currentTitle(pathname: string) {
  for (const key of Object.keys(TITLES)) {
    if (key === "/" ? pathname === "/" : pathname.startsWith(key)) return TITLES[key];
  }
  return "Momentum";
}

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background bg-grid">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenu={() => setSidebarOpen(true)} title={currentTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-[1440px] px-4 md:px-6 py-6 md:py-8">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/market" element={<Market />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
