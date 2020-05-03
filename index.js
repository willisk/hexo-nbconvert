#! /usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const { execSync } = require("child_process");
const del = require('del');

const nbDir = "/Users/k/Google Drive/Blog/";
const mdDir = "/Users/k/git/srcPages/source/";

var nbconvertCmd = "jupyter nbconvert --to markdown"
var nbconvertOpts = "--NbConvertApp.output_files_dir={notebook_name}"

var args = process.argv[2] || '';
const rCut = /(\`{3}[^\n]*)\n[^\n]*\+{3}CUT\+{3}([\s\S]*?\`{3})/g;
const rFront = /[\s\S]*?(\-{3}[\s\S]+?\-{3})/;
const rEOF = /#EOF[\s\S]*/;

processDir(nbDir, mdDir + "_posts")
processDir(nbDir + "drafts", mdDir + "_drafts")


function file_up_to_date(fileName, date) {
  if (fs.existsSync(fileName))
    return (fs.lstatSync(fileName).mtime < date) ? false : true;
  return false;
}

function nb_sync(source, target, mtime, syncNotebook = false) {

  if (file_up_to_date(target + '.md', mtime))
    return false;   // already up to date

  // sync
  del.sync(target, { force: true });

  console.log('SYNCING ' + source + ' --> ' + target);
  if (fs.existsSync(source))
    fs.copySync(source, target);
  if (syncNotebook)
    fs.copySync(source + '.md', target + '.md');
  return true;
}

function processDir(dir, dirOut) {

  var files = fs.readdirSync(dir);

  for (var i = 0; i < files.length; i++) {
    var fileName = path.join(dir, files[i]);
    var stat = fs.lstatSync(fileName);

    if (!stat.isDirectory() && fileName.indexOf('.ipynb') >= 0) {
      const nbName = files[i].split('.ipynb')[0];
      const nbIn = path.join(dir, nbName);
      const nbOut = path.join(dirOut, nbName);
      const fileNameOut = nbOut + ".md";
      // const nbHexoSync = path.join(postDirHexo, nbName);

      if (args == '-f' || nb_sync(nbIn, nbOut, stat.mtime))  // file modified
      {
        // convert .ipynb to .md
        let execCmd = `${nbconvertCmd} '${fileName}' --output-dir='${dirOut}' ${nbconvertOpts}`;
        execSync(execCmd);

        var content = fs.readFileSync(fileNameOut, 'utf8');

        // cut out everything before front-matter and parse date
        let rDate = /date:\s*(\d\d\d\d)/;
        let date;
        content = content.replace(rFront, (match, fmatter) => {
          let lineDate = rDate.exec(fmatter);
          date = lineDate ? parseInt(lineDate[1]) : 2020;   // you have a year to make this more robust
          return fmatter;
        });

        // change png path to /2020/path
        let rPng = /(\!\[png\]\()/g;
        content = content.replace(rPng, `$1/${date}/`);

        // cut out all code starting with +++CUT+++
        content = content.replace(rCut, '');

        // cut out everything at #EOF
        content = content.replace(rEOF, '');

        // write content to file
        fs.writeFileSync(fileNameOut, content, 'utf8');
      }

      // sync .md and folder to Hexo dir // changed to symlink
      //nb_sync(nbOut, nbHexoSync, stat.mtime, syncNotebook = true);
    }
  }


}