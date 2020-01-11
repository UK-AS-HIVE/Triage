import { Meteor } from 'meteor/meteor';
import {SyncedCron} from 'meteor/percolate:synced-cron';
import _ from 'underscore';

import { Tickets, Queues, QueueBadgeCounts } from '/lib/collections';

function updateQueueStatistics(queueName : string) {
  var month, monthAgo, now, week, weekStart, weeklyLeader;
  console.log("updating statistics for queue " + queueName);
  now = new Date();
  weekStart = new Date();
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0);
  weekStart.setMinutes(0);
  weekStart.setSeconds(0);
  weekStart.setMilliseconds(0);
  monthAgo = new Date();
  monthAgo.setDate(now.getDate() - now.getDay() - 28);
  monthAgo.setHours(0);
  monthAgo.setMinutes(0);
  monthAgo.setSeconds(0);
  monthAgo.setMilliseconds(0);
  month = _.extend({
    numSubmitted: 0,
    avgTimeToClose: 0
  }, Tickets.aggregate([
    {
      $match: {
        queueName: queueName,
        submittedTimestamp: {
          $gt: monthAgo,
          $lt: weekStart
        }
      }
    }, {
      $group: {
        _id: "$queueName",
        numSubmitted: {
          $sum: 1
        },
        avgTimeToClose: {
          $avg: "$timeToClose"
        }
      }
    }
  ])[0]);
  week = _.extend({
    numSubmitted: 0,
    avgTimeToClose: 0
  }, Tickets.aggregate([
    {
      $match: {
        queueName: queueName,
        submittedTimestamp: {
          $gt: new Date(weekStart)
        }
      }
    }, {
      $group: {
        _id: "$queueName",
        numSubmitted: {
          $sum: 1
        },
        avgTimeToClose: {
          $avg: "$timeToClose"
        }
      }
    }
  ])[0]);
  weeklyLeader = _.extend({
    _id: '',
    numClosed: 0,
    avgTimeToClose: 0
  }, Tickets.aggregate([
    {
      $match: {
        queueName: queueName,
        status: 'Closed',
        closedTimestamp: {
          $gt: new Date(weekStart)
        }
      }
    }, {
      $group: {
        _id: "$closedByUsername",
        numClosed: {
          $sum: 1
        },
        avgTimeToClose: {
          $avg: "$timeToClose"
        }
      }
    }, {
      $sort: {
        numClosed: -1
      }
    }
  ])[0]);
  weeklyLeader.username = weeklyLeader._id;
  delete weeklyLeader._id;
  return Queues.update({
    name: queueName
  }, {
    $set: {
      stats: {
        week: week,
        month: month,
        weeklyLeader: weeklyLeader
      }
    }
  });
};

SyncedCron.add({
  name: 'Update queue statistics',
  schedule: function(parser) {
    return parser.text('every 15 minutes');
  },
  job: function() {
    return Queues.find().forEach(function(q) {
      return updateQueueStatistics(q.name);
    });
  }
});

function removeInactiveUsersFromQueues() {
  var now;
  now = new Date();
  return Queues.find({}, {
    fields: {
      _id: 1,
      name: 1,
      memberIds: 1
    }
  }).forEach(function(queue) {
    console.log("Removing stale users from " + queue.name + " queue");
    return _.each(queue.memberIds, function(memberId) {
      var elapsed, member, sevenDays;
      member = Meteor.users.findOne(memberId, {
        fields: {
          username: 1,
          status: 1
        }
      });
      if (!member) {
        console.log("Error: " + memberId + " not found in users collection");
        Queues.update(queue._id, {
          $pull: {
            memberIds: memberId
          }
        });
        return QueueBadgeCounts.remove({
          userId: memberId,
          queueName: queue.name
        });
      } else {
        elapsed = now - member.status.lastLogin.date;
        sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (elapsed > sevenDays) {
          Queues.update(queue._id, {
            $pull: {
              memberIds: memberId
            }
          });
          QueueBadgeCounts.remove({
            userId: memberId,
            queueName: queue.name
          });
          return console.log("Removed " + member.username + " from " + queue.name + " after 7 day inactivity");
        }
      }
    });
  });
};

SyncedCron.add({
  name: 'Remove stale users from queue membership',
  schedule: function(parser) {
    return parser.text('at 1:00 am');
  },
  job: function() {
    return removeInactiveUsersFromQueues();
  }
});

SyncedCron.start();

