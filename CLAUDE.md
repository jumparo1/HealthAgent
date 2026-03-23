# Health Agent

Personal health intelligence — track gut health, diet, symptoms, medications, and chat with an AI agent.

## Stack
- **Frontend:** `health-agent.html` (single file, vanilla JS, dark theme)
- **Database:** localStorage (offline-first, no account needed)
- **AI Agent:** Claude Haiku 4.5 via tool_use API, 8-turn multi-tool loop, 11 tools
- **Hosting:** Local only (not on GitHub yet)

## Pages (5 tabs)
| Tab | Description |
|-----|-------------|
| **Daily Log** | Mood picker (4 states), symptom checkboxes (10 types), bloating/energy 0-10, food diary, notes |
| **Food Guide** | 3 lists: Good (24), Caution (10), Avoid (14) — pre-seeded from microbiome data. Add/remove freely. |
| **My Health** | Key findings (red/yellow/green), known triggers, meds & supplements, treatment plan, tests done, profile |
| **AI Chat** | Tool-use agent — reads/adds/removes all data, answers health questions in BG or EN |
| **History** | All daily log entries + JSON export |

## AI Agent (11 tools)
| Tool | What it does |
|------|---|
| `get_data` | Read any collection (logs, findings, meds, foods, tests, treatment, profile) with filters |
| `add_food` / `remove_food` | Manage food guide with "why" explanations |
| `add_med` / `remove_med` / `toggle_med` | Manage medications & supplements |
| `add_log` | Create daily log entry via chat |
| `add_finding` | Add new lab finding |
| `add_test` | Add new test result |
| `update_treatment` | Update treatment plan |
| `navigate_to` | Switch UI tabs |

- **Model:** Claude Haiku 4.5 (`claude-haiku-4-5-20250315`)
- **Pattern:** 8-turn tool_use loop with system prompt containing full patient context
- **API Key:** Stored in localStorage (`ha_apikey`), set via UI button

## Patient Data (seeded)
- **Lab reports:** Biovis Microbiome Maxi Plus (26.11.2025) + Intestinal Permeability (Геника)
- **Key issues:** Akkermansia 125x low, Phenols +2558%, Proteobacteria 3.3x high, low Bifido
- **Normal:** Calprotectin, Zonulin, Histamine, SIBO, Lactose, Gluten, Colonoscopy, Gastroscopy
- **Allergies:** Egg whites (medium), Cashew (medium) — from 700-food panel
- **Triggers:** Pizza, beer, coffee excess, bread/dough, cheese, stress
- **Treatment:** 3-month gut restoration (Mar-Jun 2026) with nutritionist, bi-weekly check-ins
- **Supplements:** Prebiotics (scFOS/scGOS), Probiotics, Gut Lining Support, Whey Isolate, Creatine

## Data Sources
- Biovis Diagnostik MVZ GmbH (microbiome analysis, validated by Dr. Herbert Schmidt)
- Геника / Геномен Център България (intestinal permeability)
- GPT health agent export (symptom history, triggers, prior tests)
- Nutritionist treatment plan analysis

## How to Run
```bash
cd ~/HealthAgent
python3 -m http.server 8081
# Open http://localhost:8081/health-agent.html
```

## Recent Changes
- 2026-03-17: **AI Chat agent** — Claude Haiku tool_use with 11 tools, 8-turn loop, reads/writes all data
- 2026-03-17: **Food Guide** — 3-tier system (good/caution/bad), 48 foods seeded from microbiome profile
- 2026-03-17: **Simplified rebuild** — 5 tabs replacing 11 pages, all data from PDFs + GPT export
- 2026-03-17: **Initial build** — seeded from Biovis Microbiome Maxi Plus + Intestinal Permeability PDFs

## Next Steps
- Test AI chat agent with API key
- Add more foods based on nutritionist recommendations
- Start daily logging
- Consider Firebase sync for persistence across devices
- Potential: scheduled task for daily health reminders
