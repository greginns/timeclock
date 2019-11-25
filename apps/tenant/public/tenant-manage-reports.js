App.mvcObjs.tenant_manage_reports = {
  model: {
    config: {},
    what: 'D',
    deptActive: 'A',
    empActive: 'A',
    workActive: 'A',
    payActive: 'A',
    userActive: 'A',
  },

  lifecycle: {
    created: function() {
      var self = this;
      
      return new Promise(function(resolve) {
        resolve();  
      })
    },

    ready: function() {
    },

    inView: async function(params) {
      var self = this;
      
      this.startUp();

      $('#tenant-manage-navbar-reports').addClass('active disabled');
    },

    outView: function() {
      $('#tenant-manage-navbar-reports').removeClass('active disabled');
    }
  },

  controllers: {
    deptRun: async function() {
      this.$set('what', 'D');
      
      var active = this.$get('deptActive');
      var res = await io.get({active}, '/tenant/reports/depts');
      
      if (res.status == 200) {
        this.$set('report', res.data);
      }
    },

    empRun: async function() {
      this.$set('what', 'E');
            
      var active = this.$get('empActive');
      var res = await io.get({active}, '/tenant/reports/emps');
      
      if (res.status == 200) {
        this.$set('report', res.data);
      }
    },

    workRun: async function() {
      this.$set('what', 'W');
            
      var active = this.$get('workActive');
      var res = await io.get({active}, '/tenant/reports/works');
      
      if (res.status == 200) {
        this.$set('report', res.data);
      }
    },

    payRun: async function() {
      this.$set('what', 'P');
            
      var active = this.$get('payActive');
      var res = await io.get({active}, '/tenant/reports/pay');

      if (res.status == 200) {
        this.$set('report', res.data);
      }
    },

    userRun: async function() {
      this.$set('what', 'U');
            
      var active = this.$get('userActive');
      var res = await io.get({active}, '/tenant/reports/users');
      
      if (res.status == 200) {
        this.$set('report', res.data);
      }
    },
    
    share: function() {
      var config = this.$get('config');
      var source = this.$get('report');
      var what = this.$get('what');
      var titles = {D: 'Departments', E: 'Employees', W: 'WorkCodes', P: 'PayRates', U: 'Users'};
      var filename = titles[what];
      
      App.modals.share({config, source, filename});
    },
    
    startUp: async function() {
      var ret = await io.get({}, '/tenant/reports/params');

      if (ret.status == 200) {
        this.$set('config', ret.data.config);
      }
    },
  },

  watch: {
    'report': function(nv) {
    },
  }
}