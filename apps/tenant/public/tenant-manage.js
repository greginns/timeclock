(function() {
  App.startup.init()
	.then(function(res) {
	  App.wsdc = new App.classes.WSDataComm('tenant');
	  App.wsdc.setTables(['department', 'employee', 'workcode', 'user']);
	  App.wsdc.start();
	  
	  App.router.start('employees');
	  console.log('started');
	})
	 .catch(function(err) {
	  console.log('Tenant');
	  console.log(err);
	})
})();