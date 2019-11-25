var io = {
  CSRFToken: '{{CSRFToken}}',
  
  _formatURL: function(url, params) {
    // NOTE `_.pickBy(params, _.negate(_.isNil))` removes undefined/null entries
    // so you don't have to worry about `undefined` getting coerced to a string
    // https://medium.com/cameron-nokes/4-common-mistakes-front-end-developers-make-when-using-fetch-1f974f9d1aa1    
    return url + '?' + new URLSearchParams(_.pickBy(params, _.negate(_.isNil))).toString();
  },
  
  _login: function(orig) {
    return new Promise(function(resolve, reject) {
      if (!App || !App.helpers || !App.helpers.modalLogin || !App.helpers.modalLogin.popup) {
        reject({status: 400, data: {errors: {message: ''}}});
      }

      App.helpers.modalLogin.popup({cb: function() {
      // only comes back if/when a good login
        io.fetch(orig)  // this is the original request getting re-fired
        .then(function(res) {
          if (res.status == 200 || res.status == 400) {
            resolve(res);
          }
          else {
            reject(res.data.errors.message);
          }
        })
        .catch(function(err) {
          reject(err)
        })
      }});
    })
  },
  
  fetch: function({method='GET', url = '', data = '', type='text'} = {}) {
    var orig = {method, url, data, type};
    var ret = {data: '', 'Content-type': '', status: 200};
    var init = {headers: {'X-CSRF-TOKEN': io.CSRFToken}};

    init.method = method;
    init.credentials = 'same-origin';
    
    if (method == 'GET') {
      url = io._formatURL(url, data);
    }
    else {
      init.body = (type == 'json') ? JSON.stringify(data) : data;
    }
    
    switch (type) {
      case 'json':
        init.headers['Content-Type'] = 'application/json';
        break;
        
      default:
        init.headers['Content-Type'] = 'text/plain';
    }
    
    return new Promise(function(resolve) {
      fetch(url, init)
      .then(function(resp) {
        // status: 200: OK, 400: User Error, 401: Unauthorized, 404: Not Found, 413: Too large, 500: System Error
        // status 200 is json or text, 
        // status 400 can be text or json
        // rest are text (mostly for APIs in case they want a text response)
        // normalize all responses to resolved json, {errors: {message: xxx, table: {}}}
        ret.status = resp.status;
        ret['Content-type'] = resp.headers.get("Content-Type");
        
        return (ret['Content-type'].indexOf('json') > -1) ? resp.json() : resp.text();
      })
      .then(async function(data) {
        ret.data = data;

        switch (ret.status) {
          case 200:
            break;
          case 400:
            if (ret['Content-type'].indexOf('json') == -1) throw ret.data;
            break;
          case 401:
            // get login
            ret = await io._login(orig);
            break;
          default:
            throw ret.data;
        }

        resolve(ret);
      })
      .catch(function(err) {
        ret.data = {errors: {message: err}};
        ret.status = 500;
        
        resolve(ret);
      })      
    })
  },
  
  get: function(params, url) {
    return io.fetch({method: 'GET', url: url, data: params, type: 'json'});
  },
    
  post: function(params, url) {
    return io.fetch({method: 'POST', url: url, data: params, type: 'json'});
  },
  
  put: function(params, url) {
    return io.fetch({method: 'PUT', url: url, data: params, type: 'json'});
  },
  
  delete: function(params, url) {
    return io.fetch({method: 'DELETE', url: url, data: params, type: 'json'});
  },  
}