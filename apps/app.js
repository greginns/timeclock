var ga;
var App = {};

App.classes = {};
App.config = {};
App.constants = {};
App.dataStore = {};
App.defaults = {};
App.helpers = {};
App.module = '';
App.modals = {};
App.mvcs = {};
App.mvcObjs = {};
App.pages = {};
App.router = {};
App.schemas = {};
App.startup = {readyProms: []};
App.storage = {};
App.subs = {};
App.tables = {};
App.tableData = {};
App.utils = {};

App.constants.dateFormat = {
	moment: 'YYYY-MM-DD',
	app:  'YYYY-MM-DD',
	nice: 'MMM Do, YYYY',
	long: 'dddd, MMMM Do, YYYY',
	time: 'h:mm A',
};

App.startup.init = function() {
  // cycle through pages and initiate each one, and init mvc sections.
	var mvcs = [];

	var func = function(id) {
	  var mvc = App.mvcs[id];
    mvc.mvc = new MVC(mvc.section[0], mvc.mvcObj);

    return new Promise(function(resolve, reject) {
      mvc.mvc.init()
      .then(function() {
        if ('page' in mvc && mvc.page) {
          App.startup.addToRouter(mvc.path, mvc.page, ('$lifecycle' in mvc.mvc) ? mvc.mvc.$lifecycle.inView.bind(mvc.mvc) : null, ('$lifecycle' in mvc.mvc) ? mvc.mvc.$lifecycle.outView.bind(mvc.mvc) : null, mvc.title);
        }

        resolve();
      })
      .catch(function(err) {
        console.log(err)
        reject(err);
      })
    });
	};

  App.router = new Router(App.module);

  return new Promise(function(resolve, reject) {
  	Object.keys(App.mvcs).forEach(function(id) {
 		  mvcs.push(func(id));
  	});

  	Promise.all(mvcs)
  	.then(function(res) {
  	  App.router.add('404', function(){console.log('page not found')});
  	  resolve();
  	})
  	.catch(function(err) {
  	  reject(err);
  	  console.log(err)
  	});

  })
};

App.startup.addToRouter = function(path, page, inView, outView, title) {
	var inFunc = function(params) {
		// hide all pages
		$(document.body).find('page').each(function() {
			$(this).hide();
		});

		// show wanted page
		page.show();
		window.scrollTo(0, 0);

		// call 'in' function
		if (inView) inView(params);
	};

	var outFunc = function(params) {
		// call 'out' function
		if (outView) {
		  return outView(params);
		}

		return true;
	};

	App.router.add(path, inFunc, outFunc, title);
};

/* Data fetching theories:
  tables: Needed tables are specified App wide  
            App.wsdc.setTables([])  main page 
          Each page subscribes to individual tables, as needed  
            App.subs.data.subscribe(url, cb)  pages
          Server publishes a change to tables  
            App.subs.data.publish(url, data)  WSDatacom
          
  subsets: 
          Specified as needed in each page  
            App.wsdc.addSubset({table, filter})    page
            App.subs.data.subscribe(url, cb)  (get handle to remove)  page
          Any rtn using a subset publishes a change to server  
            App.wsdc.publishSubsetChanges(table, filter) page
          Server publishes changes  
            App.subs.data.publish(url, data)  WSDatacom
          (the table change itself would also trigger a publish on server)

  removal/subscribe to subset          
      var ef = this.$get('empworkFilter');
      var pempcode = this.$get('previousFilter');
      
      if (ef) {
        ef.remove();
        App.wsdc.removeSubset({table: 'empwork', filter: pempcode});
      }

      App.wsdc.addSubset({table: 'empwork', filter: empcode});
      ef = App.subs.data.subscribe('/tenant/empwork/' + empcode, function(data) {
        console.log('subset',data)
      })      
      
      // Save sub removal
      this.$set('empworkFilter', ef);
      this.$set('previousFilter', empcode);          
*/

App.Pubsub = class {
  constructor() {
    this.listeners = {};
  }
  
  subscribe(topic, fn) {
    var self = this;
    var idx;
    
    if (!(this.listeners.hasOwnProperty(topic))) this.listeners[topic] = [];
    
    idx = this.listeners[topic].push(fn) - 1;

    return {
      remove: function() {
        delete self.listeners[topic][idx];
      }
    }
  }
  
  publish(topic, info) {
    if (!(this.listeners.hasOwnProperty(topic))) return;
    
    this.listeners[topic].forEach(function(fn) {
      fn(info);
    })
  }
};

App.subs.data = new App.Pubsub();
App.subs.general = new App.Pubsub();

