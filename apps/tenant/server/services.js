const root = process.cwd();
const fs = require('fs').promises;
const nunjucks = require('nunjucks');
const uuidv1 = require('uuid/v1');
const bcrypt = require('bcrypt');
const moment = require('moment');
//const saltRounds = 10;

const {jsonToQuery, execQuery, objectify, jsonQueryExecify} = require(root + '/lib/sqlUtil.js');
const {User, CSRF, Department, Employee, Workcode, Empwork, Work, Payroll} = require(root + '/models/tenantModels.js')(false);
const {Session, Tenant} = require(root + '/models/adminModels.js')(false);
const {JSONError, UserError, NunjucksError, InvalidUserError} = require(root + '/lib/errors.js');
const {TravelMessage} = require(root + '/lib/messages.js');
const pgschema = 'public';
const dateFormat = 'MM/DD/YYYY';
const timeFormat = 'hh:mm A';

const makeCSRF = async function(tenant, user) {
  // tenant and user are their codes
  var CSRFToken = uuidv1();
      
  // create CSRF record
  var rec = new CSRF({token: CSRFToken, user: user});
  await rec.insertOne({pgschema: tenant});

  return CSRFToken;
}

const getPayrollPeriodStart = async function(tenant) {
  // either from latest close out + period days, or get period from file + days
  var config = await getAppConfig(tenant);
  var days = config.payroll.periodDays;
  var latest, start;
  var tm = await Payroll.select({pgschema: tenant, rec: {}}); // get all periods, take first (= most current)
  
  if (tm.isGood() && tm.data.length > 0) {
    latest = tm.data[0].sdate;
    start = new Date(latest)
    start.setDate(start.getDate()+days);
    
    return start;
  }
  
  // none, use file date
  return new Date(config.payroll.startDate);
}

const getAppConfig = async function(tenant) {
  var data = await fs.readFile(`${root}/tenant-data/${tenant}/appConfig.json`);
  
  return JSON.parse(data);
}

