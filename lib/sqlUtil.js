const root = process.cwd();
const {exec, shutdown} = require(root + '/lib/db.js');
const models = {}

models['admin'] = require(root + '/models/adminModels.js')(false);
models['tenant'] = require(root + '/models/tenantModels.js')(false);

module.exports = {
  jsonQueryExecify: async function({query={}, group='', pgschema = '', values=[]} = {}) {
    var text = module.exports.jsonToQuery(query, group, pgschema);
    var tm = await module.exports.execQuery({text, values});

    tm.data = module.exports.objectify(tm.data);
    return tm;
  },

  jsonToQuery: function(query, group, pgschema) {
    // [S]ingle quote for [S]trings, [D]ouble quote for things(in the [D]atabase)
    var sql = '';
    var colList = [];
    var joins = [];
    var keys = Object.keys(query);
    var mainTable = keys[0];
    
    var doJoin = function(tblA, tblB, jon) {
      if (!jon) {
        var jona = [];
        var fks = models[group][tblA].getConstraints().fk;
        
        jon = `INNER JOIN "${pgschema}"."${tblB}" AS "${tblB}" ON `;
        
        fks.forEach(function(fk) {
          if (fk.table.name == tblB) {
            let colsA = fk.columns;
            let colsB = fk.tableColumns;      
            
            colsA.forEach(function(col, idx) {
              jona.push(`"${tblA}"."${col}" = "${tblB}"."${colsB[idx]}"`);
            })
          }
        })
        
        jon += jona.join(', ');
      }

      return jon;
    }

    var doOrderby = function(orderBy) {
      if (orderBy.length > 0) {
        let obs = [];
        
        orderBy.forEach(function(tblDef) {

          let tbl = Object.keys(tblDef)[0];
          let cols = Object.values(tblDef)[0];
          var schema = models[group][tbl].getSchema();

          cols.forEach(function(col) {
            if (schema[col].constructor.name == 'Derived') {
              var fn, order;
              
              if (col.substr(0,1) == '-') {
                fn = col.substr(1);
                order = 'DESC';
              }
              else {
                fn = col;
                order = 'ASC';
              }
            
              obs.push(`"${tbl}.${fn}" ${order}`);                              
            }
            else {
              let ad = (col.substr(0,1) == '-') ? `"${col.substr(1)}" DESC` : `"${col}" ASC`;
            
              obs.push(`"${tbl}".${ad}`);                
            }

          });
        })    
        
        return `ORDER BY ${obs.join(', ')}`;
      }
      else {
         return models[group][mainTable].makeOrderBy();
      }
    }

    var swallow = function(tblA, tblADefn, isMainTable, joinName) {
      if (! ('columns' in tblADefn)) tblADefn.columns = ['*'];
      var cols = models[group][tblA].getColumnList({cols: tblADefn.columns || ['*'], isMainTable, joinName})

      if (cols.length > 0) colList = colList.concat(cols);  
      
      (tblADefn.innerJoin || []).forEach(function(ij) {
        let tblB = Object.keys(ij)[0];
        let jon = ij[tblB].on || '';
        
        joins.push(doJoin(tblA, tblB, jon));
        
        swallow(tblB, ij[tblB], false, true);
      })   
    }

    swallow(mainTable, query[mainTable], true, false);    

    sql += `SELECT ${colList.join(',')}\n`;
    sql += `FROM "${pgschema}"."${mainTable}" AS "${mainTable}"\n`;
    sql += joins.join('\n');
    sql += (query[mainTable].where) ? '\n' + query[mainTable].where : '';    
    sql += '\n' + doOrderby(query[mainTable].orderBy || []);

    return sql;      
  },

  objectify: function(data) {
    // turn flat table.col fields into table: {cols}
    // works on a {} or [], returning the same
    var isArray = true;
    var kx = [];

    if (!Array.isArray(data)) {
      data = [data];    
      isArray = false;
    }

    data.forEach(function(row) {
      Object.keys(row).forEach(function(k) {
        if (k.indexOf('.') > -1) {
          kx = k.split('.') // only ever 2 levels deep, ie Department.code
          if (!(kx[0] in row)) row[kx[0]] = {};
          row[kx[0]][kx[1]] = row[k];
          delete row[k];
        }
      })
    })

    return (isArray) ? data : data[0];
  },
  
  execQuery: async function(stmt) {
    return await exec(stmt);
  },
  
  shutdown: async function() {
    return await shutdown();
  },
  
  createSchema: function(pgschema) {
    return `CREATE SCHEMA IF NOT EXISTS ${pgschema}`;
  },
  
  dropSchema: function(pgschema) {
    return `DROP SCHEMA IF EXISTS ${pgschema} CASCADE`;
  },
  
  createTable: function(group, pgschema, table) {
    return models[group][table]['build'](pgschema);
  },
  
  dropTable: function(schema, table) {
    return `DROP TABLE IF EXISTS "${schema}"."${table}"`;
  }
  
}