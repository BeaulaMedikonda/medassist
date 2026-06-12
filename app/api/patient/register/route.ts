import { NextResponse } from "next/server";
 
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Patient registration now uses clinic + mobile OTP. Use /patient/login.",
    },
    { status: 410 },
  );
}
 
 