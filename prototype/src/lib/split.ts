export function allocateCents(amountCents: number, memberIds: string[]) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Expense amount must be a positive integer number of cents.");
  }
  if (memberIds.length === 0) {
    throw new Error("Select at least one participant.");
  }

  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length !== memberIds.length) {
    throw new Error("Each participant must be selected only once.");
  }

  const baseShare = Math.floor(amountCents / uniqueIds.length);
  const remainder = amountCents % uniqueIds.length;
  const allocations = new Map<string, number>();

  [...uniqueIds].sort().forEach((memberId, index) => {
    allocations.set(memberId, baseShare + (index < remainder ? 1 : 0));
  });

  return allocations;
}
