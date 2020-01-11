import {Meteor} from 'meteor/meteor';
import {Tickets} from '/lib/collections';
import _ from 'underscore';

var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

export const TriageEmailFunctions = {
  getTicketId: function(message) {
    var id, r, ref1, ref2, ticketId;
    ticketId = null;
    r = message != null ? (ref1 = message.headers['references']) != null ? ref1.split(/[\s,]+/) : void 0 : void 0;
    _.each(r, function(ref) {
      var id;
      id = ref.split('@').shift().substr(1).split('.').pop();
      if (Tickets.findOne(id)) {
        ticketId = id;
        return console.log("Parsed references, got _id: " + id);
      }
    });
    if (!ticketId) {
      id = message != null ? (ref2 = message.headers['in-reply-to']) != null ? ref2.split('@').shift().substr(1).split('.').pop() : void 0 : void 0;
      if (Tickets.findOne(id)) {
        ticketId = id;
        console.log("Parsed in-reply-to, got _id: " + id);
      }
    }
    return ticketId;
  },

  getDirectlyEmailedQueueId: function(message) {
    var i, j, len, len1, q, queueEmails, ref1, ref2, ref3, toEmail;
    ref1 = Meteor.settings.queues;
    for (i = 0, len = ref1.length; i < len; i++) {
      q = ref1[i];
      queueEmails = _.map(q.emails, function(qe) {
        return qe.toLowerCase();
      });
      ref2 = message.toEmails;
      for (j = 0, len1 = ref2.length; j < len1; j++) {
        toEmail = ref2[j];
        if (ref3 = toEmail.toLowerCase(), indexOf.call(queueEmails, ref3) >= 0) {
          return Queues.findOne({
            name: q.name
          })._id;
        }
      }
    }
    return null;
  }
}
