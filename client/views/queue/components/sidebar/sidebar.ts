import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Session } from "meteor/session";

import { Facets } from "meteor/hive:facets";

import _ from 'underscore';

import { Tickets } from "/lib/collections";
import { Parsers } from "/imports/util/parsers";

var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Template.sidebar.helpers({
  closed: function() {
    return {
      name: "Closed",
      type: "status",
      count: Tickets.find({
        status: "Closed"
      }).count()
    };
  },
  tags: function() {
    var active, ref, ref1;
    active = ((ref = Iron.query.get('tag')) != null ? ref.split(',') : void 0) || [];
    return _.map(_.sortBy((ref1 = Facets.findOne()) != null ? ref1.facets.tags : void 0, function(f) {
      return -f.count;
    }), function(l) {
      var ref2;
      if (_.isNull(l.name)) {
        l.name = '(none)';
      }
      return _.extend(l, {
        checked: (ref2 = l.name, indexOf.call(active, ref2) >= 0) ? 'checked' : void 0,
        type: 'tag'
      });
    });
  },
  zeroCountTags: function() {
    var active, ref, ref1, tags;
    active = ((ref = Iron.query.get('tag')) != null ? ref.split(',') : void 0) || [];
    tags = _.pluck((ref1 = Facets.findOne()) != null ? ref1.facets.tags : void 0, 'name');
    if (indexOf.call(active, '(none)') >= 0 && Tickets.findOne()) {
      tags.push('(none)');
    }
    return _.map(_.difference(active, tags), function(l) {
      return {
        name: l,
        count: 0,
        checked: indexOf.call(active, l) >= 0 ? "checked" : void 0,
        type: 'tag'
      };
    });
  },
  status: function() {
    var active, ref, ref1;
    active = ((ref = Iron.query.get('status')) != null ? ref.split(',') : void 0) || [];
    return _.map(_.sortBy((ref1 = Facets.findOne()) != null ? ref1.facets.status : void 0, function(f) {
      return -f.count;
    }), function(l) {
      var ref2;
      return _.extend(l, {
        checked: (ref2 = l.name, indexOf.call(active, ref2) >= 0) ? 'checked' : void 0,
        type: 'status'
      });
    });
  },
  zeroCountStatus: function() {
    var active, ref, ref1, status;
    active = ((ref = Iron.query.get('status')) != null ? ref.split(',') : void 0) || [];
    status = _.pluck((ref1 = Facets.findOne()) != null ? ref1.facets.status : void 0, 'name');
    return _.map(_.difference(active, status), function(l) {
      return {
        name: l,
        count: 0,
        checked: indexOf.call(active, l) >= 0 ? 'checked' : void 0,
        type: 'status'
      };
    });
  },
  associatedUsers: function() {
    var active, ref, ref1;
    active = ((ref = Iron.query.get('associatedUser')) != null ? ref.split(',') : void 0) || [];
    return _.map(_.sortBy((ref1 = Facets.findOne()) != null ? ref1.facets.associatedUserIds : void 0, function(f) {
      return -f.count;
    }), function(l) {
      var ref2, username;
      if (!_.isNull(l.name)) {
        username = (ref2 = Meteor.users.findOne(l.name)) != null ? ref2.username : void 0;
        return _.extend(l, {
          username: username,
          checked: indexOf.call(active, username) >= 0 ? 'checked' : void 0,
          type: 'associatedUser'
        });
      } else {
        return _.extend(l, {
          username: '(none)',
          checked: indexOf.call(active, '(none)') >= 0 ? 'checked' : void 0,
          type: 'associatedUser'
        });
      }
    });
  },
  zeroCountUsers: function() {
    var active, ref, ref1, usernames, users;
    active = ((ref = Iron.query.get('associatedUser')) != null ? ref.split(',') : void 0) || [];
    users = _.pluck((ref1 = Facets.findOne()) != null ? ref1.facets.associatedUserIds : void 0, 'name');
    usernames = _.map(users, function(u) {
      var ref2;
      return (ref2 = Meteor.users.findOne(u)) != null ? ref2.username : void 0;
    });
    if (indexOf.call(active, '(none)') >= 0 && Tickets.findOne()) {
      usernames.push('(none)');
    }
    return _.map(_.difference(active, usernames), function(l) {
      return {
        username: l,
        count: 0,
        checked: indexOf.call(active, l) >= 0 ? 'checked' : void 0,
        type: 'associatedUser'
      };
    });
  },
  textFilter: function() {
    var ref, ref1;
    return (ref = Iron.Location.get().queryObject) != null ? (ref1 = ref.search) != null ? ref1.split(',') : void 0 : void 0;
  },
  userFilter: function() {
    var ref, ref1;
    return (ref = Iron.Location.get().queryObject) != null ? (ref1 = ref.user) != null ? ref1.split(',') : void 0 : void 0;
  },
  filtering: function() {
    return ((Iron.query.get('status') != null) || (Session.get('ready') === false)) && ((Session.get('queueName') != null) || Session.get('pseudoQueue'));
  },
  helpText: function() {
    return Template.instance().helpText.get();
  }
});

