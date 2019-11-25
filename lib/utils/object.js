var App = App || {};
App.utils = App.utils || {};

App.utils.object = {
  diff: function(obj1, obj2) {
    // old vs new, return diffs
    var diffs = {};
    
    Object.keys(obj1).forEach(function(k) {
      if (! (k in obj2)) {
        diffs[k] = '';
      }
      else if (obj1[k] != obj2[k]) {
        diffs[k] = obj2[k];
      }
    })
    
    Object.keys(obj2).forEach(function(k) {
      if (! (k in obj1)) diffs[k] = obj2[k];
    })
    
    return diffs;
  }, 

}

if (typeof module !== "undefined" && module.exports) {
  module.exports = App.utils.object;
}