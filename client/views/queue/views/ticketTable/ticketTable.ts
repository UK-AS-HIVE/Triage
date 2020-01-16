import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Session } from "meteor/session";
import { ReactiveVar } from 'meteor/reactive-var';

import _ from 'underscore';

import { Tickets, Queues } from "/lib/collections";
import { Filter } from "/imports/util/filter";

var ref, ref1, ref2, ref3;

const limit = ((ref = Meteor.settings) != null ? (ref1 = ref["public"]) != null ? ref1.limitDefault : void 0 : void 0) || 20;

const offsetIncrement = ((ref2 = Meteor.settings) != null ? (ref3 = ref2["public"]) != null ? ref3.offsetIncrement : void 0 : void 0) || 20;

Template.ticketTable.onCreated(function() {
  this.ticketOrder = new ReactiveVar([]);

  const updateTicketOrder = => {
    const queueName = Session.get('queueName') || _.pluck(Queues.find().fetch(), 'name')
    const filter = {
      queueName: queueName,
      status: Iron.query.get('status'),
      tag: Iron.query.get('tag'),
      user: Iron.query.get('user'),
      associatedUser: Iron.query.get('associatedUser')
    }
    const mongoFilter = Filter.toMongoSelector(filter);
    let sort : any = {};
    sort[Session.get('sortBy')] = Session.get('sortDirection');
    this.ticketOrder.set(Tickets.find(mongoFilter, {sort: sort}).map(t => t._id));
  }

  const debouncedUpdateTicketOrder = _.debounce(updateTicketOrder, 0);

  this.observeHandle = Tickets.find({}).observe({
    added: function() { debouncedUpdateTicketOrder(); },
    removed: function() { debouncedUpdateTicketOrder(); }
  });

  this.autorun(updateTicketOrder);
});

Template.ticketTable.onDestroyed(function() {
  this.observeHandle.stop();
});

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
    return Template.instance().ticketOrder.get().map(function (ticketId) {
      return Tickets.findOne(ticketId);
    });
  },
  noTickets: function() {
    return Tickets.find().count() === 0;
  },
  clientCount: function() {
    return Tickets.find().count();
  },
  columns: function() {
    return {
      ticketNumber: '#',
      title: 'Subject',
      requester: 'Requester',
      associatedUserIds: 'Associated',
      status: 'Status',
      lastUpdated: 'Updated',
      submittedTimestamp: 'Submitted'
    }
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

Template.ticketTable_columnHeading.helpers({
  columnWidth: function (column : string) {
    const colWidth = 'col-md-' +
      (column == 'subject') ? 4 :
      (column == 'requester' || column == 'associated') ? 2 : 1;
    const colHiddenXS =
      (column == 'lastUpdated' || column == 'submittedTimestamp') ? 'hidden-xs' : '';
    return `${colWidth} ${colHiddenXS}`;
  },
  sortByIs: function (columnName : string) {
    return columnName == Session.get('sortBy');
  },
  sortDirectionIs: function (sortDir : 1 | -1) {
    return sortDir == Session.get('sortDirection');
  },
  labelFor: function (value : string) {
    const v = Tickets.simpleSchema()._schema[value];
    return v ? v.label : value;
  }
});

Template.ticketTable_columnHeading.events({
  'click .field-table-heading': function (e, tpl) {
    const sortBy = Session.get('sortBy');
    if (sortBy == this.name) {
      const sortDirection = Session.get('sortDirection');
      Session.set('sortDirection', -1*sortDirection);
    } else {
      Session.set('sortBy', this.name);
    }
  }
});
