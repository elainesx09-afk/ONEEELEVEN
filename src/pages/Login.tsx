import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.2,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      stars.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > canvas!.width) s.vx *= -1;
        if (s.y < 0 || s.y > canvas!.height) s.vy *= -1;
      });
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 232, 94, ${(1 - dist / 120) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 232, 94, ${s.opacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#00e85e";
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn, session, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/overview", { replace: true });
    }
  }, [session, authLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "#00e85e" }}
        />
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(0,232,94,0.2)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "#000000" }}
    >
      <ConstellationCanvas />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,232,94,0.06) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      <div
        className="relative w-full max-w-md mx-4"
        style={{
          zIndex: 2,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(24px)",
          transition:
            "opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, #00e85e 0%, #1aff70 100%)",
              boxShadow: "0 0 32px rgba(0,232,94,0.4)",
            }}
          >
            <Sparkles className="w-8 h-8" style={{ color: "#000" }} />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "#ffffff" }}
          >
            ONE <span style={{ color: "#00e85e" }}>ELEVEN</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Plataforma de Automação Comercial
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(0,232,94,0.2)",
            borderRadius: "16px",
            padding: "32px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
          }}
        >
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            Entrar na sua conta
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                disabled={loading}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,232,94,0.6)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,232,94,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,232,94,0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ ...inputStyle, paddingRight: "40px" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,232,94,0.6)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,232,94,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,232,94,0.2)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  color: "#f87171",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px",
                background: loading
                  ? "rgba(0,232,94,0.4)"
                  : "linear-gradient(135deg, #00e85e 0%, #1aff70 100%)",
                border: "none",
                borderRadius: "8px",
                color: "#000",
                fontSize: "14px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: loading ? "none" : "0 0 20px rgba(0,232,94,0.3)",
                marginTop: "4px",
              }}
            >
              {loading ? (
                <>
                  <span
                    className="inline-block w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: "#000" }}
                  />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center mt-6 text-xs"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          © 2026 One Eleven · Automação Comercial com IA
        </p>
      </div>
    </div>
  );
}
