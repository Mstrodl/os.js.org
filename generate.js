//
// THIS IS AN UGLY-ASS PIECE OF CODE, BUT IT WORKS
// I SHOULD PROBABLY REWRITE THIS SOME TIME
//

Array.prototype.unique = function(){
  var u = {}, a = [];
  for(var i = 0, l = this.length; i < l; ++i){
    if(u.hasOwnProperty(this[i])) {
      continue;
    }
    a.push(this[i]);
    u[this[i]] = 1;
  }
  return a;
};

(function(_fs, _path, _markdown) {
  var ROOT = _path.join(__dirname, 'OSjs');

  var NAMESPACES = [];

  /////////////////////////////////////////////////////////////////////////////
  // HELPERS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * This is a block
   */
  function DocumentationBlock(comment) {
    this.description = '';
    this.api = '';
    this.isClass = false;
    this.className = null;
    this.methodName = null;
    this.extendsFrom = [];
    this.references = [];
    this.link = [];
    this.parameters = [];
    this.returns = null;
    this.returnDescription = null;
    this.parentClass = null;
    this.functionName = null;
    this.comment = comment;
    this.methods = [];
    this.options = {};

    this.parse(comment);
  }

  DocumentationBlock.prototype.parse = function(comment) {
    var lines = comment.split('\n');
    var newlines = [];
    lines.forEach(function(line) {
      var inner = line.match(/^\s*\* (.*)/);
      if ( inner && inner[1] ) {
        newlines.push(inner[1].replace(/\s+/g, ' '));
      }
    });

    var self = this;
    newlines.forEach(function(line) {
      var tmp;
      if ( line.match(/^@param/) ) {
        tmp = line.replace(/^@param\s/, '').split(' ');
        self.parameters.push({
          type: tmp.shift(),
          key: tmp.shift(),
          description: tmp.join(' ')
        });
      } else if ( line.match(/^@option/) ) {
        tmp = line.replace(/^@option\s/, '').split(' ');
        var tmp2 = tmp.shift();

        if ( typeof self.options[tmp2] === 'undefined' ) {
          self.options[tmp2] = [];
        }

        self.options[tmp2].push({
          type: tmp.shift(),
          key: tmp.shift(),
          description: tmp.join(' ')
        });
      } else if ( line.match(/^@return/) ) {
        tmp = line.replace(/^@return\s/, '').split(' ');
        self.returns = tmp.shift();
        if ( tmp.length ) {
          self.returnDescription = tmp.join(' ');
        }
      } else if ( line.match(/^@extends/) ) {
        tmp = line.split(' ', 2);
        self.extendsFrom.push(tmp[1]);
      } else if ( line.match(/^@class/) ) {
        tmp = line.split(' ', 2);
        self.isClass = true;
        if ( tmp[1] ) {
          self.className = tmp[1];
        }
      } else if ( line.match(/^@method/) ) {
        tmp = line.split(' ', 2);
        self.methodName = tmp[1];
        self.parentClass = tmp[1].split('::')[0]
      } else if ( line.match(/^@link/) ) {
        tmp = line.split(' ', 2);
        self.link.push(tmp[1]);
      } else if ( line.match(/^@see/) ) {
        tmp = line.split(' ', 2);
        self.references.push(tmp[1]);
      } else if ( line.match(/^@api/) ) {
        tmp = line.split(' ', 2);
        self.api = tmp[1];
      } else {
        if ( self.description ) {
          self.description += '\n';
          self.description += '\n';
        }
        self.description += line;
      }
    });

    if ( this.api ) {
      if ( this.isClass ) {
        if ( !this.className ) {
          this.className = this.api.split('.').pop();
        }
      } else {
        if ( !this.isMethod ) {
          this.functionName = this.api.split('.').pop();
        }
      }
    }
  };

  DocumentationBlock.prototype.markdown = function() {
    if ( this.isClass ) {
      var inner = [];
      inner.push(parseMethod.call(this, true));

      this.methods.forEach(function(m) {
        href = createHref(m.methodName);

        inner.push('<div class="section-method" id="' + href + '">');
        inner.push(m.markdown());
        inner.push('</div>');
      });

      return inner.join('\n');
    }

    return parseMethod.call(this);
  };

  function parseNotice(comment) {
    var lines = comment.split('\n');
    var newlines = [];
    lines.forEach(function(line) {
      var inner = line.match(/^\s*\*( (.*))?/);
      if ( inner && inner[1] ) {
        newlines.push(inner[1]);
      } else {
        newlines.push('\n');
      }
    });
    return newlines.join('\n').replace(/^\n+/g, '').replace(/\n+$/, '');
  }

  /////////////////////////////////////////////////////////////////////////////
  // HTML
  /////////////////////////////////////////////////////////////////////////////

  function parseMethod(head) {
    var mark = [];
    var self = this;

    function addToBuffer() {
      var line = Array.prototype.slice.call(arguments).join(' ');
      mark.push(line);
    }

    function createParamList() {
      var lst = [];
      self.parameters.forEach(function(p) {
        lst.push(p.key);
      });
      return '(' + lst.join(', ') + ')';
    }

    if ( this.isClass ) {
      addToBuffer('##', this.className);
    } else {
      if ( this.methodName ) {
        addToBuffer('###', this.methodName.replace('()', createParamList()));
      } else {
        addToBuffer('##', this.api.replace('()', createParamList()));
      }
    }

    if ( this.description ) {
      addToBuffer('<pre>');
      addToBuffer(this.description);
      addToBuffer('</pre>');
    }

    addToBuffer('');

    if ( this.api && this.isClass ) {
      addToBuffer('####', 'Namespace');
      addToBuffer('-', this.api);
    }
    addToBuffer('');

    if ( this.extendsFrom.length ) {
      addToBuffer('####', 'Extends');
      this.extendsFrom.forEach(function(x) {
        addToBuffer('-', x);
      });
      addToBuffer('');
    }

    if ( this.references.length ) {
      addToBuffer('####', 'See');
      this.references.forEach(function(f) {
        addToBuffer('-', f);
      });
      addToBuffer('');
    }

    if ( this.link.length ) {
      addToBuffer('####', 'Links');
      this.link.forEach(function(f) {
        addToBuffer('-', f);
      });
      addToBuffer('');
    }

    if ( this.parameters.length ) {
      addToBuffer('####', this.isClass ? 'Constructor' : 'Parameters');
      addToBuffer('| Name | Type | Description |');
      addToBuffer('| ---  | ---  | --- |');

      this.parameters.forEach(function(p) {
        addToBuffer('|', p.key, '|', p.type, '|', p.description || '', '|');
      });

      if ( this.isClass ) {
        addToBuffer('\n&nbsp;\n');
      }
    }

    if ( Object.keys(this.options).length ) {
      Object.keys(this.options).forEach(function(o) {
        addToBuffer('####', 'Options for', '*' + o + '*');

        addToBuffer('| Name | Type | Description |');
        addToBuffer('| ---  | ---  | --- |');

        self.options[o].forEach(function(p) {
          addToBuffer('|', p.key, '|', p.type, '|', p.description || '', '|');
        });

        if ( self.isClass ) {
          addToBuffer('\n&nbsp;\n');
        }
      });
    }

    addToBuffer('');
    if ( this.returns !== null ) {
      addToBuffer('####', 'Returns');
      if ( this.returnDescription ) {
        addToBuffer('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<u>' + this.returns + '</u> *' + this.returnDescription + '*');
      } else {
        addToBuffer('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<u>' + this.returns + '</u>');
      }
    }

    return _markdown(mark.join('\n'));
  }

  function generateMenu(fileList) {
    var menuHTML = [];

    var sorted = {};
    fileList.forEach(function(m) {
      var tmp = m.split('/');

      var lastRef;
      tmp.forEach(function(t, i) {
        var isLast = ( i >= tmp.length-1 );
        if ( lastRef ) {
          if ( typeof lastRef[t] === 'undefined' ) {
            if ( isLast ) {
              lastRef[t] = m;
            } else {
              lastRef[t] = {};
            }
          }
          lastRef = lastRef[t];
        } else {
          if ( typeof sorted[t] === 'undefined' ) {
            sorted[t] = {};
          }
          lastRef = sorted[t];
        }
      });
    });

    function generateList(lst, level) {
      var html = '';
      var lastRef;
      Object.keys(lst).forEach(function(l) {
        lastRef = lastRef || l;
        var inner = '';

        if ( typeof lst[l] !== 'string' ) {
          inner += l;
          inner += '<ul>';
          inner += generateList(lst[l], level + 1);
          inner += '</ul>';
        } else {
          var filename = lst[l].replace(/[^A-z0-9_\-]/g, '') + '.html';
          inner += '<a href="' + filename + '">' + l + '</a>';
        }

        html += '<li>' + inner + '</li>';

      });
      return html;
    }

    return generateList(sorted, 0);

    /*
    fileList.forEach(function(m) {
      console.log(m);
      var filename = m.replace(/[^A-z0-9_\-]/g, '') + '.html';
      menuHTML.push('<li><a href="' + filename + '">' + m + '</a></li>');
    });
    return menuHTML.join('\n');
    */
  }

  function generateNamespaces() {
    var list = {};

    function sortList(lastRef) {
      var keys = Object.keys(lastRef).sort();
      var newRef = {};
      keys.forEach(function(k) {
        newRef[k] = lastRef[k];
      });

      return newRef;
    }

    Object.keys(NAMESPACES).forEach(function(n) {
      var tmp = n.split('.');
      var lastRef;

      tmp.forEach(function(l, idx) {
        if ( lastRef ) {
          if ( typeof lastRef[l] === 'undefined' ) {

            if ( idx >= tmp.length-1 ) {
              lastRef[l] = NAMESPACES[n];
            } else {
              lastRef[l] = {};
            }
          }
          lastRef = lastRef[l];
        } else {
          if ( typeof list[l] === 'undefined' ) {
            list[l] = {};
          }
          lastRef = list[l];
        }
      });
    });

    function generateList(lst, level) {
      var html = '';
      var lastRef;
      Object.keys(lst).forEach(function(l) {
        lastRef = lastRef || l;
        var inner = '';

        if ( typeof lst[l] !== 'string' ) {
          inner += l;
          inner += '<ul>';
          inner += generateList(sortList(lst[l]), level + 1);
          inner += '</ul>';
        } else {
          var href = '';


          var tmp = lst[l].split('#');
          href += tmp[0].replace(/[^A-z0-9_\-]/g, '') + '.html';
          href += '#' + tmp[1];
          var cn = '';

          if ( l.match(/\(\)$/) === null ) {
            cn = 'Class';
          }

          inner += '<a class="' + cn + '" href="' + href + '">' + l + '</a>';
        }

        html += '<li>' + inner + '</li>';

      });
      return html;
    }

    return generateList(list, 0);
  }

  /////////////////////////////////////////////////////////////////////////////
  // GENERATION
  /////////////////////////////////////////////////////////////////////////////

  function createHref(n) {
    n = n.replace(ROOT + '/', '');
    return n.replace(/(\.)|(\:\:)/g, '-').replace(/[^A-z0-9_\-]/g, '').toLowerCase();
  }

  function generateNamespace(filename) {
    var raw = _fs.readFileSync(filename).toString('utf-8');
    var comments = raw.match(/((?:\/\*(?:[^*]|(?:\*+[^*\/]))*\*+\/)|(?:\/\/.*))/g);
    var blocks = [];

    comments.forEach(function(comment) {
      if ( comment.match(/^\/\*\*/) ) {
        var block = new DocumentationBlock(comment)
        blocks.push(block);
      }
    });

    filename = filename.replace(ROOT + '/', '');
    blocks.forEach(function(b) {
      if ( b.api ) {
        if ( !NAMESPACES[b.api] ) {
          NAMESPACES[b.api] = filename + '#' + createHref(b.api);
        }
      }
    });
  }

  function readFile(filename) {
    var raw = _fs.readFileSync(filename).toString('utf-8');
    var comments = raw.match(/((?:\/\*(?:[^*]|(?:\*+[^*\/]))*\*+\/)|(?:\/\/.*))/g);
    var blocks = [];
    var notices = [];

    comments.forEach(function(comment) {
      if ( comment.match(/^\/\*\*/) ) { // Docbloc
        var block = new DocumentationBlock(comment)
        blocks.push(block);
      } else if ( comment.match(/^\/\*\@/) ) { // Notice
        notices.push(parseNotice(comment));
      }
    });

    // Now sort them
    var classes = {};
    var functions = [];

    blocks.forEach(function(b) {
      if ( b.isClass ) {
        if ( !classes[b.className] ) {
          classes[b.className] = b;
        }
      } else {
        if ( b.methodName && b.parentClass ) {
          if ( classes[b.parentClass] ) {
            classes[b.parentClass].methods.push(b);
          }
        } else {
          functions.push(b);
        }
      }
    });


    filename = filename.replace(ROOT + '/', '');

    // Finally output
    var output = [];
    output.push('<h1>Overview</h1>');

    output.push('<p><i>' + filename + '</i></p>');

    notices.forEach(function(n) {
      output.push('<pre>');
      output.push(n);
      output.push('</pre>');
    });

    output.push('<h2>Functions</h2>');
    output.push('<ul>');
    functions.forEach(function(f) {
      if ( f.functionName ) {
        var href = createHref(f.api);
        var pre = f.api.replace(f.functionName, '');
        var title = f.functionName;

        output.push('<li>' + pre + '<a href="#' + href + '">' + title + '</a></li>');
      }
    });
    output.push('</ul>');

    output.push('<h2>Classes</h2>');
    output.push('<ul>');
    Object.keys(classes).forEach(function(cn) {
      var href = createHref(classes[cn].api);
      var pre = classes[cn].api;//.replace(cn, '');
      var title = cn;

      output.push('<li>');
      output.push('<a href="#' + href + '">' + title + '</a>' + ' (' + pre + ')');
      output.push('<ul>');
      classes[cn].methods.forEach(function(m) {
        title = m.methodName.split('::').pop();
        href = createHref(m.methodName);
        output.push('<li><a href="#' + href + '">' + title + '</a></li>');
      });
      output.push('</ul>');
      output.push('</li>');
    });
    output.push('</ul>');

    output.push('<h1>Functions</h1>');
    functions.forEach(function(f) {
      if ( f.functionName ) {
        href = createHref(f.api);
        output.push('<div class="section-function" id="' + href + '">');
        output.push(f.markdown());
        output.push('</div>');
      }
    });

    output.push('<h1>Classes</h1>');
    Object.keys(classes).forEach(function(cn) {
      var c = classes[cn];
      if ( c.className ) {
        href = createHref(c.api);
        output.push('<div class="section-class" id="' + href + '">');
        output.push(c.markdown());
        output.push('</div>');
      }
    });

    //output.push('<p><i>Generated: ' + (new Date()) + '</i></p>');
    //output.push('<p><i>Copyright &copy; 2011-2015 Anders Evenrud</i></p>');

    return output.join('\n');
  }

  /////////////////////////////////////////////////////////////////////////////
  // MAIN
  /////////////////////////////////////////////////////////////////////////////

  _markdown.setOptions({
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
  });

  function generate(type, OUTDIR, files) {
    NAMESPACES = [];

    var menu = generateMenu(files);
    var buffers = {};
    var dst;

    files.forEach(function(f) {
      var buffer = readFile(_path.join(ROOT, f));
      generateNamespace(_path.join(ROOT, f));
      buffers[f] = buffer;
    });

    var namespaces = generateNamespaces();
    dst = _path.join(__dirname, 'source', '_api_' + type + '_namespace.erb');
    console.log('=>', dst);
    _fs.writeFile(dst, namespaces);


    dst = _path.join(__dirname, 'source', '_api_' + type + '_menu.erb');
    console.log('=>', dst);
    _fs.writeFile(dst, menu);

    Object.keys(buffers).forEach(function(f) {
      var filename = f.replace(/[^A-z0-9_\-]/g, '') + '.html.erb';
      var html = '---\ntitle: ' + f + '\nlayout: api-' + type + '\n---\n';
      html += buffers[f];

      dst = _path.join(OUTDIR, filename);
      console.log('=>', dst);

      return _fs.writeFileSync(dst, html);
    });
  }

  generate('client', _path.join(__dirname, 'source', 'doc', 'client'), [
    'src/client/javascript/init.js',
    'src/client/javascript/api.js',
    'src/client/javascript/process.js',
    'src/client/javascript/application.js',
    'src/client/javascript/service.js',
    'src/client/javascript/window.js',
    'src/client/javascript/dialog.js',
    'src/client/javascript/windowmanager.js',
    'src/client/javascript/handler.js',
    'src/client/javascript/vfs.js',
    'src/client/javascript/gui.js',
    'src/client/javascript/utils/compability.js',
    'src/client/javascript/utils/dom.js',
    'src/client/javascript/utils/fs.js',
    'src/client/javascript/utils/misc.js',
    'src/client/javascript/utils/xhr.js',
    'src/client/javascript/settings-manager.js',
    'src/client/javascript/package-manager.js',

    'src/client/javascript/helpers/settings-fragment.js',
    'src/client/javascript/helpers/default-application.js',
    'src/client/javascript/helpers/default-application-window.js',
    'src/client/javascript/helpers/iframe-application.js',
    'src/client/javascript/helpers/google-api.js',
    'src/client/javascript/helpers/windows-live-api.js',
    'src/client/javascript/helpers/firefox-marketplace.js',
    'src/client/javascript/helpers/zip-archiver.js',
    'src/client/javascript/helpers/date.js',

    'src/client/javascript/gui/_dataview.js',
    'src/client/javascript/gui/_elements.js',
    'src/client/javascript/gui/_scheme.js',
    'src/client/javascript/gui/containers.js',
    'src/client/javascript/gui/fileview.js',
    'src/client/javascript/gui/iconview.js',
    'src/client/javascript/gui/inputs.js',
    'src/client/javascript/gui/listview.js',
    'src/client/javascript/gui/menus.js',
    'src/client/javascript/gui/misc.js',
    'src/client/javascript/gui/richtext.js',
    'src/client/javascript/gui/tabs.js',
    'src/client/javascript/gui/treeview.js',
    'src/client/javascript/gui/visual.js',

    'src/client/javascript/dialogs/alert.js',
    'src/client/javascript/dialogs/applicationchooser.js',
    'src/client/javascript/dialogs/color.js',
    'src/client/javascript/dialogs/confirm.js',
    'src/client/javascript/dialogs/error.js',
    'src/client/javascript/dialogs/file.js',
    'src/client/javascript/dialogs/fileinfo.js',
    'src/client/javascript/dialogs/fileprogress.js',
    'src/client/javascript/dialogs/fileupload.js',
    'src/client/javascript/dialogs/font.js',
    'src/client/javascript/dialogs/input.js'
  ]);

  generate('server', _path.join(__dirname, 'source', 'doc', 'server'), [
    'src/server/node/http.js',
    'src/server/node/node_modules/osjs/api.js',
    'src/server/node/node_modules/osjs/vfs.js',
    'src/server/node/node_modules/osjs/osjs.js',
    'src/server/node/node_modules/osjs/config.js',
  ]);


})(
  require("node-fs-extra"),
  require("path"),
  require("marked")
);
