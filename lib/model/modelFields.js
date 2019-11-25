/*
                 Field
                 -----
CharType        NumType       DateType      Boolean
--------        -------       --------
Char            Integer       Date 
Text            Float         Time 
Password        Decimal       DateTime
                Serial
*/

class Field {
  /*
    fk: {table: x, column: y, onDelete: x, onUpdate: y} 
    verbose: Str 
    default: *
    null: t|f
    notNull: t|f    
  */
  // Passwords maxLength is input maxLength.  128 is passed to build()/alter() to override the maxLength on table
  constructor(defn) {
    this.defn = defn;
  }
  
  _getColumnType() {
    return this.constructor.name;
  }
  
  getVerbose() {
    return this.defn.verbose;  
  }
  
  build() {
    // SQL to build column
    var com = '';
    
    if ('default' in this.defn) com += ` DEFAULT ${this.defn.default}`;
    if ('null' in this.defn && this.defn.null) com += ' NULL';
    if ('notNull' in this.defn && this.defn.notNull) com += ' NOT NULL';

    // is this needed?
    if ('fk' in this.defn) {
      var fk = {};
      
      com += ` references ${fk.table.getTableName()}`;
      if ('column' in fk) com += `(${fk.column})`
      if ('onDelete' in fk) com += ` ON DELETE ${fk.onDelete}`;
      if ('onUpdate' in fk) com += ` ON UPDATE ${fk.onUpdate}`;
    }

    return com;
  }
  
  alterType() {
    // don't want any of the above attributes  
    return '';
  }
  
  verify() {
    // check field defns prior to building sql
    // FK doesn't check for existence of table/col 
    var errs = [];
    var val;
    
    val = this.defn.null;
    if ('null' in this.defn && (val !== true && val !== false)) errs.push('Null must be true or false ' + val);
    
    val = this.defn.notNull;
    if ('notNull' in this.defn && (val !== true && val !== false)) errs.push('notNull must be true or false ' + val);
    
    return errs;
  }
  
  selfTest() {
    return null;  
  }

};

class CharType extends Field {
  // Used for all char type cols
  /*
    maxLength: Num
    choices: [] - no longer
  */  
  constructor(defn) {
    super(defn);
  }
   
  build(oLen) {
    var com = ''; 
    
    if ('maxLength' in this.defn) com += `(${oLen || this.defn.maxLength})`;
    if ('array' in this.defn) com += '[]'.repeat(this.defn.array);
    //if ('choices' in this.defn) com += ` CONSTRAINT CHECK(${name} IN (${this.defn.choices.join(',')}))`;

    com += super.build();
    return com;
  }
   
  alterType(oLen) {
    var com = ''; 
    
    if ('maxLength' in this.defn) com += `(${oLen || this.defn.maxLength})`;
    if ('array' in this.defn) com += '[]'.repeat(this.defn.array);
    //if ('choices' in this.defn) com += ` CONSTRAINT CHECK(${name} IN (${this.defn.choices.join(',')}))`;

    com += super.alterType();
    return com;
  }
  
  verify() {
    var errs = super.verify();
    
    if ('maxLength' in this.defn && isNaN(this.defn.maxLength)) errs.push('Maxlength must be numeric');
    if ('array' in this.defn && isNaN(this.defn.array)) errs.push('Array must be numeric');    
    if ('choices' in this.defn && !Array.isArray(this.defn.choices)) errs.push('Choices must be an array of objects');
    
    return errs;
  }
  
  static selfTest(value) {
    return (typeof value === 'string') ? null : 'Not a string';  
  }  
};

class NumType extends Field {
  // Used for all numeric type cols
  /*
    minVal: Num 
    maxVal: Num
  */  
  constructor(defn) {
    super(defn);
  }
   
  build() {
    var com = ''; 
    
    if ('array' in this.defn) com += '[]'.repeat(this.defn.array);
    
    com += super.build();
    
    return com; 
  }
   
