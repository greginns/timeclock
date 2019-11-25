App.mvcObjs.admin_manage_migrate = {
  model: {
    tenant: {},
    
    errors: {
      message: '',
      _verify: [],
    },
    
    runAll: false,
  },

  lifecycle: {
    created: function() {
      var self = this;

      return new Promise(function(resolve) {
        App.subs.data.subscribe('/admin/tenant', function(data) {
          self.$set('tenants', data);
        })
        
        resolve();  
      })
    },

    ready: function() {
    },

    inView: function(params) {
      var self = this;

      $('#admin-manage-navbar-migrate').addClass('active disabled');
      $('#admin-migrate-toast1').toast('hide');
    },

    outView: function() {
      $('#admin-manage-navbar-migrate').removeClass('active disabled');
    }
  },

  controllers: {
    migrateOne: async function(ev) {
      var self = this;
      var idx = $(ev.target).closest('div.row').attr('data-index');
      var tenants = this.$get('tenants');
      var code = tenants[idx].code;

      App.modals.spinner.show();
      
      await this.migrate(code, idx);

      App.modals.spinner.hide();
    },
    
    migrateAll: async function() {
      var self = this;
      var tenants = this.$get('tenants');
      
      var res = await App.modals.confirm('Are you sure that you want to run ALL migrations?');
      if (res != '0') return;

      this.$set('runAll', true);      
      App.modals.spinner.show();
      
      for (var i=0; i<tenants.length; i++) {
        await this.migrate(tenants[i].code, i);
        
        if (!this.$get('runAll')) break;
      }

      this.$set('runAll', false);
      App.modals.spinner.hide();
    },
    
    migrate: function(code, idx) {
      var err;
      
      return new Promise(function(resolve) {
        io.post({code}, '/admin/migrate')
        .then(function(res) {
          if (res.status == 200) {
            err = 'Success';
          }
          else {
            err = res.errors._verify;
          }
          
          this.$set('errors[' + idx + ']', err);
        })
        .finally(function() {
          resolve();          
        });
      });
    },
    
    abortAll: function() {
      this.$set('runAll', false);
    },
    
    timer: function(msecs) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve();
        }, msecs);     
      })
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