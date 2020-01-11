import { Meteor } from 'meteor/meteor';
import _ from 'underscore';

import { Tickets, Tags, Statuses, QueueBadgeCounts, TicketFlags, Queues, Changelog } from '/lib/collections';
import { Parsers } from '/imports/util/parsers';
import { escapeString } from '/imports/util/escapeString';

if (require('cluster').isMaster) {
  Tickets.before.insert(function(userId, doc) {
    var author, now, ref, ref1, text;
    now = new Date();
    if ((ref = doc.tags) != null) {
      ref.forEach(function(x) {
        return Tags.upsert({
          name: x
        }, {
          $set: {
            lastUse: now
          }
        });
      });
    }
    Statuses.upsert({
      name: doc.status
    }, {
      $set: {
        lastUse: now
      }
    });
    QueueBadgeCounts.update({
      queueName: doc.queueName,
      userId: {
        $ne: userId
      }
    }, {
      $inc: {
        count: 1
      }
    }, {
      multi: true
    });
    doc = prepareTicket(userId, doc);
    notifyTicketAuthor(userId, doc);
    notifyAssociatedUsers(doc);
    author = Meteor.users.findOne(doc.authorId);
    Job.push(new TextAggregateJob({
      ticketId: doc._id,
      text: [author != null ? author.displayName : void 0, author != null ? author.department : void 0, (ref1 = doc.ticketNumber) != null ? ref1.toString() : void 0]
    }));
    if (doc.attachmentIds) {
      text = [];
      _.each(doc.attachmentIds, function(id) {
        return text.push(FileRegistry.findOne(id).filename);
      });
      return Job.push(new TextAggregateJob({
        ticketId: doc._id,
        text: text
      }));
    }
  });
  Tickets.before.update(function(userId, doc, fieldNames, modifier, options) {
    return _.each(fieldNames, function(fn) {
      var d, id, ref;
      if (fn === 'attachmentIds' && ((ref = modifier.$addToSet) != null ? ref.attachmentIds : void 0)) {
        id = modifier.$addToSet.attachmentIds;
        console.log(FileRegistry.findOne(id).filename);
        Job.push(new TextAggregateJob({
          ticketId: doc._id,
          text: [FileRegistry.findOne(id).filename]
        }));
      }
      if (fn === 'status' && modifier.$set.status === 'Closed') {
        d = new Date();
        Tickets.direct.update(doc._id, {
          $set: {
            timeToClose: (d - doc.submittedTimestamp) / 1000,
            closedTimestamp: d,
            closedByUserId: userId,
            closedByUsername: Meteor.users.findOne(userId).username
          }
        });
      }
      return getEventMessagesFromUpdate(userId, doc, fn, modifier);
    });
  });
  Tickets.after.update(function(userId, doc) {
    return Tickets.direct.update(doc._id, {
      $set: {
        lastUpdated: new Date()
      }
    });
  });
  Tickets.after.update(function(userId, doc, fieldNames, modifier, options) {
    if (doc.authorId !== userId) {
      TicketFlags.upsert({
        userId: doc.authorId,
        ticketId: doc._id,
        k: 'unread'
      }, {
        $set: {
          v: true
        }
      });
    }
    return _.each(doc.associatedUserIds, function(u) {
      if (u !== userId) {
        return TicketFlags.upsert({
          userId: u,
          ticketId: doc._id,
          k: 'unread'
        }, {
          $set: {
            v: true
          }
        });
      }
    });
  });
}

