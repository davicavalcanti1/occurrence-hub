import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { email } = await req.json();
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const resend = new Resend(resendApiKey);

        // O redirectTo diz para onde o usuário vai DEPOIS de clicar no link.
        // O domínio base do link é definido nas configurações do Supabase (Site URL).
        const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
                redirectTo: "https://gestao.imagoradiologia.cloud/reset-password",
            },
        });

        if (linkError) throw linkError;

        const resetLink = data.properties.action_link;

        await resend.emails.send({
            from: "IMAGO Sistema <noreply@imagoradiologia.cloud>",
            to: [email],
            subject: "Redefinição de Senha - Sistema Imago",
            html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Recuperação de Acesso</h2>
          <p>Clique no botão abaixo para redefinir sua senha:</p>
          <a href="${resetLink}" style="background: #325C93; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Senha</a>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">Se o botão não funcionar, copie o link: ${resetLink}</p>
        </div>
      `,
        });

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});
