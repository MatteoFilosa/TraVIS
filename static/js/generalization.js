// REQUIRED MODULES

// For using a fictitious Chromium browser
const puppeteer = require('puppeteer');

// For reading from and writing on a file
const fs = require('fs');

// For checking if two urls are from the same origin
const isSameOrigin = require('is-same-origin');

/*
-------------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------------
*/

// GLOBAL VARIABLES

// Url of the system we will explore (this is a sample one, the real one is passed with a configuration file)
let VIS_URL = 'https://example.com/';

// List of html events to NOT consider in our framework
let excluded_events = [];

/*
  List of objects {id, ieo, where} for each different info events object that was found ('ieo').
  'id' is a unique integer, with 0 signaling the initial rest state.
  'where' is a list (initially empty) of objects {nodeSelector, nodeXPath, event, eventFunction} that signals the state 
  was reached by enter_over or keydown events on those selectors in that order. If we come across a leave_out or keyup event 
  for one of those selectors, we need to look for a state that does not have the states from that point onward in the list
*/
let states = [];

// Integer identifier that indicates the next available id for new objects to be added inside 'states'
// Each time we add a new object inside 'states' this variable must be incremented
let statesNextId = 0;

/*
-------------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------------
*/

// HELPER FUNCTIONS



// This function is needed to wait for the complete loading of the page
async function waitTillHTMLRendered(page, timeout = 30000) {
  console.log("Waiting for page rendering...");

  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while(checkCounts++ <= maxChecks){
    let html = await page.content();
    let currentHTMLSize = html.length; 

    let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
    console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

    if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
      countStableSizeIterations++;
    else 
      countStableSizeIterations = 0; //reset the counter

    if(countStableSizeIterations >= minStableSizeIterations) {
      console.log("Page rendered fully!\n");
      break;
    }

    lastHTMLSize = currentHTMLSize;

    // Substituded deprecated 'waitFor' with 'waitForTimeout'
    await page.waitForTimeout(checkDurationMsecs);
  }  
};



/*
  Given a Chrome Devtools Protocol session on a given Puppeteer browser page, we can navigate the web system from remote 
  and retrieve the list of objects corresponding to its current elements listeners

  More precisely each object contains the following elements:
  - nodeSelector:   The selector for the current node, derived by the four fields below
  - nodeXPath:      String of the element current xpath

  - tag:            String of the element tag name
  - id:             String of the element id (null if absent)
  - class:          List of the strings of the element classes (null if no class is there)
  - parents:        List of objects {tag, id, class, hidden, visibility, display, clipPath, transform} for each 
                    container node going outwards from the current one, stopping right before the 'body' tag (null if no 
                    eligible one is there)

  - attributes:     List of objects {name, value} for each element attribute (excluded 'id', 'class' and 'style')
  - styles:         List of objects {name, value} for each element style (including default ones though)
  - data:           List of objects {name, value} for each element attached data (null if there is none)

  - isModalOpen:    Boolean indicating if there is currently an open modal
  - toggleOpen:     Boolean indicating if the element is an open toggle (null if the element is not a toggle at all)
  - selectValue:    Value for the currently considered select option (null if it is not a select)

  - event:          String of the currently considered event of the element
  - eventFunction:  String of the function triggered by the aforementioned event
  - brushable:      Object {handles, directions, brush_extent, selection_extent} with brush informations (null if the event is 
                    not brush-related)
  - zoomable:       Object {scale, translate_x, translate_y} with zoom informations (null if the event is not zoom-related)
  - draggable:      Boolean indicating wheter the element is draggable or not
  - leadsToState:   Integer indicating to which state triggering this event will bring you, with respect to the ids used in the
                    states global list, or -1 if the event cannot be triggered there (at first they are all initialized to -1)

  - siblings:       Number of those excluded elements that share with the current one the same 'tag', 'parents',
                    'event' and 'eventFunction' (0 if there is none)
*/
async function getInfoEvents(client) {
  /*
    We take all the DOM elements, with the exception of the following ones 
    (either linked to the head, scripts, styles, context or deprecated):

    - acronym
    - applet
    - base
    - basefont
    - big
    - br
    - center
    - dir
    - font
    - frame
    - frameset
    - head
    - html
    - link
    - meta
    - noframe
    - noscript
    - script
    - strike
    - style
    - title
    - tt
    - wbr
  */
  let notTags = ":not(acronym,applet,base,basefont,big,br,center,dir,font,frame,frameset,head,html,link,meta,noframe,noscript,script,strike,style,title,tt,wbr)";

  const allElements = (
    await client.send(
      'Runtime.evaluate', 
      {
        // Expression to be be evaluated on the CDP session
        expression: `document.querySelectorAll("*${notTags}");`
      }
    )
  ).result;
  
  // Number of all taken DOM elements
  const allElementsLength = (
    await client.send(
      'Runtime.evaluate', 
      {
        // Expression to be be evaluated on the CDP session
        expression: `document.querySelectorAll("*${notTags}").length;`
      }
    )
  ).result.value;

  console.log("About to explore " + allElementsLength + " elements...");

  // Inside this array we will store all the retrieved elements for the given web based application
  let retrievedElements = [];


  // Let's scan through all the DOM elements looking for those with events listeners
  for(let allElementsIndex=0; allElementsIndex<allElementsLength; allElementsIndex++) {
    //console.log("Exploration number " + allElementsIndex + "...");


    // Let's take the currently considered element
    let currentElement = (
      await client.send(
        'Runtime.callFunctionOn', 
        {
          // String of the function declaration to be called on the CDP session
          functionDeclaration: `
            function() {
                return this[${allElementsIndex}];
            }
          `, 

          // Puppeteer identifier for the element on which to call the function                                         
          objectId: allElements.objectId,  

          // This way it will also include functions in the result of those calling this element
          objectGroup: 'provided'             
        }
      )
    ).result;
  

    // Let's take the list of event listeners for the current element
    let currentElementListeners = (
      await client.send(
        'DOMDebugger.getEventListeners', 
        {
          // Puppeteer identifier for the element on which to call the function
          objectId: currentElement.objectId  
        }
      )
    ).listeners;


    // To check wheter the current element is linked to a modal opening/closure or a custom select button, 
    // we check for the presence of attributes "data-toggle" and "data-dismiss".
    // We also check if it is an anchor tag, as they should be treated the same way.
    let hasDataDismissToggleAnchor = (
      await client.send(
        'Runtime.callFunctionOn', 
        {
          // String of the function declaration to be called on the CDP session
          functionDeclaration: `
            function dataDismissToggle() {
              return (
                this.hasAttribute("data-dismiss") || 
                this.hasAttribute("data-toggle")  ||
                this.localName == "a"
              );
            }
          `,

          // Puppeteer identifier for the element on which to call the function
          objectId: currentElement.objectId,

          // The result is returned within an object {type, value}
          returnByValue: true 
        }
      )
    ).result.value;


    // The element has no listener or modal attached to it, so we skip it
    if(currentElementListeners.length == 0 && !hasDataDismissToggleAnchor) {
      continue;
    }


    /*
      We create a new list of objects {event, eventFunction} with the strings for the event name and handler 
      for each listener attached to the current element.
      If the element is is attached to a modal opening/closure or custom select button and there is not already 
      a click event for it, then we add a single fictitious click event (where the eventFunction is the index of the
      current element, so they won't become siblings of each other).
    */
    let realCurrentElementListeners = [];
    let hasClickEvent = false;

    for(let cel_index=0; cel_index<currentElementListeners.length; cel_index++) {
      let evnt = currentElementListeners[cel_index].type;
      if(evnt == "click") {
        hasClickEvent = true;
      }

      realCurrentElementListeners.push({
        "event":          evnt,
        "eventFunction":  currentElementListeners[cel_index].handler.description.replace(/\s+/g, "")
      });
    }

    if(hasDataDismissToggleAnchor && !hasClickEvent) {
      realCurrentElementListeners.push({
        "event":          "click",
        "eventFunction":  `${allElementsIndex}`,
      });
    }


    // We retrieve a list of objects wih the context informations for the current element
    // There will be more than element only in the case of a "change" event
    // On the function declaration above there's more infos about the returned object
    let currentElementContextObject = (
      await client.send(
        'Runtime.callFunctionOn', 
        {
          // String of the function declaration to be called on the CDP session
          functionDeclaration: getCurrentElementContextInfos.toString(),

          // Puppeteer identifier for the element on which to call the function
          objectId: currentElement.objectId,

          // The result is returned within an object {type, value}
          returnByValue: true 
        }
      )
    ).result;


    // Let's scan through the context objects to find the corresponding events one and then unify them both
    for(let cecoi=0; cecoi<currentElementContextObject.value.length; cecoi++) {
      // We take one element at the time
      let cec_obj = currentElementContextObject.value[cecoi];

      // We retrieve an object wih the events informations for the current element
      // On the function declaration above there's more infos about the returned object
      let currentElementEventsObject = (
        await client.send(
          'Runtime.callFunctionOn', 
          {
            // String of the function declaration to be called on the CDP session
            functionDeclaration: getCurrentElementEventsInfos.toString(),

            // Ordered list of the arguments to pass to the function above
            arguments: [
              { value: realCurrentElementListeners }, // realListeners
              { value: retrievedElements },           // elements
              { value: cec_obj.parents },             // parents
              { value: cec_obj.attributes },          // attributes
              { value: excluded_events },             // excl_events
              { value: cec_obj.nodeXPath }            // nodeXPath
            ],

            // Puppeteer identifier for the element on which to call the function
            objectId: currentElement.objectId,

            // The result is returned within an object {type, value}
            returnByValue: true
          }
        )
      ).result;


      // We need to handle the case of range sliders handles, so we need to re-instantiate the current element 
      // attributes just in case
      cec_obj.attributes = currentElementEventsObject.value[1];

      // For the same reason as before, we also re-instantiate the attributes of the other already retrieved 
      // elements that were recognized as range sliders handles
      let ceeo_v2 = currentElementEventsObject.value[2];
      for(let L=0; L<ceeo_v2.length; L++) {
        retrievedElements[ceeo_v2[L].id].attributes = ceeo_v2[L].attr;
      }


      // We now handle the case in which there were elements excluded because too similar to a previous one
      // We must increment the 'siblings' field of the similar previous one
      let ceeo_v3 = currentElementEventsObject.value[3];
      let ceeo_v4 = currentElementEventsObject.value[4];
      for(let S=0; S<ceeo_v3.length; S++) {
        retrievedElements[ ceeo_v3[S] ].siblings += ceeo_v4[S];
      }


      // We can now push inside the resulting list the objects relative to the current element events.
      // In order to do so, we scan through the list of events attached on the current element and unify its infomations
      // with the context ones we found before, addind the node selector too.
      for(let l=0; l<currentElementEventsObject.value[0].length; l++) {
        retrievedElements.push({
          "nodeSelector": getNodeSelector(cec_obj),
          ...cec_obj,
          ...currentElementEventsObject.value[0][l]
        });
      }
    }
  }


  console.log("All " + allElementsLength + " elements were explored!\n");

  // Let's return the retrieved elements
  return retrievedElements;
};



