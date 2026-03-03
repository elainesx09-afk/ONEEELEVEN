import { setCors } from "./_lib/response.js";

export default async function handler(req, res) {
  setCors(res);

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const body = req.body || {};

  // normaliza qualquer provedor
  const normalized = {
    phone:
      body.phone ||
      body.from ||
      body.sender ||
      body.key?.remoteJid?.replace("@s.whatsapp.net", ""),

    message:
      body.message ||
      body.text ||
      body.body ||
      body.message?.conversation,

    instance:
      body.instance ||
      body.session ||
      "default"
  };

  // envia para seu inbound real
  await fetch(process.env.APP_URL + "/api/inbound", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": process.env.API_TOKEN,
      "workspace_id": process.env.WORKSPACE_ID
    },
    body: JSON.stringify(normalized)
  });

  return res.status(200).json({ ok: true });
}
