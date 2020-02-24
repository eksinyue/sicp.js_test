import {
    recursiveProcessText
} from "./parseXML.js";
//import {tableOfContent} from "./index.js";

const generateChapterIndex = (filename) => {
    let chapterIndex = "";
    if (filename.match(/chapter/)) {
      // match the number after string "chapter"
      chapterIndex += filename.match(/(?<=chapter)\d+/g)[0];
    } 
    if (filename.match(/section/)) {
      // "section"
      chapterIndex += "." + filename.match(/(?<=section)\d+/g)[0];  
    } 
    if (filename.match(/subsection/)) {
      // "subsection"
      chapterIndex += "." + filename.match(/(?<=subsection)\d+/g)[0];
    } 
    if (filename.match(/others/)) {
        // account for files in others folder
        chapterIndex += filename.match(/[^/]+(?=\.)/g)[0];
    } 
    
    //console.log(chapterNumber);
    return chapterIndex;
}

const truncateTitle = (chapterTitle) => {
    let truncatedTitle = "";
    chapterTitle.forEach(item => (item.match(".*[a-zA-Z]+.*")) 
            ? truncatedTitle += (" " + item.trim()) : null);
    return truncatedTitle;
}
  
const recursiveFindTitle = (node, chapterTitle) => {
    if (!node) return;
    if (node.nodeName == "NAME"){
        // using recursiveProcessText function from parseXML.js
        recursiveProcessText(node.firstChild, chapterTitle);
    } else {
        recursiveFindTitle(node.firstChild, chapterTitle);
    }
    if (!chapterTitle[0]) return recursiveFindTitle(node.nextSibling, chapterTitle);
    return;
};

export const generateTOC = (doc, addToTOC, filename) => {
    
    addToTOC[0] = generateChapterIndex(filename);
    //console.log("chapter number is " + addToTOC[0]);

    const chapterTitle = [];
    recursiveFindTitle(doc.documentElement, chapterTitle);
    addToTOC[1] = truncateTitle(chapterTitle);
    //console.log("chapter title is" + addToTOC[1]);
}