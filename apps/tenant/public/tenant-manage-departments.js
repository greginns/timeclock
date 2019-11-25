App.mvcObjs.tenant_manage_departments = {
  model: {
    department: {},
    deptOrig: {},
    deptPK: '',
    
    defaults: {
      department: {
        code: '',
        name: '',
        mgr: '',
        password: '',
        active: '{{department.active.default}}' == 'true',
      },
    },
    
    errors: {
      department: {},
      message: '',
    }
  },

  lifecycle: {
    created: function() {
      var self = this;
      
      App.subs.data.subscribe('/tenant/department', function(data) {
        self.$set('departments', data);
      })

      App.subs.data.subscribe('/tenant/employee', function(data) {
        var data2 = data.slice(0);
        data2.unshift({name: 'No Manager', code: null})
        
        self.$set('employees', data2);
      })

      return new Promise(function(resolve) {
        resolve();  
      })
    },

    ready: function() {
      this.setDefaults();
    },

    inView: function(params) {
      $('#tenant-manage-navbar-departments').addClass('active disabled');
      $('#tenant-manage-departments-toast1').toast('hide');
    },

    outView: function() {
      $('#tenant-manage-navbar-departments').removeClass('active disabled');
    }
  },

  controllers: {
    save: async function(ev) {
      var self = this;
      var dept = this.$get('department');
      var deptPK = this.$get('deptPK');
      var url = '/tenant/department';
      
      if (!dept.mgr) dept.mgr = null;

      App.modals.spinner.show();
      this.clearErrors();
            
      // new (post) or old (put)?
      if (deptPK) {
        // old, PUT differences
        var orig = this.getDeptFromList(deptPK);
        var diffs = App.utils.object.diff(orig, dept);
        
        if (Object.keys(diffs).length == 0) {
          App.modals.spinner.hide();
          
          App.modals.alert('Nothing to update');
          return;
        }
      }      

      ((deptPK) ? io.put({department: diffs}, url + '/' + deptPK) : io.post({department: dept}, url))
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'Department Saved');
          $('#tenant-manage-departments-toast1').toast('show');
        
          self.clearIt();
        }
        else {
          self.displayErrors(res);
        }
      })
      .finally(function() {
        App.modals.spinner.hide();
      })
    },
    
    delete: async function() {
      var self = this;
      var deptPK = this.$get('deptPK');      
      
      if (!deptPK) return;
      
      var res = await App.modals.confirm('Are you sure that you wish to delete this Department?')
      if (res != 0) return;
      
      this.clearErrors();
      App.modals.spinner.show();
      
      io.delete({}, '/tenant/department/' + deptPK)
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'Department Deleted');
          $('#tenant-manage-departments-toast1').toast('show');
          
          self.clearit();
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
    
    newDept: async function() {
      if (await this.canClear()) {
        this.clearIt(); 
      }
    },
    
    canClear: async function() {
      var dept = this.$get('department');
      var orig = this.$get('deptOrig');
      var diffs = App.utils.object.diff(orig, dept);
      var ret;

      if (Object.keys(diffs).length > 0) {
        ret = await App.modals.confirm('Abandon changes?');
        if (ret != 0) return false;
      }

      return true;
    },
    
    clearIt: function() {
      this.clearErrors();
      this.setDefaults();
    },
    
    getDeptFromList: function(pk) {
      var departments = this.$get('departments');
      var tenret = {};
      
      if (pk) {
        departments.forEach(function(ten) {
          if (ten.code == pk) {
            tenret = ten;
          }
        })        
      }

      return tenret;
    },
    
    setDept: function(pk) {
      this.clearErrors();

      this.$set('department', this.getDeptFromList(pk));
      this.$set('deptOrig', this.$get('department'));
    },
    
    setDefaults: function() {
      var dflts = this.$get('defaults.department');
      var dept = {};
      
      for (var k in dflts) {
        dept[k] = dflts[k];
      }

      this.$set('department', dept);
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
    'department.code': function(nv) {
      if (nv) {
        if (Object.keys(this.getDeptFromList(nv)).length > 0) {
          this.$set('deptOrig.code', nv);
          this.$set('deptPK', nv);
        }
      }
    },

    'deptPK': async function(nv, ov) {
      if (nv) {
        if (await this.canClear()) {
          this.setDept(nv);  
        }
        else {
          this.$set('deptPK', ov, true);
        }
      }
    }
  }
}