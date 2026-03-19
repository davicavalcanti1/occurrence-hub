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
        if (!authHeader) {
            console.error("[Delete-User] Missing Authorization header");
            throw new Error("Faltando cabeçalho de autorização");
        }

        const token = authHeader.replace("Bearer ", "");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        console.log("[Delete-User] Initializing admin client...");
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // 1. Verificar se o usuário que está pedindo a exclusão é Admin
        console.log("[Delete-User] Verifying admin user via token...");
        const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !adminUser) {
            console.error("[Delete-User] Auth error:", userError?.message);
            throw new Error("Acesso não autorizado");
        }

        console.log("[Delete-User] Admin user verified:", adminUser.email);

        // Chamada RPC para verificar se é admin do tenant
        console.log("[Delete-User] Checking admin status via RPC...");
        const { data: isAdmin, error: rpcError } = await supabaseAdmin.rpc("is_tenant_admin", { _user_id: adminUser.id });

        if (rpcError) {
            console.error("[Delete-User] RPC error:", rpcError.message);
            throw new Error("Erro ao verificar permissões: " + rpcError.message);
        }

        if (!isAdmin) {
            console.error("[Delete-User] User is not an admin:", adminUser.id);
            throw new Error("Apenas administradores podem excluir usuários.");
        }

        // 2. Pegar o ID do usuário a ser excluído
        const { user_id } = await req.json();
        console.log("[Delete-User] Target user ID:", user_id);

        if (!user_id) throw new Error("ID do usuário é obrigatório.");

        // Impedir que um admin exclua a si mesmo por engano
        if (user_id === adminUser.id) throw new Error("Você não pode excluir sua própria conta por aqui.");

        // 3. Executar a exclusão no Auth
        console.log("[Delete-User] Executing deletion in Auth...");
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

        if (deleteError) {
            console.error("[Delete-User] Deletion error:", deleteError.message);
            throw deleteError;
        }

        console.log("[Delete-User] User deleted successfully");


        return new Response(JSON.stringify({ success: true, message: "Usuário excluído com sucesso." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("[Delete-User Error]:", error.message);

        // Se for erro de autorização ou permissão, retornamos o código correto
        let status = 500;
        if (error.message.includes("autorizado") || error.message.includes("permissão")) {
            status = 401;
        } else if (error.message.includes("administradores")) {
            status = 403;
        }

        return new Response(JSON.stringify({ error: error.message }), {
            status: status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
