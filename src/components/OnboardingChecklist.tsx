import { useState, useEffect } from "react";
import { CheckCircle, Circle, X, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const steps = [
  { id: "instance", label: "Conecte seu WhatsApp", description: "Vá em Instâncias e conecte seu número", route: "/instances", icon: "📱" },
  { id: "lead", label: "Adicione seu primeiro lead", description: "Cadastre um lead de teste no sistema", route: "/leads", icon: "👤" },
  { id: "bot", label: "Configure o Bot", description: "Defina a personalidade do seu agente", route: "/bot", icon: "🤖" },
  { id: "pipeline", label: "Conheça o Pipeline", description: "Veja como funciona o funil de vendas", route: "/pipeline", icon: "📊" },
];

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("onboarding_dismissed") === "true"
  );

  const { data: instances = [] } = useQuery({
    queryKey: ["instances-check"],
    queryFn: async () => { const r = await api.instances(); return r.ok ? r.data : []; },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-check"],
    queryFn: async () => { const r = await api.leads(); return r.ok ? r.data : []; },
  });

  const completed = {
    instance: (instances as any[]).length > 0,
    lead: (leads as any[]).length > 0,
    bot: localStorage.getItem("bot_configured") === "true",
    pipeline: localStorage.getItem("pipeline_visited") === "true",
  };

  const completedCount = Object.values(completed).filter(Boolean).length;

  // Não mostra se tudo completo ou se foi dispensado
  if (dismissed || completedCount === steps.length) return null;

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-card border border-primary/30 rounded-2xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-card p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground text-sm">🚀 Primeiros passos</p>
          <p className="text-xs text-muted-foreground">{completedCount} de {steps.length} concluídos</p>
        </div>
        <button
          onClick={() => { setDismissed(true); localStorage.setItem("onboarding_dismissed", "true"); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="h-1 bg-secondary">
        <div
          className="h-1 bg-primary transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="p-3 space-y-2">
        {steps.map((step) => {
          const done = completed[step.id as keyof typeof completed];
          return (
            <button
              key={step.id}
              onClick={() => navigate(step.route)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                done ? "opacity-50" : "hover:bg-secondary/70"
              }`}
            >
              <span className="text-lg">{step.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
              {done
                ? <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}
