App.mvcObjs.tenant_manage_payroll = {
  model: {
    showClose: false,
    config: {},
    stype: 'C',
    details: true,
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

      $('#tenant-manage-navbar-payroll').addClass('active disabled');
      $('#tenant-manage-payroll-toast1').toast('hide');
    },

    outView: function() {
      $('#tenant-manage-navbar-payroll').removeClass('active disabled');
    }
  },

  controllers: {
    run: async function() {
      // can only run if today is >= last date.
      var edate = new Date(this.$get('endDate'));
      var today = new Date();
      var res;

      this.$set('details', true);
      
      if (today < edate) {
        App.modals.alert('Period is not yet over');
        return;
      }
      
      res = await io.get({}, '/tenant/payroll/run');
      
      if (res.status == 200) {
        this.$set('report', res.data);
        this.$set('showClose', true);
      }
    },
    
    share: async function() {
      var config = this.$get('config');
      var source = this.$get('report');
      var filename = `payroll-${this.$get('startDate')}`;

      App.modals.share({config, source, filename});      
    },
    
    close: async function() {
      if (!confirm('Are you sure you wish to close this period?')) return;
      
      this.confirm();
    },
    
    confirm: async function() {
      // tell server that period is closed
      var self = this;
      var html = this.$get('report');
      var sdate = this.$get('startDate');
      var obj = {html, sdate};

      var res = await io.post(obj, '/tenant/payroll/confirm');
      
      if (res.status == 200) {
        App.modals.alert('Period has been closed')
        .then(function() {
          self.startUp();
          self.$set('stype','P');
        })
      }
      else {
        App.modals.alert(res.data.errors.message);
      }
    },
    
    reprint: async function() {
      var pp = this.$get('pastPP');
      var config = this.$get('config');
      var source = this.$get('report');
      var filename = `payroll-${this.$get('startDate')}.pdf`;
            
      if (!pp) return;
      
      App.modals.share({config, source, filename});
    },
    
    startUp: async function() {
      var ret = await io.get({}, '/tenant/payroll/params');

      if (ret.status == 200) {
        this.$set('startDate', ret.data.sdate);
        this.$set('endDate', ret.data.edate);
        this.$set('config', ret.data.config);
      }
      
      ret = await io.get({}, '/tenant/payroll/pastPeriods');
      
      if (ret.status == 200) {
        ret.data.unshift({id: '', desc: 'Select a Past Period'});
        
        this.$set('pasts', ret.data);
        this.$set('pastPP', '');
      }
    },
  },

  watch: {
    'stype': function(nv) {
      this.$set('report', '');
      
      if (nv == 'P') {
        this.$set('pastPP', '');
      }
      else {
        this.startUp();
      }      
    },
    
    'pastPP': function(nv) {
      if (!nv) return;
      
      var pasts = this.$get('pasts');
      var pp = this.$get('pastPP');
      
      pasts.forEach(function(p) {
        if (p.id == pp) {
          this.$set('report', p.html);
          this.$set('startDate', p.sdate);
          this.$set('endDate', p.edate);
        }
      }, this);
    },

    'details': function(nv) {
      $('.details').toggle();
    }
  }
}