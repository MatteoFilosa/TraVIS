import json
import random


eventsList = [
"click", 
"dbclick",
"mousemove", #When moving inside a widget
"mousedown", #A pointing device button is pressed while the pointer is inside the element
"mouseup", #When the pointing device is released (opposite of MOUSEDOWN)
"mouseenter", #triggered when the mouse pointer enters the element
"mouseover", #is triggered when the mouse pointer enters the element, and its child
"mouseleave", #opposite of MOUSEOVER
"wheel", #opposite of MOUSEOUT
"zoom",
"brushstart",
"brushend"]

#Can we consider MOUSEDOWN + MOVE = DRAGSTART and then MOUSEUP = DRAGEND ?
#Can we consider WHEEL = ZOOM and DBCLICK also

transitionsList = []
explorationSequence = []

listPaths = []

#Click, if we have height and width we check where to click
#Otherwise we click on the element at the middle (Selenium will do this)
#CHECKBOX HTML (the event is "change" but what is needed is a simple click)
def Click(height,width):

    #print(height)
    #print(width)
    if(height!="auto" and width!="auto" and height!=0 and width!=0):

        #Choose randomly a point to click
        xClick = random.randint(1,width)
        yClick = random.randint(1,height)

        return (xClick,yClick)

    else:

        return None

def Mousemove(height,width):

    if(height!="auto" and width!="auto" and height!=0 and width!=0):

        centerWidth = int(width/2)
        centerHeight = int(height/2)

        targetMoveWidth = random.randint(1,width)
        targerMoveHeight = random.randint(1,height)

        offsetMoveWidth = targetMoveWidth - centerWidth
        offsetMoveHeight = targerMoveHeight - centerHeight

        return (offsetMoveWidth,offsetMoveHeight) 

    else:

        return None

#PAN BRUSH
def PanBrush(directions,brushExtent,selectionExtent):

    #Dimension of the brushable area
    width = int(brushExtent[1][0] - brushExtent[0][0])
    height = int(brushExtent[1][1] - brushExtent[0][1])

    #Dimension of the pannable area of the brush
    widthBrush = int(selectionExtent[1][0] - selectionExtent[0][0])
    heightBrush = int(selectionExtent[1][1] - selectionExtent[0][1])

    #Starting,Ending and Middle point of the brushArea
    xStartBrush = selectionExtent[0][0]
    yStartBrush = selectionExtent[0][1]

    xEndBrush = xStartBrush + widthBrush
    yEndBrush = yStartBrush + heightBrush

    xMiddleBrush = xStartBrush + int(widthBrush/2)
    yMiddleBrush = yStartBrush + int(heightBrush/2)

    #print("xMiddle " + str(xMiddleBrush))

    xMove = None
    yMove = None

    if(directions == "xy"):

        #Here randomly is chosen where moving between "left/right" and "up/down"
        xMove = random.randint(0,1)
        yMove = random.randint(0,1)

        xDirections = ["right","left"]
        yDirections = ["up","down"]

        xMove = xDirections[xMove]
        yMove = yDirections[yMove]
    
    elif(directions == "x"):

        xMove = random.randint(0,1)

        xDirections = ["right","left"]

        xMove = xDirections[xMove]

    else:

        yMove = random.randint(0,1)

        yDirections = ["up","down"]

        yMove = yDirections[yMove]

    if(xMove == "right"):
        
        maxMovement = width - xEndBrush

        moveX = random.randint(0,maxMovement)
    
    elif(xMove == "left"):

        maxMovement = -xStartBrush

        moveX = random.randint(maxMovement,0)
    
    else:

        moveX = 0


    if(yMove == "up"):

        maxMovement = -yStartBrush

        moveY = random.randint(maxMovement,0)

    #This means we're moving down
    elif(yMove == "down"):

        maxMovement = height - yEndBrush

        moveY = random.randint(0,maxMovement)

    else: 

        moveY = 0

    return [int(moveX),int(moveY),xMiddleBrush,yMiddleBrush,width,height]

