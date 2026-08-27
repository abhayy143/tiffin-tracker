import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    const correctPin = process.env.ADMIN_PIN;

    if (!correctPin) {
      return NextResponse.json(
        { success: false, message: "PIN not configured on server" },
        { status: 500 }
      );
    }

    if (pin === correctPin) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: "Invalid PIN" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}