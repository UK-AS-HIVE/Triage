import {Meteor} from 'meteor/meteor';
import {Session} from 'meteor/session';
import {Router} from 'meteor/iron:router';

import {FileRegistry} from 'meteor/hive:file-registry';

import _ from 'underscore';

import { Queues } from './collections';

var ref, ref1,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

const limit = ((ref = Meteor.settings["public"]) != null ? ref.pageLimit : void 0) || 20;

const offset = ((ref1 = Meteor.settings["public"]) != null ? ref1.offset : void 0) || 20;

Router.configure({
  layoutTemplate: 'layout',
  loadingTemplate: 'loading',
  onBeforeAction: function() {
    if (Meteor.isClient && !Meteor.userId()) {
      return this.render('login');
    } else {
      return this.next();
    }
  }
});

function queueBeforeAction (router, options) {
  var filter, queueName, renderedTime;
  if (options != null ? options.pseudoQueue : void 0) {
    check(options.pseudoQueue, String);
  }
  if (options != null ? options.clearQueueBadge : void 0) {
    check(options.clearQueueBadge, Boolean);
  }
  if (options != null ? options.filterByUserId : void 0) {
    check(options.filterByUserId, Boolean);
  }
  Session.set('queueName', (options != null ? options.pseudoQueue : void 0) ? null : options != null ? options.queueName : void 0);
  Session.set('pseudoQueue', (options != null ? options.pseudoQueue : void 0) || null);
  Session.set('offset', Number(Iron.query.get('start')) || 0);
  queueName = options != null ? options.queueName : void 0;
  Session.setDefault('sortBy', 'submittedTimestamp');
  Session.setDefault('sortDirection', -1);
  router.next();
  if (Meteor.userId()) {
    filter = {
      queueName: queueName,
      search: router.params.query.search,
      status: router.params.query.status || '!Closed',
      tag: router.params.query.tag,
      user: router.params.query.user,
      associatedUser: router.params.query.associatedUser
    };
    if (options != null ? options.filterByUserId : void 0) {
      filter.userId = Meteor.userId();
    }
    if (Session.get('offset') < 1) {
      renderedTime = new Date();
      Meteor.subscribe('newTickets', filter, renderedTime);
    }
    Meteor.subscribe('tickets', filter, Session.get('sortBy'), Session.get('sortDirection'), Session.get('offset'), limit, {
      onReady: function() {
        if (options != null ? options.clearQueueBadge : void 0) {
          Meteor.call('clearQueueBadge', queueName);
        }
        return Session.set('ready', true);
      },
      onStop: function() {
        return Session.set('ready', false);
      }
    });
    return setTimeout(function() {
      return Session.set('ready', true);
    }, 2000);
  }
};

