/*
	required
	requiredIfNo
	
	isString
	isNumeric()
	isBoolean
	isArray
  isEmail
	isEmailExt
	isDate(fmt)
	isTime(fmt)	
	isCcno
	isCcexp

  min(x)
  max(x)
	minLength(x)
	maxLength(x)
	
  choices([{value: x, text: y}])
  test(value, record option)
*/

var testAField = function(field, value, record, oneOnly) {
  var name = field._getColumnType;
  var defn = field.defn;
  var errs = [];
  var option;
  var handleError = function(err) {
    if (err) errs.push(err);
    if (oneOnly) return errs;
  }
  
  // required should come first
  if (('notNull' in defn && defn.notNull === true || 'null' in defn && !defn.null)) {
    handleError(tests.required(value));
  }
  
  // then, type test
  handleError(field.selfTest(value))
  
  // then, the rest (without required)
  Object.keys(defn).forEach(function(key) {
    option = defn[key];
    
    switch(key.toLowerCase()) {
      case 'maxlength':
        handleError(tests.maxLength(value, option));
        break;
                
      case 'minlength':
        handleError(tests.minLength(value, option));
        break;
        
      case 'max':
        handleError(tests.max(value, option));
        break;
                
      case 'min':
        handleError(tests.min(value, option));
        break;
                
      case 'isemail':
        if (option === true) handleError(tests.isEmail(value));
        break;
      
      case 'isemailext':
        if (option === true) handleError(tests.isEmailExt(value));
        break;      
                     
      case 'isccno':
        if (option === true) handleError(tests.isCcno(value));
        break;
                     
      case 'isccexp':
        if (option === true) handleError(tests.isCcexp(value));
        break;
                     
      case 'choices':
        handleError(tests.choices(value, option));
        break;

      case 'test':
        handleError(tests.test(value, record, option));
                                      
    }
  })
  
  return errs;
}

var tests = {
	required: function(value, options) {
		return (value === null || value === undefined || value === false || String(value).length == 0) ? 'Required' : null;
	},

  requiredIfNo: function(value, options) {
    var otherValue = data[options];

		return (value || otherValue) ? null : 'Required If No ' + options;
	},
  
  isString: function(value, options) {
    return (typeof value === 'string') ? null : 'Not a string';  
  },
  
	isNumeric: function(value, options) {
		return (value && isNaN(value)) ? 'Not a valid number' : null;
	},

	isBoolean: function(value, options) {
    return (value === true || value === false) ? null : 'Invalid Selection';
	},
  
  isDate: function(value, options) {
    var dt = moment(value, options); // options is date format

	  return (value && !(dt.isValid())) ? 'Not a valid date' : null;
	},

	isTime: function(value, options) {
    var tm = moment(value, options, true); // options is time format
    
		return (value && !(tm.isValid())) ? 'Not a valid time' : null;
	},

	isArray: function(value, options) {
		return (value && $.isArray(value)) ? null : 'Not an Array';
	},
	
  isEmail: function(value, options) {
    // one or more email addresses
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		var res = [];
		
    if (value) {
      value.split(',').forEach(function(email) {
        if (!re.test(email)) res.push(email + ' is Not a valid email address');
      })
      
      return (res.length > 0) ? res.join('<br>') : null;
    }
    else {
      return null;
    }
  },
  
  isEmailExt: function(value, options) {
    // one or more extended email addresses, Greg Miller <greg@reservation-net.com>
		var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		var res = [];
		
    if (value) {
      value.split(',').forEach(function(email) {
        var sp = email.indexOf('<'), ep = email.indexOf('>');
        
        if (sp && ep) email = email.slice(sp+1, ep);
        
        if (!re.test(email)) res.push(email + ' is Not a valid email address');
      })
      
      return (res.length > 0) ? res.join('<br>') : null;
    }
    else {
      return null;
    }    
  },

	isCcno: function(value, options) {
		var luhnChk=function(a){return function(c){for(var l=c.length,b=1,s=0,v;l;)v=parseInt(c.charAt(--l),10),s+=(b^=1)?a[v]:v;return s&&0===s%10}}([0,2,4,6,8,1,3,5,7,9]);

		return (value && luhnChk(value)) ? null : 'Not a valid credit card#';
	},

	isCcexp: function(value, options) {
    var thisYear = new Date().getFullYear() - 2000;
		var mm = parseInt(value.substr(0,2), 10) || 0;
		var yy = (value.indexOf('/') > -1) ? parseInt(value.substr(3,2),10) || 0 : parseInt(value.substr(2,2), 10) || 0;

		return (value && mm < 13 && mm > 0 && yy >= thisYear) ? null : 'Not a valid expiration date';
	},

	min: function(value, options) {
		return (value && parseFloat(value) < parseFloat(options)) ? 'Must be a minimum of ' + options : null;
	},

	max: function(value, options) {
		return (value && parseFloat(value) > parseFloat(options)) ? 'Must be a maximum of ' + options : null;
	},

	minLength: function(value, options) {
		return (value && value.length < options)
			? (typeof value === 'string')
				? 'Must be a minimum length of ' + options
				: 'Must choose at least ' + options + (options > 1) ? 'entries' : 'entry'
			: null;
	},

	maxLength: function(value, options) {
		return (value && value.length > options)
			? (typeof value === 'string')
				? 'Must be a maximum length of ' + options
				: 'Must choose at most ' + options + (options > 1) ? 'entries' : 'entry'
			: null;
	},
	
	choices: function(value, options) {
    var opt, found = false;
    
    for (opt of options) {
      if (opt.value == value) {
        found = true;
        break;
      }
    }
    
		return (found) ? null: 'Invalid Choice';
  },
  
  test: function(value, record, options) {
    // value: field value,
    // record: full record,
    // options: test function
    return (typeof options !== 'function') ? 'Invalid Test Function' : options(record);
  }
};

module.exports = {
  testFullRecord: function(schema, record, oneOnly) {
    // go through each field in model
    var errs = {}, value, err;
    
    Object.keys(schema).forEach(function(field) {
      value = record[field] || null;
      err = testAField(schema[field], value, record, oneOnly).join(',');
      
      if (err) errs[field] = err;
    })
    
    return errs;  
  },

  testPartialRecord: function(schema, record, oneOnly) {
    // go through each field in record
    var errs = {}, value, err;

    Object.keys(record).forEach(function(field) {
      value = record[field] || null;
      err = testAField(schema[field], value, record, oneOnly).join(',');
      
      if (err) errs[field] = err;
    })
    
    return errs;  
  }
};