#BRUSH FUNCTION
def Brush(actionType,brushableInfo):
    
    directions = brushableInfo["directions"]

    brushExtent = brushableInfo["brush_extent"]

    selectionExtent = brushableInfo["selection_extent"]

    #Object to return with the new selection extent
    newSelectionExtent = None

    #Case when the brushing can be done in all the dimensions
    if(directions == "xy"):

        #Dimension of the brushable area
        widthBrush = int(brushExtent[1][0] - brushExtent[0][0])
        heightBrush = int(brushExtent[1][1] - brushExtent[0][1])

        if(actionType == "L"):

            #In this case the area is 1/4 of the original

            #Find the starting points
            xStartBrush = random.randint(0,widthBrush - int(widthBrush/4))
            yStartBrush = random.randint(0,heightBrush - int(heightBrush/4))

            #New selection extent
            newSelectionExtent = [[xStartBrush,yStartBrush],[xStartBrush + int(widthBrush/4),yStartBrush + int(heightBrush/4)]]
    

        elif(actionType == "M"):

            #In this case the area is 1/2 of the original

            #Find the starting points
            xStartBrush = random.randint(0,widthBrush - int(widthBrush/2))
            yStartBrush = random.randint(0,heightBrush - int(heightBrush/2))

            #New selection extent
            newSelectionExtent = [[xStartBrush,yStartBrush],[xStartBrush + int(widthBrush/2),yStartBrush + int(heightBrush/2)]]
        
        else:

            #In this case the area is 2/3 of the original

            #Find the starting points
            xStartBrush = random.randint(0,widthBrush - int(widthBrush*(2/3)))
            yStartBrush = random.randint(0,heightBrush - int(heightBrush*(2/3)))

            #New selection extent
            newSelectionExtent = [[xStartBrush,yStartBrush],[xStartBrush + int(widthBrush*(2/3)),yStartBrush + int(heightBrush*(2/3))]]

    elif(directions == "x"):

        #Dimension of the brushable area
        widthBrush = int(brushExtent[1][0] - brushExtent[0][0])
        heightBrush = int(brushExtent[1][1] - brushExtent[0][1])

        if(actionType == "L"):

            #In this case the area is 1/4 of the original

            #Find the starting points
            xStartBrush = random.randint(0,widthBrush - int(widthBrush/4))
            yStartBrush = int(heightBrush/2)

            #New selection extent
            newSelectionExtent = [[xStartBrush,yStartBrush],[xStartBrush + int(widthBrush/4),yStartBrush]]
    

        elif(actionType == "M"):

            #In this case the area is 1/2 of the original

            #Find the starting points
            xStartBrush = random.randint(0,widthBrush - int(widthBrush/2))
            yStartBrush = int(heightBrush/2)

            #New selection extent
            newSelectionExtent = [[xStartBrush,yStartBrush],[xStartBrush + widthBrush/2,yStartBrush]]
        
        else:

            #In this case the area is 2/3 of the original

            #Find the starting points
            xStartBrush = random.randint(0,widthBrush - int(widthBrush*(2/3)))
            yStartBrush = int(heightBrush/2)

            #New selection extent
            newSelectionExtent = [[xStartBrush,yStartBrush],[xStartBrush + int(widthBrush*(2/3)),yStartBrush]]

    else:

        #Dimension of the brushable area
        widthBrush = int(brushExtent[1][0] - brushExtent[0][0])
        heightBrush = int(brushExtent[1][1] - brushExtent[0][1])

        if(actionType == "L"):

            #In this case the area is 1/4 of the original

            #Find the starting points
            xStartBrush = int(widthBrush/2)
            yStartBrush = random.randint(0,heightBrush - int(heightBrush/4))

            #New selection extent
            newSelectionExtent = [[xStartBrush,yStartBrush],[xStartBrush,yStartBrush + int(heightBrush/4)]]
    

        elif(actionType == "M"):

            #In this case the area is 1/2 of the original

            #Find the starting points
            xStartBrush = int(widthBrush/2)
            yStartBrush = random.randint(0,heightBrush - int(heightBrush/2))

            #New selection extent
            newSelectionExtent = [[xStartBrush,yStartBrush],[xStartBrush,yStartBrush + int(heightBrush/2)]]
        
        else:

            #In this case the area is 2/3 of the original

            #Find the starting points
            xStartBrush = int(widthBrush/2)
            yStartBrush = random.randint(0,heightBrush - int(heightBrush*(2/3)))

            #New selection extent
            newSelectionExtent = [xStartBrush,yStartBrush],[xStartBrush,yStartBrush + int(heightBrush*(2/3))]
    
    
    return newSelectionExtent

