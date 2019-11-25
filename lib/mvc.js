class MVC {
  constructor(el, opts, parentInst) {
    this._keypaths = {};
    this._referId = MVC.count++;
    this.el = $(el);
    this.opts = opts;
    this.$parent = (parentInst) ? parentInst : null;
  }
  
  init() {
    var self = this;

    this.buildMVC();
    this.parseDOM(this.el);
    this.parseComputed();

    return new Promise(function(resolve, reject) {
      self.$lifecycle.created.call(self)
      .then(function() {
        self.digest('*', [], '');

        if (self.$lifecycle.ready) {
          self.$lifecycle.ready.call(self);
        }

        resolve(self._referId);
      })
      .catch(function(err) {
        console.log(err)
        reject(err)
      })
    });
  }
  
  buildMVC() {
    // make the mvc object
    this.$model = this.opts.model || {};
    this.$lifecycle = this.opts.lifecycle || {};
    this.$components = {};
    this.$intercom = MVC.intercom;
    this._computed = this.opts.computed || {};
    this._watch = this.opts.watch || {};
    this._builtins = MVC.builtins();

    $.extend(true, this, this.opts.controllers || {});
    $.extend(true, this, MVC.actionSet);    
  }
  
  parseDOM(container) {
    // parse DOM section
    var self = this;
    var mvc = this, el, id, binding, events, keypath, rebind, template, ko, kfs, args, $parent, expr, mustache, result, tagName;
    var html, reHTML = /\{\{\{(.*?)\}\}\}/gi, reText = /\{\{(.*?)\}\}/gi, reSquare = /\[\[(.*?)\]\]/gi, reQuote = /\"/g;

    // replace all {{ text }}  and {{{ html }}} with mvc-text, mvc-html
    var recurReplace = function(el) {
      var c, otxt, txt;

      el.contents().each(function() {
        c = $(this);

        if (c.children().length > 0) {
          recurReplace(c)
        }
        else {
          otxt = txt = c.text();  // snapshots

          // alter original text
          txt = txt.replace(reHTML, function(match) {
            mustache = (match.substring(3, match.length-3)).replace(reQuote, "'");
            return '<span ' + MVC.prefix + '-html="' + mustache + '"></span>';   // in case of filter["args"]
          });

          txt = txt.replace(reText, function(match) {
            mustache = (match.substring(2, match.length-2)).replace(reQuote, "'");
            return '<span ' + MVC.prefix + '-text="' + mustache + '"></span>';
          });

          // if original snapshot != altered snapshot, then replace text
          if (otxt != txt) {
            if (c.prop('nodeType') == 1) {
              c.html(txt)
            }
            else {
              c.replaceWith(txt)
            }
          }
        }
      })
    }

    recurReplace(container);

    // bindings
    MVC.bindList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;

      container.find('[' + binding + ']').each(function() {
        el = $(this);
        id = MVC.getOrSetID(el);
        kfs = MVC.splitKeypathsAndFilters(el.attr(binding));
        keypath = kfs.keypath;
        rebind = kfs.rebind || '';

        var func = {};
        $.extend(true, func, parse.func);

        if (func.bind) {
          func.bind(el, keypath, mvc, kfs.binding);
        }

        mvc.saveKeypath(id, {keypath: keypath, func: func, el: el, filters: kfs.filters, type: parse.binding});

        if (rebind) {
          mvc.saveKeypath(id, {keypath: rebind, func: func, el: el, filters: kfs.filters, type: parse.binding, binding: kfs.binding});
        }
      });
    });

    // attrs
    MVC.attrList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;

      container.find('[' + binding + ']').each(function() {
        el = $(this);
        id = MVC.getOrSetID(el);
        args = MVC.eval(el.attr(binding), 'Invalid Attr Binding', {});

        var func = {};
        $.extend(true, func, parse.func);

        for (var attr in args) {
          mvc.saveKeypath(id, {keypath: args[attr], func: func, el: el, filters: '', type: attr});
        }
      });
    });

    // props
    MVC.propList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;

      container.find('[' + binding + ']').each(function() {
        el = $(this);
        id = MVC.getOrSetID(el);
        args = MVC.eval(el.attr(binding), 'Invalid Prop Binding', {});

        var func = {};
        $.extend(true, func, parse.func);

        for (var prop in args) {
          mvc.saveKeypath(id, {keypath: args[prop], func: func, el: el, filters: '', type: prop});
        }
      });
    });

    // hrefs
    MVC.hrefList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;
      var result;

      container.find('[' + binding + ']').each(function() {
        el = $(this);

        id = MVC.getOrSetID(el);
        template = el.attr(binding);
        result = reSquare.exec(template)
        
        while (result) {
          kfs = MVC.splitKeypathsAndFilters(result[1]);
          keypath = kfs.keypath;

          var func = {};
          $.extend(true, func, parse.func);

          if (func.bind) {
            func.bind(el, keypath, mvc);
          }

          mvc.saveKeypath(id, {keypath: keypath, func: func, el: el, filters: kfs.filters, template: template, type: parse.binding});
          result = reSquare.exec(template)
        }
      });
    });

    // iterators
    MVC.iterList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;

      container.find('[' + binding + ']').each(function() {
        el = $(this);

        id = MVC.getOrSetID(el);
        keypath = el.attr(binding);
        template = el.html();
        el.empty();

        var func = {};
        $.extend(true, func, parse.func);

        if (func.bind) {
          func.bind(el, keypath, mvc);
        }

        mvc.saveKeypath(id, {keypath: keypath, func: func, el: el, template: template, type: parse.binding});
      });
    });

    // select options
    MVC.optionList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;

      container.find('[' + binding + ']').each(function() {
        el = $(this);

        id = MVC.getOrSetID(el);
        kfs = MVC.splitKeypathsAndFilters(el.attr(binding));

        var func = {};
        $.extend(true, func, parse.func);

        if (func.bind) {
          func.bind(el, keypath, mvc);
        }

        for (var p in kfs.binding) {
          mvc.saveKeypath(id, {keypath: kfs.binding[p], func: func, el: el, filters: kfs.filters, type: parse.binding + '-' + p, binding: kfs.binding});
        }

      });
    });

    // select options
    MVC.optgroupList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;

      container.find('[' + binding + ']').each(function() {
        el = $(this);

        id = MVC.getOrSetID(el);
        kfs = MVC.splitKeypathsAndFilters(el.attr(binding));

        var func = {};
        $.extend(true, func, parse.func);

        if (func.bind) {
          func.bind(el, keypath, mvc);
        }

        mvc.saveKeypath(id, {keypath: kfs.binding, func: func, el: el, filters: kfs.filters, type: parse.binding + '-label', binding: kfs.binding});
      });
    });

    // conditionals
    MVC.condList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;

      container.find('[' + binding + ']').each(function() {
        el = $(this);
        id = MVC.getOrSetID(el);
        expr = el.attr(binding);

        var func = {};
        $.extend(true, func, parse.func);
        if (func.bind) {
          func.bind(el, keypath, mvc);
        }

        MVC.getGets(expr).forEach(function(get) {
          mvc.saveKeypath(id, {keypath: get, func: func, el: el, expr: expr, type: parse.binding});
        });
      });
    });

    // events
    MVC.eventList.forEach(function(parse) {
      binding = MVC.prefix + '-' + parse.binding;

      container.find('[' + binding + ']').each(function() {
        el = $(this);
        id = MVC.getOrSetID(el);
        events = MVC.eval(el.attr(binding), 'Invalid Binding', {});

        var func = {};
        $.extend(true, func, parse.func);
        if (func.bind) {
          func.bind(el, keypath, mvc, events);
        }

        mvc.saveKeypath(id, {keypath: '*', func: func, el: el, events: events, type: parse.binding});
      });
    });

    // mobiscroll enhancement
    if (MVC.mobi) {
      mobiscroll.form(container[0]);
    };

    // components
    var recurComponent = function(el, loc) {
      var c, tag, tagName;
      var parents = [];

      for (tag in MVC.components) {
        el.find(tag).each(function() {
          c = $(this);

          var interbi, interuni, interup;
          var inIfElse = false;

          // is element in an if/else?
          c.parents().each(function() {
            var d = $(this);

            if (d.attr(MVC.prefix + '-if') || d.attr(MVC.prefix + '-else')) {
              inIfElse = true;
            }
          })

          if (inIfElse && loc == 'recurse') {
            // I'm in an if/else and the if/else isn't being processed directly (ie recursed).
          }
          else {
            interuni = c.attr(MVC.prefix + '-interuni') || '{}';
            interup = c.attr(MVC.prefix + '-interup') || '{}';
            interbi = c.attr(MVC.prefix + '-interbi') || '{}';

            MVC.component.bind(c, mvc, tag, interuni, interup, interbi)
            .then(function(mid) {
              if (c.children().length > 0) {
                recurComponent(c, 'recurse');
              }
            })
          }
        })
      }
    }

    recurComponent(container, 'top');
  }
  
  parseComputed() {
    // parse and store keypaths of computed fields
    var self = this;
    var computed, func, strfunc, reGet = /\.\$get\('(.*?)'\)/gi, result, wrapFunc, id = 0;

    var makeFunc = function(computed, func, ctx) {
      return {
        set: function() {
          ctx.$set(computed, func.call(ctx));
        }.bind(ctx)
      };
    };

    Object.keys(this._computed).forEach(function(computed) {
      func = self._computed[computed];
      strfunc = func.toString();
      wrapFunc = makeFunc(computed, func, self);

      MVC.getGets(strfunc).forEach(function(get, id) {
        self.saveKeypath('comp'+id, {keypath: get, func: wrapFunc, el: '', type: 'computed'});
      });
    });
  }
  
  digest(k, restrict, krebind) {
    // go through all keypaths and execute functions with keypath starting with k
    // [restrict] = restrict digesting to specific ids
    // krebind = a keypath to rebind to
    // THEN go through all conditional expressions and evaluate
    var self = this;
    var doit = function(k, doSet) {
      var keypath, rid, i, val;

      for (keypath in self._keypaths) {
        if (self._keypaths.hasOwnProperty(keypath)) {
          if (k == '*' || keypath == '*' || keypath.substr(0, k.length) == k) {
            for (rid in self._keypaths[keypath]) {
              if (self._keypaths[keypath].hasOwnProperty(rid)) {
                for (i=0; i<self._keypaths[keypath][rid].length; i++) {
                  if (doSet) {
                    if (self._keypaths[keypath][rid][i].func.set) {
                      if (!restrict || restrict.length == 0 || restrict.indexOf(rid) > -1) {
                        val = self.$get(keypath);
                        self._keypaths[keypath][rid][i].func.set(self._keypaths[keypath][rid][i].el, keypath, val, self, self._keypaths[keypath][rid][i]);
                      }
                    }
                  }

                  if (self._keypaths[keypath][rid][i].func.rebind && self._keypaths[keypath][rid][i].binding) {
                    if (!restrict || restrict.length == 0 || restrict.indexOf(rid) > -1) {
                      val = self.$get(keypath);
                      self._keypaths[keypath][rid][i].func.rebind(self._keypaths[keypath][rid][i].el, self, self._keypaths[keypath][rid][i].binding);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    doit(k, true);

    if (krebind) {
      doit(krebind, false);
    }
  }
  
  removeElementsFromDom(el) {
    // remove any components
    // remove all children, run any unbinds
    var self = this;
    var ids = [], comp, compNo, tagName, compInst, compo = '-component', tagList = {};

    // remove components
    // all must go
    el.find('[' + MVC.prefix + compo + ']').each(function() {
      comp = $(this);
      tagName = comp.prop('tagName').toLowerCase();
      compNo = parseInt(comp.attr(MVC.prefix + compo), 10);
      tagList[tagName] = '';

      MVC.component.unbind(tagName, compNo, self, comp)
    });

    for (tagName in tagList) {
      this.$components[tagName] = [];
    }

    // children
    el.find('[' + MVC.idPrefix + ']').each(function() {
      ids.push($(this).attr(MVC.idPrefix)); // list of ids to remove
    });

    if (ids.length > 0) {
      this.removeElementsFromKeypath(ids);
    }

    el.empty();
  }
  
  removeElementsFromKeypath(ids) {
    var keypath, rid, i;

    for (keypath in this._keypaths) {
      if (this._keypaths.hasOwnProperty(keypath)) {
        for (rid in this._keypaths[keypath]) {
          if (ids.indexOf(rid) > -1) {
            for (i=0; i<this._keypaths[keypath][rid].length; i++) {
              if (this._keypaths[keypath][rid][i].func.unbind) {
                this._keypaths[keypath][rid][i].func.unbind();
              }
            }

            delete this._keypaths[keypath][rid];
            if (Object.keys(this._keypaths[keypath]).length == 0) {
              delete this._keypaths[keypath];
            }
          }
        }
      }
    }
  }
  
  watch(k, newVal, oldVal, noWatch) {
    // execute any watch functions matching keypath.
    if (newVal != oldVal || noWatch === false) {
      if (k in this._watch) {
        this._watch[k].call(this, newVal, oldVal);
      }
    }
  }
  
  evaluate(expr) {
    var res;

    try {
      res = eval(expr);
    }
    catch(e) {
      console.log('Conditional failure ',expr);
      console.log(e)
      res = false;
    }

    return res;
  }

  saveKeypath(id, obj) {
    // save details of each mvc element
    // _keypaths = {keypath: {id: []}}    {custno: {1: [element objects]}}
    if (! (obj.keypath in this._keypaths)) {
      this._keypaths[obj.keypath] = {};
    }

    if (! (id in this._keypaths[obj.keypath])) {
      this._keypaths[obj.keypath][id] = [];
    }

    this._keypaths[obj.keypath][id].push(obj);
  }

/* STATIC */  
  static config(config) {
    MVC.prefix = (config.prefix) ? config.prefix : MVC.prefix;
    MVC.mobi = (config.mobiscroll) ? config.mobiscroll : MVC.mobi;
    MVC.idPrefix = MVC.prefix + '-id';
  }

  static getOrSetID(el) {
    if (!el.attr(MVC.idPrefix)) {
      el.attr(MVC.idPrefix, MVC.nextId++);
    }

    return el.attr(MVC.idPrefix);
  }

  static intercom() {
    var args = Array.prototype.slice.call(arguments), path = args.shift(), segments = path.split('.');

    if (segments[0].substr(0,7).toLowerCase() == 'parent') {
      return this.$parent[segments[1]].apply(this.$parent, args);
    }
    else {
      return this.$components[segments[0]][segments[1]][segments[2]].apply(this.$components[segments[0]][segments[1]], args);
    }
  }

  static eval(str, msg, dflt) {
    var res;

    try {
      res = eval('(' + str + ')');
    }
    catch(e) {
      console.log(msg + '' + str);
      console.log(e);
      res = dflt;
    }

    return res;
  }

  static getGets(expr) {
    var result, gets = [], reGet = /\.\$get\(['"](.*?)['"]\)/gi;

    while (result = reGet.exec(expr)) {
      gets.push(result[1]);
      };

    return gets;
  }

  static builtins() {
    return {
      date: {
        bootcal: function(ev) {
          var self = this;
          var path, dt;
          var inp = this._builtins._getInput(ev);
          
          path = inp.attr(MVC.prefix + '-value');
          dt = (this.$get(path)) ? moment(this.$get(path), App.constants.dateFormat.mvc) : moment();

          if (!dt.isValid()) dt = moment();

          App.helpers.mvcBootCal.calInit.call(App.helpers.mvcBootCal, dt, function(rdt) {
            if (rdt) {
              self.$set(path, rdt.format(App.constants.dateFormat.mvc));
            }
          })
        },
      },

      time: {
        bootcal: function(ev) {
          var self = this;
          var path, dt;
          var inp = this._builtins._getInput(ev);
          
          path = inp.attr(MVC.prefix + '-value');
          dt = (this.$get(path)) ? this.$get(path) : '';

          App.helpers.mvcBootTime.timeInit.call(App.helpers.mvcBootTime, dt, function(rdt) {
            if (rdt) {
              self.$set(path, rdt);
            }
          })
        },
      },

      stepper: {
        plus: function(ev) {
          var inp = this._builtins._getInput(ev);          
          
          this._builtins.stepper._plusminus.call(this, inp, '+');
        },

        minus: function(ev) {
          var inp = this._builtins._getInput(ev);

          this._builtins.stepper._plusminus.call(this, inp, '-');
        },

        _plusminus: function(inp, sign) {
          var val = parseFloat(inp.val()) || 0,
            step = parseFloat(inp.attr('step')) || 1,
            min = parseFloat(inp.attr('min')) || 0,
            max = parseFloat(inp.attr('max')) || Infinity, path = inp.attr(MVC.prefix + '-value'),
            dis = inp.prop('disabled');

          if (dis) return;

          val = (sign == '+') ? val+step : val-step;

          if (val > max) val = max;
          if (val < min) val = min;

          this.$set(path, String(val));
        }
      },

      combo: {
        focus: function(ev) {
          var inp = this._builtins._getInput(ev);
          
          inp.focus();
        }
      },
      
      _getInput: function(ev) {
        var inp = $(ev.target).siblings('input');
          
        if (inp.length == 0) {
          inp = $(ev.target).closest('div').siblings('input');
        }
        
        if (inp.length == 0) {
          inp = $(ev.target).closest('div.input-group').find('input');
        }   
        
        return inp;
      },

    }
  }

  static addBindOption(binding, func) {
    MVC.bindList.push({binding: binding, func: func});
  }

  static addAttrOption(binding, func) {
    MVC.attrList.push({binding: binding, func: func});
  }

  static addPropOption(binding, func) {
    MVC.propList.push({binding: binding, func: func});
  }

  static addHrefOption(binding, func) {
    MVC.hrefList.push({binding: binding, func: func});
  }

  static addIterOption(binding, func) {
    MVC.iterList.push({binding: binding, func: func});
  }

  static addOptionOption(binding, func) {
    MVC.optionList.push({binding: binding, func: func});
  }

  static addOptgroupOption(binding, func) {
    MVC.optgroupList.push({binding: binding, func: func});
  }

  static addCondOption(binding, func) {
    MVC.condList.push({binding: binding, func: func});
  }

  static addEventOption(binding, func) {
    MVC.eventList.push({binding: binding, func: func});
  }

  static addFilter(name, func) {
    MVC.filterList[name] = func;
  }

  static addRole(name, func) {
    MVC.roleList[name] = func;
  }

  static addEdit(name, func) {
    MVC.editList[name] = func;
  }

  static splitKeypathsAndFilters(kf) {
    /* binding:
        'model.path [|filter...]'
        '{data: x, value: y}'

        if kf starts with { then value binding and data binding = two keypaths
          {data: states, value: contact.state}
          data = rebind, value = set
          value = keypath, data = rebind
        or value/text binding
    */
    var ret = {filters: []}, pp, args;

    if (kf.substr(0,1) == '{') {
      args = MVC.eval(kf, 'Invalid Binding', {})

      ret.keypath = args.value;
      ret.rebind = args.data || '';
      ret.binding = args;
    }
    else {
      var filters = kf.split('|');

      ret.keypath = filters.shift().trim();
      ret.binding = kf;

      filters.forEach(function(filter) {
        filter = filter.trim();
        pp = filter.indexOf('[');

        if (pp > -1) {
          args = MVC.eval(filter.substring(pp).trim(), 'Invalid Filter Arguments', '')

          ret.filters.push({filter: filter.substring(0, pp), args: args});
        }
        else {
          ret.filters.push({filter: filter, args: []});
        }
      });
    }

    return ret;
  }
}

  
// Non instance related
MVC.count = 0;
MVC.prefix = 'mvc';
MVC.idPrefix = MVC.prefix + '-id';
MVC.nextId = 0;
MVC.mobi = false;
MVC.bindList = [];
MVC.attrList = [];
MVC.propList = [];
MVC.hrefList = [];
MVC.iterList = [];
MVC.optionList = [];
MVC.optgroupList = [];
MVC.condList = [];
MVC.eventList = [];
MVC.filterList = {};
MVC.components = {};
MVC.roleList = {};
MVC.editList = {};
MVC.radios = {};

MVC.component = {
  bind: function(parentEl, parentInst, tagName, interuni, interup, interbi) {
    var comp = {}, template, childInst, count, id;
    var funcList = [];

    $.extend(true, comp, MVC.components[tagName]);
    template = $(comp.template).html();

    interuni = MVC.eval(interuni, 'Invalid interuni Arguments', {});
    interup = MVC.eval(interup, 'Invalid interup Arguments', {});
    interbi = MVC.eval(interbi, 'Invalid interbi Arguments', {});

    var makeFunc = function(fKeypath, tKeypath, fInst, tInst) {
      return {
        set: function() {
          var value = fInst.$get(fKeypath);
          tInst.$set(tKeypath, value);
        }
      };
    };

    // insert component template into parent element
    parentEl.append(template);

    // create mvc instance for component
    childInst = new MVC(parentEl, comp, parentInst);

    // save component instance into parent's $components
    if (! (tagName in parentInst.$components)) {
      parentInst.$components[tagName] = [];
    }

    parentInst.$components[tagName].push(childInst);
    parentEl.attr(MVC.prefix + '-component', parentInst.$components[tagName].length-1);

    id = MVC.getOrSetID(parentEl);

    // handle interuni objects
    if (Object.keys(interuni).length > 0) {
      for (var parentSide in interuni) {
        var childSide = interuni[parentSide];

        // parent --> child
        var wrapFunc = makeFunc(parentSide, childSide, parentInst, childInst);
        parentInst.saveKeypath(id, {keypath: parentSide, func: wrapFunc, type: 'component'});

        funcList.push(wrapFunc);
      }
    }

    // handle interup objects
    if (Object.keys(interup).length > 0) {
      for (var childSide in interup) {
        var parentSide = interup[childSide];

        // child --> parent
        var wrapFunc = makeFunc(childSide, parentSide, childInst, parentInst);
        childInst.saveKeypath(id, {keypath: childSide, func: wrapFunc, type: 'component'});
      }
    }

    // handle interbi objects
    if (Object.keys(interbi).length > 0) {
      for (var parentSide in interbi) {
        var childSide = interbi[parentSide];

        // parent --> child
        var wrapFunc = makeFunc(parentSide, childSide, parentInst, childInst);
        parentInst.saveKeypath(id, {keypath: parentSide, func: wrapFunc, type: 'component'});

        funcList.push(wrapFunc);

        // child --> parent
        var wrapFunc = makeFunc(childSide, parentSide, childInst, parentInst);
        childInst.saveKeypath(id, {keypath: childSide, func: wrapFunc, type: 'component'});
      }
    }

    // instantiate child, force parent data into child.
    var ret = childInst.init();

    for (var i=0; i<funcList.length; i++) {
      funcList[i].set();
    }

    return ret;
  },

  unbind: function(tagName, count, parentInst, parentEl) {
    var childInst = parentInst.$components[tagName][count];

    if (childInst) {
      childInst.removeElementsFromDom(parentEl);

      if (childInst.$lifecycle.destroy) {
        childInst.$lifecycle.destroy.call(childInst);
      }
    }

    childInst = null;
  }
}

MVC.actionSet = {
  _action: function(action, path, value, count, noWatch) {
    // noWatch === true, skip calling the watch function.
    // noWatch === false, call the watch function.
    // else call if a change
    var a, o = this.$model, ret = '', n, origPath, oldVal, rootPath;

    oldVal = this.$get(path);
    origPath = path;
    path = path.replace(/\[(\w+)\]/g, '.$1'); // [1] --> .1
    path = path.replace(/^\./, '');           // leading .
    a = path.split('.');

    if (_.isEqual(value, oldVal) && noWatch === true && action == 'set') {
      return;
    }

    for (var i = 0; i < a.length - 1; i++) {
      n = a[i];

      if (n in o) {
        o = o[n];
      } else {
        o[n] = {};
        o = o[n];
      }
    }

    switch (action) {
      case 'set':
        // set/change value
        o[a[a.length - 1]] = value;
        break;
      case 'push':
        // add to end of array
        o[a[a.length - 1]].push(value);
        break;
      case 'pop':
        // remove from end of array
        ret = o[a[a.length - 1]].pop();
        break;
      case 'shift':
        // remove from beginning of array
        ret = o[a[a.length - 1]].shift();
        break;
      case 'splice':
        // remove from middle of array
        ret = o[a[a.length - 1]].splice(value, count);
        break;
    }

    if (!isNaN(a[a.length-1])) {  // if last index is a number we should watch the parent as well
      rootPath = a.slice();
      rootPath.pop();
      rootPath = rootPath.join('.');
    }

    if (noWatch !== true) {
      this.watch(origPath, value, oldVal, noWatch);
    }

    this.digest(origPath, [], rootPath);

    return ret;
  },

  $set: function(path, value, noWatch) {
    var value2;

    if ($.isPlainObject(value)) {
      value2 = _.cloneDeep(value); //$.extend({}, value);
    }
    else if ($.isArray(value)) {
      value2 = value.slice();
    }
    else {
      value2 = value;
    }

    return this._action('set', path, value2, null, noWatch);
  },

  $push: function(path, value) {
    return this._action('set', path, value);
  },

  $pop: function(path) {
    return this._action('pop', path);
  },

  $shift: function(path) {
    return this._action('shift', path);
  },

  $splice: function(path, idx, count) {
    count = count || 1;
    return this._action('splice', path, idx, count);
  },

  $get: function(path) {
    var o = this.$model, a, n;

    if (!path) {
      return o;
    }

    path = path.replace(/\[(\w+)\]/g, '.$1'); // [1] --> .1
    path = path.replace(/^\./, '');           // leading .
    a = path.split('.');

    while (a.length) {
      n = a.shift();

      try {
        if (n in o) {
          o = o[n];
        } else {
          return '';
        }
      }
      catch(e) {
        console.warn('Invalid object ', path);
        return '';
      }
    }

    return o;
  },

  $appendHTML: function(el, template) {
    // el is parent element, template is html code.
    var id = 'mvc-appended-' + (new Date()).valueOf();
    var div = $('<div id="' + id + '"></div>');

    el = $(el);
    template = $(template);

    div.append(template);
    el.append(div);

    this.parseDOM(div);

    // re-digest, but just new elements
    var ids = [];

    div.find('[' + MVC.idPrefix + ']').each(function() {
      ids.push($(this).attr(MVC.idPrefix));
    });

    if (ids.length > 0) {
      this.digest('*', ids, false);
    }

    // in case of a <select> set the value
    if (template.prop("tagName") == 'SELECT') {
      vkeypath = el.attr(MVC.prefix + '-value');

      if (vkeypath) {
        setTimeout(function() {
          template.val(self.$get(vkeypath));
        });
      }
    }

    return id;
  },

  $focus: function(path) {
    // this.$focus('misc.upc');
    var els = $('#' + this.el[0].id + ' :input[mvc-value="' + path + '"]');
    if (els.length > 0) {
      setTimeout(function() {
        els[0].focus();
      }, 50);
    }
  },

  $select: function(path) {
    // this.$focus('misc.upc');
    var els = $('#' + this.el[0].id + ' :input[mvc-value="' + path + '"]');
    if (els.length > 0) {
      setTimeout(function() {
        els[0].select();
      }, 50);
    }
  },

  $resetVars: function() {
    var model = this.$model;

    for (var k in model) {
      //console.log(k, model[k])
    }
  },
}
