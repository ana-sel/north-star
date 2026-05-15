"""
Create Life Kaizen Trello boards — run once, then delete this file.
"""
import requests, time, sys

API_KEY = sys.argv[1]
TOKEN = sys.argv[2]
BASE = "https://api.trello.com/1"

def req(method, path, **kwargs):
    params = kwargs.pop("params", {})
    params["key"] = API_KEY
    params["token"] = TOKEN
    r = getattr(requests, method)(f"{BASE}{path}", params=params, **kwargs)
    if r.status_code not in (200, 201):
        print(f"FAIL {method.upper()} {path}: {r.status_code} {r.text[:200]}")
        sys.exit(1)
    time.sleep(0.12)  # rate-limit courtesy
    return r.json()

def create_board(name, desc):
    return req("post", "/boards", params={"name": name, "desc": desc, "defaultLists": "false"})

def create_list(board_id, name, pos):
    return req("post", "/lists", params={"name": name, "idBoard": board_id, "pos": str(pos)})

def create_label(board_id, name, color):
    return req("post", f"/boards/{board_id}/labels", params={"name": name, "color": color})

def create_card(list_id, name, desc="", label_ids=None, pos="bottom"):
    p = {"name": name, "idList": list_id, "desc": desc, "pos": pos}
    if label_ids:
        p["idLabels"] = ",".join(label_ids)
    return req("post", "/cards", params=p)

print("=" * 60)
print("CREATING BOARD 1: Life Map")
print("=" * 60)

b1 = create_board("Life Map",
    "North stars, desired states, wishes. These cards don't move through kanban — "
    "they are reference points. Review monthly. Ask: is my Execution board still aligned with this map?")
b1_id = b1["id"]
print(f"  Board created: {b1['shortUrl']}")

# Labels for Life Map
lbl_outcome = create_label(b1_id, "★ Outcome", "yellow")["id"]
lbl_state   = create_label(b1_id, "● State", "purple")["id"]
lbl_wish    = create_label(b1_id, "◇ Wish", "pink")["id"]

# --- List 1: Foundation ---
l1 = create_list(b1_id, "Foundation — Health & Stability", 1)["id"]
print("  List: Foundation")
for name in [
    "Maintain high energy",
    "Be healthy",
    "Loose weight",
    "Preserve youth",
    "Live long",
]:
    create_card(l1, name, label_ids=[lbl_outcome])
    print(f"    + {name}")

# --- List 2: Inner World ---
l2 = create_list(b1_id, "Inner World — Healing, Identity & Meaning", 2)["id"]
print("  List: Inner World")
for name in [
    "Cultivate warmth and love with myself",
    "Answer: Who am I and why am I here?",
    "Believe in God and understand him",
    "Understand this world: energy, death, manifestation, God, love",
]:
    create_card(l2, name, label_ids=[lbl_outcome])
    print(f"    + {name}")
for name in [
    "Be happy, content and calm",
    "Do not feel rushed",
    "Life without regrets, pressure, stupid plans for plans, meaningful with impact purposeful otherwise there is no sense",
    "Be wise",
    "Be kind",
    "Graceful and light",
    "Be respected",
]:
    create_card(l2, name, label_ids=[lbl_state])
    print(f"    + {name}")

# --- List 3: Freedom Engine ---
l3 = create_list(b1_id, "Freedom Engine — Money, Property & Apps", 3)["id"]
print("  List: Freedom Engine")
for name in [
    "Become financially free",
    "Become financially free, Retire myself and close ones, Have an option not to work",
    "Buy land / build Vastu house / have residence in Lithuania",
    "Move to Lithuania",
]:
    create_card(l3, name, label_ids=[lbl_outcome])
    print(f"    + {name}")

# --- List 4: Relationships ---
l4 = create_list(b1_id, "Relationships — Family & Emotional Safety", 4)["id"]
print("  List: Relationships (no cards — all actionable → Execution)")

# --- List 5: Joy & Exploration ---
l5 = create_list(b1_id, "Joy & Exploration — Beauty, Travel, Play", 5)["id"]
print("  List: Joy & Exploration")
for name in [
    "Look awesome, cool and attractive",
    "Elegant and charismatic",
    "Get cool voice and accent",
]:
    create_card(l5, name, label_ids=[lbl_state])
    print(f"    + {name}")
for name in [
    "Climb a mountain",
    "Visit Etna volcano",
    "Get to Everest base camp",
    "Visit many countries",
    "Visit nuclear power station",
    "Visit Barcelona quantum computer",
    "Become a pilot",
    "Play guitar",
    "Play chess",
]:
    create_card(l5, name, label_ids=[lbl_wish])
    print(f"    + {name}")