/*
  The function to call on each current element to retrieve the needed context informations

  More precisely it returns an object containing the following elements:
  - nodeXPath:      String of the element current xpath

  - tag:            String of the element tag name
  - id:             String of the element id (null if absent)
  - class:          List of the strings of the element classes (null if no class is there)
  - parents:        List of objects {nodeXPath, tag, id, class, hidden, visibility, display, clipPath, transform} for each 
                    container node going outwards from the current one, stopping right before the 'body' tag (null if no 
                    eligible one is there)

  - attributes:     List of objects {name, value} for each element attribute (excluded 'id', 'class' and 'style')
  - styles:         List of objects {name, value} for each element style (including default ones though)
  - data:           List of objects {name, value} for each element attached data (null if there is none)

  - isModalOpen:    Boolean indicating if there is currently an open modal
  - toggleOpen:     Boolean indicating if the element is an open toggle (null if the element is not a toggle at all)
  - selectValue:    Value for the currently considered select option (null if it is not a select)

  - siblings:       Number of those excluded elements that share with the current one the same 'tag', 'parents',
                    'event' and 'eventFunction' (0 if there is none)
*/
const getCurrentElementContextInfos = function () {
  // Set the current element node
  let currentElement = this;


  // A flag indicating if the current element is a role listbox
  let isListbox = false;

  // Some flags indicating if the current element is a data-toggle dropdown/tab
  let isDataToggleDropdown = false;
  let isDataToggleTab = false;

  // List of objects for all the current element attributes
  let currentElements_attributes = currentElement.attributes;

  // Here we will save the attributes, id and classes of the current element
  let attributes = [];
  let currentElement_id = null;
  let currentElement_classes = null;

  // Let's scan through the attributes
  for(let t=0; t<currentElements_attributes.length; t++) {
    let name = currentElements_attributes[t].name;
    let value = currentElements_attributes[t].value;

    // Let's take the id of the current element (stays null if absent)
    if(name == "id") {
      currentElement_id = value;
    }

    // Let's take the list of the current element classes (stays null if no classes are present)
    else if(name == "class") {
      currentElement_classes = value.split(" ");

      currentElement_classes = currentElement_classes.filter( function(word) {
        return !(/^\s*$/g.test(word));
      });

      // If we encounter the dropdown-item class, then we need to find the parent' siblings which has the information
      // about the expanded state of this select toggle
      if(currentElement_classes.includes("dropdown-item")) {
        let optionParent = currentElement.parentNode;
            
        // We do not know the number of parents, so we go on until body
        while(optionParent.localName != "body") {
          let optionParentSibling = optionParent.previousElementSibling;

          if(optionParentSibling != null && optionParentSibling.getAttribute("data-toggle") == "dropdown") {
            let ariaExpanded = optionParentSibling.getAttribute("aria-expanded");
    
            attributes.push({
              "name":  "aria-expanded_parent",
              "value": ((ariaExpanded == null) ? "false" : ariaExpanded)
            });
    
            break;
          }
    
          optionParent = optionParent.parentNode;
        }
      }

      if(currentElement_classes.length == 0) {
        currentElement_classes = null;
      }
    }

    // In case of radio buttons we also need to add a 'selected' attribute
    else if(name=="type" && value=="radio") {
      attributes.push({
        "name":  name,
        "value": value
      });

      attributes.push({
        "name":  "selected",
        "value": currentElement.checked
      });
    }

    // In case of empty string 'disabled' and 'hidden' we need to set them to true
    else if((name=="disabled" || name=="hidden") && value=="") {
      attributes.push({
        "name":  name,
        "value": true
      });
    }

    // For any other attribute, that is also not 'style', we take its name and value
    else if(name != "style") {
      // Could be useful in specific input types
      if(name == "value") {
        value = currentElement.value;
      }

      // Could be useful in specific roles
      else if(name == "role") {
        // Set the role listbox flag
        if(value == "listbox") {
          isListbox = true;
        }

        // If the element is a role tabpanel, we need to know if its tab is expanded or not
        if(value == "tabpanel") {
          let myTabElem = document.querySelector(`[href='#${currentElement_id}'][data-toggle='tab'],[data-target='#${currentElement_id}'][data-toggle='tab']`);
          let ariaExpanded = (
            myTabElem.classList.contains("active")             ||
            myTabElem.parentNode.classList.contains("active")
          ).toString();

          attributes.push({
            "name":  "aria-expanded_tab",
            "value": ((ariaExpanded == null) ? "false" : ariaExpanded)
          });
        }

        // If the element is a role option, we need to know if its role listbox parent is expanded or not
        else if(value == "option") {
          let optionParent = currentElement.parentNode;
        
          // We do not know the number of parents, so we go on until body
          while(optionParent.localName != "body") {
            if(optionParent.getAttribute("role") == "listbox") {
              let ariaExpanded = optionParent.getAttribute("aria-expanded");

              attributes.push({
                "name":  "aria-expanded_parent",
                "value": ((ariaExpanded == null) ? "false" : ariaExpanded)
              });

              break;
            }

            optionParent = optionParent.parentNode;
          }
        }
      }

      // Set the data-toggle dropdown/tag flag
      else if(name == "data-toggle") {
        if(value == "dropdown") {
          isDataToggleDropdown = true;
        }

        else if(value == "tab") {
          isDataToggleTab = true;
        }
      }

      attributes.push({
        "name":  name,
        "value": value
      });
    }
  }

  // If no attribute (outisde 'id', 'class' or 'style') was found, the list stays null
  if(attributes.length == 0) {
    attributes = null;
  }


  // In the case of tag 'select' we want to save its options values and a boolean indicating which one is selected and a 
  // boolean indicating which one is disabled, using an array of objects {value, selected, disabled} to be later put inside 
  // attributes separately.
  // We need to check for them separately with a loop since they are stored like array values instead of normal attributes.
  let selectList = [];

  // In the case of tag 'details' instead, we want to save separately its boolean 'open' value as well, indicating if
  // the toggle is open or not (null if the element is not a toggle at all)
  let toggleOpen = null;

  if(currentElement.localName == "select") {
    let currentSelectValueIndex = 0;
    let currentSelectValue = currentElement[currentSelectValueIndex];
    
    // We do not know the number of options, so we go on until undefined
    while(currentSelectValue != undefined) {
      selectList.push({
          "value":    currentSelectValue.value,
          "selected": currentSelectValue.selected,
          "disabled": currentSelectValue.disabled
      });

      currentSelectValueIndex++;
      currentSelectValue = currentElement[currentSelectValueIndex];
    }
  }

  else if(currentElement.localName == "details") {
    toggleOpen = currentElement.open;
  }

  // If the current element is a role listbox or a data-toggle dropdown then we save its aria-expanded 
  // value inside the selectValue field. For rare cases of the latter case we also take a "disabled" field.
  else if(isListbox || isDataToggleDropdown) {
    let ariaExpanded = currentElement.getAttribute("aria-expanded");

    selectList.push({
      "name":     "aria-expanded",
      "value":    ((ariaExpanded == null) ? "false" : ariaExpanded),
      "disabled": (currentElement_classes != null && currentElement_classes.includes("disabled"))
    });
  }

  // Else if the current element is a data-toggle tab then we save its parent activeness
  // inside the selectValue field. For rare cases of the latter case we also take a "disabled" field.
  else if(isDataToggleTab) {
    let ariaExpanded = (
      currentElement.classList.contains("active")             ||
      currentElement.parentNode.classList.contains("active")
    ).toString();

    selectList.push({
      "name":     "aria-expanded",
      "value":    ((ariaExpanded == null) ? "false" : ariaExpanded),
      "disabled": (currentElement_classes != null && currentElement_classes.includes("disabled"))
    });
  }


  // List of objects for all the current element styles
  let currentElement_style = getComputedStyle(currentElement);

  // Here we will save the styles of the current element
  let styles = [];

  // Let's scan through the styles
  for(let u=0; u<currentElement_style.length; u++) {
    let style_name = currentElement_style[u];

    // For any style we take its name and value
    styles.push({
      "name":  style_name,
      "value": currentElement_style[style_name]
    })
  }

  // If no style was found, the list stays null
  // This should actually be impossible for how 'getComputedStyle(currentElement)' works, but it is better to have it
  if(styles.length == 0) {
    styles = null;
  }

    
  // We take the names of the current element associated data
  let data_keys = [];
  if(currentElement.__data__ != undefined) {
    data_keys = Object.keys(currentElement.__data__);
  }
  
  // Here we will save the associated data of the current element
  // If no data is found, the list stays null
  let data_list = null;

  if(data_keys.length != 0) {
    data_list = [];
    let data_values = Object.values(currentElement.__data__);

    // For all the found data we take the name and value
    // The former is a string, but the latter can be anything, even another object
    for(let v=0; v<data_keys.length; v++) {
      // In some cases they put reference to children and parent nodes data, but that can lead to circular references
      // There are also other data attributes that are used for lots of data but not useful here
      if(
        data_keys[v] == "dataFeature"       ||
        data_keys[v] == "partialDependence" ||
        data_keys[v] == "tuples"            ||
        data_keys[v] == "data"              ||
        data_keys[v] == "children"          || 
        data_keys[v] == "parent"            ||
        data_keys[v] == "topChannels"       ||
        data_keys[v] == "embed"             ||
        data_keys[v] == "accs"              ||
        data_keys[v] == "events"            ||
        data_keys[v] == "time"
      ) {
        continue;
      }

      data_list.push({
        "name":  data_keys[v],
        "value": data_values[v]
      });
    }
  }

  // If __data__ is present but it is not an object
  else if(currentElement.__data__ != undefined) {
    data_list = [];
    data_list.push({
      "name":  "value",
      "value": currentElement.__data__
    });
  }


  // We will use this function to retrieve the current xpath of the element we pass to it
  const getAbsoluteXPath = function (element) {
    var comp, comps = [];
    var parent = null;
    var xpath = '';
    var getPos = function(element) {
        var position = 1,
            curNode;
        if (element.nodeType == Node.ATTRIBUTE_NODE) {
            return null;
        }
        for (curNode = element.previousSibling; curNode; curNode = curNode.previousSibling) {
            if (curNode.nodeName == element.nodeName) {
                ++position;
            }
        }
        return position;
    };

    if (element instanceof Document) {
        return '/';
    }

    for (; element && !(element instanceof Document); element = element.nodeType == Node.ATTRIBUTE_NODE ? element.ownerElement : element.parentNode) {
        comp = comps[comps.length] = {};
        switch (element.nodeType) {
            case Node.TEXT_NODE:
                comp.name = 'text()';
                break;
            case Node.ATTRIBUTE_NODE:
                comp.name = '@' + element.nodeName;
                break;
            case Node.PROCESSING_INSTRUCTION_NODE:
                comp.name = 'processing-instruction()';
                break;
            case Node.COMMENT_NODE:
                comp.name = 'comment()';
                break;
            case Node.ELEMENT_NODE:
                comp.name = element.nodeName;
                break;
        }
        comp.position = getPos(element);
    }


    // List of all SVG tags
    let svgTags = [
      "animate",
      "animateMotion",
      "animateTransform",
      "circle",
      "clipPath",
      "defs",
      "desc",
      "discard",
      "ellipse",
      "feBlend",
      "feColorMatrix",
      "feComponentTransfer",
      "feComposite",
      "feConvolveMatrix",
      "feDiffuseLighting",
      "feDisplacementMap",
      "feDistantLight",
      "feDropShadow",
      "feFlood",
      "feFuncA",
      "feFuncB",
      "feFuncG",
      "feFuncR",
      "feGaussianBlur",
      "feImage",
      "feMerge",
      "feMergeNode",
      "feMorphology",
      "feOffset",
      "fePointLight",
      "feSpecularLighting",
      "feSpotLight",
      "feTile",
      "feTurbulence",
      "filter",
      "foreignObject",
      "g",
      "hatch",
      "hatchpath",
      "image",
      "line",
      "linearGradient",
      "marker",
      "mask",
      "metadata",
      "mpath",
      "path",
      "pattern",
      "polygon",
      "polyline",
      "radialGradient",
      "rect",
      "script",
      "set",
      "stop",
      "style",
      "svg",
      "switch",
      "symbol",
      "text",
      "textPath",
      "title",
      "tspan",
      "use",
      "view"
    ];

    for (var i = comps.length - 1; i >= 0; i--) {
        comp = comps[i];
        let compName = comp.name.toLowerCase();

        // SVG elements need to be represented this way
        if( svgTags.includes(compName) ) {
          compName = ("*[name()='" + compName + "']");
        }

        xpath += '/' + compName;
        if (comp.position !== null) {
            xpath += '[' + comp.position + ']';
        }
    }
    return xpath;
  }


  // A variable where to store the id of the eventual role tabpanel
  let insideTab = null;

  // Let's find the parent nodes of the current element, going outwards one by one
  // Here we will save the container parent nodes of the current element, from the closest to the furthest
  let parents = [];

  // Let's scan through the parent nodes
  // we stop when we come across either null, 'body', 'html' or 'document'
  let parentCurrentElement = currentElement.parentNode;
  while(
    parentCurrentElement != null && 
    !["body", "html", "document"].includes(parentCurrentElement.localName) 
  ) {
    let parentCurrentElement_classes = parentCurrentElement.getAttribute("class");
    if(parentCurrentElement_classes != null) {
      parentCurrentElement_classes = parentCurrentElement_classes.split(" ");

      parentCurrentElement_classes = parentCurrentElement_classes.filter( function(word) {
        return !(/^\s*$/g.test(word));
      });

      if(parentCurrentElement_classes.length == 0) {
        parentCurrentElement_classes = null;
      }
    }

    let parentToggleOpen = null;
    if(parentCurrentElement.localName == "details") {
      parentToggleOpen = parentCurrentElement.open;
    }

    // Let's check if the parent is a role tabpanel
    if( parentCurrentElement.getAttribute("role") == "tabpanel" ) {
      insideTab = parentCurrentElement.getAttribute("id");
    }

    // For each parent we particularly want its xpaht, tag, id, list of classes and toggle/tab informations, 
    // alongside some optimizations infos for later
    parents.push({
      "nodeXPath":      getAbsoluteXPath(parentCurrentElement),
      "tag":            parentCurrentElement.localName,
      "id":             parentCurrentElement.getAttribute("id"),
      "class":          parentCurrentElement_classes,
      "toggleOpen":     parentToggleOpen,
      "hidden":         parentCurrentElement.hidden,
      "visibility":     parentCurrentElement.style.visibility,
      "display":        parentCurrentElement.style.display,
      "clipPath":       parentCurrentElement.style.clipPath,
      "transform":      parentCurrentElement.style.transform     
    });

    parentCurrentElement = parentCurrentElement.parentNode;
  }

  // If we got no parents, we set the variable to null
  if(parents.length == 0) {
    parents = null;
  }

  // If a role tabpanel was detected, we need to save its activeness flag inside the current element
  else if(insideTab != null) {
    let myTabElem = document.querySelector(`[href='#${insideTab}'][data-toggle='tab'],[data-target='#${insideTab}'][data-toggle='tab']`);
    let ariaExpanded = (
      myTabElem.classList.contains("active")             ||
      myTabElem.parentNode.classList.contains("active")
    ).toString();

    if(attributes == null) {
      attributes = [{
        "name":  "aria-expanded_tab",
        "value": ((ariaExpanded == null) ? "false" : ariaExpanded)
      }];
    }
    else {
      attributes.push({
        "name":  "aria-expanded_tab",
        "value": ((ariaExpanded == null) ? "false" : ariaExpanded)
      });
    }
  }


  // We compute the flag about if there is an open modal (both Bootstrap and a specific kind of custom)
  let node_info_modal = document.getElementById("node_info_modal");

  let isModalOpen = (
    document.body.classList.contains('modal-open')          ||
    (
      node_info_modal != null                               &&
      getComputedStyle(node_info_modal).display == "block"
    )
  );


  // We return the retrieved context informations inside an array
  // The only case it will be more than one object is the select with change that will spawn more context for each option
  let returnList = [];

  if(selectList.length != 0) {
    for(let sli=0; sli<selectList.length; sli++) {
      returnList.push({
        "nodeXPath":      getAbsoluteXPath(currentElement),
        "tag":            currentElement.localName,
        "id":             currentElement_id,
        "class":          currentElement_classes,
        "parents":        parents,
    
        "attributes":     attributes,
        "styles":         styles,
        "data":           data_list,

        "isModalOpen":    isModalOpen,
        "toggleOpen":     toggleOpen,
        "selectValue":    selectList[sli],

        "siblings":       0
      });
    }

    return returnList;
  }

  else {
    returnList.push({
      "nodeXPath":      getAbsoluteXPath(currentElement),
      "tag":            currentElement.localName,
      "id":             currentElement_id,
      "class":          currentElement_classes,
      "parents":        parents,
  
      "attributes":     attributes,
      "styles":         styles,
      "data":           data_list,

      "isModalOpen":    isModalOpen,
      "toggleOpen":     toggleOpen,
      "selectValue":    null,

      "siblings":       0
    });

    return returnList;
  }
};



