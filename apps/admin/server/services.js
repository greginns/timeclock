/*
  session expiration
  delete tenant.json when deleting tenant
  remove csrf records when logging out
  remove csrf records when creating a new one
*/
const root = process.cwd();
const fs = require('fs').promises;
const nunjucks = require('nunjucks');
const uuidv1 = require('uuid/v1');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const sqlUtil = require(root + '/lib/sqlUtil.js');
const {Tenant, User, Session, CSRF} = require(root + '/models/adminModels.js')(false);
const modelsBuild = {tenant: require(root + '/models/tenantModels.js')(true)};
const tenantUser = require(root + '/models/tenantModels.js')(false).User;
const {SystemError, UserError, NunjucksError, InvalidUserError, JSONError} = require(root + '/lib/errors.js');
const {TravelMessage} = require(root + '/lib/messages.js');
const pgschema = 'public';

var readMigFile = async function(file) {
  var data = false
  
  try {
    data = JSON.parse(await fs.readFile(file));
  }
  catch(err) {
    console.log(err);
  }
  
  return data;
}

var writeMigFile = async function(file, json) {
  var data = false
  
  try {
    await fs.writeFile(file, JSON.stringify(json));
    
    data = true;
  }
  catch(err) {
    console.log(err)
  }
  
  return data;
}

var deleteMigFile = async function(file) {
  var rc = false
  
  try {
    await fs.unlink(file);
    
    rc = true;    
  }
  catch(err) {
    console.log(err);
  }
  
  return rc;
}

module.exports = {
  output: {
    main: async function(req) {
      // Login Page
      var ctx = {};
      var nj;
      var tm = new TravelMessage();
      
      try {
        nj = nunjucks.configure([root + '/apps/admin/public', root + '/apps', root + '/macros'], { autoescape: true });
        tm.data = nj.render('admin.html', ctx);
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = new NunjucksError(err);
      }

      return tm;
    },
    
    manage: async function(req) {
      // Main admin manage page.  Needs a user so won't get here without one
      var ctx = {};
      var nj;
      var tm = new TravelMessage();

      ctx.CSRFToken = uuidv1();
      
      // create CSRF record
      rec = new CSRF({token: ctx.CSRFToken, user: req.user.code});
      tm = await rec.insertOne({pgschema});

      ctx.tenant = Tenant.getColumnDefns();
      ctx.user = User.getColumnDefns();
      ctx.dateFormat = 'MM/DD/YYYY';
      ctx.timeFormat = 'hh:mm A';
      ctx.TID = pgschema;
      
      try {
        nj = nunjucks.configure([root + '/apps/admin/public', root + '/apps', root + '/macros', root + '/mvc-addons', root + '/lib/utils'], { autoescape: true });
        tm.data = nj.render('admin-manage.html', ctx);
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = new NunjucksError(err);
      }
      
      return tm;
    },
  },
  
  auth: {
    getUser: async function(req) {
      var tm, user = null;
      var sessID = req.cookies.admin_session || '';

      if (sessID) {
        tm = await Session.selectOne({pgschema, cols: '*', showHidden: true, pks: sessID});

        if (tm.isGood()) {
          tm = await User.selectOne({pgschema, cols: '*', pks: tm.data.user});
          if (tm.isGood()) user = tm.data;
        }
      }
        
      return [{code: 'public'}, user];
    },
    
    verifyCSRF: async function(req) {
      // get token, check if user matches
      var user = req.user;
      var token = req.CSRFToken || null;
      var tm;

      if (!token) return false;

      tm = await CSRF.selectOne({pgschema, pks: token})

      if (tm.isBad()) return false;

      return tm.data.user == user.code;    
    },
    
    login: async function(body) {
      // credentials good?
      // create Session record 
      // setup cookies
      var match, tm, tobj, rec, bpwd;

      // user valid?
      tm = await User.selectOne({pgschema, cols: 'password', pks: body.username});
      if (tm.isBad()) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError()});

      // password valid?
      match = await bcrypt.compare(body.password, tm.data.password);
      if (!match) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError()});
      
      // create session record
      rec = new Session({id: uuidv1(), tenant: 'public', user: body.username});
      tm = await rec.insertOne({pgschema});

      if (tm.isBad()) return tm;
     
      // Reply with blank data not user record, include session as cookie
      return new TravelMessage({data: '', type: 'text', status: 200, cookies: [{name: 'admin_session', value: tm.data.id, 'Max-Age': 60*60*24, HttpOnly: true}]});
    },
    
    logout: async function(req) {
      // delete session record
      // remove cookie
      var id = req.cookies.admin_session || '';
      var tobj, tm;
      
      if (id) {
        tobj = new Session({id});
        tm = await tobj.deleteOne({pgschema});
      }
      
      return new TravelMessage({data: '/admin', type: 'text', status: 200, cookies: [{name: 'admin_session', value: ''}]});
    },
  },
  
  query: async function(query) {
    var sql, tm;
    
    try {
      sql = sqlUtil.jsonToQuery(query, 'admin', pgschema, {verbose: false});
    }
    catch(err) {
      return new TravelMessage({err: new JSONError(err)});
    }
    
    tm = await sqlUtil.execQuery(sql);
    return tm;
  },
  
