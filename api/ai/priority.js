import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ ok:false })
  }

  try {

    const {
      lead_id,
      last_message_from,
      messages_count,
      stage,
      last_interaction_minutes
    } = req.body


    let priority = 50
    let chance = 30


    // respondeu recentemente
    if (last_message_from === "lead") {
      priority += 20
      chance += 15
    }

    // muitas mensagens
    if (messages_count > 5) {
      priority += 10
      chance += 10
    }

    // estágio avançado
    if (stage === "negociacao") {
      priority += 15
      chance += 25
    }

    if (stage === "qualificado") {
      chance += 15
    }

    // lead frio
    if (last_interaction_minutes > 120) {
      priority -= 10
    }

    if (last_interaction_minutes > 1440) {
      chance -= 15
    }

    priority = Math.max(1, Math.min(priority, 100))
    chance = Math.max(1, Math.min(chance, 100))


    await supabaseAdmin
      .from("leads")
      .update({
        priority_score: priority,
        chance_de_venda: chance
      })
      .eq("id", lead_id)


    return res.json({
      ok: true,
      priority,
      chance_de_venda: chance
    })

  } catch (err) {

    return res.status(500).json({
      ok:false,
      error: err.message
    })

  }
}
