import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await context.params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      expenses: {
        orderBy: { createdAt: "desc" },
        include: {
          payer: true,
          participants: { include: { member: true } },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const balances = new Map(group.members.map((member) => [member.id, 0]));
  for (const expense of group.expenses) {
    if (!balances.has(expense.payerId)) continue;
    balances.set(expense.payerId, (balances.get(expense.payerId) ?? 0) + expense.amountCents);

    const participantIds = expense.participants.map((participant) => participant.memberId);
    const baseShare = Math.floor(expense.amountCents / participantIds.length);
    const remainder = expense.amountCents % participantIds.length;
    const sortedIds = [...participantIds].sort();
    sortedIds.forEach((memberId, index) => {
      const share = baseShare + (index < remainder ? 1 : 0);
      balances.set(memberId, (balances.get(memberId) ?? 0) - share);
    });
  }

  return NextResponse.json({
    ...group,
    balances: group.members.map((member) => ({
      memberId: member.id,
      name: member.name,
      cents: balances.get(member.id) ?? 0,
    })),
  });
}
