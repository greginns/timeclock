const root = process.cwd();
const fs = require('fs').promises;
const models = require(root + '/models')(true);
const sqlUtil = require(root + '/lib/sqlUtil.js');

const pgschema = 'public';
//const pgschema = 'neoc';

if (pgschema == 'public') {
  var migrationFile = root + '/models/migrations/admin/admin.json';
  var schema = 'admin';
  var modelNames = Object.keys(models.admin);
}
else {
  var migrationFile = root + '/models/migrations/tenant/' + pgschema + '.json';  
  var schema = 'tenant';
  var modelNames = Object.keys(models.tenant);
}

var readMigFile = async function() {
  var data = false
  
  try {
    data = JSON.parse(await fs.readFile(migrationFile));
  }
  catch(err) {
    console.log(err);
  }
  
  return data;
}

var writeMigFile = async function(jsonModels) {
  var data = false
  
  try {
    await fs.writeFile(migrationFile, JSON.stringify(jsonModels));
    
    data = true;
    console.log('Saved')
  }
  catch(err) {
    console.log(err);
  }
  
  return data;
}

var createAll = async function() {
  var model, errs, sql, fks, res, allFKs = [];;
  var jsonModels = await readMigFile() || {};
  
  for (model of modelNames) {
    try {
      [errs, sql, fks] = models[schema][model].create(pgschema);  
    }
    catch(rc) {
      console.log(rc)
      break;
    }
    
    if (fks) allFKs.push(fks);
    console.log(sql);

    res = await sqlUtil.execQuery(sql);
    console.log(res);
    
    if (!res.err) {
      jsonModels[model] = models[schema][model].toJSON();
      await writeMigFile(jsonModels);
    }
  };  

  for (var fk of allFKs) {
    console.log(fk);
    res = await sqlUtil.execQuery(fk);
    console.log(res);
  }
  
  sqlUtil.shutdown();
  console.log('DONE');
}

var alterAll = async function() {
  var model, sql, res;
  var dt, pwd, tableName;
  var jsonModels = await readMigFile();
  
  if (!jsonModels) throw 'No JSON File';
  
  // go through current models and add, alter
  for (model of modelNames) {
    if (! (model in jsonModels)) {
      sql = models[schema][model].create(pgschema);
      console.log(sql);

      res = await sqlUtil.execQuery(sql);
      //console.log(res);
    }
    else {
      sql = models[schema][model].alter(pgschema, jsonModels[model]);
      console.log(model, sql);
    
      res = await sqlUtil.execQuery(sql);
      //console.log(res);
    }
    
    if (!res.err) {
      jsonModels[model] = models[schema][model].toJSON();
      await writeMigFile(jsonModels);  
    }
  };
  
  // go through old models, drop any not current
  for (model of Object.keys(jsonModels)) {
    if (! (model in models[schema])) {
      // can't use Model.drop as model doesn't exist anymore!     
      tableName = `"${pgschema}"."${model}"`
      sql = `DROP TABLE IF EXISTS ${tableName}`;    
      console.log(sql);
    
      res = await sqlUtil.execQuery(sql);
      //console.log(res);
      
      if (!res.err) {
        delete jsonModels[model];
      //  jsonModels[model] = models[schema][model].toJSON();
        await writeMigFile();
      }     
    }
  }
  
  sqlUtil.shutdown();
  console.log('DONE');
}


var dropAll = async function() {
  var dt = new Date();
  var pwd = dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate();
  var model, sql, res;
  
  for (model of modelNames) {
    sql = models[schema][model].drop(pgschema, pwd);
    console.log(sql);
    
    res = await sqlUtil.execQuery(sql);
    console.log(res);
  }
  
  buildJSON();
  
  sqlUtil.shutdown();
  console.log('DONE')
}


var buildJSON = async function() {
  var model, sql, res;
  var jsonModels = await readMigFile() || {};
  
  for (model of modelNames) {
    jsonModels[model] = models[schema][model].toJSON();
  };

  //console.log(JSON.stringify(jsonModels))
  writeMigFile(jsonModels);
}

var initUser = async function() {
  var rec = {code: 'greg', name: 'Greg Miller', email: 'greg@reservation-net.com', password: 'herbie99', active: true}
  //var rec = {code: 'monica', name: 'Monica Eurich', email: 'monicae@neoc.com', password: 'adriana9', active: true};
  var user = new User(rec);
  var tm = await models.tenant.User.insertOne({pgschema, rec});
  console.log(tm)
}

//alterAll();
//buildJSON();
//createAll()
//dropAll();
initUser();

/*
async function test() {
var arr = [
  {code: 'greg', name: 'Greg Miller', email: 'greg@reservation-net.com', password: 'herbie99', active: true},
  {code: 'monica', name: 'Monica Eurich', email: 'monicae@neoc.com', password: 'adriana9', active: true}
]


//for (r of arr) {
//  var tm = await models.tenant.User.delete({pgschema: 'neoc', obj: {code: r.code}});
//  console.log(tm)
//}

var tm = await models.tenant.User.insert({pgschema:'neoc', rows: arr});
console.log(tm)
}

test()
*/