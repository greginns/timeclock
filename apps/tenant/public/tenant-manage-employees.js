App.mvcObjs.tenant_manage_employees = {
  model: {
    employee: {},
    empOrig: {},
    empPK: '',
    
    defaults: {
      employee: {
        code: '',
        first: '',
        last: '',
        address: '',
        city: '',
        state: '',
        zipcode: '',
        phone: '',
        email: '',
        ssn: '',
        password: '',
        active: '{{employee.active.default}}' == 'true',
      },
    },
    
    errors: {
      employee: {},
      message: '',
      empworks: [],
    }
  },

  lifecycle: {
    created: function() {
      var self = this;
      
      App.subs.data.subscribe('/tenant/employee', function(data) {
        self.$set('employees', data);
      })

      App.subs.data.subscribe('/tenant/department', function(data) {
        self.$set('departments', data);
      })

      App.subs.data.subscribe('/tenant/workcode', function(data) {
        self.$set('workcodes', data);
      })
      
      return new Promise(function(resolve) {
        resolve();  
      })
    },

    ready: function() {
      this.setDefaults();
      this.getDymos();
    },

    inView: function(params) {
      $('#tenant-manage-navbar-employees').addClass('active disabled');
      $('#tenant-manage-employees-toast1').toast('hide');
    },

    outView: function() {
      $('#tenant-manage-navbar-employees').removeClass('active disabled');
    }
  },

  controllers: {
    test: function() {
      io.get({},'/tenant/query');
    },

    save: async function(ev) {
      var self = this;
      var emp = this.$get('employee');
      var empPK = this.$get('empPK');
      var url = '/tenant/employee';
      
      if (!emp.dept) emp.dept = null;

      App.modals.spinner.show();
      this.clearErrors();
            
      // new (post) or old (put)?
      if (empPK) {
        // old, PUT differences
        var orig = this.getEmpFromList(empPK);
        var diffs = App.utils.object.diff(orig, emp);
        
        if (Object.keys(diffs).length == 0) {
          App.modals.spinner.hide();
          
          App.modals.alert('Nothing to update');
          return;
        }
      }      

      ((empPK) ? io.put({employee: diffs}, url + '/' + empPK) : io.post({employee: emp}, url))
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'Employee Saved');
          $('#tenant-manage-employees-toast1').toast('show');
        
          if (!empPK) {
            self.$set('empPK', res.data.employee, true);
            self.$set('employee.code', res.data.employee);
          }

          self.empworkGrid();
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
      var empPK = this.$get('empPK');      
      
      if (!empPK) return;
      
      var res = await App.modals.confirm('Are you sure that you wish to delete this Employee?')
      if (res != 0) return;
      
      this.clearErrors();
      App.modals.spinner.show();
      
      io.delete({}, '/tenant/employee/' + empPK)
      .then(function(res) {
        if (res.status == 200) {
          self.$set('toastMessage', 'Employee Deleted');
          $('#tenant-manage-employees-toast1').toast('show');
          
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
    
    newEmp: async function() {
      if (await this.canClear()) {
        this.clearIt(); 
      }
    },
    
    canClear: async function() {
      var emp = this.$get('employee');
      var orig = this.$get('empOrig');
      var diffs = App.utils.object.diff(orig, emp);
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
      
      this.$set('empPK','');
      this.$set('empworks', []);
      this.$set('workGridShow', false);
      this.$set('empworkGridShow', false);
    },
    
    getEmpFromList: function(pk) {
      var employees = this.$get('employees');
      var tenret = {};
      
      if (pk) {
        employees.forEach(function(ten) {
          if (ten.code == pk) {
            tenret = ten;
          }
        })        
      }

      return tenret;
    },
    
    setEmp: function(pk) {
      this.clearErrors();

      this.$set('employee', this.getEmpFromList(pk));
      this.$set('empOrig', this.$get('employee'));

      this.empworkGrid();
    },
    
    setDefaults: function() {
      var dflts = this.$get('defaults.employee');
      var employee = {};
      
      for (var k in dflts) {
        employee[k] = dflts[k];
      }
      
      this.$set('employee', employee);
      this.$set('empPK', '');
      this.$set('empOrig', this.$get('employee'));
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
    
    empworkGrid: async function() {
      var res, data;
      var empcode = this.$get('employee.code');
      var dflt = function() {
        return obj = {id: '', employee: empcode, workcode: '', payrate: ''};
      };
      
      this.$set('grid.data', 'empworks');
      this.$set('grid.table', 'empwork');
      this.$set('grid.key', empcode);
      this.$set('grid.idFld', 'id');
      this.$set('grid.flds', ['workcode', 'payrate']);
      this.$set('grid.url', '/tenant/empwork');
      this.$set('grid.dfltFn', dflt);

      // empworks
      res = await this.getEmpwork(empcode);
      data = (res.status == 200) ? res.data : [];
      data.push(dflt());

      this.$set('empworks', data);
      this.$set('workGridShow', false);
      this.$set('empworkGridShow', true);
    },
    
    workGrid: async function() {
      var res, data;
      var workcodes = this.$get('workcodes');
      var empcode = this.$get('employee.code');
      var dflt = function() {
        return obj = {id: '', employee: empcode, sdate: '', stime: '', edate: '', etime: '', tip: '', workcode: ''};
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

      this.$set('empworkGridShow', false);
      this.$set('workGridShow', true);
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

    getEmpwork: function(emp) {
      return io.get({}, '/tenant/empwork/' + emp);
    },
    
    dymo: async function() {
      var emp = this.$get('employee');
      var res = await io.get({}, '/tenant/dymo');
      var label, data;
      var printer = this.$get('dymo');
      
      if (res.status != 200) {
        App.modals.alert('No Label Definition');
        return;
      }
      
      label = dymo.label.framework.openLabelXml(res.data.xml);
      
      data = `${emp.first} ${emp.last}\n${emp.address}\n${emp.city} ${emp.state}\n${emp.zipcode}`;
      
      label.setAddressText(0, data);
			label.print(printer);
    },
    
    getDymos: function() {
      var printers = dymo.label.framework.getPrinters();
      var dymos = [];
      
      for (var i = 0; i < printers.length; i++) {
        var printer = printers[i];

        if (printer.printerType == "LabelWriterPrinter") {
          dymos.push({text: printer.name, value: printer.name});
          
          if (i == 0) {
            this.$set('dymo', printer.name);
          }
        }
      }

      this.$set('dymos', dymos);
    }
  },

  watch: {
    'employee.code': function(nv) {
      if (nv) {
        if (Object.keys(this.getEmpFromList(nv)).length > 0) {
          this.$set('empOrig.code', nv);
          this.$set('empPK', nv);
        }
      }
    },

    'empPK': async function(nv, ov) {
      if (nv) {
        if (await this.canClear()) {
          var res = await this.getEmpwork(nv);
          this.$set('empworks', (res.status == 200) ? res.data : []);
          
          this.setEmp(nv);  
        }
        else {
          this.$set('empPK', ov, true);
        }
      }
    }
  }
}