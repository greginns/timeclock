const root = process.cwd();
const Fields = require(root + '/lib/model/modelFields');
const modelBuild = require(root + '/lib/model/modelBuild.js');
const modelRun = require(root + '/lib/model/modelRun.js');

module.exports = function(opts) {
  var Model = (!opts) ? modelRun : modelBuild;
  
  var models = {
    Test1: class Test1 extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field11: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Field-1-1'}),
            field12: new Fields.Char({null: true, maxLength: 30, verbose: 'Field-1-2'}),
            field13: new Fields.Boolean({default: true, verbose: 'Field-1-3'}),
            field14: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-1-4'}),
            field15: new Fields.Char({ maxLength: 30, verbose: 'Field-1-5'}),
            field16: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-1-6'}),
          },
          
          constraints: {
            pk: ['field11'],
          },
          
          orderBy: ['field12'],
          
          pgschema: 'public',
        }
      }
    },
    
    Test1Add: class Test1Add extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field11: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Field-1-1'}),
            field12: new Fields.Char({null: true, maxLength: 30, verbose: 'Field-1-2'}),
            field13: new Fields.Boolean({default: true, verbose: 'Field-1-3'}),
            field14: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-1-4'}),
            field15: new Fields.Char({ maxLength: 30, verbose: 'Field-1-5'}),
            field16: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-1-6'}),
            field17: new Fields.Char({ maxLength: 30, verbose: 'Field-1-7'}),
          },
          
          constraints: {
            pk: ['field11'],
          },
          
          orderBy: ['field12'],
          
          pgschema: 'public',
        }
      }
    },
    
    Test1Drop: class Test1Drop extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field11: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Field-1-1'}),
            field12: new Fields.Char({null: true, maxLength: 30, verbose: 'Field-1-2'}),
            field13: new Fields.Boolean({default: true, verbose: 'Field-1-3'}),
            field15: new Fields.Char({ maxLength: 30, verbose: 'Field-1-5'}),
            field16: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-1-6'}),
          },
          
          constraints: {
            pk: ['field11'],
          },
          
          orderBy: ['field12'],
          
          pgschema: 'public',
        }
      }
    },
    
    Test1Alter: class Test1Drop extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field11: new Fields.Char({notNull: false, maxLength: 10, verbose: 'Field-1-1'}),
            field12: new Fields.Char({null: false, maxLength: 30, verbose: 'Field-1-2'}),
            field13: new Fields.Boolean({default: false, verbose: 'Field-1-3'}),
            field14: new Fields.Char({ maxLength: 30, array: 3, verbose: 'Field-1-4'}),
            field15: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-1-5'}),
            field16: new Fields.Char({ maxLength: 31, verbose: 'Field-1-6'}),
          },
          
          constraints: {
            pk: ['field11'],
          },
          
          orderBy: ['field12'],
          
          pgschema: 'public',
        }
      }
    },
       
    Test2: class Test2 extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field21: new Fields.Char({notNull: false, maxLength: 10, verbose: 'Field-2-1'}),
            field22: new Fields.Char({null: false, maxLength: 30, verbose: 'Field-2-2'}),
            field23: new Fields.Boolean({default: false, verbose: 'Field-2-3'}),
            field24: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-2-4'}),
          },
          
          constraints: {
            pk: ['field21'],
            fk: [{name: 'f23', columns: ['field23'], table: models.Test1, tableColumns: ['field13'], onDelete: 'NO ACTION'}],
          },
          
          orderBy: ['field22'],
          
          pgschema: 'public',
        }
      }
    },
    
    Test2Alter: class Test2Alter extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field21: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Field-2-1'}),
            field22: new Fields.Char({null: true, maxLength: 30, verbose: 'Field-2-2'}),
            field23: new Fields.Boolean({default: true, verbose: 'Field-2-3'}),
            field24: new Fields.Text({ maxLength: 30, array: 2, verbose: 'Field-2-4'}),
          },
          
          constraints: {
            pk: ['field21'],
            fk: [{name: 'f23', columns: ['field23'], table: models.Test1, tableColumns: ['field13'], onDelete: 'NO ACTION'}],
          },
          
          orderBy: ['field22'],
          
          pgschema: 'public',
        }
      }
    },
    
    Test2Cons: class Test2Cons extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field21: new Fields.Char({notNull: false, maxLength: 10, verbose: 'Field-2-1'}),
            field22: new Fields.Char({null: false, maxLength: 30, verbose: 'Field-2-2'}),
            field23: new Fields.Boolean({default: false, verbose: 'Field-2-3'}),
            field24: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-2-4'}),
          },
          
          constraints: {
            pk: ['field22'],
            fk: [{name: 'f23', columns: ['field23'], table: models.Test2, tableColumns: ['field21'], onDelete: 'CASCADE'}],
          },
          
          orderBy: ['field22'],
          
          pgschema: 'public',
        }
      }
    },  
        
    Test3: class Test3 extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field31: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Field-3-1'}),
            field32: new Fields.Char({null: true, maxLength: 30, verbose: 'Field-3-2'}),
            field33: new Fields.Boolean({default: true, verbose: 'Field-3-3'}),
            field34: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-3-4'}),
          },
          
          constraints: {
            pk: ['field31'],
            fk: [{name: 'f31', columns: ['field33'], table: models.Test2, tableColumns: ['field21'], onDelete: 'CASCADE'}]
          },
          
          orderBy: ['field32'],
          
          pgschema: 'public',
        }
      }
    },
        
    Test3Alter: class Test3Alter extends Model {
      constructor(obj) {
        super(obj);
      }
      
      static definition() {
        return {
          schema: {
            field31: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Field-3-1'}),
            field32: new Fields.Char({null: true, maxLength: 30, verbose: 'Field-3-2'}),
            field33: new Fields.Boolean({default: true, verbose: 'Field-3-3'}),
            field34: new Fields.Char({ maxLength: 30, array: 2, verbose: 'Field-3-4'}),
          },
          
          constraints: {
            pk: ['field31'],
            fk: [{name: 'f33', columns: ['field33'], table: models.Test2, tableColumns: ['field21'], onDelete: 'CASCADE'}]
          },
          
          orderBy: ['field32'],
          
          pgschema: 'public',
        }
      }
    }
    
  }
  
  return models;
};
