import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import type { Doctor } from "@/types/db";
import { TeamManager } from "./TeamManager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { member, clinic } = await requireMember();
  if (member.role !== "admin") {
    notFound();
  }

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("doctors")
    .select("id, full_name, role, qualification")
    .eq("clinic_id", clinic.id)
    .order("role")
    .order("full_name");

  const members = ((data as Array<Pick<Doctor, "id" | "full_name" | "role" | "qualification">>) || []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    role: m.role,
    qualification: m.qualification,
  }));

  return (
    <div>
      <Link
        href="/settings"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-ink-500 hover:text-slate-900 dark:text-ink-100"
      >
        <svg viewBox="0 0 20 20" className="h-3 w-3">
          <path
            d="M12 4l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Settings
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">Team</h1>
      <p className="text-sm text-slate-500 dark:text-ink-500">
        Manage who can sign in to {clinic.name}.
      </p>

      <div className="mt-6">
        <TeamManager
          inviteCode={clinic.invite_code}
          currentUserId={member.id}
          initialMembers={members}
        />
      </div>
    </div>
  );
}