/*
  The function to call on each current element to retrieve the needed events informations

  More precisely it takes as input the following elements:
  - realListeners:    List of objects {event, eventFunction} for each event associated to the current element
  - elements:         List of all already retrieved informations objects for the elements explored before the current one
  - parents:          List of objects {nodeXPath, tag, id, class, hidden, visibility, display, clipPath, transform} for each 
                      container node going outwards from the current one, stopping right before the 'body' tag (null if no 
                      eligible one is there)
  - attributes:       List of objects {name, value} for each element attribute (excluded 'id', 'class' and 'style')
  - excl_events:      List of events that are excluded by our framework
  - nodeXPath:        String of the element current xpath

  More precisely it returns a list divided as follows:
    First position, list of objects, each containing the following elements:
    - event:          String of the currently considered event of the element
    - eventFunction:  String of the function triggered by the aforementioned event
    - brushable:      Object {handles, directions, brush_extent, selection_extent} with brush informations (null if the event is 
                      not brush-related)
    - zoomable:       Object {scale, translate_x, translate_y} with zoom informations (null if the event is not zoom-related)
    - draggable:      Boolean indicating wheter the element is draggable or not
    - leadsToState:   Integer indicating to which state triggering this event will bring you, with respect to the ids used in the
                      states global list, or -1 if the event cannot be triggered there (at first they are all initialized to -1)

    Second position, the new list of attributes for the current element (for the case of recognizing the range sliders handles)
    It stays the same as before if no handle was recognized in the current element.

    Third position, a list of objects {id, attr} for each of the already retrieved elements that were recognized as range sliders
    handles, so that we can set their new attributes list later. It remains empty if no previous element is recognized as such.

    Fourth position, a list of numbers for each excluded element id that is too similar to a previous one (same
    tag, parents, event and eventFunction). It remains empty if no previous element is recognized as such.

    Fifth position, a list of numbers for each excluded element counter that is too similar to a previous one (same
    tag, parents, event and eventFunction). It remains empty if no previous element is recognized as such.
*/
const getCurrentElementEventsInfos = function (realListeners, elements, parents, attributes, excl_events, nodeXPath) {
  // Set the current element node
  let currentElement = this;

  // We prepare the list where to put the retrieved informations
  let currentElementEventsList = [];

  // We prepare the list where to put the already retrieved elements new attributes objects if we recognize them as
  // range sliders handles
  let otherElement_new_Attr = [];

  // We prepare the map where to put the number of objects for those elements that get excluded because too similar 
  // to a previous one
  let otherElement_new_Siblings = new Map();


  // Let's scan through the events of the current element
  for(let j=0; j<realListeners.length; j++) {
    // We take the name of the currently considered event
    let event_name = realListeners[j].event;

    // If we encounter one of the events excluded by our framework we skip this iteration
    if( excl_events.includes(event_name) ) { 
      continue; 
    }

    // We take the string of the function triggered by the currently considered event
    let eventFunction = realListeners[j].eventFunction;

    // If the aforementioned string is this one, it is from a D3 event, so to get the real function we must act differently
    if( eventFunction == "function(i){varo=t.event;t.event=i;try{n.call(this,this.__data__,e,r)}finally{t.event=o}}" ) {
      eventFunction = currentElement.__on[j].value.toString().replace(/\s+/g, "");
    }


    /*
      I need to check if the element I'm about to insert isn't already present through a similar case
      For Instance, if I have a scatter plot I don't want to save the 'click' event for each point, I only need one
      In order to do so, we check for an already inserted element with same tag, parents, event and eventFunction
      
      The only exceptions are for:
      - input tags
      - select tags
      - custom range sliders with more than one handle, in that case we signal which handle it is and keep them both
    */

    // Variable used to see if there's an already similar element in elements
    let alreadyInElements = false;

    // If the element is either a "input" or "select" tag then we need to take it no matter what
    if(currentElement.localName != "input" && currentElement.localName != "select") {
      // Function to check if the attributes list contains the ariaValueList elements
      const checkAriaValueList = function(al) {
        // Attributes can be null, in that case we return false
        if(al == null) {
          return false;
        }

        // List of attributes that help us check if they are range sliders handles
        let ariaValueList = ["aria-valuemax", "aria-valuemin", "aria-valuenow"];

        // Counter to check the presence of all three of them
        let DN = 0;
        for(let D=0; D<al.length; D++) {
          if( ariaValueList.includes(al[D].name) ) {
            DN++;
          }
        }
        return (DN == 3);
      };

      // Let's scan through the currently collected elements
      for(let z=0; z<elements.length; z++) {
        // We take the xpath with the exception of the number of the last element, for both the current one and the 
        // scanned one. We can use this to compare the tags and parents directly
        let lastOpenQuadra = nodeXPath.lastIndexOf("[");
        let substringXPath = nodeXPath.substr(0, lastOpenQuadra);
        let lastOpenQuadra_z = elements[z].nodeXPath.lastIndexOf("[");
        let substringXPath_z = elements[z].nodeXPath.substr(0, lastOpenQuadra_z);

        if(
          substringXPath_z          == substringXPath &&
          elements[z].event         == event_name     &&
          elements[z].eventFunction == eventFunction
        ) {
          // Let's check if they are range sliders handles
          if( checkAriaValueList(attributes) && checkAriaValueList(elements[z].attributes) ) {          
            if( parseFloat(attributes["aria-valuenow"]) <= parseFloat(elements[z].attributes["aria-valuenow"]) ) {
              attributes.push({
                "name": "handleLeft",
                "value": true
              });

              elements[z].attributes.push({
                "name": "handleRight",
                "value": true
              });

              otherElement_new_Attr.push({
                "id":   z,
                "attr": elements[z].attributes
              });
            }
            else {
              attributes.push({
                "name": "handleRight",
                "value": true
              });

              elements[z].attributes.push({
                "name": "handleLeft",
                "value": true
              });

              otherElement_new_Attr.push({
                "id":   z,
                "attr": elements[z].attributes
              });
            }
          }

          // They are not handles
          else {
            // Finally we need to check if it is a role option from a role listbox, as in that case we keep it
            let hasAriaExpandedParent = undefined;
            if(attributes != null) {
              hasAriaExpandedParent = attributes.find(function(elem) {
                if(elem.name == "aria-expanded_parent") {
                  return true;
                }
                else {
                  return false;
                }
              });
            }
            
            if(hasAriaExpandedParent == undefined) {
              // We take note of the excluded element id and increment its count
              otherElement_new_Siblings.set(
                z,
                ( otherElement_new_Siblings.get(z)+1 || 1 )
              );

              alreadyInElements = true;
              break;
            }        
          }
        }
      }
    }

    // Similar element already taken, so we must trigger continue on the loop
    if(alreadyInElements) {
      continue;
    }


    // Here we will save the eventual values indicating brush or zoom presence (null if it is not here)
    // Alongside a boolean flag for eventual D3 drag presence
    let brushable = null;
    let zoomable = null;
    let draggable = false;

    if(currentElement.__on != undefined && currentElement.__on[j] != undefined) {
      // Let's check if the event is linked to a brush action, if so we take:
      // - handles:          list of strings indicating the cardinal directions (n, e, s, w, ne, nw, se, sw) we can modify the current element brush selection (null if none is present)
      // - directions:       string between 'x', 'y' and 'xy' depending on which directions the selection can be done
      // - brush_extent:     [[x0,y0], [x1,y1]] coordinates dimensions of the brushable space (it uses the screen reference frame with origin in most north-west point)
      // - selection_extent: [[x0,y0], [x1,y1]] (null if no selection is present) coordinates dimensions of the selected space (it uses the screen reference frame with origin in most north-west point)
      // Pan could also be seen from here, by comparing 'brush_extent' with 'selection_extent'
      if(currentElement.__on[j].name == "brush") {
        let currentElement_brush = currentElement.__brush;
        let currentElement_handles = currentElement_brush.dim.handles;

        let handles = [];
        for(let w=0; w<currentElement_handles.length; w++) {
          handles.push( currentElement_handles[w] )
        }
        if(handles.length == 0) {
          handles = null;
        }

        brushable = {
          "handles":          handles,
          "directions":       currentElement_brush.dim.name,
          "brush_extent":     currentElement_brush.extent,
          "selection_extent": currentElement_brush.selection
        }
      }

      // Let's check if the event is linked to a zoom action, if so we take:
      // - scale:       1 if there is no zoom applied, [0,1) if we zoom out, (1,inf) if we zoom in
      // - translate_x: original origin point position on the x axis relative to the current one (it uses the screen reference frame with origin in most north-west point)
      // - translate_y: original origin point position on the y axis relative to the current one (it uses the screen reference frame with origin in most north-west point)
      // Pan could also be seen from here, from 'translate_x' and 'translate_y'
      else if(currentElement.__on[j].name == "zoom") {
        let currentElement_zoom = currentElement.__zoom;

        zoomable = {
          "scale":       currentElement_zoom.k,
          "translate_x": currentElement_zoom.x,
          "translate_y": currentElement_zoom.y,
        }
      }

      // Let's check if the event is linked to a drag action, if so we flag it.
      else if(currentElement.__on[j].name == "drag") {
        draggable = true;
      }
    }


    // We push the currently considered event retrieved informations
    currentElementEventsList.push({
      "event":          event_name,
      "eventFunction":  eventFunction,
      "brushable":      brushable,
      "zoomable":       zoomable,
      "draggable":      draggable,
      "leadsToState":   -1
    });
  }


  // We return all the needed events informations
  return [
    currentElementEventsList,
    attributes,
    otherElement_new_Attr,
    Array.from(otherElement_new_Siblings.keys()),
    Array.from(otherElement_new_Siblings.values())
  ];
};



// Function that generates the corresponding selector for a DOM element, given its tag, id, classes and parents
function getNodeSelector(context) {
  // If it has the id I can just take it
  if(context.id != null) {
    return ("#" + context.id);
  }

  // Explore the parent to get their part of the selector
  let str_parents = "";
  let parents = context.parents;
  if(parents != null) {
    for(let cp=0; cp<parents.length; cp++) {
      str_parents = " " + str_parents;
      
      if(parents[cp].id != null) {
        str_parents = ("#" + parents[cp].id + str_parents);
        break;
      }

      let parentsClasses = parents[cp].class;
      if(parentsClasses != null) {
        for(let cpc=0; cpc<parentsClasses.length; cpc++) {
          str_parents = ( "." + parentsClasses[cpc] + str_parents );
        }
      }

      str_parents = parents[cp].tag + str_parents;
    }
  }

  // Explore the classes to get their part of the selector
  let str_class = "";
  let classes = context.class;
  if(classes != null) {
    for(let cc=0; cc<classes.length; cc++) {
      str_class += ( "." + classes[cc] );
    }
  }

  // Combine parents, tag and classes to get the final selector
  return ( str_parents + context.tag + str_class );
};



