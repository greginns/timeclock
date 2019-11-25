const root = process.cwd();
const assert = require('assert').strict;

const models = require(root + '/models/adminTestModels.js')(true);
//const Fields = require(root + '/lib/model/modelFields');
const sqlUtil = require(root + '/lib/sqlUtil.js');
const pgschema = 'public';

var modelNames = Object.keys(models);
var jsonModels = {};
var testResults = {run: 0, passed: 0, failed: 0};
var origTest1 = Object.assign(models.Test1);
var sql;

var testIt = function(sql, result, msg) {
  testResults.run++;
  
  try {
    assert.strictEqual(sql, result);
    testResults.passed++;
  }
  catch(e) {
    var errMsg = '------------------ ' + msg + '------------------ ';
    testResults.failed++;
    
    console.log(errMsg);
    console.log(e.actual, ' vs ', e.expected);
    console.log('-'.repeat(errMsg.length));
  }  
}

var makeJSON = function() {
  for (var model of modelNames) {
    jsonModels[model] = models[model].toJSON();  
  }
}

var noChanges = function() {
  var result = '';
  
  for (var model of modelNames) {
    sql = models[model].alter(pgschema, jsonModels[model]);
    testIt(sql, result, `${model} - noChanges`);
  }
}

var addColumn = function() {
  var result = 'ALTER TABLE Test1Add\nADD COLUMN "field17" VARCHAR(30);'
  
  models.Test1 = models.Test1Add;
  sql = models.Test1.alter(pgschema, jsonModels.Test1);
  
  testIt(sql, result, 'addColumn');
}

var dropColumn = function() {
  var result = 'ALTER TABLE Test1Drop\nDROP COLUMN IF EXISTS "field14";'
  
  models.Test1 = models.Test1Drop;
  sql = models.Test1.alter(pgschema, jsonModels.Test1);
  
  testIt(sql, result, 'dropColumn');
}

var alterColumn = function() {
  // drop null, notNull, default, change maxLength, change array
  var result = 'ALTER TABLE Test1Drop\nALTER COLUMN "field11" DROP NOT NULL,\nALTER COLUMN "field12" DROP NULL,\nALTER COLUMN "field13" DROP DEFAULT,\nALTER COLUMN "field14" TYPE VARCHAR(30)[][][],\nALTER COLUMN "field15" TYPE VARCHAR(30)[][],\nALTER COLUMN "field16" TYPE VARCHAR(31);';
  
  models.Test1 = models.Test1Alter;
  sql = models.Test1.alter(pgschema, jsonModels.Test1);

  testIt(sql, result, 'alterColumn-1');
  
  models.Test1 = origTest1;  // restore original Test1 as that's what Test2 points to as FK
  
  // add null, notNull, default, change Type
  result = 'ALTER TABLE Test2Alter\nALTER COLUMN "field21" SET NOT NULL,\nALTER COLUMN "field22" SET NULL,\nALTER COLUMN "field23" SET DEFAULT \'true\',\nALTER COLUMN "field24" TYPE TEXT(30)[][];';
  
  models.Test2 = models.Test2Alter;
  sql = models.Test2.alter(pgschema, jsonModels.Test2);
  
  testIt(sql, result, 'alterColumn-2');  
};

var constraints = function() {
  // alter constraints
  result = 'ALTER TABLE Test2Cons\nDROP CONSTRAINT IF EXISTS "Test2Cons_pkey",\nADD PRIMARY KEY("field22"),\nDROP CONSTRAINT IF EXISTS "Test2Cons_f23_fkey",\nADD CONSTRAINT "Test2Cons_f23_fkey" FOREIGN KEY(field23) REFERENCES "public"."Test2Cons" (field21) ON DELETE CASCADE;';
  
  models.Test2 = models.Test2Cons;
  sql = models.Test2.alter(pgschema, jsonModels.Test2);

  testIt(sql, result, 'Constraints-1');
  
  var result = 'ALTER TABLE Test3Alter\nADD CONSTRAINT "Test3Alter_f33_fkey" FOREIGN KEY("field33") REFERENCES "public"."Test2Cons" ("field21") ON DELETE CASCADE,\nDROP CONSTRAINT IF EXISTS "Test3Alter_f31_fkey";';
  
  models.Test3 = models.Test3Alter;
  sql = models.Test3.alter(pgschema, jsonModels.Test3);

  testIt(sql, result, 'Constraints-2');
};

var addDropTables = function() {
  // add new tables
  var sql, tableName;
  var result = 'CREATE TABLE IF NOT EXISTS "public"."Test3Alter" (\n"field31" VARCHAR(10) NOT NULL,\n"field32" VARCHAR(30) NULL,\n"field33" BOOLEAN DEFAULT true,\n"field34" VARCHAR(30)[][],\nPRIMARY KEY("field31"),\nCONSTRAINT "Test3Alter_f33_fkey" FOREIGN KEY("field33") REFERENCES "public"."Test2Cons" ("field21") ON DELETE CASCADE\n);';
  
  delete jsonModels.Test3Alter;
  
  modelNames.forEach(function(model) {
    if (! (model in jsonModels)) {
      sql = models[model].create(pgschema);
      testIt(sql, result, 'Create model');
    }
  })
  
  // drop old tables 
  result = 'DROP TABLE IF EXISTS "public"."Test3"';
  
  delete models.Test3;
  
  Object.keys(jsonModels).forEach(function(model) {
    if (! (model in models)) {
      tableName = `"${pgschema}"."${model}"`
      sql = `DROP TABLE IF EXISTS ${tableName}`; 
      testIt(sql, result, 'Drop model');
    }
  })
  
}

makeJSON();
noChanges();
addColumn();
dropColumn();
alterColumn();
constraints();
addDropTables();

console.log(`TESTS COMPLETE\nRun: ${testResults.run}  Passed: ${testResults.passed}  Failed: ${testResults.failed}`);