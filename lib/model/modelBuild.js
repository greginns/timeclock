/*
  Test that adding a not null also adds a default
*/
const ModelBase = require('./modelBase.js')

const quotedList = function(list) {
  return list.map(function(el) {
    return `"${el}"`;
  });
}
    
var compareTwoArrays = function(npk, opk) {
  // make sure number and order are same 
  if (opk.length != npk.length) return false;
  
  for (var i=0; i<opk.length; i++) {
    if (opk[i] != npk[i]) return false;
  }
  
  return true;      
};

var compareFKs = function(nfk, ofk) {
  // compares two fks with same name
  // {name: 'user', columns: ['user'], table: models.User, tableColumns: ['id'], onDelete: 'NO ACTION'}
  if (!compareTwoArrays(ofk.columns, nfk.columns)) return false;
  if (!compareTwoArrays(ofk.tableColumns, nfk.tableColumns)) return false;
  if (ofk.onDelete != nfk.onDelete) return false;
  if (ofk.table != nfk.table.name) return false;
  
  return true;      
};

class ModelBuild extends ModelBase {
  constructor() {
    super()
  }

  static create(pgschema) {
    var self = this;
    var tableName = this.getTableName({pgschema});
    var tableNameRaw = this.getTableName({naked: true});
    var colNames = this.getColumnNames({showHidden: true, includeDerived: false});
    var schema = this.getSchema();
    var constraints = this.getConstraints();
    var build = '', buildFK = '';
    var errs = this.verify();
    var fks;

    if (errs.length > 0) {
      return [errs, '', ''];
    }

    var buildColumns = function() {
      let cols = colNames.map(function(col) {
        return schema[col].build(`"${col}"`);
      });

      return cols;
    };
    
    var buildPK = function() {
      let pk = '';

      if ('pk' in constraints) {
        pk = `PRIMARY KEY(${quotedList(constraints.pk).join(',')})`;
      }
      
      return pk;
    };
    
    var buildFKs = function() {
      let fks = [], fkeyName;

      if ('fk' in constraints && constraints.fk.length > 0) {
        constraints.fk.forEach(function(val) {
          fkeyName = self.makeFkeyName(`${pgschema}.${tableNameRaw.toLowerCase()}`, val.name);
              
          fks.push(` ADD CONSTRAINT "${fkeyName}" FOREIGN KEY(${quotedList(val.columns).join(',')}) REFERENCES ${val.table.getTableName({pgschema})} (${quotedList(val.tableColumns).join(',')}) ON DELETE ${val.onDelete}`);
        })  
      }
      
      return fks;
    }
    
    build += `CREATE TABLE IF NOT EXISTS ${tableName}`;
    build += ' (\n';
    build += buildColumns().join(',\n');
    build += ',\n';
    build += buildPK();
    build += '\n);';
    
    fks = buildFKs();
    
    if (fks.length > 0) {
      buildFK += `ALTER TABLE ${tableName}`;
      buildFK += fks.join(',')
      buildFK += ';';      
    }

    return [errs, build, buildFK];
  }
  