#ZOOM and PANNINGZOOM FUNCTION
#This is probably used only in the case of the "wheel", since with "dbclick" we have a fixed scale
def Zoom(actionType,zoomInfo):

    width = zoomInfo["width"]
    height = zoomInfo["height"]

    #Starting point from which zooming 
    xStart = random.randint(1,width-1)
    yStart = random.randint(1,height-1)

    return [actionType,(xStart,yStart)]

#Returns an array with all the information
def PanZoom(actionType,panZoomInfo):

    if(panZoomInfo==None):

        return [actionType,None]

    else:

        height = panZoomInfo["height"]
        width = panZoomInfo["width"]

        #Starting point from which panning starts
        xStart = random.randint(1,width-1)
        yStart = random.randint(1,height-1)

        #Here randomly is chosen where moving between "left/right" and "up/down"
        xMove = random.randint(0,1)
        yMove = random.randint(0,1)

        xDirections = ["right","left"]
        yDirections = ["up","down"]

        xMove = xDirections[xMove]
        yMove = yDirections[yMove]

        return [actionType,(height,width),(xStart,yStart),(xMove,yMove)]

#SLIDER CHANGE HTML
#This is the case when class = "input" and type = "range"
def SliderHtml(sliderInfo):

    minValue = sliderInfo["min"]
    maxValue = sliderInfo["max"]
    
    #Per ora escludiamo di averlo
    # currentValue = sliderInfo["value"]

    width = sliderInfo["width"]

    return ["range",None,(minValue,maxValue,width)]

#SELECT DROPDOWN HTML
def selectDropdownHtml(selectInfo):

    possibleValues = selectInfo["value"]

    nextValueIndex = random.randint(0,len(possibleValues)-1)

    nextValue = possibleValues[nextValueIndex]["value"]

    return nextValue

#INPUT TYPE NUMER HTML
def inputNumberHtml(inputInfo):

    minValue = inputInfo["min"]
    maxValue = inputInfo["max"]
    currentValue = inputInfo["value"]

    step = inputInfo["step"]

    if(step != None):

        possibleValues = []
        for i in range(minValue,maxValue,step):
            possibleValues.append(i)
        
        possibleValues.append(maxValue)

        nextValue = random.randint(0,len(possibleValues)-1)

        nextValue = possibleValues[nextValue]

    else:

        nextValue = random.randint(minValue,maxValue)

    return nextValue

