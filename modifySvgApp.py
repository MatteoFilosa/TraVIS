import re
import json



def modifySvg():
    svg_url = "./output.svg"
    svg_url_file = open(svg_url, "r")
    svgLines = svg_url_file.readlines()
    svg_url_file.close()

    newSvgContent = ""
    edgesDict = {}

    lastNode = -1
    lastEdge = "E-1"

    lookingForEllipse = False
    lookingForPolygon = False
    lookingForText = 0

    for line in svgLines:
        if re.search(r'^<!-- ([1-9]\d*|0) -->\n$', line):
            lastNode = line.split(" ")[1]
            lookingForEllipse = True

        elif (lookingForEllipse) and (re.search(r'^<ellipse .', line)):
            line = line.replace("<ellipse ", '<ellipse id="svg_node_id_'+ str(lastNode) +'" ')
            lookingForEllipse = False

        elif re.search(r'^<!-- E([1-9]\d*|0) -->\n$', line):
            if not (line.split(" ")[1] in edgesDict):
                edgesDict[line.split(" ")[1]] = {
                    "from_node": 0,
                    "to_node": 0,
                    "event": "",
                    "xpath": ""
                }
                lastEdge = line.split(" ")[1]
                lookingForText = 2
            lookingForPolygon = True

        elif (lookingForPolygon) and (re.search(r'^<polygon .', line)):
            line = line.replace("<polygon ", '<polygon id="svg_edge_id_'+ str(lastEdge) +'" ')
            lookingForPolygon = False

        elif (lookingForText > 0) and (re.search(r'^<text .', line)):
            splittedText = line.split(">")
            if "&#39;" in splittedText[1]:
                edgesDict[lastEdge]["event"] = (splittedText[1].split("&#39;"))[1]
            elif ")" in splittedText[1]:
                edgesDict[lastEdge]["xpath"] = (splittedText[1].split(")"))[0][1:]
            lookingForText -= 1

        elif re.search(r'^<!-- ([1-9]\d*|0)&#45;&gt;E([1-9]\d*|0) -->\n$', line):
            ids = line.split(" ")[1].split("&#45;&gt;")
            node = int(ids[0])
            edge = ids[1]
            if edge in edgesDict:
                edgesDict[edge]["from_node"] = node
            else:
                edgesDict[edge] = {
                    "from_node": node,
                    "to_node": 0,
                    "event": "",
                    "xpath": ""
                }

        elif re.search(r'^<!-- E([1-9]\d*|0)&#45;&gt;([1-9]\d*|0) -->\n$', line):
            ids = line.split(" ")[1].split("&#45;&gt;")
            node = int(ids[1])
            edge = ids[0]
            if edge in edgesDict:
                edgesDict[edge]["to_node"] = node
            else:
                edgesDict[edge] = {
                    "from_node": 0,
                    "to_node": node,
                    "event": "",
                    "xpath": ""
                }

        newSvgContent += line

    svg_url_file = open(svg_url, "w")
    svg_url_file.write(newSvgContent)
    svg_url_file.close()

    #print(edgesDict)
    json_url = "./output.json"
    json_url_file = open(json_url, "w")
    json_url_file.write( json.dumps(edgesDict) )
    json_url_file.close()
