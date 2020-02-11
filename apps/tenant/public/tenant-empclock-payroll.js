App.mvcObjs.tenant_empclock_payroll = {
  model: {
    config: {},
		stype: 'C',
		hasRun: false,
    details: true,
  },

  lifecycle: {
    created: function() {
      var self = this;

			this.$set('loggedIn', false);
      
      App.subs.general.subscribe('loggedIn', function(tf) {
        self.$set('loggedIn', tf);

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

      $('#tenant-empclock-navbar-payroll').addClass('active disabled');
      $('#tenant-empclock-payroll-toast1').toast('hide');
    },

    outView: function() {
      $('#tenant-empclock-navbar-payroll').removeClass('active disabled');
    }
  },

  controllers: {
    run: async function() {
      var res;

      this.$set('details', true);
      
      res = await io.get({mgr: App.storage.employee}, '/tenant/payroll/run');
      
      if (res.status == 200) {
				this.$set('hasRun', true);
        this.$set('report', res.data);
      }
    },
    
    share: async function() {
      var config = this.$get('config');
      var source = this.$get('report');
      var filename = `payrollVERIFY-${this.$get('startDate')}`;

      App.modals.share({config, source, filename});      
    },

    startUp: async function() {
      var ret = await io.get({}, '/tenant/payroll/params');

      if (ret.status == 200) {
        this.$set('startDate', ret.data.sdate);
        this.$set('endDate', ret.data.edate);
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
				}
			})
    },

  },

  watch: {
    'details': function(nv) {
      $('.details').toggle();
    }
  }
}