// A recursive function that goes after eventual hidden events and the states structure of the system.
// At the end of its execution we will have inside the global 'states' variable the list of all states ready to be converted into
// a suitable state chart.
async function getHiddenInfoEvents(browser, page, client, ieo, stateId, eventsSoFar, depth) {
  // For each recursive depth loop we initialize this optimization flag. This way we can skip reloading the page if there 
  // is no need for it, like in the first iteration or until we trigger some event
  let canStillSkipReload = true;

  // We also save the page url, so that we can later check if an event triggered a navigation
  let pageUrl = page.url();


  // We explore the currently considered elements and trigger each event to see where they bring us to
  for(let ieo_index=0; ieo_index<ieo.length; ieo_index++) {
    console.log("--------------------------------------------------------\n\nIteration " + depth + " - " + ieo_index + "\n");


    /*
      We first need to check is the event is triggerable:
      - First by checking if the element is inaccessible, hidden or disabled in some way
      - Second by checking if the event can be reached from the current position/situation
      - Third by checking the order of triggered events
    
      If it is inaccessible then we must skip this iteration
    */
    if(
      eventInaccessible(ieo, ieo_index)                         ||
      !canEventBeReached(ieo[ieo_index], states[stateId].where) ||
      !canEventBeTriggered(ieo, ieo_index, eventsSoFar)
    ) {
      // For the logger, in case we want to specify the eventual select value
      let selectValue = ieo[ieo_index].selectValue;
      let selectValueLabel = "";
      if(selectValue != null && ieo[ieo_index].tag == "select") {
        selectValueLabel = ` [${selectValue.value}]`;
      }

      console.log("No need/possibility to trigger " + ieo[ieo_index].event + selectValueLabel + " on '" + ieo[ieo_index].nodeSelector + "' (" + ieo[ieo_index].nodeXPath + ")\n");
      continue;
    }


    /*
      We compute the 'where' field of the state we should end up in.

      If it returns null then it means we must not consider a state for this situation (case of trying to exiting the parent
      before exiting the children, when these actions are present of course).
      It was the only case not covered by the 'canEventBeTriggered' function.
    */
    let newWhere = getNewStatesWhere(states[stateId].where, ieo, ieo_index);
    if(newWhere == null) {
      // For the logger, in case we want to specify the eventual select value
      let selectValue = ieo[ieo_index].selectValue;
      let selectValueLabel = "";
      if(selectValue != null && ieo[ieo_index].tag == "select") {
        selectValueLabel = ` [${selectValue.value}]`;
      }

      console.log("No need/possibility to trigger " + ieo[ieo_index].event + selectValueLabel + " on '" + ieo[ieo_index].nodeSelector + "' (" + ieo[ieo_index].nodeXPath + ")\n");
      continue;
    }


    // Variable where to eventually store additional infos for the event triggering
    let changeOrBrushEvent = null;

    // In the case of 'change' event we need to check the various possibilities
    if(ieo[ieo_index].event == "change") {
      changeOrBrushEvent = handleChangeEvent(ieo, ieo_index);

      if(changeOrBrushEvent === undefined) {
        // For the logger, in case we want to specify the eventual select value
        let selectValue = ieo[ieo_index].selectValue;
        let selectValueLabel = "";
        if(selectValue != null && ieo[ieo_index].tag == "select") {
          selectValueLabel = ` [${selectValue.value}]`;
        }

        console.log("No need/possibility to trigger change" + selectValueLabel + " on '" + ieo[ieo_index].nodeSelector + "' (" + ieo[ieo_index].nodeXPath + ")\n");
        continue;
      }
    }

    // In the case of 'mousedown' event we need to check if it is linked to brush or zoom
    else if(ieo[ieo_index].event == "mousedown") {
      // In the case of a brushable element we need these informations instead
      if(ieo[ieo_index].brushable != null) {
        changeOrBrushEvent = {
          "nodeSelector": ieo[ieo_index].nodeSelector,
          "directions":   ieo[ieo_index].brushable.directions,
          "brush_extent": ieo[ieo_index].brushable.brush_extent
        };
      }

      // In the case of a zoomable element with mousedown it means panning, so we can skip this iteration
      else if(ieo[ieo_index].zoomable != null) {
        ieo[ieo_index].leadsToState = stateId;
        console.log("No need/possibility to trigger mousedown on '" + ieo[ieo_index].nodeSelector + "' (" + ieo[ieo_index].nodeXPath + ")\n");
        continue;
      }

      // In the case of a D3 draggable element with mousedown it means dragging ala brushing, so we can skip this iteration
      else if(ieo[ieo_index].draggable) {
        ieo[ieo_index].leadsToState = stateId;
        console.log("No need/possibility to trigger mousedown on '" + ieo[ieo_index].nodeSelector + "' (" + ieo[ieo_index].nodeXPath + ")\n");
        continue;
      }

      // In the case of a 'modal-dialog' class with mousedown it is useless and time consuming, so we can skip this iteration
      else if(ieo[ieo_index].class != null && ieo[ieo_index].class.includes("modal-dialog")) {
        ieo[ieo_index].leadsToState = stateId;
        console.log("No need/possibility to trigger mousedown on '" + ieo[ieo_index].nodeSelector + "' (" + ieo[ieo_index].nodeXPath + ")\n");
        continue;
      }
    }

    // In the case of 'click' event we need to check if it is linked to a modal opening/closure
    else if(ieo[ieo_index].event == "click") {
      if(ieo[ieo_index].attributes != null) {
        // We know a modal disclosure is triggered by an element which has attribute "data-dismiss" equal to "modal"
        let isDataDismiss = ieo[ieo_index].attributes.find(function(elem) {
          if(elem.name == "data-dismiss" && elem.value == "modal") {
            return true;
          }
          return false;
        });

        // If we have found it, we need to find the element representing the modal itself
        if(isDataDismiss != undefined) {
          // I first need to check if the current element is also the modal itself
          if(ieo[ieo_index].class != null) {
            if( ieo[ieo_index].class.includes("modal") ) {
              changeOrBrushEvent = {
                "obj":          "data-dismiss_modal",
                "nodeSelector": ieo[ieo_index].nodeSelector
              };
            }
          }
          

          // If we enter here, we need to check the parents
          if(changeOrBrushEvent == null) {
            let parents = ieo[ieo_index].parents;

            if(parents != null) {
              for(let P=0; P<parents.length; P++) {
                let currentParent = parents[P];

                if(currentParent.class != null && currentParent.class.includes("modal")) {
                  // We need this parent selector
                  let parentContext = {
                    id:       null,
                    parents:  parents.slice(P),
                    class:    null,
                    tag:      ""
                  };
                  let modalParentNodeSelector = getNodeSelector(parentContext).trim();

                  changeOrBrushEvent = {
                    "obj":          "data-dismiss_modal",
                    "nodeSelector": modalParentNodeSelector
                  };

                  break;
                }
              }
            }
          }
        }

        // We need to check if it is a modal opening instead
        else {
          // We know a modal opening is triggered by an element which has attribute "data-toggle" equal to "modal"
          let isDataToggle = ieo[ieo_index].attributes.find(function(elem) {
            if(elem.name == "data-toggle" && elem.value == "modal") {
              return true;
            }
            return false;
          });

          // If we have found it, we need to find the element representing the modal itself
          // Its selector is inside the 'data-target' attribute of this element (or the 'href' one if the tag is 'a')
          if(isDataToggle != undefined) {
            let currentTag = ieo[ieo_index].tag;

            let isDataTarget = ieo[ieo_index].attributes.find(function(elem) {
              if(
                (currentTag != "a" && elem.name == "data-target") ||
                (currentTag == "a" && elem.name == "href")
              ) {
                return true;
              }
              return false;
            });

            if(isDataTarget != undefined) {
              changeOrBrushEvent = {
                "obj":          "data-toggle_modal",
                "nodeSelector": isDataTarget.value
              };
            }
          }
        }
      }
    }


    // If we arrive here (event needs to be triggered) and not 'canStillSkipReload', then we need to reload the page
    // and re-trigger all the needed events to reach this state in the correct order
    if(!canStillSkipReload) {    
      console.log("________________________________________________________\n\nReloading the page and reaching correct state...\n");

      // We need to check that the current page url is the same as the start of the function
      // If it is, we can simply reload the page here, otherwise it means a redirect was triggered and we now must go back
      // to a new page on the old url (the console needs to be recreated as well)
      let currentUrl = page.url();

      if(pageUrl != currentUrl) {
        // We set up a new tab/page in the given browser
        page = await browser.newPage();

        // From the tab we go to the specified page and wait for its rendition
        await page.goto(
          VIS_URL, 
          {'timeout': 0, 'waitUntil':'load'}
        );
        await waitTillHTMLRendered(page);

        // We open the specified page console (Chrome Devtools Protocol session) on which we can execute commands
        client = await page.target().createCDPSession();
      }
      else {
        // We reload the page, which also reloads the console (Chrome Devtools Protocol session) on which we can execute commands
        await page.reload({'timeout': 0, 'waitUntil':'load'});
        await waitTillHTMLRendered(page);
      }

      // If given, we need to execute the previously triggered events in this branch in order to reach the previous current context
      for(let esf_index=0; esf_index<eventsSoFar.length; esf_index++) {
        await triggerEventOnElement(page, client, eventsSoFar[esf_index], eventsSoFar[esf_index].changeOrBrushEvent, false);
      }

      console.log("Reloading finished, correct state reached!\n________________________________________________________\n\n");
    }
    // The first time we reach this point for this depth loop, 'canStillSkipReload' becomes false
    else {
      canStillSkipReload = false;
    }


    // After triggering the event, we compute the new info events object
    let new_ieo = await triggerEventOnElement(page, client, ieo[ieo_index], changeOrBrushEvent, true);

    // If it is null, it means the node xpath was invalid
    if(new_ieo == null) {
      console.log("Node xpath '" + ieo[ieo_index].nodeXPath + "' is invalid, cannot trigger current event!\n");
      continue;
    }
    // If it is the string "out_of_domain_redirect", it means there was an out of domain redirect we must ignore
    else if(new_ieo == "out_of_domain_redirect") {
      continue;
    }


    /*
      Returning to 'newWhere', we must check a couple of things

      In the case of a brushable mousedown, we can skip this passage as it will be about the brush itself
      and not a normale mousedown behaviour to be checked.

      Also, in the case of an "in" event without a corresponding "out" event, that triggers the creation of new listeners,
      the new 'where' field is the same as before.
    */    
    if(ieo[ieo_index].brushable != null && ieo[ieo_index].event == "mousedown") {
      newWhere = states[stateId].where;
    }
    else if(
      ieo.length != new_ieo.length                                            && 
      ["mouseenter", "mouseover", "mousedown"].includes(ieo[ieo_index].event)
    ) {
      let detected = ieo.find(function(elem) {
        let event        = ieo[ieo_index].event;
        let nodeSelector = ieo[ieo_index].nodeSelector;
        let nodeXPath    = ieo[ieo_index].nodeXPath;
        let leave_out    = ["mouseleave", "mouseout"];

        if(elem.nodeSelector == nodeSelector && elem.nodeXPath == nodeXPath) {
          if(event == "mouseenter" || event == "mouseover") {
            return leave_out.includes( elem.event );
          }

          else if(event == "mousedown") {
            return elem.event == "mouseup";
          }
        }

        return false;
      });

      if(detected == undefined) {
        newWhere = states[stateId].where;
      }
    }


    // Then we check if it was already present inside 'states'
    let sat = await stateAlreadyTaken(new_ieo, newWhere);


    // Not present already
    if(sat == null) {
      // We need to recompute the current xpaths for the where elements, otherwise we may have problems in the next steps
      // if the xpaths changed (for example an element that was removed)
      for(let w=0; w<newWhere.length; w++) {
        let cwxp = await checkWhereXPaths(newWhere[w], client);

        if(cwxp != null) {
          newWhere[w].nodeXPath = cwxp;
        }
      }


      console.log("Current state NOT equal to a previous one!\nMoving to next recursive depth, at new state " + statesNextId + "...\n");

      // We update the leadsToState field with the id we are going to give to the new one
      ieo[ieo_index].leadsToState = statesNextId;
      
      // We add the new retrieved state into the global states list, and update the statesNextId
      states.push({
        "id":    statesNextId,
        "ieo":   new_ieo,
        "where": newWhere
      });
      statesNextId++;

      // We add the triggered event to the list for the next depth
      let new_eventsSoFar = eventsSoFar.concat([{
        nodeSelector:       ieo[ieo_index].nodeSelector,
        nodeXPath:          ieo[ieo_index].nodeXPath,
        tag:                ieo[ieo_index].tag,
        selectValue:        ieo[ieo_index].selectValue,
        event:              ieo[ieo_index].event,
        changeOrBrushEvent: changeOrBrushEvent
      }]);

      // We now call the function recursively to explore this new current branch
      await getHiddenInfoEvents(browser, page, client, new_ieo, (statesNextId-1), new_eventsSoFar, depth+1);

      console.log("--------------------------------------------------------\n\nGoing back to iteration " + depth + " - " + ieo_index + "\n");
    }


    // Already present
    else {
      console.log("Current state equal to the previous state " + sat + "!\nMoving to next loop iteration...\n");

      // The reached state was already present, so we can just update the leadsToState field
      ieo[ieo_index].leadsToState = sat;
    }
  }
};



