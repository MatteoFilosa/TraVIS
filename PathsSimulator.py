from re import S
from xml.dom.minidom import Element
from matplotlib.style import use
from selenium import webdriver
import time
import random
from random import choice
import json

import selenium
import scipy.interpolate as si
import numpy as np
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.events import EventFiringWebDriver, AbstractEventListener
from selenium.common.exceptions import ElementClickInterceptedException, ElementNotInteractableException
from selenium.webdriver.common.keys import Keys

#According to https://drive.google.com/drive/u/0/folders/1ARGI_CIR3V3FvrhttgFNfXWiIpaFqNeV
latencyLimits = {"click":0, "change":0, "contextmenu":0,"mousedown":0, "mouseup":1, "mouseover":0, "mouseenter":0, "mousemove":0 , "mouseleave":1 , "mouseout":1, "wheel":1, "dbclick":1}
Levels = [(0,200.0),(200.0,2000.0),(2000.0,5000.0),(5000.0,15000.0),15000.0]

def checkLevel(event,value):

    if(value < 0):
        value = 0.0
    
    numRanges = len(Levels)-1
    indexEvent = latencyLimits[event]
    rangeLimit = Levels[indexEvent]

    #print("Level index " + str(indexEvent))
    #print("numRanges " + str(numRanges))
    if(indexEvent != numRanges):
        
        calcolationUp = value - rangeLimit[1]
        calcolationDown = value - rangeLimit[0]

        #print(calcolationUp)
        #print(calcolationDown)
        if(calcolationUp <= 0 and calcolationDown >= 0):
            #print("Returning V")
            return 0

        elif(calcolationDown < 0):

            newIndex = indexEvent
            while(newIndex >=0):

                #print("Inside cycle, new index is " + str(newIndex))
                
                rangeLimit = Levels[newIndex]

                if(newIndex != numRanges):
                    
                    calcolationUp = value - rangeLimit[1]
                    calcolationDown = value - rangeLimit[0]

                    #print("CalcUp " + str(calcolationUp))
                    #print("CalcDown " + str(calcolationDown))
                    if(calcolationUp <= 0 and calcolationDown >= 0):
                        #print("Advatage of level " + str(newIndex - indexEvent))
                        return (newIndex - indexEvent)
                
                newIndex-=1

        elif(calcolationUp > 0):

            newIndex = indexEvent
            while(newIndex <= numRanges):

                #print("Inside cycle, new index is " + str(newIndex))
                
                rangeLimit = Levels[newIndex]

                if(newIndex != numRanges):
                    
                    calcolationUp = value - rangeLimit[1]
                    calcolationDown = value - rangeLimit[0]

                    #print("CalcUp " + str(calcolationUp))
                    #print("CalcDown " + str(calcolationDown))
                    if(calcolationUp <= 0 and calcolationDown >= 0):
                        #print("Violation of level " + str(newIndex - indexEvent))
                        return (newIndex - indexEvent)

                else:

                    #print("Violation of level " + str(numRanges - indexEvent))
                    return(numRanges - indexEvent)
                
                newIndex+=1

    else:

        calcolation =  value - rangeLimit

        if(calcolation > 0):
            return 0

        else:

            newIndex = indexEvent-1
            while(newIndex >=0):

                #print("Inside cycle, new index is " + str(newIndex))
                
                rangeLimit = Levels[newIndex]

                if(newIndex != numRanges):
                    
                    calcolationUp = value - rangeLimit[1]
                    calcolationDown = value - rangeLimit[0]

                    #print("CalcUp " + str(calcolationUp))
                    #print("CalcDown " + str(calcolationDown))
                    if(calcolationUp <= 0 and calcolationDown >= 0):
                        #print("Advantage of level " + str(newIndex - indexEvent))
                        return (newIndex - indexEvent)
                
                newIndex-=1

def GetPixelsBack(width):

    return -width/2

def GetPixelsToMove(width,actionType):

    divisor = None
    if(actionType == "L"):

        divisor = 1/3
    
    elif(actionType == "M"):

        divisor = 1/2

    else:

        divisor = 2/3

    pixels = int(width*divisor)
    return pixels