// Tenants  
  tenant: {
    get: async function({rec = {}} = {}) {
      // get one or more tenants
      return await Tenant.select({pgschema, rec});
    },
    
    insert: async function({rec = {}} = {}) {
      var tm1, tm2, tobj, sql, sqlFK, jsonModels = {}, errs = [], verrs = [];
      var modelNames = Object.keys(modelsBuild.tenant);
      var migrationFile = root + `/models/migrations/tenant/${rec.code}.json`;
      var tm = new TravelMessage();

      // insert tenant row
      tobj = new Tenant(rec);
      tm1 = await tobj.insertOne({pgschema});
      
      if (tm1.isBad()) return tm1; // insert failure, most likely schema validation failure

      // create schema
      sql = `CREATE SCHEMA IF NOT EXISTS "${rec.code}"`;
      tm2 = await sqlUtil.execQuery(sql);
      
      if (tm2.isBad()) return tm2; // create schema error
      
      // verify tables
      for (model of modelNames) {
        verrs = modelsBuild.tenant[model].verify();
        
        if (verrs.length > 0) {
          errs.push({model, verrs: verrs.join(',')});
        }
      }
      
      if (errs.length > 0) {
        tm.data = {errors: {'_verify': errs}};
        tm.status = 400;
        return tm;
      }
      
      // create tables if no errors
      for (model of modelNames) {
        [verrs, sql, sqlFK] = modelsBuild.tenant[model].create(rec.code);
        
        if (verrs.length > 0) {
          errs.push({model, verrs: verrs.join(',')});
          continue;
        }
         
        res = await sqlUtil.execQuery(sql);
        
        if (!res.err && sqlFK) {
          res = await sqlUtil.execQuery(sqlFK);
        }

        if (!res.err) {
          jsonModels[model] = modelsBuild.tenant[model].toJSON();

          await writeMigFile(migrationFile, jsonModels);
        }
        else {
          errs.push({model, verrs: res.err.message});
        }
      };  
      
      if (errs.length > 0) {
        tm.data = {errors: {'_verify': errs}};
        tm.status = 400;
        return tm;
      }
      
      // create admin user 
      var user = new tenantUser({code: 'admin', name: 'Administrator', password: 'Admin49!', email: rec.email, active: true});
      tm = await user.insertOne({pgschema: rec.code});

      return tm;
    },
    
    update: async function({code = '', rec= {}} = {}) {
      // Update record
      var tobj;
      
      if (!code) {
        return new TravelMessage({err: new UserError('No Tenant Code Supplied')});
      }
          
      rec.code = code;
      
      tobj = new Tenant(rec);
      
      return await tobj.updateOne({pgschema});
    },
    
    delete: async function({code = ''} = {}) {
      // delete Tenant
      // drop schema and tables
      var tm1, tm2, tobj, sql;
      var migrationFile = root + `/models/migrations/tenant/${code}.json`;
      var tm = new TravelMessage();
      
      if (!code) return new TravelMessage({err: new UserError('No Tenant Code Supplied')});

      // drop schema
      sql = `DROP SCHEMA IF EXISTS "${code}" CASCADE`;
      tm2 = await sqlUtil.execQuery(sql);
console.log(sql)      
console.log(tm2)      
      if (tm2.isBad()) return tm2;  // drop schema error
      
      tobj = new Tenant({code});
      tm1 = await tobj.deleteOne({pgschema});
            
      if (tm1.isBad()) return tm1;  // delete failure

      deleteMigFile(migrationFile);
      
      return tm;
    },
  },
  
  user: {
    get: async function({rec = {}} = {}) {
      // get one or more users
      return await User.select({pgschema, rec});
    },
    
    insert: async function({rec = {}} = {}) {
      // Insert Record
      var tobj = new User(rec);
    
      return await tobj.insertOne({pgschema});
    },
    
    update: async function({code = '', rec= {}} = {}) {
      // Update record
      if (!code) return new TravelMessage({err: new UserError('No User Code Supplied')});
          
      rec.code = code;
      var tobj = new User(rec);
        
      return await tobj.updateOne({pgschema});
    },
    
    delete: async function({code = ''} = {}) {
      if (!code) return new TravelMessage({err: new UserError('No User Code Supplied')});
      
      var tobj = new User({code});
      return await tobj.deleteOne({pgschema});
    },  
  },
  
  migrate: {
    run: async function({code = ''} = {}) {
      // run migrations for this tenant
      var model, sql, sqlFK, res, tableName;
      var jsonModels, errs = [], verrs = [];
      var migrationFile = root + `/models/migrations/tenant/${code}.json`;
            
      if (!code) return new TravelMessage({err: new UserError('No Tenant Code Supplied')});
      
      tm = await Tenant.selectOne({pgschema, cols: '*', showHidden: true, pks: code});
      if (tm.isBad()) return tm;

      // good tenant, let's go.
      jsonModels = await readMigFile(migrationFile);
      if (!jsonModels) return new TravelMessage({err: new SystemError('Missing JSON file')});
      
      // go through current models and add, alter
      for (model of Object.keys(modelsBuild.tenant)) {
        if (! (model in jsonModels)) {
          [verrs, sql, sqlFK] = modelsBuild.tenant[model].create(pgschema);
        }
        else {
          [verrs, sql] =  modelsBuild.tenant[model].alter(code, jsonModels[model]);
          sqlFK = '';
        }
        
        if (verrs.length > 0) {
          errs.push({model, verrs: verrs.join(',')});
          continue;
        }
         
        res = await sqlUtil.execQuery(sql);
        
        if (!res.err && sqlFK) {
          res = await sqlUtil.execQuery(sqlFK);
        }

        if (!res.err) {
          jsonModels[model] = modelsBuild.tenant[model].toJSON();

          await writeMigFile(migrationFile, jsonModels);
        }
        else {
          errs.push({model, verrs: res.err.message});
        }

      };  
      
      // go through old models, drop any not current
      for (model of Object.keys(jsonModels)) {
        if (! (model in modelsBuild.tenant)) {
          // can't use Model.drop as model doesn't exist anymore!     
          tableName = `"${code}"."${model}"`
          sql = `DROP TABLE IF EXISTS ${tableName}`;    
        
          res = await sqlUtil.execQuery(sql);
          
          if (!res.err) {
            delete jsonModels[model];
            
            await writeMigFile(migrationFile, jsonModels);
          }
          else {
            errs.push({model, verrs: res.err.message});
          }
        }
      }
      
      tm = new TravelMessage();
      
      if (errs.length > 0) {
        tm.data = {errors: {'_verify': errs}};
        tm.status = 400;
        return tm;
      }

      return tm;
    },
    
  },
  
  test: function() {
    var rec = new Tenant({});
    console.log(rec)
  }
}