Router.map(function() {
  this.route('stats', {
    path: '/stats',
    template: 'ticketStats'
  });
  this.route('default', {
    path: '/',
    waitOn: function() {
      return Meteor.subscribe('userData');
    },
    action: function() {
      var queue, ref2, ref3;
      queue = ((ref2 = Meteor.user()) != null ? ref2.defaultQueue : void 0) || ((ref3 = Queues.findOne({
        memberIds: Meteor.userId()
      })) != null ? ref3.name : void 0);
      if (queue) {
        return this.redirect('/queue/' + encodeURIComponent(queue));
      } else {
        return this.redirect('/my/tickets');
      }
    }
  });
  this.route('queue', {
    path: '/queue/:queueName',
    onBeforeAction: function() {
      return queueBeforeAction(this, {
        queueName: this.params.queueName,
        pseudoQueue: null,
        clearQueueBadge: true,
        filterByUserId: false
      });
    }
  });
  this.route('userQueue', {
    path: '/my/tickets',
    template: 'queue',
    onBeforeAction: function() {
      return queueBeforeAction(this, {
        queueName: _.pluck(Queues.find().fetch(), 'name'),
        pseudoQueue: 'userQueue',
        clearQueueBadge: false,
        filterByUserId: true
      });
    }
  });
  this.route('globalQueue', {
    path: '/all/tickets',
    template: 'queue',
    onBeforeAction: function() {
      return queueBeforeAction(this, {
        queueName: _.pluck(Queues.find({
          memberIds: Meteor.userId()
        }).fetch(), 'name'),
        pseudoQueue: 'globalQueue',
        clearQueueBadge: false,
        filterByUserId: false
      });
    }
  });
  this.route('ticket', {
    path: '/ticket/:ticketNumber',
    template: 'ticket',
    onBeforeAction: function() {
      Session.set('ticketNumber', Number(this.params.ticketNumber));
      this.next();
      if (Meteor.userId()) {
        return Meteor.subscribe('ticket', Number(this.params.ticketNumber));
      }
    }
  });
  this.route('userDashboard', {
    path: '/my/dashboard',
    onBeforeAction: function() {
      Session.set('queueName', null);
      Session.set('pseudoQueue', null);
      return this.next();
    }
  });
  this.route('apiSubmit', {
    path: '/api/1.0/submit',
    where: 'server',
    action: function() {
      var associated, base, behalfOfId, blackboxKeys, formFields, i, k, len, ref2, ref3, ref4, ref5, ref6, requiredParams, ticket, username;
      if (ref2 = this.request.headers['x-forwarded-for'], indexOf.call((ref3 = Meteor.settings) != null ? ref3.remoteWhitelist : void 0, ref2) < 0) {
        console.log('API submit request from ' + this.request.headers['x-forwarded-for'] + ' not in API whitelist');
        throw new Meteor.Error(403, 'Access denied.  Submit from a whitelisted IP address or use an API token.');
      }
      console.log(this.request.body);
      requiredParams = ['username', 'email', 'description', 'queueName'];
      for (i = 0, len = requiredParams.length; i < len; i++) {
        k = requiredParams[i];
        if (this.request.body[k] == null) {
          throw new Meteor.Error(412, "Missing required parameter " + k + " in request.");
        }
      }
      Meteor.call('checkUsername', this.request.body.username);
      blackboxKeys = _.difference(_.keys(this.request.body), requiredParams.concat(['submitter_name', 'subject_line', 'on_behalf_of'], Tickets.simpleSchema()._schemaKeys));
      blackboxKeys = _.filter(blackboxKeys, (function(_this) {
        return function(k) {
          return _this.request.body[k].length;
        };
      })(this));
      formFields = _.pick(this.request.body, blackboxKeys);
      username = RegExp("\\b" + this.request.body.username + "\\b", "i");
      associated = _.uniq(_.map((ref4 = this.request.body.associate) != null ? ref4.split(/[^a-zA-Z0-9]+/) : void 0, function(u) {
        var q, ref5;
        if (u.trim().length) {
          q = RegExp("\\b" + u + "\\b", "i");
          return (ref5 = Meteor.users.findOne({
            username: q
          })) != null ? ref5._id : void 0;
        }
      }));
      associated = _.without(associated, void 0);
      ticket = {
        title: this.request.body.subject_line,
        body: this.request.body.description,
        authorName: this.request.body.username.toLowerCase(),
        authorId: Meteor.users.findOne({
          username: username
        })._id,
        associatedUserIds: associated,
        submissionData: {
          method: 'Form',
          ipAddress: this.request.body.ip_address,
          hostname: typeof (base = this.request.body).hostname === "function" ? base.hostname(this.request.body.ip_address) : void 0
        },
        submittedTimestamp: Date.now(),
        queueName: this.request.body.queueName || 'Triage',
        tags: ((ref5 = this.request.body.tags) != null ? ref5.split(/[;\n]/).map((function(_this) {
          return function(t) {
            return t.trim();
          };
        })(this)).filter((function(_this) {
          return function(t) {
            return t.length;
          };
        })(this)) : void 0) || [],
        formFields: formFields,
        attachmentIds: _.pluck(this.request.files, '_id')
      };
      if ((ref6 = this.request.body.on_behalf_of) != null ? ref6.length : void 0) {
        ticket.formFields['Submitted by'] = ticket.authorName;
        ticket.formFields['On behalf of'] = this.request.body.on_behalf_of;
        behalfOfId = (function() {
          try {
            return Meteor.call('checkUsername', this.request.body.on_behalf_of);
          } catch (error) {}
        }).call(this);
        if (behalfOfId) {
          ticket.submittedByUserId = ticket.authorId;
          ticket.authorName = this.request.body.on_behalf_of.toLowerCase();
          ticket.authorId = behalfOfId;
        }
      }
      Tickets.insert(ticket);
      return this.response.end('Submission successful.');
    }
  });
  this.route('serveFile', {
    path: '/file/:filename',
    where: 'server',
    action: FileRegistry.serveFile
  });
  return this.route('downloadFile', {
    path: '/download/:filename',
    where: 'server',
    action: FileRegistry.serveFile({
      disposition: 'attachment'
    })
  });
});