repetition = None
def EventHandle(edge,continueExploration):

    typeActions = ["L","M","B"]

    currentState = edge

    idNode = currentState["id"]
    xpathNode = currentState["xpath"]
    siblingsNode = currentState["siblings"]
    startingPathNode = currentState["startingPath"]
    eventNode  = currentState["event"]
    stylesNode = currentState["styles"]
    attributeNode = currentState["attributes"]
    tagNode = currentState["tag"]
    brushableNode = currentState["brushable"]
    zoomableNode = currentState["zoomable"]
    leadsToStateNode = currentState["leadsToState"]

    if(eventNode not in EventList):
        EventList.append(eventNode)

    if(eventNode == "click" or eventNode == "contextmenu"):

        if("type" in attributeNode and (attributeNode["type"] == "checkbox" or attributeNode["type"] == "radio")):
    
            explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":None,"leadsToState":leadsToStateNode}

            continueExploration.append(explorationState)

        #If the tag is button we don't need any other information
        elif(tagNode == "button"):

            explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":None,"leadsToState":leadsToStateNode}

            continueExploration.append(explorationState)

        else:

            width = stylesNode["width"]
            height = stylesNode["height"]

            infoClick = Click(height,width)

            explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":infoClick,"leadsToState":leadsToStateNode}
            
            continueExploration.append(explorationState)

    #For the moment we try to not distinguish them "mouseover" and "mouseleave"
    elif(eventNode == "mouseover" or eventNode == "mouseenter"):

        explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":None,"leadsToState":leadsToStateNode}

        continueExploration.append(explorationState)

    elif(eventNode == "mouseout" or eventNode=="mouseleave"):

        explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":None,"leadsToState":leadsToStateNode}

        continueExploration.append(explorationState)

    elif(eventNode == "mousedown"):

        if(brushableNode==None and zoomableNode==None):

            explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":None,"leadsToState":leadsToStateNode}

            continueExploration.append(explorationState)

        elif(brushableNode!=None):

                newBrushPosition = None
                auxExtent = None

                #print(brushableNode["brush_extent"])
                #print(brushableNode["selection_extent"])

                if(brushableNode["brush_extent"] == brushableNode["selection_extent"]):

                    auxExtent = brushableNode["selection_extent"]

                    explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":"reset_brush","info":brushableNode["selection_extent"],"leadsToState":leadsToStateNode}

                    continueExploration.append(explorationState)

                    brushableNode["selection_extent"] = None

                for size in typeActions:

                    for i in range(0,repetition):

                        newSelectionExtent = Brush(size,brushableNode)

                        #print("New selection_extent: ",end="")
                        #print(newSelectionExtent)

                        infoPan = PanBrush(brushableNode["directions"],brushableNode["brush_extent"],newSelectionExtent)
                        #print("InfoPan ",end="")
                        #print(infoPan)

                        newBrushPosition = [[newSelectionExtent[0][0] + infoPan[0],newSelectionExtent[0][1] + infoPan[1]],[newSelectionExtent[1][0] + infoPan[0],newSelectionExtent[1][1] + infoPan[1]]]

                        #Info for panning the brushed area
                        explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":"brush","info":[newSelectionExtent,[infoPan, newBrushPosition]],"leadsToState":leadsToStateNode}

                        if(explorationState not in continueExploration):
                            continueExploration.append(explorationState)

                        #Position after the panning
                        #newBrushPosition = [[newSelectionExtent[0][0] + infoPan[0],newSelectionExtent[0][1] + infoPan[1]],[newSelectionExtent[1][0] + infoPan[0],newSelectionExtent[1][1] + infoPan[1]]]
                        #print("New brush pos ",end="")
                        #print(newBrushPosition)
                
                brushableNode["selection_extent"] = auxExtent

        elif(zoomableNode!=None):

            if(stylesNode["height"]!=None or stylesNode["width"]!=None):

        
                panZoomInfo = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"height":stylesNode["height"],"width":stylesNode["width"]}

            else: 

                panZoomInfo = None

            for size in typeActions:
                
                retInfo = PanZoom(size,panZoomInfo)

                explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":"panzoom","info":retInfo,"leadsToState":leadsToStateNode}

                continueExploration.append(explorationState)
                    
    elif(eventNode == "wheel"):

        for size in typeActions:

            #We make 3 for zoom in and 3 for zoom out handled directly in Selenium
            for i in range(0,repetition):

                if(stylesNode["height"]!=None or stylesNode["width"]!=None):
            
                        zoomInfo = {"height":stylesNode["height"],"width":stylesNode["width"]}

                else: 

                        zoomInfo = None
                    

                retInfo = Zoom(size,zoomInfo)

                explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":["in",retInfo],"leadsToState":leadsToStateNode}

                continueExploration.append(explorationState)
                

            for i in range(0,repetition):
    
                if(stylesNode["height"]!=None or stylesNode["width"]!=None):
            
                        zoomInfo = {"height":stylesNode["height"],"width":stylesNode["width"]}

                else: 

                        zoomInfo = None
                    

                retInfo = Zoom(size,zoomInfo)

                explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":["out",retInfo],"leadsToState":leadsToStateNode}

                continueExploration.append(explorationState)
                
    elif(eventNode == "mouseup"):

        explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":None,"leadsToState":leadsToStateNode}

        continueExploration.append(explorationState)

    elif(eventNode == "input"):

        if(attributeNode["type"]!=None):

            if(attributeNode["type"]=="range"):

                for size in typeActions:

                    for i in range(0,repetition):

                        sliderHtmlInfo = {"min":int(attributeNode["min"]),"max":int(attributeNode["max"]),"width":stylesNode["width"]}

                        retInfo = SliderHtml(sliderHtmlInfo)

                        retInfo[1]=size

                        explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info": retInfo,"leadsToState":leadsToStateNode}

                        continueExploration.append(explorationState)
                        

            elif(attributeNode["type"] == "number"):

                for i in range(0,repetition):

                    if("step" in attributeNode):
    
                        numberInfo = {"min":int(attributeNode["min"]),"max":int(attributeNode["max"]),"value":int(attributeNode["value"]),"step":int(attributeNode["step"])}

                    else:

                        numberInfo = {"min":int(attributeNode["min"]),"max":int(attributeNode["max"]),"value":int(attributeNode["value"]),"step":None}

                    explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info": ["number",inputNumberHtml(numberInfo)],"leadsToState":leadsToStateNode}

                    continueExploration.append(explorationState)
                    

            #We treat this case like it was a button
            elif(attributeNode["type"] == "checkbox" or attributeNode["type"] == "radio"):

                explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":[attributeNode["type"],None],"leadsToState":leadsToStateNode}

                continueExploration.append(explorationState)
                    
    elif(eventNode == "change"):

        if(tagNode == "input"):

            if(attributeNode["type"] == "checkbox" or attributeNode["type"] == "radio"):
    
                explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":None,"leadsToState":leadsToStateNode}

                continueExploration.append(explorationState)

            elif(attributeNode["type"] == "number"):

                for i in range(0,repetition):

                    if("step" in attributeNode):
    
                        numberInfo = {"min":int(attributeNode["min"]),"max":int(attributeNode["max"]),"value":int(attributeNode["value"]),"step":int(attributeNode["step"])}

                    else:

                        numberInfo = {"min":int(attributeNode["min"]),"max":int(attributeNode["max"]),"value":int(attributeNode["value"]),"step":None}

                    explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info": ["number",inputNumberHtml(numberInfo)],"leadsToState":leadsToStateNode}

                    continueExploration.append(explorationState)

    elif(eventNode == "mousemove"):

        width = stylesNode["width"]
        height = stylesNode["height"]

        infoMove = Mousemove(height,width)

        explorationState = {"xpath":xpathNode,"css":idNode,"startingPath":int(startingPathNode),"siblings":siblingsNode,"event":eventNode,"info":infoMove,"leadsToState":leadsToStateNode}
        
        continueExploration.append(explorationState)

    return continueExploration


