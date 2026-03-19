import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !caller) throw new Error("Acesso não autorizado");

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    const isDeveloper = callerRole?.role === "developer";
    const isAdmin = callerRole?.role === "admin";
    if (!isDeveloper && !isAdmin) throw new Error("Apenas administradores podem editar usuários.");

    const { user_id, full_name, email } = await req.json();
    if (!user_id) throw new Error("user_id é obrigatório.");

    // Update auth email if changed
    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, { email });
      if (authError) throw authError;
    }

    // Update profile
    const updates: Record<string, string> = {};
    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", user_id);
      if (profileError) throw profileError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Usuário atualizado com sucesso." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Update-User Error]:", error.message);
    const status = error.message.includes("autorizado") ? 403 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
