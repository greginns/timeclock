class Pubsub{
  constructor() {
    this.listeners = new Map();
  }
  
  subscribe(topic, id, fn) {
    var tMap;
    
    if (!(this.listeners.has(topic))) this.listeners.set(topic, new Map());
    
    tMap = this.listeners.get(topic);
    
    tMap.set(id, fn);
    
    this.listeners.set(topic, tMap);
  }
  
  unsubscribe(topic, id) {
    if (this.listeners.has(topic)) {
      var tMap = this.listeners.get(topic);
      
      this._delete(topic, tMap, id)  ;
    }
  }
  
  unsubscribeAll(id) {
    this.listeners.forEach(function(tMap, topic) {
      this._delete(topic, tMap, id)  ;
    }, this)
  }
  
  publish(topic, info) {
    var tMap;
    
    if (!(this.listeners.has(topic))) return;
    
    tMap = this.listeners.get(topic);
    
    tMap.forEach(function(fn, id) {
      fn(info);
    })
  }
  
  _delete(topic, tMap, id) {
    if (tMap.has(id)) {
      tMap.delete(id);
        
      (tMap.size == 0) ? this.listeners.delete(topic) : this.listeners.set(topic, tMap);
    }
  }
};

//const EventEmitter = require('events');
//const modelEmitter = new EventEmitter();
const modelPubsub = new Pubsub();

module.exports = {
  //modelEmitter,
  modelPubsub,
}