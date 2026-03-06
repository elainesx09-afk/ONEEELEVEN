Adicione no final do /api/inbound.js, antes do return ok(res...).

// =============================
// DISPARA AI ROUTER (N8N)
// =============================

try {

  await fetch(process.env.N8N_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      lead_id: lead.id,
      phone: lead_phone,
      message: message,
      instance: instance,
      workspace_id: client_id
    })
  });

} catch (err) {
  console.error("AI ROUTER ERROR:", err);
}
