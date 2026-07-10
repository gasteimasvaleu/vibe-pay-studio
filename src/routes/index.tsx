import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import heroBg from "@/assets/hero-illustration.jpg";
import { useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { getAuthErrorMessage, routeAfterAuth, signInWithEmail, signInWithGoogle } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function LoginCard() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      await routeAfterAuth(navigate);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? getAuthErrorMessage(err.message)
          : "Erro ao entrar. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? getAuthErrorMessage(err.message)
          : "Erro ao entrar com Google.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="relative"
      style={{ perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
        className="relative"
      >
        {/* Card glow */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-purple-500/40 via-fuchsia-500/20 to-indigo-500/40 blur-xl opacity-70" />

        {/* Traveling light beams */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-0 left-0 h-[2px] w-24 bg-gradient-to-r from-transparent via-white/80 to-transparent"
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute top-0 right-0 w-[2px] h-24 bg-gradient-to-b from-transparent via-white/80 to-transparent"
            animate={{ y: ["-100%", "400%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-[2px] w-24 bg-gradient-to-l from-transparent via-white/80 to-transparent"
            animate={{ x: ["100%", "-400%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 2 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[2px] h-24 bg-gradient-to-t from-transparent via-white/80 to-transparent"
            animate={{ y: ["100%", "-400%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 3 }}
          />
        </div>

        {/* Glass card */}
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a0b2e]/95 via-[#2a1250]/95 to-[#1a0b2e]/95 backdrop-blur-2xl p-8 shadow-2xl overflow-hidden">
          {/* Inner subtle pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />

          {/* Header */}
          <div className="relative text-center mb-8">
            <img
              src="https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/monetisex2..png"
              alt="Monetisexy"
              className="mx-auto mb-4 h-12 w-auto object-contain drop-shadow-lg"
            />
            <p className="text-sm text-white/60">
              Acesse sua conta para começar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-4">
            <style>{`
              input[data-auth-input]:-webkit-autofill,
              input[data-auth-input]:-webkit-autofill:hover,
              input[data-auth-input]:-webkit-autofill:focus,
              input[data-auth-input]:-webkit-autofill:active {
                -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.05) inset !important;
                -webkit-text-fill-color: #ffffff !important;
                caret-color: #ffffff !important;
                transition: background-color 9999s ease-in-out 0s;
              }
            `}</style>

            {/* Email */}
            <div className="relative">
              <div
                className={`relative rounded-lg border transition-all duration-300 ${
                  focusedInput === "email"
                    ? "border-white/30 bg-white/10"
                    : "border-transparent bg-white/5"
                }`}
              >
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  data-auth-input
                  type="email"
                  autoComplete="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full bg-transparent text-white placeholder:text-white/30 h-10 pl-10 pr-3 outline-none text-sm rounded-lg"
                />
                <AnimatePresence>
                  {focusedInput === "email" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-purple-500/10 blur-sm"
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <div
                className={`relative rounded-lg border transition-all duration-300 ${
                  focusedInput === "password"
                    ? "border-white/30 bg-white/10"
                    : "border-transparent bg-white/5"
                }`}
              >
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  data-auth-input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full bg-transparent text-white placeholder:text-white/30 h-10 pl-10 pr-10 outline-none text-sm rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>


            {/* Remember me & Forgot */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="appearance-none h-4 w-4 rounded border border-white/20 bg-white/5 checked:bg-white checked:border-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all duration-200"
                />
                <span className="text-white/60">Lembrar-me</span>
              </label>
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                Esqueceu a senha?
              </a>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isLoading}
              className="relative w-full h-11 rounded-lg overflow-hidden bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 bg-[length:200%_100%] font-semibold text-white text-sm shadow-lg shadow-purple-500/30 disabled:opacity-70"
              style={{ backgroundPosition: "0% 50%" }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 bg-[length:200%_100%]"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <motion.span
                    className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </span>
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/40">ou</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Google */}
            <motion.button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative w-full h-11 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium flex items-center justify-center gap-3 transition-colors disabled:opacity-70"
            >
              <span className="h-5 w-5 rounded-full bg-white text-[#2a1250] font-black text-xs flex items-center justify-center">
                G
              </span>
              {googleLoading ? "Redirecionando..." : "Entrar com Google"}
            </motion.button>

            {/* Error */}
            {errorMsg && (
              <p
                role="alert"
                className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2"
              >
                {errorMsg}
              </p>
            )}
          </form>

          {/* Sign up */}
          <p className="relative mt-6 text-center text-sm text-white/60">
            Não tem conta?{" "}
            <Link
              to="/cadastro"
              className="text-white font-semibold hover:text-purple-300 transition-colors inline-flex items-center gap-1"
            >
              Cadastre-se
              <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function HomePage() {
  return (
    <SiteLayout>
      {/* HERO — split layout */}
      <section className="relative overflow-hidden -mt-16 pt-16">
        <div
          className="absolute inset-0 opacity-70"
          style={{ background: "var(--gradient-radial)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-fade-in">
            <LoginCard />
          </div>

          <div className="relative">
            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-white shadow-card border border-border flex flex-col items-center">
              <div className="pt-8 pb-2 text-center pointer-events-none bg-white">
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-[0.95]">
                  Monetisexy,<br />
                  <span className="text-gradient-primary">do seu jeito.</span>
                </h1>
              </div>
              <img
                src={heroBg}
                alt="Ilustração Monetisexy"
                width={1200}
                height={1200}
                className="w-full h-[58%] object-cover mt-4"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none bg-white">
                <p className="text-sm text-center text-foreground">
                  A maior plataforma de creator economy do Brasil. Crie seu perfil, publique conteúdo exclusivo e receba via Pix.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