def PanZoom(zoomInfo,driver):
    
    actionType = zoomInfo[0]

    divisor = None
    if(actionType == "L"):

        divisor = 1/3
    
    elif(actionType == "M"):

        divisor = 1/2

    else:

        divisor = 2/3

    #Retrieve all the information for performing the panning
    height = zoomInfo[1][0]
    width = zoomInfo[1][1]

    xStart = zoomInfo[2][0]
    yStart = zoomInfo[2][1]

    xMove = zoomInfo[3][0]
    yMove = zoomInfo[3][1]

    print("StartingX: " + str(xStart) + " " + "StartingY: " + str(yStart))

    #Here we calculate the space that we have horizontally
    #and vertically in order to perform the panning
    if(xMove == "right"):

        spaceHorizontal = width - xStart
    
    else:

        spaceHorizontal = -xStart

    if(yMove == "down"):

        spaceVertical = height - yStart

    else:

        spaceVertical = -yStart

    print(element.rect)

    actions = ActionChains(driver,duration=1)
    actions.move_to_element_with_offset(element,xStart,yStart).perform()

    actions.click_and_hold()

    listMoveLatency = []

    start = time.time()
    actions.perform()
    end = time.time()

    listMoveLatency.append((end-start)*1000)
    
    moveX = int(spaceHorizontal*divisor)
    moveY = int(spaceVertical*divisor)

    xStart = 0
    yStart = 0
    while(xStart != moveX or yStart != moveY):
        
        if(xStart == moveX):

            if(yStart < moveY):
                yStart+=1
                actions.move_by_offset(0,1)
            else:
                yStart-=1
                actions.move_by_offset(0,-1)

        elif(xStart < moveX):

            if(yStart < moveY):
                yStart+=1
                xStart+=1
                actions.move_by_offset(1,1)
            elif(yStart > moveY):
                yStart-=1
                xStart+=1
                actions.move_by_offset(1,-1)
            else:
                xStart+=1
                actions.move_by_offset(1,0)

        else:

            if(yStart < moveY):
                yStart+=1
                xStart-=1
                actions.move_by_offset(-1,1)
            elif(yStart > moveY):
                yStart-=1
                xStart-=1
                actions.move_by_offset(-1,-1)
            else:
                xStart-=1
                actions.move_by_offset(-1,0)

        start = time.time()
        actions.perform()
        end = time.time()
        listMoveLatency.append((end-start)*1000)

    actions.release()

    start = time.time()
    actions.perform()
    end = time.time()

    listMoveLatency.append((end-start)*1000)

    return listMoveLatency
    
def Zoom(infoInput,driver):
    
    #Check if zoom in or zoom out
    typeZoom = infoInput[0]

    infoInput = infoInput[1]
    actionType = infoInput[0]

    xPoint=infoInput[1][0]
    yPoint=infoInput[1][1]

    print(xPoint,yPoint)

    scrollSize = None

    if(typeZoom == "in"):

        if(actionType == "L"):

            scrollSize = -200

        elif(actionType == "M"):

            scrollSize = -300
        
        else:

            scrollSize = -400
    
    else:

        if(actionType == "L"):
    
            scrollSize = 200

        elif(actionType == "M"):

            scrollSize = 300
        
        else:

            scrollSize = 400

    actions = ActionChains(driver,duration = 0)

    actions.move_to_element(element).perform()

    listWheelLatency = []

    countScroll = 0

    if(scrollSize > 0):

        while(countScroll < scrollSize):
            actions.scroll(xPoint,yPoint,0,10)

            start = time.time()
            actions.perform()
            end = time.time()

            listWheelLatency.append((end-start)*1000)

            countScroll+=10

    else:

        while(countScroll > scrollSize):
            actions.scroll(xPoint,yPoint,0,-10)

            start = time.time()
            actions.perform()
            end = time.time()

            listWheelLatency.append((end-start)*1000)

            countScroll-=10

    return listWheelLatency

def Input(infoInput,driver):
    
    actionType = infoInput[1]

    if(infoInput[0] == "range"):

        tupleInfo = infoInput[2]

        pixelsOffsetBack = GetPixelsBack(tupleInfo[2])

        pixelsOffset = GetPixelsToMove(tupleInfo[2],actionType)

        actions = ActionChains(driver,duration=1)

        actions.move_to_element(element).click_and_hold().release().perform()

        pixelStart = 0
        while(pixelStart>int(pixelsOffsetBack)):
            pixelStart +=-1
            actions.click_and_hold().move_by_offset(-1,0).perform()

        
        actions.click_and_hold()

        pixelStart=0

        listMoveLatency = []

        start = time.time()
        actions.perform()
        end = time.time()

        listMoveLatency.append((end-start)*1000)

        while(pixelStart<int(pixelsOffset)):
            pixelStart+=1
            actions.click_and_hold().move_by_offset(1,0)

            start = time.time()
            actions.perform()
            end = time.time()

            listMoveLatency.append((end-start)*1000)

        actions.release()

        start = time.time()
        actions.perform()
        end = time.time()

        return listMoveLatency

    elif(infoInput[0] == "number"):

        element.clear()

        start = time.time()
        element.send_keys(str(infoInput[1]))
        element.send_keys(Keys.ENTER)
        end = time.time()

    elif(infoInput[0] == "checkbox" or infoInput[0] == "radio"):

        actions = ActionChains(driver,duration = 0)

        actions.move_to_element(element).perform()

        actions.click()
        
        start = time.time()
        actions.perform()
        end = time.time()
    
    return end-start

