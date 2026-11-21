import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "asc" },
    include: { members: true },
  });
  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Group name is required." }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: { name },
    include: { members: true },
  });
  return NextResponse.json(group, { status: 201 });
}
