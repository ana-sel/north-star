/**
 * Chat command centre — slash-command parser for the chat screen.
 *
 * Recognised commands (case-insensitive):
 *   /spend <amount> [description]      → log money expense
 *   /income <amount> [description]     → log money income
 *   /energy low|medium|high [notes]    → log energy
 *   /habit <name>                      → check in a yes/no habit by name
 *   /help                              → list commands
 *
 * Anything not starting with "/" returns `null` so the caller can fall
 * back to the Capture Agent path.
 */
import { logEnergy, EnergyLevel } from "../api/energy";
import { createTransaction } from "../api/money";
import { checkInHabit, listHabits } from "../api/habits";

export interface CommandResult {
  ok: boolean;
  text: string;
}

const HELP_TEXT = [
  "Commands:",
  "/spend <amount> [description]   log an expense",
  "/income <amount> [description]  log income",
  "/energy low|medium|high [note]  log energy",
  "/habit <name>                   check in a yes/no habit",
  "/help                           show this list",
].join("\n");

export async function handleCommand(
  userId: string,
  raw: string
): Promise<CommandResult | null> {
  const text = raw.trim();
  if (!text.startsWith("/")) return null;

  const [headRaw, ...restParts] = text.slice(1).split(/\s+/);
  const head = headRaw.toLowerCase();
  const rest = restParts.join(" ").trim();

  try {
    switch (head) {
      case "help":
        return { ok: true, text: HELP_TEXT };

      case "spend":
      case "income": {
        const m = rest.match(/^(-?\d+(?:\.\d{1,2})?)\s*(.*)$/);
        if (!m) {
          return { ok: false, text: `Usage: /${head} <amount> [description]` };
        }
        const amount = Number(m[1]);
        const desc = m[2] || null;
        const signed = head === "spend" ? -Math.abs(amount) : Math.abs(amount);
        const txn = await createTransaction({
          user_id: userId,
          amount: signed,
          description: desc,
        });
        const sign = head === "spend" ? "−" : "+";
        return {
          ok: true,
          text: `Logged ${sign}£${Math.abs(amount).toFixed(2)}${
            desc ? ` (${desc})` : ""
          }. Txn ${txn.id.slice(0, 8)}.`,
        };
      }

      case "energy": {
        const [levelRaw, ...noteParts] = rest.split(/\s+/);
        const level = (levelRaw || "").toLowerCase() as EnergyLevel;
        if (!["low", "medium", "high"].includes(level)) {
          return {
            ok: false,
            text: "Usage: /energy low|medium|high [notes]",
          };
        }
        const notes = noteParts.join(" ").trim() || undefined;
        await logEnergy(userId, level, notes);
        return { ok: true, text: `Energy logged: ${level}.` };
      }

      case "habit": {
        if (!rest) {
          return { ok: false, text: "Usage: /habit <name>" };
        }
        const habits = await listHabits(userId);
        const needle = rest.toLowerCase();

        // 1. Exact (case-insensitive) match wins outright.
        const exact = habits.find((h) => h.title.toLowerCase() === needle);
        // 2. Otherwise, gather all substring matches.
        const partial = habits.filter((h) =>
          h.title.toLowerCase().includes(needle)
        );
        const match = exact ?? (partial.length === 1 ? partial[0] : null);

        if (!match) {
          if (partial.length > 1) {
            const titles = partial.map((h) => `• ${h.title}`).join("\n");
            return {
              ok: false,
              text: `"${rest}" matched ${partial.length} habits — be more specific:\n${titles}`,
            };
          }
          return {
            ok: false,
            text: `No habit matched "${rest}". Try the Habits tab.`,
          };
        }
        if (match.kind !== "yes_no") {
          return {
            ok: false,
            text: `"${match.title}" is a ${match.kind} habit — log it from the Habits tab.`,
          };
        }
        await checkInHabit(match.id, { user_id: userId, value_bool: true });
        return { ok: true, text: `Checked in: ${match.title} ✓` };
      }

      default:
        return {
          ok: false,
          text: `Unknown command: /${head}. Try /help.`,
        };
    }
  } catch (e: any) {
    return { ok: false, text: `Command failed: ${e?.message ?? "unknown"}` };
  }
}
