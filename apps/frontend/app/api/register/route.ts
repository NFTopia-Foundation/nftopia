import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, username, isArtist } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    // TODO: Replace this with DB logic
    console.log("Registering user:", { walletAddress, username, isArtist });

    return NextResponse.json({ message: "User registered successfully" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