function notifyTicketAuthor (userId, doc) {
  var author, body, message, queue, ref, ref1, ref2, ref3, subject;
  author = Meteor.users.findOne(doc.authorId);
  if (author != null ? (ref = author.notificationSettings) != null ? ref.submitted : void 0 : void 0) {
    body = Parsers.prepareContentForEmail(doc.body);
    subject = "Triage ticket #" + doc.ticketNumber + " submitted: " + doc.title;
    message = "You submitted ticket #" + doc.ticketNumber + " with body:<br>" + body;
    queue = Queues.findOne({
      name: doc.queueName
    });
    if ((((ref1 = doc.submissionData) != null ? ref1.method : void 0) === "Form" && ((ref2 = queue.settings) != null ? ref2.notifyOnAPISubmit : void 0)) || !(((ref3 = doc.submissionData) != null ? ref3.method : void 0) === "Form")) {
      return Job.push(new NotificationJob({
        ticketId: doc._id,
        bcc: author.mail,
        subject: subject,
        html: message
      }));
    }
  }
};

function notifyAssociatedUsers (doc) {
  var body, message, recipients, subject;
  recipients = [];
  _.each(doc.associatedUserIds, function(u) {
    var ref, user;
    user = Meteor.users.findOne(u);
    if ((ref = user.notificationSettings) != null ? ref.associatedWithTicket : void 0) {
      return recipients.push(user.mail);
    }
  });
  if (recipients.length) {
    body = Parsers.prepareContentForEmail(doc.body);
    subject = "You have been associated with Triage ticket #" + doc.ticketNumber + ": " + doc.title;
    message = "You are now associated with ticket #" + doc.ticketNumber + ".<br>";
    message += getTicketInformationForEmail(doc);
    return Job.push(new NotificationJob({
      ticketId: doc._id,
      bcc: recipients,
      subject: subject,
      html: message
    }));
  }
};

function prepareTicket(userId, doc) {
  var d, max, now, ref;
  d = doc;
  if (userId) {
    d.submittedByUserId = userId;
  }
  max = ((ref = Tickets.findOne({}, {
    sort: {
      ticketNumber: -1
    }
  })) != null ? ref.ticketNumber : void 0) || 0;
  d.ticketNumber = max + 1;
  now = new Date();
  d.submittedTimestamp = now;
  d.lastUpdated = now;
  return d;
};

