import json, math
import xml.etree.ElementTree as ET
from matplotlib import colors, cm

# --- 1) Carica JSON ---
with open('index/aggregatedByTypeAndPath_Falcon.json','r',encoding='utf-8') as f:
    data_with = json.load(f)
with open('no_index/aggregatedByTypeAndPath_Falcon.json','r',encoding='utf-8') as f:
    data_no   = json.load(f)

# --- 2) Costanti di esagerazione ---
SCALE_FACTOR = 0.8    # quanto esagerare (0 = nessuna esagerazione, 1 = esagerazione massima)
GAMMA        = 0.5    # esponenziale per smorzare/amplificare piccoli vs grandi diff

# --- 3) Calcola tutte le diff in log-space ---
diffs = {}
for evt, paths in data_with.items():
    for xpath, v_w in paths.items():
        v_n = data_no.get(evt,{}).get(xpath)
        if v_w and v_n and v_w>0 and v_n>0:
            diffs[(evt,xpath)] = math.log(v_n) - math.log(v_w)

# --- 4) Normalizza a [-1,1] ---
max_abs = max(abs(d) for d in diffs.values())

# --- 5) Prepara colormap log e viridis ---
all_vals = [v for paths in data_with.values() for v in paths.values() if v>0] + \
           [v for paths in data_no.values()   for v in paths.values()   if v>0]
eps   = min(all_vals)*1e-3
vmin  = min(all_vals)+eps
vmax  = max(all_vals)
norm  = colors.LogNorm(vmin=vmin, vmax=vmax)
cmap  = cm.get_cmap('viridis')

def shifted_hex(value, shift):
    """Applica lo shift logaritmico e ritorna l’hex viridis."""
    v = max(value, eps)
    shifted = v * (10**shift)
    rgba = cmap(norm(shifted))
    return colors.to_hex(rgba)

# --- 6) Precompute shift per (mode, evt, xpath) ---
shifts = {'with_index':{}, 'no_index':{}}
for (evt,xpath), d in diffs.items():
    comp = math.copysign(abs(d)/max_abs, d)      
    comp = math.copysign(abs(comp)**GAMMA, comp)
    shifts['with_index'][(evt,xpath)] = -comp * SCALE_FACTOR
    shifts['no_index']  [(evt,xpath)] = +comp * SCALE_FACTOR

# --- 7) Funzione di rendering generica ---
def render(mode, data, shift_map, out_svg):
    tree = ET.parse('statechart/template.svg')
    ns   = {'svg':'http://www.w3.org/2000/svg'}
    root = tree.getroot()
    DEFAULT = '#a3a3a3'

    #  reset to grey
    for poly in root.findall('.//svg:g[@class="node"]/svg:polygon', ns):
        poly.set('fill', DEFAULT)

    #  apply colors
    for g in root.findall('.//svg:g[@class="node"]', ns):
        texts = g.findall('svg:text', ns)
        poly  = g.find('svg:polygon', ns)

        # skip if missing polygon or less than 2 text elements
        if poly is None or len(texts) < 2:
            continue

        t0 = texts[0].text
        t1 = texts[1].text
        # skip if either text is None
        if t0 is None or t1 is None:
            continue

        # safe to parse
        evt   = t0.split("'")[1]
        xpath = t1.strip('()')
        v     = data.get(evt, {}).get(xpath)
        shift = shift_map.get((evt, xpath), 0.0)

        if v is not None:
            color = shifted_hex(v, shift)
            poly.set('fill', color)

    tree.write(out_svg)
    print(f"Wrote {out_svg}")

# --- 8) Esegui per entrambe le versioni ---
render('with_index', data_with, shifts['with_index'], 'statechart_with_index.svg')
render('no_index',   data_no,   shifts['no_index'],   'statechart_no_index.svg')