// Function that says wheter the event is inaccessible in some way
function eventInaccessible(ieo, ieo_index) {
  // We take the element
  let ieoElem = ieo[ieo_index];


  // We start by checking if the element was marked as 'disabled' or 'hidden'
  let attributes = ieoElem.attributes;

  if(attributes != null) {
    // We also check if it is an already checked radio button
    let isRadioButton = false;

    for(let attr_index=0; attr_index<attributes.length; attr_index++) {
      let attr = attributes[attr_index];

      if( (attr.name == "disabled" || attr.name == "hidden") && attr.value ) {
        return true;
      }

      // We also check if it is an already selected/disabled role option inside a role listbox
      else if(attr.name == "aria-expanded_parent" && attr.value == "false") {
        return true;
      }
      else if(attr.name == "aria-disabled" && attr.value == "true") {
        return true;
      }
      else if(attr.name == "aria-selected" && attr.value == "true") {
        return true;
      }

      else if(attr.name == "type" && attr.value == "radio") {
        isRadioButton = true;
      }
      else if(attr.name == "selected" && attr.value && isRadioButton) {
        return true;
      }

      // If the element is in a tab, we need to check if the corresponding panel is currently open
      else if(attr.name == "aria-expanded_tab" && attr.value == "false") {
        return true;
      }
    }
  }


  /*
    Then we move to check if one of the following hiddening styles is present:
    visibility: hidden;               -> "hidden"
    display:    none;                 -> "none"
    clip-path:  circle(0);            -> "circle(0px at 50% 50%)"
    transform:  scale(0);             -> "matrix(0, 0, 0, 0, 0, 0)"
    transform:  translate(-999px, 0); -> "matrix(1, 0, 0, 1, -999, 0)"
  */
  let styles = ieoElem.styles;

  for(let stl_index=0; stl_index<styles.length; stl_index++) {
    if(
      ( styles[stl_index].name == "visibility" && styles[stl_index].value == "hidden" )                 ||
      ( styles[stl_index].name == "display"    && styles[stl_index].value == "none" )                   ||
      ( styles[stl_index].name == "clip-path"  && styles[stl_index].value == "circle(0px at 50% 50%)" ) ||
      ( 
        styles[stl_index].name == "transform"  && 
        ( styles[stl_index].value == "matrix(0, 0, 0, 0, 0, 0)" || styles[stl_index].value == "matrix(1, 0, 0, 1, -999, 0)" )
      )
    ) {
      return true;
    }
  }


  // We start to keep track of the eventual correlation between the element and a modal
  // and if it has the Bootstrap disabled class
  let isInModal = false;
  if(ieoElem.class != null) {
    if(ieoElem.class.includes("disabled")) {
      return true;
    }
    else {
      isInModal = ( ieoElem.class.includes("modal") || ieoElem.id == "node_info_modal" );
    }
  }


  // Then we move to check if the element is inside an accessible parent or a closed 'details' toggle
  let parents = ieoElem.parents;

  if(parents != null) {
    // Let's scan through the parents
    for(let p=0; p<parents.length; p++) {
      let currentParent = parents[p];

      // We need to check if a parent is classified as a modal too, and if it has the Bootstrap disabled class
      if(currentParent.class != null) {
        if( !isInModal && (currentParent.class.includes("modal") || currentParent.id == "node_info_modal") ) {
          isInModal = true;
        }

        else if(currentParent.class.includes("disabled")) {
          return true;
        }
      }

      // Let's check on the parents if they are accessible first of all
      if(
        currentParent.hidden                                         ||
        currentParent.visibility  == "hidden"                        ||
        currentParent.display     == "none"                          ||
        currentParent.clipPath    == "circle(0px at 50% 50%)"        ||
        currentParent.transform   == "matrix(0, 0, 0, 0, 0, 0)"      || 
        currentParent.transform   == "matrix(1, 0, 0, 1, -999, 0)"
      ) {
        return true;
      }

      // Check if there is a 'details' tag
      else if(currentParent.tag == "details") {
        // We generate the currently considered parent selector
        let parentContext = {
          id:       null,
          parents:  parents.slice(p),
          class:    null,
          tag:      ""
        };
        let currentParentSelector = getNodeSelector(parentContext).trim();
        let currentParentXPath    = currentParent.nodeXPath;

        // Let's check if the toggle is closed
        let closed = ieo.find(function (elem) {
          if(
            elem.nodeSelector == currentParentSelector && 
            elem.nodeXPath    == currentParentXPath    &&
            elem.toggleOpen   == false
          ) {
            return true;
          }

          return false;
        });

        // If the parent toggle is closed, then the event is inaccessible right now
        if(closed != undefined) {
          return true;
        }
      }
    }
  }


  // Lastly, if we arrive here we only need to check if there is a modal, wheter it is open or closed and in those cases
  // if the element is inside it or not
  let isModalOpen = ieoElem.isModalOpen;

  if(isModalOpen) {
    if(isInModal) {
      return false;
    }
    else {
      return true;
    }
  }
  else {
    if(isInModal) {
      return true;
    }
    else {
      return false;
    }
  }
};



// Function that checks wheter an event can be reached from the current situation
function canEventBeReached(currentElement, currentStateWhere) {
  // If the 'where' list is empty we must return true
  if(currentStateWhere.length == 0) {
    return true;
  }


  // Last 'where'
  let lastWhereSelector = currentStateWhere[currentStateWhere.length - 1].nodeSelector;
  let lastWhereXPath    = currentStateWhere[currentStateWhere.length - 1].nodeXPath;

  // If the current element is the last 'where' then the event can be reached
  if(lastWhereSelector == currentElement.nodeSelector && lastWhereXPath == currentElement.nodeXPath) {
    return true;
  }


  // We now check if one of the current element parents is the last 'where'
  let parents = currentElement.parents;

  if(parents != null) {
    for(let P=0; P<parents.length; P++) {
      // We generate the currently considered parent selector
      let parentContext = {
        id:       null,
        parents:  parents.slice(P),
        class:    null,
        tag:      ""
      };
      let scannedParentSelector = getNodeSelector(parentContext).trim();
      let scannedParentXPath    = parents[P].nodeXPath;
  
      // If a parent is the last 'where' then the event can be reached
      if(lastWhereSelector == scannedParentSelector && lastWhereXPath == scannedParentXPath) {
        return true;
      }
    }
  }


  // Having arrived here means the event is not reachable
  return false;  
};



// Function that checks wheter the currently considered event can be triggered right now
function canEventBeTriggered(ieo, ieo_index, eventsSoFar) {
  // The current event
  let event = ieo[ieo_index].event;

  if(event == "mouseenter" || event == "mouseover") {
    return canEventBeTriggered_parents(ieo, ieo_index, eventsSoFar, 0);
  }

  else if(event == "mousedown") {
    return canEventBeTriggered_parents(ieo, ieo_index, eventsSoFar, 2);
  }

  else if(event == "mouseup") {
    return canEventBeTriggered_parents(ieo, ieo_index, eventsSoFar, 3);
  }

  else {
    return canEventBeTriggered_parents(ieo, ieo_index, eventsSoFar, 1);
  }
};



// Function that checks wheter the currently considered event can be triggered right now by looking that the element parents
function canEventBeTriggered_parents(ieo, ieo_index, eventsSoFar, eventType) {
  let ieoElem = ieo[ieo_index];
  let nodeSelector = ieoElem.nodeSelector;
  let nodeXPath = ieoElem.nodeXPath;

  let enter_over = ["mouseenter", "mouseover"];
  let leave_out  = ["mouseleave", "mouseout"];


  // We need to start by scanning the parents accesses
  let parents = ieoElem.parents;

  // If it has no parents I go straight to check the element
  if(parents == null) {
    return canEventBeTriggered_element(ieo, nodeSelector, nodeXPath, enter_over, leave_out, eventsSoFar, eventType);
  }


  for(let P=0; P<parents.length; P++) {
    // We generate the currently considered parent selector
    let parentContext = {
      id:       null,
      parents:  parents.slice(P),
      class:    null,
      tag:      ""
    };
    let scannedParentSelector = getNodeSelector(parentContext).trim();
    let scannedParentXPath    = parents[P].nodeXPath;


    // We now check if this parent has mouseenter, mouseover, mouseleave or mouseout events attached to it
    let parentHasEnterOver = false;
    let parentHasLeaveOut = false;

    for(let I=0; I<ieo.length; I++) {
      let scannedElem = ieo[I];

      if( scannedElem.nodeSelector == scannedParentSelector && scannedElem.nodeXPath == scannedParentXPath ) {
        if( leave_out.includes(scannedElem.event) ) {
          parentHasLeaveOut = true;
          if(parentHasEnterOver) {
            break;
          }
        }

        else if( enter_over.includes(scannedElem.event) ) {
          parentHasEnterOver = true;
          if(parentHasLeaveOut) {
            break;
          }
        }
      }
    }


    if(parentHasEnterOver) {
      // A flag to see if we need to go checking the next parent right away
      let continueToNextParent = false;

      // This parent has both enter_over and leave_out
      if(parentHasLeaveOut) {
        // We need to go backwards on the events so far
        for(let J=eventsSoFar.length-1; J>=0; J--) {
          let scannedEvent = eventsSoFar[J];

          if( scannedEvent.nodeSelector == scannedParentSelector ) {
            // Found leave_out before enter_over, we can return false
            if( leave_out.includes(scannedEvent.event) ) {
              return false;
            }

            // Found enter_over before leave_out
            // If this is the last parent, we can check the element itself, otherwise we need to check the next parent
            else if( enter_over.includes(scannedEvent.event) ) {
              if(P == parents.length-1) {
                return canEventBeTriggered_element(ieo, nodeSelector, nodeXPath, enter_over, leave_out, eventsSoFar, eventType);
              }
              else {
                continueToNextParent = true;
                break;
              }
            }
          }
        }

        // The current parent was checked, now we continue to the next one
        if(continueToNextParent) {
          continue;
        }

        // We have found no enter_over, we can return false
        return false;
      }


      // This parent has only enter_over
      else {
        // We need to go backwards on the events so far
        for(let J=eventsSoFar.length-1; J>=0; J--) {
          let scannedEvent = eventsSoFar[J];

          // Found enter_over
          // If this is the last parent, we can check the element itself, otherwise we need to check the next parent
          if( scannedEvent.nodeSelector == scannedParentSelector && enter_over.includes(scannedEvent.event) ) {
            if(P == parents.length-1) {
              return canEventBeTriggered_element(ieo, nodeSelector, nodeXPath, enter_over, leave_out, eventsSoFar, eventType);
            }
            else {
              continueToNextParent = true;
              break;
            }
          }
        }

        // The current parent was checked, now we continue to the next one
        if(continueToNextParent) {
          continue;
        }

        // We have found no enter_over, we can return false
        return false;
      }
    }
  }


  // The element has either no parents or none of them has this stuff, so we can now check the element itself
  return canEventBeTriggered_element(ieo, nodeSelector, nodeXPath, enter_over, leave_out, eventsSoFar, eventType);
};



// Function that checks wheter the currently considered event can be triggered right now by looking that the element itself
function canEventBeTriggered_element(ieo, nodeSelector, nodeXPath, enter_over, leave_out, eventsSoFar, eventType) {
  // The element is either 'mouseenter' or 'mouseover'
  if(eventType == 0) {
    // We need to check if the elements has either 'mouseleave' or 'mouseout'
    for(let I=0; I<ieo.length; I++) {
      let scannedElem = ieo[I];

      // It has them
      if( scannedElem.nodeSelector == nodeSelector && scannedElem.nodeXPath == nodeXPath && leave_out.includes(scannedElem.event) ) {
        // We need to go backwards on the events so far
        for(let J=eventsSoFar.length-1; J>=0; J--) {
          let scannedEvent = eventsSoFar[J];

          if( scannedEvent.nodeSelector == nodeSelector ) {
            // Found leave_out before enter_over, we can return true
            if( leave_out.includes(scannedEvent.event) ) {
              return true;
            }

            // Found enter_over before leave_out, we can return false
            else if( enter_over.includes(scannedEvent.event) ) {
              return false;
            }
          }
        }

        // We have found none of them, we can return true (first entering)
        return true;
      }
    }

    // If we arrive here, it means there is no listener for neither 'mouseleave' nor 'mouseout'
    // To avoid entering in an infinite loop we must check if we already entered here and return false in that case
    alreadyEntered = eventsSoFar.find(function(elem) {
      return (elem.nodeSelector == nodeSelector && enter_over.includes(elem.event));
    });

    if(alreadyEntered == undefined) {
      return true;
    }
    else {
      return false;
    }
  }


  // Any element that is neither 'mouseenter' nor 'mouseover' nor 'mousedown' nor 'mouseup'
  else if(eventType == 1) {
    // We need to check if the elements has either 'mouseenter' or 'mouseover'
    for(let I=0; I<ieo.length; I++) {
      let scannedElem = ieo[I];

      // It has them
      if( scannedElem.nodeSelector == nodeSelector && scannedElem.nodeXPath == nodeXPath && enter_over.includes(scannedElem.event) ) {
        // We need to go backwards on the events so far
        for(let J=eventsSoFar.length-1; J>=0; J--) {
          let scannedEvent = eventsSoFar[J];

          if( scannedEvent.nodeSelector == nodeSelector ) {
            // Found leave_out before enter_over, we can return false
            if( leave_out.includes(scannedEvent.event) ) {
              return false;
            }

            // Found enter_over before leave_out, we can return true
            else if( enter_over.includes(scannedEvent.event) ) {
              return true;
            }
          }
        }

        // We have found none of them, we can return false
        return false;
      }
    }

    // We can return true if we arrived here
    return true;
  }


  // The element is 'mousedown'
  else if(eventType == 2) {
    // We need to check if the elements has 'mouseup'
    for(let I=0; I<ieo.length; I++) {
      let scannedElem = ieo[I];

      // It has it
      if( scannedElem.nodeSelector == nodeSelector && scannedElem.nodeXPath == nodeXPath && "mouseup" == scannedElem.event ) {
        // We need to go backwards on the events so far
        for(let J=eventsSoFar.length-1; J>=0; J--) {
          let scannedEvent = eventsSoFar[J];

          if(scannedEvent.nodeSelector == nodeSelector) {
            // Found 'mouseup' before 'mousedown', we can return true
            if( "mouseup" == scannedEvent.event ) {
              return canEventBeTriggered_element(ieo, nodeSelector, nodeXPath, enter_over, leave_out, eventsSoFar, 1);;
            }

            // Found 'mousedown' before 'mouseup', we can return false
            else if( "mousedown" == scannedEvent.event ) {
              return false;
            }
          }
        }

        // We have found none of them, we can potentially return true (first mousedown)
        return canEventBeTriggered_element(ieo, nodeSelector, nodeXPath, enter_over, leave_out, eventsSoFar, 1);;
      }
    }


    // If we arrive here, it means there is no listener for 'mouseup'
    // To avoid entering in an infinite loop we must check if we already triggered 'mousedown' here and return false in that case
    alreadyEntered = eventsSoFar.find(function(elem) {
      return (elem.nodeSelector == nodeSelector && elem.event == "mousedown");
    });

    if(alreadyEntered == undefined) {
      return canEventBeTriggered_element(ieo, nodeSelector, nodeXPath, enter_over, leave_out, eventsSoFar, 1);
    }
    else {
      return false;
    }
  }


  // The element is 'mouseup'
  else if(eventType == 3) {
    // We need to check if there is on this element a 'mousedown' listener
    let hasMousedown = false;
    
    for(let I=0; I<ieo.length; I++) {
      let scannedElem = ieo[I];

      if( scannedElem.nodeSelector == nodeSelector && scannedElem.nodeXPath == nodeXPath && scannedElem.event == "mousedown" ) {
        hasMousedown = true;
        break;
      }
    }
    

    let mousedownEncounters = 0;

    // We need to check if the elements has either 'mouseenter' or 'mouseover'
    for(let I=0; I<ieo.length; I++) {
      let scannedElem = ieo[I];

      // It has them
      if( scannedElem.nodeSelector == nodeSelector && scannedElem.nodeXPath == nodeXPath && enter_over.includes(scannedElem.event) ) {
        // We need to go backwards on the events so far
        for(let J=eventsSoFar.length-1; J>=0; J--) {
          let scannedEvent = eventsSoFar[J];

          if(scannedEvent.nodeSelector == nodeSelector) {
            // Found leave_out before enter_over, we can return false
            if( leave_out.includes(scannedEvent.event) ) {
              return false;
            }

            // Found enter_over before leave_out
            // we can return true if there is no mousedown listener or if it was encountered already, otherwise false
            else if( enter_over.includes(scannedEvent.event) ) {
              if(!hasMousedown || (hasMousedown && mousedownEncounters > 0)) {
                return true;
              }
              else {
                return false;
              }
            }

            // We keep track of the 'mousedown' triggerings
            else if( scannedEvent.event == "mousedown" ) {
              mousedownEncounters++;
            }

            // We find another 'mouseup' before a 'mousedown' when it should be after, it means we cannot trigger 'mouseup' again
            else if(scannedEvent.event == "mouseup" && hasMousedown && mousedownEncounters == 0) {
              return false;
            }
          }
        }
        
        // We have found none of them, we can return false
        return false;
      }
    }


    // At this point, if there is no 'mousedown' listenere we can return true
    // Otherwise we can return true only if we find a 'mousedown' triggering before a 'mouseup' one
    if(!hasMousedown) {
      return true;
    }
    else {
      for(let J=eventsSoFar.length-1; J>=0; J--) {
        let elem = eventsSoFar[J];

        if( elem.nodeSelector == nodeSelector && elem.event == "mouseup" ) {
          return false;
        }
        else if( elem.nodeSelector == nodeSelector && elem.event == "mousedown" ) {
          return true;
        }
      }

      return false;
    }
  }
};



