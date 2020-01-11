import {Meteor} from 'meteor/meteor';

if (Meteor.isProduction) {
  const originalLog = console.log;
  console.log = function() {
    var args;
    if (arguments[0] === 'LISTENING') {
      return originalLog.apply(this, arguments);
    } else {
      args = [new Date().toLocaleString() + "  "].concat(Array.prototype.slice.call(arguments));
      return originalLog.apply(this, args);
    }
  };
}
