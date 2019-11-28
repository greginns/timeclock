const root = process.cwd();
const {JSONError} = require(root + '/lib/errors.js');
const {ResponseMessage} = require(root + '/lib/messages.js');
const services = require(root + '/apps/tenant/server/services.js');
const {Router, RouterMessage} = require(root + '/lib/router.js');

// Admin
Router.add(new RouterMessage({
  method: 'info',
  path: '/tenant/auth', 
  fn: async function(req, res) {
    return await services.auth.getUser(req);
  },
}));

Router.add(new RouterMessage({
  method: 'info',
  path: '/tenant/csrf', 
  fn: async function(req, res) {
    return await services.auth.verifyCSRF(req);
  },
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/login', 
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
  path: '/tenant/logout', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.auth.logout(req);
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: false, needCSRF: false}
}));

// generic tenant query
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/query', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm;
    var query = {
      Work: {
        columns: ['*'],
        innerJoin: [
          {Employee: {
            columns: ['*'],
            innerJoin: [
              {Department: {columns: ['*']}},
            ]
          }},
          {Workcode: {columns: ['*']}}
        ],
        orderBy: [{Work: ['employee', 'sdate', 'stime', 'etime']}]
      }
    };

    try {
      //var query = JSON.parse(req.parsedURL.query.query);

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

// Pages
// login
Router.add(new RouterMessage({
  method: 'get',
  path: ['/tenant'], 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.output.main(req);

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: false, needCSRF: false, allowAnon: true}
}));

// manage page
Router.add(new RouterMessage({
  method: 'get',
  path: ['/tenant/manage/:etc', '/tenant/manage'], 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.output.manage(req);

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: false, redirect: '/tenant'}
}));

// empclock page
Router.add(new RouterMessage({
  method: 'get',
  path: ['/tenant/empclock/:etc', '/tenant/empclock'], 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.output.empclock(req);

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: false, needCSRF: false, allowAnon: true}
}));

// tips page
Router.add(new RouterMessage({
  method: 'get',
  path: ['/tenant/tips/:etc', '/tenant/tips'], 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.output.tips(req);

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: false, needCSRF: false, allowAnon: true}
}));

// Models
// department
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/department', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.department.get({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/department/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.department.get({pgschema: req.TID, rec: {code: req.params.code}});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/department', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.department.insert({pgschema: req.TID, rec: req.body.department});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/tenant/department/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.department.update({pgschema: req.TID, code: req.params.code, rec: req.body.department});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/tenant/department/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.department.delete({pgschema: req.TID, code: req.params.code});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// Employee
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/employee', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.employee.get({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/employee/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.employee.get({pgschema: req.TID, rec: {code: req.params.code}});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/employee', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.employee.insert({pgschema: req.TID, rec: req.body.employee});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/tenant/employee/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.employee.update({pgschema: req.TID, code: req.params.code, rec: req.body.employee});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/tenant/employee/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.employee.delete({pgschema: req.TID, code: req.params.code});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// workcode
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/workcode', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.workcode.get({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/workcode/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.workcode.get({pgschema: req.TID, rec: {code: req.params.code}});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/workcode', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.workcode.insert({pgschema: req.TID, rec: req.body.workcode});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/tenant/workcode/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.workcode.update({pgschema: req.TID, code: req.params.code, rec: req.body.workcode});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/tenant/workcode/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.workcode.delete({pgschema: req.TID, code: req.params.code});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// empwork
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/empwork/:employee', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empwork.get({pgschema: req.TID, rec: {employee: req.params.employee}});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/empwork/:employee/:workcode', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empwork.get({pgschema: req.TID, rec: {employee: req.params.employee, workcode: req.params.workcode}});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/empwork', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empwork.insert({pgschema: req.TID, rec: req.body.empwork});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/tenant/empwork/:id', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empwork.update({pgschema: req.TID, id: req.params.id, rec: req.body.empwork});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/tenant/empwork/:id', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empwork.delete({pgschema: req.TID, id: req.params.id});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// work
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/work/:employee', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.work.get({pgschema: req.TID, rec: {employee: req.params.employee}});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/work', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.work.insert({pgschema: req.TID, rec: req.body.work});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/tenant/work/:id', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.work.update({pgschema: req.TID, id: req.params.id, rec: req.body.work});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/tenant/work/:id', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.work.delete({pgschema: req.TID, id: req.params.id});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// user
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/user', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.get({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/user', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.insert({pgschema: req.TID, rec: req.body.workcode});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/tenant/user/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.update({pgschema: req.TID, code: req.params.code, rec: req.body.user});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

Router.add(new RouterMessage({
  method: 'delete',
  path: '/tenant/user/:code', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.user.delete({pgschema: req.TID, code: req.params.code});

    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));

// Empclock
Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/empclock/login', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empclock.login(req.body);
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: false, needCSRF: false, allowAnon: true}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/empclock/empwork/:emp', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empclock.empwork({pgschema: req.TID, emp: req.params.emp});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: true, allowAnon: true}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/empclock/work/:emp', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empclock.work({pgschema: req.TID, emp: req.params.emp});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: true, allowAnon: true}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/empclock/clockin', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empclock.clockin({pgschema: req.TID, employee: req.body.employee, workcode: req.body.workcode, payrate: req.body.payrate});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: true, allowAnon: true}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/empclock/clockout/:emp/:id', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.empclock.clockout({pgschema: req.TID, emp: req.params.emp, id: req.params.id});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: true, allowAnon: true}
}));

// Tips
Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/tips/login', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tips.login(req.body);
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: false, needCSRF: false, allowAnon: true}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/tips/:dept/:date', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tips.get({pgschema: req.TID, dept: req.params.dept, date: req.params.date});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: false, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/tips/:emp', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tips.insert({pgschema: req.TID, emp: req.params.emp, dt: req.body.date, work: req.body.work, tip: req.body.tip});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: false, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'put',
  path: '/tenant/tips/:id', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.tips.update({pgschema: req.TID, id: req.params.id, tip: req.body.tip});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: false, needCSRF: false}
}));

// payroll
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/payroll/params', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.payroll.getParams({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/payroll/pastPeriods', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.payroll.getPastPeriods({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/payroll/run', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.payroll.run({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'post',
  path: '/tenant/payroll/confirm', 
  fn: async function(req, res) {
    var rec = {}
    var rm = new ResponseMessage();
    var tm;
    
    rec.user = req.user.code;
    rec.html = req.body.html;
    rec.sdate = new Date(req.body.sdate);
    
    tm = await services.payroll.confirm({pgschema: req.TID, rec});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

// reports
Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/reports/params', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.payroll.getParams({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/reports/depts', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.reports.depts({pgschema: req.TID, active: req.query.active});

    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/reports/emps', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.reports.emps({pgschema: req.TID, active: req.query.active});

    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/reports/works', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.reports.works({pgschema: req.TID, active: req.query.active});

    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/reports/pay', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.reports.pay({pgschema: req.TID, active: req.query.active});

    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/reports/users', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.reports.users({pgschema: req.TID, active: req.query.active});

    rm.convertFromTravel(tm);
    return rm;
  },
  options: {needLogin: true, needCSRF: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/tenant/dymo', 
  fn: async function(req, res) {
    var rm = new ResponseMessage();
    var tm = await services.dymo.getConfig({pgschema: req.TID});
  
    rm.convertFromTravel(tm);
    return rm;
  }, 
  options: {needLogin: true, needCSRF: true, redirect: ''}
}));
