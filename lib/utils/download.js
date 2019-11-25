var App = App || {};
App.utils = App.utils || {};

App.utils.download = {
  _base: function({dataURI='', filename='FileName'} = {}) {
    const downloadLink = document.createElement("a");

    downloadLink.href = dataURI;
    downloadLink.download = filename;
    downloadLink.click();
    
    setTimeout(function() {
      downloadLink.remove();
    }, 2000);
  },
  
  pdf: function({data = '', filename = ''} = {}) {
    var dataURI = `data:application/pdf;base64,${data}`;

    App.utils.download._base({dataURI, filename});
  },

  csv: function({data = '', filename = ''} = {}) {
    var dataURI = `data:text/csv;charset=utf-8,%EF%BB%BF${encodeURI(data)}`;

    App.utils.download._base({dataURI, filename});
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = App.utils.download;
}