// Function that given a 'change' event computes eventual values to handle them accordingly
function handleChangeEvent(ieo, ieo_index) {
  let tag = ieo[ieo_index].tag;

  // If the tag is a 'select' we need to take the corresponding value if possible
  // If it is already selected or disabled then we must skip this iteration (return undefined)
  if(tag == "select") {
    let changeEventOptionObj = ieo[ieo_index].selectValue;

    if(changeEventOptionObj == null || changeEventOptionObj.selected || changeEventOptionObj.disabled) {
      return undefined;
    }
    else {
      return changeEventOptionObj.value;
    }
  }


  // If the tag is an 'input' we need to explore the different possibilities
  else if(tag == "input") {
    let inputType = undefined;
    if(ieo[ieo_index].attributes != null) {
      inputType = ieo[ieo_index].attributes.find(
        function(element) {
          return element.name == "type";
        }
      );
    }

    // Recognizable input type
    if(inputType != undefined) {
      // If it is a checkbox or a radio button
      if(inputType.value == "checkbox" || inputType.value == "radio") {
        return {
          obj: "checkbox_radio"
        };
      }

      // The tag is one of these:
      // color, date, datetime, email, file, month, number, password, search, tel, text, time, url, week, range
      else {
        return null;
      }
    }

    // No recognizable input type
    else {
      return undefined;
    }
  }


  // If the tag is a 'textarea' we do not need to set any field
  else if(tag == "textarea") {
    return null;
  }


  // 'change' event on a tag that does not support it
  else {
    return undefined;
  }
};



// Function that outputs the 'where' field for the sought after state in this situation
function getNewStatesWhere(statesWhere, ieo, ieo_index) {
  let outEvents = ["mouseleave", "mouseout", "mouseup"];
  let inEvents  = ["mouseenter", "mouseover", "mousedown"];

  let nodeSelector = ieo[ieo_index].nodeSelector;
  let nodeXPath = ieo[ieo_index].nodeXPath;
  let event = ieo[ieo_index].event;


  // If it is an "out" event then we need to take the "where" before we got "in" it
  if(outEvents.includes(event)) {
    let new_statesWhere = [];
    let stoppedPushing = false;

    for(let swi=0; swi<statesWhere.length; swi++) {
      let statesWhereElem = statesWhere[swi];

      // We have found the "in" event, so we can stop pushing elements in the 'new_statesWhere' array
      if(
        statesWhereElem.nodeSelector == nodeSelector && 
        statesWhereElem.nodeXPath    == nodeXPath    && 
        (
          statesWhereElem.event == "mouseenter" && event == "mouseleave" ||
          statesWhereElem.event == "mouseover"  && event == "mouseout"   ||
          statesWhereElem.event == "mousedown"  && event == "mouseup"
        )
      ) {
        stoppedPushing = true;
      }

      /*
        If stoppedPushing is true, then we need to check if there were subsequent "in" events that have an "out" event
        because that would mean we cannot continue with an eventual new state as there are children "out" events that needs 
        to be triggered before that (basically, we try to exit the parent before exiting the children).
        Otherwise we can continue with an eventual new state.
        This was the only case that could not be handled by the 'canEventBeTriggered' function, so we check it here.
      */
      else if(stoppedPushing) {
        for(let inner_swi=0; inner_swi<ieo.length; inner_swi++) {
          let ieoElem = ieo[inner_swi];

          if(
            statesWhereElem.nodeSelector == ieoElem.nodeSelector && 
            statesWhereElem.nodeXPath    == nodeXPath    && 
            (
              statesWhereElem.event == "mouseenter" && ieoElem.event == "mouseleave" ||
              statesWhereElem.event == "mouseover"  && ieoElem.event == "mouseout"   ||
              statesWhereElem.event == "mousedown"  && ieoElem.event == "mouseup"
            )
          ) {
            new_statesWhere = null;
            break;
          }
        }
      }

      // If not stoppedPushing, we keep pushing the where elements in the new array
      else {
        new_statesWhere.push(statesWhereElem);
      }      
    }
  
    if(stoppedPushing) {
      return new_statesWhere;
    }
    else {
      return statesWhere;
    }
  }

  // If it is an "in" event then we need to add it to the "where"
  else if(inEvents.includes(event)) {
    return statesWhere.concat([{
      "nodeSelector":  nodeSelector,
      "nodeXPath":     ieo[ieo_index].nodeXPath,
      "event":         event,
      "eventFunction": ieo[ieo_index].eventFunction
    }]);
  }

  // Any other event does not change this field
  else {
    return statesWhere;
  }
};



// This function checks if the given info events object is already present in the states global list.
// If not it returns null, otherwise it returns the id of the identical object.
async function stateAlreadyTaken(ieo, newWhere) {
  for(let states_index=0; states_index<states.length; states_index++) {
    if( areWhereEqual(states[states_index].where, newWhere) && areObjectsEqual(ieo, states[states_index].ieo) ) {
      return states[states_index].id;
    }
  }

  return null;
};



// Function that given an info events object element triggers the corresponding event on it.
// It returns the consequent new info events object.
async function triggerEventOnElement(page, client, currentElement, changeOrBrushEvent, wantResult) {
  // Let's retrieve the element on the current page, so that we always have a valid objectId
  let elementOnPage = (
    await client.send(
      'Runtime.evaluate', 
      {
        // Expression to be be evaluated on the CDP session
        expression: "document.evaluate(`" + currentElement.nodeXPath + "`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;"
      }
    )
  ).result;

  // If 'elementOnPage' has value null, then the node xpath is invalid
  if(elementOnPage.value === null) {
    return null;
  }


  // Let's trigger the event from the browser page console
  let wasEventTriggered = (
    await client.send(
      'Runtime.callFunctionOn', 
      {
        // String of the function declaration to be called on the CDP session
        functionDeclaration: triggerEventOnThis.toString(),

        // Ordered list of the arguments to pass to the function above
        arguments: [
          { value: currentElement.event }, // event
          { value: changeOrBrushEvent }    // changeOrBrushEvent
        ],

        // Puppeteer identifier for the element on which to call the function
        objectId: elementOnPage.objectId,

        // The result is returned within an object {type, value}
        returnByValue: true
      }
    )
  ).result;


  // For the logger, in case we want to specify the eventual select value
  let selectValue = currentElement.selectValue;
  let selectValueLabel = "";
  if(selectValue != null && currentElement.tag == "select") {
    selectValueLabel = ` [${selectValue.value}]`;
  }

  // To check is there was any problem with the event triggering
  // 'wasEventTriggered' prints { type: 'boolean', value: true } if everything went ok, otherwise it's an error object and its value field is undefined
  console.log(currentElement.event + selectValueLabel + " triggering on '" + currentElement.nodeSelector + "' (" + currentElement.nodeXPath + ") went ok? " + wasEventTriggered.value);

  
  // To avoid navigation errors, we try to wait for one.
  // If there is one, it waits for it and then, after a url domain check, it proceeds as usual,
  // otherwise after a few seconds it performs another check to be sure and then continues as usual.
  let oldUrl = page.url();
  try {
    await page.waitForNavigation({timeout: 2000});
    let newUrl = page.url();

    // If the redirect was towards an url from the same domain, we proceed as usual
    if( isSameOrigin(oldUrl, newUrl) ) {
      console.log("Redirect occurred! Waiting for event effects to settle...\n");
    }
    // Otherwise we must go back to the original domain
    else {
      console.log("Out of domain redirect occurred! Waiting to go back...\n");
      return "out_of_domain_redirect";
    }
  } catch (error) {
    let newUrl = page.url();

    // If there was no redirect, we proceed as usual
    if(oldUrl == newUrl) {
      console.log("NO redirect occurred! Waiting for event effects to settle...\n");
    }
    // If the redirect was towards an url from the same domain, we proceed as usual
    else if( isSameOrigin(oldUrl, newUrl) ) {
      console.log("Redirect occurred! Waiting for event effects to settle...\n");
    }
    // Otherwise we must go back to the original domain
    else {
      console.log("Out of domain redirect occurred! Waiting to go back...\n");
      return "out_of_domain_redirect";
    }
  }
  await waitTillHTMLRendered(page);


  // Let's eventually return the new info events object
  if(wantResult) {
    return await getInfoEvents(client);
  }
  else {
    return null;
  }
};



