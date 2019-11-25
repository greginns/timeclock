App.mvcObjs.admin_manage_tenants = {
  model: {
    tenant: {},
    tenantOrig: {},
    tenantPK: '',
    
    defaults: {
      tenant: {
        code: '',
        coname: '',
        first: '',
        last: '',
        address: '',
        city: '',
        state: '',
        zipcode: '',
        phone: '',
        email: '',
        active: {{tenant.active.default}},
      },
    },
    
    errors: {
      tenant: {},
      message: '',
      _verify: [],
    }
  },

  lifecycle: {
    created: function() {
      var self = this;
      
      App.subs.data.subscribe('/admin/tenant', function(data) {
        self.$set('tenants', data);
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

      $('#admin-manage-navbar-tenants').addClass('active disabled');
      $('#admin-tenants-toast1').toast('hide');
    },

    outView: function() {
      $('#admin-manage-navbar-tenants').removeClass('active disabled');
    }
  },

  controllers: {
    save: async function(ev) {
      var self = this;
      var tenant = this.$get('tenant');
      var tenantPK = this.$get('tenantPK');
      var orig, diffs;
      var url = '/admin/tenant';

      this.clearErrors();
            
      // new (post) or old (put)?
      if (tenantPK) {
        // old, PUT differences
        orig = this.getTenantFromList(tenantPK);
        diffs = App.utils.object.diff(orig, tenant);
        
        if (Object.keys(diffs).length == 0) {
          App.modals.alert('Nothing to update');
          return;
        }
      }      
      else {
        tenant.code = tenant.code.replace(/\s/g,'');
        
        if (!tenant.code) {
          App.modals.alert('Tenant code cannot be blank');
          return;
        }
        
        orig = this.getTenantFromList(tenant.code);
        
        if (Object.keys(orig).length > 0) {
          App.modals.alert('Tenant code is in use');
          return;
        }
      }
      
      App.modals.spinner.show();

      ((tenantPK) ? io.put({tenant: diffs}, url + '/' + tenantPK) : io.post({tenant}, url))
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'Tenant ' + (tenantPK) ? 'Created' : 'Updated');
          $('#admin-manage-tenants-toast1').toast('show');

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
      var tenantPK = this.$get('tenantPK');      
      
      if (!tenantPK) return;
      
      var res = await App.modals.confirm("Are you sure that you wish to delete this tenant?")
      if (res != 0) return;

      this.clearErrors();
      App.modals.spinner.show();
      
      io.delete({}, '/admin/tenant/' + tenantPK)
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'Tenant Deleted');
          $('#admin-manage-tenants-toast1').toast('show');
          
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
    
    migrate: async function() {
      var self = this;
      var tenantPK = this.$get('tenantPK');      
      
      if (!tenantPK) return;
      
      var res = await App.modals.confirm("Are you sure you wish to run the migration for this Tenant?")
      if (res != 0) return;
          
      this.clearErrors();
      App.modals.spinner.show();
      
      io.post({code: tenantPK}, '/admin/migrate')
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'Tenant Migrated');
          $('#admin-manage-tenants-toast1').toast('show');
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
    
    newTenant: async function() {
      if (await this.canClear()) {
        this.clearIt(); 
      }
    },
    
    canClear: async function() {
      var tenant = this.$get('tenant');
      var orig = this.$get('tenantOrig');
      var diffs = App.utils.object.diff(orig, tenant);
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
    
    getTenantFromList: function(pk) {
      var self = this;
      var tenants = this.$get('tenants');
      var tenret = {};

      if (pk) {      
        tenants.forEach(function(ten) {
          if (ten.code == pk) {
            tenret = ten;
          }
        })
      }
      
      return tenret;
    },
    
    setTenant: function(pk) {
      this.clearErrors();
      
      this.$set('tenant', this.getTenantFromList(pk));
      this.$set('tenantOrig', this.$get('tenant'));
    },
    
    setDefaults: function() {
      var dflts = this.$get('defaults.tenant');
      
      for (var k in dflts) {
        this.$set('tenant.'+k, dflts[k]);
      }
      
      this.$set('tenantPK', '');
      this.$set('tenantOrig', this.$get('tenant'));
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
      
      this.$set('errors._verify', []);
    },
  },

  watch: {
    'tenantPK': async function(nv, ov) {
      if (nv) {
        if (await this.canClear()) {
          this.setTenant(nv);
        }
        else {
          this.$set('tenantPK', ov, true);
        }
      }
    }
  }
}