  alterType() {
    var com = ''; 
    
    if ('array' in this.defn) com += '[]'.repeat(this.defn.array);
    
    com += super.alterType();
    
    return com; 
  }
  
  verify() {
    var errs = super.verify();
        
    if ('array' in this.defn && isNaN(this.defn.array)) errs.push('Array must be numeric');    
    if ('default' in this.defn && isNaN(this.defn.default)) errs.push('Default must be numeric');
    if ('minVal' in this.defn && isNaN(this.defn.minVal)) errs.push('Minval must be numeric');
    if ('maxVal' in this.defn && isNaN(this.defn.maxVal)) errs.push('Maxval must be numeric');
    
    return errs;
  }
  
  static selfTest(value) {
    return (value && isNaN(value)) ? 'Not a valid number' : null;
  }
  
};

class DateType extends Field {
  // Used for all date type cols
  /*
    onSave: date 
    onUpdate: date 
  */  
  constructor(defn) {
    super(defn);
  }
   
  build() {
    var com = ''; 
    
    if ('array' in this.defn) com += '[]'.repeat(this.defn.array);
    
    com += super.build();
    
    return com; 
  }
   
  alterType() {
    var com = ''; 
    
    if ('array' in this.defn) com += '[]'.repeat(this.defn.array);
    
    com += super.alterType();
    
    return com; 
  }
  
  verify() {
    var errs = super.verify();
        
    if ('array' in this.defn && isNaN(this.defn.array)) errs.push('Array must be numeric');    
    if ('default' in this.defn && !moment.isMoment(this.defn.default)) errs.push('Default must be a moment object');
    if ('onSave' in this.defn && !moment.isMoment(this.defn.onSave)) errs.push('Onsave must be a moment object');
    if ('onUpdate' in this.defn && !moment.isMoment(this.defn.onUpdate)) errs.push('Onupdate must be a moment object');
    
    return errs;
  }
  
  static selfTest() {
    var dt = moment(value, options); // options is date format

	  return (value && !(dt.isValid())) ? 'Not a valid date' : null;  
	}
};

class Boolean extends Field {
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' BOOLEAN';
    
    if ('array' in this.defn) com += '[]'.repeat(this.defn.array);
    
    col += super.build();
    
    return col;        
  }

  alterType(col) {
    col += ' BOOLEAN';
    
    if ('array' in this.defn) com += '[]'.repeat(this.defn.array);
    
    col += super.alterType();
    
    return col;        
  }
  
  verify() {
    var errs = super.verify();
    
    if ('array' in this.defn && isNaN(this.defn.array)) errs.push('Array must be numeric');    
    if ('default' in this.defn && this.defn.default !== true && this.defn.default !== false) errs.push('Default must be true or false');
        
    return errs;
  }
  
  static selfTest(value) {
    return (value === true || value === false) ? null : 'Invalid Selection';
  }
};

// CHARACTER TYPES
class Char extends CharType {
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' VARCHAR';
    col += super.build();

    return col;
  }
  
  alterType(col) {
    col += ' VARCHAR';
    col += super.alterType();

    return col;
  }
  
  verify() {
    return super.verify();
  }
};

class Text extends CharType {
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' TEXT';
    col += super.build();
    
    return col;    
  }
  
  alterType(col) {
    col += ' TEXT';
    col += super.alterType();
    
    return col;    
  }
  
  verify() {
    return super.verify();
  }
};

class Password extends CharType {
  // same as Char
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' VARCHAR';
    col += super.build(128);