def Mouseout(driver):

    actions = ActionChains(driver,duration=0)

    actions.move_to_element(element).perform()


    mouseOutElement = driver.find_element(By.CSS_SELECTOR,"body")
    #Move to the 1,1 point of the HTML/BODY
    actions.move_to_element(mouseOutElement)
    
    start = time.time()
    actions.perform()
    end = time.time()

    return (end-start) - timeOut

def Mousemove(infoInput,driver):

    listLatency = []

    if(infoInput!=None):

        offSetWidth = infoInput[0]
        offSetHeight = infoInput[1]

        actions = ActionChains(driver,duration=1)

        actions.move_to_element(element).perform()

        xStart = 0
        yStart = 0
        while(xStart != offSetWidth or yStart != offSetHeight):
            
            if(xStart == offSetWidth):

                if(yStart < offSetHeight):
                    yStart+=1
                    actions.move_by_offset(0,1)
                else:
                    yStart-=1
                    actions.move_by_offset(0,-1)

            elif(xStart < offSetWidth):

                if(yStart < offSetHeight):
                    yStart+=1
                    xStart+=1
                    actions.move_by_offset(1,1)
                elif(yStart > offSetHeight):
                    yStart-=1
                    xStart+=1
                    actions.move_by_offset(1,-1)
                else:
                    xStart+=1
                    actions.move_by_offset(1,0)

            else:

                if(yStart < offSetHeight):
                    yStart+=1
                    xStart-=1
                    actions.move_by_offset(-1,1)
                elif(yStart > offSetHeight):
                    yStart-=1
                    xStart-=1
                    actions.move_by_offset(-1,-1)
                else:
                    xStart-=1
                    actions.move_by_offset(-1,0)

            start = time.time()
            actions.perform()
            end = time.time()
            listLatency.append((end-start)*1000)

    return listLatency

def Mouseover(driver):

    actions = ActionChains(driver)

    #It's like a jump
    actions.move_to_element(element)

    start = time.time()
    actions.perform()
    end = time.time()     

    return (end-start) - 0.250

def Click(clickInfo,driver):

    if(clickInfo == None):

        actions = ActionChains(driver,duration = 0)
        
        actions.move_to_element(element).perform()

        actions.click()

        #Then we perform the click on that element

        try:

            start = time.time()
            element.click()
            end = time.time()
        
        except ElementClickInterceptedException:

            print("Exception")

            start = time.time()
            actions.perform()
            end = time.time()

        except:

            start=0
            end=0
        

    else:

        actions = ActionChains(driver, duration = 0)

        #At first we go on the element
        actions.move_to_element_with_offset(element,clickInfo[0],clickInfo[1]).perform()
        
        actions.click()
        
        #Then we perform the click on that element
        start = time.time()
        actions.perform()
        end = time.time()

    #Return the latency time
    return (end-start)

def ContextClick(clickInfo,driver):
    
    actions = ActionChains(driver, duration = 0)

    if(clickInfo == None):
        
        actions.move_to_element(element).perform()

    else:

        #At first we go on the element
        actions.move_to_element_with_offset(element,clickInfo[0],clickInfo[1]).perform()
        
    
    actions.context_click()

    try:

            #Then we perform the click on that element
            start = time.time()
            actions.perform()
            end = time.time()

    except:

            start=0
            end=0

    #Return the latency time
    return (end-start)

