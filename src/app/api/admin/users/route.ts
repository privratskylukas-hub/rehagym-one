// @ts-nocheck — Supabase types will be auto-generated once connected
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // Verify the requesting user has admin.users permission
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const { data: hasPerm } = await supabase.rpc("has_permission", {
    p_user_id: user.id,
    p_permission_code: "admin.users",
  });

  if (!hasPerm) {
    return NextResponse.json({ error: "Nemáte oprávnění" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, full_name, phone, job_title, roles } = body;

  if (!email || !password || !full_name) {
    return NextResponse.json(
      { error: "E-mail, heslo a jméno jsou povinné" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Heslo musí mít alespoň 8 znaků" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // Create user profile
  const { error: profileError } = await admin.from("users").insert({
    id: userId,
    email,
    full_name,
    phone: phone || null,
    job_title: job_title || null,
    status: "active",
  });

  if (profileError) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Chyba při vytváření profilu: " + profileError.message },
      { status: 500 }
    );
  }

  // Assign roles
  if (roles && roles.length > 0) {
    const { error: rolesError } = await admin.from("user_roles").insert(
      roles.map((roleId: string) => ({
        user_id: userId,
        role_id: roleId,
      }))
    );

    if (rolesError) {
      console.error("Error assigning roles:", rolesError);
    }
  }

  return NextResponse.json({ id: userId, email, full_name });
}
