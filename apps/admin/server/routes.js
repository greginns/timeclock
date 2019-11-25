const root = process.cwd();
const fs = require('fs').promises;

const {Error302, JSONError} = require(root + '/lib/errors.js');
const {ResponseMessage} = require(root + '/lib/messages.js');
const services = require(root + '/apps/admin/server/services.js');
const {Router, RouterMessage} = require(root + '/lib/router.js');

// Admin
Router.add(new RouterMessage({
  method: 'info',
  path: '/admin/auth', 
  fn: async function(req, res) {
    return await services.auth.getUser(req);
  },
}));

Router.add(new RouterMessage({
  method: 'info',
  path: '/admin/csrf', 
  fn: async function(req, res) {
    return await services.auth.verifyCSRF(req);
  },
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/admin/login', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.auth.login(req.body);
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: false, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/admin/logout', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.auth.logout(req);
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: false, needCSRF: false}
}));

// generic admin query
Router.add(new RouterMessage({
  method: 'get',
  path: '/admin/query', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm;
  
    try {
      var query = JSON.parse(req.parsedURL.query.query);

      tm = await services.query(query);
      rm.convertFromTravel(tm);
    }
    catch(err) {
      rm.err = new JSONError(err);
    }
  
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// tenant
Router.add(new RouterMessage({
  method: 'get',
  path: '/admin/tenant', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tenant.get();
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/admin/tenant/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tenant.get({rec: {code: req.params.code}});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/admin/tenant', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tenant.insert({rec: req.body.tenant});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/admin/tenant/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tenant.update({code: req.params.code, rec: req.body.tenant});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/admin/tenant/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tenant.delete({code: req.params.code});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// user
Router.add(new RouterMessage({
  method: 'get',
  path: '/admin/user', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.get();
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/admin/user/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.get({rec: {code: req.params.code}});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/admin/user', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.insert({rec: req.body.user});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/admin/user/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.update({code: req.params.code, rec: req.body.user});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/admin/user/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.delete({code: req.params.code});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));


Router.add(new RouterMessage({
  method: 'put',
  path: '/admin/user/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.update({code: req.params.code, rec: req.body.user});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// Migrations
Router.add(new RouterMessage({
  method: 'post',
  path: '/admin/migrate', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.migrate.run({code: req.body.code});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// Pages
Router.add(new RouterMessage({
  method: 'get',
  path: ['/admin'], 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.output.main(req);

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: false, needCSRF: false}
}));

// manage page
Router.add(new RouterMessage({
  method: 'get',
  path: ['/admin/manage/:etc', '/admin/manage'], 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.output.manage(req);

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: false, redirect: '/admin'}
}));

// misc
Router.add(new RouterMessage({
  method: 'post',
  path: '/form', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();

    rm.data = JSON.stringify({body: req.body})
    rm.ct = 'application/json';

    for (var i=0; i<req.files.length; i++) {
      try {
        await fs.writeFile(root + '/lib/' + req.files[i].filename, req.files[i].contents);  
        console.log(req.files[i].filename, ' Saved')
      }
      catch (err) {
        console.log('Error saving ' + req.files[i].filename, err)
      }
    }

    return rm;
  }, 
  options: {needLogin: false, bypassuser: true}
}));