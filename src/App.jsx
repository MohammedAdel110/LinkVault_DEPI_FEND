import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { AnimatePresence, motion } from "framer-motion";

// Pages
import Login from "@/pages/Login";
import Categories from "@/pages/Categories";
import Bookmarks from "@/pages/Bookmarks";
import BookmarkDetail from "@/pages/BookmarkDetail";
import Notes from "@/pages/Notes";

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <Navbar />
      <main className="mx-auto max-w-6xl p-6">
        {children}
      </main>
    </div>
  );
}

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route 
            path="/categories" 
            element={<AppLayout><PageWrapper><Categories /></PageWrapper></AppLayout>} 
          />
          <Route 
            path="/bookmarks" 
            element={<AppLayout><PageWrapper><Bookmarks /></PageWrapper></AppLayout>} 
          />
          <Route 
            path="/bookmarks/:id" 
            element={<AppLayout><PageWrapper><BookmarkDetail /></PageWrapper></AppLayout>} 
          />
          <Route 
            path="/notes" 
            element={<AppLayout><PageWrapper><Notes /></PageWrapper></AppLayout>} 
          />
          <Route path="/" element={<Navigate to="/bookmarks" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
