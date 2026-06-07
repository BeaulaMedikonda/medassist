import { supabaseAdmin } from "@/lib/supabase/admin";

export type ClinicSubscriptionStatus =
  | "pending_approval"
  | "trial"
  | "active"
  | "past_due"
  | "expired"
  | "suspended"
  | "cancelled";

export type ClinicPaymentStatus =
  | "not_started"
  | "paid"
  | "unpaid"
  | "overdue"
  | "waived";

export type ClinicSubscriptionState = {
  planCode: "trial" | "basic" | "pro" | "enterprise";
  status: ClinicSubscriptionStatus;
  paymentStatus: ClinicPaymentStatus;
  monthlyFeeInr: number;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
};

const DEFAULT_SUBSCRIPTION: ClinicSubscriptionState = {
  planCode: "trial",
  status: "trial",
  paymentStatus: "not_started",
  monthlyFeeInr: 0,
  trialEndsAt: null,
  currentPeriodEndsAt: null,
};

export async function getClinicSubscriptionState(clinicId: string): Promise<ClinicSubscriptionState> {
  if (!clinicId) return DEFAULT_SUBSCRIPTION;

  const { data } = await supabaseAdmin()
    .from("clinic_subscriptions")
    .select("plan_code,status,payment_status,monthly_fee_inr,trial_ends_at,current_period_ends_at")
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!data) return DEFAULT_SUBSCRIPTION;

  const row = data as Record<string, unknown>;
  return {
    planCode: (row.plan_code as ClinicSubscriptionState["planCode"]) || "trial",
    status: (row.status as ClinicSubscriptionStatus) || "trial",
    paymentStatus: (row.payment_status as ClinicPaymentStatus) || "not_started",
    monthlyFeeInr: Number(row.monthly_fee_inr || 0),
    trialEndsAt: (row.trial_ends_at as string | null) || null,
    currentPeriodEndsAt: (row.current_period_ends_at as string | null) || null,
  };
}

export function isClinicPendingApproval(subscription: ClinicSubscriptionState) {
  return subscription.status === "pending_approval";
}

export function isClinicAccessBlocked(subscription: ClinicSubscriptionState) {
  return ["expired", "suspended", "cancelled"].includes(subscription.status);
}

export function getClinicBillingNotice(subscription: ClinicSubscriptionState) {
  if (subscription.status === "past_due") {
    return {
      tone: "warning" as const,
      title: "Subscription past due",
      message: "Your clinic subscription needs billing attention. Please contact the app provider.",
    };
  }

  if (subscription.paymentStatus === "overdue") {
    return {
      tone: "danger" as const,
      title: "Payment overdue",
      message: "Your clinic payment is overdue. Some premium services may be restricted soon.",
    };
  }

  if (subscription.paymentStatus === "unpaid") {
    return {
      tone: "warning" as const,
      title: "Payment pending",
      message: "Your clinic has an unpaid billing item. Please contact the app provider.",
    };
  }

  if (subscription.status === "trial" && subscription.trialEndsAt) {
    const trialEnd = new Date(subscription.trialEndsAt);
    const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000);
    if (daysLeft >= 0 && daysLeft <= 7) {
      return {
        tone: "info" as const,
        title: "Trial ending soon",
        message: `Your clinic trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
      };
    }
  }

  return null;
}
