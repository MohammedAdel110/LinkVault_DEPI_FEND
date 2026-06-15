import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import apiClient from "@/api/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

function AnimatedMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20 mix-blend-screen dark:mix-blend-color-dodge">
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -100, 50, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-accent blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, -80, 40, 0],
          y: [0, 80, -60, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 2 }}
        className="absolute top-[40%] right-[10%] w-[50%] h-[50%] rounded-full bg-warning blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, 50, -100, 0],
          y: [0, 120, -40, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 1 }}
        className="absolute -bottom-[20%] left-[20%] w-[70%] h-[70%] rounded-full bg-success blur-[100px]"
      />
    </div>
  );
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated, setToken } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/bookmarks", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "demo@linkvault.com",
    password: "Password123!",
  });

  const [errors, setErrors] = useState({});

  const handleInput = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: null }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Basic client validation
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!isLogin) {
      if (!formData.firstName) newErrors.firstName = "First name is required";
      if (!formData.lastName) newErrors.lastName = "Last name is required";
      if (formData.password && formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await apiClient.post("/api/auth/login", {
          email: formData.email,
          password: formData.password,
        });
        if (res?.token) {
          setToken(res.token);
          toast.success("Logged in successfully");
          navigate("/bookmarks", { replace: true });
        } else {
          toast.error("Invalid response from server");
        }
      } else {
        await apiClient.post("/api/auth/register", {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        });
        toast.success("Account created! Please log in.");
        setIsLogin(true);
        setFormData((prev) => ({ ...prev, password: "" }));
      }
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        const formatted = {};
        Object.keys(serverErrors).forEach(key => {
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
          formatted[lowerKey] = Array.isArray(serverErrors[key]) ? serverErrors[key][0] : serverErrors[key];
        });
        setErrors(formatted);
      } else {
        toast.error(err.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background relative overflow-hidden">
      {/* Background Mesh */}
      <AnimatedMesh />
      
      {/* Theme Toggle Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        {/* Brand Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col justify-center px-8 py-12 lg:w-[45%] lg:px-16 lg:py-24"
        >
          <div className="mb-12 mt-4 flex items-center">
            <img src="/logo.png" alt="LinkVault" className="h-16 w-auto object-contain scale-[3] origin-left" />
          </div>
          <h2 className="mb-6 font-display text-3xl lg:text-5xl leading-tight">
            Your digital <br />
            knowledge base.
          </h2>
          <p className="mb-8 text-lg text-muted-foreground max-w-md">
            Save bookmarks, categorize links, and attach rich notes. Everything stored safely and easily searchable.
          </p>
          <ul className="space-y-4 text-muted-foreground">
            {["Smart Categories", "Rich Notes", "Quick Search"].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Form Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 items-center justify-center p-8"
        >
          <div className="w-full max-w-md bg-card border shadow-xl shadow-black/5 rounded-2xl p-8 relative overflow-hidden backdrop-blur-sm">
            
            {/* Tabs */}
            <div className="flex relative mb-8 border-b">
              {['Sign In', 'Create Account'].map((tab, idx) => {
                const isActive = (idx === 0 && isLogin) || (idx === 1 && !isLogin);
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setIsLogin(idx === 0);
                      setErrors({});
                    }}
                    className={cn(
                      "flex-1 pb-3 text-sm font-medium transition-colors relative z-10",
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {!isLogin && (
                  <motion.div
                    key="name-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-4 overflow-hidden"
                  >
                    <div className="space-y-1.5 flex-1">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInput}
                        className={errors.firstName ? "border-destructive" : ""}
                      />
                      {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInput}
                        className={errors.lastName ? "border-destructive" : ""}
                      />
                      {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInput}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInput}
                    className={cn("pr-10", errors.password ? "border-destructive" : "")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>

              <RainbowButton type="submit" className="w-full mt-6 h-11" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </RainbowButton>

              {isLogin && (
                <div className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/20 text-center text-sm">
                  <p className="text-muted-foreground mb-1">To explore the app without registering, use:</p>
                  <p className="font-medium text-foreground">demo@linkvault.com <span className="text-muted-foreground mx-1">/</span> Password123!</p>
                </div>
              )}
            </form>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
