/*
*/
class UserError extends Error {
  // Generic User Error
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserError);
    }

    this.name = 'User Error';
    this.message = params;
    this.status = 400;
  }
}

class SystemError extends Error {
  // Generic System Error
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SystemError);
    }

    this.name = 'System Error';
    this.message = params;
    this.status = 500;
  }
}

class NunjucksError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NunjucksError);
    }

    this.name = 'NunjucksError';
    this.message = 'Nunjucks Error ' + (params || '');
    this.status = 500;
  }
}

class SQLError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SQLError);
    }

    this.name = 'SQLError';
    this.message = 'SQL Error ' + (params || '');
    this.status = 500;
  }
}

class JSONError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JSONError);
    }

    this.name = 'JSONError';
    this.message = 'JSON Error ' + (params || '');
    this.status = 500;
  }
}

class SQLInsertError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SQLInsertError);
    }

    this.name = 'SQLInsertError';
    this.message = 'Row Not Inserted ' + (params || '');
    this.status = 400;
  }
}

class SQLUpdateError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SQLUpdateError);
    }

    this.name = 'SQLUpdateError';
    this.message = 'Row Not Updated ' + (params || '');
    this.status = 400;
  }
}

class SQLSelectError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SQLSelectError);
    }

    this.name = 'SQLSelectError';
    this.message = 'SQL Select Error ' + (params || '');
    this.status = 400;
  }
}

class SQLDeleteError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SQLDeleteError);
    }

    this.name = 'SQLDeleteError';
    this.message = 'SQL Delete Error ' + (params || '');
    this.status = 400;
  }
}

class SQLSchemaError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SQLSchemaError);
    }

    this.name = 'SQLSchemaError';
    this.message = 'SQL Schema Error ' + (params || '');
    this.status = 400;
  }
}
class InvalidUserError extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidUserError);
    }

    this.name = 'InvalidUserError';
    this.message = 'Invalid User or Password';
    this.status = 400;
  }
}

class Error302 extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Error302);
    }

    this.name = 'Error302';
    this.message = 'Redirect';
    this.status = 302;
  }
}

class Error401 extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Error401);
    }

    this.name = 'Error401';
    this.message = 'Unauthorized';
    this.status = 401;
  }
}

class Error404 extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Error404);
    }

    this.name = 'Error404';
    this.message = 'Resource not Found'
    this.status = 404;
  }
}

class Error413 extends Error {
  constructor(params) {
    super(params);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Error413);
    }

    this.name = 'Error413';
    this.message = 'Request Too Large'
    this.status = 413;
  }
}

module.exports = {
  UserError,
  SystemError,
  NunjucksError,
  JSONError,
  SQLError,
  SQLInsertError,
  SQLUpdateError,
  SQLSelectError,
  SQLDeleteError,
  SQLSchemaError,
  InvalidUserError,
  Error302,
  Error401,
  Error404,
  Error413,  
}