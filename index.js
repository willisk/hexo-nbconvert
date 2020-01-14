#! /usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const { execSync } = require("child_process");

const root = "/Users/k/Google Drive/Colab Notebooks/blog/";
const postDir = path.join(root, "_posts");
const nbDir = path.join(root, "ipynb");
const postDirHexo = "/Users/k/git/willisk.github.io/source/_posts";

const CUTCODE_START = '```python\n### cutCode ###';
const CUTCODE_END = '### cutCode ###\n```';

var convertCmd = "jupyter nbconvert --to markdown "
var convertCfg = " --output-dir='" + postDir + "' --NbConvertApp.output_files_dir={notebook_name}"

var files = fs.readdirSync(nbDir);


for(var i = 0;i < files.length; i++){
  var fileName = path.join(nbDir, files[i]);
  var fileNameOut = path.join(postDir, files[i]).split('.ipynb')[0] + ".md";
  var stat = fs.lstatSync(fileName);
  if (!stat.isDirectory() && fileName.indexOf('.ipynb')>=0){
    var execCmd = convertCmd + " '" + fileName + "' " +  convertCfg;

    //convert
    //execSync(execCmd);

    //cut lines
    var modified = false;
    var data = fs.readFileSync(fileNameOut, 'utf8');

    var cut = data;
    var spl = data.split('---');
    if (spl.length < 3){
      console.log('--- WARNING: No Frontmatter set for ' + fileNameOut);
    }
    else {
      var date = spl[1].split('date: ')[1].split(' ')[0].split('-');
      var assetDir = date.slice(0,2).join('/') + '/';

      if( spl[0] != "" ){
        cut = '---' + spl.slice(1).join('---');
        modified = true;
      }

      spl = cut.split('![png](');
      if (spl.length != 1 && !spl[1].includes(assetDir)){
        cut = spl.join('![png](' + assetDir);
        modified = true;
      }
    }

    spl = cut.split(CUTCODE_START);
    if (spl.length != 1){
      cut = spl.map( (x) => {a = x.split(CUTCODE_END); return a[a.length-1];}).join('');
      modified = true;
    }

    if (modified){
      console.log('MODIFYING ' + fileNameOut);
      fs.writeFileSync(fileNameOut, cut, 'utf8');
    }
  }
}

console.log('COPYING to ' + postDirHexo);
fs.copySync(postDir, postDirHexo);