Template.sidebar.events({
  'click a[data-action=showHelp]': function(e, tpl) {
    return tpl.helpText.set(!(tpl.helpText.get()));
  },
  'keyup input[name=textSearch]': function(e, tpl) {
    var filter, newFilter, newStatus, newTags, newUsers, ref, ref1, ref2, ref3, statuses, tags, terms, text, users;
    if (e.keyCode === 13 && $(e.target).val().trim() !== "") {
      text = $(e.target).val();
      filter = ((ref = Iron.query.get('search')) != null ? ref.split(',') : void 0) || [];
      tags = ((ref1 = Iron.query.get('tags')) != null ? ref1.split(',') : void 0) || [];
      statuses = ((ref2 = Iron.query.get('status')) != null ? ref2.split(',') : void 0) || [];
      users = ((ref3 = Iron.query.get('user')) != null ? ref3.split(',') : void 0) || [];
      terms = Parsers.getTerms(text);
      _.map(terms, function(t) {
        return t.replace('"', '\"');
      });
      newFilter = _.union(terms, filter);
      newTags = _.union(tags, Parsers.getTags(text));
      newStatus = _.union(statuses, Parsers.getStatuses(text));
      newUsers = _.union(users, Parsers.getUsernames(text));
      Iron.query.set('search', newFilter.join());
      Iron.query.set('tag', newTags.join());
      Iron.query.set('status', newStatus.join());
      Iron.query.set('user', newUsers.join());
      Iron.query.set('start', 0);
      $(e.target).val('');
      return Session.set('newTicketSet', []);
    }
  },
  'click a[data-action="removeFilter"]': function(e, tpl) {
    var filter, ref, type, value;
    e.preventDefault();
    type = $(e.target).closest('a').data('type');
    filter = ((ref = Iron.query.get(type)) != null ? ref.split(',') : void 0) || [];
    value = this.valueOf();
    filter = _.without(filter, value);
    Iron.query.set(type, filter.join());
    return Iron.query.set('start', 0);
  },
  'change input:checkbox': function(e, tpl) {
    var filter, name, ref;
    filter = ((ref = Iron.query.get(this.type)) != null ? ref.split(',') : void 0) || [];
    if (this.type === 'associatedUser') {
      name = this.username;
    } else {
      name = this.name;
    }
    if ($(e.target).is(':checked')) {
      filter.push(name);
      filter = _.uniq(filter);
    } else {
      filter = _.without(filter, name);
    }
    Iron.query.set(this.type, filter.join());
    return Iron.query.set('start', 0);
  },
  'hide.bs.collapse': function(e, tpl) {
    return tpl.$("span[name=" + e.target.id + "]").removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
  },
  'show.bs.collapse': function(e, tpl) {
    return tpl.$("span[name=" + e.target.id + "]").removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
  }
});

Template.sidebar.rendered = function() {
  return this.find('#searchLabel')._uihooks = {
    insertElement: function(node, next) {
      return $(node).hide().insertBefore(next).slideToggle(350);
    },
    removeElement: function(node) {
      return $(node).slideToggle(350, function() {
        return this.remove();
      });
    }
  };
};

Template.sidebar.onCreated(function() {
  return this.helpText = new ReactiveVar(false);
});