  static alter(pgschema, old) {
    var self = this;
    var tableName = this.getTableName({naked: true});
    var colNames = this.getColumnNames({showHidden: true, includeDerived: false});
    var schema = this.getSchema();
    var constraints = this.getConstraints();
    var oldColNames = Object.keys(old.schema);
    var alter = '', alters = [], fkeyName;
    var errs = this.verify();

    if (errs.length > 0) {
      return [errs, ''];
    }
    
    var addColumns = function() {
      // entries in colNames not in old
      colNames.forEach(function(col) {
        if (oldColNames.indexOf(col) == -1) {
          alters.push('\nADD COLUMN ' + schema[col].build(`"${col}"`));
        }
      })      
    }
    
    var dropColumns = function() {
      // entries in old not in colNames
      oldColNames.forEach(function(col) {
        if (colNames.indexOf(col) == -1) {
          if (old.schema[col].type != 'Derived') {
            alters.push(`\nDROP COLUMN IF EXISTS "${col}"`);  
          }
        }
      })      
    };
    
    var alterColumns = function() {
      // entries in both colNames and old, but different type or defn
      var ntype, otype, ndefn, odefn;
      
      colNames.forEach(function(col) {
        if (oldColNames.indexOf(col) != -1) {
          ntype = schema[col].constructor.name;
          otype = old.schema[col].type;
          ndefn = schema[col].defn;
          odefn = old.schema[col];
          
          if (otype != ntype || odefn.maxLength != ndefn.maxLength || odefn.array != ndefn.array) {
            // change type 
            alters.push(`\nALTER COLUMN "${col}" TYPE` + schema[col].alterType(''));
          }

          if (odefn.notNull && !ndefn.notNull) {
            alters.push(`\nALTER COLUMN "${col}" DROP NOT NULL`);
          }
          
          if (ndefn.notNull && !odefn.notNull) {
            alters.push(`\nALTER COLUMN "${col}" SET NOT NULL`);
          }
      
          if (odefn.null && !ndefn.null) {
            alters.push(`\nALTER COLUMN "${col}" DROP NULL`);
          }
          
          if (ndefn.null && !odefn.null) {
            // Needs to set default here
            alters.push(`\nALTER COLUMN "${col}" SET NULL`);  
          }
          
          if (odefn.default && !ndefn.default) {
            alters.push(`\nALTER COLUMN "${col}" DROP DEFAULT`);
          }
          
          if (ndefn.default && !odefn.default) {
            alters.push(`\nALTER COLUMN "${col}" SET DEFAULT '${ndefn.default}'`);
          }
        }
      })      
    }
    
    var alterConstraints = function() {
      // pk - redo
      if (!compareTwoArrays(constraints.pk || [], old.constraints.pk || [])) {
        alters.push(`\nDROP CONSTRAINT IF EXISTS "${tableName}_pkey"`);
        alters.push(`\nADD PRIMARY KEY(${quotedList(constraints.pk).join(',')})`);
      }
      
      // fk - add, remove, change
      var conAdd = function() {
        // add fks in new, not in old, ie no name match
        let addCon;
        
        (constraints.fk || []).forEach(function(nval) {
          addCon = true;  
          
          (old.constraints.fk || []).forEach(function(oval) {
            // same name = don't add (maybe alter, below)
            if (nval.name == oval.name) {
              addCon = false;
            }
          })
          
          if (addCon) {
            fkeyName = self.makeFkeyName(tableName, nval.name);
          
            alters.push(`\nADD CONSTRAINT "${fkeyName}" FOREIGN KEY(${quotedList(nval.columns).join(',')}) REFERENCES ${nval.table.getTableName({pgschema})} (${quotedList(nval.tableColumns).join(',')}) ON DELETE ${nval.onDelete}`);
          }
        })
      };
      
      var conDrop = function() {
        // drop fks in old, not in new, ie no name match
        let dropCon;
        
        (old.constraints.fk || []).forEach(function(oval) {
          dropCon = true;
          
          (constraints.fk || []).forEach(function(nval) {
            // same name = don't drop (maybe alter, below)
            if (nval.name == oval.name) {
              dropCon = false;
            }
          })
        
          if (dropCon) {
            fkeyName = self.makeFkeyName(tableName, oval.name);
            
            alters.push(`\nDROP CONSTRAINT IF EXISTS "${fkeyName}"`);
          }
        });
      };
      
      var conAlter = function() {
        // drop/add same name different signature
        (constraints.fk || []).forEach(function(nval) {
          (old.constraints.fk || []).forEach(function(oval) {
            // same name and exact same signature
            if (nval.name == oval.name && !compareFKs(nval, oval)) {
              fkeyName = self.makeFkeyName(tableName, nval.name);

              alters.push(`\nDROP CONSTRAINT IF EXISTS "${fkeyName}"`);
              alters.push(`\nADD CONSTRAINT "${fkeyName}" FOREIGN KEY(${quotedList(nval.columns).join(',')}) REFERENCES ${nval.table.getTableName({pgschema})} (${quotedList(nval.tableColumns).join(',')}) ON DELETE ${nval.onDelete}`);
            }
          })
        })
      };
      
      conAdd();
      conDrop();
      conAlter();             
    }
    
    addColumns();
    dropColumns();
    alterColumns();
    alterConstraints();
    
    if (alters.length > 0) {
      alter = `ALTER TABLE "${pgschema}"."${tableName}"`;
      alter += alters.join(',');
      alter += ';';
    }
    
    return [errs, alter];
  }
  