def Brush(infoBrush,driver):
    
    Start = infoBrush[0]
    End = infoBrush[1]

    xStart = Start[0]
    yStart = Start[1]

    xEnd = End[0]
    yEnd = End[1]

    listMoveLatency = []

    actions = ActionChains(driver,duration=1)

    actions.move_to_element_with_offset(element,xStart,yStart).perform()
    
    actions.click_and_hold()
    
    start = time.time()
    actions.perform() 
    end = time.time()

    listMoveLatency.append((end-start)*1000)

    if(xStart != xEnd and yStart != yEnd):

        while(xStart<xEnd and yStart<yEnd):
            xStart+=1
            yStart+=1
            actions.move_by_offset(1,1)

            start = time.time()
            actions.perform()
            end = time.time()
            
            listMoveLatency.append((end-start)*1000)

    #This is the case in which we move only in the "x" direction
    elif(xStart != xEnd and yStart == yEnd):

        while(xStart<xEnd):
            xStart+=1
            actions.move_by_offset(1,0)

            start = time.time()
            actions.perform()
            end = time.time()
            
            listMoveLatency.append((end-start)*1000)

    #Case in which we move only in the "y" direction
    else:
        while(yStart<yEnd):
            yStart+=1
            actions.move_by_offset(0,1)

            start = time.time()
            actions.perform()
            end = time.time()
            
            listMoveLatency.append((end-start)*1000)

    actions.release()
    
    start = time.time()
    actions.perform()
    end = time.time()

    listMoveLatency.append((end-start)*1000)
    #In order to refresh the brush
    #actions.move_to_element_with_offset(element,0,0).click().release().perform()

    return listMoveLatency

def PanBrush(infoPan,driver):

    newBrushAfterPan = infoPan[1]
    infoPan = infoPan[0]

    width = infoPan[4]
    height = infoPan[5]

    xMiddleBrush = infoPan[2]
    yMiddleBrush = infoPan[3]

    actions = ActionChains(driver,duration=1)

    listLatency = []

    element = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.XPATH,pathElement)))

    #actions.move_to_element_with_offset(element,0,0).perform()
    actions.move_to_element_with_offset(element,xMiddleBrush,yMiddleBrush).perform()
    
    actions.click_and_hold()

    start = time.time()
    actions.perform()
    end = time.time()

    listLatency.append((end-start)*1000)

    moveX = infoPan[0]
    moveY = infoPan[1]

    xStart = 0
    yStart = 0
    while(xStart != moveX or yStart != moveY):
        
        if(xStart == moveX):

            if(yStart < moveY):
                yStart+=1
                actions.move_by_offset(0,1)
            else:
                yStart-=1
                actions.move_by_offset(0,-1)

        elif(xStart < moveX):

            if(yStart < moveY):
                yStart+=1
                xStart+=1
                actions.move_by_offset(1,1)
            elif(yStart > moveY):
                yStart-=1
                xStart+=1
                actions.move_by_offset(1,-1)
            else:
                xStart+=1
                actions.move_by_offset(1,0)

        else:

            if(yStart < moveY):
                yStart+=1
                xStart-=1
                actions.move_by_offset(-1,1)
            elif(yStart > moveY):
                yStart-=1
                xStart-=1
                actions.move_by_offset(-1,-1)
            else:
                xStart-=1
                actions.move_by_offset(-1,0)

        start = time.time()
        actions.perform()
        end = time.time()
        listLatency.append((end-start)*1000)


    actions.release()

    start = time.time()
    actions.perform()
    end = time.time()

    listLatency.append((end-start)*1000)

    #print("Panning... " + str(moveX) + " " + str(moveY))

    #This part of the code is useful to cancel the brushed zone and prepare a new brush
    listExcludeX = []
    listExcludeY = []

    for i in range(int(newBrushAfterPan[0][0]),int(newBrushAfterPan[1][0])):
        listExcludeX.append(i)

    for j in range(int(newBrushAfterPan[0][1]),int(newBrushAfterPan[1][1])):
        listExcludeY.append(j)

    element = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.XPATH,pathElement)))

    if(element.rect["x"] < 0):

        if(element.rect["y"] < 0):

            xWhereClick = choice(list(set([x for x in range(-element.rect["x"],int(width))]) - set(listExcludeX)))
            yWhereClick = choice(list(set([x for x in range(-element.rect["y"],int(height))]) - set(listExcludeY)))

        else:

            xWhereClick = choice(list(set([x for x in range(-element.rect["x"],int(width))]) - set(listExcludeX)))
            yWhereClick = choice(list(set([x for x in range(1,int(height))]) - set(listExcludeY)))

    else:

        if(element.rect["y"] < 0):

            xWhereClick = choice(list(set([x for x in range(1,int(width))]) - set(listExcludeX)))
            yWhereClick = choice(list(set([x for x in range(-element.rect["y"],int(height))]) - set(listExcludeY)))

        else:

            xWhereClick = choice(list(set([x for x in range(1,int(width))]) - set(listExcludeX)))
            yWhereClick = choice(list(set([x for x in range(1,int(height))]) - set(listExcludeY)))


    print("X and Y to click: " + str(xWhereClick) + " " + str(yWhereClick))

    actions.move_to_element_with_offset(element,xWhereClick,yWhereClick).click().perform()

    return listLatency

