App.mvcObjs.tenant_empclock_tips = {
  model: {
		date: '',
		dept: '',

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
					self.getTipCodes();
					self.getDepartments();
					self.getEmployees();
        }
      });

      return new Promise(function(resolve) {
        resolve();  
      })
    },

    ready: function() {
    },

    inView: function(params) {
			var self = this;
			
			this.$set('date', (new Date()).toJSON());

      $('#tenant-tips-enter-nav').addClass('active disabled');
    },

    outView: function() {
      $('#tenant-tips-enter-nav').removeClass('active disabled');
    }
  },

  controllers: {
		dateChanged: function() {
			if (this.$get('dept')) {
				this.getTips();
			}			
		},

		deptChanged: function() {
			this.displayEmps();

			if (this.$get('dept')) {
				this.getTips();
			}			
		},

		displayEmps: function() {
			var dept = this.$get('dept');
			var tipEmps = [];
			var emps = this.$get('employees');
			var tips = this.$get('tipCodes');

			emps.forEach(function(emp) {
				if (emp.dept == dept) {
					var emp2 = {};
					emp2.code = emp.code;
					emp2.name = emp.name;

					tips.forEach(function(tip, idx) {
						if (idx > 0) {
							var inp = 
							`<div class='input-group'>
								<div class="input-group-prepend" mvc-on="{click: 'stepper:minus'}">
									<div class="input-group-text">—</div>
								</div>
								<input type="text" min="0" max="9999" step="1" class="form-control mvc-boot-input-right" mvc-edit="float" mvc-role="stepper" mvc-value="${emp.code}-${tip.code}"></input>
								<div class="input-group-append" mvc-on="{click: 'stepper:plus'}">
									<div class="input-group-text">+</div>
								</div>					
							</div>`
				
							emp2['tip'+(idx-1)] = inp;
						}
					})

					tipEmps.push(emp2);
				}
			})

			this.$set('tipEmps', tipEmps);
		},

		getTipCodes: function() {
			// Tip type work codes
			var self = this;
			var tipCodes = [{code:'', desc: 'Employee'}];
			
			io.get({}, '/tenant/workcode')
			.then(function(res){
				if (res.status == 200) {
					res.data.forEach(function(code) {
						if (code.method == 'T') {
							tipCodes.push(code);
						}
					})

					self.$set('tipCodes', tipCodes);
				}
			})
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

		getEmployees: function() {
			var self = this;
			
			io.get({active: 'Y'}, '/tenant/employee')
			.then(function(res){
				if (res.status == 200) {
					self.$set('employees', res.data);
				}
			})
		},
    
    getTips: function() {
			var self = this;
			var dept = this.$get('dept');
			var date = this.$get('date');
			var ids = {};

			this.clearTips();
      
      io.get({}, '/tenant/tips/' + dept + '/' + date)
      .then(function(res){
        if (res.status == 200) {
					console.log(res.data)
          res.data.forEach(function(d) {
						let key = d.Employee.code + '-' + d.Workcode.code;
						
						self.$set(key, d.tip);
						ids[key] = d.id;
          })
				}
				
				self.$set('empTipIDs', ids);
			})
		},

		saveTips: async function() {
			var self = this;
			var ids = this.$get('empTipIDs');
			var emps = this.$get('employees');
			var tips = this.$get('tipCodes');
			var dept = this.$get('dept');

			for (var empX=0; empX < emps.length; empX++) {
				var emp = emps[empX];

				if (emp.dept == dept) {
					for (var tipX=1; tipX<tips.length; tipX++) {
						var work = tips[tipX];
						let key = emp.code + '-' + work.code;
						let tip = self.$get(key);
						let id = ids[key];

						if (tip != '') {
							let res = await self.saveTip2(dept, emp.code, work.code, tip, id);

							if (res.status == 200) {
								ids[key] = res.data.id;
							}
							else {
								alert(emp.code + '\n' + res.data.errors.message);
							}								
						}						
					}
				}				
			}

			this.$set('empTipIDs', ids);
		},

		saveTip2: function(dept, emp, work, tip, id) {
			var dt = this.$get('date');
			var fn, url;
			var params = {tip};

			if (id) {
				fn = io.put;
				url = '/tenant/tips/' + id;
			 }
			else {
				fn = io.post;
				url = '/tenant/tips/' + emp;
				params.work = work;
				params.date = dt;
			} 

			return fn(params, url);
		},
		
		clearTips: function() {
			var self = this;
			var emps = this.$get('employees');
			var tips = this.$get('tipCodes');
			var dept = this.$get('dept');

			emps.forEach(function(emp) {
				if (emp.dept == dept) {
					tips.forEach(function(tip, idx) {
						if (idx > 0) {
							self.$set(emp.code + '-' + tip.code, '');
						}
					})
				}
			})

			this.$set('empTipIDs', {});
		},
  },

  watch: {
		date: function(nv, ov) {
			if (nv && nv != ov) this.dateChanged();
		},

		dept: function(nv, ov) {
			if (nv && nv != ov) this.deptChanged();
		},
  }
}