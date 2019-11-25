const root = process.cwd();
const Fields = require(root + '/lib/model/modelFields');
const modelBuild = require(root + '/lib/model/modelBuild.js');
const modelRun = require(root + '/lib/model/modelRun.js');

var setNewDate = function() {
  return new Date();
};

var methodChoices = [
  {value: 'H', text: 'Hourly'},
  {value: 'D', text: 'Daily'},
  {value: 'F', text: 'Flat'},
  {value: 'T', text: 'Tip'},
];

var fnDateTime = function(record) {
  // test if sdate+stime <= edate+etime
  var dt, tm, sdt, edt;

  if (record.sdate && record.stime && record.edate && record.etime) {
    [dt, tm] = record.sdate.split('T');
    sdt = new Date(dt + 'T' + record.stime);

    [dt, tm] = record.edate.split('T');
    edt = new Date(dt + 'T' + record.etime);

    if (sdt > edt) return 'Clock In is after Clock Out';
  }

  return null;
};

module.exports = function(buildOrRun) {
  var Model = (!buildOrRun) ? modelRun : modelBuild;
  
  var models = {
    Department: class Department extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            code: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Dept Code'}),
            name: new Fields.Char({notNull: true, maxLength: 40, verbose: 'Dept Name'}),
            mgr: new Fields.Char({null: true, verbose: 'Manager'}),
            password: new Fields.Password({minLength: 8, maxLength: 128, verbose: 'Password'}),
            active: new Fields.Boolean({default: true, verbose: 'Active'}),
          },
          
          constraints: {
            pk: ['code'],
            fk: [{name: 'mgr', columns: ['mgr'], table: models.Employee, tableColumns: ['code'], onDelete: 'NO ACTION'}],
          },
          
          hidden: ['password'],
          
          orderBy: ['name'],
          
          dbschema: 'tenant',
        }
      }
    },

    Employee: class Employee extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            code: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Code'}),
            first: new Fields.Char({notNull: true, maxLength: 20, verbose: 'First Name'}),
            last: new Fields.Char({notNull: true, maxLength: 20, verbose: 'Last Name'}),
            address: new Fields.Char({maxLength: 30, verbose: 'Address'}),
            city: new Fields.Char({maxLength: 30, verbose: 'City'}),
            state: new Fields.Char({maxLength: 2, verbose: 'State'}),
            zipcode: new Fields.Char({maxLength: 10, verbose: 'Zipcode'}),
            phone: new Fields.Char({maxLength: 15, verbose: 'Telephone'}),
            email: new Fields.Char({null: true, maxLength: 50, isEmail: true, verbose: 'Email Address'}),
            ssn: new Fields.Char({maxLength: 10, verbose: 'SSN'}),
            password: new Fields.Password({notNull: true, minLength: 8, maxLength: 128, verbose: 'Password'}),
            dept: new Fields.Char({null: true, maxLength: 10, verbose: 'Department'}),
            active: new Fields.Boolean({default: true, verbose: 'Active'}),    
            name: new Fields.Derived({defn: 'concat("Employee"."last",\', \',"Employee"."first")', verbose: 'Employee Name'}) 
          },
          
          constraints: {
            pk: ['code'],
            fk: [{name: 'dept', columns: ['dept'], table: models.Department, tableColumns: ['code'], onDelete: 'NO ACTION'}],
          },
          
          hidden: ['password'],
          
          orderBy: ['last', 'first'],
          
          dbschema: 'tenant',
        }
      }
    },      
    
    Workcode: class Workcode extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            code: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Work Code'}),
            desc: new Fields.Char({notNull: true, maxLength: 40, verbose: 'Description'}),
            dept: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Department'}),
            method: new Fields.Char({notNull: true, maxLength: 1, choices: methodChoices, verbose: 'Method'}),
            active: new Fields.Boolean({default: true, verbose: 'Active'}),
          },
          
          constraints: {
            pk: ['code'],
            fk: [{name: 'dept', columns: ['dept'], table: models.Department, tableColumns: ['code'], onDelete: 'NO ACTION'}],
          },
          
          orderBy: ['desc'],
          
          dbschema: 'tenant',
        }
      }
    },
        
    Empwork: class Empwork extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            id: new Fields.Serial({}),
            employee: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Employee Code'}),
            workcode: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Work Code'}),
            payrate: new Fields.Decimal({nulNull: true, maxLength: 9, min: 0.00, max: 999999.99, step: .1, verbose: 'Pay Rate'})
          },
          
          constraints: {
            pk: ['id'],
            fk: [{name: 'employee', columns: ['employee'], table: models.Employee, tableColumns: ['code'], onDelete: 'NO ACTION'},
                 {name: 'workcode', columns: ['workcode'], table: models.Workcode, tableColumns: ['code'], onDelete: 'NO ACTION'}],
          },
          
          orderBy: ['employee', 'workcode'],
          
          dbschema: 'tenant',
        }
      }
    },

    Work: class Work extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            id: new Fields.Serial({}),
            employee: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Employee Code'}),
            workcode: new Fields.Char({notNull: true, maxLength: 10, verbose: 'Work Code'}),
            sdate: new Fields.Date({notNull: true, verbose: 'Start Date'}),
            stime: new Fields.Time({notNull: true, verbose: 'Start Time'}),
            edate: new Fields.Date({null: true, verbose: 'End Date'}),
            etime: new Fields.Time({null: true, test: fnDateTime, verbose: 'End Time'}),
            hours: new Fields.Float({null: true, verbose: 'Hours Worked'}),
            tip: new Fields.Float({null: true, verbose: 'Tips'}),
          },
          
          constraints: {
            pk: ['id'],
            fk: [
              {name: 'employee', columns: ['employee'], table: models.Employee, tableColumns: ['code'], onDelete: 'NO ACTION'},
              {name: 'workcode', columns: ['workcode'], table: models.Workcode, tableColumns: ['code'], onDelete: 'NO ACTION'}
            ],
          },
          
          orderBy: ['employee', '-sdate', '-stime', '-etime'],
          
          dbschema: 'tenant',
        }
      }
    },
    
    Payroll: class Payroll extends Model {
      constructor(obj, opts) {
        super(obj, opts);
      }
      
      static definition() {
        return {
          schema: {
            id: new Fields.Serial({}),
            sdate: new Fields.Date({notNull: true, verbose: 'Pay Period Start Date'}),
            user: new Fields.Char({notNull: true, maxLength: 10, verbose: 'User Code'}),
            rundate: new Fields.DateTime({notNull: true, maxLength: 30, onBeforeInsert: setNewDate, verbose: 'Run Date/Time'}),
            html: new Fields.Text({null: true, verbose: 'HTML'}),
          },
          
          constraints: {
            pk: ['id'],
            fk: [{name: 'user', columns: ['user'], table: models.User, tableColumns: ['code'], onDelete: 'NO ACTION'}],
          },
          
          orderBy: ['-sdate'],
          
          dbschema: 'tenant',
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
          
          dbschema: 'tenant',
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
          
          dbschema: 'tenant',
        }
      }
    },
  }
  
  return models;
};
