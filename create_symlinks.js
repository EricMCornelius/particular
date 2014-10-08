#!/usr/bin/env node

var wrench = require('wrench');
var fs = require('fs');
var path = require('path');

var dir = '/home/ecornelius/Downloads/patches';

var files = 
  wrench.readdirSyncRecursive(dir)
        .map(function(file) { return path.resolve(dir, file); })
        .map(function(file) { 
          var base = path.basename(file);
          var note = base.split(/[.-]/)[2];
          if (!note) return {};

          note = note.replace('#', 's');

          return {
            note: note,
            source: file,
            target: path.resolve('public/samples', note + '.wav')
          };
        })
        .filter(function(rec) {
          return rec.note;
        })
        .forEach(function(rec) {
          fs.symlinkSync(rec.source, rec.target);
        });

console.log(files);
