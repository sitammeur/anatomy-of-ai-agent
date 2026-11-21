# Anatomy of an AI Agent

[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1UyDAnjQZ-TbFGpXoHYcc1ff3Pc0apFE6?usp=sharing)

Most people learn what an agent is by importing one: install a framework, instantiate
an `Agent` class, hand it some tools, watch it work. That teaches you the framework's
API. It doesn't explain why the model calls a tool instead of just describing it, why
the loop stops when it does, or where "memory" actually lives between calls.

This notebook takes the other route. If you're comfortable reading Python and want to
know what's actually happening under an agent framework rather than trust that it
works, you build one yourself here, from scratch, in plain Python, no agent frameworks:
Model, Scaffolding, Harness, Agent, Context Engineering, Policy, Tool Use, Skills,
Sub-agents, Multimodal Input. Each concept is a cell you run, not a paragraph you read.

## Why one running example instead of eleven toy demos

Explaining "context engineering" or "sub-agents" as abstract concepts makes them sound
more complicated than they are. So this workshop grounds all eleven in one scenario:

Maya is flying to Tokyo in 3 days for work. She wants one assistant that can check the
real multi-day forecast for her dates, turn that into a day-by-day itinerary, tell her
what to pack, keep her daily budget straight in yen, and sanity-check a real photo of
what she's packed or what Tokyo looks like right now.

Every term in this notebook exists because Maya's assistant needs it. A single-day
weather reading can't answer a multi-day packing question, so `get_weather` grows into
a real forecast call. Maya's budget has to be in yen, so a currency tool joins it, and a
skill tells the model how to state money. By the
capstone at the end, every tool and skill you wrote comes together to actually solve
her trip, not a simplified stand-in for it.

> This is a *learning* implementation, not a production one. No retries, no streaming,
> no proper async. Every line is written to be read, not to be robust.

## What building an agent from scratch actually involves

| Section | Concept | Why it exists |
|---|---|---|
| 0 | Setup | Nothing else runs without a client wired to OpenRouter |
| 1 | Model | Shows what a model can't do alone — no memory, no ability to act, one response per prompt |
| 2 | Scaffolding | The model needs tool schemas and a system prompt before it can act like an agent at all |
| 3 | Harness | Something has to actually run the tool calls the model only describes, and feed the results back |
| 4 | Agent | Model, scaffolding, and harness stop being three things you wire up separately each time |
| 5 | Context engineering | A fresh agent instance doesn't remember yesterday's conversation unless something stores it outside the model |
| 6 | Policy | Same weights, different system prompt, different behavior — "personality" turns out to be scaffolding, not training |
| 6b | Reasoning | Some questions are worth the extra latency of step-by-step thinking; most aren't |
| 7 | Tool use | What the harness does when a real API call fails mid-conversation |
| 8 | Skills | Instructions that only enter the prompt when they're relevant: first via a simple keyword router, then the way real skill systems do it, with the model loading the skill itself |
| 9 | Sub-agents | One narrow job — turning a weather description into packing advice — delegated to an agent built just for it |
| 10 | Multimodal input | Some of what Maya needs isn't text: a photo of what Tokyo looks like right now |
| 11 | Capstone | Every tool, both skills, and the sub-agent, solving the actual trip |

Once you've built each of these by hand, the same pieces read differently inside
CrewAI or LangGraph. An opaque `Agent()` constructor stops being magic and becomes
recognizable: that's just scaffolding, that's their harness's stop condition, that's
their version of the memory split from section 5.

## Which model this runs on, and why

An agent harness is only as reliable as the model underneath it. Hand a `tools` schema
to a small, general-purpose model and its tool calls can come out malformed or
inconsistent, and if its chat template never had a first-class `system` role, your
instructions end up folded awkwardly into the first user message instead.

That's why this notebook runs on OpenRouter's free **Gemma 4** endpoint
(`google/gemma-4-26b-a4b-it:free`) rather than a generic small model. Gemma 4 was
trained for agentic workflows, not retrofitted for them afterward: its `tool_calls`
come out consistently, it supports `system` directly, its step-by-step reasoning can be
toggled per request through OpenRouter's `reasoning` parameter, and it takes an image
as input alongside text. Four separate sections in this notebook lean on one of those
properties directly. A second free variant, `google/gemma-4-31b-it:free`, is also
available on OpenRouter if you want to compare.

The free Gemma 4 endpoint has a single upstream provider and is often rate-limited
(HTTP 429). You can switch models without touching code by adding a `MODEL` line to `.env`:

| `MODEL=` | When to use it |
|---|---|
| `google/gemma-4-26b-a4b-it:free` | Default. Free, but can be busy |
| `google/gemma-4-26b-a4b-it` | Same Gemma 4, paid. A full run of the notebook costs well under one US cent. Use this for live demos |
| `nvidia/nemotron-3.5-super-vl:free` | Free fallback with tool calling, image input, and switchable reasoning |

The tools Maya's assistant calls are real, not mocked, and all free and keyless:

- **Weather** — [Open-Meteo](https://open-meteo.com) forecast API
- **Currency** — [Frankfurter](https://frankfurter.dev) exchange-rate API
- **Image** — a real photo pulled from Wikimedia Commons

Your OpenRouter key is the only credential the notebook needs.

## Setting up the workshop

The fastest way to try this is the [Colab
notebook](https://colab.research.google.com/drive/1UyDAnjQZ-TbFGpXoHYcc1ff3Pc0apFE6?usp=sharing) —
no local setup at all, just add your OpenRouter key as a Colab secret (key icon in the
sidebar, name it `OPENROUTER_API_KEY`) and run the cells. Running it locally instead
gives you a persistent `long_term_memory.json` between sessions, which is the only
thing the hosted version can't do.

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) for dependency management
- A free [OpenRouter](https://openrouter.ai/keys) API key

### Setup

```bash
# Install dependencies
uv sync

# Add your OpenRouter key
cp .env.example .env
# then edit .env and set OPENROUTER_API_KEY=sk-or-...
```

`.env` is already git-ignored — never commit it.

### Running the notebook

```bash
uv run jupyter lab anatomy-of-ai-agent.ipynb
```

Run the cells top to bottom. Each section builds on the objects the previous one
created, so skipping ahead will throw a `NameError` rather than a wrong answer.

> **Note.** OpenRouter's free tier is rate-limited: 20 requests a minute per key, and the
> free Gemma 4 endpoint is also limited upstream. If a cell errors with a 429, wait a
> moment and re-run it, or set `MODEL` in `.env` as described above.

## What's in this repo

- `anatomy-of-ai-agent.ipynb` — the workshop notebook itself
- `Anatomy of an AI Agent.pdf` — companion slides
- `long_term_memory.json` — generated by the context engineering section's long-term
  memory demo; safe to delete and regenerate
- `pyproject.toml` / `uv.lock` — dependencies, managed with uv

## Where to go from here

Building the mechanism by hand is the point, but it's also the ceiling of what this
notebook covers on its own. A few ways to push past it:

- Rebuild one exercise from this notebook using **CrewAI** or **LangGraph** and diff the
  code against what you wrote here.
- Set `MODEL` to `google/gemma-4-31b-it:free`, or a paid, larger OpenRouter model, and see how much more reliable tool selection and reasoning
  quality get as the model scales up.
- Add a tool your own trip would actually need — flight status, hotel search, a packing
  checklist that persists to long-term memory — and watch it slot into the same
  scaffolding-plus-harness pattern.

## License

MIT — see [LICENSE](LICENSE).