// Function that trigger the given element event on the element it is called upon.
// It returns a boolean based on if the triggering was a success or not.
const triggerEventOnThis = function (event, changeOrBrushEvent) {
  let trigger_event;

  // Let's first check if the event is in one of these categories
  let animationEventList =      ["animationend", "animationiteration", "animationstart"];
  let clipboardEventList =      ["copy", "cut", "paste"];
  let dragEventList =           ["drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop"]
  let focusEventList =          ["blur", "focus", "focusin", "focusout"];
  let hashChangeEventList =     ["hashchange"];
  let inputEventList =          ["input"];
  let keyboardEventsList =      ["keydown", "keypress", "keyup"];
  let mouseEventsList =         ["click", "contextmenu", "dblclick", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup"];
  let pageTransitionEventList = ["pagehide", "pageshow"];
  let popStateEventList =       ["popstate"];
  let progressEventList =       ["error", "loadstart"];
  let storageEventList =        ["storage"];
  let touchEventList =          ["touchcancel", "touchend", "touchmove", "touchstart"]
  let transitionEventList =     ["transitionend"];
  let wheelEventList =          ["wheel", "mousewheel"];


  if( animationEventList.includes(event) ) { 
    trigger_event = new AnimationEvent(event); 
  }

  else if( clipboardEventList.includes(event) ) { 
    trigger_event = new ClipboardEvent(event); 
  }

  else if( dragEventList.includes(event) ) { 
    trigger_event = new DragEvent(event); 
  }

  else if( focusEventList.includes(event) ) { 
    trigger_event = new FocusEvent(event); 
  }

  else if( hashChangeEventList.includes(event) ) { 
    trigger_event = new HashChangeEvent(event); 
  }

  else if( inputEventList.includes(event) ) { 
    trigger_event = new InputEvent(event); 
  }

  else if( keyboardEventsList.includes(event) ) {
    trigger_event = new KeyboardEvent(event);
  }

  if( mouseEventsList.includes(event) ) {
    // Linked to a brush
    if(changeOrBrushEvent != null && changeOrBrushEvent.directions != undefined) {
      // Let's extract directions and brush extent
      let directions = changeOrBrushEvent.directions;
      let brush_extent = changeOrBrushEvent.brush_extent;
      let startCoords = brush_extent[0];
      let endCoords = brush_extent[1];

      // Let's choose appropriate dimensions for the brush given the direction
      if(directions == "x") {
        endCoords = [endCoords[0]/5, endCoords[1]];
      }
      else if(directions == "y") {
        endCoords = [endCoords[0], endCoords[1]/5];
      }
      else { // directions == "xy"
        endCoords = [endCoords[0]/5, endCoords[1]/5];
      }

      // Since if we are here it's because D3 was used, we can exploit it to create a fictitious brush object
      // with the same extent and then trigger "brush.move" on it and on the node with the new coordinates
      try{
        let brush = d3.brush().extent(brush_extent);
        d3.select( changeOrBrushEvent.nodeSelector ).call(brush.move, [startCoords, endCoords]);
      } catch(error) {
        //console.log("Unable to find a D3 reference for the brush...");
      }
      
      return true;
    }

    // Not linked to a zoom or a brush
    else {
      // We also add the bubbles option for cases like the listbox role elements and the likes
      trigger_event = new MouseEvent(event, {bubbles: true}); 
    }
  }

  else if( pageTransitionEventList.includes(event) ) { 
    trigger_event = new PageTransitionEvent(event); 
  }

  else if( popStateEventList.includes(event) ) { 
    trigger_event = new PopStateEvent(event); 
  }

  else if( progressEventList.includes(event) ) { 
    trigger_event = new ProgressEvent(event); 
  }

  else if( storageEventList.includes(event) ) { 
    trigger_event = new StorageEvent(event); 
  }

  else if( touchEventList.includes(event) ) { 
    trigger_event = new TouchEvent(event); 
  }

  else if( transitionEventList.includes(event) ) { 
    trigger_event = new TransitionEvent(event); 
  }

  else if( wheelEventList.includes(event) ) { 
    // We need some extra infos here as well
    trigger_event = new WheelEvent(event, {deltaX: 100, deltaY: 100, deltaZ: 100, deltaMode: 0}); 
  }


  // Now for peculiar cases of standart Event events

  // I need to set the select option first
  else if( "change" == event ) {
    if(changeOrBrushEvent != null) {
      // In case of checkboxes or radio buttons
      if(typeof changeOrBrushEvent == "object") {
        if(changeOrBrushEvent.obj == "checkbox_radio") {
          this.checked = (this.checked ? false : true);
        }
      }

      else {
        this.value = changeOrBrushEvent;
      }
    }

    trigger_event = new Event(event);
  }

  // I only need to call the 'reset' function, this will trigger the event by itself, without using 'dispatchEvent'
  else if( "reset" == event ) {
    this.reset();
    return true;
  }

  // I only need to change the 'open' value to its opposite, this will trigger the event by itself, without using 'dispatchEvent'
  else if( "toggle" == event ) {
    this.open = (this.open ? false : true);
    return true;
  }


  // For any other Event event
  else { 
    trigger_event = new Event(event); 
  }


  // We first dispatch the event
  let dispatching = this.dispatchEvent(trigger_event);

  // Then, if a modal closure/opening is involved, we must close it separately now
  if( changeOrBrushEvent != null && typeof changeOrBrushEvent == "object" ) {
    if(changeOrBrushEvent.obj == "data-dismiss_modal") {
      $(changeOrBrushEvent.nodeSelector).modal("hide");
    }
    else if(changeOrBrushEvent.obj == "data-toggle_modal") {
      $(changeOrBrushEvent.nodeSelector).modal("show");
    }    
  }

  // Return the result of the dispatching
  return dispatching;
};



// Function that checks if two 'where' states fields are equal or not
// They must have same lenght and the same objects in the same position (for how they are created)
function areWhereEqual(oldWhere, newWhere) {
  if(oldWhere.length != newWhere.length) {
    return false;
  }

  for(let w=0; w<oldWhere.length; w++) {
    if(
      oldWhere[w].nodeSelector  != newWhere[w].nodeSelector   ||
      oldWhere[w].nodeXPath     != newWhere[w].nodeXPath      ||
      oldWhere[w].event         != newWhere[w].event          ||
      oldWhere[w].eventFunction != newWhere[w].eventFunction
    ) {
      return false;
    }
  }

  return true;
};



// This function returns true if the two events infos objects are equal, otherwise false.
// We need to check for each element field, with some exceptions explained below.
function areObjectsEqual(obj1, obj2) {
  // If the two objects have different lengths then one there are additional events in one of them, so they are different
  if(obj1.length != obj2.length) {
    return false;
  }
 
  /*
    Given how this system works, we are sure that the retrieval order is the same, so we can proceed with a single loop

    Let's check each element field except for:
    - nodeXPath:    We don't need this level of distinction, nodeSelector and objects lengths will do
                    We will use however a reduced version of it, substituting tag and parents

    - tag:          Checking the reduced xpath checks this field too
    - id:           Checking nodeSelector checks this field too
    - class:        Checking nodeSelector checks this field too
    - parents:      Checking the reduced xpath checks this field too

    - attributes:   Attributes are not that important to check here
    - styles:       Styles are not that important to check here
    - data:         Data are not that important to check here

    - brushable:    We would like to check if there are other events that were triggered by the brush event rather than 
                    how the brush itself is now different
    - zoomable:     We would like to check if there are other events that were triggered by the zoom event rather than 
                    how the zoom itself is now different
    - draggable:    Boolean draggable flag is not that important to check here
    - leadsToState: This is a changing field, no use in checking it

    - siblings:     Siblings are not that important to check here
  */
  for(let obj_index=0; obj_index<obj1.length; obj_index++) {
    let currentObj1 = obj1[obj_index];
    let currentObj2 = obj2[obj_index];

    // We take the xpath with the exception of the number of the last element, for both objects.
    // We can use this to compare the tags and parents directly
    let lastOpenQuadra1 = currentObj1.nodeXPath.lastIndexOf("[");
    let substringXPath1 = currentObj1.nodeXPath.substr(0, lastOpenQuadra1);
    let lastOpenQuadra2 = currentObj2.nodeXPath.lastIndexOf("[");
    let substringXPath2 = currentObj2.nodeXPath.substr(0, lastOpenQuadra2);


    // It has prints for debugging purposes
    /*
    if(
      currentObj1.nodeSelector != currentObj2.nodeSelector  &&
      substringXPath1          != substringXPath2
    ) {
      console.log(currentObj1.nodeSelector);
      console.log(currentObj2.nodeSelector);
      console.log(substringXPath1);
      console.log(substringXPath2);
      console.log();
      return false;
    }

    else if(
      currentObj1.event                       != currentObj2.event
    ) {
      console.log(currentObj1.nodeSelector);
      console.log(currentObj2.nodeSelector);
      console.log(currentObj1.event);
      console.log(currentObj2.event);
      console.log();
      return false;
    }

    else if(
      currentObj1.eventFunction          != currentObj2.eventFunction &&
      isNaN(currentObj1.eventFunction)                                && 
      isNaN(currentObj2.eventFunction)
    ) {
      console.log(currentObj1.nodeSelector);
      console.log(currentObj2.nodeSelector);
      console.log(currentObj1.eventFunction);
      console.log(currentObj2.eventFunction);
      console.log();
      return false;
    }

    else if(
      currentObj1.isModalOpen                 != currentObj2.isModalOpen
    ) {
      console.log(currentObj1.nodeSelector);
      console.log(currentObj2.nodeSelector);
      console.log(currentObj1.isModalOpen);
      console.log(currentObj2.isModalOpen);
      console.log();
      return false;
    }

    else if(
      currentObj1.toggleOpen                  != currentObj2.toggleOpen
    ) {
      console.log(currentObj1.nodeSelector);
      console.log(currentObj2.nodeSelector);
      console.log(currentObj1.toggleOpen);
      console.log(currentObj2.toggleOpen);
      console.log();
      return false;
    }

    else if(
      JSON.stringify(currentObj1.selectValue) != JSON.stringify(currentObj2.selectValue)
    ) {
      console.log(currentObj1.nodeSelector);
      console.log(currentObj2.nodeSelector);
      console.log(currentObj1.selectValue);
      console.log(currentObj2.selectValue);
      console.log();
      return false;
    }
    */

    if(
      (
        currentObj1.nodeSelector              != currentObj2.nodeSelector &&
        substringXPath1                       != substringXPath2
      )                                                                                 ||
  
      currentObj1.event                       != currentObj2.event                      ||

      (
        currentObj1.eventFunction             != currentObj2.eventFunction  &&
        isNaN(currentObj1.eventFunction)                                    &&
        isNaN(currentObj2.eventFunction)
      )                                                                                 ||

      currentObj1.isModalOpen                 != currentObj2.isModalOpen                ||

      currentObj1.toggleOpen                  != currentObj2.toggleOpen                 ||

      JSON.stringify(currentObj1.selectValue) != JSON.stringify(currentObj2.selectValue)
    ) {
      return false;
    }
  }

  // If we arrive here, they are identical
  return true;
};



// Function that, given a "where" element, computes the currently correct new xpath for it
async function checkWhereXPaths(whereElem, client) {
  // We try to take the dom element corresponding to the given element xpath
  let domNode = (
    await client.send(
      'Runtime.evaluate', 
      {
        // Expression to be be evaluated on the CDP session
        expression: `document.evaluate('${whereElem.nodeXPath}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;`,  
  
        // This way it will also include functions in the result of those calling this element
        objectGroup: 'provided'          
      }
    )
  ).result;


  // There is no element corresponding to that xpath, we need to look for it then
  if(domNode.value === null) {
    return await checkWhereXPaths_multipleElements(whereElem.nodeSelector, whereElem.event, whereElem.eventFunction, client);
  }


  // There is one element corresponding to that xpath, we need to check if it is it
  else {
    let tri = await checkWhereXPaths_singleElement(domNode.objectId, whereElem.event, whereElem.eventFunction, client);

    // The element is not what we were looking for, so we must look for the right one
    if(tri == null) {
      return await checkWhereXPaths_multipleElements(whereElem.nodeSelector, whereElem.event, whereElem.eventFunction, client);
    }

    // Otherwise, we return the currently correct xpath
    else {
      return tri;
    }
  }
};



// Function that takes all the elements for a given selector and checks whether there is one corresponding to what we are
// looking for and in that case it returns its current xpath, otherwise null
async function checkWhereXPaths_multipleElements(nodeSelector, event, eventFunction, client) {
  // Let's take all the nodes for the given selector
  let possibleNodes = (
    await client.send(
      'Runtime.evaluate', 
      {
        // Expression to be be evaluated on the CDP session
        expression: `document.querySelectorAll('${nodeSelector}');`
      }
    )
  ).result;

  // We also take the length of the list
  let possibleNodesLength = (
    await client.send(
      'Runtime.evaluate', 
      {
        // Expression to be be evaluated on the CDP session
        expression: `document.querySelectorAll('${nodeSelector}').length;`
      }
    )
  ).result.value;


  // Let's scan through the collected nodes
  for(let pni=0; pni<possibleNodesLength; pni++) {
    // We take one element at the time
    let currentElement = (
      await client.send(
        'Runtime.callFunctionOn', 
        {
          // String of the function declaration to be called on the CDP session
          functionDeclaration: `
            function() {
                return this[${pni}];
            }
          `, 

          // Puppeteer identifier for the element on which to call the function                                         
          objectId: possibleNodes.objectId,  

          // This way it will also include functions in the result of those calling this element
          objectGroup: 'provided'             
        }
      )
    ).result;
  
    // Let's check the current element
    let tri = await checkWhereXPaths_singleElement(currentElement.objectId, event, eventFunction, client);

    // Depending on if we have found what we were looking for, we either continue the search or return the currently correct xpath
    if(tri == null) {
      continue;
    }
    else {
      return tri;
    }
  }


  // None of the nodes is the correct one, let's return null
  return null;
};



// Function that takes one element and checks whether it corresponds to what we are
// looking for and in that case it returns its current xpath, otherwise null
async function checkWhereXPaths_singleElement(objectId, event, eventFunction, client) {
  // Let's take the list of event listeners for the current element
  let currentElementListeners = (
    await client.send(
      'DOMDebugger.getEventListeners', 
      {
        // Puppeteer identifier for the element on which to call the function
        objectId: objectId  
      }
    )
  ).listeners;

  // The element has no listener attached to it, so we skip it
  if(currentElementListeners.length == 0) {
    return null;
  }


  // We check for the event name and handler for each listener attached to the current element
  for(let cel_index=0; cel_index<currentElementListeners.length; cel_index++) {
    // We find a match with what we are looking for
    if(
      currentElementListeners[cel_index].type                == event         &&
      currentElementListeners[cel_index].handler.description == eventFunction
    ) {
      // Let's compute the currently correct xpath
      let new_xpath = (
        await client.send(
          'Runtime.callFunctionOn', 
          {
            // String of the function declaration to be called on the CDP session
            functionDeclaration: getNewXPath.toString(),

            // Puppeteer identifier for the element on which to call the function
            objectId: objectId,

            // The result is returned within an object {type, value}
            returnByValue: true
          }
        )
      ).result.value;

      return new_xpath;
    }
  }


  // If we have arrived here, the element is not what we were looking for
  return null;
};



// Function that computes the xpath of the element that it is called upon
const getNewXPath = function () {
  // Let's take the element
  let element = this;

  var comp, comps = [];
  var parent = null;
  var xpath = '';
  var getPos = function(element) {
      var position = 1,
          curNode;
      if (element.nodeType == Node.ATTRIBUTE_NODE) {
          return null;
      }
      for (curNode = element.previousSibling; curNode; curNode = curNode.previousSibling) {
          if (curNode.nodeName == element.nodeName) {
              ++position;
          }
      }
      return position;
  };

  if (element instanceof Document) {
      return '/';
  }

  for (; element && !(element instanceof Document); element = element.nodeType == Node.ATTRIBUTE_NODE ? element.ownerElement : element.parentNode) {
      comp = comps[comps.length] = {};
      switch (element.nodeType) {
          case Node.TEXT_NODE:
              comp.name = 'text()';
              break;
          case Node.ATTRIBUTE_NODE:
              comp.name = '@' + element.nodeName;
              break;
          case Node.PROCESSING_INSTRUCTION_NODE:
              comp.name = 'processing-instruction()';
              break;
          case Node.COMMENT_NODE:
              comp.name = 'comment()';
              break;
          case Node.ELEMENT_NODE:
              comp.name = element.nodeName;
              break;
      }
      comp.position = getPos(element);
  }


  // List of all SVG tags
  let svgTags = [
    "animate",
    "animateMotion",
    "animateTransform",
    "circle",
    "clipPath",
    "defs",
    "desc",
    "discard",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "filter",
    "foreignObject",
    "g",
    "hatch",
    "hatchpath",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "mpath",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "script",
    "set",
    "stop",
    "style",
    "svg",
    "switch",
    "symbol",
    "text",
    "textPath",
    "title",
    "tspan",
    "use",
    "view"
  ];

  for (var i = comps.length - 1; i >= 0; i--) {
      comp = comps[i];
      let compName = comp.name.toLowerCase();

      // SVG elements need to be represented this way
      if( svgTags.includes(compName) ) {
        compName = ("*[name()='" + compName + "']");
      }

      xpath += '/' + compName;
      if (comp.position !== null) {
          xpath += '[' + comp.position + ']';
      }
  }
  return xpath;
};



/*
  We extract the final state chart for the next step from the global list 'states' and then write it in a json file

  The final structure will be a list of objects whose fields are:
  - stateId:  An integer uniquely identifying the state. The rest state has stateId 0.
  - ieo:      A list of objects for all the listeners of this state, each object fields are:

    - nodeSelector: String of the selector for the current node
    - nodeXPath:    String of the xpath for the current node
    - tag:          String of the element tag name

    - attributes:   List of objects {name, value} for each element attribute (excluded 'id', 'class' and 'style') 
                    [null if there is none]
    - styles:       List of objects {name, value} for each relevant element style ('height', 'width')
    - data:         List of objects {name, value} for each element attached data [null if there is none]
    - selectValue:  Value for the currently considered select option (null if it is not a select)

    - event:        String of the currently considered event of the element. There could be special cases in which this field is
                    'facsimile_back' (an event that does not exist), meaning that the arc was added later as a mean to go back
                    from an "in" event that did not have a corresponding "out" event and did not trigger the creation of new
                    listeners. The 'facsimile_back' arcs can then be crossed without triggering any event
    - brushable:    Object {handles, directions, brush_extent, selection_extent} with brush informations [null if the event is 
                    not brush-related]
    - zoomable:     Object {scale, translate_x, translate_y} with zoom informations [null if the event is not zoom-related]
    - draggable:    Boolean indicating wheter the element is draggable or not
    - leadsToState: Integer indicating to which state triggering this event will bring you to, with respect to the stateId 
                    fields, or -1 if the event cannot be triggered there

    - siblings:     Number of those excluded elements that share with the current one the same 'tag', 'parents',
                    'event' and 'eventFunction' (0 if there is none)
*/
async function obtainStatechart() {
  // List where to put the new states objects
  let statechart = [];


  // We scan through the current version of the states
  for(let myi=0; myi<states.length; myi++) {
    let currentStateIeo = states[myi].ieo;

    // The object where to save the new version of the currently considered state
    let newCurrentState = {
      "stateId": states[myi].id,
      "ieo":     []
      //,"where": states[myi].where
    };

    // We scan through the currently considered state ieo objects
    for(let myj=0; myj<currentStateIeo.length; myj++) {
      let ieoElem = currentStateIeo[myj];

      // We take only the necessary styles
      let stylesHeight  = ieoElem.styles.find(element => element.name == "height");
      let stylesWidth   = ieoElem.styles.find(element => element.name == "width");
      let newStyles     = [stylesHeight, stylesWidth];

      // We take only the necessary fields
      newCurrentState.ieo.push({
        "nodeSelector": ieoElem.nodeSelector,
        "nodeXPath":    ieoElem.nodeXPath,
        "tag":          ieoElem.tag,
        
        "attributes":   ieoElem.attributes,
        "styles":       newStyles,
        "data":         ieoElem.data,
        "selectValue":  ieoElem.selectValue,

        "event":        ieoElem.event,
        "brushable":    ieoElem.brushable,
        "zoomable":     ieoElem.zoomable,
        "draggable":    ieoElem.draggable,
        "leadsToState": ieoElem.leadsToState,

        "siblings":     ieoElem.siblings
      });
    }

    statechart.push(newCurrentState);
  }


  // We adjust the statechart to add eventual new 'facsimile_back' arcs
  await adjustStatechart(statechart);


  console.log("--------------------------------------------------------\n");

  // We obtain and write also the graphviz version of the statechart
  obtainStatechartGraphviz(statechart);


  // The resulting object 'statechart' is stored inside a json file
  fs.writeFile("./static/js/material/statechart.json", JSON.stringify(statechart), function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The statechart json file was saved!");
  });
};



