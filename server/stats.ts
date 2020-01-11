import {Meteor} from 'meteor/meteor';
import { Tickets, Queues } from '/lib/collections';
import _ from 'underscore';

Meteor.methods({
  'getTicketsForStats': function() {
    var queues, t;
    queues = _.pluck(Queues.find({
      memberIds: this.userId
    }).fetch(), 'name');
    console.log('finding tickets for stats');
    t = Tickets.find({
      queueName: {
        $in: queues
      },
      closedTimestamp: {
        $exists: true
      }
    }, {
      fields: {
        _id: 0,
        submittedTimestamp: 1,
        authorId: 1,
        timeToClose: 1,
        closedTimestamp: 1,
        closedByUsername: 1,
        queueName: 1
      }
    }).map(function(t) {
      var ref;
      return _.extend(t, {
        submitterDepartment: ((ref = Meteor.users.findOne(t.authorId)) != null ? ref.department : void 0) || '(unknown)'
      });
    });
    return t;
  }
});