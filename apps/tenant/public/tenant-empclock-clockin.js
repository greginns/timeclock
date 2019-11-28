App.mvcObjs.tenant_empclock_clockin = {
  model: {
    defaults: {
    },
    
    errors: {
      message: '',
    }
  },

  lifecycle: {
    created: function() {
      var self = this;
      
      this.$set('loggedIn', false);
      
      App.subs.general.subscribe('loggedIn', function(tf) {
        self.$set('loggedIn', tf);
        
        if (tf) {
          self.getEmpwork();  
          self.getWork(true);
        }
      });

      return new Promise(function(resolve) {
        resolve();  
      })
    },

    ready: function() {
      this.setDefaults();
    },

    inView: function(params) {
      var self = this;

      $('#tenant-empclock-navbar-clockin').addClass('active disabled');
    },

    outView: function() {
      $('#tenant-empclock-navbar-clockin').removeClass('active disabled');
    }
  },

  controllers: {
    clockin: async function(ev) {
      var self = this;
      var workcode = this.$get('workcode');
      var employee = App.storage.employee;
      var payrate = $('#empclock_workcode').find(":selected").attr('payrate');

      if (!workcode) {
        App.modals.alert('Please Select a Work Code');
        return;
      }
      
      App.modals.spinner.show();
      
      io.post({employee, workcode, payrate}, '/tenant/empclock/clockin')
      .then(function(res) {
        if (res.status == 200) {
          self.clearIt();
          self.getWork(false);
        }
        else {
          self.displayErrors(res);
        }
      })
      .finally(function() {
        App.modals.spinner.hide();
      })
    },
    
    clear: async function() {
      if (await this.canClear()) {
        this.clearIt();
      }
    },
    
    clearIt: function() {
      this.clearErrors();
      this.setDefaults();
    },
    
    getEmpwork: function() {
      var self = this;
      var nonTip = [];
      
      io.get({}, '/tenant/empclock/empwork/' + App.storage.employee)
      .then(function(res){
        if (res.status == 200) {
          res.data.forEach(function(ew) {
            if (ew.Workcode.method !='T') nonTip.push(ew);
          })
        }

        self.$set('empworks', nonTip);
        self.$set('workcode', (res.data.length>0) ? res.data[0].workcode : '');
      })
    },
    
    getWork: function(check) {
      var self = this;
      
      io.get({}, '/tenant/empclock/work/' + App.storage.employee)
      .then(function(res){
        if (res.status == 200) {
          res.data.forEach(function(d) {
            d.sdate = d.sdate.split('T')[0];
            if (d.edate) d.edate = d.edate.split('T')[0];
            d.tippy = parseFloat(d.tip) > 0;
          })
          
          self.$set('works', res.data);
          if (check) self.checkClockOuts();
        }
      })
    },
    
    checkClockOuts: function() {
      var self = this;
      var works = this.$get('works');
      var employee = App.storage.employee;
      var proms = [];
      
      works.forEach(function(work) {
        if (!work.edate) {
          proms.push(io.post({}, '/tenant/empclock/clockout/' + employee + '/' + work.id))
        }
      });

      Promise.all(proms)
      .then(function(res) {
        self.getWork(false);
      })
    },
    
    setDefaults: function() {
      var dflts = this.$get('defaults.department');
      
      for (var k in dflts) {
        this.$set('department.'+k, dflts[k]);
      }
      
      this.$set('deptPK', '');
      this.$set('deptOrig', this.$get('department'));
    },
    
    displayErrors: function(res) {
      var self = this;
      
      if ('data' in res && 'errors' in res.data) {
        Object.keys(res.data.errors).forEach(function(key) {
          if (key == 'message') {
            App.modals.alert(res.data.errors.message);  
          }
          else {
            _.forOwn(res.data.errors[key], function(v, k) {
              self.$set('errors.' + key + '.' + k, v);  
            });  
          }
        })
      }
      
      this.$set('errors._verify', this.$get('errors._verify'));
    },
    
    clearErrors: function() {
      var self = this;
      var errors = this.$get('errors');
      
      Object.keys(errors).forEach(function(key) {
        if (errors[key] instanceof Object) {
          Object.keys(errors[key]).forEach(function(key2) {
            self.$set('errors.' + key + '.' + key2, '');
          })          
        }
        else {
          self.$set('errors.' + key, '');
        }
      })
    },
  },

  watch: {
  }
}