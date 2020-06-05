const root = process.cwd();
const {ResponseMessage} = require(root + '/lib/messages.js');
const {SystemError} = require(root + '/lib/errors.js');
const {Router} = require(root + '/lib/router.js');
const config = require(root + '/config.json').server;

module.exports = {
  check: async function(req, res) {
    // logged in status
    /*
      api - credentials in request:  apiuser, tenant, password 
      tenant - tenant_session cookie
      admin - admin_session cookie
    */

    var options = Router.getOptions(req);
    var path = req.parsedURL.pathname.split('/');    
    var sys = path[1], tenant, user, tokenOK;
    var auth = Router.getInfo('/' + sys + '/auth');   // get /admin/auth, /tenant/auth, /api/auth route
    var csrf = Router.getInfo('/' + sys + '/csrf');   // get /admin/csrf, /tenant/csrf, /api/csrf route

    if (options === false) return;  // 404, let router catch it.
    if (options.bypassUser) return;
    if (path.length < 2) throw new ResponseMessage({status: 500, err: new SystemError('No System Specified')});
    if (!auth) throw new ResponseMessage({status: 500, err: new SystemError('No sys/auth Route Specified')});
    if (!csrf) throw new ResponseMessage({status: 500, err: new SystemError('No sys/csrf Route Specified')});

    [tenant, user] = await auth.fn(req, res);

    if (!user) {
      if (options.needLogin) {
        if (options.redirect) {
          // redirect user
          throw new ResponseMessage({status: 302, data: options.redirect});
        }
        else {
          // security error
          throw new ResponseMessage({status: 401});
        }
      }
    }
    else {
      req.TID = tenant.code;  //these need to be here to do the csrf.fn
      req.tenant = tenant;
      req.user = user;  

      if (options.needLogin && user.code == 'Anonymous' && !options.allowAnon) {
        // Anonymous user but Anon not allowed, and need a login
        throw new ResponseMessage({status: 401});
      }

      if (options.needCSRF) {
        tokenOK = await csrf.fn(req, res);
        if (!tokenOK) throw new ResponseMessage({status: 401});
      }
    }
  },
  
  checkWS: async function(req) {
    var path = req.parsedURL.pathname.split('/');  
    var sys = path[1];
    var auth = Router.getInfo('/' + sys + '/auth');   // get /admin/auth, /tenant/auth, /api/auth route

    if (req.headers.origin.indexOf(config.domain) == -1) {
      return [null, null];
    }

    return await auth.fn(req);  // tenant, user
  },
}
