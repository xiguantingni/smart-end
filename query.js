var mysql  = require('mysql');  
 
const config = {
  host     : 'localhost',       
  user     : 'root',              
  password : 'abc123',       
  port: '3306',                   
  database: 'mysql'
}

var query = function(sql, callback, _config={}) {
  var connection = mysql.createConnection({
    ...config,
    ..._config
  });
  connection.connect();
  connection.query(sql, callback);
  connection.end();
}

module.exports = query;
