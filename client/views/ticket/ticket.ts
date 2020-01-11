import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Blaze } from "meteor/blaze";
import { Session } from "meteor/session";

import { FileRegistry } from "meteor/hive:file-registry";

import { Tickets } from "/lib/collections";

Template.ticket.helpers({
  ticket: function() {
    var ticket;
    ticket = Tickets.findOne({
      ticketNumber: Session.get('ticketNumber')
    });
    Session.set('queueName', ticket != null ? ticket.queueName : void 0);
    return ticket;
  },
  bodyParagraph: function() {
    return this.body.split('\n');
  }
});

Template.ticket.rendered = function() {
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
    }
  });
  if (Tickets.findOne()) {
    return Meteor.call('removeFlag', Meteor.userId(), Tickets.findOne()._id, 'unread');
  }
};

