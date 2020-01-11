import {Meteor} from 'meteor/meteor';
import {Email} from 'meteor/email';
import {Job} from 'meteor/differential:workers';

import {Tickets} from '/lib/collections';

var ref, 
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;


var hostUrl = Meteor.absoluteUrl();
var rootUrl = hostUrl.endsWith('/') ? hostUrl.substr(0, hostUrl.length - 1) : hostUrl;

const fromEmail = ((ref = Meteor.settings.email) != null ? ref.fromEmail : void 0) || "triagebot@as.uky.edu";
const fromDomain = fromEmail.split('@').pop();

function makeMessageID(ticketId : string) {
  return '<' + Date.now() + '.' + ticketId + '@' + fromDomain + '>';
};

this.NotificationJob = (function(superClass) {
  extend(NotificationJob, superClass);

  function NotificationJob() {
    return NotificationJob.__super__.constructor.apply(this, arguments);
  }

  NotificationJob.prototype.handleJob = function() {
    return sendNotification(this.params);
  };

  return NotificationJob;

})(Job);

export type NotificationsOptions = {
  ticketId: string;
  html: string;
  to: string;
  bcc: string;
}

export function sendNotification(options : NotificationsOptions) {
  var emailMessageIDs, headers, html, messageID, ref1, ticketNumber;
  ref1 = Tickets.findOne(options.ticketId), ticketNumber = ref1.ticketNumber, emailMessageIDs = ref1.emailMessageIDs;
  html = options.html + ("<br><br><a href='" + rootUrl + "/ticket/" + ticketNumber + "'>View the ticket here.</a>");
  if (options.to || options.bcc.length > 0) {
    messageID = makeMessageID(options.ticketId);
    headers = {
      'Message-ID': messageID,
      'auto-submitted': 'auto-replied',
      'x-auto-response-suppress': 'OOF, AutoReply'
    };
    if (emailMessageIDs != null) {
      headers['References'] = emailMessageIDs.join(' ');
    }
    Tickets.update(options.ticketId, {
      $push: {
        emailMessageIDs: messageID
      }
    });
    return Email.send({
      from: options.fromEmail || fromEmail,
      to: options.toEmail,
      bcc: options.bcc,
      subject: options.subject,
      html: html,
      headers: headers
    });
  }
};
