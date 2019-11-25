var App = App || {};
App.utils = App.utils || {};

App.utils.export = {
  extractRowsFromTable: function({source='', quoted=true} = {}) {
    var html = $(source);
    var thead = html.children('thead');
    var tbody = html.children('tbody');
    var tfoot = html.children('tfoot');
    var rows = []; 
    
    var extract = function(el) {
      el.each(function() {
        $(this).children('tr').each(function() {
          var row = [];
          
          $(this).children('th,td').each(function() {
            var cell = $(this);
            
            row.push((quoted) ? `"${cell.text().trim()}"` : cell.text().trim());
            
            for (var i=0; i<cell.attr('colspan') || 0; i++) {
              row.push('');
            }
          })
          
          rows.push(row);
        })
      })      
    }

    extract(thead);
    extract(tbody);
    extract(tfoot);
    
    return rows;  
  },
  
  makeCSVFromArray: function({rows = []} = {}) {
    return rows.join('\n');
  },
  
  makeFileFromData: function({data='', filename='fileName', opts={type: 'text/plain'}} = {}) {
    return new File([data], filename, opts);
  }, 
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = App.utils.export;
}