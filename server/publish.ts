import {Meteor} from 'meteor/meteor';
import {Counts} from 'meteor/tmeasday:publish-counts';

import {FileRegistry} from 'meteor/hive:file-registry';

import _ from 'underscore';

import {Tickets, Queues, TicketFlags, Changelog, Tags, Statuses, QueueBadgeCounts} from '/lib/collections';
import {Filter} from '/imports/util/filter';

Meteor.publishComposite('tickets', function(filter, offset, limit) {
  var facets, mongoFilter, ref, ticketSet;
  if (offset < 0) {
    offset = 0;
  }
  if (Filter.verifyFilterObject(filter, _.pluck(Queues.find({
    memberIds: this.userId
  }).fetch(), 'name'), this.userId)) {
    mongoFilter = Filter.toMongoSelector(filter);
    ref = Tickets.findWithFacets(mongoFilter, {
      sort: {
        submittedTimestamp: -1
      },
      limit: limit,
      skip: offset
    }), ticketSet = ref[0], facets = ref[1];
    ticketSet = _.pluck(ticketSet.fetch(), '_id');
  } else {
    ticketSet = [];
  }
  return {
    find: function() {
      Counts.publish(this, 'ticketCount', Tickets.find(mongoFilter), {
        noReady: true
      });
      return Tickets.find({
        _id: {
          $in: ticketSet
        }
      }, {
        sort: {
          submittedTimestamp: -1
        },
        fields: {
          emailMessageIDs: 0,
          additionalText: 0
        }
      });
    },
    children: [
      {
        find: function(ticket) {
          filter = {
            ticketId: ticket._id,
            type: "note"
          };
          if (Queues.findOne({
            name: ticket.queueName,
            memberIds: this.userId
          }) == null) {
            _.extend(filter, {
              internal: {
                $ne: true
              }
            });
          }
          Counts.publish(this, ticket._id + "-noteCount", Changelog.find(filter));
          return TicketFlags.find({
            ticketId: ticket._id,
            userId: this.userId
          });
        }
      }, {
        find: function() {
          return facets;
        }
      }
    ]
  };
});

Meteor.publishComposite('newTickets', function(filter, time) {
  var mongoFilter;
  if (Filter.verifyFilterObject(filter, _.pluck(Queues.find({
    memberIds: this.userId
  }).fetch(), 'name'), this.userId)) {
    mongoFilter = Filter.toMongoSelector(filter);
    _.extend(mongoFilter, {
      submittedTimestamp: {
        $gt: time
      }
    });
  }
  return {
    find: function() {
      return Tickets.find(mongoFilter, {
        sort: {
          submittedTimestamp: -1
        },
        fields: {
          emailMessageIDs: 0,
          additionalText: 0
        }
      });
    },
    children: [
      {
        find: function(ticket) {
          Counts.publish(this, ticket._id + "-noteCount", Changelog.find({
            ticketId: ticket._id,
            type: "note"
          }));
          return TicketFlags.find({
            ticketId: ticket._id,
            userId: this.userId
          });
        }
      }
    ]
  };
});

Meteor.publishComposite('ticketSet', function(ticketSet) {
  return {
    find: function() {
      var queues;
      if (!ticketSet) {
        return;
      }
      queues = _.pluck(Queues.find({
        memberIds: this.userId
      }).fetch(), 'name');
      return Tickets.find({
        _id: {
          $in: ticketSet
        },
        $or: [
          {
            associatedUserIds: this.userId
          }, {
            authorId: this.userId
          }, {
            queueName: {
              $in: queues
            }
          }
        ]
      }, {
        sort: {
          submittedTimestamp: -1
        }
      });
    },
    children: [
      {
        find: function(ticket) {
          Counts.publish(this, ticket._id + "-noteCount", Changelog.find({
            ticketId: ticket._id,
            type: "note"
          }));
          return TicketFlags.find({
            ticketId: ticket._id,
            userId: this.userId
          });
        }
      }
    ]
  };
});

Meteor.publishComposite('ticket', function(ticketNumber) {
  return {
    find: function() {
      var queues, username;
      username = Meteor.users.findOne(this.userId).username;
      queues = _.pluck(Queues.find({
        memberIds: this.userId
      }).fetch(), 'name');
      return Tickets.find({
        ticketNumber: ticketNumber,
        $or: [
          {
            associatedUserIds: this.userId
          }, {
            authorId: this.userId
          }, {
            authorName: username
          }, {
            queueName: {
              $in: queues
            }
          }
        ]
      });
    },
    children: [
      {
        find: function(ticket) {
          var filter;
          filter = {
            ticketId: ticket._id
          };
          if (Queues.findOne({
            name: ticket.queueName,
            memberIds: this.userId
          }) == null) {
            _.extend(filter, {
              internal: {
                $ne: true
              }
            });
          }
          return Changelog.find(filter);
        }
      }, {
        find: function(ticket) {
          return TicketFlags.find({
            ticketId: ticket._id,
            userId: this.userId
          });
        }
      }, {
        find: function(ticket) {
          var ref;
          if (((ref = ticket.attachmentIds) != null ? ref.length : void 0) > 0) {
            return FileRegistry.find({
              _id: {
                $in: ticket.attachmentIds
              }
            });
          }
        }
      }
    ]
  };
});

Meteor.publish('userData', function() {
  return Meteor.users.find({
    _id: this.userId
  });
});

Meteor.publish('allUserData', function() {
  if (this.userId) {
    return Meteor.users.find({}, {
      fields: {
        '_id': 1,
        'username': 1,
        'mail': 1,
        'displayName': 1,
        'department': 1,
        'physicalDeliveryOfficeName': 1,
        'status.online': 1,
        'status.idle': 1
      }
    });
  }
});

Meteor.publish('queueNames', function() {
  if (this.userId) {
    return Queues.find({}, {
      fields: {
        'name': 1,
        'memberIds': 1,
        'stats': 1
      }
    });
  }
});

Meteor.publish('tags', function() {
  if (this.userId) {
    return Tags.find({}, {
      fields: {
        'name': 1
      },
      sort: {
        lastUse: -1
      },
      limit: 100
    });
  }
});

Meteor.publish('statuses', function() {
  if (this.userId) {
    return Statuses.find({}, {
      fields: {
        'name': 1
      },
      sort: {
        lastUse: -1
      },
      limit: 100
    });
  }
});

Meteor.publish('queueCounts', function() {
  return QueueBadgeCounts.find({
    userId: this.userId
  });
});

Meteor.publish('unattachedFiles', function(fileIds) {
  if (!Tickets.findOne({
    attachmentIds: {
      $in: fileIds
    }
  })) {
    return FileRegistry.find({
      _id: {
        $in: fileIds
      }
    });
  }
});

Meteor.publish('file', function(fileId) {
  var queues, username;
  queues = _.pluck(Queues.find({
    memberIds: this.userId
  }).fetch(), 'name');
  username = Meteor.users.findOne(this.userId).username;
  if (Tickets.findOne({
    attachmentIds: fileId,
    $or: [
      {
        associatedUserIds: this.userId
      }, {
        authorId: this.userId
      }, {
        authorName: username
      }, {
        queueName: {
          $in: queues
        }
      }
    ]
  })) {
    return FileRegistry.find({
      _id: fileId
    });
  }
});
