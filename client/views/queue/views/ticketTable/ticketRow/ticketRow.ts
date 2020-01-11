import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";

import _ from 'underscore';

import { Tickets, Queues, Changelog, TicketFlags, Statuses } from "/lib/collections";

Template.ticketRow.events({
  'click .ticket-row': function(e) {
    if (!_.contains($(e.target)[0].classList, 'dropdown-toggle')) {
      return Iron.query.set('ticket', this.ticketNumber);
    }
  },
  'click .dropdown-menu[name=statusMenu]': function(e, tpl) {
    return e.stopPropagation();
  },
  'click .dropdown-menu[name=statusMenu] a': function(e, tpl) {
    if (this.status !== $(e.target).html()) {
      Tickets.update(this._id, {
        $set: {
          status: $(e.target).html()
        }
      });
    }
    return tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle');
  },
  'autocompleteselect input[name=customStatus]': function(e, tpl, doc) {
    Tickets.update(tpl.data._id, {
      $set: {
        status: doc.name
      }
    });
    $(e.target).val("");
    return tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle');
  },
  'keyup input[name=customStatus]': function(e, tpl) {
    if (e.which === 13) {
      Tickets.update(tpl.data._id, {
        $set: {
          status: $(e.target).val()
        }
      });
      $(e.target).val("");
      return tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle');
    }
  }
});

Template.ticketRow.rendered = function() {
  return $('form[name=ticketForm]').submit(function(e) {
    return e.preventDefault();
  });
};

Template.ticketRow.helpers({
  queueMember: function() {
    return _.contains(Queues.findOne({
      name: this.queueName
    }).memberIds, Meteor.userId());
  },
  changelog: function() {
    return Changelog.find({
      ticketId: this._id
    }, {
      sort: {
        timestamp: 1
      }
    });
  },
  unread: function() {
    var ref;
    return (ref = TicketFlags.findOne({
      userId: Meteor.userId(),
      ticketId: this._id,
      k: 'unread'
    })) != null ? ref.v : void 0;
  },
  repliedTo: function() {
    return TicketFlags.findOne({
      userId: Meteor.userId(),
      ticketId: this._id,
      k: 'replied'
    });
  },
  hasBeenUpdated: function() {
    var ref, ref1;
    return ((ref = this.lastUpdated) != null ? ref.getTime() : void 0) !== ((ref1 = this.submittedTimestamp) != null ? ref1.getTime() : void 0);
  },
  hasAttachment: function() {
    var ref;
    return ((ref = this.attachmentIds) != null ? ref.length : void 0) > 0;
  },
  noteCount: function() {
    return Counts.get(this._id + "-noteCount") || null;
  },
  author: function() {
    return Meteor.users.findOne({
      _id: this.authorId
    });
  },
  printableFormFields: function() {
    var fields;
    fields = _.map(this.formFields, function(v, k) {
      return {
        k: k,
        v: v
      };
    });
    return _.filter(fields, function(f) {
      return !!f.v;
    });
  },
  statusSettings: function() {
    return {
      position: "bottom",
      limit: 5,
      rules: [
        {
          collection: Statuses,
          field: 'name',
          template: Template.statusPill,
          noMatchTemplate: Template.noMatchStatusPill
        }
      ]
    };
  }
});

