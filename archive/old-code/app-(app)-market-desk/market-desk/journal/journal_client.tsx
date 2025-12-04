"use client";
import { useState } from "react";
import { format } from "date-fns";

type Entry = {
  id: string;
  orgId: string;
  userId: string;
  date: string | Date;
  text: string;
  tags: string[];
};

export default function JournalClient({ initialEntries, showCreate = true }: { initialEntries: Entry[]; showCreate?: boolean }) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [text, setText] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [editTags, setEditTags] = useState<string>("");

  async function createEntry() {
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, text, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    if (!res.ok) return alert("Failed to create entry");
    const created = await res.json();
    setEntries((prev) => [created, ...prev]);
    setText("");
    setTags("");
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("Failed to delete");
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function startEdit(e: Entry) {
    setEditingId(e.id);
    setEditText(e.text);
    setEditTags(e.tags.join(", "));
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/journal/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText, tags: editTags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    if (!res.ok) return alert("Failed to update");
    const updated = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      {showCreate && (
        <div className="card p-4">
          <div className="grid md:grid-cols-4 gap-2">
            <input className="border rounded-md px-2 py-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="border rounded-md px-2 py-1 md:col-span-2" placeholder="Write a note" value={text} onChange={(e) => setText(e.target.value)} />
            <input className="border rounded-md px-2 py-1" placeholder="tags,comma,separated" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="mt-3">
            <button className="px-3 py-1.5 rounded-2xl bg-black text-white" onClick={createEntry}>Add entry</button>
          </div>
        </div>
      )}
      <ul className="space-y-3">
        {entries.map((e) => (
          <li key={e.id} className="card p-4">
            <div className="text-sm text-slate-500">{format(new Date(e.date), "yyyy-MM-dd")}</div>
            {editingId === e.id ? (
              <>
                <input className="border rounded-md px-2 py-1 w-full mt-2" value={editText} onChange={(ev) => setEditText(ev.target.value)} />
                <input className="border rounded-md px-2 py-1 w-full mt-2" value={editTags} onChange={(ev) => setEditTags(ev.target.value)} />
                <div className="mt-2 space-x-3">
                  <button className="text-blue-600 text-sm" onClick={() => saveEdit(e.id)}>Save</button>
                  <button className="text-slate-600 text-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="font-medium mt-1">{e.text}</div>
                <div className="text-xs text-slate-500 mt-1">{e.tags.join(", ")}</div>
                <div className="mt-2 space-x-3">
                  <button className="text-blue-600 text-sm" onClick={() => startEdit(e)}>Edit</button>
                  <button className="text-red-600 text-sm" onClick={() => deleteEntry(e.id)}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
