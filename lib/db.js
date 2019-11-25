const root = process.cwd();
const {Pool} = require('pg');
const {SQLError} = require(root + '/lib/errors.js');
const {TravelMessage} = require(root + '/lib/messages.js');
const config = require(root + '/config.json').db;
const pool = new Pool(config);

module.exports = {
  exec: function(sql) {
    var tm = new TravelMessage();        
    
    return new Promise(function(resolve) {
      pool.query(sql)
      .then(function(res) {
        tm.data = res.rows;
        tm.type = 'json';
        resolve(tm);
      })
      .catch(function(err) {
        tm.err = new SQLError(err);
        tm.status = tm.err.status;
        resolve(tm);
      })
    })
  },
  
  trans: async function() {
    let client = null;

    try {
      client = await pool.connect();
    } 
    catch (error) {
      return error;
    }

    try {
      await client.query('BEGIN');
      await client.query('UPDATE foo SET bar = 1');
      await client.query('UPDATE bar SET foo = 2');
      await client.query('COMMIT');
    } 
    catch (error) {
      try {
        await client.query('ROLLBACK');
      } 
      catch (rollbackError) {
        return rollbackError;
      }
      
      return error;
    } 
    finally {
      client.release();
    }

    return 'Success!';    
  },
  
  shutdown: function() {
    return pool.end();  
  },
}

/*
async function printFiles () {
  const files = await getFilePaths();

  for (const file of files) {
    const contents = await fs.readFile(file, 'utf8');
    console.log(contents);
  }
}
*/