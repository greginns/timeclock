(function() {
  App.startup.init()
	.then(function(res) {
	  App.router.start('clockin');
	  console.log('started');
	})
	 .catch(function(err) {
	  console.log('Clock In');
	  console.log(err);
	})
})();