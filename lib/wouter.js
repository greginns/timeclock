const root = process.cwd();
const {modelPubsub} = require(root + '/lib/pubsub.js');

class Wouter {
  constructor() {
  }

  static route(text, id, tenant, WSclients) {
    var rc = true;
    var msg = JSON.parse(text);

    switch(msg.cat) {
      case 'sub':
        rc = this.subscribe(msg, id, tenant, WSclients);
        break;

      case 'pub':
        this.publish(msg, id, tenant, WSclients);
        break;
        
      default:
        rc = false;
    }

    return rc;
  }

  static unroute(id) {
    modelPubsub.unsubscribeAll(id);
  }

  static subscribe(msg, id, tenant, WSclients) {
    var rc = true;

    switch (msg.source) {
      case 'table':
        var topic = `${tenant}.${msg.table}`;

        modelPubsub.subscribe(topic, id, function() {
          var oMsg = JSON.stringify({cat: 'pub', source: 'table', table: msg.table});

          WSclients.get(id).ws.send(oMsg);
        })

        break;

      case 'subset':
        var topic = `${tenant}.${msg.table}.${msg.filter}`;

        modelPubsub.subscribe(topic, id, function() {
          var oMsg = JSON.stringify({cat: 'pub', source: 'subset', table: msg.table, filter: msg.filter});

          WSclients.get(id).ws.send(oMsg);
        })

        break;

      default:
        rc = false;
    }

    return rc;
  }
  
  static publish(msg, id, tenant, WSclients) {
    // some client somewhere has decided to tell everyone that a table/subset has changed
    switch (msg.source) {
      case 'table':
        var topic = `${tenant}.${msg.table}`;

        modelPubsub.publish(topic)
        break;

      case 'subset':
        var topic = `${tenant}.${msg.table}.${msg.filter}`;

        modelPubsub.publish(topic)
        break;
    }  
  }

}

module.exports = {
  Wouter,
}