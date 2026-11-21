import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Member name is required." }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const member = await prisma.member.create({ data: { name, groupId } });
  return NextResponse.json(member, { status: 201 });
}
