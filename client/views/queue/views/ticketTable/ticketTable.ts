import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Session } from "meteor/session";

import _ from 'underscore';

import { Tickets, Queues } from "/lib/collections";
import { Filter } from "/imports/util/filter";

var ref, ref1, ref2, ref3;

const limit = ((ref = Meteor.settings) != null ? (ref1 = ref["public"]) != null ? ref1.limitDefault : void 0 : void 0) || 20;

const offsetIncrement = ((ref2 = Meteor.settings) != null ? (ref3 = ref2["public"]) != null ? ref3.offsetIncrement : void 0 : void 0) || 20;

Template.ticketTable.helpers({
  search: function() {
    return (Iron.query.get('search') != null) || (Iron.query.get('status') != null) || (Iron.query.get('tag') != null) || (Iron.query.get('user') != null);
  },
  ready: function() {
    return Session.get('ready');
  },
  firstVisibleTicket: function() {
    if (Tickets.find().count() === 0) {
      return 0;
    } else {
      return Session.get('offset') + 1;
    }
  },
  lastVisibleTicket: function() {
    if (Session.get('ready')) {
      return Math.min(Session.get('offset') + Tickets.find().count(), Counts.get('ticketCount'));
    } else {
      return Math.min(Session.get('offset') + offsetIncrement, Counts.get('ticketCount'));
    }
  },
  lastDisabled: function() {
    if (Session.get('offset') === 0) {
      return "disabled";
    }
  },
  nextDisabled: function() {
    if ((Session.get('offset') + offsetIncrement + 1) > Counts.get('ticketCount')) {
      return "disabled";
    }
  },
  tickets: function() {
    var filter, mongoFilter, queueName;
    queueName = Session.get('queueName') || _.pluck(Queues.find().fetch(), 'name');
    filter = {
      queueName: queueName,
      status: Iron.query.get('status'),
      tag: Iron.query.get('tag'),
      user: Iron.query.get('user'),
      associatedUser: Iron.query.get('associatedUser')
    };
    mongoFilter = Filter.toMongoSelector(filter);
    return Tickets.find(mongoFilter, {
      sort: {
        submittedTimestamp: -1
      }
    });
  },
  noTickets: function() {
    return Tickets.find().count() === 0;
  },
  clientCount: function() {
    return Tickets.find().count();
  }
});

Template.ticketTable.events({
  'click button[data-action=nextPage]': function(e, tpl) {
    var start;
    start = Number(Iron.query.get('start')) || 0;
    if ((start + offsetIncrement) < Counts.get('ticketCount')) {
      Session.set('newTicketSet', []);
      return Iron.query.set('start', start + offsetIncrement);
    }
  },
  'click button[data-action=lastPage]': function(e, tpl) {
    var start;
    start = Number(Iron.query.get('start')) || 0;
    Iron.query.set('start', Math.max(start - offsetIncrement, 0));
    return Session.set('newTicketSet', []);
  },
  'click a[data-action=clearSearch]': function(e, tpl) {
    e.stopPropagation();
    Iron.query.set('search', '');
    Iron.query.set('tag', '');
    Iron.query.set('status', '');
    Iron.query.set('user', '');
    return Iron.query.set('start', '');
  }
});
