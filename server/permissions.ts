import {Meteor} from 'meteor/meteor';

import _ from 'underscore';

import {Tickets, Changelog, Queues} from '/lib/collections';


var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Tickets.allow({
  insert: function(userId, doc) {
    return Queues.findOne({
      memberIds: userId
    }) != null;
  },
  update: function(userId, doc, fields, modifier) {
    var allowed, closedFor, members, queueMember, ref, ref1, ref2, ref3, ref4, ref5, ref6, userIds;
    if (_.intersection(['_id', 'authorId', 'authorName', 'body', 'submissionData', 'submittedTimestamp', 'ticketNumber', 'title'], fields).length !== 0) {
      return false;
    }
    queueMember = Queues.findOne({
      name: doc.queueName,
      memberIds: userId
    }) != null;
    if (queueMember || (_.contains(doc.associatedUserIds, userId)) || (doc.authorId === userId)) {
      if (indexOf.call(fields, 'associatedUserIds') >= 0 && !((((ref = modifier.$addToSet) != null ? ref.associatedUserIds : void 0) != null) || (((ref1 = modifier.$pull) != null ? ref1.associatedUserIds : void 0) != null))) {
        console.log("User " + userId + " attempting to use a non-standard modifier for associatedUserIds");
        return false;
      }
      if (!queueMember) {
        userIds = ((ref2 = modifier.$addToSet) != null ? (ref3 = ref2.associatedUserIds) != null ? ref3.$each : void 0 : void 0) || [(ref4 = modifier.$addToSet) != null ? ref4.associatedUserIds : void 0];
        members = Queues.findOne({
          name: doc.queueName
        }).memberIds;
        if (_.intersection(userIds, members).length) {
          console.log("Non-queue member " + userId + " can't associate queue member(s) in list " + userIds);
          return false;
        }
      }
      if (doc.status === 'Closed' && indexOf.call(fields, 'status') >= 0) {
        closedFor = (Date.now() - doc.closedTimestamp) / 1000;
        allowed = ((ref5 = Meteor.settings) != null ? (ref6 = ref5["public"]) != null ? ref6.reopenAllowedTimespan : void 0 : void 0) || 604800;
        if (closedFor > allowed) {
          console.log("Denying status change of closed ticket " + doc._id + ", which has been closed for " + closedFor + "s");
          return false;
        }
      }
      return true;
    }
    console.log("Ticket update " + modifier + " on " + fields + " failed: user lacks correct access to update this ticket.");
    return false;
  },
  remove: function() {
    return false;
  }
});

Meteor.users.allow({
  insert: function() {
    return false;
  },
  update: function(userId, doc, fields, modifier) {
    if (doc._id === userId && _.intersection(['_id', 'department', 'displayName', 'employeeNumber', 'givenName', 'memberOf', 'services', 'status', 'title', 'username'], fields).length === 0) {
      return true;
    } else {
      return false;
    }
  },
  remove: function() {
    return false;
  }
});

Changelog.allow({
  insert: function(userId, doc) {
    if (doc.type === "note") {
      return true;
    }
  }
});
