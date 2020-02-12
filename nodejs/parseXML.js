import {getChildrenByTagName, ancestorHasTag} from './utilityFunctions';
import {
  checkIndexBadEndWarning
} from "./processingFunctions/warnings.js";

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

let paragraph_number = 0;
let footnote_number = 0;
let chapterNumber = "";

const tagsToRemove = new Set([
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
  "LABEL"
]);
// SOLUTION tag handled by processSnippet

const ignoreTags = new Set([
  "CHAPTERCONTENT",
  "JAVASCRIPT",
  "NOBR",
  "span",
  "SPLITINLINE"
]);

const preserveTags = new Set([
  "B",
  "EM",
  "QUOTE",
  "SPLIT",
  "UL",
  "LI",
  "SECTIONCONTENT"
]);

const processTextFunctionsDefault = {

  "#text": (node, writeTo) => {
    /*
    const trimedValue = node.nodeValue
      .replace(/[\r\n]+/, " ")
      .replace(/\s+/g, " ")
      .replace(/\^/g, "\^{}")
      .replace(/%/g, "\\%");
    if (trimedValue.match(/&(\w|\.)+;/)) {
      processFileInput(trimedValue.trim(), writeTo);
    } else {
      writeTo.push(trimedValue);
    }
    */
    writeTo.push(node.nodeValue);
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
    /*
    writeTo.push("\\chapter{");
    addName(node, writeTo);
    writeTo.push("\\pagestyle{main}\n");
    recursiveProcessText(node.firstChild, writeTo);
    */  
    writeTo.push("<div class='chapter-title'>");
    writeTo.push("\n\t<div class='permalink'>");
    writeTo.push("\n\t\t<a name='top' class='permalink'>");
    
    writeTo.push(chapterNumber + " ");
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    processText(childNode, writeTo);

    writeTo.push("</a>");
    writeTo.push("\n\t</div>");
    writeTo.push("\n</div>");

    writeTo.push("\n\t<div class='chapter-text'>");
    writeTo.push("\n\t\t<div class='SECTION'>");
    writeTo.push("<CHAPTER>");
    
    addName(node, writeTo);
    recursiveProcessText(childNode.nextSibling, writeTo);
    writeTo.push("\n</CHAPTER>");
  },

  CITATION: (node, writeTo) => {
    // Currently just text. Not linked to biblography.
    const text = node.getElementsByTagName("TEXT")[0];
    if (text) {
      recursiveProcessText(text.firstChild, writeTo);
    } else {
      recursiveProcessText(node.firstChild, writeTo);
    }
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
    footnote_number += 1;
    writeTo.push("<a class='superscript' id='footnote-" + footnote_number + "' href='#footnote-" + footnote_number + "'>[" + footnote_number + "]</a>");
    let cloneNode = node.cloneNode(true);
    cloneNode.nodeName = "displayFootnote";
    node.parentNode.parentNode.appendChild(cloneNode); 
    recursiveProcessText(node.nextSibling.nextSibling, writeTo);
  },

  displayFootnote: (node, writeTo) => {
    writeTo.push("<hr>");
    writeTo.push("<div class='footnote'>");
    writeTo.push("\n<a class='footnote-number' id='footnote-" + footnote_number + "' href='#footnote-link-" + footnote_number + "'>");
    writeTo.push("[" + footnote_number + "] </a><FOOTNOTE>");
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
    paragraph_number += 1;
    writeTo.push("<div class='permalink'>");
    writeTo.push("\n<a name='p" + paragraph_number + "' class='permalink'></a>");
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
    
    writeTo.push(chapterNumber + " ");
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    processText(childNode, writeTo);

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
    recursiveProcessText(childNode.nextSibling, writeTo);
    writeTo.push("\n</SECTION>");
  },

  SUBHEADING: (node, writeTo) => {
    writeTo.push("\\subsubsection{");
    addName(node, writeTo);

    recursiveProcessText(node.firstChild, writeTo);
  },
  SUBSUBSECTION: (node, writeTo) => processTextFunctions["SUBHEADING"](node, writeTo),

  SCHEMEINLINE: (node, writeTo) =>
    processTextFunctions["JAVASCRIPTINLINE"](node, writeTo),
  JAVASCRIPTINLINE: (node, writeTo) => {
    writeTo.push("{\\lstinline[mathescape=true]$");
    recursiveProcessPureText(node.firstChild, writeTo, { removeNewline: true });
    writeTo.push("$}");
  },

  SNIPPET: (node, writeTo) => {
    processSnippet(node, writeTo);
  },

  SUBHEADING: (node, writeTo) => {
    writeTo.push("\\subsubsection{");
    addName(node, writeTo);
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
    
    writeTo.push(chapterNumber + " ");
    let childNode = node.firstChild;
    while (childNode.nodeName != "NAME") {
      childNode = childNode.nextSibling;
    }
    processText(childNode, writeTo);

    writeTo.push("</a>");
    writeTo.push("\n\t</div>");
    writeTo.push("\n</div>");

    writeTo.push("\n\t<div class='chapter-text'>");
    writeTo.push("\n\t\t<div class='SECTION'>");
    writeTo.push("<SUBSECTION>");
    addName(node, writeTo);
    
    if (node.getAttribute("WIP") === "yes") {
         writeTo.push("\\begin{center}\\fbox{\\textcolor{red}{Note: this section is a work in progress!}}\\end{center}")
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

let processTextFunctions = processTextFunctionsDefault;

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

const generateChapterNumber = (filename) => {
  let chapterNumber = "";
  if (filename.match(/chapter/)) {
    // match the number after string "chapter"
    chapterNumber += filename.match(/(?<=chapter)\d+/g)[0];
  } 
  if (filename.match(/section/)) {
    // "section"
    chapterNumber += "." + filename.match(/(?<=section)\d+/g)[0];  
  } 
  if (filename.match(/subsection/)) {
    // "subsection"
    chapterNumber += "." + filename.match(/(?<=subsection)\d+/g)[0];
  } 
  //console.log(chapterNumber);
  return chapterNumber;
}

export const parseXML = (doc, writeTo, filename) => {
  chapterNumber = generateChapterNumber(filename);
  paragraph_number = 0;
  footnote_number = 0;
  recursiveProcessText(doc.documentElement, writeTo);
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



