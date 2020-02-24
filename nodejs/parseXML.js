import path from "path";
import {getChildrenByTagName, ancestorHasTag} from './utilityFunctions';
import {
  checkIndexBadEndWarning
} from "./processingFunctions/warnings.js";
import {outputDirectory, allFilepath, tableOfContent} from "./index.js";

import {
  replaceTagWithSymbol,
  processEpigraph,
  processFigure,
  processFigureEpub,
  generateImage,
  processExercise,
  processExerciseEpub,
  processFileInput,
  processSnippet,
  processSnippetEpub,
  processTable,
  recursiveProcessPureText,
  processList,
  addName,
} from './processingFunctions';
import { write } from "fs";

let paragraph_count = 0;
let footnote_count = 0;
let snippet_count = 0;
let display_footnote_count = 0;
let chapArrIndex = 0;
export let chapterIndex = "";
let chapterTitle = "";
/*
const chapter = chapterIndex.substring(0,1);
const section = chapterIndex.substring(2,3);
const subsection = chapterIndex.substring(4,5);
*/

export const tagsToRemove = new Set([
  "#comment",
  "COMMENT",
  "CHANGE",
  "EDIT",
  "EXCLUDE",
  "HISTORY",
  "ORDER",
  "SCHEME",
  "SOLUTION",
  "INDEX",
  "LABEL",
  "NAME"
]);
// SOLUTION tag handled by processSnippet

export const ignoreTags = new Set([
  "CHAPTERCONTENT",
  "JAVASCRIPT",
  "NOBR",
  "span",
  "SPLITINLINE"
]);

export const preserveTags = new Set([
  "B",
  "EM",
  "QUOTE",
  "SPLIT",
  "UL",
  "LI",
  "SECTIONCONTENT",
  "CITATION"
]);