def ExplorationState(listPaths,allSequences):
    
    for path in listPaths:
        exploration = []
        for transition in path:

            exploration.extend(EventHandle(transition,[]))
        
        allSequences.append(exploration)

#Here we make a preprocessing of the JSON statechart
def statechartPreProcessing(statechart):
    
    newGraph = {}
    for state in statechart:

        #Add a node for each possible state
        newGraph[str(state["stateId"])] = {}

        newGraph[str(state["stateId"])]["visited"] = None
        newGraph[str(state["stateId"])]["transitions"] = []

        #print(state)

        for node in state["ieo"]:

            if(node["leadsToState"]!=-1 and node["event"]!="facsimile_back"):
            #if(node["leadsToState"]!=-1):
                newNode = {}
                
                newNode["id"] = node["nodeSelector"]
                newNode["tag"] = node["tag"]
                newNode["event"] = node["event"]
                newNode["brushable"] = node["brushable"]
                newNode["zoomable"] = node["zoomable"]
                newNode["leadsToState"] = node["leadsToState"]
                newNode["siblings"] = node["siblings"]
                newNode["visited"] = None
                

                if(node["siblings"] != 0):
                 
                    positionXPath = node["nodeXPath"].rfind("[")
                    newNode["xpath"] = node["nodeXPath"][0:positionXPath]
                    newNode["startingPath"] = node["nodeXPath"][positionXPath:][1:-1]

                else:
                    newNode["xpath"] = node["nodeXPath"]
                    newNode["startingPath"] = -1

                if(node["selectValue"]!=None):
                    newNode["selectValue"] = node["selectValue"]

                #Here we add the attributes by preprocessing them
                #So creating a dictionary with as key their name
                #Convert to integer if height or width
                newNode["attributes"] = {}

                if(node["attributes"]!=None):

                    for key in node["attributes"]:
                        
                        if(key["name"] == "height" or key["name"] == "width"):
                        
                            newNode["attributes"][key["name"]] = int(float(key["value"]))
                        
                        else:

                            newNode["attributes"][key["name"]] = key["value"]


                #Same for the styles but we need to remove "px"
                #at the end of the height and with and then convert to integer
                newNode["styles"] = {}
                for key in node["styles"]:
                    
                    if(key["name"] == "height" or key["name"] == "width"):

                        if(key["value"] != "auto"):
                    
                            newNode["styles"][key["name"]] = int(float(key["value"][:len(key["value"])-2]))

                        else:

                            newNode["styles"][key["name"]] = key["value"]

                if(node["data"] == None):
                    newNode["data"] = None
                
                else:

                    newNode["data"] = {}
                    for key in node["data"]:
                        newNode["data"][key["name"]] = key["value"]

                #Add this node to the state
                if(newNode["leadsToState"] == state["stateId"]):
            
                    newGraph[str(state["stateId"])]["transitions"].insert(0,newNode)
                
                else:    
                    
                    newGraph[str(state["stateId"])]["transitions"].append(newNode)



    return newGraph

