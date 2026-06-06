import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

const HOME = {
  admin: "/admin",
  capstone_adviser: "/adviser",
  student: "/dashboard",
};

const STUDENT_ONLY = ["/dashboard", "/profile"];
const NO_ADMIN = ["/submit", "/library"];
const ADVISER_ONLY = ["/adviser"];
const ADMIN_ONLY = ["/admin"];

function toHome(role, request) {
  const path = HOME[role] ?? "/login";
  return NextResponse.redirect(new URL(path, request.url));
}

function toLogin(request, params = "") {
  return NextResponse.redirect(new URL(`/login${params}`, request.url));
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public paths — redirect to home if already logged in
  if (PUBLIC_PATHS.includes(pathname)) {
    if (!user) return response;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile) return response;
    if (profile.role === "capstone_adviser" && profile.status === "pending") return response;
    if (profile.status === "rejected" || profile.status === "suspended") return response;

    return toHome(profile.role, request);
  }

  // No session — send to login
  if (!user) return toLogin(request);

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile) return toLogin(request);

  const { role, status } = profile;

  // Pending adviser — block and send back to login
  if (role === "capstone_adviser" && status === "pending") {
    return toLogin(request, "?status=pending");
  }

  // Rejected or suspended — block
  if (status === "rejected" || status === "suspended") {
    return toLogin(request, `?error=${status}`);
  }

  // Admin-only routes
  if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && role !== "admin") {
    return toHome(role, request);
  }

  // Adviser-only routes
  if (ADVISER_ONLY.some((p) => pathname.startsWith(p)) && role !== "capstone_adviser") {
    return toHome(role, request);
  }

  // Student-only routes
  if (STUDENT_ONLY.some((p) => pathname.startsWith(p)) && role !== "student") {
    return toHome(role, request);
  }

  // Routes admins cannot access
  if (NO_ADMIN.some((p) => pathname.startsWith(p)) && role === "admin") {
    return toHome(role, request);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};