"use client";

import { FormEvent, useEffect, useState } from "react";

type Member = { id: string; name: string };
type Expense = {
  id: string;
  description: string;
  amountCents: number;
  payer: Member;
  participants: { member: Member }[];
  createdAt: string;
};
type GroupSummary = { id: string; name: string; members: Member[] };
type GroupDetail = GroupSummary & {
  expenses: Expense[];
  balances: { memberId: string; name: string; cents: number }[];
};

function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}$${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function parseDollars(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export default function Home() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  async function loadGroups(preferredId?: string) {
    const response = await fetch("/api/groups");
    if (!response.ok) throw new Error("Could not load groups.");
    const data = (await response.json()) as GroupSummary[];
    setGroups(data);
    const stored = preferredId ?? localStorage.getItem("splitsmart-group") ?? "";
    const nextId = data.some((item) => item.id === stored)
      ? stored
      : data[0]?.id ?? "";
    setSelectedId(nextId);
  }

  async function loadGroup(id: string) {
    if (!id) {
      setGroup(null);
      return;
    }
    const response = await fetch(`/api/groups/${id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not load group.");
    setGroup(data as GroupDetail);
  }

  useEffect(() => {
    loadGroups().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    localStorage.setItem("splitsmart-group", selectedId);
    setError("");
    setPayerId("");
    setParticipantIds([]);
    loadGroup(selectedId).catch((err) => setError(err.message));
  }, [selectedId]);

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not create group.");
      return;
    }
    setGroupName("");
    await loadGroups(data.id);
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    setError("");
    const response = await fetch(`/api/groups/${selectedId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: memberName }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not add member.");
      return;
    }
    setMemberName("");
    await loadGroups(selectedId);
    await loadGroup(selectedId);
  }

  async function recordExpense(event: FormEvent) {
    event.preventDefault();
    setError("");
    const amountCents = parseDollars(amount);
    if (amountCents === null || amountCents <= 0) {
      setError("Enter a positive amount with no more than two decimal places.");
      return;
    }
    if (!payerId) {
      setError("Choose who paid.");
      return;
    }
    if (participantIds.length === 0) {
      setError("Choose at least one participant.");
      return;
    }

    const response = await fetch(`/api/groups/${selectedId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, amountCents, payerId, participantIds }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not record expense.");
      return;
    }
    setDescription("");
    setAmount("");
    setParticipantIds([]);
    await loadGroup(selectedId);
  }

  function toggleParticipant(memberId: string) {
    setParticipantIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div>
            <p className="text-xl font-bold tracking-tight">SplitSmart</p>
            <p className="text-sm text-slate-500">Shared expenses, made simple</p>
          </div>
          {group && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              {group.members.length} {group.members.length === 1 ? "member" : "members"}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 md:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">Groups</h2>
            <div className="space-y-2">
              {groups.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    item.id === selectedId
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  {item.name}
                </button>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-slate-500">No groups yet.</p>
              )}
            </div>
            <form onSubmit={createGroup} className="mt-4 flex gap-2">
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="New group"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                Add
              </button>
            </form>
          </section>
        </aside>

        <div className="space-y-6">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!group ? (
            <section className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Create a group to start tracking expenses.
            </section>
          ) : (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">{group.name}</h1>
                    <p className="mt-1 text-sm text-slate-500">Members</p>
                  </div>
                  <form onSubmit={addMember} className="flex gap-2">
                    <input
                      value={memberName}
                      onChange={(event) => setMemberName(event.target.value)}
                      placeholder="Member name"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                      Add member
                    </button>
                  </form>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.members.map((member) => (
                    <span key={member.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                      {member.name}
                    </span>
                  ))}
                  {group.members.length === 0 && (
                    <p className="text-sm text-slate-500">Add members before recording expenses.</p>
                  )}
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="mb-4 font-semibold">Record an expense</h2>
                  <form onSubmit={recordExpense} className="space-y-3">
                    <input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Description"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      inputMode="decimal"
                      placeholder="Amount (e.g. 60.00)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={payerId}
                      onChange={(event) => setPayerId(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Who paid?</option>
                      {group.members.map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium">Shared by</legend>
                      <div className="flex flex-wrap gap-2">
                        {group.members.map((member) => (
                          <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={participantIds.includes(member.id)}
                              onChange={() => toggleParticipant(member.id)}
                            />
                            {member.name}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <button className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white">
                      Record expense
                    </button>
                  </form>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="mb-4 font-semibold">Balances</h2>
                  <div className="space-y-2">
                    {group.balances.map((balance) => (
                      <div key={balance.memberId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3">
                        <span>{balance.name}</span>
                        <span className={`font-semibold ${balance.cents > 0 ? "text-emerald-700" : balance.cents < 0 ? "text-red-600" : "text-slate-600"}`}>
                          {balance.cents > 0 ? "+" : ""}{money(balance.cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 font-semibold">Expense history</h2>
                {group.expenses.length === 0 ? (
                  <p className="text-sm text-slate-500">No expenses recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {group.expenses.map((expense) => (
                      <div key={expense.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Paid by {expense.payer.name} · Shared by {expense.participants.map((item) => item.member.name).join(", ")}
                          </p>
                        </div>
                        <span className="font-semibold">{money(expense.amountCents)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
