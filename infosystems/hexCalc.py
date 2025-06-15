import json
from matplotlib import colors, cm

# Input data
data_no_index = {
    "mousemove": {
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 10615.727186203003,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 6936.485290527344,
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 43451.7982006073,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 19425.060987472534,
        "/html[1]/body[1]/div[2]/div[7]/canvas[1]": 3538.0783081054688
    },
    "click": {
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 19.10090446472168,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 3.699064254760742,
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 6.1893463134765625,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 2.7573108673095703
    },
    "brush mousedown": {
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 32.18817710876465,
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 31.405925750732422,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 7.039070129394531,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 13.480663299560547
    },
    "brush mousemove": {
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 24538.698434829712,
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 33597.081422805786,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 5662.843942642212,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 7729.229927062988
    },
    "brush mouseup": {
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 46.78082466125488,
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 34.4696044921875,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 5.924463272094727,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 10.851383209228516
    }
}
data_with_index = {
    "mousemove": {
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 10445.754289627075,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 6904.494047164917,
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 42032.177448272705,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 18769.152641296387,
        "/html[1]/body[1]/div[2]/div[7]/canvas[1]": 3410.8426570892334
    },
    "click": {
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 16.505956649780273,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 2.6776790618896484,
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 7.249355316162109,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 3.6149024963378906
    },
    "brush mousedown": {
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 26.29828453063965,
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 32.95016288757324,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 6.738901138305664,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 9.447097778320312
    },
    "brush mousemove": {
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 22207.014799118042,
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 29937.405824661255,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 5001.311779022217,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 7737.221240997314
    },
    "brush mouseup": {
        "/html[1]/body[1]/div[2]/div[4]/canvas[1]": 23.5140323638916,
        "/html[1]/body[1]/div[2]/div[6]/canvas[1]": 23.83565902709961,
        "/html[1]/body[1]/div[2]/div[2]/canvas[1]": 9.942293167114258,
        "/html[1]/body[1]/div[2]/div[3]/canvas[1]": 10.010480880737305
    }
}

# Build shared scale
all_vals = [v for paths in data_no_index.values() for v in paths.values()] + \
           [v for paths in data_with_index.values() for v in paths.values()]
vmin, vmax = min(all_vals), max(all_vals)
norm = colors.Normalize(vmin=vmin, vmax=vmax)
cmap = cm.get_cmap('viridis')

def map_colors(data):
    colored = {}
    for evt, paths in data.items():
        colored[evt] = {}
        for xpath, val in paths.items():
            rgba = cmap(norm(val))
            colored[evt][xpath] = colors.to_hex(rgba)
    return colored

colored_no_index = map_colors(data_no_index)
colored_with_index = map_colors(data_with_index)

import pprint; pprint.pprint(colored_no_index); pprint.pprint(colored_with_index)

# Optionally write to JSON
with open('colors_no_index.json','w') as f:
    json.dump(colored_no_index, f, indent=4)
with open('colors_with_index.json','w') as f:
    json.dump(colored_with_index, f, indent=4)

