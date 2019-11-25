/*
  https://www.postgresql.org/docs/9.1/functions-string.html
*/

class ModelBase {
  constructor() {
  }  

/* new static method
Object.assign(Employee, {
  subtract(a, b) {
    return a - b
  }
});
*/
  extractPrimaryKey() {
    // pull out cols that are part of pk.  Return as an obj, or false if none found
    var pkCols = this.constructor.getConstraints().pk;
    var pkRec = {};

    pkCols.forEach(function(col) {
      if (col in this) pkRec[col] = this[col];
    }, this);
    
    return (Object.keys(pkRec).length != pkCols.length) ? false : pkRec;
  }

  static getColumnList({cols = '*', isMainTable=false, joinName=false, showHidden = false, includeDerived = true} = {}) {
    // list of fully qualified, quoted, column names, ie "Department"."code"
    // Main Table name is "code" vs joinName/Derived "Department.code"
    // isMainTable: whether or not to include table name as part of the column
    var tnx = this.getTableName({pgschema: null, naked: true});   // without quotes
    var schema = this.getSchema();
    var as, colx, fl = [], colNames = [], goodCols = [];

    // select columns, either all or specific
    if (!cols || cols == '*') {
      cols = this.getColumnNames({showHidden, includeDerived});
    }
    else {
      if (!Array.isArray(cols)) cols = [cols];

      colNames = this.getColumnNames({showHidden: true, includeDerived}); // All columns - as reference.  Specifying a col overrules showHidden
      
      cols.forEach(function(col) {
        if (colNames.indexOf(col) > -1) goodCols.push(col);
      })
      
      cols = goodCols;
    }

    // build list of columns
    cols.forEach(function(col) {
      if (schema[col].constructor.name == 'Derived') {
        colx = (isMainTable) ? `"${col}"` : `"${tnx}.${col}"`;

        fl.push(`${schema[col].defn.defn} ${colx}`);
      }
      else {
        as = (joinName) ? ` AS "${tnx}.${col}"` : '';
        colx = (isMainTable) ? `"${col}"` : `"${tnx}"."${col}"`;

        fl.push(`${colx}${as}`);  
      }
    })

    return fl.join(',');   
  }

  static getColumnNames({showHidden = false, includeDerived = true} = {}) {
    // list of actual column names
    var hidden = this.definition().hidden || [];
    var schema = this.getSchema()
    var cols = Object.keys(schema);
    var colNames = [], isHidden, isDerived;
    
    cols.forEach(function(col) {
      isHidden = hidden.indexOf(col) > -1;
      isDerived = schema[col].constructor.name == 'Derived';
      
      if ((isHidden && showHidden) || !isHidden) {
        if ((isDerived && includeDerived) || !isDerived) {
          colNames.push(col);
        }
      }
    })

    return colNames;
  }
  
  static getTableName({pgschema = '', naked = false} = {}) {
    // pgschema = optional dbschema name
    // naked = just the name, no quotes no schema
    return (naked) ? this.name : (pgschema) ? `"${pgschema}"."${this.name}"` : `"${this.name}"`;
  }
  
  static getSchema() {
    // get col defns
    return this.definition().schema || {};
  }
  
  static getColumnDefns() {
    // return back defn of table columns, plus 'column' (name), and id (for html id)
    var defns = {};
    var tn = this.getTableName({pgschema: null, naked: true}).toLowerCase();
    var schema = this.getSchema();
    
    for (var col in schema) {
      defns[col] = schema[col].defn; 
      defns[col].column = col;
      defns[col].id = `${tn}_${col}`;
    }
    
    return defns;
  }
  
  static getConstraints() {
    return this.definition().constraints || {};
  }

  static getOrderBy() {
    return this.definition().orderBy || [];
  }
  
  static getDBschema() {
    return this.definition().dbschema || '';
  }
  
  static testSchemaValue(pgschema) {
    // compare the home schema in defn vs what was provided
    // check to make sure not using incorrect schema
    var dbSchema = this.getDBschema();
    
    if (dbSchema == 'all') return false;
    
    if (!pgschema) return `No pgschema for ${this.name}`;
    if (!dbSchema) return `Invalid dbschema in ${this.name}`;
    if (dbSchema == 'public' && pgschema != 'public') return `Mismatched pgschema in ${this.name} [${dbSchema} vs ${pgschema}]`;
    if (dbSchema == 'tenant' && pgschema == 'public') return `Mismatched pgschema in ${this.name} [${dbSchema} vs ${pgschema}]`;
    
    return false;
  }
  
  static makePrimaryKey(pks) {
    // object of pk values
    var pkCols = this.getConstraints().pk;
    var rec = {};
    
    if (!Array.isArray(pks)) pks = [pks];

    pkCols.forEach(function(col, idx) {
      rec[col] = pks[idx] || null;
    })
    
    return rec;
  }
  
  static makeFkeyName(tbl, fkey) {
    // used in reating table constraints
    return `${tbl}_${fkey}_fkey`; 
  }
  
  static makeOrderBy() {
    // default order by from schema
    var orderBy = this.getOrderBy();
    var table = this.getTableName({});
    var ret = [];
    
    orderBy.forEach(function(col) {
      ret.push((col.substr(0,1) == '-') ? `${table}."${col.substr(1)}" DESC` : `${table}."${col}" ASC`);
    })
    
    return (ret.length > 0) ? `ORDER BY ${ret.join(',')}` : '';
  }

  static makeInsertValues(obj) {
    // return cols, params, values
    var cols = [], params = [], values = [];

    Object.keys(obj).forEach(function(col, idx) {
      if (obj[col] !== undefined) {
        cols.push(`"${col}"`);    // column name
        params.push(`$${idx+1}`); // $x
        values.push(obj[col]);    // value
      }
    });

    return [cols, params, values];
  }
  
  static makeUpdateValues(obj) {
    // returns set, where, values
    var set = [], where = [], values = [];
    const pks = this.getConstraints().pk;
    
    Object.keys(obj).forEach(function(col, idx) {
      if (obj[col] !== undefined) {
        if (pks.indexOf(col) == -1) {
          // non pk cols
          set.push(`"${col}"=$${idx+1}`);
        } 
        else {
          // pk cols
          where.push(`"${col}"=$${idx+1}`);
        }

        values.push(obj[col]);
      }
    });

    return [set, where, values];
  }

  static makeSelectValues(obj) {
    // returns where, values
    var where = [], values = [];
    
    Object.keys(obj).forEach(function(col, idx) {
      if (obj[col] !== undefined) {
        where.push(`"${col}"=$${idx+1}`);
        values.push(obj[col]);
      }
    });

    return [where, values];
  }

  static construct(rows) {
    // NOT USED
    // make multiple records from an array of 0+ rows
    var mrows = [];

    rows.forEach(function(row) {
      mrows.push(new this(row, {overRideColumns: true}));
    }, this)
    
    return mrows;
  }
}

module.exports = ModelBase;
