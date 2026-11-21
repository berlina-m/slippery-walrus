import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allocateCents } from "@/lib/split";

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  const body = await request.json().catch(() => null);
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const amountCents = body?.amountCents;
  const payerId = body?.payerId;
  const participantIds = body?.participantIds;

  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive whole number of cents." },
      { status: 400 },
    );
  }
  if (typeof payerId !== "string" || !Array.isArray(participantIds) || participantIds.length === 0) {
    return NextResponse.json(
      { error: "Payer and at least one participant are required." },
      { status: 400 },
    );
  }
  if (!participantIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Participant IDs are invalid." }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const memberIds = new Set(group.members.map((member) => member.id));
  if (!memberIds.has(payerId)) {
    return NextResponse.json({ error: "Payer does not belong to this group." }, { status: 400 });
  }
  if (participantIds.some((id) => !memberIds.has(id))) {
    return NextResponse.json({ error: "A participant does not belong to this group." }, { status: 400 });
  }

  try {
    allocateCents(amountCents, participantIds);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid expense." },
      { status: 400 },
    );
  }

  const expense = await prisma.expense.create({
    data: {
      description,
      amountCents,
      payerId,
      groupId,
      participants: {
        create: participantIds.map((memberId) => ({ memberId })),
      },
    },
    include: { payer: true, participants: { include: { member: true } } },
  });

  return NextResponse.json(expense, { status: 201 });
}