function getEventMessagesFromUpdate (userId, doc, fn, modifier) {
  var associatedUser, associatedUsers, author, body, changelog, emailBody, file, newStatus, newValue, oldStatus, oldValue, otherId, recipients, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, subject, tags, type, user, users;
  user = Meteor.users.findOne(userId);
  author = Meteor.users.findOne(doc.authorId);
  body = Parsers.prepareContentForEmail(doc.body);
  switch (fn) {
    case 'queueName':
      type = "field";
      oldValue = doc.queueName;
      newValue = modifier.$set.queueName;
      break;
    case 'tags':
      type = "field";
      if (((ref = modifier.$addToSet) != null ? ref.tags : void 0) != null) {
        tags = _.difference(modifier.$addToSet.tags.$each || [modifier.$addToSet.tags], doc.tags);
        if (tags.length !== 0) {
          newValue = "" + tags;
          _.each(tags, function(x) {
            return Tags.upsert({
              name: x
            }, {
              $set: {
                lastUse: new Date()
              }
            });
          });
        }
      }
      if (((ref1 = modifier.$pull) != null ? ref1.tags : void 0) != null) {
        oldValue = "" + modifier.$pull.tags;
      }
      break;
    case 'status':
      oldStatus = escapeString(doc.status);
      newStatus = escapeString(modifier.$set.status);
      if (oldStatus !== newStatus) {
        Statuses.upsert({
          name: newStatus
        }, {
          $set: {
            lastUse: new Date()
          }
        });
        type = "field";
        oldValue = oldStatus;
        newValue = newStatus;
        subject = "User " + user.username + " changed status for Triage ticket #" + doc.ticketNumber + ": " + doc.title;
        emailBody = "<strong>User " + user.username + " changed status for ticket #" + doc.ticketNumber + " from " + oldStatus + " to " + newStatus + ".</strong><br>";
        emailBody += getTicketInformationForEmail(doc);
        recipients = [];
        if ((ref2 = author.notificationSettings) != null ? ref2.authorStatusChanged : void 0) {
          recipients.push(author.mail);
        }
        _.each(doc.associatedUserIds, function(a) {
          var aUser, ref3;
          aUser = Meteor.users.findOne(a);
          if ((ref3 = aUser.notificationSettings) != null ? ref3.associatedStatusChanged : void 0) {
            return recipients.push(aUser.mail);
          }
        });
      }
      break;
    case 'associatedUserIds':
      type = "field";
      recipients = [];
      subject = "You have been associated with Triage ticket #" + doc.ticketNumber + ": " + doc.title;
      emailBody = "You are now associated with ticket #" + doc.ticketNumber + ".<br>";
      emailBody += getTicketInformationForEmail(doc);
      if (((ref3 = modifier.$addToSet) != null ? ref3.associatedUserIds : void 0) != null) {
        users = modifier.$addToSet.associatedUserIds.$each || [modifier.$addToSet.associatedUserIds];
        associatedUsers = _.map(_.difference(users, doc.associatedUserIds), function(x) {
          var ref4, u;
          u = Meteor.users.findOne({
            _id: x
          });
          if ((ref4 = u.notificationSettings) != null ? ref4.associatedWithTicket : void 0) {
            recipients.push(u.mail);
          }
          return u.username;
        });
        if (associatedUsers.length !== 0) {
          newValue = "" + associatedUsers;
        }
      } else if (((ref4 = modifier.$pull) != null ? ref4.associatedUserIds : void 0) != null) {
        associatedUser = Meteor.users.findOne({
          _id: modifier.$pull.associatedUserIds
        }).username;
        oldValue = "" + associatedUser;
      }
      break;
    case 'attachmentIds':
      type = "attachment";
      if ((ref5 = modifier.$addToSet) != null ? ref5.attachmentIds : void 0) {
        file = FileRegistry.findOne(modifier.$addToSet.attachmentIds);
        otherId = file._id;
        newValue = file.filename;
        subject = "User " + user.username + " added an attachment to Triage ticket #" + doc.ticketNumber + ": " + doc.title;
        emailBody = "Attachment " + file.filename + " added to ticket " + doc.ticketNumber + ".<br>";
        emailBody += getTicketInformationForEmail(doc);
        recipients = [];
        if ((ref6 = author.notificationSettings) != null ? ref6.authorAttachment : void 0) {
          recipients.push(author.mail);
        }
        _.each(doc.associatedUserIds, function(a) {
          var aUser, ref7;
          aUser = Meteor.users.findOne(a);
          if ((ref7 = aUser.notificationSettings) != null ? ref7.associatedAttachment : void 0) {
            return recipients.push(aUser.mail);
          }
        });
      } else if ((ref7 = modifier.$pull) != null ? ref7.attachmentIds : void 0) {
        file = FileRegistry.findOne(modifier.$pull.attachmentIds);
        otherId = file._id;
        oldValue = file.filename;
        changelog = "removed attached file " + file.filename;
      }
  }
  if (oldValue || newValue) {
    Changelog.direct.insert({
      ticketId: doc._id,
      timestamp: new Date(),
      authorId: user._id,
      authorName: user.username,
      type: type,
      field: fn,
      oldValue: oldValue,
      newValue: newValue,
      otherId: otherId
    });
  }
  if (emailBody && (recipients.length > 0)) {
    return Job.push(new NotificationJob({
      bcc: _.uniq(recipients),
      ticketId: doc._id,
      subject: subject,
      html: emailBody
    }));
  }
};

function getTicketInformationForEmail(ticket) {
  var info, k, ref, v;
  info = "<strong>" + ticket.authorName + "'s original ticket body was</strong>:<br>" + ticket.body;
  if (ticket.formFields) {
    info += "<br><strong>Additional details:</strong> <table border=1>";
    ref = ticket.formFields;
    for (k in ref) {
      v = ref[k];
      info += "<tr> <td><strong>" + k + "</strong></td> <td>" + v + "</td> </tr>";
    }
    info += "</table>";
  }
  return info;
};