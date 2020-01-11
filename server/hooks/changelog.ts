import { Meteor } from 'meteor/meteor';
import { Job } from 'meteor/differential:workers';
import _ from 'underscore';

import { Changelog, Tickets, TicketFlags, Queues } from "/lib/collections";
import { Parsers } from '/imports/util/parsers';

import { escapeString } from '/imports/util/escapeString';

if (require('cluster').isMaster) {
  Changelog.before.insert(function(userId, doc) {
    if (doc.type === "note") {
      return doc.timestamp = new Date();
    }
  });
  Changelog.after.insert(function(userId, doc) {
    var authorName;
    if (doc.type === "note") {
      authorName = doc.authorName || doc.authorEmail;
      Job.push(new TextAggregateJob({
        ticketId: doc.ticketId,
        text: [doc.message, authorName]
      }));
      return sendNotificationForNote(userId, doc);
    }
  });
  Changelog.after.insert(function(userId, doc) {
    var ticket;
    ticket = Tickets.findOne(doc.ticketId);
    if ((ticket != null ? ticket.authorId : void 0) !== userId) {
      TicketFlags.upsert({
        userId: ticket.authorId,
        ticketId: doc.ticketId,
        k: 'unread'
      }, {
        $set: {
          v: true
        }
      });
    }
    return _.each(ticket != null ? ticket.associatedUserIds : void 0, function(u) {
      if (u !== userId) {
        return TicketFlags.upsert({
          userId: u,
          ticketId: doc.ticketId,
          k: 'unread'
        }, {
          $set: {
            v: true
          }
        });
      }
    });
  });
  Changelog.after.insert(function(userId, doc) {
    return Tickets.update(doc.ticketId, {
      $set: {
        lastUpdated: new Date()
      }
    });
  });
}

function sendNotificationForNote(userId, doc) {
  var associated, body, emailBody, k, note, noteAuthor, noteAuthorName, recipients, ref, ref1, ref2, subject, ticket, ticketAuthor, title, v;
  ticket = Tickets.findOne(doc.ticketId);
  ticketAuthor = Meteor.users.findOne(ticket.authorId);
  noteAuthor = Meteor.users.findOne(userId) || Meteor.users.findOne(doc.authorId);
  noteAuthorName = doc.authorName || doc.authorEmail || noteAuthor.username;
  title = escapeString(ticket.title);
  body = Parsers.prepareContentForEmail(ticket.body);
  note = Parsers.prepareContentForEmail(doc.message);
  recipients = [];
  subject = "Note added to Triage ticket #" + ticket.ticketNumber + ": " + title;
  emailBody = "<strong>" + noteAuthorName + " added a note to ticket #" + ticket.ticketNumber + ":</strong><br> " + note + "<br><br>";
  emailBody += "<strong>" + ticket.authorName + "'s original ticket body was</strong>:<br>" + ticket.body;
  if (ticket.formFields) {
    emailBody += "<br><strong>Additional details:</strong> <table border=1>";
    ref = ticket.formFields;
    for (k in ref) {
      v = ref[k];
      emailBody += "<tr> <td><strong>" + k + "</strong></td> <td>" + v + "</td> </tr>";
    }
    emailBody += "</table>";
  }
  if (!doc.internal || Queues.findOne({
    name: ticket.queueName,
    memberIds: ticket.authorId
  })) {
    if (((noteAuthor != null ? noteAuthor._id : void 0) === (ticketAuthor != null ? ticketAuthor._id : void 0)) && (ticketAuthor != null ? (ref1 = ticketAuthor.notificationSettings) != null ? ref1.authorSelfNote : void 0 : void 0)) {
      recipients.push(ticketAuthor.mail);
    } else if (((noteAuthor != null ? noteAuthor._id : void 0) !== (ticketAuthor != null ? ticketAuthor._id : void 0)) && (ticketAuthor != null ? (ref2 = ticketAuthor.notificationSettings) != null ? ref2.authorOtherNote : void 0 : void 0)) {
      recipients.push(ticketAuthor.mail);
    }
  }
  associated = ticket.associatedUserIds;
  if (doc.internal) {
    associated = _.filter(associated, function(u) {
      return Queues.findOne({
        name: ticket.queueName,
        memberIds: u
      }) != null;
    });
  }
  _.each(associated, function(id) {
    var ref3, ref4, u;
    u = Meteor.users.findOne(id);
    if ((u._id === (noteAuthor != null ? noteAuthor._id : void 0)) && ((ref3 = u.notificationSettings) != null ? ref3.associatedSelfNote : void 0)) {
      return recipients.push(u.mail);
    } else if ((u._id !== (noteAuthor != null ? noteAuthor._id : void 0)) && ((ref4 = u.notificationSettings) != null ? ref4.associatedOtherNote : void 0)) {
      return recipients.push(u.mail);
    }
  });
  if (recipients.length > 0) {
    return Job.push(new NotificationJob({
      bcc: _.uniq(recipients),
      ticketId: ticket._id,
      subject: subject,
      html: emailBody
    }));
  }
};
