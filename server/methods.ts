import {Meteor} from 'meteor/meteor';

import {LDAP} from 'meteor/hive:accounts-ldap';

import { Tickets, Queues, Changelog } from '/lib/collections';

Meteor.methods({
  checkUsername: function(username) {
    var client, user, userId, userObj;
    user = Meteor.users.findOne({
      username: username.toLowerCase()
    });
    if (user != null) {
      Meteor.call('refreshUserInformation', username.toLowerCase());
      return user._id;
    } else {
      client = LDAP.createClient(Meteor.settings.ldap.serverUrl);
      LDAP.bind(client, Meteor.settings.ldapDummy.username, Meteor.settings.ldapDummy.password);
      userObj = LDAP.search(client, username);
      if (userObj == null) {
        return false;
      } else {
        return userId = Meteor.users.insert(userObj);
      }
    }
  },
  refreshUserInformation: function(username) {
    var client, ref, userObj;
    if ((ref = Meteor.settings.ldap) != null ? ref.debugMode : void 0) {
      return;
    }
    client = LDAP.createClient(Meteor.settings.ldap.serverUrl);
    LDAP.bind(client, Meteor.settings.ldapDummy.username, Meteor.settings.ldapDummy.password);
    userObj = LDAP.search(client, username);
    if (userObj) {
      return Meteor.users.update({
        username: username.toLowerCase()
      }, {
        $set: userObj
      });
    }
  },
  closeSilently: function(ticketId) {
    var d, ref, ticket;
    ticket = Tickets.findOne(ticketId);
    if (Queues.findOne({
      name: ticket.queueName,
      memberIds: this.userId
    })) {
      d = new Date();
      Tickets.direct.update(ticketId, {
        $set: {
          status: 'Closed',
          timeToClose: (d - ticket.submittedTimestamp) / 1000,
          closedTimestamp: d,
          closedByUserId: this.userId,
          closedByUsername: Meteor.users.findOne(this.userId).username
        }
      });
      return Changelog.direct.insert({
        ticketId: ticketId,
        timestamp: new Date(),
        authorId: this.userId,
        authorName: (ref = Meteor.users.findOne(this.userId)) != null ? ref.username : void 0,
        type: 'field',
        field: 'status',
        oldValue: ticket.status,
        newValue: 'Closed'
      });
    }
  }
});