App.classes.WSDataComm = class {
  constructor(system) {
    this.system = system;
    this.host = (location.protocol == 'https:') ? 'wss:' : 'ws:';
    this.host += `//${location.host}/${system}`;
    this.retries = 0;
    this.retryMax = 10;
    this.tables = [];
    this.subsets = [];
  }
  
  setTables(tables) {
    // set list of tables we're following.
    this.tables = tables;
  }
  
  setSubsets(subsets) {
    this.subsets = subsets;
  }
  
  addTable(table) {
    this.table.push(table);
    this.subscribeToTableChanges(table);
  }
  
  addSubset(subset) {
    // {table, subset}
    this.subsets.push(subset);
    this.subscribeToSubsetChanges(subset);
  }
  
  removeTable(table) {
    var idx = this.tables.indexOf(table);
    if (idx != -1) this.tables.splice(idx);
  }
  
  removeSubset(subset) {
    for (var i=0; i<this.subsets.length; i++) {
      if (JSON.stringify(this.subsets[i]) == JSON.stringify(subset)) {
        this.subsets.splice(i);
        break;
      }
    }
  }
  
  start() {
    this.initWS();
    this.getAllTableData();
    this.getAllSubsetData();
  }
  
  initWS() {
    var self = this;
    
    this.ws = new WebSocket(this.host);

    this.ws.onopen = function() {
      self.subscribeAllTables();
      self.subscribeAllSubsets();
      self.retries = 0;
    };
    
    this.ws.onmessage = function(ev) {
      self.handleIncomingMessage(ev.data);
    };
    
    this.ws.onerror = function(ev) {
      console.log(ev)
    };
    
    this.ws.onclose = function(ev) {
      console.log(ev);
      
      setTimeout(function() {
        self.retries++;
        
        if (self.retries <= self.retryMax) {
          console.log('retrying WS connection ', self.retries)
          self.initWS();
        }
        else {
          alert('Connection to server has been lost.  Click OK to reload this page');
          window.location.reload();
        }
      }, 2000)
    }
  }
  
  getAllTableData() {
    this.tables.forEach(function(table) {
      this.getData(`/${this.system}/${table}`);
    }, this);
  }
  
  getAllSubsetData() {
    this.subsets.forEach(function(subset) {
      this.getData(`/${this.system}/${subset.table}/${subset.filter}`);
    }, this);
  }
  
  subscribeAllTables() {
    this.tables.forEach(function(table) {
      this.subscribeToTableChanges(table)
    }, this);
  }
  
  subscribeAllSubsets() {
    this.subsets.forEach(function(subset) {
      this.subscribeToSubsetChanges(subset);
    }, this)
  }
  
  subscribeToTableChanges(table) {
    var msg = JSON.stringify({cat: 'sub', source: 'table', system: `${this.system}`, table: `${table}`});
    
    this.ws.send(msg);      
  }

  subscribeToSubsetChanges(subset) {
    var msg;
    
    msg = JSON.stringify({cat: 'sub', source: 'subset', system: `${this.system}`, table: `${subset.table}`, filter: `${subset.filter}`});

    this.ws.send(msg);      
  }

  publishSubsetChanges(table, filter) {
    var msg;
    
    msg = JSON.stringify({cat: 'pub', source: 'subset', system: `${this.system}`, table: `${table}`, filter: `${filter}`});

    this.ws.send(msg);      
  }
  
  handleIncomingMessage(text) {
    var data = JSON.parse(text);

    switch(data.cat) {
      case 'pub':
        switch(data.source) {
          case 'table':
            this.getData(`/${this.system}/${data.table}`);
            break;
            
          case 'subset':
            this.getData(`/${this.system}/${data.table}/${data.filter}`); 
            break;
        }
        
        break; 
    }
  }
  
  getData(url) {
    io.get({}, url)
    .then(function(res) {
      App.subs.data.publish(url, (res.status == 200) ? res.data : []);
    })
  }
}

//MVC.config({prefix: 'mvc'});
/*
window.roam3_updateTitle = function(val) {
  var titles = document.title.split('|');

  setTimeout(function() {   // just in case this goes before the app setting the title.
    document.title = val + '|' + titles[titles.length-1];
  }, 250);
}

window.roam3_focusOnMe = function() {
  window.focus();
}

window.roam3_focusOnOpener = function() {
  window.blur();

  try {
    window.open('', window.opener.name);  // works in Chrome
    window.opener.roam3_focusOnMe();
  }
  catch(e) {
    console.log('no opener');
  }
}
*/