var App = App || {};
App.utils = App.utils || {};

App.utils.ee = {
  sendOne: async function({config={}, obj={}} = {}) {
    // http://api.elasticemail.com/public/help#Email_Send
    
    var params = {
      apikey: config.ee.apikey,
      charset: 'utf-8',
      encodingType:'0',
      isTransactional: true
    };

    var url = config.ee.domain + 'email/send';
    var attachments = [], query = [], init = {}, formData = new FormData();

    if ('attachments' in obj) {
      attachments = obj.attachments;
      delete obj.attachments;

      attachments.forEach(function(file) {
        formData.append(file.name, file);
      });
    }
		
		params = Object.assign(params, obj);
		
		Object.keys(params).forEach(function(k) {
			query.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
		})
		
		url += '?' + query.join('&');
		init.method = 'POST';
		
		if (attachments.length > 0) {
      init.headers = {};
      //init.headers['Content-Type'] = "multipart/form-data";  *** browser will add it, with a boundary
      init.body = formData;
		}
		
		let resp = await fetch(url, init);
		
		if (resp.status == 200) {
      return await resp.json();  
		}
		else {
      return {success: false, error: 'Comm Error'};
		}
		
  },  
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = App.utils.ee;
}