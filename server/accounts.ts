import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';

import {Queues, QueueBadgeCounts} from '/lib/collections';

Accounts.onLogin(function(info) {
  Meteor.call('refreshUserInformation', info.user.username);
  const usersgs = info.user.memberOf.map(function(x) {
    return x.substr(x.indexOf('CN=') + 3, x.indexOf(',') - 3).toLowerCase();
  });
  return Meteor.settings.queues.forEach(function(queue) {
    var member = false;
    const username = info.user.username;
    if (queue.admins.indexOf(username) >= 0) {
      member = true;
      queue = Queues.findOne({
        name: queue.name
      });
      Queues.update(queue._id, {
        $addToSet: {
          memberIds: info.user._id
        }
      });
    } else {
      queue.securityGroups.forEach(function(sg : string) {
        const sglc = sg.toLowerCase();
        if (usersgs.indexOf(sglc) >= 0) {
          queue = Queues.findOne({
            name: queue.name
          });
          Queues.update(queue._id, {
            $addToSet: {
              memberIds: info.user._id
            }
          });
          return member = true;
        } else if (Queues.findOne({
          name: queue.name,
          memberIds: info.user._id
        }) && !member) {
          queue = Queues.findOne({
            name: queue.name
          });
          return Queues.update(queue._id, {
            $pull: {
              memberIds: info.user._id
            }
          });
        }
      });
    }
    return Queues.find({
      memberIds: info.user._id
    }, {
      fields: {
        'name': 1
      }
    }).forEach(function(q) {
      if (!QueueBadgeCounts.findOne({
        userId: info.user._id,
        queueName: q.name
      })) {
        return QueueBadgeCounts.insert({
          userId: info.user._id,
          queueName: q.name,
          count: 0
        });
      }
    });
  });
});