def ResetBrush(infoReset,driver):
    
    actions = ActionChains(driver,duration = 10)

    #Dimension of the brushable area
    widthBrush = infoReset[1][0] - infoReset[0][0]
    heightBrush = infoReset[1][1] - infoReset[0][1]

    actions.move_to_element_with_offset(element,widthBrush,heightBrush/2).click_and_hold().move_by_offset(-widthBrush/2,0).perform()

    actions.move_to_element_with_offset(element,widthBrush*2/3,heightBrush/2).click().perform

def EventHandle(eventName,state,driver,pathNumber,pathElement):

    print("----------ANALYZING " + pathElement + "------------")
    print("----------EVENT : " + str(eventName) + "------------")

    latency = None

    if(eventName == "click"):
    
        latency = Click(state["info"],driver)

    elif(eventName == "change"):

        if(state["info"] == None):

            latency = Click(state["info"],driver)

        else:
                
            latency = Input(state["info"],driver)

    elif(eventName == "contextmenu"):

        latency = ContextClick(state["info"],driver)

    elif(eventName == "mouseover" or eventName == "mouseenter"):

        latency = Mouseover(driver)
    
    elif(eventName == "brush"):

        print("Brush start")

        latency = Brush(state["info"][0],driver)

        #print("STATE: " + xpath + " EVENT: " + "mousedown" + " LATENCY: " + str(latency[1]) + " ms")
        actionSequence.append(["brush mousedown",latency[0]])

        resultLatency = checkLevel("mousedown",latency[0])
        if(resultLatency > 0):
            problemsFound[pathNumber].append(([pathElement,"brush mousedown",state["info"][0],latency[0] , resultLatency]))

        finalSummary[pathNumber].append([pathElement,"brush mousedown",state["info"][0],latency[0] , resultLatency])


        for latencyTime in latency[1:-1]:
            #Convert in milliseconds
            #print("STATE: " + xpath + " EVENT: " + "mousemove" + " LATENCY: " + str(latencyTime) + " ms")
            actionSequence.append(["brush mousemove",latencyTime])

            resultLatency = checkLevel("mousemove",latencyTime)
            if(resultLatency > 0):
                problemsFound[pathNumber].append([pathElement,"brush mousemove",state["info"][0],latencyTime , resultLatency])

            finalSummary[pathNumber].append([pathElement,"brush mousemove",state["info"][0],latencyTime , resultLatency])

        #print("STATE: " + xpath + " EVENT: " + "mouseup" + " LATENCY: " + str(latency[-1]) + " ms")
        actionSequence.append(["brush mouseup",latency[-1]])

        resultLatency = checkLevel("mouseup",latency[-1])
        if(resultLatency > 0):
            problemsFound[pathNumber].append([pathElement,"brush mouseup",state["info"][0],latency[-1] , resultLatency])

        finalSummary[pathNumber].append([pathElement,"brush mouseup",state["info"][0],latency[-1] , resultLatency])

        '''
        print("Pan start")

        latency = PanBrush(state["info"][1],driver)

        #print("STATE: " + xpath + " EVENT: " + "mousedown" + " LATENCY: " + str(latency[1]) + " ms")
        actionSequence.append(["panbrush mousedown",latency[0]])

        resultLatency = checkLevel("mousedown",latency[0])
        if(resultLatency > 0):
            problemsFound[pathNumber].append(([pathElement,"panbrush mousedown",state["info"][1],latency[0] , resultLatency]))

        finalSummary[pathNumber].append([pathElement,"panbrush mousedown",state["info"][1],latency[0] , resultLatency])


        for latencyTime in latency[1:-1]:
            #Convert in milliseconds
            #print("STATE: " + xpath + " EVENT: " + "mousemove" + " LATENCY: " + str(latencyTime) + " ms")
            actionSequence.append(["panbrush mousemove",latencyTime])

            resultLatency = checkLevel("mousemove",latencyTime)
            if(resultLatency > 0):
                problemsFound[pathNumber].append([pathElement,"panbrush mousemove",state["info"][1],latencyTime , resultLatency])

            finalSummary[pathNumber].append([pathElement,"panbrush mousemove",state["info"][1],latencyTime , resultLatency])

        #print("STATE: " + xpath + " EVENT: " + "mouseup" + " LATENCY: " + str(latency[-1]) + " ms")
        actionSequence.append(["panbrush mouseup",latency[-1]])

        resultLatency = checkLevel("mouseup",latency[-1])
        if(resultLatency > 0):
            problemsFound[pathNumber].append([pathElement,"panbrush mouseup",state["info"][1],latency[-1] , resultLatency])

        finalSummary[pathNumber].append([pathElement,"panbrush mouseup",state["info"][1],latency[-1] , resultLatency])

    elif(eventName == "panzoom"):

        latency = PanZoom(state["info"],driver)

        #print("STATE: " + xpath + " EVENT: " + "mousedown" + " LATENCY: " + str(latency[1]) + " ms")
        actionSequence.append(["panzoom mousedown",latency[0]])

        resultLatency = checkLevel("mousedown",latency[0])
        if(resultLatency > 0):
            problemsFound[pathNumber].append([pathElement,"panzoom mousedown",state["info"][1],latency[0] , resultLatency])

        finalSummary[pathNumber].append([pathElement,"panzoom mousedown",state["info"][1],latency[0] , resultLatency])


        for latencyTime in latency[1:-1]:
            #Convert in milliseconds
            #print("STATE: " + xpath + " EVENT: " + "mousemove" + " LATENCY: " + str(latencyTime) + " ms")
            actionSequence.append(["panzoom mousemove",latencyTime])

            resultLatency = checkLevel("mousemove",latencyTime)
            if(resultLatency > 0):
                problemsFound[pathNumber].append([pathElement,"panzoom mousemove",state["info"][1],latencyTime , resultLatency])

            finalSummary[pathNumber].append([pathElement,"panzoom mousemove",state["info"][1],latencyTime , resultLatency])

        #print("STATE: " + xpath + " EVENT: " + "mouseup" + " LATENCY: " + str(latency[-1]) + " ms")
        actionSequence.append(["panzoom mouseup",latency[-1]])

        resultLatency = checkLevel("mouseup",latency[-1])
        if(resultLatency > 0):
            problemsFound[pathNumber].append([pathElement,"panzoom mouseup",state["info"][1],latency[-1] , resultLatency])

        finalSummary[pathNumber].append([pathElement,"panzoom mouseup",state["info"][1],latency[-1] , resultLatency])

    '''
        
    elif(eventName == "wheel"):

        latency = Zoom(state["info"],driver)

        for latencyTime in latency:
    
            #print("STATE: " + xpath + " EVENT: " + "mousemove" + " LATENCY: " + str(latencyTime) + " ms")
            actionSequence.append([eventName,latencyTime])

            resultLatency = checkLevel(eventName,latencyTime)
            if(resultLatency > 0):
                problemsFound[pathNumber].append([pathElement,eventName,state["info"],latencyTime , resultLatency])

            finalSummary[pathNumber].append([pathElement,eventName,state["info"],latencyTime , resultLatency])

    elif(eventName == "mouseout" or eventName == "mouseleave"):

        latency = Mouseout(driver)

    elif(eventName == "input"):

        latency = Input(state["info"],driver)

        if(type(latency) is list):
    
            #print("STATE: " + xpath + " EVENT: " + "mousedown" + " LATENCY: " + str(latency[1]) + " ms")
            actionSequence.append(["slider mousedown",latency[0]])

            resultLatency = checkLevel("mousedown",latency[0])
            if(resultLatency > 0):
                problemsFound[pathNumber].append([pathElement,"slider mousedown",state["info"],latency[0] , resultLatency])
            finalSummary[pathNumber].append([pathElement,"slider mousedown",state["info"],latency[0] , resultLatency])


            for latencyTime in latency[1:-1]:
                #Convert in milliseconds
                #print("STATE: " + xpath + " EVENT: " + "mousemove" + " LATENCY: " + str(latencyTime) + " ms")
                actionSequence.append(["slider mousemove",latencyTime])

                resultLatency = checkLevel("mousemove",latencyTime)
                if(resultLatency > 0):
                    problemsFound[pathNumber].append([pathElement,"slider mousemove",state["info"],latencyTime , resultLatency])

                finalSummary[pathNumber].append([pathElement,"slider mousemove",state["info"],latencyTime , resultLatency])

            #print("STATE: " + xpath + " EVENT: " + "mouseup" + " LATENCY: " + str(latency[-1]) + " ms")
            actionSequence.append(["slider mouseup",latency[-1]])

            resultLatency = checkLevel("mouseup",latency[-1])
            if(resultLatency > 0):
                problemsFound[pathNumber].append([pathElement,"slider mouseup",state["info"],latency[-1] , resultLatency])

            finalSummary[pathNumber].append([pathElement,"slider mouseup",state["info"],latency[-1] , resultLatency])

    elif(eventName == "mousemove"):

        latency = Mousemove(state["info"],driver)

        for responseTime in latency:
    
            #print("STATE: " + xpath + " EVENT: " + eventName + " LATENCY: " + str(responseTime) + " ms")
            actionSequence.append([eventName,responseTime])

            resultLatency = checkLevel(eventName,responseTime)
            if(resultLatency > 0):
                problemsFound[pathNumber].append([pathElement,eventName,state["info"],responseTime, resultLatency])
            finalSummary[pathNumber].append([pathElement,eventName,state["info"],responseTime, resultLatency])


    elif(eventName == "reset_brush"):
    
        ResetBrush(state["info"],driver)

    if(latency != None):

        if(type(latency) is not list):

            #Convert in milliseconds
            latency = latency * 1000
            
            #print("STATE: " + xpath + " EVENT: " + eventName + " LATENCY: " + str(latency) + " ms")
            actionSequence.append([eventName,latency])

            resultLatency = checkLevel(eventName,latency)
            if(resultLatency > 0):
                problemsFound[pathNumber].append([pathElement,eventName,state["info"],latency, resultLatency])
            finalSummary[pathNumber].append([pathElement,eventName,state["info"],latency, resultLatency])
            
    else:

        #print("STATE: " + xpath + " EVENT: " + eventName + " LATENCY: None")
        actionSequence.append([eventName,latency])



