import { Template } from "meteor/templating";
import { Meteor } from "meteor/meteor";
import { Session } from "meteor/session";

import _ from 'underscore';

import { Queues, QueueBadgeCounts } from "/lib/collections";

Template.queuebar.helpers({
  queue: function() {
    return _.map(Queues.find({
      memberIds: Meteor.userId()
    }).fetch(), function(q) {
      var ref;
      return _.extend(q, {
        count: (ref = QueueBadgeCounts.findOne({
          queueName: q.name,
          userId: Meteor.userId()
        })) != null ? ref.count : void 0
      });
    });
  },
  active: function() {
    if (this.name === Session.get("queueName")) {
      return "active";
    } else {
      return null;
    }
  },
  encodeURIComponent: function(s) {
    return encodeURIComponent(s);
  },
  globalClass: function() {
    if (Session.get('pseudoQueue') === 'globalQueue') {
      return 'active';
    }
  },
  userClass: function() {
    if (Session.get('pseudoQueue') === 'userQueue') {
      return 'active';
    }
  }
});

Template.queuebar.events({
  'click a': function(e, tpl) {
    if ((e.target.name === Session.get('queueName')) && QueueBadgeCounts.findOne({
      queueName: Session.get('queueName')
    }).count > 0) {
      Meteor.call('clearQueueBadge', Session.get('queueName'));
    }
    if (tpl.$('.collapse').hasClass('in') && $(window).width() < 769) {
      return tpl.$('.collapse').collapse('hide');
    }
  }
});

