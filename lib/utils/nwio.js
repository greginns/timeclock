var App = App || {};
App.utils = App.utils || {};

App.utils.nwio = {
  makePDF: async function({config = {}, source = '', popts = {}, protocol= ''} = {}) {
    // fetch is an issue server side.
    // config is nwio config format
    // text is text/html
    // opts for processor: {orientation}
    // protocol, usually for server side
    var url = `${protocol || location.protocol}//${config.nwio.domain}:${config.nwio.ports[location.protocol]}${config.nwio.paths.pdf}`;
    var opts = {headers: {}}, resp, ret = {}, data;
    
    opts.method = 'POST';
    opts.body = JSON.stringify({text: source, landscape: popts.orientation || false});
    opts.headers['Content-Type'] = 'application/json';

    return await fetch(url, opts);
  },
  
  print: async function({config = {}, text = '', printer = '', popts = {}, protocol = ''} = {}) {
    var url = `${protocol || location.protocol}//${config.nwio.domain}:${config.nwio.ports[location.protocol]}${config.nwio.paths.print}`;
    var opts = {headers: {}};

    popts.copies = popts.copies || 1;
    popts.landscape = popts.landscape || false;
    popts.hdrsAndftrs = popts.hdrsAndftrs || false;
    
    opts.method = 'POST';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify({popts, printer, text});

    return await fetch(url, opts);
  },
  
  getPrinters: async function({config = {}, protocol = ''} = {}) {
    var url = `${protocol || location.protocol}//${config.nwio.domain}:${config.nwio.ports[location.protocol]}${config.nwio.paths.printerList}`;
    var opts = {headers: {}}, resp, ret = {}, data;
    
    opts.method = 'POST';
    opts.headers['Content-Type'] = 'application/json';

    return await fetch(url, opts);
  },
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = App.utils.nwio;
}