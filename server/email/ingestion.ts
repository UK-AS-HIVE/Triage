import {Meteor} from 'meteor/meteor';
import {Email} from 'meteor/email';

import {Queues, Tickets} from '/lib/collections';

import {TriageEmailFunctions} from './emailFunctions';
import {EmailIngestion} from 'meteor/hive:email-ingestion';

var ref, ref1;

if (((ref = Meteor.settings) != null ? (ref1 = ref.email) != null ? ref1.smtpPipe : void 0 : void 0) != null) {
  EmailIngestion.monitorNamedPipe(Meteor.settings.email.smtpPipe, function(message) {
    var allowed, closedFor, html, queue, queueId, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, ticket, ticketId, ticketLink, user;
    console.log('incoming email via SMTP', message);
    if (_.contains((ref2 = Meteor.settings) != null ? (ref3 = ref2.email) != null ? ref3.blacklist : void 0 : void 0, message != null ? message.fromEmail : void 0)) {
      console.log("Message is from blacklisted address: " + message.fromEmail + ", ignoring");
      return;
    }
    if (queueId = TriageEmailFunctions.getDirectlyEmailedQueueId(message)) {
      queue = Queues.findOne(queueId);
      user = Meteor.users.findOne({
        $or: [
          {
            mail: message.fromEmail
          }, {
            emails: message.fromEmail
          }
        ]
      });
      if (!user) {
        console.log("couldn't find user corresponding to <" + message.fromEmail + ">, reporting error to user");
        Email.send({
          from: ((ref4 = Meteor.settings.email) != null ? ref4.fromEmail : void 0) || "triagebot@triage.as.uky.edu",
          to: message.fromEmail,
          subject: "There was a problem ingesting your ticket.",
          html: "Sorry - we were not able to identify a user from this email address.  Please make sure you have logged into " + Meteor.absoluteUrl() + " before trying to email tickets directly to this address."
        });
        return;
      }
      ticket = {
        title: message.subject,
        body: EmailIngestion.extractReplyFromBody(message.body),
        authorId: user._id,
        authorName: user.username,
        submissionData: {
          method: 'Email'
        },
        submittedTimestamp: Date.now(),
        queueName: queue.name,
        attachmentIds: message.attachments
      };
      if (ticket.body !== message.body) {
        ticket.formFields = {
          'Full Message': message.body
        };
      }
      return Tickets.insert(ticket);
    } else if (((ref5 = message.headers['auto-submitted']) != null ? ref5.match(/(auto-)\w+/g) : void 0) || message.headers['x-auto-response-suppress'] === 'All') {
      return console.log('auto-generated message, ignoring');
    } else {
      if (ticketId = TriageEmailFunctions.getTicketId(message)) {
        user = Meteor.users.findOne({
          $or: [
            {
              mail: message.fromEmail
            }, {
              emails: message.fromEmail
            }
          ]
        });
        if ((ticket = Tickets.findOne(ticketId)) && ((ticket != null ? ticket.status : void 0) === 'Closed')) {
          closedFor = (Date.now() - ticket.closedTimestamp) / 1000;
          allowed = ((ref6 = Meteor.settings) != null ? (ref7 = ref6["public"]) != null ? ref7.reopenAllowedTimespan : void 0 : void 0) || 604800;
          html = "The ticket you are replying to is marked Closed, and your response may be overlooked.  Please make sure to follow up through other means";
          if (closedFor > allowed) {
            html += ", or submit a new ticket.";
          } else {
            ticketLink = Meteor.absoluteUrl("ticket/" + ticket.ticketNumber);
            html += ", or login and re-open this ticket by visiting <a href='" + ticketLink + "'>" + ticketLink + "</a>.";
          }
          Email.send({
            from: ((ref8 = Meteor.settings.email) != null ? ref8.fromEmail : void 0) || "triagebot@triage.as.uky.edu",
            to: message.fromEmail,
            subject: "Auto-response: Ticket #" + ticket.ticketNumber + " is Closed",
            html: html
          });
        }
        Changelog.insert({
          ticketId: ticketId,
          timestamp: new Date(),
          authorId: user != null ? user._id : void 0,
          authorName: user != null ? user.username : void 0,
          authorEmail: message.fromEmail,
          type: "note",
          message: EmailIngestion.extractReplyFromBody(message.body)
        });
        _.each(message.attachments, function(a) {
          var file;
          console.log("message has attachment with id " + a);
          file = FileRegistry.findOne(a);
          Tickets.direct.update(ticketId, {
            $addToSet: {
              attachmentIds: file._id
            }
          });
          Changelog.direct.insert({
            ticketId: ticketId,
            timestamp: new Date(),
            authorId: user != null ? user._id : void 0,
            authorName: user != null ? user.username : void 0,
            authorEmail: message.fromEmail,
            type: "attachment",
            otherId: file._id,
            newValue: file.filename
          });
          return Job.push(new TextAggregateJob({
            ticketId: ticketId,
            text: [file.filename]
          }));
        });
        if (user) {
          return Meteor.call('setFlag', user._id, ticketId, 'replied', true);
        }
      } else {
        console.log("couldn't find ticket to attach response to, reporting error to user");
        return Email.send({
          from: ((ref9 = Meteor.settings.email) != null ? ref9.fromEmail : void 0) || "triagebot@triage.as.uky.edu",
          to: message.fromEmail,
          subject: "There was a problem ingesting your response.",
          html: "Sorry - we had a problem finding the correct ticket to attach your reply to. Please visit the link provided in the original email and post your response manually."
        });
      }
    }
  });
}