actionSequence = []
finalSummary = {}
problemsFound =  {}
element = None
pathElement = ""
currentState = -1
currentEdge = "E-1"

'''
    Global variable indicating the replay state.
    It can only have these values:
    "stop"
    "pause"
    "play"
    "step"
'''
replayState = "play"



# Function that changes the color of the replay path.
def changeStateChartColors(transition, replayJson, driver):
    global currentState
    global currentEdge

    # We will add here the scripts to execute on the inputted driver.
    totalScript = ""

    # We are in the first ever transition. 'currentState' is 0 and we only need to find the 'currentEdge'.
    if -1 == currentState and "E-1" == currentEdge:
        print("ANCORA PRIMA: "  + currentEdge + ", " + str(currentState))
        currentState = 0

        for edge in replayJson:
            if (
                ( replayJson[edge]["from_node"] == currentState )        and 
                ( replayJson[edge]["event"]     == transition["event"] ) and 
                ( replayJson[edge]["xpath"]     == transition["xpath"] )
            ):
                currentEdge = edge
                print("PRIMA: " + currentEdge + ", " + str(currentState))
                break

    # In any other transition we compute the new 'currentState' and 'currentEdge', after having filled the old
    # ones in blue.
    else:
        totalScript += "document.querySelector('#originalSVG #svg_node_id_" + str(currentState) + "').style.fill = 'rgb(0, 0, 255)'; document.querySelector('#originalSVG #svg_edge_id_" + currentEdge + "').style.fill = 'rgb(0, 0, 255)'; "

        for edge in replayJson:
            if (
                ( replayJson[edge]["from_node"] == currentState )        and 
                ( replayJson[edge]["event"]     == transition["event"] ) and 
                ( replayJson[edge]["xpath"]     == transition["xpath"] )
            ):
                currentState = replayJson[edge]["to_node"]
                currentEdge = edge
                break

    print("SECONDA: " + currentEdge + ", " + str(currentState))

    # The current transition is filled in red and the whole script is executed.
    totalScript += "document.querySelector('#originalSVG #svg_node_id_" + str(currentState) + "').style.fill = 'rgb(255, 0, 0)'; document.querySelector('#originalSVG #svg_edge_id_" + currentEdge + "').style.fill = 'rgb(255, 0, 0)';"
    driver.execute_script(totalScript)