module.exports = {
  output: {
    main: async function() {
      var ctx = {};
      var nj;
      var tm = new TravelMessage();
      
      try {
        nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros'], { autoescape: true });
        tm.data = nj.render('tenant.html', ctx);
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = new NunjucksError(err);
      }
      
      return tm;
    },
    
    manage: async function(req) {
      // main admin manage page.  Needs a user so won't get here without one
      var ctx = {};
      var nj;
      var tm = new TravelMessage();
      var config = await getAppConfig(req.TID);

      ctx.CSRFToken = await makeCSRF(req.TID, req.user.code);
      ctx.department = Department.getColumnDefns();
      ctx.employee = Employee.getColumnDefns();
      ctx.workcode = Workcode.getColumnDefns();
      ctx.user = User.getColumnDefns();
      ctx.dateFormat = dateFormat;
      ctx.timeFormat = timeFormat;
      ctx.TID = req.TID;
      ctx.home = config.home;

      try {
        nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons', root + '/lib/utils'], { autoescape: true });
        tm.data = nj.render('tenant-manage.html', ctx);
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;
    },
    
    empclock: async function(req) {
      // Clock In Page
      var ctx = {};
      var nj;
      var tm = new TravelMessage();

      ctx.workcode = Workcode.getColumnDefns();
      ctx.dateFormat = dateFormat;
      ctx.timeFormat = timeFormat;
      ctx.TID = req.TID;
      
      try {
        nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons'], { autoescape: true });
        tm.data = nj.render('tenant-empclock.html', ctx);
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;
    },
    
    tips: async function(req) {
      // Tips Page
      var ctx = {};
      var nj;
      var tm = new TravelMessage();

      ctx.dateFormat = dateFormat;
      ctx.timeFormat = timeFormat;
      ctx.TID = req.TID;
      
      try {
        nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons'], { autoescape: true });
        tm.data = nj.render('tenant-tips.html', ctx);
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;
    },
    
  },
  
  auth: {
    getUser: async function(req) {
      var sess, tm, tenant = null, user = null;
      var sessID = req.cookies.tenant_session || '';

      if (sessID) {
        sess = await Session.selectOne({pgschema, cols: '*', showHidden: true, pks: sessID});

        if (!sess.err) {
          tm = await Tenant.selectOne({pgschema, cols: '*', pks: sess.data.tenant});

          if (tm.isGood()) {
            tenant = tm.data;

            tm = await User.selectOne({pgschema: tenant.code, cols: '*', pks: sess.data.user});
            if (tm.isGood()) user = tm.data;
          }
        }
      }

      return [tenant, user];
    },
    
    verifyCSRF: async function(req) {
      // get token, check if user matches
      var TID = req.TID;
      var user = req.user;
      var token = req.CSRFToken || null;
      var tm;

      if (!token) return false;

      tm = await CSRF.selectOne({pgschema: TID, pks: token});
      if (tm.err) return false;

      return tm.data.user == user.code;    
    },
    
    login: async function(body) {
      // credentials good?
      // create Session record 
      // setup cookies
      var match, tm, rec;

      // tenant valid?
      tm = await Tenant.selectOne({pgschema, cols: '', pks: body.tenant});
      if (tm.err) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError()});

      // user valid?
      tm = await User.selectOne({pgschema: body.tenant, cols: 'password', pks: body.username});
      if (tm.err) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError()});

      // password valid?
      match = await bcrypt.compare(body.password, tm.data.password);
      if (!match) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError()});
      
      // create session record
      rec = new Session({id: uuidv1(), tenant: body.tenant, user: body.username});
      tm = await rec.insertOne({pgschema});

      if (tm.isBad()) return tm;
     
      // Reply with blank data not user record, include session as cookie
      return new TravelMessage({data: '', type: 'text', status: 200, cookies: [{name: 'tenant_session', value: tm.data.id, path: '/', 'Max-Age': 60*60*24}]});  //, HttpOnly: true
    },
    
    logout: async function(req) {
      // delete session record
      // remove cookie
      var id = req.cookies.tenant_session || '';
      var tobj;
      
      if (id) {
        tobj = new Session({id});
        await tobj.deleteOne({pgschema});
      }
      
      return new TravelMessage({data: '/tenant', type: 'text', status: 200, cookies: [{name: 'tenant_session', value: ''}]});
    },
  },
  
  query: async function(query) {
    var sql, tm;
    
    try {
      sql = jsonToQuery(query, 'tenant', 'neoc', {});
    }
    catch(err) {
      return new TravelMessage({err: new JSONError(err)});
    }

    tm = await execQuery(sql);
    if (!tm.err) tm.data = objectify(tm.data);

    return tm;
  },

  department: {
    get: async function({pgschema = '', rec = {}} = {}) {
      // get one or more departments
      return await Department.select({pgschema, rec});
    },
    
    insert: async function({pgschema = '', rec = {}} = {}) {
      // Insert Record
      var tobj = new Department(rec);

      return await tobj.insertOne({pgschema});
    },
    
    update: async function({pgschema = '', code = '', rec= {}} = {}) {
      // Update record
      if (!code) return new TravelMessage({err: new UserError('No Department Code Supplied')});
          
      rec.code = code;
      var tobj = new Department(rec);
        
      return await tobj.updateOne({pgschema});
    },
    
    delete: async function({pgschema = '', code = ''} = {}) {
      if (!code) return new TravelMessage({err: new UserError('No Department Code Supplied')});
      
      var tobj = new Department({code});
      return await tobj.deleteOne({pgschema});
    },  
  },
  
  employee: {
    get: async function({pgschema = '', rec = {}} = {}) {
      // get one or more employees
      return await Employee.select({pgschema, rec});
    },

    insert: async function({pgschema = '', rec = {}} = {}) {
      // Insert Record
      var tobj = new Employee(rec);
    
      return await tobj.insertOne({pgschema});
    },
    
    update: async function({pgschema = '', code = '', rec= {}} = {}) {
      // Update record
      if (!code) return new TravelMessage({err: new UserError('No Employee Code Supplied')});
          
      rec.code = code;
      var tobj = new Employee(rec);

      return await tobj.updateOne({pgschema});
    },
    
    delete: async function({pgschema = '', code = ''} = {}) {
      if (!code) return new TravelMessage({err: new UserError('No Employee Code Supplied')});
      
      var tobj = new Employee({code});
      return await tobj.deleteOne({pgschema});
    },  
  },
  
  workcode: {
    get: async function({pgschema = '', rec = {}} = {}) {
      // get one or more workcodes
      return await Workcode.select({pgschema, rec});
    },
    
    insert: async function({pgschema = '', rec = {}} = {}) {
      // Insert Record
      var tobj = new Workcode(rec);
    
      return await tobj.insertOne({pgschema});
    },
    
    update: async function({pgschema = '', code = '', rec= {}} = {}) {
      // Update record
      if (!code) return new TravelMessage({err: new UserError('No workcode Code Supplied')});
          
      rec.code = code;
      var tobj = new Workcode(rec);

      return await tobj.updateOne({pgschema});
    },
    
    delete: async function({pgschema = '', code = ''} = {}) {
      if (!code) return new TravelMessage({err: new UserError('No workcode Code Supplied')});
      
      var tobj = new Workcode({code});
      return await tobj.deleteOne({pgschema});
    },  
  },
  
  user: {
    get: async function({pgschema = '', rec = {}} = {}) {
      // get one or more users
      return await User.select({pgschema, rec});
    },
    
    insert: async function({pgschema = '', rec = {}} = {}) {
      // Insert Record
      var tobj = new User(rec);
    
      return await tobj.insertOne({pgschema});
    },
    
    update: async function({pgschema = '', code = '', rec= {}} = {}) {
      // Update record
      if (!code) return new TravelMessage({err: new UserError('No User Code Supplied')});
          
      rec.code = code;
      var tobj = new User(rec);
        
      return await tobj.updateOne({pgschema});
    },
    
    delete: async function({pgschema = '', code = ''} = {}) {
      if (!code) return new TravelMessage({err: new UserError('No User Code Supplied')});
      
      var tobj = new User({code});
      return await tobj.deleteOne({pgschema});
    },  
  },

  empwork: {
    get: async function({pgschema = '', rec = {}} = {}) {
      // get all work codes for an employee
      return await Empwork.select({pgschema, rec});
    },
    
    insert: async function({pgschema = '', rec = {}} = {}) {
      // Insert Record
      if (!rec.payrate) rec.payrate = '0';

      var tobj = new Empwork(rec);

      return await tobj.insertOne({pgschema});
    },
    
    update: async function({pgschema = '', id = '', rec= {}} = {}) {
      // Update record
      if (!id) return new TravelMessage({err: new UserError('No Empwork ID Supplied')});
      if (!rec.payrate) rec.payrate = '0';

      rec.id = id;
      var tobj = new Empwork(rec);
        
      return await tobj.updateOne({pgschema});
    },
    
    delete: async function({pgschema = '', id = ''} = {}) {
      if (!id) return new TravelMessage({err: new UserError('No Empwork ID Supplied')});
      
      var tobj = new Empwork({id});
      return await tobj.deleteOne({pgschema});
    },  
  },
  
  work: {
    get: async function({pgschema = '', rec = {}} = {}) {
      // get all work for an employee
      return await Work.select({pgschema, rec});
    },
    
    insert: async function({pgschema = '', rec = {}} = {}) {
      // Insert Record
      var tobj = new Work(rec);

      return await tobj.insertOne({pgschema});
    },
    
    update: async function({pgschema = '', id = '', rec= {}} = {}) {
      // Update record
      if (!id) return new TravelMessage({err: new UserError('No Work ID Supplied')});
          
      rec.id = id;
      var tobj = new Work(rec);
        
      return await tobj.updateOne({pgschema});
    },
    
    delete: async function({pgschema = '', id = ''} = {}) {
      if (!id) return new TravelMessage({err: new UserError('No Work ID Supplied')});
      
      var tobj = new Work({id});
      return await tobj.deleteOne({pgschema});
    },  
  },  
  
  empclock: {
    login: async function(body) {
      var match, emp, tm, user = 'Anonymous', pswd = 'herbie';
      var CSRFToken;

      // employee valid?
      emp = await Employee.selectOne({pgschema: body.tenant, cols: ['first', 'last', 'password'], pks: body.username});
      if (emp.isBad()) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError('Employee')});

      // password valid?
      match = await bcrypt.compare(body.password, emp.data.password);
      if (!match) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError('Password')});

      tm = await module.exports.auth.login({tenant: body.tenant, username: user, password: pswd});
      if (tm.isBad()) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError('User')});

      CSRFToken = await makeCSRF(body.tenant, user);
      
      // Reply with name, and cookie from login
      tm.data = {first: emp.data.first, last: emp.data.last, CSRFToken};
      tm.type = 'json';

      return tm;
    },
    
    empwork: async function({pgschema='', emp=''} = {}) {
      // get work codes + desc for an employee
      var query = {
        Empwork: {
          columns: ['id', 'workcode', 'payrate'],
          innerJoin: [
            {Workcode: {columns: ['desc', 'method']}}
          ],
          orderBy: [{Workcode: ['desc']}],
          where: 'WHERE "Empwork"."employee"=$1'
        }
      };
      
      return jsonQueryExecify({query, group: 'tenant', pgschema, values: [emp]});
    },
    
    work: async function({pgschema='', emp=''} = {}) {
      // get past work entries since date X.
      var query = {
        Work: {
          columns: ['*'],
          innerJoin: [
            {Workcode: {columns: ['desc']}}
          ],
          where: 'WHERE "Work"."employee"=$1 AND "Work"."sdate" >= $2'
        }
      };

      var sdate = await getPayrollPeriodStart(pgschema);
      return jsonQueryExecify({query, group: 'tenant', pgschema, values: [emp, sdate]});
    },
    
    clockin: async function({pgschema='', employee='', workcode='', payrate='0'} = {}) {
      var sdate = new Date();
      var stime = new Date();
      var rec = new Work({employee, workcode, payrate, sdate, stime: stime.toLocaleTimeString()});
      
      return await rec.insertOne({pgschema});      
    },   
    
    clockout: async function({pgschema='', emp='', id=''} = {}) {
      var edate = new Date();
      var etime = new Date();
      var hours, m1, m2;
      var tm, tobj, rec;
      
      // get Work record, make sure employee matches
      tm = await Work.selectOne({pgschema, cols: '*', pks: id});
      if (tm.isBad() || tm.data.employee != emp) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError()});
      
      // calc hours
      m1 = moment(tm.data.sdate.toJSON().split('T')[0] + 'T' + tm.data.stime);
      m2 = moment(edate.toJSON());
      hours = (m2.diff(m1, 'seconds') / 3600).toFixed(2);

      // update work record      
      rec = {id, edate, etime: etime.toLocaleTimeString(), hours};
      tobj = new Work(rec);
        
      return await tobj.updateOne({pgschema});
    },       
  },
  
  payroll: {
    getParams: async function({pgschema} = {}) {
      var config = await getAppConfig(pgschema);
      var sdate = await getPayrollPeriodStart(pgschema);
      var days = parseInt(config.payroll.periodDays, 10);
      var edate = new Date(sdate); edate.setDate(edate.getDate()+days-1);      
      var tm = new TravelMessage();
      
      tm.data = {sdate: sdate.toLocaleDateString(), edate: edate.toLocaleDateString(), config};
      tm.type = 'json';
      
      return tm;
    },
    
    getPastPeriods: async function({pgschema} = {}) {
      var config = await getAppConfig(pgschema);
      var days = parseInt(config.payroll.periodDays, 10);
      var tm = await Payroll.select({pgschema});
      var sdate, edate;

      if (tm.isGood()) {
        tm.data.forEach(function(rec) {
          sdate = new Date(rec.sdate)
          edate = new Date(sdate); edate.setDate(edate.getDate()+days-1);      
          
          rec.sdate = sdate.toLocaleDateString();
          rec.edate = edate.toLocaleDateString();
          
          rec.desc = rec.sdate + ' - ' + rec.edate;
        })
      }
      
      return tm;
    },
    
    run: async function({pgschema = ''}) {
      /*  for each dept 
          for each employee 
          organize work by workcode/date
          after x hours/week, then ot applies
          
          Then reorganize so that it can be sorted by dept and employee
      */  
      
      var tm, data = {}, sorted = [], payrates = {};
      var getPayrate = function(emp, work) {
        return (emp in payrates && work in payrates[emp]) ? parseFloat(payrates[emp][work]) : 0.0;
      }
      
      // get payrates & reorganize by {emp: {code: rate}}
      tm = await Empwork.select({pgschema});
      if (tm.isBad()) return tm;
      
      tm.data.forEach(function(rec) {
        if (!(rec.employee in payrates)) payrates[rec.employee] = {};
        if (!(rec.workcode in payrates[rec.employee])) payrates[rec.employee][rec.workcode] = rec.payrate;
      });
      
      // get work data
      var query = {
        Work: {
          columns: ['*'],
          innerJoin: [
            {Employee: {
              columns: ['last', 'first'],
              innerJoin: [
                {Department: {columns: ['code','name']}},
              ]
            }},
            {Workcode: {columns: ['desc', 'method']}}
          ],
          where: 'WHERE "Work"."sdate" >= $1 AND "Work"."sdate" <= $2',
          orderBy: [{Work: ['employee', 'sdate', 'stime', 'etime']}]
        }
      };

      var config = await getAppConfig(pgschema);
      var sdate = await getPayrollPeriodStart(pgschema);     
      var sdateM = moment(sdate);
      var days = parseInt(config.payroll.periodDays, 10);
      var maxHours = parseInt(config.payroll.weeklyHours, 10);
      var edate = new Date(sdate); edate.setDate(edate.getDate()+days-1);
      var sql = jsonToQuery(query, 'tenant', pgschema, {});
      var stmt = {text: sql, values: [sdate, edate]};
      var totals = {weeks: {0: 0, 1: 0}, reg:0, ot: 0, total: 0};

      tm = await execQuery(stmt);
      if (tm.isBad()) return tm;
      
      /*
          data: {deptcode: {code, name, 
                  employees: {empcode: {code, last, first, weeks[0,0], reg, ot, total,
                    works: {workcode: {code, desc, 
                      weeks: {week#: {days: [hoursx7], reg, ot, total, rate}
                    }}
                  }}
                }}      
                
          sorted: [{dept, [employees: [{works: []}]]}]
      */
      
      // process
      tm.data.forEach(function(rec) {
        let dcode = rec['Department.code'];
        let ecode = rec.employee;
        let wcode = rec.workcode;
        let sdateMR = moment(rec.sdate);
        let day = sdateMR.diff(sdateM, 'day');
        let wkno = Math.floor(day/7);
        let dayno = day % 7;
        let rate = getPayrate(ecode, wcode);
        let method = rec['Workcode.method'];

        //if (wkno < 0 || wkno > 1) continue;

        // setup structure
        if (!(dcode in data)) data[dcode] = {code: dcode, name: rec['Department.name'], employees: {}};
        if (!(ecode in data[dcode].employees)) data[dcode].employees[ecode] = 
          {code: ecode, last: rec['Employee.last'], first: rec['Employee.first'], weeks: [0,0], reg: 0, ot: 0, total: 0, works: {}, work: []};
        if (!(wcode in data[dcode].employees[ecode].works)) {
          data[dcode].employees[ecode].works[wcode] = {code: wcode, desc: rec['Workcode.desc'], method: method, weeks: [{},{}]};
          data[dcode].employees[ecode].works[wcode].weeks[0] = {days: [0,0,0,0,0,0,0], reg: 0, ot: 0, total: 0, biwkly: '', daily: 0, rate: rate.toFixed(2)}
          data[dcode].employees[ecode].works[wcode].weeks[1] = {days: [0,0,0,0,0,0,0], reg: 0, ot: 0, total: 0, biwkly: 0, daily: 0, rate: rate.toFixed(2)};
        }        

        // fill structure
        rec.tippy = (method == 'T');
        data[dcode].employees[ecode].work.push(rec);

        if (method != 'T') {
          // ot hours yet?
          let reg=0, ot=0;
          
          if (data[dcode].employees[ecode].weeks[wkno] + rec.hours > maxHours) {
            reg = maxHours - data[dcode].employees[ecode].weeks[wkno];
            ot = rec.hours - reg;
          }
          else {
            reg = rec.hours;
          }
          
          data[dcode].employees[ecode].weeks[wkno] += rec.hours;
          data[dcode].employees[ecode].reg += reg;
          data[dcode].employees[ecode].ot += ot;
          data[dcode].employees[ecode].total += rec.hours;
                  
          data[dcode].employees[ecode].works[wcode].weeks[wkno].days[dayno] += rec.hours;
          data[dcode].employees[ecode].works[wcode].weeks[wkno].reg += reg;
          data[dcode].employees[ecode].works[wcode].weeks[wkno].ot += ot;
          data[dcode].employees[ecode].works[wcode].weeks[wkno].total += rec.hours;
          data[dcode].employees[ecode].works[wcode].weeks[1].biwkly += rec.hours;

          if (method == 'D' || method == 'F') data[dcode].employees[ecode].works[wcode].weeks[wkno].daily += 1;

          totals.weeks[wkno] += rec.hours;
          totals.reg += reg;
          totals.ot += ot;
          totals.total += rec.hours;
        }
        else {
          data[dcode].employees[ecode].works[wcode].weeks[wkno].days[dayno] += rec.tip;
          data[dcode].employees[ecode].works[wcode].weeks[wkno].total += rec.tip;
          data[dcode].employees[ecode].works[wcode].weeks[1].biwkly += rec.tip;
        }
      })

      // build sorted
      for (var dept in data) {
        var dobj = {};
       
        dobj.code = data[dept].code;
        dobj.name = data[dept].name;
        dobj.employees = [];
        
        for (var emp in data[dept].employees) {
          var eobj = {};
          
          eobj.code = data[dept].employees[emp].code;
          eobj.last = data[dept].employees[emp].last;
          eobj.first = data[dept].employees[emp].first;
          eobj.weeks = data[dept].employees[emp].weeks;
          eobj.reg = data[dept].employees[emp].reg;
          eobj.ot = data[dept].employees[emp].ot;
          eobj.total = data[dept].employees[emp].total;
          eobj.work = data[dept].employees[emp].work;
          eobj.works = [];
          
          for (var work in data[dept].employees[emp].works) {
            eobj.works.push(data[dept].employees[emp].works[work]);
          }         
          
          dobj.employees.push(eobj);
        }
        
        sorted.push(dobj);
      }

      // sort: first by dept, then by employee, then by work code.
      sorted.sort(function(dept) {
        dept.employees.forEach(function(emp) {
          emp.works.sort(function(worka, workb) {
            return (worka.code < workb.code) ? -1 : (worka.code > workb.code) ? 1 : 0;
          })
        })
        
        dept.employees.sort(function(empa, empb) {
          return (empa.last+empa.first < empb.last+empb.first) ? -1 : (empa.last+empa.first > empb.last+empb.first) ? 1 : 0;
        })
      })
      
      sorted.sort(function(depta, deptb) {
        return (depta.name < deptb.name) ? -1 : (depta.name > deptb.name) ? 1 : 0;
      })

      // output!
      tm = new TravelMessage();
      
      try {
        var nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons'], { autoescape: true });
        nj.addFilter('hhmm', function(dec) {
          // convert decimal hours to hh:mm, ie 13.42 to 13:25
          var mins = Math.floor((dec - Math.floor(dec)) * 60);
          
          return Math.floor(dec) + ':' + ('0' + mins).slice(-2);
        });

        nj.addFilter('localDate', function(dt) {
          return moment(dt).format(dateFormat);
        });

        nj.addFilter('localTime', function(dt) {
          return moment(dt).format(timeFormat);
        })

        nj.addFilter('dollars', function(amt) {
          return parseFloat(amt).toFixed(2);
        })
        
        tm.data = nj.render('rpt-payroll.html', {data: sorted, startDate: sdate.toLocaleDateString(), endDate: edate.toLocaleDateString(), totals});
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;
    },
    
    confirm: async function({pgschema, rec={}} = {}) {
      var pay = new Payroll(rec);
      var tm = await pay.insertOne({pgschema})
      
      return tm;
    },    
  },
  
  tips: {
    login: async function(body) {
      var tm
      var CSRFToken;

      tm = await module.exports.auth.login(body);
      if (tm.isBad()) return new TravelMessage({data: '', type: 'text', err: new InvalidUserError('User')});

      CSRFToken = await makeCSRF(body.tenant, body.username);
      
      // Reply with token, and cookie from login
      tm.data = {CSRFToken};
      tm.type = 'json';

      return tm;
    },

    get: async function({pgschema='', dept='', date = ''} = {}) {
      var query = {
        Work: {
          columns: ['id','tip'],
          innerJoin: [
            {Employee: {
              columns: ['code'],
              innerJoin: [
                {Department: {
                  columns: ['code']
                }}
              ]
            }},
            {Workcode: {
              columns: ['code']
            }}
          ],
          where: 'WHERE "Workcode"."method" = \'T\' AND "Department"."code" = $1 AND "Work"."sdate" = $2'
        }
      }

      return jsonQueryExecify({query, group: 'tenant', pgschema, values: [dept, date]});      
    },

    insert: async function({pgschema='', emp='', dt='', work='', tip=''}={}) {
      var tm = (new Date()).toJSON().split('T')[1];
      var sdate = dt;
      var edate = dt;
      var stime = tm;
      var etime = tm;
      var hours = 0;
      var rec = new Work({employee: emp, workcode: work, sdate, stime, edate, etime, hours, tip});

      return rec.insertOne({pgschema});
    },

    update: async function({pgschema, id, tip}={}) {
      if (!id) return new TravelMessage({err: new UserError('No ID Supplied')});
          
      rec = {id, tip};
      var tobj = new Work(rec);
        
      return await tobj.updateOne({pgschema});      
    }
  },    
  
  reports: {
    getParams: async function({pgschema} = {}) {
      var config = await getAppConfig(pgschema);
      var tm = new TravelMessage();
      
      delete config.payroll;
      
      tm.data = {config};
      tm.type = 'json';
      
      return tm;
    },
    
    depts: async function({pgschema='', active='A'} = {}) {
      var rec = (active == 'A') ? {} : {active: (active == 'Y') ? true : false};
      var depts = await Department.select({pgschema, rec});
      var tm = new TravelMessage();
      
      if (depts.isBad()) return depts;
      
      try {
        var nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons'], { autoescape: true });
        
        tm.data = nj.render('rpt-depts.html', {data: depts.data});
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;      
    },
  
    emps: async function({pgschema='', active='A'} = {}) {
      var rec = (active == 'A') ? {} : {active: (active == 'Y') ? true : false};
      var emps = await Employee.select({pgschema, rec});
      var tm = new TravelMessage();
      
      if (emps.isBad()) return emps;
      
      try {
        var nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons'], { autoescape: true });
        
        tm.data = nj.render('rpt-emps.html', {data: emps.data});
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;      
    },
    
    works: async function({pgschema='', active='A'} = {}) {
      var rec = (active == 'A') ? {} : {active: (active == 'Y') ? true : false};
      var works = await Workcode.select({pgschema, rec});
      var tm = new TravelMessage();
      
      if (works.isBad()) return works;
      
      try {
        var nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons'], { autoescape: true });
        
        tm.data = nj.render('rpt-works.html', {data: works.data});
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;      
    },
    
    pay: async function({pgschema={}, active='A'} = {}) {
      var where = (active == 'A') ? '' : {active: (active == 'Y') ? 'WHERE "Employee"."active" = true' : 'WHERE "Employee"."active" = false'};
      
      // get pay data
      var query = {
        Empwork: {
          columns: ['payrate'],
          innerJoin: [
            {Employee: {
              columns: ['name'],
              innerJoin: [
                {Department: {columns: ['name']}},
              ]
            }},
            {Workcode: {columns: ['desc']}}
          ],
          where: (where) ? where : '',
          orderBy: [{Department: ['name']}, {Employee: ['name']}, {Workcode: ['desc']}]
        }
      };
      
      var sql = jsonToQuery(query, 'tenant', pgschema, {});
      var stmt = {text: sql, values: []};

      var res = await execQuery(stmt);

      if (res.isBad()) return res;
      
      var tm = new TravelMessage();
      
      try {
        var nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons'], { autoescape: true });
        
        tm.data = nj.render('rpt-empwork.html', {data: res.data});
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;      
    },
    
    users: async function({pgschema={}, active='A'} = {}) {
      var rec = (active == 'A') ? {} : {active: (active == 'Y') ? true : false};
      var users = await User.select({pgschema, rec});
      var tm = new TravelMessage();
      
      if (users.isBad()) return users;
      
      try {
        var nj = nunjucks.configure([root + '/apps/tenant/public', root + '/apps', root + '/macros', root + '/mvc-addons'], { autoescape: true });
        
        tm.data = nj.render('rpt-users.html', {data: users.data});
        tm.type = 'html';
      }  
      catch(err) {
        tm.err = tm.err = new NunjucksError(err);
      }
      
      return tm;      
    }
  },
  
  dymo: {
    getConfig: async function({pgschema = ''} = {}) {
      // get one or more employees
      var config = await getAppConfig(pgschema);
      var dymo = config.dymo.label;
      var xml = await fs.readFile(`${root}/dymo/${dymo}.cfg`);

      var tm = new TravelMessage()
      tm.data = {xml: xml.toString()};
      tm.type = 'json';
      
      return tm;
    },
  },
};