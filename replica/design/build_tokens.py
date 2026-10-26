#!/usr/bin/env python3
"""Genera tokens.css y tailwind-theme.css desde tokens.json (claro) y tokens.dark.json (oscuro).
Uso: python3 build_tokens.py [carpeta_destino]   (por defecto: esta carpeta)"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
dest = sys.argv[1] if len(sys.argv) > 1 else here
L = json.load(open(os.path.join(here, "tokens.json")))
D = json.load(open(os.path.join(here, "tokens.dark.json")))

def theme_vars(t, ind):
    v = [f"{ind}--color-{k}: {x};" for k, x in t["color"].items()]
    v += [f"{ind}--shadow-{k}: {x};" for k, x in t.get("shadow", {}).items()]
    return "\n".join(v)

out = ["/* Generado por build_tokens.py desde tokens.json y tokens.dark.json. No editar a mano. */", ":root {", theme_vars(L, "  ")]
for k, v in L["font"].items(): out.append(f"  --font-{k}: {v};")
for k, v in L["type"].items():
    out.append(f"  --text-{k}: {v['size']/16:g}rem; --text-{k}--line-height: {v['line']/16:g}rem; --text-{k}--font-weight: {v['weight']};")
for k, v in L["radius"].items(): out.append(f"  --radius-{k}: {v}px;")
m = L["motion"]; out.append(f"  --duration-fast: {m['fast']}; --duration-base: {m['base']}; --ease-std: {m['ease']};")
for k, v in L["layout"].items():
    if k != "breakpoints": out.append(f"  --layout-{k}: {v}px;")
out += ["  color-scheme: light;", "}",
        "@media (prefers-color-scheme: dark) {", '  :root:not([data-theme="light"]) {', theme_vars(D, "    "), "    color-scheme: dark;", "  }", "}",
        ':root[data-theme="dark"] {', theme_vars(D, "  "), "  color-scheme: dark;", "}"]
open(os.path.join(dest, "tokens.css"), "w").write("\n".join(out) + "\n")

tw = ["/* Tailwind v4: importar después de tokens.css. Los componentes usan bg-surface, text-muted, rounded-md... nunca hex. */", "@theme inline {"]
tw += [f"  --color-{k}: var(--color-{k});" for k in L["color"]]
tw += [f"  --font-{k}: var(--font-{k});" for k in L["font"]]
for k in L["type"]:
    tw.append(f"  --text-{k}: var(--text-{k}); --text-{k}--line-height: var(--text-{k}--line-height); --text-{k}--font-weight: var(--text-{k}--font-weight);")
tw += [f"  --radius-{k}: var(--radius-{k});" for k in L["radius"]]
tw += [f"  --shadow-{k}: var(--shadow-{k});" for k in L["shadow"]]
tw += [f"  --breakpoint-{k}: {v/16:g}rem;" for k, v in L["layout"]["breakpoints"].items()]
tw += ["  --spacing: 4px;", "}"]
open(os.path.join(dest, "tailwind-theme.css"), "w").write("\n".join(tw) + "\n")
print("ok:", dest)