#Function used to generate the paths for the exploration
def VisitAllEdges(state,exploration):

    print(graph)

    graph[str(state)]["visited"] = 1

    for transition in graph[str(state)]["transitions"]:

        insertPath = True

        if(graph[str(transition["leadsToState"])]["visited"] != 1 and transition["visited"] != 1):
    
            explAux = exploration.copy()

            explAux.append(transition)

            transition["visited"] = 1

            VisitAllEdges(transition["leadsToState"],explAux)

        elif(transition["visited"] != 1):

            explAux = exploration.copy()

            explAux.append(transition)

            transition["visited"] = 1

            for expl in listPaths:
                if SubList(explAux,expl):

                    insertPath = False
    
            if(insertPath):
                listPaths.append(explAux)

    for expl in listPaths:
        if SubList(exploration,expl):

            return
    
    listPaths.append(exploration)

#Function used to check if a sublist is 
#present in a list
def SubList(query, base):
    try:
        l = len(query)
    except TypeError:
        l = 1
        query = type(base)((query,))

    for i in range(len(base)):
        if base[i:i+l] == query:
            return True
    return False

#graph = {}
EventList = []
def configFunction():

    #configuration = open("conf.json")
    #confJSON=json.load(configuration)

    #nameVis = confJSON["name"]
    #repetition = confJSON["repetitions"]

    repetition = 1
    
    #open the statechart json file
    statechart=open('static/js/material/statechart.json')

    #returns the JSON object as a dictionary
    statechartJSON=json.load(statechart)

    print(statechartJSON)

    #Data structure for that will contain the graph
    global graph
    graph = {}
    graph = statechartPreProcessing(statechartJSON)

    print(graph)

    #Save graph on a file
    with open('static/js/material/statechart_final.json', 'w') as fp:
        json.dump(graph, fp,  indent=4)

    explorationGraph = []

    VisitAllEdges("0",[])

    print("Num paths: " + str(len(listPaths)))

    allSequences = []
    ExplorationState(listPaths,allSequences)

    print("Events: ",end="")
    print(EventList)     

    counter_transitions = 0
    counter_self = 0
    self_graph = {}
    back_graph = {}
    for node in graph:
        
        counter_self = 0
        counter_back = 0
        for transition in graph[node]["transitions"]:

            if(transition["visited"] == None):

                counter_transitions +=1

            if(int(transition["leadsToState"]) == int(node)):

                counter_self += 1

            if(int(transition["leadsToState"]) < int(node)):
    
                counter_back += 1
        
        self_graph[node] = counter_self
        back_graph[node] = counter_back

    #Print transitions back
    print("Transitions Back: " + str(counter_back))

    #Print transitions self-loop
    print("Transitions Self-Loops: " + str(counter_self))

    #Save exploration sequence that will be passed to Selenium
    with open('static/js/material/exploration.json', 'w') as fp:
        json.dump(allSequences, fp,  indent=4)

    print("--------------  FINISH  ----------------")


#if(__name__=="__main__"):

#    configFunction()
    