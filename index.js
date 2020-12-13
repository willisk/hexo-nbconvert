#! /usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const {
  execSync
} = require("child_process");
const del = require('del');

const nbDir = "/Users/k/Google Drive/Blog/";
const mdDir = "/Users/k/git/srcPages/source/";
const blogAssetDir = "/Users/k/git/Blog-Assets/";

const nbconvertCmd = "jupyter nbconvert --to markdown";
const nbconvertOpts = "--NbConvertApp.output_files_dir={notebook_name}";
const strippedTag = "-code";
const args = process.argv[2] || '';

const rCut = /(\`{3}[^\n]*)\n[^\n]*\+{3}CUT\+{3}([\s\S]*?\`{3})/g;
const rFront = /[\s\S]*?(\-{3}[\s\S]+?\-{3})/;
const rEOF = /#EOF[\s\S]*/;

const rStrip = /strip-notebook:\s*(\w+)/;
const rDate = /date:\s*(\d\d\d\d)/;
const rPng = /\!\[(.+?)\]\((?!data\:)(.*\.(?:png|jpg))\)/g;

processDir(nbDir, mdDir + "_posts")
processDir(nbDir + "drafts", mdDir + "_drafts")


function file_up_to_date(fileName, date) {
  if (fs.existsSync(fileName))
    return (fs.lstatSync(fileName).mtime < date) ? false : true;
  return false;
}

function nb_sync(source, target, mtime, syncMD = false) {

  if (file_up_to_date(target + '.md', mtime))
    return false; // already up to date

  // sync
  del.sync(target, {
    force: true
  });

  console.log('SYNCING ' + source + ' --> ' + target);
  if (fs.existsSync(source)) //copy asset folder
    fs.copySync(source, target);
  if (fs.existsSync(source + '.md')) //copy .md
    fs.copySync(source + '.md', target + '.md');
  return true;
}

function stripIpynb(fileIn, fileOut) {
  let data = JSON.parse(fs.readFileSync(fileIn));
  let eof = false;
  const rCutTEMP = /\+{3}CUT\+{3}/; // NOTE: Hacky, change to parse each ipynb like this
  data.cells = data.cells.filter(cell => {
    if (!eof && cell.cell_type == "markdown")
      eof = rEOF.exec(cell.source[0]);
    let skipCell = rCutTEMP.exec(cell.source[0]);
    return !skipCell && !eof && cell.cell_type == "code";
  });
  fs.writeFileSync(fileOut, JSON.stringify(data));
}

function processDir(dir, dirOut, relPath = "", ignoreDir = "drafts") {

  var files = fs.readdirSync(dir);

  for (var i = 0; i < files.length; i++) {
    var fileName = path.join(dir, files[i]);
    var stat = fs.lstatSync(fileName);

    if (stat.isDirectory()) { //recursion
      if (files[i] != ignoreDir) {
        processDir(fileName, path.join(dirOut, files[i]), path.join(relPath, files[i]));
      }
    } else {
      let filetype;
      if (fileName.indexOf('.ipynb') >= 0)
        filetype = '.ipynb';
      else if (fileName.indexOf('.md') >= 0)
        filetype = '.md';
      else
        continue;

      const nbName = files[i].split(filetype)[0];
      const nbIn = path.join(dir, nbName);
      const nbOut = path.join(dirOut, nbName);
      const fileNameOut = nbOut + ".md";
      // const nbHexoSync = path.join(postDirHexo, nbName);

      if (args == '-f' || nb_sync(nbIn, nbOut, stat.mtime)) // file modified
      {
        // convert .ipynb to .md
        if (filetype == '.ipynb') {
          let execCmd = `${nbconvertCmd} '${fileName}' --output-dir='${dirOut}' ${nbconvertOpts}`;
          execSync(execCmd);
        } else if (filetype == '.ipynb') {
          fs.copySync()
        }

        var content = fs.readFileSync(fileNameOut, 'utf8');

        // cut out everything before front-matter and parse date, strip-opt
        let date;
        let stripOpt = false;
        content = content.replace(rFront, (match, fmatter) => {
          let lineDate = rDate.exec(fmatter);
          date = lineDate ? parseInt(lineDate[1]) : 2020; // you have a year to make this more robust
          fmatter.replace(rStrip, ($0, opt) => { //parse option to strip notebook
            stripOpt = opt;
            return '';
          })
          return fmatter;
        });

        // change png path to /2020/path
        content = content.replace(rPng, `![$1](/${relPath}/$2)`);

        // cut out all code starting with +++CUT+++
        content = content.replace(rCut, '');

        // cut out everything at #EOF
        content = content.replace(rEOF, '');

        if (stripOpt) {
          let dir = path.join(blogAssetDir, nbName);
          if (!fs.existsSync(dir))
            fs.mkdirSync(dir);
          let nbStrippedOut = path.join(dir, nbName) + strippedTag + ".ipynb";
          stripIpynb(fileName, nbStrippedOut);
        }

        // write content to file
        fs.writeFileSync(fileNameOut, content, 'utf8');
      }
    }
  }


}