# --- List 6: Contribution ---
l6 = create_list(b1_id, "Contribution — Sharing Clarity", 6)["id"]
print("  List: Contribution")
for name in [
    "Inspire and influence people and give them tools and direction",
    "Teach people how to achieve success, inner peace and strength",
]:
    create_card(l6, name, label_ids=[lbl_outcome])
    print(f"    + {name}")

print(f"\nLife Map done — 34 cards. URL: {b1['shortUrl']}\n")


# ================================================================
print("=" * 60)
print("CREATING BOARD 2: Execution")
print("=" * 60)

b2 = create_board("Execution",
    "Actionable cards only. Projects, tasks, habits, practices, maintenance. "
    "Pull from Backlog → This Quarter → This Week → In Progress → Done. "
    "Max 3 non-recurring cards in In Progress.")
b2_id = b2["id"]
print(f"  Board created: {b2['shortUrl']}")

# Pillar labels
p_found  = create_label(b2_id, "🟢 Foundation", "green")["id"]
p_inner  = create_label(b2_id, "🟣 Inner World", "purple")["id"]
p_money  = create_label(b2_id, "🔵 Freedom Engine", "blue")["id"]
p_family = create_label(b2_id, "🔴 Relationships", "red")["id"]
p_joy    = create_label(b2_id, "🟠 Joy & Exploration", "orange")["id"]
p_contri = create_label(b2_id, "🫒 Contribution", "lime")["id"]

# Type labels
t_habit   = create_label(b2_id, "⟲ Habit/Practice", "sky")["id"]
t_project = create_label(b2_id, "📋 Project", "null")["id"]  # no color = grey
t_task    = create_label(b2_id, "✅ Task", "black")["id"]
t_maint   = create_label(b2_id, "🔧 Maintenance", "null")["id"]

# --- Backlog ---
backlog = create_list(b2_id, "Backlog", 1)["id"]
print("  List: Backlog")

# Foundation cards
backlog_cards = [
    ("Buy food containers",                          [p_found, t_task], ""),
    ("Check blood and allergies",                    [p_found, t_task], ""),
    ("Fix laptop",                                   [p_found, t_task], "Removes daily friction, enables all digital work"),
    ("Replace car wipers",                           [p_found, t_maint], "10 min task, safety"),
    ("Fix car charger → Later",                      [p_found, t_maint], "Low urgency"),
    # Inner World
    ("Do Gabor Maté healing course from home",       [p_inner, t_project], "→ after: self-compassion practice"),
    ("Organize my thoughts → Healing process",       [p_inner, t_project], "→ after: Gabor Maté"),
    ("Let go of David",                              [p_inner, t_project], "→ after: organize thoughts"),
    ("Heal attachment grief / missing David",        [p_inner, t_project], "→ after: let go"),
    ("Process spiritual grief and acceptance, life is this way (David)", [p_inner, t_project], "→ after: let go"),
    ("Heal rejection wound",                         [p_inner, t_project], "→ after: grief"),
    ("Heal broken heart",                            [p_inner, t_project], "→ after: rejection"),
    ("Explore why the \"what if\" narratives did not happen", [p_inner, t_project], "→ after: spiritual grief"),
    ("Identify my values and qualities",             [p_inner, t_project], "→ after: warmth"),
    ("Find my purpose and mission",                  [p_inner, t_project], ""),
    ("Explore myself",                               [p_inner, t_habit], "Ongoing practice"),
    ("Understand myself",                            [p_inner, t_habit], "Ongoing practice"),
    ("Find strength in myself / Buddha / God",       [p_inner, t_habit], "→ after: meditation"),
    ("Connect to God, tune into symbols and clues",  [p_inner, t_habit], "Spiritual practice, ongoing"),
    # Freedom Engine
    ("Decide honestly if I want to be wealthy and financially free", [p_money, t_task], "Removes ambivalence that blocks all financial action"),
    ("Define how much money I need for freedom",     [p_money, t_task], "→ after: decide. Everything else depends on this number"),
    ("Renovate flat for profit",                     [p_money, t_project], "Concrete, actionable, direct financial return"),
    ("Make land decision: sell / keep / rebuy Jašiūnai plots", [p_money, t_project], "Unblocks capital or commits to a plan"),
    ("Buy / flip / manage properties",               [p_money, t_project], "→ after: renovate flat, land decision"),
    ("Create Property management app",               [p_money, t_project], "→ after: properties"),
    ("Create budget app — Track expenses and alter budget — integrate into Navigation OS later", [p_money, t_project], "Feeds: define freedom number"),
    ("Change Vanguard pension amount",               [p_money, t_task], "→ after: define number. 5 min task, compounds for decades"),
    ("Complete courses for work",                    [p_money, t_task], "→ after: Fix laptop. Protects income / career stability"),
    # Relationships
    ("Spend time with sister and her Friends this weekend", [p_family, t_task], "Expands social circle through existing trust"),
    ("Visit my mum and go somewhere together",       [p_family, t_task], "One action, deep emotional return"),
    ("Go to Japan with my Family",                   [p_family, t_task], "Shared experience, creates lasting memory"),
    ("Organize Google Drive photos → Project / Later", [p_family, t_project], "Preserves family memories, not urgent"),
    # Joy & Exploration
    ("Try sport: gym / racket sport / ninjutsu",     [p_joy, t_project], "Supports energy, mountain climbing"),
    ("I want to watch Cannes films",                 [p_joy, t_task], "Easy win, feeds film knowledge"),
    ("Know more about cinematography",               [p_joy, t_project], "→ after: Cannes films"),
    ("Create my movie",                              [p_joy, t_project], "→ after: cinematography. Feeds films to schools (Contribution)"),
    ("Harvard Education: Ethics course and Buddha course", [p_joy, t_project], "Enriching, deepens worldview"),
    ("20/80 rule",                                   [p_joy, t_habit], "Meta-skill: focus only on what matters"),
    ("Play piano",                                   [p_joy, t_habit], "Regular creative practice, stress relief"),
    ("Create decisions and thoughts sorting app — mechanisms / algorithms — integrate into Navigation OS later", [p_joy, t_project], ""),
    ("Build AI trading app / Aladin stock trading app", [p_joy, t_project], "Feeds Financial Freedom. High risk, high effort"),
    ("Find my style",                                [p_joy, t_project], "→ after: Understand myself (Inner World)"),
    # Contribution
    ("Try Volunteering",                             [p_contri, t_project], "Lowest barrier, tests if contribution feels right. Better with NVC"),
    ("Try teaching",                                 [p_contri, t_project], "Tests the 'share knowledge' mission. Better with Communication"),
    ("Volunteering / teaching: finances, life concepts", [p_contri, t_project], "→ after: try volunteering + try teaching"),
    ("Create videos about Bangkok, China, Monaco, Nice", [p_contri, t_project], "From Cinematography (Joy)"),
    ("Movies / films to schools",                    [p_contri, t_project], "→ after: Create my movie (Joy)"),
    ("Write a book one day",                         [p_contri, t_project], "→ after: teach + warmth. Long-term"),
]

