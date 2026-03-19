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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Faltando cabeçalho de autorização");

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://gestao.imagoradiologia.cloud";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    // Verificar quem está chamando
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !caller) throw new Error("Acesso não autorizado");

    // Pegar role do caller
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    const isDeveloper = callerRole?.role === "developer";
    const isAdmin = callerRole?.role === "admin";

    if (!isDeveloper && !isAdmin) {
      throw new Error("Apenas administradores podem convidar usuários.");
    }

    const body = await req.json();
    const { full_name, email, role, tenant_id: bodyTenantId } = body;

    if (!full_name || !email || !role) {
      throw new Error("Nome, email e role são obrigatórios.");
    }

    // Determinar tenant_id
    let targetTenantId: string;

    if (isDeveloper) {
      // Developer pode especificar tenant_id
      if (!bodyTenantId) throw new Error("Developer deve informar o tenant_id.");
      targetTenantId = bodyTenantId;
    } else {
      // Admin usa o próprio tenant
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("tenant_id")
        .eq("id", caller.id)
        .maybeSingle();
      if (!callerProfile?.tenant_id) throw new Error("Tenant não encontrado.");
      targetTenantId = callerProfile.tenant_id;
    }

    // Verificar se email já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      // Usuário já existe — apenas reenviar convite
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${siteUrl}/reset-password` },
      });
      if (linkError) throw linkError;

      await resend.emails.send({
        from: "IMAGO Sistema <noreply@imagoradiologia.cloud>",
        to: [email],
        subject: "Seu acesso ao Sistema IMAGO",
        html: buildInviteEmail(full_name, linkData.properties.action_link, siteUrl),
      });

      return new Response(
        JSON.stringify({ success: true, message: "Convite reenviado para o email cadastrado." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar usuário via invite (gera link para definir senha)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${siteUrl}/reset-password` }
    );

    if (inviteError) throw inviteError;

    const newUserId = inviteData.user.id;

    // Criar perfil
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: newUserId,
      tenant_id: targetTenantId,
      full_name,
      email,
      is_active: true,
      approved: true,
    });
    if (profileError) throw profileError;

    // Definir role
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
      user_id: newUserId,
      tenant_id: targetTenantId,
      role,
    });
    if (roleError) throw roleError;

    // Gerar link de definição de senha
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    if (linkError) throw linkError;

    // Enviar email via Resend
    await resend.emails.send({
      from: "IMAGO Sistema <noreply@imagoradiologia.cloud>",
      to: [email],
      subject: "Você foi convidado para o Sistema IMAGO",
      html: buildInviteEmail(full_name, linkData.properties.action_link, siteUrl),
    });

    return new Response(
      JSON.stringify({ success: true, message: `Convite enviado para ${email}. O usuário receberá um email para criar sua senha.` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Invite-User Error]:", error.message);
    const status = error.message.includes("autorizado") || error.message.includes("administrador") ? 403 : 500;
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildInviteEmail(name: string, link: string, siteUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#325C93 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">IMAGO</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Sistema de Gestão</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Você foi convidado</p>
            <h2 style="margin:0 0 20px;color:#1e293b;font-size:22px;font-weight:700;">Olá, ${name}!</h2>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              Você recebeu acesso ao <strong>Sistema IMAGO</strong>. Clique no botão abaixo para criar sua senha e acessar o sistema.
            </p>

            <div style="text-align:center;margin:32px 0;">
              <a href="${link}" style="display:inline-block;background:#325C93;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
                Criar Minha Senha →
              </a>
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-top:24px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                <strong style="color:#64748b;">Link não funciona?</strong><br>
                Copie e cole este endereço no seu navegador:<br>
                <span style="color:#325C93;word-break:break-all;">${link}</span>
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.5;">
              Este link expira em 24 horas e pode ser usado apenas uma vez.<br>
              Se você não esperava este convite, ignore este email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
