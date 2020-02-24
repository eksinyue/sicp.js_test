import lzString from "lz-string";
import {
  checkLongLineWarning,
  missingRequireWarning,
  missingExampleWarning,
  repeatedNameWarning
} from "./warnings.js";
import { chapterIndex, recursiveProcessText, processText } from '../parseXML';
import recursiveProcessPureText from "./recursiveProcessPureText";

const snippetStore = {};

export const setupSnippets = (node) => {
	const snippets = node.getElementsByTagName("SNIPPET");
	for (let i = 0; snippets[i]; i++) {
		const snippet = snippets[i];
		const jsSnippet = snippet.getElementsByTagName("JAVASCRIPT")[0];
		const snippetName = snippet.getElementsByTagName("NAME")[0];
		if (snippetName && jsSnippet) {
      const nameStr = snippetName.firstChild.nodeValue;
      if (snippetStore[nameStr]) {
        repeatedNameWarning(nameStr);
        return
      }
      const codeArr = [];
	    recursiveProcessPureText(jsSnippet.firstChild, codeArr);
	    const codeStr = codeArr.join("").trim();

	    const requirements = snippet.getElementsByTagName("REQUIRES");
	    const requireNames = [];
	    for (let i = 0; requirements[i]; i++) {
	      requireNames.push(requirements[i].firstChild.nodeValue);
	    }

	    snippetStore[nameStr] = { codeStr, requireNames };
    }
	}
}

const sourceAcademyURL = "https://sourceacademy.nus.edu.sg";
// to change to localhost if required
// http://localhost:8075 

const recursiveGetRequires = (name, seen) => {
	if (seen.has(name)) return;
	seen.add(name);
	const snippetEntry = snippetStore[name];
	if (!snippetEntry) {
		missingRequireWarning(name);
		return;
	}
	for (const requirement of snippetEntry.requireNames) {
		recursiveGetRequires(requirement, seen);
	}
}

export const processSnippet = (node, writeTo) => {
  if (node.getAttribute("HIDE") == "yes") {
    return;
  }

  const jsSnippet = node.getElementsByTagName("JAVASCRIPT")[0];
  if (jsSnippet) {
    const codeArr = [];
    recursiveProcessPureText(jsSnippet.firstChild, codeArr);
    const codeStr = codeArr.join("").trim();

    // Do warning for very long lines if no latex
    if (node.getAttribute("LATEX") !== "yes") {
      checkLongLineWarning(codeStr);
    }

    if (node.getAttribute("EVAL") === "no") {
      writeTo.push("<pre class='prettyprint no-eval'>\n");
      writeTo.push(codeStr);
      writeTo.push("\n</pre>");
    } else {

      writeTo.push("<pre class='prettyprint' title='Evaluate Javascript expression'");

    	let reqStr = '';
    	const snippetName = node.getElementsByTagName("NAME")[0];
    	if (snippetName) {
    		const nameStr = snippetName.firstChild.nodeValue;
    		const reqSet = new Set();
    		recursiveGetRequires(nameStr, reqSet);
    		const reqArr = [];
    		for (const reqName of reqSet) {
    			const snippetEntry = snippetStore[reqName]; 
    			if (snippetEntry && reqName!==nameStr) {
	    			reqArr.push(snippetEntry.codeStr);
			      reqArr.push("\n");
    			}
    		}
    		reqStr = reqArr.join("");
    	} else {
		    const requirements = node.getElementsByTagName("REQUIRES");
		    const reqArr = [];
		    for (let i = 0; requirements[i]; i++) {
		      const required = requirements[i].firstChild.nodeValue;
		      if (snippetStore[required]) {
		        reqArr.push(snippetStore[required].codeStr);
		        reqArr.push("\n");
		      } else {
		        missingRequireWarning(required);
		      }
		    }
		    reqStr = reqArr.join("");
    	}

      const examples = node.getElementsByTagName("EXAMPLE");
      const exampleArr = [];
      for (let i = 0; examples[i]; i++) {
      	const example = examples[i].firstChild.nodeValue;
	      if (snippetStore[example]) {
	        exampleArr.push("\n\n");
	        exampleArr.push(snippetStore[example].codeStr);
	      } else {
	        missingExampleWarning(example);
	      }
      }
      const exampleStr = exampleArr.join("");

      // make url for source academy link
      const compressed = lzString.compressToEncodedURIComponent(
        reqStr + codeStr + exampleStr
      );
      const chap = chapterIndex.substring(0,1);
      const ext = "";
      const url =
        sourceAcademyURL +
        "/playground#chap=" +
        chap +
        ext +
        "&prgrm=" +
        compressed;

      const chunks = (codeStr + "\n").match(/^((?:.*?[\r\n]+){1,6})((?:.|\n|\r)*)$/);
      // 6 lines plus rest
      writeTo.push(
        "\n\\begin{lrbox}{\\lstbox}\n\\begin{JavaScriptClickable}\n"
      );
      writeTo.push(chunks[1]);
      writeTo.push(
        "\\end{JavaScriptClickable}\n\\end{lrbox}"
      );

      if (chunks[2]) {
        writeTo.push("\n\\begin{JavaScriptClickable}\n");
        writeTo.push("/*!\\href{" + url + "}{\\usebox\\lstbox}!*/\n")
        writeTo.push(chunks[2]);
        writeTo.push("\n\\end{JavaScriptClickable}");
      } else {
        writeTo.push("\n\n\\href{" + url + "}{\\usebox\\lstbox}")
      }

      writeTo.push("\n</pre>");
      writeTo.push("\n\n");
    }
  }
};

export default processSnippet;
