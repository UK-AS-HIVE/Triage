import _ from 'underscore';

import { escapeString } from '/imports/util/escapeString';


export const Parsers = {
  getTags: function(text) {
    return _.uniq(text.match(/\B#[a-zA-Z][a-zA-Z0-9-_\/]*\b/g)).filter(function(x) {
      return !/((#[a-fA-F0-9]{3})(\W|$)|(#[a-fA-F0-9]{6})(\W|$))/g.test(x);
    }).map(function(x) {
      return x.replace('#', '');
    });
  },

  getUserIds: function(text) {
    var users, usertags;
    usertags = text.match(/\B\@\S+\b/g) || [];
    users = [];
    _.each(usertags, function(username) {
      var ref, userId;
      userId = (ref = Meteor.users.findOne({
        username: username.substring(1)
      })) != null ? ref._id : void 0;
      if (userId) {
        return users.push(userId);
      }
    });
    return _.uniq(users);
  },

  getUsernames: function(text) {
    var usernames;
    usernames = text.match(/\B\@\S+\b/g) || [];
    return usernames.map(function(x) {
      return x.replace('@', '');
    });
  },

  getStatuses: function(text) {
    return _.uniq(text.match(/status:(\w+-\w+|\w+|"[^"]*"+|'[^']*')/g)).map(function(x) {
      return x.replace('status:', '').replace(/"/g, '').replace(/'/g, '');
    });
  },

  validateEmail: function(email) {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
  },

  getTerms: function(text) {
    var terms;
    terms = text.match(/"[^"]*"|status:(\w+-\w+|\w+|"[^"]*"+|'[^']*')|\#\S+|\@\S+|[^\s]+/g);
    return _.difference(terms, text.match(/status:(\w+-\w+|\w+|"[^"]*"+|'[^']*')|#\S+|\@\S+/g));
  },

  prepareContentForEmail: function(content) {
    var newContent, paragraphs;
    paragraphs = content.split('\n');
    newContent = "";
    _.each(paragraphs, function(p) {
      return newContent = newContent + ("<p>" + (escapeString(p)) + "</p>");
    });
    return newContent;
  }

}