# The main container.
def pathsSimulatorContainer(explorationSequence, replayJson):

    global element
    global actionSequence
    global finalSummary
    global problemsFound
    global pathElement
    global timeOut
    global replayState
    replayState = "play"
    global currentState
    currentState = -1
    global currentEdge
    currentEdge = "E-1"

    nameVis = "Falcon"

    pathNumber = 0

    finalSummary[pathNumber] = []
    problemsFound[pathNumber] = []

    #open the statechart json file
    #explorationSequence = open('./static/js/material/exploration_user.json')
    #explorationSequence = open('user_trace_flights.json')

    #returns the JSON object as a dictionary
    explorationSequence = json.loads(explorationSequence)

    #driver = webdriver.Firefox(service=FirefoxService(GeckoDriverManager().install()))
    options = webdriver.ChromeOptions()
    options.add_argument('ignore-certificate-errors')
    options.add_argument('--ignore-ssl-errors')
    driver = webdriver.Chrome(executable_path='C:\Webdriver\chromedriver.exe', chrome_options=options)
    #driver = webdriver.Chrome(executable_path='/home/user/Scrivania/paper/Webdriver/chromedriver')

    try:

        #system_url_file = open("./static/js/material/system_url.txt", "r")
        #urlVis = system_url_file.read()
        #system_url_file.close()

        driver.maximize_window()
        driver.get("http://127.0.0.1:5000/home")

        script = "localStorage.setItem('selectedTrace', '[]');"
        driver.execute_script(script)
        driver.refresh()

        iframe = driver.find_element(By.ID, "website")
        driver.switch_to.frame(iframe)

    except Exception as e:

        print("URL NOT REACHABLE")
        print(e)
        driver.close()
        exit

    else:

        originalWindow = driver.current_window_handle

        time.sleep(10)

        for transition in explorationSequence:
            # TODO - COLORAZIONE SVG  
            # Here we handle the changing colors of the replay SVG.
            #if(len(driver.window_handles) != 1):
            #    driver.switch_to.window(originalWindow) 
            driver.switch_to.default_content()
            changeStateChartColors(transition, replayJson, driver)
            driver.switch_to.frame(iframe)

            # Here we handle the replay state.
            # We close and return in case of "stop", we wait in case of "pause", we continue in case of "play"
            # and we move forward of one transition in case of "step".
            print("Replay state: " + replayState)
            while replayState == "pause": pass
            if replayState == "stop":
                driver.close()
                return
            elif replayState == "step":
                replayState = "pause"

            time.sleep(0.5)

            mouseOutElement = driver.find_element(By.CSS_SELECTOR,"body")
            actions = ActionChains(driver,duration = 0)

            actions.move_to_element(mouseOutElement)

            start = time.time()
            actions.perform()
            end = time.time()

            timeOut = end-start


            xpath = transition["xpath"]
            event = transition["event"]

            pathElement = xpath

            try:

                element = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.XPATH,pathElement)))

            except Exception as e:

                    print(e)
                    print("Element not found: " + pathElement)

            else:

                #try:

                if(element.rect["width"] == 0 and element.rect["height"] == 0):

                    print("Element not interactable")

                else:

                    visible = driver.execute_script("var rect = arguments[0].getBoundingClientRect(); "+
                        "return (rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && " +
                        "rect.right <= (window.innerWidth || document.documentElement.clientWidth))",element)

                    if not visible:

                        driver.execute_script("arguments[0].scrollIntoView(true);", element)

                    eventName = event

                    EventHandle(eventName,transition,driver,pathNumber,pathElement)

                #except Exception as e:

                #    print("Exception Found: ",end="")
                #    print(e)

            print("-------------------------------------------------------")


        driver.close()

        with open('userTraceSummary_' + nameVis + '.json', 'w') as fp:
            json.dump(finalSummary, fp,  indent=4)

        #print(actionSequence)
        print("Problems found :",end="")
        print(problemsFound)

        with open('userTraceSummaryProblems_' + nameVis + '.json', 'w') as fp:
            json.dump(problemsFound, fp,  indent=4)



# Function to change the replayState value.
def PathSimulator_changeReplayState(newState):
    global replayState
    if ((newState != "stop") and (newState != "pause") and (newState != "play") and (newState != "step")):
        newState = "stop"
        print("ERROR: INVALID 'changeReplayState' INPUT! STATE SET TO STOP!")
    replayState = newState
    print("Replay state changed: " + replayState)
