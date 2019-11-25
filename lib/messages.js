class TravelMessage {
  constructor({data={}, type='json', status=200, err=null, cookies=[]} = {}) {
    this.data = data;
    this.type = type;
    this.status = status;       // HTTP status
    this.cookies = cookies;
    
    // error
    this.err = err;             // Error class
  }
  
  isBad() {
    return this.status != 200 || this.err;
  }
  
  isGood() {
    return this.status == 200 && !this.err;
  }
}

class ResponseMessage {
  constructor({data='', status=200, ct='text/plain', encoding=null, err='', cookies=[]} = {}) {
    this.data = data;
    this.status = status;
    this['Content-Type'] = ct;
    this.encoding = encoding;
    this.err = err;
    this.cookies = cookies;
  }
  
  convertFromTravel(tm) {
    // 200 is all good, data is whatever.
    // 400 is not all good:  
    //  two sources: 
    //    if (tm.err) data is text error message
    //    else data is json data (supplied)
    // all others are text errors.  

    this.status = (tm.err) ? tm.err.status || tm.status || 500 : tm.status || 500;

    if (this.status == 200 || (this.status == 400 && !tm.err)) {
      this.status = tm.status;
      this.cookies = tm.cookies;
      
      if (tm.type == 'json') {
        this.data = JSON.stringify(tm.data);
        this['Content-Type'] = 'application/json';
      }
      else if (tm.type == 'text') {
        this.data = tm.data;
        this['Content-Type'] = 'text/plain';
      }
      else if (tm.type == 'html') {
        this.data = tm.data;
        this['Content-Type'] = 'text/html';
      }
      else if (tm.type == 'icon') {
        this.data = tm.data;
        this['Content-Type'] = 'image/x-icon';
        this.encoding = 'binary';
      }
      else {
        this.data = tm.data;
        this['Content-Type'] = 'text/plain';
      }              
    }
    else {
      this.data = tm.err.message;
      this['Content-Type'] = 'text/plain';    
    }

  };
}

module.exports = {
  TravelMessage,
  ResponseMessage,
}