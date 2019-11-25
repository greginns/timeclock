const root = process.cwd();
const {ResponseMessage} = require(root + '/lib/messages.js');

var routePaths = []

class Router {
  /* opts {}
    needLogin: T|F
    redirect: URL
    bypassUser: T|F
  */
  constructor() {
  }

  static add(msg) {
    msg.path.forEach(function(p) {
      routePaths.push({mpath: msg.method + this._stripSlashes(p), msg});
    }, this)  
  }

  static async go(req, res) {
    var path = req.method + this._stripSlashes(req.parsedURL.pathname);
    var entry, params;

    [entry, params] = this._getEntry(path);

    if (!entry) {  
      var entry, params; // weird error if entry and params == false  "TypeError: Cannot set property 'false' of undefined"
      // no match, use 404 page if exists
      [entry, params] = this._getEntry(path);
    }

    if (!entry) {
      return new ResponseMessage({data: '', status: 404, ct: 'text/plain', err: new Error('No 404 page found')});
    }

    req.params = params;
    
    return await entry.fn(req, res);
  }

  static getOptions(req) {
    var path = req.method + this._stripSlashes(req.parsedURL.pathname);
    var entry, params;
    
    [entry, params] = this._getEntry(path);
    
    return (!entry) ? false : entry.options;
  }
  
  static getInfo(path) {
    path = 'INFO' + this._stripSlashes(path);
    var entry, params;
    
    [entry, params] = this._getEntry(path);

    return entry;
  }
  
  static _stripSlashes(path) {
    return path.toString().replace(/\/$/, '').replace(/^\//, '');
  }
 
  static _getEntry(path) {
    // compare path to stored paths
    // contact/5/view vs
    // contact/search
    // contact/:id/edit
    // contact/:id/view
    var x = path.split('?');
    var parts = x[0].split('/');

console.log(path)
    
    if (parts[parts.length - 1] == '') parts.pop();
    var sch = (x.length > 1) ? x[1].split('&') : [];

    for (var i=0, mparts, good, params={}; i<routePaths.length; i++) {
      good = true;
      mparts = routePaths[i].mpath.split('/');

      if (parts.length == mparts.length) {
        for (var j=0; j<parts.length; j++) {
          if (parts[j] == mparts[j] || mparts[j].substr(0,1) == ':') {
            if (mparts[j].substr(0,1) == ':') {
              params[mparts[j].substr(1)] = parts[j];
            }
          }
          else {
            good = false;
            break;
          }
        }

        if (good) {
          sch.forEach(function(xy) {
            let z = xy.split('=');
            params[unescape(z[0])] = unescape(z[1]);
          });

          return [routePaths[i].msg, params || {}];
        }
      }
    }

    return [false, false];
  }

}

class RouterMessage {
  constructor({method='post', path='', fn='', options={}} = {}) {
    if (!Array.isArray(path)) path = [path];
    
    this.method = method.toUpperCase();
    this.path = path;
    this.fn = fn;
    this.options = options;
    
    this.test();
  }
  
  test() {
    var methods = ['GET', 'POST', 'PUT', 'DELETE', 'INFO'];
    
    var defaults = {
      needLogin: true,
      needCSRF: true,
      bypassUser: false,
      allowAnon: false,
      redirect: '',
    }
    
    Object.keys(defaults).forEach(function(k) {
      if (!(k in this.options)) {
        this.options[k] = defaults[k];
      }
    }, this)

    if (methods.indexOf(this.method) == -1) {
      console.log(`Invalid Method ${this.method}`);
    }

    if (!this.path[0]) {
      console.log(`No Path specified for ${this.method}`);
    }
    
    if (!this.fn) {
      console.log(`No Function specified for ${this.method} ${this.path}`)
    }
    
    if (this.options.needLogin && (this.options.needLogin !== true && this.options.needLogin !== false)) {
      console.log(`Invalid needLogin Option for ${this.method} ${this.path}`);
    }
    
    if (this.options.needCSRF && (this.options.needCSRF !== true && this.options.needCSRF !== false)) {
      console.log(`Invalid needCSRF Option for ${this.method} ${this.path}`);
    }
    
    if (this.options.bypassUser && (this.options.bypassUser !== true && this.options.bypassUser !== false)) {
      console.log(`Invalid bypassUser option for ${this.method} ${this.path}`);
    }

    if (this.options.allowAnon && (this.options.allowAnon !== true && this.options.allowAnon !== false)) {
      console.log(`Invalid allowAnon Option for ${this.method} ${this.path}`);
    }

  }
}
    
module.exports = {
  Router,
  RouterMessage
}