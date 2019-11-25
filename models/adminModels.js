const root = process.cwd();
const Fields = require(root + '/lib/model/modelFields');
const modelBuild = require(root + '/lib/model/modelBuild.js');
const modelRun = require(root + '/lib/model/modelRun.js');

var setNewDate = function() {
  return new Date();
}

module.exports = function(buildOrRun) {
  var Model = (!buildOrRun) ? modelRun : modelBuild;
  
  var models = {
    Tenant: class Tenant extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            code: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Tenant Code'}),
            coname: new Fields.Char({notNull: true, maxLength: 30, verbose: 'Company Name'}),
            first: new Fields.Char({notNull: true, maxLength: 20, verbose: 'First Name'}),
            last: new Fields.Char({notNull: true, maxLength: 20, verbose: 'Last Name'}),
            address: new Fields.Char({maxLength: 30, verbose: 'Address'}),
            city: new Fields.Char({maxLength: 30, verbose: 'City'}),
            state: new Fields.Char({maxLength: 2, verbose: 'State'}),
            zipcode: new Fields.Char({maxLength: 10, verbose: 'Zipcode'}),
            phone: new Fields.Char({maxLength: 15, verbose: 'Telephone'}),
            email: new Fields.Char({notNull: true, maxLength: 50, isEmail: true, verbose: 'Email Address'}),
            active: new Fields.Boolean({default: true, verbose: 'Active'}),     
            added: new Fields.DateTime({onBeforeInsert: setNewDate, verbose: 'Date Added'}),     
          },
          
          constraints: {
            pk: ['code'],
          },
          
          orderBy: ['coname'],
          
          dbschema: 'public',
        }
      }
    },

    User: class User extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            code: new Fields.Char({notNull: true, maxLength: 10, verbose: 'User Code'}),
            name: new Fields.Char({notNull: true, maxLength: 30, verbose: 'User Name'}),
            email: new Fields.Char({notNull: true, maxLength: 50, isEmail: true, verbose: 'Email Address'}),
            password: new Fields.Password({notNull: true, minLength: 8, maxLength: 128, verbose: 'Password'}),
            active: new Fields.Boolean({default: true, verbose: 'Active'}),     
          },
          
          constraints: {
            pk: ['code'],
          },
          
          hidden: ['password'],
          
          orderBy: ['name'],
          
          dbschema: 'public',
        }
      }
    },

    CSRF: class CSRF extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            token: new Fields.Char({notNull: true, maxLength: 128, verbose: 'CSRF Token'}),
            user: new Fields.Char({null: true, maxLength: 10, verbose: 'User Code'}),
            issued: new Fields.DateTime({notNull: true, maxLength: 30, onBeforeInsert: setNewDate, verbose: 'Issued On'}),
          },
          
          constraints: {
            pk: ['token'],
            fk: [{name: 'user', columns: ['user'], table: models.User, tableColumns: ['code'], onDelete: 'NO ACTION'}],
          },
          
          orderBy: ['issued'],
          
          dbschema: 'public',
        }
      }
    },

    Session: class Session extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            id: new Fields.Char({notNull: true, maxLength: 128, verbose: 'Session ID'}),
            tenant: new Fields.Char({null: true, maxLength: 10, verbose: 'Tenant'}),
            user: new Fields.Char({null: true, maxLength: 10, verbose: 'User'}),
            issued: new Fields.DateTime({notNull: true, maxLength: 30, onBeforeInsert: setNewDate, verbose: 'Issued On'}),
          },
          
          constraints: {
            pk: ['id'],
            fk: [
              //{name: 'tenant', columns: ['tenant'], table: models.Tenant, tableColumns: ['code'], onDelete: 'NO ACTION'},
              //{name: 'user', columns: ['user'], table: models.User, tableColumns: ['code'], onDelete: 'NO ACTION'}
            ],
          },
          
          orderBy: ['issued'],
          
          dbschema: 'all',
        }
      }
    },
  }
  
  return models;
};

/*
module.exports.Tenant = Tenant;
module.exports.User = User;
module.exports.CSRF = CSRF;
module.exports.Session = Session;
*/