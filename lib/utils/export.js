var App = App || {};
App.utils = App.utils || {};

App.utils.export = {
  extractRowsFromTable: function({source='', quoted=true} = {}) {
    var rows = []; 

    var breakup = function(table) {
      return table.children();
    }
    
    var extract = function(el) {
      el.each(function() {
        $(this).children('tr').each(function() {
          var row = [];
          
          $(this).children('th,td').each(function() {
            let cell = $(this);
            //let tbls = cell.children('table');
            let text = cell.text().replace(/(\r\n|\n|\r)/gm, "").trim();

            row.push((quoted) ? `"${text}"` : text);
            
            for (var i=1; i<cell.attr('colspan') || 0; i++) {
              row.push('');
            }
          })
          
          rows.push(row);
        })
      })      
    }

    var process = function(table) {
      breakup(table).each(function() {
        extract($(this));
      });
    }

    process($(source));
    
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