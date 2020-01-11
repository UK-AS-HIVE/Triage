import {Meteor} from 'meteor/meteor';
import _ from 'underscore';

export type FilterSpec = {
  queueName: string | [string],
  search?: string,
  tag?: string | [string],
  status: string,
  user?: string,
  userId?: string
};

export const Filter = {
  toMongoSelector: function(filter : FilterSpec) {
    var mongoFilter, ref, ref1, selfFilter, sorted, status, tags, ticketNumber, userFilter, userIds, users;
    mongoFilter = {};
    if (Array.isArray(filter.queueName)) {
      mongoFilter.queueName = {
        $in: filter.queueName
      };
    } else {
      mongoFilter.queueName = filter.queueName;
    }
    userIds = [];
    if (filter.user != null) {
      userIds = filter.user.split(',').map(function(x) {
        var ref;
        return (ref = Meteor.users.findOne({
          username: x
        })) != null ? ref._id : void 0;
      });
      userFilter = [
        {
          authorName: {
            $in: filter.user.split(',')
          }
        }, {
          associatedUserIds: {
            $in: userIds
          }
        }, {
          authorId: {
            $in: userIds
          }
        }
      ];
    }
    if (filter.userId != null) {
      selfFilter = [
        {
          associatedUserIds: filter.userId
        }, {
          authorId: filter.userId
        }
      ];
    }
    if (Meteor.isServer) {
      if ((ref = filter.search) != null ? ref.trim().length : void 0) {
        if (ticketNumber = parseInt((ref1 = filter.search) != null ? ref1.trim() : void 0)) {
          mongoFilter['$or'] = [
            {
              $text: {
                $search: filter.search
              }
            }, {
              ticketNumber: ticketNumber
            }
          ];
        } else {
          mongoFilter['$text'] = {
            $search: filter.search
          };
        }
      }
    }
    _.each([userFilter, selfFilter], function(x) {
      if ((x != null ? x.length : void 0) > 0) {
        if (!mongoFilter['$and']) {
          mongoFilter['$and'] = [];
        }
        return mongoFilter['$and'].push({
          $or: x
        });
      }
    });
    if (filter.status != null) {
      if (filter.status.charAt(0) === '!') {
        status = filter.status.substr(1);
        mongoFilter.status = {
          $ne: status
        };
      } else {
        mongoFilter.status = filter.status || '';
      }
    }
    if (filter.tag != null) {
      if (filter.tag === "(none)") {
        mongoFilter.tags = {
          $size: 0
        };
      } else {
        tags = filter.tag.split(',');
        sorted = _.sortBy(tags).join(',');
        mongoFilter.tags = {
          $all: tags
        };
      }
    }
    if (filter.associatedUser != null) {
      if (filter.associatedUser === "(none)") {
        mongoFilter.associatedUserIds = {
          $size: 0
        };
      } else {
        users = filter.associatedUser.split(',');
        userIds = _.map(users, function(u) {
          var ref2;
          return (ref2 = Meteor.users.findOne({
            username: u
          })) != null ? ref2._id : void 0;
        });
        mongoFilter.associatedUserIds = {
          $all: userIds
        };
      }
    }
    return mongoFilter;
  },
  verifyFilterObject: function(filter, queues, userId? : string) {
    check(filter, Object);
    if (filter.userId && filter.userId !== userId) {
      console.log("Error verifying filter: userId match error");
      return false;
    }
    if (!filter.queueName) {
      console.log("Error verifying filter: Queue name is required");
      return false;
    }
    if (!filter.userId && Array.isArray(filter.queueName) && _.difference(filter.queueName, queues).length !== 0) {
      console.log("Error verifying filter: User lacks permission to at least one queue. User has access to " + queues + " and requested access to " + filter.queueName + ".");
      return false;
    }
    if (!filter.userId && typeof filter.queueName === "string" && !_.contains(queues, filter.queueName)) {
      console.log("Error verifying filter: User lacks permission to a queue. User has access to " + queues + " and requested access to " + filter.queueName + ".");
      return false;
    }
    return true;
  }
};

