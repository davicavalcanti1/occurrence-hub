import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const formattedDate = formatter.format(now);
        const [day, month, year] = formattedDate.split('/');
        const todayCommon = `${year}-${month}-${day}`;

        const siteUrl = "https://ocorrencias.imagoradiologia.cloud";
        const link = `${siteUrl}/inspecoes/cilindros?date=${todayCommon}`;

        const message = `*INSPEÇÃO DE CILINDROS*\n\nBom dia! Favor realizar a inspeção dos cilindros de hoje (${day}/${month}).\n\nLink: ${link}`;

        const n8nUrl = "https://n8n.imagoradiologia.cloud/webhook/cilindros";

        const response = await fetch(n8nUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event_type: 'lembrete',
                message: message,
                link: link,
                date: todayCommon
            })
        });

        if (!response.ok) {
            console.error("N8N Error:", response.status, await response.text());
        }

        return new Response(
            JSON.stringify({ success: true, message: "Webhook triggered", link }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown Error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