export const processTextFunctionsDefault = {

  "#text": (node, writeTo) => {
    /*
    const trimedValue = node.nodeValue
      .replace(/[\r\n]+/, " ")
      .replace(/\s+/g, " ")
      .replace(/\^/g, "\^{}")
      .replace(/%/g, "\\%");
    */
   // ignore the section/subsection tags at the end of chapter/section files
    if (!node.nodeValue.match(/&(\w|\.|\d)+;/)) {
      writeTo.push(node.nodeValue);
    } 
    // if (!trimedValue.match(/^\s*$/)) {
    // }
  },

  ABOUT: (node, writeTo) => {
    writeTo.push("\\chapter*{");
    const name = addName(node, writeTo);
    writeTo.push("\n\\addcontentsline{toc}{chapter}{");
    writeTo.push(name + '}\n\n');
    recursiveProcessText(node.firstChild, writeTo);
  },
  REFERENCES: (node, writeTo) => processTextFunctions["ABOUT"](node, writeTo),
  WEBPREFACE: (node, writeTo) => processTextFunctions["ABOUT"](node, writeTo),
  MATTER: (node, writeTo) => processTextFunctions["ABOUT"](node, writeTo),

  BR: (node, writeTo) => {
    writeTo.push("\n\\noindent ");
  },

  BLOCKQUOTE: (node, writeTo) => {
    writeTo.push("\n\\begin{quote}");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("\\end{quote}\n");
  },

  CHAPTER: (node, writeTo) => {
    
    writeTo.push("<div class='chapter-title'>");
    writeTo.push("\n\t<div class='permalink'>");
    writeTo.push("\n\t\t<a name='top' class='permalink'>");
    
    writeTo.push(chapterIndex + " " + chapterTitle);
    /*
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    processText(childNode, writeTo);
    */
    writeTo.push("</a>");
    writeTo.push("\n\t</div>");
    writeTo.push("\n</div>");

    writeTo.push("\n\t<div class='chapter-text'>");
    writeTo.push("\n\t\t<div class='SECTION'>");
    writeTo.push("<CHAPTER>");
    
    addName(node, writeTo);
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    recursiveProcessText(childNode.nextSibling, writeTo);
    writeTo.push("\n</CHAPTER>");
  },

  /*
  CITATION: (node, writeTo) => {
    // Currently just text. Not linked to biblography.
    const text = node.getElementsByTagName("TEXT")[0];
    if (text) {
      recursiveProcessText(text.firstChild, writeTo);
    } else {
      recursiveProcessText(node.firstChild, writeTo);
    }
  },
  */

  em: (node, writeTo) => {
    node.nodeName = "EM";
    recursiveProcessText(node, writeTo);
  },

  EPIGRAPH: (node, writeTo) => {
    processEpigraph(node, writeTo);
  },

  EXERCISE: (node, writeTo) => {
    processExercise(node, writeTo);
  },

  FIGURE: (node, writeTo) => {
    processFigure(node, writeTo);
  },

  FOOTNOTE: (node, writeTo) => {
    footnote_count += 1;
    writeTo.push("<a class='superscript' id='footnote-link-" + footnote_count + "' href='#footnote-" + footnote_count + "'>[" + footnote_count + "]</a>");
   // clone the current FOOTNOTE node and its children
    let cloneNode = node.cloneNode(true);
    cloneNode.nodeName = "DISPLAYFOOTNOTE";
    let parent = node.parentNode;
    // the last parentNode is <#document> the second last node is either <CHAPTER>/<(SUB)SECTION>
    while (parent.parentNode.parentNode) {
      parent = parent.parentNode;
    }
    // append the cloned node as the last elements inside <CHAPTER>/<SECTION> node
    parent.appendChild(cloneNode); 
    //recursiveProcessText(node.nextSibling, writeTo);
  },

  DISPLAYFOOTNOTE: (node, writeTo) => {
    display_footnote_count += 1;
    if (display_footnote_count == 1) {writeTo.push("<hr>");}
    writeTo.push("<div class='footnote'>");
    writeTo.push("\n<a class='footnote-number' id='footnote-" + display_footnote_count + "' href='#footnote-link-" + display_footnote_count + "'>");
    writeTo.push("[" + display_footnote_count + "] </a><FOOTNOTE>");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("</FOOTNOTE>");
    writeTo.push("</div>");
  },

  H2: (node, writeTo) => {
    writeTo.push("\n\\subsection*{");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}\n");
  },

  IMAGE: (node, writeTo) => {
    writeTo.push(
      "\\begin{figure}[H]\n\\centering"
      + generateImage(node.getAttribute("src")) + "\n\\end{figure}\n"
    );
  },

  /*
  LABEL: (node, writeTo) => {
    writeTo.push("\\label{" + node.getAttribute("NAME") + "}\n");
  },
  */

  LINK: (node, writeTo) => {
    writeTo.push("\\href{" + node.getAttribute("address") + "}{");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}");
  },

  LATEX: (node, writeTo) => processTextFunctions["LATEXINLINE"](node, writeTo),
  TREETAB: (node, writeTo) => processTextFunctions["LATEXINLINE"](node, writeTo),
  LATEXINLINE: (node, writeTo) => {
    recursiveProcessPureText(node.firstChild, writeTo);
  },

  MATTERSECTION: (node, writeTo) => {
    writeTo.push("\\section*{");
    addName(node, writeTo);
    recursiveProcessText(node.firstChild, writeTo);
  },

  NAME: (node, writeTo) => {
    recursiveProcessText(node.firstChild, writeTo);
  },

  OL: (node, writeTo) => {
    writeTo.push("\n\\begin{enumerate}");
    writeTo.push(ancestorHasTag(node, "EXERCISE") ? "[a.]\n" : "\n");
    processList(node.firstChild, writeTo);
    writeTo.push("\\end{enumerate}\n");
  },

  P: (node, writeTo) => processTextFunctions["TEXT"](node, writeTo),
  
  TEXT: (node, writeTo) => {
    //permalink_wrap(node, "p1")
    paragraph_count += 1;
    writeTo.push("<div class='permalink'>");
    writeTo.push("\n<a name='p" + paragraph_count + "' class='permalink'></a>");
    writeTo.push("<p>");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("</p>");
    writeTo.push("</div>");
  },
