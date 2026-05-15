from pathlib import Path
import json
import re

# ====== FILE PATHS ======
INPUT_FILE = r"D:\My Archive\north-star\Kanabn-kaizen\cards_for_mission_filter.txt"
OUTPUT_FILE = r"D:\My Archive\north-star\Kanabn-kaizen\mission_filtered_cards.txt"
PROGRESS_FILE = r"D:\My Archive\north-star\Kanabn-kaizen\mission_filter_progress.json"


# ====== YOUR MISSION FILTER CATEGORIES ======
CATEGORIES = {
    "1": "Happy life / healing / refinement / resonance",
    "2": "Explore hidden rules / systems / meaning",
    "3": "Freedom empire / clarity for others / desired outcomes",
    "6": "Not mine / delete after analysis",
    "7": "Unclear / rewrite",
}


HELP_TEXT = """
Choose one or more numbers:

1 = Happy life / healing / refinement / resonance
    This helps me live happier, heal past pain, release shame/guilt,
    refine myself, feel peaceful, whole, alive, attractive, and resonant.

2 = Explore hidden rules / systems / meaning
    This helps me understand life, people, God, energy, systems,
    invisible patterns, money rules, human behaviour, or what gives life meaning.

3 = Freedom empire / clarity for others / desired outcomes
    This builds money freedom, safety, independence, property, business,
    or helps me create clear systems/tools that help people turn pain,
    confusion, and dreams into desired outcomes.

6 = Not mine / delete after analysis
    This is ego, fear, pressure, comparison, fashion, guilt,
    or someone else's dream.

7 = Unclear / rewrite
    I cannot clearly understand what this card means yet.

Examples:
1
1,2
1,3
2,3
1,2,3
6
7

q = save and quit
s = skip
"""


MISSION_TEXT = """
My mission is to live a happy life.

I am an explorer and learner of this world's rules, systems, and invisible energies —
how things interact, what life is made of, and what gives it meaning.

Through this understanding, I share knowledge with people who want to receive it,
so they can gain clarity and turn their pain, confusion, and dreams into desired outcomes
using clear, almost algorithmic action plans and systems.

I build my money freedom empire so I feel safe to create value for people,
live in a Vastu house or wherever I want, and live without the pressure of needing a job
while living with meaning and purpose.

For now, I choose solitude to heal my past pain, release shame and guilt from wrong choices,
refine myself, and measure my life only by what feels resonant and attractive to me.
"""


def clean_card_line(line):
    line = line.strip()

    if not line:
        return None

    # Skip markdown headings, quotes, separators
    if line.startswith("#") or line.startswith(">") or line.startswith("---"):
        return None

    # Remove markdown bullet markers
    line = line.lstrip("-").strip()

    # Remove numbering like: 90. [HEALING] text
    line = re.sub(r"^\d+\.\s*", "", line).strip()

    # Remove labels like: [KEEP], [HAVE TO], [UNCLEAR]
    line = re.sub(r"^\[[^\]]+\]\s*", "", line).strip()

    return line if line else None


def load_cards():
    path = Path(INPUT_FILE)

    if not path.exists():
        print(f"Could not find file:\n{INPUT_FILE}")
        print("\nCreate this file and put one card per line.")
        return []

    raw_lines = path.read_text(encoding="utf-8").splitlines()

    cards = []
    for line in raw_lines:
        card = clean_card_line(line)
        if card:
            cards.append(card)

    return cards


def load_progress():
    path = Path(PROGRESS_FILE)

    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))

    results = {category: [] for category in CATEGORIES.values()}
    results["Skipped"] = []
    return results


def save_progress(results):
    Path(PROGRESS_FILE).write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def already_processed(card, results):
    return any(card in cards for cards in results.values())


def parse_choice(choice):
    parts = [part.strip() for part in choice.split(",")]
    valid_choices = []

    for part in parts:
        if part in CATEGORIES:
            valid_choices.append(part)

    return valid_choices


def save_output(results):
    lines = ["# Mission Filtered Cards\n"]

    lines.append("## Mission\n")
    lines.append(MISSION_TEXT.strip())

    for category, cards in results.items():
        lines.append(f"\n## {category}\n")

        if cards:
            for card in cards:
                lines.append(f"- {card}")
        else:
            lines.append("_Empty_")

    Path(OUTPUT_FILE).write_text("\n".join(lines), encoding="utf-8")


def main():
    cards = load_cards()

    if not cards:
        return

    results = load_progress()

    remaining_cards = [
        card for card in cards
        if not already_processed(card, results)
    ]

    print(f"\nLoaded cards: {len(cards)}")
    print(f"Remaining cards: {len(remaining_cards)}")

    for index, card in enumerate(remaining_cards, start=1):
        print("\n" + "=" * 80)
        print(f"Card {index}/{len(remaining_cards)}")
        print(card)
        print(HELP_TEXT)

        choice = input("Your choice: ").strip().lower()

        if choice == "q":
            save_progress(results)
            save_output(results)
            print("\nSaved and quit.")
            print(f"Output file: {OUTPUT_FILE}")
            return

        if choice == "s":
            results["Skipped"].append(card)
            save_progress(results)
            continue

        choices = parse_choice(choice)

        if not choices:
            print("Invalid choice. Card skipped.")
            results["Skipped"].append(card)
            save_progress(results)
            continue

        for selected in choices:
            category = CATEGORIES[selected]

            if card not in results[category]:
                results[category].append(card)

        save_progress(results)

    save_output(results)

    print("\nDone.")
    print(f"Output file: {OUTPUT_FILE}")
    print(f"Progress file: {PROGRESS_FILE}")


if __name__ == "__main__":
    main()