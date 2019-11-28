(function() {
  App.startup.init()
	.then(function(res) {
	  App.router.start('enter');
	  console.log('started');
	})
	 .catch(function(err) {
	  console.log('Tip Entry');
	  console.log(err);
	})
})();