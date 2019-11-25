const root = process.cwd();

module.exports = function(opts) {
  const admin = require(root + '/models/adminModels.js')(opts);
  const tenant = require(root + '/models/tenantModels.js')(opts);  
  
  return {
    admin: admin,
    tenant: tenant,
  };
}; 