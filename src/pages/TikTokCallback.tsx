import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function TikTokCallback() {
  const location = useLocation();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authCode = params.get("code");
    const err = params.get("error");
    if (authCode) setCode(authCode);
    if (err) setError(err + ": " + params.get("error_description"));
  }, [location]);

  return (
    <div style={{ maxWidth: 600, margin: "80px auto", padding: "32px 24px", fontFamily: "sans-serif", textAlign: "center" }}>
      {code ? (
        <>
          <h2 style={{ color: "#16a34a" }}>✅ Autorização recebida!</h2>
          <p>Copie o código abaixo e envie para o Claude:</p>
          <div style={{
            background: "#f1f5f9", border: "1px solid #cbd5e1",
            borderRadius: 8, padding: "16px", marginTop: 16,
            wordBreak: "break-all", fontFamily: "monospace", fontSize: 13
          }}>
            {code}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            style={{ marginTop: 16, padding: "10px 24px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 15 }}
          >
            Copiar código
          </button>
        </>
      ) : error ? (
        <>
          <h2 style={{ color: "#dc2626" }}>❌ Erro na autorização</h2>
          <p>{error}</p>
        </>
      ) : (
        <p>Processando autorização...</p>
      )}
    </div>
  );
}
