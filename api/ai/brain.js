import { ok, fail } from "../_lib/response.js"
import { requireAuth } from "../_lib/auth.js"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

export default async function handler(req,res){

if(req.method !== "POST"){
return ok(res,{engine:"core_ai"})
}

const auth = await requireAuth(req,res)
if(!auth) return

const sb = await supabaseAdmin()

try{

const { lead_id , message } = req.body

const text = message.toLowerCase()

let stage = "novo"

if(text.includes("preço") || text.includes("valor")) stage="em_atendimento"

if(text.includes("agendar") || text.includes("horario")) stage="qualificado"

if(text.includes("confirmar")) stage="agendado"

if(text.includes("problema") || text.includes("cancelar")) stage="pos_venda"


await sb
.from("leads")
.update({stage})
.eq("id",lead_id)


// DISPARAR WORKFLOW N8N

await fetch(process.env.N8N_WEBHOOK,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
lead_id,
stage,
message
})
})


return ok(res,{stage})

}catch(e){

console.error(e)

return fail(res,"AI_ENGINE_ERROR")

}

}
