App.mvcObjs.tenant_manage_workcodes = {
  model: {
    workcode: {},
    workOrig: {},
    workPK: '',
    
    defaults: {
      workcode: {
        code: '',
        desc: '',
        dept: '',
        method: 'T',
        active: {{workcode.active.default}},
      },
    },
    
    errors: {
      workcode: {},
      message: '',
    }
  },

  lifecycle: {
    created: function() {
      var self = this;
      
      App.subs.data.subscribe('/tenant/workcode', function(data) {
        self.$set('workcodes', data);
      })

      App.subs.data.subscribe('/tenant/department', function(data) {
        self.$set('departments', data);
      })
      
      return new Promise(function(resolve) {
        resolve();  
      })
    },

    ready: function() {
      this.setDefaults();
    },

    inView: function(params) {
      var self = this;

      $('#tenant-manage-navbar-workcodes').addClass('active disabled');
      $('#tenant-manage-workcodes-toast1').toast('hide');
    },

    outView: function() {
      $('#tenant-manage-navbar-workcodes').removeClass('active disabled');
    }
  },

  controllers: {
    save: async function(ev) {
      var self = this;
      var work = this.$get('workcode');
      var workPK = this.$get('workPK');
      var url = '/tenant/workcode';

      App.modals.spinner.show();
      this.clearErrors();
            
      // new (post) or old (put)?
      if (workPK) {
        // old, PUT differences
        var orig = this.getWorkFromList(workPK);
        var diffs = App.utils.object.diff(orig, work);
        
        if (Object.keys(diffs).length == 0) {
          App.modals.spinner.hide();
          
          App.modals.alert('Nothing to update');
          return;
        }
      }      

      ((workPK) ? io.put({workcode: diffs}, url + '/' + workPK) : io.post({workcode: work}, url))
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'Workcode Saved');
          $('#tenant-manage-workcodes-toast1').toast('show');
        
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
      var workPK = this.$get('workPK');      
      
      if (!workPK) return;
      
      var res = await App.modals.confirm('Are you sure that you wish to delete this Work Code?')
      if (res != 0) return;
      
      this.clearErrors();
      App.modals.spinner.show();
      
      io.delete({}, '/tenant/workcode/' + workPK)
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'workcode Deleted');
          $('#tenant-manage-workcodes-toast1').toast('show');
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
    
    newWork: async function() {
      if (await this.canClear()) {
        this.clearIt(); 
      }
    },
    
    canClear: async function() {
      var work = this.$get('workcode');
      var orig = this.$get('workOrig');
      var diffs = App.utils.object.diff(orig, work);
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
    
    getWorkFromList: function(pk) {
      var self = this;
      var workcodes = this.$get('workcodes');
      var tenret = {};
      
      if (pk) {
        workcodes.forEach(function(ten) {
          if (ten.code == pk) {
            tenret = ten;
          }
        })        
      }

      return tenret;
    },
    
    setWork: function(pk) {
      this.clearErrors();

      this.$set('workcode', this.getWorkFromList(pk));
      this.$set('workOrig', this.$get('workcode'));
    },
    
    setDefaults: function() {
      var dflts = this.$get('defaults.workcode');
      
      for (var k in dflts) {
        this.$set('workcode.'+k, dflts[k]);
      }
      
      this.$set('workPK', '');
      this.$set('workOrig', this.$get('workcode'));
    },
    
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
  },

  watch: {
    'workcode.code': function(nv) {
      if (nv) {
        if (Object.keys(this.getWorkFromList(nv)).length > 0) {
          this.$set('workOrig.code', nv);
          this.$set('workPK', nv);
        }
      }
    },


    'workPK': async function(nv, ov) {
      if (nv) {
        if (await this.canClear()) {
          this.setWork(nv);  
        }
        else {
          this.$set('workPK', ov, true);
        }
      }
    }
  }
}