    return col;
  }
  
  alterType(col) {
    col += ' VARCHAR';
    col += super.alterType(128);

    return col;
  }
  
  verify() {
    return super.verify();
  }
  
  static selfTest(value) {
    // min & max are already defined on CharType
    // at least one number, one lower, one upper, one special
    var rc = super.selftest();
    var lower = false, upper = false, numbers = false, special = false, errs = [];
    var isLowerCase = function(str) {
      return str !== str.toUpperCase();
    };
    var isUpperCase = function(str) {
      return str !== str.toLowerCase();
    };
    
    if (!rc) {
      // rc is null == ok
      for (var i=0; i<value.length; i++) {
        if (isLowerCase(value.charAt(i))) lower = true;
        else if (isUpperCase(value.charAt(i))) upper = true;
        else if (!isNaN(value.charAt(i))) numbers = true;
        else special = true;
      }
      
      if (!lower) errs.push('Must have at least one lowercase character');
      if (!upper) errs.push('Must have at least one uppercase character');
      if (!numbers) errs.push('Must have at least one number');
      if (!special) errs.push('Must have at least one special character');
      
      if (errs.length > 0) rc = errs.join(',');        
    }
    
    return rc;
  } 
};

// NUMERIC TYPES
class Integer extends NumType {
  /*
  */  
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' INT';
    col += super.build();
    
    return col;        
  }
  
  alterType(col) {
    col += ' INT';
    col += super.alterType();
    
    return col;        
  }
  
  verify() {
    return super.verify();
  }
};

class Float extends NumType {
  /*
  */  
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' FLOAT';
    col += super.build();
    
    return col;        
  }
  
  alterType(col) {
    col += ' FLOAT';
    col += super.alterType();
    
    return col;        
  }

  verify() {
    return super.verify();
  }
};

class Decimal extends NumType {
  /*
    digits: Num 
    decimals: Num
  */  
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' NUMERIC';
    
    if ('digits' in this.defn) col += `(${this.defn.digits},${this.defn.decimals})`;
    
    col += super.build();
    
    return col;        
  }

  alterType(col) {
    col += ' NUMERIC';
    
    if ('digits' in this.defn) col += `(${this.defn.digits},${this.defn.decimals})`;
    
    col += super.alterType();
    
    return col;        
  }
  
  verify() {
    var errs = super.verify();
    
    if ('digits' in this.defn) {
      if (isNaN(this.defn.digits)) errs.push('Digits must be numeric');
      if (! ('decimals') in this.defn) {
        errs.push('Decimals is mandatory');
      }
      else {
        if (isNaN(this.defn.decimals)) errs.push('Decimals must be numeric');
      }
    }
    
    return errs;
  }
};

class Serial extends NumType {
  /*
    digits: Num 
    decimals: Num
  */  
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' SERIAL';
    col += super.build();
    
    return col;        
  }
  
  alterType(col) {
    col += ' SERIAL';
    col += super.alterType();
    
    return col;        
  }
  
  verify() {
    return super.verify();
  }
};

// DATE/TIME TYPES
class Date extends DateType {
  /*
  */
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' DATE';
    col += super.build();
    
    return col;        
  }
  
  alterType(col) {
    col += ' DATE';
    col += super.alterType();
    
    return col;        
  }
    
  verify() {
    return super.verify();
  }
};

class Time extends DateType {
  /*
  */
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' TIME WITHOUT TIME ZONE';
    col += super.build();
    
    return col;        
  }
  
  alterType(col) {
    col += ' TIME';
    col += super.alterType();
    
    return col;        
  }
  
  verify() {
    return super.verify();
  }
};

class DateTime extends DateType {
  /*
  */
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    col += ' TIMESTAMPTZ';
    col += super.build();
    
    return col;        
  }

  alterType(col) {
    col += ' TIMESTAMPTZ';
    col += super.alterType();
    
    return col;        
  }
  
  verify() {
    return super.verify();
  }
};

class Derived extends Field {
  constructor(defn) {
    super(defn);
  }
  
  build(col) {
    return col;
  }

  alterType(col) {
    return col;        
  }
  
  verify() {
    return super.verify();
  }
  
  selfTest() {
    super.selfTest();   
  }
};

module.exports = {
  Char,
  Text,
  Password,
  Boolean,
  Integer,
  Float,
  Decimal,
  Serial,
  Date,
  Time,
  DateTime,
  Derived
}