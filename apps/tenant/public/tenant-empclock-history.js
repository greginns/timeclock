App.mvcObjs.tenant_empclock_history = {
  model: {
    config: {},
		hasRun: false,
  },

  lifecycle: {
    created: function() {
      var self = this;

			this.$set('loggedIn', false);
      
      App.subs.general.subscribe('loggedIn', function(tf) {
        self.$set('loggedIn', tf);
console.log('loggedin',tf)
        if (tf) {
					self.getDepartments();
        }
      });
			
      return new Promise(function(resolve) {
        resolve();  
      })
    },

    ready: function() {
    },

    inView: async function(params) {
      var self = this;
      
      this.startUp();

      $('#tenant-empclock-navbar-history').addClass('active disabled');
      $('#tenant-empclock-history-toast1').toast('hide');
    },

    outView: function() {
      $('#tenant-empclock-navbar-history').removeClass('active disabled');
    }
  },

  controllers: {
    run: async function() {
      var emp = this.$get('emp');
      var sdate = this.$get('sdate');
      var edate = this.$get('edate');
      
      var res = await io.get({emp, sdate, edate}, '/tenant/history/run');
      
      if (res.status == 200) {
				this.$set('hasRun', true);
        this.$set('report', res.data);
      }
    },
    
    share: async function() {
      var config = this.$get('config');
      var source = this.$get('report');
      var emp = this.$get('emp');
      var filename = `history-${emp}-${this.$get('startDate')}-${this.$get('endDate')}`;

      App.modals.share({config, source, filename});      
    },

    startUp: async function() {
      var ret = await io.get({}, '/tenant/payroll/params');

      if (ret.status == 200) {
        this.$set('config', ret.data.config);
      }
    },
		
    getDepartments: function() {
			var self = this;
			var mgr = App.storage.employee;
			var depts = [];
			
			io.get({}, '/tenant/department')
			.then(function(res){
				if (res.status == 200) {
					res.data.forEach(function(dept) {
						if (dept.mgr == mgr) {
								depts.push(dept);
						}
					})

          self.$set('depts', depts);
          self.$set('dept', depts[0].code);
				}
			})
    },

		getEmployees: function() {
      var self = this;
      var dept = this.$get('dept');
			
			io.get({active: 'Y'}, '/tenant/employee/department/' + dept)
			.then(function(res){
				if (res.status == 200) {
          self.$set('employees', res.data);
          self.$set('emp', res.data[0].code)
				}
			})
		},
  },

  watch: {
    'dept': function(nv) {
      this.getEmployees();
    }
  }
}