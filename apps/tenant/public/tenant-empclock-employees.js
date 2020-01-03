App.mvcObjs.tenant_empclock_employees = {
  model: {
    empPK: '',
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
          self.getDepartments();
          self.getWorkcodes();
        }
      });

      return new Promise(function(resolve) {
        resolve();  
      })
    },

    ready: function() {
    },

    inView: function(params) {
      $('#tenant-empclock-navbar-employees').addClass('active disabled');
    },

    outView: function() {
      $('#tenant-empclock-navbar-employees').removeClass('active disabled');
    }
  },

  controllers: {
    displayErrors: function(res, idx) {
      var self = this;
      
      if ('data' in res && 'errors' in res.data) {
        Object.keys(res.data.errors).forEach(function(key) {
          if (key == 'message') {
            App.modals.alert(res.data.errors.message);  
          }
          else {
            _.forOwn(res.data.errors[key], function(v, k) {
              if (idx) {
                self.$set('errors.' + key + '[' + idx + '].' + k, v);    
              }
              else {
                self.$set('errors.' + key + '.' + k, v);    
              }
            });  
          }
        })
      }
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
    
    grid: {
      save: function(ev) {
        var self = this;
        var grid = this.$get('grid');
        var data = this.$get(grid.data);
        var idFld = grid.idFld;
        var flds = grid.flds;
        var idx = $(ev.target).closest('tr').attr('data-index');
        var row = data[idx];
        var obj = {}, putData = {}, postData = {};
        var focusFld;
        
        delete data[idx].errors;
        
        if (row[idFld]) {
          // existing, put changes
          flds.forEach(function(fld) {
            putData[fld] = row[fld];
          })
          
          obj[grid.table] = putData;
        }
        else {
          // new, send all
          for (var k in row) {
            if (k != idFld) {
              postData[k] = row[k]
            }
          }
          
          delete postData[idFld];
          obj[grid.table] = postData;
        }
        
        ((row[idFld]) ? io.put(obj, grid.url + '/' + row[idFld]) : io.post(obj, grid.url))
        .then(function(res) {
          if (res.status == 200) {
            data[idx][idFld] = res.data[idFld];
            
            if (idx == data.length-1) {
              data.push(grid.dfltFn());
            }

            App.wsdc.publishSubsetChanges(grid.table, grid.key);
            
            focusFld = `${grid.data}[${data.length-1}].${flds[0]}`;  // new row, first field
          }
          else {
            if ('errors' in res.data && grid.table in res.data.errors) {
              data[idx].errors = {};
              
              for (var fld in res.data.errors[grid.table]) {
                data[idx].errors[fld] = res.data.errors[grid.table][fld];
                focusFld = `${grid.data}[${idx}].${fld}`;
              }
            }
          }
          
          self.$set(grid.data, data);
          self.$focus(focusFld);                      
        });
      },
      
      delete: function(ev) {
        var self = this;
        var grid = this.$get('grid');
        var data = this.$get(grid.data);
        var idFld = grid.idFld;
        var flds = grid.flds;
        var idx = $(ev.target).closest('tr').attr('data-index');
        var row = data[idx];
        var focusFld;

        delete data[idx].errors;

        var complete = function() {
          data.splice(idx,1);
          
          if (data.length == 0) {
            data.push(grid.dfltFn());
          }
      
          focusFld = `${grid.data}[idx].${flds[0]}`;  // same row, first field
          self.$set(grid.data, data);
          self.$focus(focusFld);
        }
        
        if (!row[idFld]) {
          complete();
          return;
        }
        
        io.delete({}, grid.url + '/' + row[idFld])
        .then(function(res) {
          if (res.status == 200) {
            App.wsdc.publishSubsetChanges(grid.table, grid.key);
            
            complete();
          }
          else {
            if (res.data) App.modals.alert(res.data);
          }
        });
      },
    },
    
    workGrid: async function() {
      var res, data;
      var workcodes = this.$get('workcodes');
      var empcode = this.$get('empPK');
      var dflt = function() {
        return obj = {id: '', employee: empcode, sdate: '', stime: '', edate: '', etime: '', tip: '0', workcode: ''};
      };
      
      this.$set('grid.data', 'works');
      this.$set('grid.table', 'work');
      this.$set('grid.key', empcode);
      this.$set('grid.idFld', 'id');
      this.$set('grid.flds', ['sdate','stime','edate','etime','hours','tip','workcode']);
      this.$set('grid.url', '/tenant/work');
      this.$set('grid.dfltFn', dflt);

      // empworks
      res = await this.getEmpwork(empcode);
      data = (res.status == 200) ? res.data : [];
      // add in desc
      data.forEach(function(w) {
        for (var i=0; i<workcodes.length; i++) {
          if (w.workcode == workcodes[i].code) {
            w.desc = workcodes[i].desc;
            break;
          }
        }
      })
      
      this.$set('empworks', data);

      // works
      res = await io.get({}, '/tenant/empclock/work/' + empcode);
      data = (res.status == 200) ? res.data : [];
      data.push(dflt());

			this.$set('works', data);
		},
		
		getEmpwork: function(emp) {
      return io.get({}, '/tenant/empwork/' + emp);
		},
		
    getDepartments: function() {
			var self = this;
			var mgr = App.storage.employee;
			var depts = [{code: '', name: 'Select Department'}];
			
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
			var dept = this.$get('dept');
			var emps = [];
			
			io.get({}, '/tenant/employee/department/' + dept)
			.then(function(res){
				if (res.status == 200) {
          res.data.unshift({code: '', name: 'Select Employee'})
					self.$set('emps', res.data);
				}
			})
    },
    
    getWorkcodes: function() {
			var self = this;
			
			io.get({}, '/tenant/workcode')
			.then(function(res){
				if (res.status == 200) {
					self.$set('workcodes', res.data);
				}
			})
    },
        
    calcHours: function(ev) {
      var works = this.$get('works');
      var idx = $(ev.target).closest('tr').attr('data-index');
      var row = works[idx];
      var m1, m2, hours;

      if (row.sdate && !row.edate) {
        row.edate = row.sdate;
        this.$set('works[' + idx + '].edate', row.edate, false);  
      }

      if (row.sdate && row.stime && row.edate && row.etime) {
        m1 = moment(row.sdate.split('T')[0] + 'T' + row.stime);
        m2 = moment(row.edate.split('T')[0] + 'T' + row.etime);
        hours = (m2.diff(m1, 'seconds') / 3600).toFixed(2);
      }
      else {
        hours = 0;
      }

      this.$set('works[' + idx + '].hours', hours);
    },
  },

  watch: {
		'dept': function(nv) {
			this.getEmployees();
		},

    'empPK': function(nv, ov) {
      if (nv) {
				this.workGrid();
      }
    }
  }
}