/*
  QUOTE: (node, writeTo) => {
    writeTo.push("<QUOTE>");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("</QUOTE>");
  },
*/

  REF: (node, writeTo) => {
    writeTo.push("\\ref{" + node.getAttribute("NAME") + "}");
  },

  REFERENCE: (node, writeTo) => {
    // Doesn't do anything special
    writeTo.push("\n");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("\n");
  },

  SC: (node, writeTo) => {
    writeTo.push("{\\scshape ");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}");
  },

  SECTION: (node, writeTo) => {
    writeTo.push("<div class='chapter-title'>");
    writeTo.push("\n\t<div class='permalink'>");
    writeTo.push("\n\t\t<a name='top' class='permalink'>");
    
    writeTo.push(chapterIndex + " " + chapterTitle);
  
    writeTo.push("</a>");
    writeTo.push("\n\t</div>");
    writeTo.push("\n</div>");

    writeTo.push("\n\t<div class='chapter-text'>");
    writeTo.push("\n\t\t<div class='SECTION'>");
    writeTo.push("<SECTION>");
    addName(node, writeTo);
    
    if (node.getAttribute("WIP") === "yes") {
         writeTo.push("\\begin{center}\\fbox{\\textcolor{red}{Note: this section is a work in progress!}}\\end{center}")
    }
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    recursiveProcessText(childNode.nextSibling, writeTo);
    writeTo.push("\n</SECTION>");
  },

  SUBHEADING: (node, writeTo) => {
    writeTo.push("<div class='permalink'>");
    writeTo.push("\n<a name='h1' class='permalink'></a>");
    writeTo.push("<h2>");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("</h2>");
    writeTo.push("</div>");
    addName(node, writeTo);
  },
  SUBSUBSECTION: (node, writeTo) => processTextFunctions["SUBHEADING"](node, writeTo),

  SCHEMEINLINE: (node, writeTo) =>
    processTextFunctions["JAVASCRIPTINLINE"](node, writeTo),

  JAVASCRIPTINLINE: (node, writeTo) => {
    writeTo.push("<kbd>");
    recursiveProcessPureText(node.firstChild, writeTo, { removeNewline: true });
    writeTo.push("</kbd>");
  },

  SNIPPET: (node, writeTo) => {
    if (node.getAttribute("HIDE") == "yes") {
      return;
    } else if (node.getAttribute("LATEX") == "yes") {
      writeTo.push("<kbd class='snippet'>");
      recursiveProcessText(node.firstChild, writeTo);
      writeTo.push("</kbd>");
      return;
    }
    snippet_count += 1;
    writeTo.push("<div class='snippet' id='javascript_"+chapArrIndex+"_"+snippet_count+"_div'>")
    writeTo.push("<div class='pre-prettyprint'>");
    processSnippet(node, writeTo);
    writeTo.push("</div></div>");
  },

  SPACE: (node, writeTo) => {
    writeTo.push(" ");
    recursiveProcessText(node.firstChild, writeTo);
  },

  SUBINDEX: (node, writeTo) => {
    // should occur only within INDEX
    // also should only exist after stuff in the main index
    writeTo.push("!");
    const order = getChildrenByTagName(node, "ORDER")[0];
    if (order) {
      recursiveProcessText(order.firstChild, writeTo);
      writeTo.push("@");
    }
    recursiveProcessText(node.firstChild, writeTo);
  },

  SUBSECTION: (node, writeTo) => {
    writeTo.push("<div class='chapter-title'>");
    writeTo.push("\n\t<div class='permalink'>");
    writeTo.push("\n\t\t<a name='top' class='permalink'>");
    
    writeTo.push(chapterIndex + " " + chapterTitle);
   
    writeTo.push("</a>");
    writeTo.push("\n\t</div>");
    writeTo.push("\n</div>");

    writeTo.push("\n\t<div class='chapter-text'>");
    writeTo.push("\n\t\t<div class='SUBSECTION'>");
    writeTo.push("<SUBSECTION>");
    addName(node, writeTo);
    
    if (node.getAttribute("WIP") === "yes") {
         writeTo.push("\\begin{center}\\fbox{\\textcolor{red}{Note: this section is a work in progress!}}\\end{center}")
    }
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    recursiveProcessText(childNode.nextSibling, writeTo);
    writeTo.push("\n</SUBSECTION>");
  },

  TABLE: (node, writeTo) => {
    processTable(node, writeTo);
  },

  TT: (node, writeTo) => {
    writeTo.push("\\texttt{");
    recursiveProcessText(node.firstChild, writeTo, true);
    writeTo.push("}");
  }
};


const processTextFunctionsEpub = {
  EXERCISE: (node, writeTo) => {
    processExerciseEpub(node, writeTo);
  },
  FIGURE: (node, writeTo) => {
    processFigureEpub(node, writeTo);
  },
  SECTION: (node, writeTo) => {
    writeTo.push("\\section{");
    addName(node, writeTo);
    recursiveProcessText(node.firstChild, writeTo);
  },
  JAVASCRIPTINLINE: (node, writeTo) => {
    writeTo.push("{\\lstinline[mathescape=true, language=JavaScript]$");
    recursiveProcessPureText(node.firstChild, writeTo, { removeNewline: true });
    writeTo.push("$}");
  },
  SNIPPET: (node, writeTo) => {
    processSnippetEpub(node, writeTo);
  },
  SUBSECTION: (node, writeTo) => {
    writeTo.push("\\subsection{");
    addName(node, writeTo);
    recursiveProcessText(node.firstChild, writeTo);
  },
  SUBHEADING: (node, writeTo) => {
    writeTo.push("\\paragraph{");
    addName(node, writeTo);
    recursiveProcessText(node.firstChild, writeTo);
  },
  SUBSUBSECTION: (node, writeTo) => processTextFunctionsEpub["SUBHEADING"](node, writeTo),    
}

