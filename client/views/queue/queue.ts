import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Blaze } from "meteor/blaze";
import { Session } from "meteor/session";

import _ from 'underscore';

import { Parsers } from "/imports/util/parsers";
import { Filter } from "/imports/util/filter";
import { Queues, Tickets } from "/lib/collections";

var ref, ref1, ref2, ref3;

const limit = ((ref = Meteor.settings) != null ? (ref1 = ref["public"]) != null ? ref1.limitDefault : void 0 : void 0) || 20;

const offsetIncrement = ((ref2 = Meteor.settings) != null ? (ref3 = ref2["public"]) != null ? ref3.offsetIncrement : void 0 : void 0) || 20;

Template.queue.helpers({
  beta: function() {
    return Meteor.settings["public"].beta;
  },
  ready: function() {
    return Session.get('ready');
  },
  connected: function() {
    return Meteor.status().connected;
  },
  members: function() {
    var ref4;
    return (ref4 = Queues.findOne({
      name: Session.get('queueName')
    })) != null ? ref4.memberIds : void 0;
  },
  shouldShowTicketButtons: function() {
    return Queues.findOne({
      memberIds: Meteor.userId()
    }) || !Meteor.settings["public"].ticketSubmissionUrl;
  },
  queueName: function() {
    return Session.get('queueName');
  },
  addingTicket: function() {
    return Session.get('addingTicket');
  },
  pseudoqueue: function() {
    var ref4;
    return (ref4 = Session.get('pseudoQueue')) === 'globalQueue' || ref4 === 'userQueue';
  },
  queues: function() {
    return Queues.find();
  },
  selected: function() {
    if (Session.get('pseudoQueue')) {
      if (this.name === Meteor.user().defaultQueue) {
        return "selected";
      }
    } else {
      if (this.name === Session.get('queueName')) {
        return "selected";
      }
    }
  },
  submissionUrl: function() {
    return Meteor.settings["public"].ticketSubmissionUrl;
  }
});

Template.queue.events({
  'click button[data-action=showNewTicketModal]': function(e, tpl) {
    Blaze.render(Template.newTicketModal, $('body').get(0));
    return $('#newTicketModal').modal('show');
  },
  'click button[data-action=openQuickAdd]': function(e, tpl) {
    return Session.set('addingTicket', !Session.get('addingTicket'));
  },
  'keyup input[name=newTicket]': function(e, tpl) {
    if (e.which === 13) {
      return submitQuickAddTicket(tpl);
    }
  },
  'keyup input[name=newTicketStatus]': function(e, tpl) {
    if (e.which === 13) {
      return submitQuickAddTicket(tpl);
    }
  },
  'click button[name=quickAddTicket]': function(e, tpl) {
    return submitQuickAddTicket(tpl);
  }
});

function submitQuickAddTicket(tpl) {
  var body, queue, ref4, status, tags, users;
  tpl.$('.has-error').removeClass('has-error');
  body = tpl.$('input[name=newTicket]').val();
  if (body === "") {
    tpl.$('input[name=newTicket]').closest('div').addClass('has-error');
  }
  status = tpl.$('input[name=newTicketStatus]').val();
  if (status === "") {
    tpl.$('input[name=newTicketStatus]').closest('div').addClass('has-error');
  }
  queue = ((ref4 = tpl.$('select[name=queue]')) != null ? ref4.val() : void 0) || Session.get('queueName');
  tags = Parsers.getTags(body);
  users = Parsers.getUserIds(body);
  if (tpl.$('.has-error').length === 0) {
    Tickets.insert({
      title: body,
      body: body,
      tags: tags,
      associatedUserIds: users,
      queueName: queue,
      authorId: Meteor.userId(),
      authorName: Meteor.user().username,
      status: status,
      submittedTimestamp: new Date(),
      submissionData: {
        method: "Web"
      }
    });
    return tpl.$('input[name=newTicket]').val('');
  }
};

Template.queue.rendered = function() {
  Session.set('newTicketSet', []);
  this.subscribe('queueNames');
  this.autorun(function() {
    var ticket, ticketParam;
    ticketParam = Iron.query.get('ticket');
    if (ticketParam) {
      Meteor.subscribe('ticket', Number(ticketParam));
      ticket = Tickets.findOne({
        ticketNumber: Number(ticketParam)
      });
    }
    if (ticket && !$('#ticketModal').length) {
      Blaze.renderWithData(Template.ticketModal, {
        ticketId: ticket._id
      }, $('body').get(0));
      return $('#ticketModal').modal('show');
    } else if (!ticket) {
      return $('#ticketModal').modal('hide');
    }
  });
  this.autorun(function() {
    var attachmentParam, file;
    attachmentParam = Iron.query.get('attachmentId');
    if (attachmentParam && !$('#attachmentModal').length) {
      Meteor.subscribe('file', attachmentParam);
      file = FileRegistry.findOne(attachmentParam);
      if (file) {
        Blaze.renderWithData(Template.attachmentModal, {
          attachmentId: attachmentParam
        }, $('body').get(0));
        return $('#attachmentModal').modal('show');
      } else {
        return $('#attachmentModal').modal('hide');
      }
    } else if (!attachmentParam) {
      return $('#attachmentModal').modal('hide');
    }
  });
  this.autorun(function() {
    Session.get('queueName');
    return Session.set('newTicketSet', []);
  });
  this.autorun(function() {
    if (Iron.query.get('search') && Session.get('ready')) {
      return Meteor.setTimeout(function() {
        var ref4;
        $('td').unhighlight();
        return $('td').highlight((ref4 = Iron.query.get('search')) != null ? ref4.split(',') : void 0);
      }, 500);
    }
  });
  return this.autorun(function() {
    var filter, mongoFilter, queueName, renderedTime;
    renderedTime = new Date();
    queueName = Session.get('queueName') || _.pluck(Queues.find().fetch(), 'name');
    filter = {
      queueName: queueName,
      search: Iron.query.get('search'),
      status: Iron.query.get('status'),
      tag: Iron.query.get('tag'),
      user: Iron.query.get('user'),
      associatedUser: Iron.query.get('associatedUser')
    };
    if (Session.get('pseudoQueue') === 'userQueue') {
      filter.userId = Meteor.userId();
    }
    mongoFilter = Filter.toMongoSelector(filter);
    _.extend(mongoFilter, {
      submittedTimestamp: {
        $gt: renderedTime
      }
    });
    Tickets.find(mongoFilter).observe({
      added: function(ticket) {
        var ref4;
        if (Session.get('offset') < 1) {
          return Session.set('newTicketSet', _.uniq((ref4 = Session.get('newTicketSet')) != null ? ref4.concat(ticket._id) : void 0) || [ticket._id]);
        }
      }
    });
    return Meteor.subscribe('ticketSet', Session.get('newTicketSet'));
  });
};