  static verify() {
    var tableName = this.getTableName();
    var colNames = this.getColumnNames({showHidden: true, includeDerived: false});
    var schema = this.getSchema();
    var constraints = this.getConstraints();
    var orderBy = this.getOrderBy();
    var errs = [], valArray, fkeyNames;
    
    // test col defs
    colNames.forEach(function(col) {
      let ferrs = schema[col].verify();
      
      if (ferrs.length > 0) {
        errs.push(`${tableName} - ${col} : ${ferrs.join(', ')}`);
      }
    })
    
    // test constraints
    Object.keys(constraints).forEach(function(con) {
      switch(con) {
        case 'pk':
          if (!Array.isArray(constraints[con])) {
            errs.push(`${tableName} : PK must be an array of column name(s)`);
          }
          else {
            constraints[con].forEach(function(col) {
              if (colNames.indexOf(col) == -1) errs.push(`${tableName} - ${col} : PK not a defined column`);
            })
          }
          
          break;
          
        case 'fk':
          valArray = constraints[con];
          fkeyNames = [];
          
          if (!Array.isArray(valArray)) {
            errs.push('FK must be an array of objects');
          }
          else {
            valArray.forEach(function(val) {
              if (typeof val != 'object' || !val) {
                errs.push('FK must have an object definition');
              }
              else {
                if (! ('name' in val && val.name)) {
                  errs.push(`${tableName} : FK must have a Name`);
                }
                
                if (fkeyNames.indexOf(val.name.toLowerCase()) > -1) {
                  errs.push(`${tableName} : FK ${val.name} must be unique`);
                }
                
                if (! ('table' in val)) {
                  errs.push(`${tableName} : FK must have a Table value`);
                }
                else {
                  try {
                    val.table.getTableName();
                  }
                  catch(e) {
                    errs.push(`${tableName} : FK Table value must be a model class`);
                  }
                }
                
                if ('columns' in val && !val.columns) {
                  errs.push(`${tableName} : FK Columns must have a value`);
                }
                else {
                  if (!Array.isArray(val.columns)) {
                    errs.push(`${tableName} : FK Columns must be an array of column name(s)`);
                  }
                }
                
                if ('tableColumns' in val && !val.tableColumns) {
                  errs.push(`${tableName} : FK TableColumns must have a value`);
                }
                else {
                  if (!Array.isArray(val.tableColumns)) {
                    errs.push(`${tableName} : FK TableColumns must be an array of column name(s)`);
                  }
                  else {
                    // do the names exist
                    var fkCols = val.table.getColumnDefns();
                    
                    val.tableColumns.forEach(function(tbc) {
                      if (! (tbc in fkCols)) {
                        errs.push(`${tableName} : FK TableColumns - invalid field ${tbc}`);
                      }
                    })
                  }
                }
                
                if ('onDelete' in val && (val.onDelete != 'CASCADE' && val.onDelete != 'NO ACTION')) errs.push(`${tableName} : onDelete must be CASCADE or NO ACTION`);
                if ('onUpdate' in val && (val.onUpdate != 'CASCADE' && val.onUpdate != 'NO ACTION')) errs.push(`${tableName} : onUpdate must be CASCADE or NO ACTION`);
                
                fkeyNames.push(val.name);
              }            
            }) 
          }          
          
          break;
        
      }
    });
    
    // test orderBy
    orderBy.forEach(function(col) {
      if (col.substr(0,1) == '-') col = col.substr(1);
      
      if (! (col in schema)) {
        errs.push(`${tableName} - ${col} : Invalid OrderBy column name`);
      }
    });

    return errs;
  }

  static drop(pgschema, pswd) {
    // only for a table dropping itself
    var tableName = this.getTableName({pgschema});
    var dt = new Date();
    var pwd = dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate();
    
    if (pwd != pswd) return false;
    
    return `DROP TABLE IF EXISTS ${tableName} CASCADE`;    
  }
  
  static toJSON() {
    var defn = this.definition();
    var defk;
    var json = {};
    
    Object.keys(defn).forEach(function(k) {
      defk = defn[k];

      if (k == 'schema') {
        // convert field type to string
        var colList = defk, schema = {}, colDefn;
        
        Object.keys(colList).forEach(function(col) {
          colDefn = JSON.parse(JSON.stringify((colList[col].defn)));
          colDefn.type = colList[col].constructor.name
          schema[col] = colDefn;
        })
        
        json[k] = schema;
      }
      else if (k == 'constraints' && 'fk' in defk) {
        // convert fk table Class name to string
        var fk = [];

        defk.fk.forEach(function(f) {
          f.table = f.table.name;  
          fk.push(f);
        })
        
        defk.fk = fk;
        json[k] = defk;
      }
      else {
        json[k] = defk;
      }
    })
    
    return json;  
  }
}

module.exports = ModelBuild;