export let processTextFunctions = processTextFunctionsDefault;

/*
export const switchParseFunctions = (parseType) => {
  if (parseType == "pdf") {
    processTextFunctions = processTextFunctionsDefault;
  } else if (parseType == "epub") {
    console.log('using parsetype epub')
    processTextFunctions = {
      ...processTextFunctionsDefault,
      ...processTextFunctionsEpub,
    };
  }
}
*/

export const processText = (node, writeTo) => {
  const name = node.nodeName;
  if (processTextFunctions[name]) {
    processTextFunctions[name](node, writeTo);
    return true;
  } else {
    if (replaceTagWithSymbol(node, writeTo) || tagsToRemove.has(name)) {
      return true;
    } else if (ignoreTags.has(name)) {
      recursiveProcessText(node.firstChild, writeTo);
      return true;
    } else if (preserveTags.has(name)){
      writeTo.push("<"+ name + ">");
      recursiveProcessText(node.firstChild, writeTo);
      writeTo.push("</"+ name + ">");
      return true;
    }
  }
  console.log("WARNING Unrecognised Tag:\n" + node.toString() + "\n");
  return false;
};

export const recursiveProcessText = (node, writeTo) => {
  if (!node) return;
  processText(node, writeTo);
  return recursiveProcessText(node.nextSibling, writeTo);
};

const beforeContentWrapper = (writeTo) => {
  writeTo.push("<div id='permalink-msg'>\n");
  writeTo.push("<div class='screen'>\n");
  writeTo.push("\t<div class='alert alert-success'>\n");
  writeTo.push("\t\t<strong>Permalink copied!</strong>\n");
  writeTo.push("\t</div>\n");
  writeTo.push("</div>\n");
  writeTo.push("</div>\n\n");
  writeTo.push("<div class='chapter-content'>\n");
}

const afterContentWrapper = (writeTo, filename) => {

  console.log("index is " + chapArrIndex);
  writeTo.push("<div class='nav'>\n");

  if (chapArrIndex > 0) {
    writeTo.push("<button type='button' class='btn btn-secondary' style='background-color: #fff;'>\n");
    writeTo.push("<a href='" + allFilepath[chapArrIndex - 1] +"'>&lt; Previous</a>\n");
    writeTo.push("</button>");
  }
  writeTo.push("<div style='flex-grow: 1;'></div>\n");
  
  if (chapArrIndex < allFilepath.length) {
    writeTo.push("<button type='button' class='btn btn-secondary' style='background-color: #fff;'>\n");
    writeTo.push("<a class='scroll-next' href='" + allFilepath[chapArrIndex + 1] +"'>Next &gt;</a>\n");
    writeTo.push("</button>");
  }
  writeTo.push("</div>");
  writeTo.push("<div class='chapter_sign'>\n");
  writeTo.push(chapterIndex + " " + chapterTitle);
  writeTo.push("</div>");
  writeTo.push("\t<div class='next-page'></div>");
  writeTo.push("</div>");
}

export const parseXML = (doc, writeTo, filename) => {
  //console.log(allFilepath);
  chapterIndex = tableOfContent[filename][0];
  chapterTitle = tableOfContent[filename][1];
  //console.log(chapterIndex + " " + chapterTitle);
  paragraph_count = 0;
  footnote_count = 0;
  display_footnote_count = 0;
  snippet_count = 0;
  chapArrIndex = allFilepath.indexOf(path.join(outputDirectory,filename));

  beforeContentWrapper(writeTo);
  recursiveProcessText(doc.documentElement, writeTo);
  afterContentWrapper(writeTo, filename);
}

/*
const permalink_wrap = (node, name) => {
  const permalink = doc.createElement('QUOTE');
  permalink.setAttribute('name', name);
  permalink.setAttribute('class', 'permalink');
  const wrapper_div = doc.createElement('QUOTE');
  wrapper_div.setAttribute('class', 'permalink');
  node.appendChild(wrapper_div).appendChild(permalink)
};
*/



