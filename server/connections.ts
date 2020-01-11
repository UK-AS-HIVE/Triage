import {Meteor} from 'meteor/meteor';

var connectionCount, logConnectionCount;

if (require('cluster').isMaster) {
  let connectionCount = 0;
  const logConnectionCount = function() {
    return console.log('Current connections: ', connectionCount);
  };
  Meteor.setInterval(logConnectionCount, 1000 * 60 * 5);
  Meteor.onConnection(function(connection) {
    var address;
    connectionCount++;
    address = connection.httpHeaders['x-forwarded-for'] || connection.clientAddress;
    console.log('New connection from ', address);
    logConnectionCount();
    return connection.onClose(function() {
      connectionCount--;
      console.log('Closed connection from ', address);
      return logConnectionCount();
    });
  });
}

