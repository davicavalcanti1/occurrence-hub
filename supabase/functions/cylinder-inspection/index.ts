import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InspectionPayload {
    nome_funcionario: string;
    precisa_oxigenio: boolean;
    quantidade_oxigenio?: number;
    precisa_ar_comprimido: boolean;
    quantidade_ar_comprimido?: number;
    observacoes?: string;
    data_inspecao?: string;
    user_id?: string;
    fotos_urls?: string[];
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const payload: InspectionPayload = await req.json();
        const {
            nome_funcionario,
            precisa_oxigenio,
            quantidade_oxigenio,
            precisa_ar_comprimido,
            quantidade_ar_comprimido,
            observacoes,
            data_inspecao,
            user_id,
            fotos_urls
        } = payload;

        // 1. Insert into DB
        const { data: record, error: dbError } = await supabaseClient
            .from("inspecoes_cilindros")
            .insert({
                nome_funcionario,
                precisa_oxigenio,
                quantidade_oxigenio: precisa_oxigenio ? quantidade_oxigenio : null,
                precisa_ar_comprimido,
                quantidade_ar_comprimido: precisa_ar_comprimido ? quantidade_ar_comprimido : null,
                observacoes,
                data_inspecao: data_inspecao || new Date().toISOString().split("T")[0],
                user_id,
                fotos_urls: fotos_urls || []
            })
            .select()
            .single();

        if (dbError) {
            console.error("DB Error:", dbError);
            throw dbError;
        }

        // 2. Send WhatsApp
        const protocol = record.protocolo;
        const date = record.data_inspecao;

        let message = `📋 INSPEÇÃO CILINDROS
Protocolo: ${protocol}
Data: ${date}
Funcionário: ${nome_funcionario}
Oxigênio: ${precisa_oxigenio ? "SIM" : "NÃO"} | Qt: ${precisa_oxigenio ? (quantidade_oxigenio ?? "-") : "-"}
Ar comprimido: ${precisa_ar_comprimido ? "SIM" : "NÃO"} | Qt: ${precisa_ar_comprimido ? (quantidade_ar_comprimido ?? "-") : "-"}
Obs: ${observacoes || "-"}`;

        if (fotos_urls && fotos_urls.length > 0) {
            message += `\nFotos: ${fotos_urls.length} anexo(s)`;
        }

        const uazapiBase = Deno.env.get("UAZAPI_BASE_URL");
        const uazapiToken = Deno.env.get("UAZAPI_TOKEN");
        const groupJid = Deno.env.get("WHATSAPP_GROUP_JID_PORTARIA");
        const numberAviso = Deno.env.get("WHATSAPP_NUMBER_AVISO");

        if (uazapiBase && uazapiToken) {
            const sendWA = async (number: string, text: string) => {
                try {
                    const baseUrl = uazapiBase.replace(/\/$/, "");
                    const url = `${baseUrl}/message/sendText`;

                    const response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "apikey": uazapiToken
                        },
                        body: JSON.stringify({ number, text })
                    });

                    if (!response.ok) {
                        console.error(`Status ${response.status}: ${await response.text()}`);
                    }
                } catch (e) {
                    console.error(`Error sending WA to ${number}:`, e);
                }
            };

            if (groupJid) await sendWA(groupJid, message);
            if (numberAviso) await sendWA(numberAviso, message);
        } else {
            console.log("Skipping WA send - Config missing");
        }

        return new Response(
            JSON.stringify({ success: true, protocol, record }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown Error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
