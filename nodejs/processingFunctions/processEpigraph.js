import { recursiveProcessText, processText } from '../parseXML';

export const processEpigraph = (node, writeTo) => {
  writeTo.push("<blockquote class='blockquote'>");
  let child = node.firstChild;
  let attribution = null;
  for (child; child; child = child.nextSibling) {
    if (child.nodeName == "ATTRIBUTION") {
      attribution = child;
      break;
    } else {
      processText(child, writeTo);
    }
  }

  if (attribution) {
    writeTo.push("<div class='chapter-text-ATTRIBUTION'>\n");

    const author = attribution.getElementsByTagName("AUTHOR")[0];
    if (author) {
      writeTo.push("<span class='chapter-text-AUTHOR'>");
      recursiveProcessText(author.firstChild, writeTo);
      writeTo.push("</span>\n");
    }

    child = attribution.getElementsByTagName("TITLE")[0];
    if (child) {
      if (author) writeTo.push("<span class='chapter-text-TITLE'>");
      recursiveProcessText(child.firstChild, writeTo);
      writeTo.push("</span>\n");
    }

    child = attribution.getElementsByTagName("DATE")[0];
    if (child) {
      writeTo.push("<span class='chapter-text-DATE'>");
      recursiveProcessText(child.firstChild, writeTo);
      writeTo.push("</span>\n");
    }

    child = attribution.getElementsByTagName("INDEX")[0];
    if (child) {
      processText(child, writeTo);
    }
    writeTo.push("</div>\n");
  }
  writeTo.push("</blockquote>\n");
};

export default processEpigraph;
