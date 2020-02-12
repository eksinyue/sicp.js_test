import fs from "fs";
import util from 'util';
import path from "path";

import xpath from "xpath";
import { DOMParser as dom } from "xmldom";

import { switchParseFunctions, parseXML } from './parseXML';
//import { setupSnippets } from './processingFunctions/processSnippet';
import { preamble, ending } from './htmlContent';

const inputDir = path.join(__dirname, "../xml");
const outputDir = path.join(__dirname, "../html");

const readdir = util.promisify(fs.readdir);
const open = util.promisify(fs.open);
const readFile = util.promisify(fs.readFile);

/*
const latexmkrcContent = `$pdflatex = "xelatex %O %S";
$pdf_mode = 1;
$dvi_mode = 0;
$postscript_mode = 0;`;
*/

const ensureDirectoryExists = (path, cb) => {
  fs.mkdir(path, err => {
    if (err) {
      if (err.code == "EEXIST") cb(null);
      // ignore the error if the folder already exists
      else cb(err); // something else went wrong
    } else cb(null); // successfully created folder
  });
};

async function xmlToHtml(filepath, filename, isSetupSnippet) {
  const fullFilepath = path.join(inputDir, filepath, filename);
  const fileToRead = await open(fullFilepath, "r")
  // if (err) {
  //   console.log(err);
  //   return;
  // }
  const data = await readFile(fileToRead, { encoding: "utf-8" })
  // if (err) {
  //   console.log(err);
  //   return;
  // }
  const doc = new dom().parseFromString(data);
  const writeTo = [];
  /*
  if (isSetupSnippet) {
    setupSnippets(doc.documentElement);
    return;
  }
  */
  console.log("parsing: " + path.join(filepath, filename));
  // parsing over here
  parseXML(doc, writeTo, path.join(filepath, filename));

  ensureDirectoryExists(path.join(outputDir, filepath), err => {
    if (err) {
      console.log(err);
      return;
    }
    const outputFile = path.join(
      outputDir,
      filepath,
      filename.replace(/\.xml$/, "") + ".html"
    );
    const stream = fs.createWriteStream(outputFile);
    stream.once("open", fd => {
      stream.write(writeTo.join(""));
      stream.end();
    });
  });
};

async function recursiveXmlToHtml(filepath, isSetupSnippet) {
  let files;
  const fullPath = path.join(inputDir, filepath);
  files = await readdir(fullPath);
  const promises = [];
  files.forEach(file => {
    if (file.match(/\.xml$/)) {
      //console.log(file + " being processed");
      promises.push(
        xmlToHtml(filepath, file, isSetupSnippet)
      );
    } else if (fs.lstatSync(path.join(fullPath, file)).isDirectory()) {
      promises.push(
        recursiveXmlToHtml(path.join(filepath, file), isSetupSnippet)
      );
    }
  });
  await Promise.all(promises);
};

const createMainHtml = () => {
  const chaptersFound = [];
  const files = fs.readdirSync(inputDir);
  files.forEach(file => {
    if (file.match(/chapter/)) {
      chaptersFound.push(file);
    }
  });
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  const stream = fs.createWriteStream(path.join(outputDir, "sicpjs.html"));
  stream.once("open", fd => {
    stream.write(preamble);
    chaptersFound.forEach(chapter => {
      const pathStr = "./" + chapter + "/" + chapter + ".html";
      stream.write("\\input{" + pathStr + "}\n");
    });
    stream.write(ending);
    stream.end();
  });

  // makes the .latexmkrc file
  /*
  const latexmkrcStream = fs.createWriteStream(
    path.join(outputDir, ".latexmkrc")
  );
  latexmkrcStream.once("open", fd => {
    latexmkrcStream.write(latexmkrcContent);
    latexmkrcStream.end();
  });
  */
};

async function main() {
  const type = process.argv[2];
  if (type) {
    switchParseFunctions(type);
  }
  createMainHtml();
  console.log("setup snippets");
  
  await recursiveXmlToHtml("", true);
  console.log("setup snippets done\n");
  recursiveXmlToHtml("", false);
  
};

main();
