const root = process.cwd();
const http = require('http');
const server = http.createServer();
const WebSocket = require('ws');
const wss = new WebSocket.Server({noServer: true, maxPayload: 50000, clientTracking: false});
const fs = require('fs').promises;
const config = require(root + '/config.json').server;

const mw = {}
mw.request = require(root + '/middleware/request.js');
mw.security = require(root + '/middleware/security.js');

const {Error404} = require(root + '/lib/errors.js');
const {TravelMessage, ResponseMessage} = require(root + '/lib/messages.js');
const {Router, RouterMessage} = require(root + '/lib/router.js');
const {Wouter} = require(root + '/lib/wouter.js');
const sqlUtil = require(root + '/lib/sqlUtil.js');
const WSclients = new Map();
const uuidv1 = require('uuid/v1');

require(root + '/apps/admin/server/routes.js');  // processes routes.
require(root + '/apps/tenant/server/routes.js');  // processes routes.

process
.on('unhandledRejection', (reason, p) => {
  console.error(reason);
  console.error('There was an uncaught rejection', p);
  sqlUtil.shutdown();
  process.exit(1) //mandatory (as per the Node docs)
})
.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
  sqlUtil.shutdown();
  process.exit(1) //mandatory (as per the Node docs)
});

Router.add(new RouterMessage({
  method: 'get',
  path: '404', 
  fn: async function(req, res) {
    var rm = new ResponseMessage(), tm = new TravelMessage({data: '', status: 404, err: new Error404()});

    rm.convertFromTravel(tm)
    
    return tm;
  }, 
  options: {needLogin: false}
}));

Router.add(new RouterMessage({
  method: 'get',
  path: '/favicon.ico', 
  fn: async function(req, res) {
    var rm = new ResponseMessage(), tm = new TravelMessage();

    try {
      tm.data = await fs.readFile(root + '/favicon.ico');  
      tm.type = 'icon';
    }
    catch(err) {
      tm.err = new Error404();
    }
    
    rm.convertFromTravel(tm)
    return rm;
  }, 
  options: {needLogin: false, bypassUser: true}
}));

const reply = function(res, rm) {
  // Send Reply from a ResponseMessage
  res.setHeader("Content-Type", rm['Content-Type']);
  res.statusCode = rm.status || 500;
  
  // any cookies?
  if (rm.cookies && rm.cookies.length > 0) {
    let cookies = [];
    var cookieValue;
    
    rm.cookies.forEach(function(cookie) {
      cookieValue = cookie.name + '=' + cookie.value 
      
      if ('Max-Age' in cookie) cookieValue += '; Max-Age=' + cookie['Max-Age'];
      if ('HttpOnly' in cookie && cookie.HttpOnly) cookieValue += '; HttpOnly';
      if ('path' in cookie) cookieValue += '; path=' + cookie['path'];
      
      cookies.push(cookieValue);
    })

    res.setHeader('Set-Cookie', cookies);
  }
  
  // redirect?
  if (res.statusCode == 302) {
    res.setHeader('Location', rm.data);
  }

  res.write(rm.data, rm.encoding || 'utf8');
  
  res.end();  
}

server.on('request', async function(req, res) {
  var rm;

  try {
    // Middleware - decorates req, res 
    await mw.request.process(req, res);
    await mw.security.check(req, res);

    // Routes - communicate via params and resp message
    rm = await Router.go(req, res)
  }
  catch(erm) {
console.log(erm)    
    rm = erm;
  }

  reply(res, rm);
});
 
server.on('upgrade', async function(req, socket, head) {
  var tenant, user;

  await mw.request.processWS(req);
  [tenant, user] = await mw.security.checkWS(req);

  if (!user) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, function(ws) {
    wss.emit('connection', socket, ws, tenant.code, user.id);
  });
});

wss.on('connection', function(socket, ws, TID, userID) {
  // record clients 
  const wsID = uuidv1();
  
  ws.isAlive = true;
  WSclients.set(wsID, {ws, TID});
  
  ws.on('pong', function() {
    ws.isAlive = true;
  });
  
  ws.on('close', function() {
    // unsubscribe
    Wouter.unroute(wsID);
    WSclients.delete(wsID);
  });
  
  ws.on('message', function message(msg) {
    if (!Wouter.route(msg, wsID, TID, WSclients)) {
      ws.terminate();
      //socket.destroy();
    }
  });
});
  
setInterval(function() {
  for (var wsObj of WSclients.values()) {
    if (!wsObj.ws.isAlive) { 
      wsObj.ws.terminate(); 
      return; 
    }
    
    wsObj.ws.isAlive = false;
    wsObj.ws.ping();
  }
}, 30000);


server.listen(config.port);
console.log('GO! on ' + config.port);

/*
if(this.limitCounter >= Socket.limit) {
  if(this.burstCounter >= Socket.burst) {
     return 'Bucket is leaking'
  }
  ++this.burstCounter
  return setTimeout(() => {
  this.verify(callingMethod, ...args)
  setTimeout(_ => --this.burstCounter, Socket.burstTime)
  }, Socket.burstDelay)
}
++this.limitCounter

For example, if you’re using WS library for Node for creating websockets on server, you can use the maxPayload option to specify the maximum payload size in bytes. 
*/

/*
var sqlExec = async function(sqlList) {
  for (const sql of sqlList) {
    console.log(sql.substr(0,30))
    
    try {
      var res = await db.exec(sql);
      console.log(res)
    }
    catch (error) {
      console.log(error)
    }
  }
  
  console.log('pre-end')
  db.shutdown();
  console.log('end')
}
*/
/* VERIFY
  // USAGE
  Object.keys(models['tenant']).forEach(function(model) {
    models['tenant'][model].doManagers();
  });

  Object.keys(models['public']).forEach(function(model) {
    models['public'][model].doManagers();
  });
  
  var x = new models.tenant.Employee({code: 'E1', first: 'Greg'});
  console.log(x.toObject())
  x.getDepartments(pgschema)  
*/
