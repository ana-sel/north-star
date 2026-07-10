# Design system

Source of truth: `docs/design/wireframes/shared/`

## Tokens (`tokens.css`)

```css
/* Surfaces */
--bg: #F6F5F2        /* page background */
--card: #FFFEFC      /* card surface */
--greige: #F0ECE5    /* subtle fill */
--line: #E2DFD9      /* borders, dividers */
--muted: #65645F     /* secondary text */
--ink: #24231F       /* primary text */
--steel: #7E8E9F     /* neutral accent */
--olive: #768471     /* positive/done */
--btn: #3C3A34       /* primary button */

/* Pillar accents */
--p-health: #77936f
--p-inner:  #937caf
--p-admin:  #958572
--p-family: #b77980
--p-joy:    #c99554
--p-money:  #7395ad
--p-contrib:#8d8f63

/* Type scale */
--fs-xl: 26px   /* screen title */
--fs-lg: 17px   /* section heading */
--fs-md: 14px   /* body */
--fs-sm: 12px   /* secondary */
--fs-xs: 10px   /* labels, tags */

/* Shape & depth */
--r-card: 18px
--shadow:    0 1px 2px rgba(36,35,31,.04), 0 10px 28px rgba(36,35,31,.08)
--shadow-sm: 0 1px 2px rgba(36,35,31,.03), 0 4px 14px rgba(36,35,31,.05)
```

## Components (`components.css`)

| Class | Purpose |
|---|---|
| `.screen-body` | Applied to every screen loaded in iframe |
| `.card` | White card with border, radius, shadow |
| `.card-h` | Uppercase eyebrow label inside a card |
| `.row` | Flex row with dot + label + tag, bottom-bordered |
| `.dot` | 10 px colored circle (pillar color) |
| `.tag` | Small greige pill label |
| `.check` / `.check.done` | Circular checkbox; `.done` fills olive |
| `.qstrip` / `.qbtn` | Quick-log button strip |
| `.pill-row` / `.pill` / `.pill.on` | Filter pills; `.on` is dark filled |
| `.prog-row` / `.prog-bar` / `.prog-fill` | Progress bar row |
| `.kanban-wrap` / `.kanban` / `.k-col` / `.k-card` | Horizontal scrollable kanban |
| `.goal-grid` / `.goal-tile` | 2-col goal tile grid |
| `.ai-card` | Dark gradient AI/coach card |

## Typography

Font: **Inter** (400, 500, 600, 700, 800).  
Smoothing: `-webkit-font-smoothing: antialiased`.

## Navigation shell

`nav-modular.html` is the single wireframe shell. It loads individual screens from `screens/*.html` into an iframe. Edit screens independently; the shell provides chrome, tabs, and navigation.

## Pillars

7 life pillars, each with a named accent colour:

| Pillar | Token |
|---|---|
| Health | `--p-health` |
| Inner | `--p-inner` |
| Admin | `--p-admin` |
| Family | `--p-family` |
| Joy | `--p-joy` |
| Money | `--p-money` |
| Contrib | `--p-contrib` |