// Function that adds eventual 'facsimile_back' arcs to the statechart.
// It is needed for the later routing stages of the framework, and they gets added only in specific cases described below.
async function adjustStatechart(statechart) {
  // Events that can cause the creation of 'facsimile_back' arcs under specific circumstances
  let inEvents = ["mouseenter", "mouseover", "mousedown"];


  // We scan through the states
  for(let s=0; s<statechart.length; s++) {
    let stateId = statechart[s].stateId;
    let ieo     = statechart[s].ieo;

    // For each state, we scan through their ieo
    for(let ieo_index=0; ieo_index<ieo.length; ieo_index++) {
      let currentIeo = ieo[ieo_index];
      let leadsToState = currentIeo.leadsToState;
      let nodeSelector = currentIeo.nodeSelector;


      // Let's focus only on those arcs leading to a state that is different from the current one and that
      // are triggered by an "in" event
      if(
        leadsToState != -1                    &&
        leadsToState != stateId               && 
        inEvents.includes( currentIeo.event )
      ) {
        let takenIeo = statechart[leadsToState].ieo;

        // We compute the two ieo lists length (without considering the eventual 'facsimile_back' elements)
        let ieoLength      = await lengthWithoutFacsimileBack(ieo);
        let takenIeoLength = await lengthWithoutFacsimileBack(takenIeo);

        // We only continue further if the trigger of this event/arc did not create any new listener
        if(ieoLength == takenIeoLength) {
          // Let's look for a corresponding "out" event
          let foundOutEvent = takenIeo.find(function(elem) {
            if(
              elem.nodeSelector == nodeSelector && 
              (
                (
                  ( currentIeo.event == "mouseenter" || currentIeo.event == "mouseover" ) &&
                  ( elem.event == "mouseleave" || elem.event == "mouseout" )
                )

                ||

                ( currentIeo.event == "mousedown" && elem.event == "mouseup" )
              )
            ) {
              return true;
            }

            return false;
          });

          // There is no corresponding "out" event
          if(foundOutEvent == undefined) {
            // We create the specific 'facsimile_back' arc for this situation
            fba = {
              "nodeSelector": nodeSelector,
              "nodeXPath":    currentIeo.nodeXPath,
              "tag":          currentIeo.tag,
              
              "attributes":   currentIeo.attributes,
              "styles":       currentIeo.styles,
              "data":         currentIeo.data,
              "selectValue":  currentIeo.selectValue,
          
              "event":        "facsimile_back",
              "brushable":    currentIeo.brushable,
              "zoomable":     currentIeo.zoomable,
              "draggable":    currentIeo.draggable,
              "leadsToState": stateId,

              "siblings":     currentIeo.siblings
            };

            // We add the 'facsimile_back' arc to this node
            takenIeo.push(fba);

            // We now scan this branch as well
            adjustStatechart_children(statechart, leadsToState, fba, takenIeo, inEvents, [leadsToState]);
          }
        }
      }
    }
  }
};



// Function that computes the lenght of an ieo list, but without taking the 'facsimile_back' elements into account
async function lengthWithoutFacsimileBack(ieo) {
  let counter = 0;

  for(let i=0; i<ieo.length; i++) {
    if(ieo[i].event != "facsimile_back") {
      counter++;
    }
  }

  return counter;
};



// We scan a state chart branch looking for other eventual 'facsimile_back' arcs to be added
function adjustStatechart_children(statechart, stateId, fba, ieo, inEvents, alreadyBeenHere) {
  // We scan through the ieo
  for(let ieo_index=0; ieo_index<ieo.length; ieo_index++) {
    let currentIeo = ieo[ieo_index];
    let leadsToState = currentIeo.leadsToState;

    // Let's focus only on those arcs leading to a state that is different from the current one and that
    // are not triggered neither by an "in" event nor by a "facsimile_back" and that do not lead to an already visited state
    if(
      leadsToState != -1                      &&
      leadsToState != stateId                 && 
      !inEvents.includes( currentIeo.event )  &&
      "facsimile_back" != currentIeo.event    &&
      !alreadyBeenHere.includes(leadsToState)
    ) {
      let takenIeo = statechart[leadsToState].ieo;

      // We add the 'facsimile_back' arc to this node
      takenIeo.push(fba);

      // Let's explore this node children as well
      adjustStatechart_children(statechart, leadsToState, fba, takenIeo, inEvents, alreadyBeenHere.concat([leadsToState]));
    }
  }
};



// Function that creates the corresponding Graphviz string for the statechart
function obtainStatechartGraphviz(statechart) {
  // We need a counter for all the edges
  let edgesCounter = 0;


  let graphString = `digraph G {\n\n\trankdir="LR";\n\tsplines=ortho;\n\n`;
  //let graphString = `digraph G {\n\n\tsplines=ortho;\n\n`;

  // We scan through the states
  for(let s=0; s<statechart.length; s++) {
    let stateId = statechart[s].stateId;
    let ieo     = statechart[s].ieo;

    // For each state, we scan through their ieo
    for(let ieo_index=0; ieo_index<ieo.length; ieo_index++) {
      let currentIeo   = ieo[ieo_index];
      let leadsToState = currentIeo.leadsToState;
      let event        = currentIeo.event;
      let nodeSelector = currentIeo.nodeSelector;
      let nodeXPath    = currentIeo.nodeXPath;
      let selectValue  = currentIeo.selectValue;

      let selectValueLabel = "'";
      if(selectValue != null && currentIeo.tag == "select") {
        selectValueLabel = `' [${selectValue.value}]`;
      }

      // In case the selector is too long
      if(nodeSelector.length > 40) {
        nodeSelector = ( nodeSelector.substr(0, 20) + ` […] ` + nodeSelector.substr(-20) );
      }


      if(leadsToState != -1) {
        graphString += (
          `\tE`                     +
          edgesCounter              +
          ` [label="'`              + 
          event                     + 
          selectValueLabel          +
          ` on '`                   + 
          nodeSelector              + 
          `'\\n(`                    + 
          nodeXPath                 +
          `)", shape="box", style="filled", fillcolor="#000000", fontcolor="#FFFFFF"];\n\t` +

          stateId                   +
          ` -> `                    + 
          `E`                       +
          edgesCounter              +
          ` [arrowhead="box"];\n`   + 

          `\tE`                     +
          edgesCounter              +
          ` -> `                    + 
          leadsToState              +
          `;\n\n`
        );

        // Increase the edges counter
        edgesCounter++;
      }
    }
  }

  graphString += `}`;


  // The resulting string 'graphString' is stored inside a gv file
  fs.writeFile("./static/files/statechartGV/statechart_graphviz.gv", graphString, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The statechart graphviz file was saved!");
  });
};



/*
-------------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------------
*/

// MAIN EXECUTION



// Main function from which we instanciate the browser and run the code to retrieve all the events and their distribution
async function mainContainer() {
  console.log("Obtaining list of excluded events and system url...\n");
  
  // Take the events to be excluded from a file and put them inside the 'excluded_events' global list
  try {
    let excluded_events_file = fs.readFileSync('./static/js/material/excluded_events.txt', 'utf8').toString();
    let excluded_events_list = excluded_events_file.split("\n");

    for(let eel_index=0; eel_index<excluded_events_list.length; eel_index++) {
      let event = excluded_events_list[eel_index].trim().toLowerCase();

      if(event != "") {
        excluded_events.push(event);
      }
    }
  } catch (err) {
    console.error(err);
  }

  // Take the url of the system to be scanned from a file and put it inside the 'VIS_URL' global variable
  try {
    VIS_URL = fs.readFileSync('./static/js/material/system_url.txt', 'utf8').toString().trim();
  } catch (err) {
    console.error(err);
  }


  console.log("Launching the browser and creating first new page...\n");

  // We set up the browser
  const browser = await puppeteer.launch();

  // We set up a new tab/page in the given browser
  let page = await browser.newPage();

  // From the tab we go to the specified page and wait for its rendition
  await page.goto(
    VIS_URL, 
    {'timeout': 0, 'waitUntil': 'load'}
  );
  await waitTillHTMLRendered(page);

  // We open the specified page console (Chrome Devtools Protocol session) on which we can execute commands
  let client = await page.target().createCDPSession();


  // Let's retrieve the starting time of the meat of the computation
  const startingTime = new Date();


  // We take the retrieved elements (current state info events object)
  let retrievedElements = await getInfoEvents(client);

  // We add the retrieved rest state into the global states list, and update the statesNextId
  states.push({
    "id":    statesNextId,
    "ieo":   retrievedElements,
    "where": []
  });
  statesNextId++;

  console.log("Rest state computed!\nStarting to look for the other states...\n");
  //console.log(retrievedElements);
  

  // Let's now look for the hidden events and the states structure of the events triggering
  await getHiddenInfoEvents(browser, page, client, retrievedElements, 0, [], 0);


  // We close the browser at the end
  browser.close();


  // Let's retrieve the ending time of the meat of the computation
  const endingTime = new Date();

  // Now we output the starting and ending times onto a txt file
  fs.writeFile("./static/js/material/computation_times.txt", (startingTime + "\n\n" + endingTime), function(err) {
    if(err) {
        console.log(err);
    }
  });


  // We obtain and write the final state chart
  await obtainStatechart();
}



// The main function is called.
mainContainer();