for name, labels, desc in backlog_cards:
    create_card(backlog, name, desc=desc, label_ids=labels)
    print(f"    + {name}")

# --- This Quarter ---
quarter = create_list(b2_id, "This Quarter", 2)["id"]
print("  List: This Quarter (empty — populate during first monthly review)")

# --- This Week ---
week = create_list(b2_id, "This Week", 3)["id"]
print("  List: This Week (empty — populate during first weekly review)")

# --- In Progress ---
progress = create_list(b2_id, "In Progress", 4)["id"]
print("  List: In Progress")

progress_cards = [
    ("⟲ Practise mindfulness/meditation to regulate anxiety, notice inner clarity, and become whole", [p_inner, t_habit], "Foundation practice. Supports clarity for all decisions"),
    ("⟲ Self-compassion instead of hatred",          [p_inner, t_habit], "Unlocks ability to act without self-sabotage"),
    ("⟲ Consistent early sleep",                     [p_found, t_habit], "Unlocks energy, mood, willpower for everything else"),
    ("⟲ Practise listening, NVC, non-judgment and emotional safety", [p_family, t_habit], "Supports sister, mum, teaching, volunteering"),
    ("⟲ Time spent on joy: reading, films, creating, music, travel", [p_joy, t_habit], "Schedule joy weekly, prevents burnout"),
    ("⟲ Read books, interesting, deep",              [p_joy, t_habit], "Compounds knowledge, available now, free"),
]

for name, labels, desc in progress_cards:
    create_card(progress, name, desc=desc, label_ids=labels)
    print(f"    + {name}")

# --- Done ---
done = create_list(b2_id, "Done", 5)["id"]
print("  List: Done (empty)")

backlog_count = len(backlog_cards)
progress_count = len(progress_cards)
total_exec = backlog_count + progress_count
print(f"\nExecution done — {total_exec} cards. URL: {b2['shortUrl']}")
print(f"\nGRAND TOTAL: 34 (Life Map) + {total_exec} (Execution) = {34 + total_exec}")
print("\n✓ All boards created successfully!")
print(f"\n  Life Map:  {b1['shortUrl']}")
print(f"  Execution: {b2['shortUrl']}")
